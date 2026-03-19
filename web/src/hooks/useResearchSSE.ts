import { useState, useCallback, useRef } from 'react';
import type { ResearchState, SSEEvent, AgentState, IterationView } from '../types';

const initialState: ResearchState = {
  status: 'idle',
  agents: [],
  selectedAgentId: null,
  finalOutput: null,
  citations: [],
  totalTokens: 0,
  totalDuration: 0,
  events: [],
};

export function useResearchSSE() {
  const [state, setState] = useState<ResearchState>(initialState);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);

  const startResearch = useCallback(
    async (request: {
      query: string;
      mode: string;
      agentCount: number;
      maxIterations: number;
      enabledTools: string[];
    }) => {
      // Prevent duplicate calls (React StrictMode fires useEffect twice)
      if (startedRef.current) return;
      startedRef.current = true;

      // Abort any previous request
      abortRef.current?.abort();

      setState({ ...initialState, status: 'running' });
      abortRef.current = new AbortController();

      try {
        const response = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: abortRef.current.signal,
        });

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event: SSEEvent = JSON.parse(line.slice(6));
                setState((prev) => processEvent(prev, event));
              } catch {
                /* ignore parse errors */
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setState((prev) => ({ ...prev, status: 'error' }));
        }
      }
    },
    [],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, status: 'complete' }));
  }, []);

  const selectAgent = useCallback((agentId: string) => {
    setState((prev) => ({ ...prev, selectedAgentId: agentId }));
  }, []);

  return { state, startResearch, stop, selectAgent };
}

function processEvent(prev: ResearchState, event: SSEEvent): ResearchState {
  const next = { ...prev, events: [...prev.events, event] };

  switch (event.type) {
    case 'agent:start': {
      // Deduplicate: skip if agent already exists
      if (next.agents.some((a) => a.agentId === event.data.agentId)) break;
      const agent: AgentState = {
        agentId: event.data.agentId as string,
        perspective: event.data.perspective as string,
        status: 'thinking',
        currentRound: 0,
        maxRounds: 10,
        completeness: 0,
        iterations: [],
      };
      next.agents = [...next.agents, agent];
      if (!next.selectedAgentId) next.selectedAgentId = agent.agentId;
      break;
    }
    case 'agent:think':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({
        ...a,
        status: 'thinking',
        currentRound: event.data.round as number,
        iterations: upsertIteration(a.iterations, event.data.round as number, (it) => ({
          ...it,
          thinking: event.data.reasoning as string,
          decision: event.data.decision as string,
        })),
      }));
      break;
    case 'agent:act':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({
        ...a,
        status: 'acting',
        iterations: upsertIteration(a.iterations, event.data.round as number, (it) => ({
          ...it,
          actions: [
            ...it.actions,
            {
              tool: event.data.tool as string,
              params: event.data.params as Record<string, any>,
              status: 'running' as const,
            },
          ],
        })),
      }));
      break;
    case 'agent:tool_result':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({
        ...a,
        iterations: upsertIteration(a.iterations, event.data.round as number, (it) => ({
          ...it,
          actions: it.actions.map((act, i) =>
            i === it.actions.length - 1
              ? {
                  ...act,
                  result: (event.data.result as any)?.summary,
                  duration: event.data.duration as number,
                  status: 'done' as const,
                }
              : act,
          ),
        })),
      }));
      break;
    case 'agent:observe':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({
        ...a,
        status: 'observing',
        iterations: upsertIteration(a.iterations, event.data.round as number, (it) => ({
          ...it,
          keyFindings: event.data.keyFindings as string[],
        })),
      }));
      break;
    case 'agent:evaluate':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({
        ...a,
        status: 'evaluating',
        completeness: event.data.completeness as number,
        iterations: upsertIteration(a.iterations, event.data.round as number, (it) => ({
          ...it,
          completeness: event.data.completeness as number,
          shouldContinue: event.data.shouldContinue as boolean,
          reason: event.data.reason as string,
        })),
      }));
      break;
    case 'agent:state_rebuild':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({
        ...a,
        status: 'thinking',
        iterations: upsertIteration(a.iterations, event.data.round as number, (it) => ({
          ...it,
          reportDiff: {
            before: event.data.reportBefore as string,
            after: event.data.reportAfter as string,
          },
        })),
      }));
      break;
    case 'agent:complete':
      next.agents = updateAgent(next.agents, event.data.agentId as string, (a) => ({
        ...a,
        status: 'complete',
      }));
      break;
    case 'research:complete':
      next.status = 'complete';
      next.finalOutput = (event.data.finalOutput as string) || null;
      next.citations = (event.data.citations as any[]) || [];
      next.totalTokens = (event.data.totalTokens as number) || 0;
      next.totalDuration = (event.data.totalDuration as number) || 0;
      break;
    case 'error':
      next.status = 'error';
      break;
  }
  return next;
}

function updateAgent(
  agents: AgentState[],
  id: string,
  updater: (a: AgentState) => AgentState,
): AgentState[] {
  return agents.map((a) => (a.agentId === id ? updater(a) : a));
}

function upsertIteration(
  iterations: IterationView[],
  round: number,
  updater: (it: IterationView) => IterationView,
): IterationView[] {
  const exists = iterations.find((it) => it.round === round);
  if (exists) return iterations.map((it) => (it.round === round ? updater(it) : it));
  const newIter: IterationView = {
    round,
    actions: [],
    keyFindings: [],
    completeness: 0,
    shouldContinue: true,
  };
  return [...iterations, updater(newIter)];
}
