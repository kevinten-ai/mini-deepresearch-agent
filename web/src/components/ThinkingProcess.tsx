import { useState, useEffect, useRef } from 'react';
import type { AgentState, IterationView } from '../types';
import { ToolCallCard } from './ToolCallCard';

const phaseInfo = {
  think: {
    num: '01',
    label: 'Think',
    zh: '思考阶段',
    color: 'var(--phase-think)',
    bg: 'var(--phase-think-bg)',
    border: 'var(--phase-think-border)',
    concept: 'Chain-of-Thought Reasoning',
    desc: 'Agent 分析当前研究状态，回顾已有信息，识别知识缺口，规划下一步要搜集哪些信息。对应 ReAct 框架中的 Reasoning 阶段。',
  },
  act: {
    num: '02',
    label: 'Act',
    zh: '行动阶段',
    color: 'var(--phase-act)',
    bg: 'var(--phase-act-bg)',
    border: 'var(--phase-act-border)',
    concept: 'Tool Use / Function Calling',
    desc: 'Agent 通过 LLM Function Calling 调用外部工具获取真实世界信息。每次工具调用都是 Agent 与外部环境的一次交互。',
  },
  observe: {
    num: '03',
    label: 'Observe',
    zh: '观察阶段',
    color: 'var(--phase-observe)',
    bg: 'var(--phase-observe-bg)',
    border: 'var(--phase-observe-border)',
    concept: 'Information Extraction',
    desc: 'Agent 从工具返回的原始数据中提取关键发现，将大量原始信息蒸馏为结构化知识点——信息压缩的第一道关卡。',
  },
  evaluate: {
    num: '04',
    label: 'Evaluate',
    zh: '评估阶段',
    color: 'var(--phase-evaluate)',
    bg: 'var(--phase-evaluate-bg)',
    border: 'var(--phase-evaluate-border)',
    concept: 'Self-Reflection & Completeness',
    desc: 'Agent 评估研究完整度（0-100%），决定是否继续迭代。这是"知道自己不知道什么"的元认知能力——避免无限循环的关键。',
  },
  rebuild: {
    num: '05',
    label: 'State Rebuild',
    zh: '状态重建',
    color: 'var(--phase-rebuild)',
    bg: 'var(--phase-rebuild-bg)',
    border: 'var(--phase-rebuild-border)',
    concept: 'Markovian State Rebuild',
    desc: '将新发现融入"演化报告"，丢弃原始工具输出。下一轮只看：原始问题 + 演化报告 + 最新交互。马尔可夫性——未来只依赖当前状态，可无限迭代。',
  },
};

