import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useResearchSSE } from '../hooks/useResearchSSE';
import { AgentCard } from '../components/AgentCard';
import { LoopDiagram } from '../components/LoopDiagram';
import { ThinkingProcess } from '../components/ThinkingProcess';
import { TraceTimeline } from '../components/TraceTimeline';
import { ReportRenderer } from '../components/ReportRenderer';

function getActivePhase(status?: string): string | undefined {
  switch (status) {
    case 'thinking': return 'think';
    case 'acting': return 'act';
    case 'observing': return 'observe';
    case 'evaluating': return 'evaluate';
    default: return undefined;
  }
}

type PipelineStage = 'dispatching' | 'researching' | 'synthesizing' | 'enriching' | 'complete' | 'error';

function getPipelineStage(state: { status: string; agents: any[]; synthesisStatus: string; mediaStatus: string }): PipelineStage {
  if (state.status === 'error') return 'error';
  if (state.status === 'complete') return 'complete';
  if (state.mediaStatus === 'running') return 'enriching';
  if (state.synthesisStatus === 'running') return 'synthesizing';
  if (state.agents.length > 0) return 'researching';
  if (state.status === 'running') return 'dispatching';
  return 'dispatching';
}

const pipelineStages: { id: PipelineStage; label: string; zh: string; color: string }[] = [
  { id: 'dispatching', label: 'Dispatch', zh: '分配', color: 'var(--accent)' },
  { id: 'researching', label: 'Research', zh: '研究', color: 'var(--phase-act)' },
  { id: 'synthesizing', label: 'Synthesize', zh: '合成', color: 'var(--phase-observe)' },
  { id: 'enriching', label: 'Media', zh: '图示', color: 'var(--phase-rebuild)' },
  { id: 'complete', label: 'Complete', zh: '完成', color: 'var(--success)' },
];

