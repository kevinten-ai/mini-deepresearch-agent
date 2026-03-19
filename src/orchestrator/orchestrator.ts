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

  async research(request: ResearchRequest): Promise<ResearchResult> {
    const id = uuidv4();
    const startTime = Date.now();

    this.emit('research:start', {
      id,
      query: request.query,
      mode: request.mode,
      agentCount: request.agentCount,
    });

    const perspectives = await this.analyzeQuery(request.query, request.agentCount);

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
          (msgs, t) => this.llm.chat(msgs, t),
        );

        const agentEvents = [
          'agent:start', 'agent:think', 'agent:act', 'agent:tool_result',
          'agent:observe', 'agent:evaluate', 'agent:state_rebuild', 'agent:complete',
        ];
        for (const event of agentEvents) {
          agent.on(event, (data) => this.emit(event, data));
        }

        return agent.run();
      },
    );

    const agentResults = await Promise.all(agentPromises);

    this.emit('synthesis:start', { reportCount: agentResults.length });

    const synthesizer = new Synthesizer((msgs) => this.llm.chat(msgs));
    const synthesis = await synthesizer.synthesize(
      request.query,
      agentResults,
      request.mode,
    );

    const result: ResearchResult = {
      id,
      query: request.query,
      mode: request.mode,
      agentResults,
      finalOutput: synthesis.content,
      citations: synthesis.citations,
      totalTokens:
        agentResults.reduce((sum, r) => sum + r.totalTokens, 0) + synthesis.tokens,
      totalDuration: Date.now() - startTime,
    };

    this.emit('synthesis:complete', { output: synthesis.content });
    this.emit('research:complete', {
      id,
      totalDuration: result.totalDuration,
      totalTokens: result.totalTokens,
    });

    return result;
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