export function ThinkingProcess({ agent, query }: { agent: AgentState; query: string }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [agent.iterations.length, agent.status]);

  return (
    <div style={{ padding: 20 }}>
      {/* Agent Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          padding: '12px 16px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--accent), var(--phase-act))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 16,
            color: '#fff',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {agent.agentId.split('-')[1]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{agent.agentId}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Perspective: <span style={{ color: 'var(--text-secondary)' }}>{agent.perspective}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            ROUND {agent.currentRound}/{agent.maxRounds}
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: agent.completeness >= 80 ? 'var(--success)' : agent.completeness >= 50 ? 'var(--warning)' : 'var(--accent)',
              transition: 'color 0.3s',
              textShadow: agent.completeness >= 80 ? '0 0 12px rgba(16,185,129,0.4)' : 'none',
            }}
          >
            {agent.completeness}%
          </div>
        </div>
      </div>

      {/* Iterations */}
      {agent.iterations.map((iter, idx) => (
        <IterationBlock
          key={iter.round}
          iteration={iter}
          index={idx}
          query={query}
          prevReport={idx > 0 ? agent.iterations[idx - 1].reportDiff?.after : undefined}
          isFirstIteration={idx === 0}
        />
      ))}

      {/* Live streaming indicator */}
      {agent.streamingChars > 0 && agent.status !== 'complete' && (
        <StreamingIndicator chars={agent.streamingChars} round={agent.currentRound} />
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function IterationBlock({
  iteration,
  index,
  query,
  prevReport,
  isFirstIteration,
}: {
  iteration: IterationView;
  index: number;
  query: string;
  prevReport?: string;
  isFirstIteration?: boolean;
}) {
  return (
    <div
      style={{
        marginBottom: 20,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
        animation: 'fadeIn 0.4s ease-out',
        animationDelay: `${index * 0.1}s`,
        animationFillMode: 'backwards',
      }}
    >
      {/* Round Header */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-elevated)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#0a0e1a',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {iteration.round}
          </div>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Iteration Round {iteration.round}</span>
        </div>
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            padding: '2px 8px',
            borderRadius: 10,
            background: iteration.shouldContinue
              ? 'rgba(245,158,11,0.15)'
              : 'rgba(16,185,129,0.15)',
            color: iteration.shouldContinue ? 'var(--warning)' : 'var(--success)',
            fontWeight: 600,
          }}
        >
          {iteration.shouldContinue ? 'CONTINUE' : 'COMPLETE'}
        </span>
      </div>

      <div style={{ padding: 16 }}>
        {/* Prompt Composition Visualization */}
        <PromptCompositionPanel
          round={iteration.round}
          query={query}
          prevReport={prevReport}
          isFirstIteration={isFirstIteration}
        />

        {/* Phase 1: Think */}
        {iteration.thinking && (
          <PhasePanel phase="think" isFirstIteration={isFirstIteration}>
            <div
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: 13,
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
              }}
            >
              {iteration.thinking}
            </div>
            {iteration.decision && (
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--phase-think-bg)',
                  border: '1px solid var(--phase-think-border)',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                }}
              >
                <strong style={{ color: 'var(--phase-think)' }}>Decision:</strong> {iteration.decision}
              </div>
            )}
          </PhasePanel>
        )}

        {/* Phase 2: Act */}
        {iteration.actions.length > 0 && (
          <PhasePanel phase="act" isFirstIteration={isFirstIteration}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginBottom: 8,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {iteration.actions.length} tool call{iteration.actions.length > 1 ? 's' : ''} executed
            </div>
            {iteration.actions.map((a, i) => (
              <ToolCallCard key={i} action={a} />
            ))}
          </PhasePanel>
        )}

        {/* Phase 3: Observe */}
        {iteration.keyFindings.length > 0 && (
          <PhasePanel phase="observe" isFirstIteration={isFirstIteration}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {iteration.keyFindings.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 8,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--phase-observe)',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    [{String(i + 1).padStart(2, '0')}]
                  </span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </PhasePanel>
        )}

        {/* Phase 4: Evaluate */}
        <PhasePanel phase="evaluate" isFirstIteration={isFirstIteration}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  background: 'var(--bg-root)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: 4,
                    background:
                      iteration.completeness >= 80
                        ? 'var(--success)'
                        : iteration.completeness >= 50
                          ? 'var(--warning)'
                          : 'var(--phase-evaluate)',
                    width: `${iteration.completeness}%`,
                    transition: 'width 0.8s ease',
                    backgroundImage:
                      iteration.completeness < 80
                        ? 'linear-gradient(45deg, rgba(255,255,255,.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.1) 50%, rgba(255,255,255,.1) 75%, transparent 75%)'
                        : 'none',
                    backgroundSize: '20px 20px',
                    animation: iteration.completeness < 80 ? 'progress-stripe 0.6s linear infinite' : 'none',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color:
                    iteration.completeness >= 80
                      ? 'var(--success)'
                      : 'var(--phase-evaluate)',
                  minWidth: 40,
                  textAlign: 'right',
                }}
              >
                {iteration.completeness}%
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: iteration.shouldContinue ? 'var(--warning)' : 'var(--success)',
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 14 }}>
                {iteration.shouldContinue ? '🔄' : '✅'}
              </span>
              {iteration.shouldContinue
                ? 'Continue research — information insufficient'
                : 'Research sufficient — stop iteration'}
            </div>
          </div>
          {iteration.reason && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-root)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              {iteration.reason}
            </div>
          )}
        </PhasePanel>

        {/* Phase 5: State Rebuild */}
        {iteration.reportDiff && (
          <StateRebuildPanel reportDiff={iteration.reportDiff} />
        )}

        {/* Phase flow connector */}
        {iteration.shouldContinue && iteration.reportDiff && (
          <div
            style={{
              textAlign: 'center',
              padding: '8px 0',
              color: 'var(--text-muted)',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            ↓ Next iteration uses rebuilt state as context ↓
          </div>
        )}
      </div>
    </div>
  );
}

