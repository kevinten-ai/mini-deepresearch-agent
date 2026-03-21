import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const exampleQueries = [
  'AI Agent 架构模式对比分析',
  '2024年诺贝尔物理学奖研究背景',
  'Rust vs Go 在云原生领域的技术选型',
  'mRNA 疫苗技术的最新进展',
];

export function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'report' | 'qa'>('report');
  const [agentCount, setAgentCount] = useState(2);
  const [maxIterations, setMaxIterations] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hoveredConcept, setHoveredConcept] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!query.trim()) return;
    const params = new URLSearchParams({
      query,
      mode,
      agentCount: String(agentCount),
      maxIterations: String(maxIterations),
    });
    navigate(`/research?${params.toString()}`);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background grid effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(6,182,212,0.06) 1px, transparent 0)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(6,182,212,0.08) 0%, rgba(6,182,212,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div
        style={{
          maxWidth: 640,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Title — stagger 1 */}
        <div className="stagger-1" style={{ textAlign: 'center', marginBottom: 48 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 20,
              background: 'rgba(6,182,212,0.1)',
              border: '1px solid rgba(6,182,212,0.2)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent)',
              marginBottom: 20,
              letterSpacing: 0.5,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'glow-pulse 2s ease infinite' }} />
            Workshop 6 — AI Agent Deep Dive
          </div>

          <h1
            style={{
              fontSize: 44,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              marginBottom: 16,
              background: 'linear-gradient(135deg, #e8edf5 0%, #06b6d4 40%, #a78bfa 70%, #06b6d4 100%)',
              backgroundSize: '200% 200%',
              animation: 'gradient-shift 6s ease infinite',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Mini DeepResearch
            <br />
            Agent
          </h1>

          <p
            style={{
              fontSize: 16,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              maxWidth: 480,
              margin: '0 auto',
            }}
          >
            透明化的深度研究 Agent，实时可视化
            <span style={{ color: 'var(--phase-think)', fontWeight: 600 }}> Think</span>-
            <span style={{ color: 'var(--phase-act)', fontWeight: 600 }}>Act</span>-
            <span style={{ color: 'var(--phase-observe)', fontWeight: 600 }}>Observe</span>-
            <span style={{ color: 'var(--phase-evaluate)', fontWeight: 600 }}>Evaluate</span>-
            <span style={{ color: 'var(--phase-rebuild)', fontWeight: 600 }}>Rebuild</span> 循环
          </p>
        </div>

        {/* Input Area — stagger 2 */}
        <div
          className="stagger-2"
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
            padding: 20,
            marginBottom: 16,
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)';
            e.currentTarget.style.boxShadow = '0 0 24px rgba(6,182,212,0.08)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-light)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入你的研究问题..."
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            style={{
              width: '100%',
              padding: 0,
              fontSize: 16,
              fontFamily: 'var(--font-display)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'var(--text-primary)',
              lineHeight: 1.6,
            }}
          />

          {/* Example queries */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: '24px' }}>
              示例:
            </span>
            {exampleQueries.map((eq, i) => (
              <button
                key={eq}
                onClick={() => setQuery(eq)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 12,
                  border: `1px solid ${query === eq ? 'var(--accent)' : 'var(--border-light)'}`,
                  background: query === eq ? 'rgba(6,182,212,0.12)' : 'var(--bg-elevated)',
                  color: query === eq ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font-display)',
                  animation: `fadeIn 0.3s ease ${0.4 + i * 0.08}s backwards`,
                }}
                onMouseEnter={(e) => {
                  if (query !== eq) {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.color = 'var(--accent)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (query !== eq) {
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {eq}
              </button>
            ))}
          </div>
        </div>

        {/* Controls Row — stagger 3 */}
        <div className="stagger-3" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['report', 'qa'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${mode === m ? 'var(--accent)' : 'var(--border-light)'}`,
                background: mode === m ? 'rgba(6,182,212,0.12)' : 'var(--bg-surface)',
                color: mode === m ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: mode === m ? 'scale(1.02)' : 'scale(1)',
              }}
              onMouseEnter={(e) => {
                if (mode !== m) e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)';
              }}
              onMouseLeave={(e) => {
                if (mode !== m) e.currentTarget.style.borderColor = 'var(--border-light)';
              }}
            >
              {m === 'report' ? '📊 Report 模式' : '💬 Q&A 模式'}
            </button>
          ))}
        </div>

        {/* Advanced toggle — stagger 4 */}
        <div className="stagger-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px 0',
              marginBottom: 12,
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <span style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              ▸
            </span>
            Advanced Settings
          </button>

          {showAdvanced && (
            <div
              style={{
                padding: 16,
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                marginBottom: 16,
                animation: 'fadeIn 0.3s ease',
                overflow: 'hidden',
              }}
            >
              <SliderField
                label="Parallel Agents"
                value={agentCount}
                min={1}
                max={3}
                onChange={setAgentCount}
                hint={agentCount === 1 ? 'Single perspective' : `${agentCount} parallel research perspectives`}
              />
              <SliderField
                label="Max Iterations"
                value={maxIterations}
                min={1}
                max={10}
                onChange={setMaxIterations}
                hint={maxIterations <= 2 ? 'Quick scan' : maxIterations <= 5 ? 'Balanced depth' : 'Deep research'}
              />
            </div>
          )}
        </div>

        {/* Start Button — stagger 5 */}
        <button
          className={query.trim() ? 'stagger-5 btn-shimmer' : 'stagger-5'}
          onClick={handleSubmit}
          disabled={!query.trim()}
          style={{
            width: '100%',
            padding: '14px 24px',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: query.trim()
              ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'
              : 'var(--bg-elevated)',
            color: query.trim() ? '#fff' : 'var(--text-muted)',
            cursor: query.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: query.trim() ? '0 4px 24px rgba(6,182,212,0.3)' : 'none',
            letterSpacing: '0.02em',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            if (query.trim()) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(6,182,212,0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            if (query.trim()) {
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(6,182,212,0.3)';
            }
          }}
        >
          Start Deep Research
          {query.trim() && (
            <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 8, fontWeight: 400 }}>
              ↵ Enter
            </span>
          )}
        </button>

        {/* Architecture Diagram — stagger 6 */}
        <div
          className="stagger-6"
          style={{
            marginTop: 48,
            padding: 24,
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent)',
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            System Architecture
          </div>

          {/* Pipeline flow with animated arrows */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 20 }}>
            <ArchNode label="User Query" color="var(--text-primary)" />
            <ArchArrowAnimated />
            <ArchNode label="Orchestrator" color="var(--accent)" sub="分解问题 → 分配视角" />
            <ArchArrowAnimated />
            <ArchNode label="Synthesizer" color="var(--phase-observe)" sub="合成最终报告" />
            <ArchArrowAnimated />
            <ArchNode label="Report" color="var(--success)" />
          </div>

          {/* Agent detail */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              paddingTop: 16,
              borderTop: '1px dashed var(--border-light)',
            }}
          >
            {[1, 2].map((n) => (
              <div
                key={n}
                className="arch-node-interactive"
                style={{
                  flex: '0 1 220px',
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-elevated)',
                  animation: `fadeIn 0.4s ease ${0.6 + n * 0.1}s backwards`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--phase-act)',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: 8,
                  }}
                >
                  Research Agent {n}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {['Think', 'Act', 'Observe', 'Eval', 'Rebuild'].map((p, i) => {
                    const phaseKey = ['think', 'act', 'observe', 'evaluate', 'rebuild'][i];
                    return (
                      <span
                        key={p}
                        style={{
                          fontSize: 9,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: `var(--phase-${phaseKey}-bg)`,
                          color: `var(--phase-${phaseKey})`,
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                          cursor: 'default',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.boxShadow = `0 0 8px var(--phase-${phaseKey})`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {p}
                      </span>
                    );
                  })}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  ↩ Loop until completeness ≥ 80%
                </div>
              </div>
            ))}
          </div>

          {/* Key concepts with hover interaction */}
          <div
            style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
            }}
          >
            {[
              {
                id: 'react',
                label: 'ReAct Pattern',
                desc: 'Think → Act → Observe 循环推理',
                detail: 'Reasoning + Acting: LLM 先推理分析，再调用工具获取信息，最后观察结果。这个循环让 Agent 能够逐步深入研究。',
                color: 'var(--phase-think)',
              },
              {
                id: 'markov',
                label: 'Markovian Rebuild',
                desc: '状态压缩，无限迭代不爆上下文',
                detail: '每轮结束后，所有发现被压缩进"演化报告"，丢弃原始数据。下一轮只看当前状态 — 马尔可夫性保证上下文窗口有界。',
                color: 'var(--phase-rebuild)',
              },
              {
                id: 'multi',
                label: 'Multi-Agent',
                desc: '多视角并行研究，最终合成',
                detail: 'Orchestrator 将问题分解为多个研究视角，每个 Agent 独立研究，最终由 Synthesizer 合成统一报告。',
                color: 'var(--phase-act)',
              },
            ].map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${hoveredConcept === c.id ? `color-mix(in srgb, ${c.color} 40%, transparent)` : 'var(--border)'}`,
                  background: hoveredConcept === c.id ? `color-mix(in srgb, ${c.color} 6%, transparent)` : 'var(--bg-root)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={() => setHoveredConcept(c.id)}
                onMouseLeave={() => setHoveredConcept(null)}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: c.color,
                    fontFamily: 'var(--font-mono)',
                    marginBottom: 2,
                  }}
                >
                  {c.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>{c.desc}</div>
                {hoveredConcept === c.id && (
                  <div
                    className="phase-hint"
                    style={{
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: `1px solid color-mix(in srgb, ${c.color} 20%, transparent)`,
                      fontSize: 9,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    {c.detail}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchNode({ label, color, sub }: { label: string; color: string; sub?: string }) {
  return (
    <div
      className="arch-node-interactive"
      style={{
        padding: '8px 14px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-light)',
        background: 'var(--bg-elevated)',
        textAlign: 'center',
        minWidth: 90,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ArchArrowAnimated() {
  return (
    <div
      style={{
        width: 32,
        textAlign: 'center',
        color: 'var(--accent)',
        fontSize: 14,
        fontFamily: 'var(--font-mono)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ opacity: 0.3 }}>→</span>
      <span
        style={{
          position: 'absolute',
          animation: 'flow-right 1.5s ease-in-out infinite',
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        ›
      </span>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
          fontSize: 12,
        }}
      >
        <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hint && (
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {hint}
            </span>
          )}
          <span style={{ color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-mono)', minWidth: 16, textAlign: 'right' }}>
            {value}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: 'var(--accent)' }}
      />
    </div>
  );
}
