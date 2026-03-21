import { useState } from 'react';
import type { ActionView } from '../types';

const toolMeta: Record<string, { icon: string; label: string }> = {
  search: { icon: '🔍', label: 'Tavily Search' },
  visit: { icon: '🌐', label: 'Jina Reader' },
  scholar: { icon: '📚', label: 'Scholar Search' },
  python: { icon: '🐍', label: 'Python Exec' },
  file_parser: { icon: '📄', label: 'File Parser' },
};

export function ToolCallCard({ action }: { action: ActionView }) {
  const [expanded, setExpanded] = useState(false);
  const meta = toolMeta[action.tool] || { icon: '🔧', label: action.tool };

  const statusColor =
    action.status === 'running'
      ? 'var(--warning)'
      : action.status === 'done'
        ? 'var(--success)'
        : 'var(--error)';

  return (
    <div
      style={{
        padding: 10,
        background: 'var(--bg-root)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 6,
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>{meta.icon}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{meta.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {action.duration != null && (
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {action.duration}ms
            </span>
          )}
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: statusColor,
              boxShadow: action.status === 'running' ? `0 0 6px ${statusColor}` : 'none',
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 6,
          padding: '4px 8px',
          background: 'var(--bg-elevated)',
          borderRadius: 4,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {JSON.stringify(action.params)}
      </div>

      {action.result && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 10,
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono)',
            padding: 0,
          }}
        >
          {expanded ? '▾ hide result' : '▸ show result'}
        </button>
      )}
      {expanded && action.result && (
        <div
          style={{
            marginTop: 4,
            padding: 8,
            background: 'var(--bg-elevated)',
            borderRadius: 4,
            fontSize: 11,
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            maxHeight: 160,
            overflowY: 'auto',
            lineHeight: 1.5,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {action.result}
        </div>
      )}
    </div>
  );
}
