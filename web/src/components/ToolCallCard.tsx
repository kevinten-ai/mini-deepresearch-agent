import type { ActionView } from '../types';

export function ToolCallCard({ action }: { action: ActionView }) {
  return (
    <div
      style={{
        padding: 8,
        background: '#f8f8f8',
        borderRadius: 6,
        marginBottom: 6,
        borderLeft: `3px solid ${
          action.status === 'running'
            ? '#f59e0b'
            : action.status === 'done'
              ? '#22c55e'
              : '#ef4444'
        }`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span>
          <strong>{action.tool}</strong>({JSON.stringify(action.params).slice(0, 60)}...)
        </span>
        {action.duration != null && <span style={{ color: '#999' }}>{action.duration}ms</span>}
      </div>
      {action.result && (
        <div style={{ fontSize: 12, color: '#666', marginTop: 4, whiteSpace: 'pre-wrap' }}>
          {action.result.slice(0, 200)}
        </div>
      )}
    </div>
  );
}
