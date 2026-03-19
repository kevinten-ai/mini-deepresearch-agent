import type { AgentState } from '../types';

const statusColors: Record<string, string> = {
  pending: '#999',
  thinking: '#f59e0b',
  acting: '#3b82f6',
  observing: '#8b5cf6',
  evaluating: '#ef4444',
  complete: '#22c55e',
};

export function AgentCard({
  agent,
  selected,
  onClick,
}: {
  agent: AgentState;
  selected: boolean;
  onClick: () => void;
}) {
  const progress = (agent.currentRound / agent.maxRounds) * 100;

  return (
    <div
      onClick={onClick}
      style={{
        padding: 12,
        borderRadius: 8,
        cursor: 'pointer',
        marginBottom: 8,
        border: selected ? '2px solid #0066ff' : '1px solid #e0e0e0',
        background: selected ? '#f0f7ff' : '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <strong>{agent.agentId}</strong>
        <span style={{ fontSize: 12, color: statusColors[agent.status], fontWeight: 600 }}>
          {agent.status.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{agent.perspective}</div>
      <div style={{ height: 4, borderRadius: 2, background: '#e0e0e0' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 2,
            background: '#0066ff',
            width: `${Math.min(progress, 100)}%`,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
        Round {agent.currentRound} | {agent.completeness}% complete
      </div>
    </div>
  );
}