export function ResearchPage() {
  const [searchParams] = useSearchParams();
  const { state, startResearch, stop, retry, selectAgent, showReport, hideReport } = useResearchSSE();

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

  // Auto-select first agent when agents appear, so users immediately see the thinking process
  useEffect(() => {
    if (state.agents.length > 0 && !state.selectedAgentId) {
      selectAgent(state.agents[0].agentId);
    }
  }, [state.agents.length, state.selectedAgentId, selectAgent, state.agents]);

  const selectedAgent = state.agents.find((a) => a.agentId === state.selectedAgentId);
  const pipelineStage = getPipelineStage(state);

  // Show report view
  if (state.showReport && state.finalOutput) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <div
          style={{
            padding: '8px 20px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            onClick={hideReport}
            style={{
              padding: '4px 12px',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'rgba(6,182,212,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--bg-elevated)';
            }}
          >
            ← Back to Research Process
          </button>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            VIEW: FINAL REPORT
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
            {state.totalTokens.toLocaleString()} tokens · {(state.totalDuration / 1000).toFixed(1)}s
          </span>
        </div>
        <ReportRenderer content={state.finalOutput} citations={state.citations} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Pipeline Progress Bar */}
      <PipelineProgress stage={pipelineStage} />

      {/* Top: Loop Diagram */}
      <LoopDiagram
        activePhase={getActivePhase(selectedAgent?.status)}
        currentRound={selectedAgent?.currentRound}
        maxRounds={selectedAgent?.maxRounds}
      />

      {/* Main 3-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr 280px',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Left: Agents */}
        <div
          style={{
            borderRight: '1px solid var(--border)',
            padding: 16,
            overflowY: 'auto',
          }}
        >
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
            Research Agents
          </div>

          {/* Query badge */}
          <div
            style={{
              padding: '8px 10px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              marginBottom: 12,
              fontSize: 11,
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>
              QUERY
            </span>
            <br />
            {searchParams.get('query')?.slice(0, 80)}
          </div>

          {/* Architecture note */}
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--border-light)',
              marginBottom: 12,
              fontSize: 10,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: 'var(--text-secondary)' }}>Multi-Agent Parallel Research</strong>
            <br />
            Orchestrator decomposes the query into perspectives. Each Agent researches independently, then Synthesizer merges results.
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
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: '2px solid var(--border-light)',
                  borderTopColor: 'var(--accent)',
                  borderRadius: '50%',
                  margin: '0 auto 12px',
                  animation: 'spin-slow 1s linear infinite',
                }}
              />
              Orchestrator analyzing query...
              <div style={{ fontSize: 10, marginTop: 4, color: 'var(--text-muted)' }}>
                Using LLM to decompose into research perspectives
              </div>
            </div>
          )}

          {/* Synthesis indicator */}
          {state.synthesisStatus === 'running' && (
            <div
              style={{
                padding: 12,
                background: 'rgba(167,139,250,0.06)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(167,139,250,0.2)',
                marginTop: 8,
                animation: 'fadeIn 0.4s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    border: '2px solid rgba(167,139,250,0.3)',
                    borderTopColor: 'var(--phase-observe)',
                    borderRadius: '50%',
                    animation: 'spin-slow 1s linear infinite',
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--phase-observe)' }}>
                  Synthesizing...
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Merging findings from all agents into a unified report
              </div>
            </div>
          )}

          {/* Media enrichment indicator */}
          {state.mediaStatus === 'running' && (
            <div
              style={{
                padding: 12,
                background: 'rgba(6,182,212,0.06)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(6,182,212,0.2)',
                marginTop: 8,
                animation: 'fadeIn 0.4s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    border: '2px solid rgba(6,182,212,0.3)',
                    borderTopColor: 'var(--phase-rebuild)',
                    borderRadius: '50%',
                    animation: 'spin-slow 1s linear infinite',
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--phase-rebuild)' }}>
                  Generating Media...
                </span>
              </div>
              {state.mediaProgress && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Image {state.mediaProgress.index}/{state.mediaProgress.total}: {state.mediaProgress.description.slice(0, 60)}...
                </div>
              )}
            </div>
          )}

          {/* Stop button during research */}
          {state.status === 'running' && state.agents.length > 0 && (
            <button
              onClick={stop}
              style={{
                width: '100%',
                padding: '8px 16px',
                marginTop: 12,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)',
                color: 'var(--error)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
              }}
            >
              ■ Stop Research
            </button>
          )}

          {/* View Report button when complete */}
          {state.status === 'complete' && state.finalOutput && (
            <button
              className="btn-shimmer"
              onClick={showReport}
              style={{
                width: '100%',
                padding: '12px 16px',
                marginTop: 12,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                color: '#fff',
                cursor: 'pointer',
                animation: 'scale-in 0.5s ease',
                boxShadow: '0 4px 20px rgba(6,182,212,0.3)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(6,182,212,0.4)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(6,182,212,0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              View Final Report →
            </button>
          )}

          {state.status === 'error' && (
            <div
              style={{
                padding: 12,
                background: 'rgba(239,68,68,0.08)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(239,68,68,0.2)',
                fontSize: 11,
                color: 'var(--error)',
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'rgba(239,68,68,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  flexShrink: 0,
                }}>✕</div>
                <span style={{ fontWeight: 700 }}>
                  {pipelineStage === 'error' ? 'Research Failed' : 'Error'}
                </span>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-secondary)',
                padding: '6px 8px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 8,
                wordBreak: 'break-word',
              }}>
                {state.errorMessage || 'An unexpected error occurred'}
              </div>
              {/* Partial results note */}
              {state.agents.some((a) => a.status === 'complete') && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {state.agents.filter((a) => a.status === 'complete').length} of {state.agents.length} agents completed — you can still review their work above.
                </div>
              )}
              <button
                onClick={() => {
                  retry();
                  // Re-trigger research with same params
                  const query = searchParams.get('query');
                  if (query) {
                    setTimeout(() => {
                      startResearch({
                        query,
                        mode: searchParams.get('mode') || 'report',
                        agentCount: parseInt(searchParams.get('agentCount') || '2', 10),
                        maxIterations: parseInt(searchParams.get('maxIterations') || '5', 10),
                        enabledTools: ['search', 'visit', 'scholar'],
                      });
                    }, 100);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.1)',
                  color: 'var(--error)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLButtonElement).style.background = 'rgba(239,68,68,0.2)';
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)';
                }}
              >
                ↻ Retry Research
              </button>
              <a
                href="/"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  marginTop: 6,
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                }}
              >
                ← Back to Home
              </a>
            </div>
          )}
        </div>

        {/* Center: Thinking Process or Synthesis View */}
        <div style={{ overflowY: 'auto', background: 'var(--bg-root)' }} className="thinking-scroll">
          {state.mediaStatus === 'running' && !selectedAgent ? (
            <MediaEnrichmentView progress={state.mediaProgress} />
          ) : state.synthesisStatus === 'running' && !selectedAgent ? (
            <SynthesisView agentCount={state.agents.length} />
          ) : selectedAgent ? (
            <ThinkingProcess agent={selectedAgent} query={searchParams.get('query') || ''} />
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                gap: 8,
              }}
            >
              {state.status === 'running' ? (
                <>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      border: '2px solid var(--border-light)',
                      borderTopColor: 'var(--accent)',
                      borderRadius: '50%',
                      animation: 'spin-slow 1s linear infinite',
                    }}
                  />
                  <div style={{ fontSize: 13 }}>Waiting for agents...</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Orchestrator is analyzing research perspectives with LLM
                  </div>
                </>
              ) : state.status === 'complete' ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Research Complete</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Select an agent on the left to review their thinking process, or view the final report.
                  </div>
                  <button
                    onClick={showReport}
                    style={{
                      padding: '10px 24px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    View Final Report →
                  </button>
                </div>
              ) : state.status === 'error' ? (
                <div style={{ textAlign: 'center', padding: 40, maxWidth: 480, margin: '0 auto' }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: 24,
                  }}>!</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--error)', marginBottom: 8 }}>
                    Research Interrupted
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    marginBottom: 16,
                  }}>
                    {state.errorMessage || 'An unexpected error occurred during the research process.'}
                  </div>
                  {state.agents.some((a) => a.iterations.length > 0) && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px dashed var(--border-light)',
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      marginBottom: 16,
                    }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Partial Results Available:</span>{' '}
                      {state.agents.filter((a) => a.iterations.length > 0).length} agent(s) have partial findings.
                      Select an agent on the left to review what was discovered before the error.
                    </div>
                  )}
                  <button
                    onClick={() => {
                      retry();
                      const query = searchParams.get('query');
                      if (query) {
                        setTimeout(() => {
                          startResearch({
                            query,
                            mode: searchParams.get('mode') || 'report',
                            agentCount: parseInt(searchParams.get('agentCount') || '2', 10),
                            maxIterations: parseInt(searchParams.get('maxIterations') || '5', 10),
                            enabledTools: ['search', 'visit', 'scholar'],
                          });
                        }, 100);
                      }
                    }}
                    style={{
                      padding: '10px 28px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: 'linear-gradient(135deg, #ef4444, #f97316)',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    ↻ Retry Research
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 13 }}>Select an agent to view thinking process</div>
              )}
            </div>
          )}
        </div>

        {/* Right: Timeline & Stats */}
        <div style={{ borderLeft: '1px solid var(--border)', overflowY: 'auto' }}>
          <TraceTimeline state={state} />
        </div>
      </div>
    </div>
  );
}