function PromptCompositionPanel({
  round,
  query,
  prevReport,
  isFirstIteration,
}: {
  round: number;
  query: string;
  prevReport?: string;
  isFirstIteration?: boolean;
}) {
  // Auto-expand prompt composition on first iteration to teach users about it
  const [expanded, setExpanded] = useState(isFirstIteration && round === 1);

  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border-light)',
        background: 'var(--bg-root)',
        overflow: 'hidden',
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
          🧩 PROMPT COMPOSITION
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flex: 1 }}>
          — What the LLM receives in Round {round}
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(90deg)' : 'none',
          }}
        >
          ▸
        </span>
      </div>

      {expanded && (
        <div style={{ padding: '0 12px 12px', animation: 'fadeIn 0.2s ease' }}>
          {/* Visual composition formula */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 10,
            }}
          >
            <PromptBlock
              label="System Prompt"
              desc="Research instructions"
              color="var(--text-muted)"
              size="fixed"
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>+</span>
            <PromptBlock
              label="Original Query"
              desc={query.slice(0, 40) + (query.length > 40 ? '...' : '')}
              color="var(--phase-act)"
              size="fixed"
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>+</span>
            {round > 1 && prevReport ? (
              <PromptBlock
                label={`Evolved Report v${round - 1}`}
                desc={`${prevReport.length} chars`}
                color="var(--phase-rebuild)"
                size="growing"
              />
            ) : (
              <PromptBlock
                label="No Prior Report"
                desc="First iteration"
                color="var(--border-light)"
                size="empty"
              />
            )}
            <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>+</span>
            <PromptBlock
              label="Latest Interaction"
              desc="Tool calls & results"
              color="var(--phase-think)"
              size="variable"
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>=</span>
            <PromptBlock
              label="LLM Input"
              desc={`Round ${round}`}
              color="var(--success)"
              size="result"
            />
          </div>

          {/* Key insight */}
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(6,182,212,0.06)',
              border: '1px solid rgba(6,182,212,0.15)',
              fontSize: 10,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Markovian Property:</span>{' '}
            {round === 1
              ? 'First iteration — no prior state. The agent starts fresh with only the query.'
              : `The evolved report from Round ${round - 1} compresses ALL prior research into a compact state. Original tool outputs are discarded — this is why the context window doesn't grow unboundedly.`}
          </div>
        </div>
      )}
    </div>
  );
}

function PromptBlock({
  label,
  desc,
  color,
  size,
}: {
  label: string;
  desc: string;
  color: string;
  size: 'fixed' | 'growing' | 'variable' | 'empty' | 'result';
}) {
  const sizeIndicators = {
    fixed: { width: 'auto', opacity: 1 },
    growing: { width: 'auto', opacity: 1 },
    variable: { width: 'auto', opacity: 1 },
    empty: { width: 'auto', opacity: 0.5 },
    result: { width: 'auto', opacity: 1 },
  };
  const style = sizeIndicators[size];

  return (
    <div
      style={{
        padding: '4px 8px',
        borderRadius: 4,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        background: `color-mix(in srgb, ${color} 8%, transparent)`,
        opacity: style.opacity,
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
        {label}
      </div>
      <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {desc}
      </div>
    </div>
  );
}

function StateRebuildPanel({ reportDiff }: { reportDiff: { before: string; after: string } }) {
  const [expanded, setExpanded] = useState(false);
  const info = phaseInfo.rebuild;
  const beforeLen = reportDiff.before.length;
  const afterLen = reportDiff.after.length;
  const growth = beforeLen > 0 ? Math.round(((afterLen - beforeLen) / beforeLen) * 100) : 100;

  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${info.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          background: info.bg,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: info.color,
            opacity: 0.6,
          }}
        >
          {info.num}
        </span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: info.color }}>
            {info.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
            {info.zh}
          </span>
        </div>
        <span
          style={{
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: info.color,
            opacity: 0.6,
          }}
        >
          {info.concept}
        </span>
      </div>

      <div style={{ padding: 12 }}>
        {/* Concept box */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-root)',
            border: '1px dashed var(--border-light)',
            marginBottom: 10,
            fontSize: 11,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ color: info.color, fontWeight: 700 }}>Core Principle:</span>{' '}
          {info.desc}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <StatBox label="Before" value={`${beforeLen}`} unit="chars" />
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>→</div>
          <StatBox label="After" value={`${afterLen}`} unit="chars" color={info.color} />
          <StatBox
            label="Growth"
            value={`${growth > 0 ? '+' : ''}${growth}%`}
            color={growth > 0 ? 'var(--success)' : 'var(--error)'}
          />
        </div>

        {/* Context window visualization */}
        <div
          style={{
            marginBottom: 10,
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-root)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>
            CONTEXT WINDOW USAGE (conceptual)
          </div>
          <div style={{ display: 'flex', height: 12, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
            <div
              style={{
                width: '15%',
                background: 'var(--phase-act)',
                borderRight: '1px solid var(--bg-root)',
              }}
              title="System Prompt + Query"
            />
            <div
              style={{
                width: `${Math.min(Math.max(afterLen / 100, 10), 50)}%`,
                background: info.color,
                borderRight: '1px solid var(--bg-root)',
                transition: 'width 0.5s ease',
              }}
              title="Evolved Report"
            />
            <div
              style={{
                width: '20%',
                background: 'var(--phase-think)',
                opacity: 0.7,
              }}
              title="Latest Interaction"
            />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            <span><span style={{ color: 'var(--phase-act)' }}>■</span> Query</span>
            <span><span style={{ color: info.color }}>■</span> Report</span>
            <span><span style={{ color: 'var(--phase-think)' }}>■</span> Interaction</span>
            <span style={{ marginLeft: 'auto', color: 'var(--success)' }}>← Bounded growth</span>
          </div>
        </div>

        {/* Expand report */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            padding: '6px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-elevated)',
            cursor: 'pointer',
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            transition: 'all 0.2s',
          }}
        >
          {expanded ? '▾ Hide evolved report' : '▸ View evolved report content'}
        </button>
        {expanded && (
          <div
            style={{
              marginTop: 8,
              padding: 12,
              background: 'var(--bg-root)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: 12,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              maxHeight: 300,
              overflowY: 'auto',
              color: 'var(--text-secondary)',
            }}
          >
            {reportDiff.after || '(empty)'}
          </div>
        )}
      </div>
    </div>
  );
}

