import { useEffect, useRef } from 'react';
import type { ResearchState } from '../types';

const eventMeta: Record<string, { label: string; color: string }> = {
  'research:start': { label: '启动', color: 'var(--accent)' },
  'agent:start': { label: 'Agent', color: 'var(--phase-act)' },
  'agent:think': { label: 'Think', color: 'var(--phase-think)' },
  'agent:act': { label: 'Act', color: 'var(--phase-act)' },
  'agent:tool_result': { label: 'Result', color: 'var(--accent)' },
  'agent:observe': { label: 'Observe', color: 'var(--phase-observe)' },
  'agent:evaluate': { label: 'Eval', color: 'var(--phase-evaluate)' },
  'agent:state_rebuild': { label: 'Rebuild', color: 'var(--phase-rebuild)' },
  'agent:complete': { label: 'Done', color: 'var(--success)' },
  'synthesis:start': { label: 'Synth', color: 'var(--phase-observe)' },
  'synthesis:complete': { label: 'Merged', color: 'var(--success)' },
  'research:complete': { label: 'Complete', color: 'var(--success)' },
  error: { label: 'Error', color: 'var(--error)' },
};

export function TraceTimeline({ state }: { state: ResearchState }) {
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const prevEventCount = useRef(0);

  // Auto-scroll to latest event
  useEffect(() => {
    if (state.events.length > prevEventCount.current) {
      eventsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      prevEventCount.current = state.events.length;
    }
  }, [state.events.length]);

  const displayEvents = state.events.slice(-60);
  const flashThreshold = state.events.length - 3; // Flash the last 3 events

  return (
    <div style={{ padding: 16, fontSize: 12 }}>
      {/* Header */}
      <div
        style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Event Stream</span>
        {state.status === 'running' && (
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'inline-block',
            animation: 'glow-pulse 1.5s ease infinite',
          }} />
        )}
      </div>

      {/* Events */}
      <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 20 }}>
        {displayEvents.map((event, i) => {
          const meta = eventMeta[event.type] || { label: '?', color: 'var(--text-muted)' };
          const globalIndex = state.events.length - displayEvents.length + i;
          const isRecent = globalIndex >= flashThreshold && state.status === 'running';
          return (
            <div
              key={i}
              className={isRecent ? 'event-flash' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 0',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.3s',
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: meta.color,
                  flexShrink: 0,
                  boxShadow: isRecent ? `0 0 6px ${meta.color}` : 'none',
                  transition: 'box-shadow 0.3s',
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  minWidth: 48,
                }}
              >
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: meta.color,
                  fontFamily: 'var(--font-mono)',
                  minWidth: 44,
                }}
              >
                {meta.label}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {(event.data.agentId as string) || ''}
                {event.data.tool ? ` → ${event.data.tool}` : ''}
              </span>
            </div>
          );
        })}
        {state.events.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontSize: 11 }}>
            Waiting for events...
          </div>
        )}
        <div ref={eventsEndRef} />
      </div>

      {/* Stats */}
      <div
        style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Research Stats
      </div>
      <div
        style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <StatRow label="Tokens" value={state.totalTokens.toLocaleString()} />
        <StatRow label="Duration" value={`${(state.totalDuration / 1000).toFixed(1)}s`} />
        <StatRow label="Est. Cost" value={`$${(state.totalTokens * 0.00002).toFixed(4)}`} />
        <StatRow label="Agents" value={String(state.agents.length)} />
        <StatRow
          label="Iterations"
          value={String(state.agents.reduce((s, a) => s + a.iterations.length, 0))}
        />
        <StatRow label="Events" value={String(state.events.length)} last />
      </div>

      {/* Architecture */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          lineHeight: 2,
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ color: 'var(--accent)', fontWeight: 600 }}>Orchestrator</div>
        <div style={{ paddingLeft: 12 }}>
          ├─ <span style={{ color: 'var(--phase-act)' }}>ResearchAgent ×N</span>
        </div>
        <div style={{ paddingLeft: 24 }}>
          │ └─ Think→Act→Observe→Eval→Rebuild
        </div>
        <div style={{ paddingLeft: 12 }}>
          └─ <span style={{ color: 'var(--phase-observe)' }}>Synthesizer</span>
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 12px',
        borderBottom: last ? 'none' : '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