function PipelineProgress({ stage }: { stage: PipelineStage }) {
  const stageIndex = pipelineStages.findIndex((s) => s.id === stage);

  return (
    <div
      style={{
        padding: '8px 20px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginRight: 12,
          whiteSpace: 'nowrap',
        }}
      >
        Pipeline
      </div>
      {pipelineStages.map((s, i) => {
        const isActive = s.id === stage;
        const isPast = i < stageIndex;
        const isError = stage === 'error' && i === stageIndex;
        const dotColor = isError ? 'var(--error)' : isActive ? s.color : isPast ? 'var(--success)' : 'var(--border-light)';

        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: dotColor,
                    transition: 'all 0.4s',
                  }}
                />
                {isActive && !isError && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: -3,
                      borderRadius: '50%',
                      border: `2px solid ${s.color}`,
                      animation: 'ripple 1.5s ease-out infinite',
                      opacity: 0.5,
                    }}
                  />
                )}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: isActive ? s.color : isPast ? 'var(--text-secondary)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    transition: 'color 0.3s',
                  }}
                >
                  {s.label}
                </div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {s.zh}
                </div>
              </div>
            </div>
            {i < pipelineStages.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: '0 8px',
                  borderRadius: 1,
                  background: isPast ? 'var(--success)' : 'var(--border)',
                  transition: 'background 0.4s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      width: '30%',
                      height: '100%',
                      background: `linear-gradient(90deg, transparent, ${s.color}, transparent)`,
                      animation: 'sweep 1.5s ease-in-out infinite',
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MediaEnrichmentView({ progress }: { progress: { index: number; total: number; description: string } | null }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        animation: 'scale-in 0.5s ease-out',
      }}
    >
      {/* Image generation animation */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(6,182,212,0.08)',
          border: '1px solid rgba(6,182,212,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          position: 'relative',
        }}
      >
        <div style={{ fontSize: 32 }}>🎨</div>
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--phase-rebuild)',
            animation: 'ripple 2s ease-out infinite',
            opacity: 0.3,
          }}
        />
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        Generating Visual Content
      </div>

      {progress && (
        <div style={{ textAlign: 'center', marginBottom: 16, maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, justifyContent: 'center' }}>
            <div
              style={{
                width: 200,
                height: 6,
                borderRadius: 3,
                background: 'var(--bg-elevated)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 3,
                  background: 'var(--phase-rebuild)',
                  width: `${(progress.index / progress.total) * 100}%`,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
              {progress.index}/{progress.total}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Generating: {progress.description.slice(0, 80)}{progress.description.length > 80 ? '...' : ''}
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
        Using the configured AI image provider to generate illustrations for key concepts in the report.
        Mermaid diagrams will be rendered client-side.
      </div>

      {/* Media types being generated */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        {[
          { icon: '📊', label: 'Mermaid Diagrams', desc: 'Client-side rendering' },
          { icon: '🖼️', label: 'AI Images', desc: 'Image provider' },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {m.label}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{m.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SynthesisView({ agentCount }: { agentCount: number }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        animation: 'scale-in 0.5s ease-out',
      }}
    >
      {/* Merge animation */}
      <div
        style={{
          position: 'relative',
          width: 200,
          height: 120,
          marginBottom: 24,
        }}
      >
        {/* Agent nodes converging */}
        {Array.from({ length: agentCount }).map((_, i) => {
          const angle = ((i - (agentCount - 1) / 2) * 40);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 20,
                top: 60 + angle,
                width: 60,
                height: 24,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--phase-act-bg)',
                border: '1px solid var(--phase-act-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                color: 'var(--phase-act)',
                animation: `fadeIn 0.3s ease ${i * 0.1}s backwards`,
              }}
            >
              Agent {i + 1}
            </div>
          );
        })}

        {/* Arrow lines */}
        <svg
          style={{ position: 'absolute', inset: 0 }}
          viewBox="0 0 200 120"
          fill="none"
        >
          {Array.from({ length: agentCount }).map((_, i) => {
            const y = 60 + ((i - (agentCount - 1) / 2) * 40);
            return (
              <line
                key={i}
                x1="80"
                y1={y + 12}
                x2="120"
                y2="60"
                stroke="var(--phase-observe)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.4"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="7"
                  to="0"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </line>
            );
          })}
        </svg>

        {/* Synthesizer node */}
        <div
          style={{
            position: 'absolute',
            right: 20,
            top: 48,
            width: 70,
            height: 28,
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(167,139,250,0.12)',
            border: '1px solid rgba(167,139,250,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: 'var(--phase-observe)',
            fontWeight: 700,
            animation: 'glow-pulse 2s ease infinite',
          }}
        >
          Synthesizer
        </div>
      </div>

      <div
        style={{
          width: 40,
          height: 40,
          border: '2px solid rgba(167,139,250,0.3)',
          borderTopColor: 'var(--phase-observe)',
          borderRadius: '50%',
          animation: 'spin-slow 1.2s linear infinite',
          marginBottom: 16,
        }}
      />

      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        Synthesizing Report
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
        All {agentCount} agents have completed their research. The Synthesizer is now merging their findings into a unified, comprehensive report.
      </div>

      {/* Educational note */}
      <div
        style={{
          marginTop: 20,
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-light)',
          maxWidth: 400,
          fontSize: 11,
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ color: 'var(--phase-observe)', fontWeight: 700 }}>Synthesis Phase:</span>{' '}
        The Synthesizer receives each agent's final evolved report and uses LLM to merge them,
        resolving contradictions, eliminating redundancy, and creating a coherent narrative with proper citations.
      </div>
    </div>
  );
}
