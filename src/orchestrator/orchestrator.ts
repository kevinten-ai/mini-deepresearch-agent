import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import type { ResearchRequest, ResearchResult, AgentResult } from '../types.js';
import { LLMClient } from '../llm/client.js';
import { ToolRegistry } from '../tools/registry.js';
import { ResearchAgent } from '../agent/research-agent.js';
import { Synthesizer } from './synthesizer.js';

export class Orchestrator extends EventEmitter {
  private llm: LLMClient;
  private toolRegistry: ToolRegistry;

  constructor(llm: LLMClient, toolRegistry: ToolRegistry) {
    super();
    this.llm = llm;
    this.toolRegistry = toolRegistry;
  }

  async research(
    request: ResearchRequest,
    options?: { deadline?: number; signal?: AbortSignal },
  ): Promise<ResearchResult> {
    const id = uuidv4();
    const startTime = Date.now();

    this.emit('research:start', {
      id,
      query: request.query,
      mode: request.mode,
      agentCount: request.agentCount,
    });

    let perspectives: string[];
    try {
      perspectives = await this.analyzeQuery(request.query, request.agentCount);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[analyzeQuery failed, using defaults]', errMsg);
      // Fall back to default perspectives so research can still proceed
      const defaults = ['comprehensive overview', 'technical details', 'practical applications', 'future implications'];
      perspectives = defaults.slice(0, request.agentCount);
    }

    const tools =
      request.enabledTools.length > 0
        ? this.toolRegistry.getByNames(request.enabledTools)
        : this.toolRegistry.getAll();

    const agentPromises: Promise<AgentResult>[] = perspectives.map(
      (perspective, i) => {
        const agent = new ResearchAgent(
          {
            agentId: `agent-${i + 1}`,
            perspective,
            query: request.query,
            maxIterations: request.maxIterations,
            tools,
          },
          (msgs, t, onToken, signal) => this.llm.chatStream(msgs, t, onToken, signal),
          { deadline: options?.deadline, signal: options?.signal },
        );

        const agentEvents = [
          'agent:start', 'agent:think', 'agent:act', 'agent:tool_result',
          'agent:observe', 'agent:evaluate', 'agent:state_rebuild', 'agent:complete',
          'agent:token',
        ];
        for (const event of agentEvents) {
          agent.on(event, (data) => this.emit(event, data));
        }

        return agent.run();
      },
    );

    const settled = await Promise.allSettled(agentPromises);
    const agentResults: AgentResult[] = [];
    const agentErrors: string[] = [];

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        agentResults.push(result.value);
      } else {
        const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        agentErrors.push(errMsg);
        console.error('[agent failed]', errMsg);
      }
    }

    if (agentResults.length === 0) {
      throw new Error(
        `All ${perspectives.length} agents failed. Errors: ${agentErrors.map((e, i) => `Agent ${i + 1}: ${e.slice(0, 100)}`).join('; ')}`,
      );
    }

    if (agentErrors.length > 0) {
      this.emit('error:partial', {
        message: `${agentErrors.length} of ${perspectives.length} agents failed, continuing with partial results`,
        failedCount: agentErrors.length,
        successCount: agentResults.length,
      });
    }

    this.emit('synthesis:start', { reportCount: agentResults.length });

    let finalOutput: string;
    let citations: ResearchResult['citations'] = [];
    let synthesisTokens = 0;

    try {
      const onSynthToken = () => {
        this.emit('synthesis:token', {});
      };
      const synthesizer = new Synthesizer(
        (msgs) => this.llm.chatStream(msgs, undefined, onSynthToken, options?.signal),
      );
      const synthesis = await synthesizer.synthesize(
        request.query,
        agentResults,
        request.mode,
      );
      finalOutput = synthesis.content;
      citations = synthesis.citations;
      synthesisTokens = synthesis.tokens;
    } catch (err) {
      // Fallback: concatenate agent reports directly
      console.error('[synthesis failed, using fallback]', err instanceof Error ? err.message : err);
      this.emit('synthesis:complete', { output: null, fallback: true });
      finalOutput = agentResults
        .map((r) => `## ${r.agentId}: ${r.perspective}\n\n${r.finalReport}`)
        .join('\n\n---\n\n');
    }

    this.emit('synthesis:complete', { output: finalOutput });

    // Media enrichment: replace ![IMAGE:...] placeholders with generated images
    finalOutput = await this.enrichMedia(finalOutput);

    const result: ResearchResult = {
      id,
      query: request.query,
      mode: request.mode,
      agentResults,
      finalOutput,
      citations,
      totalTokens:
        agentResults.reduce((sum, r) => sum + r.totalTokens, 0) + synthesisTokens,
      totalDuration: Date.now() - startTime,
    };

    this.emit('research:complete', {
      id,
      totalDuration: result.totalDuration,
      totalTokens: result.totalTokens,
    });

    return result;
  }

  /** Replace ![IMAGE:description] placeholders with AI-generated images via CogView API */
  private async enrichMedia(content: string): Promise<string> {
    const regex = /!\[IMAGE:(.*?)\]/g;
    const matches = [...content.matchAll(regex)];

    if (matches.length === 0) return content;

    this.emit('media:start', { imageCount: matches.length });

    let enriched = content;
    let generated = 0;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const description = match[1];

      this.emit('media:progress', {
        index: i + 1,
        total: matches.length,
        type: 'image',
        description,
      });

      try {
        const imageUrl = await this.llm.generateImage(description);
        if (imageUrl) {
          enriched = enriched.replace(match[0], `![${description}](${imageUrl})`);
          generated++;
        } else {
          // Remove placeholder if generation failed
          enriched = enriched.replace(match[0], `*[Image: ${description}]*`);
        }
      } catch (err) {
        console.error(`[image generation failed for "${description}"]`, err);
        enriched = enriched.replace(match[0], `*[Image: ${description}]*`);
      }
    }

    this.emit('media:complete', { generated, total: matches.length });
    return enriched;
  }

  private async analyzeQuery(
    query: string,
    agentCount: number,
  ): Promise<string[]> {
    if (agentCount === 1) return ['comprehensive overview'];

    const response = await this.llm.chat([
      {
        role: 'system',
        content: `You are a research planner. Given a query, suggest ${agentCount} distinct research perspectives to investigate it thoroughly. Reply with a JSON array of strings only, no other text.`,
      },
      { role: 'user', content: query },
    ]);

    try {
      const match = (response.content || '').match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
    } catch {
      /* fall through */
    }

    const defaults = [
      'technical details',
      'practical applications',
      'historical context',
      'future implications',
    ];
    return defaults.slice(0, agentCount);
  }
}
