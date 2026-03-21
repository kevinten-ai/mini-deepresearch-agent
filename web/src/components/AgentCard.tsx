import type { AgentState } from '../types';

const statusConfig: Record<string, { color: string; label: string; phaseIndex: number }> = {
  pending: { color: 'var(--text-muted)', label: 'IDLE', phaseIndex: -1 },
  thinking: { color: 'var(--phase-think)', label: 'THINK', phaseIndex: 0 },
  acting: { color: 'var(--phase-act)', label: 'ACT', phaseIndex: 1 },
  observing: { color: 'var(--phase-observe)', label: 'OBSERVE', phaseIndex: 2 },
  evaluating: { color: 'var(--phase-evaluate)', label: 'EVAL', phaseIndex: 3 },
  complete: { color: 'var(--success)', label: 'DONE', phaseIndex: 5 },
};

const phaseNames = ['Think', 'Act', 'Observe', 'Eval', 'Rebuild'];
const phaseColors = [
  'var(--phase-think)',
  'var(--phase-act)',
  'var(--phase-observe)',
  'var(--phase-evaluate)',
  'var(--phase-rebuild)',
];

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
  const cfg = statusConfig[agent.status] || statusConfig.pending;
  const isRunning = !['pending', 'complete'].includes(agent.status);

  return (
    <div
      onClick={onClick}
      style={{
        padding: 12,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        marginBottom: 8,
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        background: selected ? 'var(--bg-glow)' : 'var(--bg-elevated)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        transform: selected ? 'scale(1.01)' : 'scale(1)',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)';
          e.currentTarget.style.background = 'var(--bg-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.background = 'var(--bg-elevated)';
        }
      }}
    >
      {/* Active glow bar */}
      {isRunning && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
            animation: 'shimmer 2s infinite linear',
            backgroundSize: '200% 100%',
          }}
        />
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              background: `color-mix(in srgb, ${cfg.color} 15%, transparent)`,
              border: `1px solid color-mix(in srgb, ${cfg.color} 30%, transparent)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: cfg.color,
              fontFamily: 'var(--font-mono)',
              transition: 'all 0.3s',
            }}
          >
            {agent.agentId.split('-')[1]}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{agent.agentId}</div>
          </div>
        </div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: cfg.color,
            fontFamily: 'var(--font-mono)',
            letterSpacing: 1,
            padding: '2px 6px',
            borderRadius: 4,
            background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`,
            animation: isRunning ? 'glow-pulse 2s ease infinite' : 'none',
          }}
        >
          {cfg.label}
        </div>
      </div>

      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginBottom: 8,
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {agent.perspective}
      </div>

      {/* Phase progress bar — shows which phase is active with labels on hover */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
        {phaseColors.map((color, i) => {
          const isPhaseActive = cfg.phaseIndex === i;
          const isPhasePast = cfg.phaseIndex > i;
          return (
            <div
              key={i}
              title={phaseNames[i]}
              style={{
                flex: 1,
                height: isPhaseActive ? 4 : 3,
                borderRadius: 2,
                background: isPhaseActive ? color : isPhasePast ? 'var(--success)' : 'var(--border)',
                transition: 'all 0.3s',
                boxShadow: isPhaseActive ? `0 0 6px ${color}` : 'none',
                position: 'relative',
              }}
            />
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, background: 'var(--border)' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 2,
            background: agent.status === 'complete'
              ? 'var(--success)'
              : `linear-gradient(90deg, ${cfg.color}, color-mix(in srgb, ${cfg.color} 60%, var(--accent)))`,
            width: `${Math.min(progress, 100)}%`,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
        }}
      >
        <span>Round {agent.currentRound}/{agent.maxRounds}</span>
        <span style={{
          color: agent.completeness >= 80 ? 'var(--success)' : agent.completeness >= 50 ? 'var(--warning)' : 'var(--text-muted)',
          fontWeight: agent.completeness >= 50 ? 600 : 400,
          transition: 'color 0.3s',
        }}>
          {agent.completeness}%
        </span>
      </div>

      {/* Streaming indicator */}
      {agent.streamingChars > 0 && agent.status !== 'complete' && (
        <div
          style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent)',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent)',
              animation: 'glow-pulse 1s ease infinite',
            }}
          />
          streaming {agent.streamingChars.toLocaleString()} chars
        </div>
      )}
    </div>
  );
}
