import { EventEmitter } from 'events';
import type {
  AgentConfig,
  AgentResult,
  IterationState,
  ActionRecord,
  Tool,
} from '../types.js';
import type { LLMMessage, LLMResponse } from '../llm/client.js';

type LLMChatFn = (
  messages: LLMMessage[],
  tools?: Tool[],
  onToken?: (token: string) => void,
  signal?: AbortSignal,
) => Promise<LLMResponse>;

export interface AgentRunOptions {
  /** Unix timestamp (ms) after which the agent should stop starting new iterations */
  deadline?: number;
  /** AbortSignal to cancel in-flight LLM calls immediately */
  signal?: AbortSignal;
}

export class ResearchAgent extends EventEmitter {
  private config: AgentConfig;
  private llmChat: LLMChatFn;
  private evolvingReport: string = '';
  private totalTokens: number = 0;
  private options: AgentRunOptions;

  constructor(config: AgentConfig, llmChat: LLMChatFn, options?: AgentRunOptions) {
    super();
    this.config = config;
    this.llmChat = llmChat;
    this.options = options || {};
  }

  async run(): Promise<AgentResult> {
    const startTime = Date.now();
    const iterations: IterationState[] = [];

    this.emit('agent:start', {
      agentId: this.config.agentId,
      perspective: this.config.perspective,
    });

    for (let round = 1; round <= this.config.maxIterations; round++) {
      // Check deadline before starting a new iteration
      if (this.options.deadline && Date.now() > this.options.deadline) {
        console.log(`[agent ${this.config.agentId}] Deadline reached at round ${round}, stopping`);
        break;
      }
      if (this.options.signal?.aborted) break;

      try {
        const iteration = await this.runIteration(round);
        iterations.push(iteration);

        if (!iteration.evaluate.shouldContinue) break;
      } catch (err) {
        // If aborted by deadline signal, stop gracefully (not an error)
        if (this.options.signal?.aborted) break;
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[agent ${this.config.agentId}] Iteration ${round} failed:`, errMsg);
        // If we have at least one successful iteration, return partial results
        if (iterations.length > 0) break;
        // Otherwise propagate the error
        throw err;
      }
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

    // Throttled token emitter — keeps the SSE connection alive during long LLM calls
    let streamCharCount = 0;
    let lastTokenEmit = 0;
    const onToken = (token: string) => {
      streamCharCount += token.length;
      const now = Date.now();
      if (now - lastTokenEmit > 300) {
        this.emit('agent:token', {
          agentId: this.config.agentId,
          round,
          chars: streamCharCount,
        });
        lastTokenEmit = now;
      }
    };

    // Multi-turn tool calling loop
    let response;
    try {
      response = await this.llmChat(messages, this.config.tools, onToken, this.options.signal);
    } catch (err) {
      if (this.options.signal?.aborted) throw new Error('Aborted by deadline');
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[agent ${this.config.agentId}] LLM call failed at round ${round}:`, errMsg);
      throw new Error(`Agent ${this.config.agentId} LLM call failed (round ${round}): ${errMsg}`);
    }
    this.totalTokens += response.usage.totalTokens;

    while (response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        const tool = this.config.tools.find(
          (t) => t.definition.name === toolCall.function.name,
        );
        if (!tool) continue;

        let params: Record<string, any>;
        try {
          params = JSON.parse(toolCall.function.arguments);
        } catch {
          params = {};
        }
        this.emit('agent:act', {
          agentId: this.config.agentId,
          round,
          tool: toolCall.function.name,
          params,
        });

        const actionStart = Date.now();
        let result;
        try {
          result = await tool.execute(params);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[agent ${this.config.agentId}] Tool ${toolCall.function.name} failed:`, errMsg);
          result = { success: false, data: null, summary: `[Tool error: ${errMsg.slice(0, 200)}]`, duration: 0 };
        }
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

      try {
        response = await this.llmChat(messages, this.config.tools, onToken, this.options.signal);
      } catch (err) {
        if (this.options.signal?.aborted) break;
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[agent ${this.config.agentId}] LLM call failed at round ${round} (continuation):`, errMsg);
        // Break out of tool loop — use whatever content we have so far
        break;
      }
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
    const hasTools = this.config.tools.length > 0;
    const actionInstruction = hasTools
      ? '2. ACT: Use the available tools to fill knowledge gaps. You can call multiple tools.'
      : '2. ACT: No external tools are available. Use your general knowledge, be explicit about uncertainty, and do not attempt tool-call markup.';
    const citationInstruction = hasTools
      ? '- Include source URLs as citations in the report'
      : '- Do not fabricate source URLs or citations; state when no external sources were consulted';

    return `You are a research agent investigating a specific perspective of a research question.
Your perspective: "${this.config.perspective}"
Current round: ${round}/${this.config.maxIterations}

## Your Task
1. THINK: Analyze the current state of your research. What do you know? What gaps remain?
${actionInstruction}
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
${citationInstruction}
- Set shouldContinue=false when completeness >= 80 or you cannot find more useful information
- Be thorough but concise in your report`;
  }

  private buildUserPrompt(round: number): string {
    const hasTools = this.config.tools.length > 0;
    if (round === 1) {
      const firstStep = hasTools
        ? `Start by searching for key information about this topic from your perspective: "${this.config.perspective}".`
        : `No external tools are enabled. Answer directly from your general knowledge from this perspective: "${this.config.perspective}".`;
      return `Research Question: ${this.config.query}\n\nThis is the first round. ${firstStep}`;
    }
    const nextStep = hasTools
      ? 'Identify remaining gaps and search for additional information.'
      : 'Identify remaining gaps and refine the answer without using external tools.';
    return `Research Question: ${this.config.query}\n\nPrevious Research Report (compressed memory):\n${this.evolvingReport}\n\nContinue your research. ${nextStep} Update the report with any new findings.`;
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
