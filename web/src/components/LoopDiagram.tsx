const phases = [
  { id: 'think', num: '01', label: 'Think', zh: '思考', color: 'var(--phase-think)' },
  { id: 'act', num: '02', label: 'Act', zh: '行动', color: 'var(--phase-act)' },
  { id: 'observe', num: '03', label: 'Observe', zh: '观察', color: 'var(--phase-observe)' },
  { id: 'evaluate', num: '04', label: 'Evaluate', zh: '评估', color: 'var(--phase-evaluate)' },
  { id: 'rebuild', num: '05', label: 'Rebuild', zh: '重建', color: 'var(--phase-rebuild)' },
];

export function LoopDiagram({
  activePhase,
  currentRound,
  maxRounds,
}: {
  activePhase?: string;
  currentRound?: number;
  maxRounds?: number;
}) {
  return (
    <div
      style={{
        padding: '10px 20px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginRight: 8,
          whiteSpace: 'nowrap',
        }}
      >
        Agent Loop
      </div>

      {/* Iteration counter */}
      {currentRound != null && currentRound > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 10px',
            borderRadius: 12,
            background: 'rgba(6,182,212,0.1)',
            border: '1px solid rgba(6,182,212,0.2)',
            marginRight: 8,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent)',
              fontWeight: 700,
            }}
          >
            R{currentRound}
          </span>
          {maxRounds && (
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              /{maxRounds}
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        {phases.map((phase, i) => {
          const isActive = activePhase === phase.id;
          const isPast =
            activePhase &&
            phases.findIndex((p) => p.id === activePhase) > i;

          return (
            <div key={phase.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? `color-mix(in srgb, ${phase.color} 15%, transparent)` : 'transparent',
                  border: `1px solid ${isActive ? phase.color : 'transparent'}`,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Active phase sweep animation */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      width: '30%',
                      background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${phase.color} 10%, transparent), transparent)`,
                      animation: 'sweep 2s ease-in-out infinite',
                    }}
                  />
                )}

                {/* Phase dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: isActive ? phase.color : isPast ? 'var(--success)' : 'var(--border-light)',
                      transition: 'all 0.3s',
                      boxShadow: isActive ? `0 0 8px ${phase.color}` : 'none',
                    }}
                  />
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: -3,
                        borderRadius: '50%',
                        border: `1.5px solid ${phase.color}`,
                        animation: 'ripple 1.5s ease-out infinite',
                        opacity: 0.4,
                      }}
                    />
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isActive ? phase.color : isPast ? 'var(--text-secondary)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-display)',
                      lineHeight: 1,
                      transition: 'color 0.3s',
                    }}
                  >
                    {phase.label}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {phase.zh}
                  </div>
                </div>
              </div>
              {i < phases.length - 1 && (
                <div
                  style={{
                    width: 16,
                    textAlign: 'center',
                    color: isPast ? 'var(--success)' : 'var(--text-muted)',
                    fontSize: 10,
                    flexShrink: 0,
                    transition: 'color 0.3s',
                    position: 'relative',
                    opacity: isPast ? 0.8 : 0.5,
                  }}
                >
                  →
                  {/* Animated data flow dot between active phase and next */}
                  {isActive && (
                    <span style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: phase.color,
                      animation: 'flow-right 1s ease-in-out infinite',
                      boxShadow: `0 0 4px ${phase.color}`,
                    }} />
                  )}
                </div>
              )}
            </div>
          );
        })}
        {/* Loop indicator */}
        <div
          style={{
            marginLeft: 4,
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--border-light)',
            fontSize: 9,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
          }}
        >
          ↩ LOOP
        </div>
      </div>
    </div>
  );
}
