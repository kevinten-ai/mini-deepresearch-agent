import type { AgentState, IterationView } from '../types';
import { ToolCallCard } from './ToolCallCard';

export function ThinkingProcess({ agent }: { agent: AgentState }) {
  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>
        {agent.agentId}: {agent.perspective}
      </h3>
      {agent.iterations.map((iter) => (
        <IterationBlock key={iter.round} iteration={iter} />
      ))}
    </div>
  );
}

function IterationBlock({ iteration }: { iteration: IterationView }) {
  return (
    <div style={{ marginBottom: 24, borderLeft: '2px solid #e0e0e0', paddingLeft: 16 }}>
      <h4 style={{ color: '#0066ff' }}>Round {iteration.round}</h4>

      {iteration.thinking && (
        <Section title="Think" color="#f59e0b">
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{iteration.thinking}</p>
        </Section>
      )}

      {iteration.actions.length > 0 && (
        <Section title="Act" color="#3b82f6">
          {iteration.actions.map((a, i) => (
            <ToolCallCard key={i} action={a} />
          ))}
        </Section>
      )}

      {iteration.keyFindings.length > 0 && (
        <Section title="Observe" color="#8b5cf6">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {iteration.keyFindings.map((f, i) => (
              <li key={i} style={{ fontSize: 14 }}>
                {f}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Evaluate" color="#ef4444">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#e0e0e0' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 4,
                background: iteration.completeness >= 80 ? '#22c55e' : '#f59e0b',
                width: `${iteration.completeness}%`,
              }}
            />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{iteration.completeness}%</span>
          <span
            style={{ fontSize: 12, color: iteration.shouldContinue ? '#f59e0b' : '#22c55e' }}
          >
            {iteration.shouldContinue ? 'Continue' : 'Done'}
          </span>
        </div>
        {iteration.reason && (
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{iteration.reason}</div>
        )}
      </Section>

      {iteration.reportDiff && (
        <Section title="State Rebuild" color="#06b6d4">
          <div style={{ fontSize: 12, color: '#666' }}>
            Report updated ({iteration.reportDiff.after.length} chars)
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', marginBottom: 4 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
