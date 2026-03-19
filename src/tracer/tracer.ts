import type {
  ResearchTrace,
  AgentTrace,
  IterationState,
  SSEEvent,
  ResearchMode,
} from '../types.js';

export class AgentTracer {
  private trace: ResearchTrace;

  constructor(id: string, query: string, mode: ResearchMode) {
    this.trace = {
      id,
      query,
      mode,
      startTime: Date.now(),
      orchestration: {
        queryAnalysis: '',
        agentCount: 0,
        perspectives: [],
        duration: 0,
      },
      agents: [],
      totalTokens: 0,
      estimatedCost: 0,
    };
  }

  handleEvent(event: SSEEvent): void {
    const { type, data } = event;

    switch (type) {
      case 'research:start':
        this.trace.orchestration.agentCount = data.agentCount as number;
        break;
      case 'agent:start':
        this.trace.agents.push({
          agentId: data.agentId as string,
          perspective: data.perspective as string,
          status: 'thinking',
          iterations: [],
          tokens: 0,
          duration: 0,
        });
        break;
      case 'agent:think': {
        const agent = this.findAgent(data.agentId as string);
        if (agent) {
          agent.status = 'thinking';
          this.ensureIteration(agent, data.round as number).think = {
            reasoning: data.reasoning as string,
            decision: data.decision as string,
            identifiedGaps: [],
          };
        }
        break;
      }
      case 'agent:evaluate': {
        const agent = this.findAgent(data.agentId as string);
        if (agent) {
          agent.status = 'evaluating';
          this.ensureIteration(agent, data.round as number).evaluate = {
            shouldContinue: data.shouldContinue as boolean,
            reason: (data.reason as string) || '',
            completeness: data.completeness as number,
          };
        }
        break;
      }
      case 'agent:complete': {
        const agent = this.findAgent(data.agentId as string);
        if (agent) {
          agent.status = 'complete';
          agent.finalReport = data.finalReport as string;
        }
        break;
      }
      case 'research:complete':
        this.trace.endTime = Date.now();
        this.trace.totalTokens = data.totalTokens as number;
        this.trace.estimatedCost = this.trace.totalTokens * 0.00002;
        break;
    }
  }

  getTrace(): ResearchTrace {
    return this.trace;
  }

  private findAgent(agentId: string): AgentTrace | undefined {
    return this.trace.agents.find((a) => a.agentId === agentId);
  }

  private ensureIteration(agent: AgentTrace, round: number): IterationState {
    let iter = agent.iterations.find((i) => i.round === round);
    if (!iter) {
      iter = {
        round,
        think: { reasoning: '', decision: '', identifiedGaps: [] },
        actions: [],
        observe: { keyFindings: [] },
        evaluate: { shouldContinue: true, reason: '', completeness: 0 },
        stateRebuild: { reportBefore: '', reportAfter: '', contextTokens: 0 },
      };
      agent.iterations.push(iter);
    }
    return iter;
  }
}
