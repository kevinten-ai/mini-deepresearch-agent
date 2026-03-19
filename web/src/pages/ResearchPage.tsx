import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useResearchSSE } from '../hooks/useResearchSSE';
import { AgentCard } from '../components/AgentCard';
import { ThinkingProcess } from '../components/ThinkingProcess';
import { TraceTimeline } from '../components/TraceTimeline';
import { ReportRenderer } from '../components/ReportRenderer';

export function ResearchPage() {
  const [searchParams] = useSearchParams();
  const { state, startResearch, selectAgent } = useResearchSSE();

  useEffect(() => {
    const query = searchParams.get('query');
    if (query && state.status === 'idle') {
      startResearch({
        query,
        mode: searchParams.get('mode') || 'report',
        agentCount: parseInt(searchParams.get('agentCount') || '2', 10),
        maxIterations: parseInt(searchParams.get('maxIterations') || '5', 10),
        enabledTools: ['search', 'visit', 'scholar'],
      });
    }
  }, [searchParams, state.status, startResearch]);

  const selectedAgent = state.agents.find((a) => a.agentId === state.selectedAgentId);

  if (state.status === 'complete' && state.finalOutput) {
    return <ReportRenderer content={state.finalOutput} citations={state.citations} />;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr 280px',
        height: '100vh',
        fontFamily: 'system-ui',
      }}
    >
      {/* Left: Agent Overview */}
      <div style={{ borderRight: '1px solid #e0e0e0', padding: 16, overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>Agents</h3>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
          Query: {searchParams.get('query')?.slice(0, 50)}...
        </div>
        {state.agents.map((agent) => (
          <AgentCard
            key={agent.agentId}
            agent={agent}
            selected={agent.agentId === state.selectedAgentId}
            onClick={() => selectAgent(agent.agentId)}
          />
        ))}
        {state.agents.length === 0 && state.status === 'running' && (
          <div style={{ color: '#999', fontSize: 14 }}>
            Analyzing query & dispatching agents...
          </div>
        )}
      </div>

      {/* Center: Agent Detail */}
      <div style={{ overflowY: 'auto', background: '#fafafa' }}>
        {selectedAgent ? (
          <ThinkingProcess agent={selectedAgent} />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            {state.status === 'running'
              ? 'Waiting for agents to start...'
              : 'Select an agent to view details'}
          </div>
        )}
      </div>

      {/* Right: Trace Panel */}
      <div style={{ borderLeft: '1px solid #e0e0e0', overflowY: 'auto' }}>
        <TraceTimeline state={state} />
      </div>
    </div>
  );
}
