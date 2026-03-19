import type { ResearchState } from '../types';

export function TraceTimeline({ state }: { state: ResearchState }) {
  return (
    <div style={{ padding: 16, fontSize: 13 }}>
      <h4 style={{ marginTop: 0 }}>Timeline</h4>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {state.events.slice(-50).map((event, i) => (
          <div
            key={i}
            style={{
              padding: '4px 0',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              gap: 8,
            }}
          >
            <span style={{ color: '#999', minWidth: 60 }}>
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span style={{ color: getEventColor(event.type) }}>
              {event.type.split(':')[1]}
            </span>
            <span
              style={{
                color: '#666',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {(event.data.agentId as string) || ''} {(event.data.tool as string) || ''}{' '}
              {(event.data.reason as string) || ''}
            </span>
          </div>
        ))}
      </div>

      <h4 style={{ marginTop: 16 }}>Token Usage</h4>
      <div style={{ background: '#f8f8f8', padding: 12, borderRadius: 8 }}>
        <div>
          Total: <strong>{state.totalTokens.toLocaleString()}</strong>
        </div>
        <div>
          Duration: <strong>{(state.totalDuration / 1000).toFixed(1)}s</strong>
        </div>
        <div>
          Est. Cost: <strong>${(state.totalTokens * 0.00002).toFixed(4)}</strong>
        </div>
      </div>
    </div>
  );
}

function getEventColor(type: string): string {
  if (type.includes('think')) return '#f59e0b';
  if (type.includes('act') || type.includes('tool')) return '#3b82f6';
  if (type.includes('observe')) return '#8b5cf6';
  if (type.includes('evaluate')) return '#ef4444';
  if (type.includes('complete')) return '#22c55e';
  return '#666';
}
