import { EventEmitter } from 'events';
import type {
  AgentConfig,
  AgentResult,
  IterationState,
  ActionRecord,
  Tool,
} from '../types.js';
import type { LLMMessage, LLMResponse } from '../llm/client.js';

type LLMChatFn = (messages: LLMMessage[], tools?: Tool[]) => Promise<LLMResponse>;

export class ResearchAgent extends EventEmitter {
  private config: AgentConfig;
  private llmChat: LLMChatFn;
  private evolvingReport: string = '';
  private totalTokens: number = 0;

  constructor(config: AgentConfig, llmChat: LLMChatFn) {
    super();
    this.config = config;
    this.llmChat = llmChat;
  }

  async run(): Promise<AgentResult> {
    const startTime = Date.now();
    const iterations: IterationState[] = [];

    this.emit('agent:start', {
      agentId: this.config.agentId,
      perspective: this.config.perspective,
    });

    for (let round = 1; round <= this.config.maxIterations; round++) {
      const iteration = await this.runIteration(round);
      iterations.push(iteration);

      if (!iteration.evaluate.shouldContinue) break;
    }

    const result: AgentResult = {
      agentId: this.config.agentId,
      perspective: this.config.perspective,
      iterations,
      finalReport: this.evolvingReport,
      totalTokens: this.totalTokens,
      duration: Date.now() - startTime,
    };

    this.emit('agent:complete', {
      agentId: this.config.agentId,
      finalReport: this.evolvingReport,
    });
    return result;
  }

  private async runIteration(round: number): Promise<IterationState> {
    // === THINK + ACT (via function calling) ===
    const systemPrompt = this.buildSystemPrompt(round);
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: this.buildUserPrompt(round) },
    ];

    const actions: ActionRecord[] = [];

    // Multi-turn tool calling loop
    let response = await this.llmChat(messages, this.config.tools);
    this.totalTokens += response.usage.totalTokens;

    while (response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        const tool = this.config.tools.find(
          (t) => t.definition.name === toolCall.function.name,
        );
        if (!tool) continue;

        const params = JSON.parse(toolCall.function.arguments);
        this.emit('agent:act', {
          agentId: this.config.agentId,
          round,
          tool: toolCall.function.name,
          params,
        });

        const actionStart = Date.now();
        const result = await tool.execute(params);
        const action: ActionRecord = {
          tool: toolCall.function.name,
          params,
          result,
          duration: Date.now() - actionStart,
        };
        actions.push(action);

        this.emit('agent:tool_result', {
          agentId: this.config.agentId,
          round,
          tool: toolCall.function.name,
          result,
          duration: action.duration,
        });

        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [toolCall],
        });
        messages.push({
          role: 'tool',
          content: result.summary,
          tool_call_id: toolCall.id,
        });
      }

      response = await this.llmChat(messages, this.config.tools);
      this.totalTokens += response.usage.totalTokens;
    }

    const thinkContent = response.content || '';

    // === OBSERVE + EVALUATE + STATE REBUILD ===
    const parsed = this.parseThinkResponse(thinkContent);

    this.emit('agent:think', {
      agentId: this.config.agentId,
      round,
      reasoning: parsed.thinking,
      decision: parsed.reason,
    });
    this.emit('agent:observe', {
      agentId: this.config.agentId,
      round,
      keyFindings: parsed.keyFindings,
    });
    this.emit('agent:evaluate', {
      agentId: this.config.agentId,
      round,
      completeness: parsed.completeness,
      shouldContinue: parsed.shouldContinue,
      reason: parsed.reason,
    });

    // State Rebuild: update evolving report (Markovian)
    const reportBefore = this.evolvingReport;
    this.evolvingReport = parsed.updatedReport || this.evolvingReport;

    this.emit('agent:state_rebuild', {
      agentId: this.config.agentId,
      round,
      reportBefore,
      reportAfter: this.evolvingReport,
    });

    return {
      round,
      think: {
        reasoning: parsed.thinking,
        decision: parsed.reason,
        identifiedGaps: parsed.identifiedGaps || [],
      },
      actions,
      observe: { keyFindings: parsed.keyFindings },
      evaluate: {
        shouldContinue: parsed.shouldContinue,
        reason: parsed.reason,
        completeness: parsed.completeness,
      },
      stateRebuild: {
        reportBefore,
        reportAfter: this.evolvingReport,
        contextTokens: this.estimateTokens(this.evolvingReport),
      },
    };
  }

  private buildSystemPrompt(round: number): string {
    return `You are a research agent investigating a specific perspective of a research question.
Your perspective: "${this.config.perspective}"
Current round: ${round}/${this.config.maxIterations}

## Your Task
1. THINK: Analyze the current state of your research. What do you know? What gaps remain?
2. ACT: Use the available tools to fill knowledge gaps. You can call multiple tools.
3. After tool results come back, provide your analysis in the following JSON format:

\`\`\`json
{
  "thinking": "Your detailed reasoning about what you've found and what it means",
  "keyFindings": ["finding 1", "finding 2"],
  "identifiedGaps": ["gap 1", "gap 2"],
  "completeness": <0-100>,
  "shouldContinue": true/false,
  "reason": "Why you should continue or stop",
  "updatedReport": "Your updated comprehensive report in Markdown incorporating ALL findings so far"
}
\`\`\`

## Important Rules
- The updatedReport should be a COMPLETE, self-contained report, not just new findings
- Include source URLs as citations in the report
- Set shouldContinue=false when completeness >= 80 or you cannot find more useful information
- Be thorough but concise in your report`;
  }

  private buildUserPrompt(round: number): string {
    if (round === 1) {
      return `Research Question: ${this.config.query}\n\nThis is the first round. Start by searching for key information about this topic from your perspective: "${this.config.perspective}".`;
    }
    return `Research Question: ${this.config.query}\n\nPrevious Research Report (compressed memory):\n${this.evolvingReport}\n\nContinue your research. Identify remaining gaps and search for additional information. Update the report with any new findings.`;
  }

  private parseThinkResponse(content: string): {
    thinking: string;
    keyFindings: string[];
    identifiedGaps: string[];
    completeness: number;
    shouldContinue: boolean;
    reason: string;
    updatedReport: string;
  } {
    try {
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/\{[\s\S]*"thinking"[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
    } catch {
      /* fall through to fallback */
    }

    return {
      thinking: content.slice(0, 200),
      keyFindings: [content.slice(0, 100)],
      identifiedGaps: [],
      completeness: 80,
      shouldContinue: false,
      reason: 'Could not parse structured response, treating as final',
      updatedReport: content,
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