// Track whether user has seen educational descriptions — auto-expand on first iteration
let hasSeenEducational = false;

function PhasePanel({
  phase,
  children,
  isFirstIteration,
}: {
  phase: keyof typeof phaseInfo;
  children: React.ReactNode;
  isFirstIteration?: boolean;
}) {
  const info = phaseInfo[phase];
  // Auto-expand educational description on first iteration for Think and Rebuild phases
  const shouldAutoExpand = isFirstIteration && !hasSeenEducational && (phase === 'think' || phase === 'rebuild');
  const [showDesc, setShowDesc] = useState(shouldAutoExpand);

  // Track that user has seen the educational content
  useEffect(() => {
    if (showDesc && isFirstIteration) {
      hasSeenEducational = true;
    }
  }, [showDesc, isFirstIteration]);

  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${info.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          background: info.bg,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onClick={() => setShowDesc(!showDesc)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = `color-mix(in srgb, ${info.color} 12%, transparent)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = info.bg;
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: info.color,
            opacity: 0.6,
          }}
        >
          {info.num}
        </span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: info.color }}>{info.label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{info.zh}</span>
        </div>
        <span
          style={{
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: info.color,
            opacity: 0.6,
          }}
        >
          {info.concept}
        </span>
        <span
          style={{
            fontSize: 10,
            width: 18,
            height: 18,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: showDesc ? '#fff' : 'var(--text-muted)',
            background: showDesc ? `color-mix(in srgb, ${info.color} 60%, transparent)` : 'transparent',
            border: `1px solid ${showDesc ? info.color : 'var(--border-light)'}`,
            transition: 'all 0.2s',
            fontWeight: 600,
          }}
        >
          ?
        </span>
      </div>

      {/* Collapsible description */}
      {showDesc && (
        <div
          className="phase-hint"
          style={{
            padding: '8px 12px',
            borderBottom: `1px solid ${info.border}`,
            fontSize: 11,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            background: 'var(--bg-root)',
          }}
        >
          <span style={{ color: info.color, fontWeight: 700 }}>Concept:</span> {info.desc}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

function StreamingIndicator({ chars, round }: { chars: number; round: number }) {
  return (
    <div
      style={{
        margin: '12px 0',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(6,182,212,0.2)',
        background: 'rgba(6,182,212,0.04)',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--accent)',
            animation: 'glow-pulse 1.5s ease infinite',
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono)',
          }}>
            LLM Streaming — Round {round}
          </div>
          <div style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginTop: 2,
          }}>
            Generating tokens... {chars.toLocaleString()} chars received
          </div>
        </div>
        <div
          style={{
            width: 20,
            height: 20,
            border: '2px solid rgba(6,182,212,0.2)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin-slow 0.8s linear infinite',
          }}
        />
      </div>
      {/* Mini educational note */}
      <div style={{
        marginTop: 8,
        fontSize: 9,
        color: 'var(--text-muted)',
        lineHeight: 1.5,
        fontFamily: 'var(--font-mono)',
        borderTop: '1px solid rgba(6,182,212,0.1)',
        paddingTop: 6,
      }}>
        Streaming keeps the connection alive and reduces time-to-first-byte.
        The LLM generates tokens incrementally via SSE.
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: '6px 10px',
        background: 'var(--bg-root)',
        borderRadius: 'var(--radius-sm)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: color || 'var(--text-primary)',
        }}
      >
        {value}
        {unit && <span style={{ fontSize: 9, opacity: 0.6 }}> {unit}</span>}
      </div>
    </div>
  );
}
