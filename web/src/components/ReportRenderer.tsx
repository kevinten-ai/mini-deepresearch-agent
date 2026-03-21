import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MermaidBlock } from './MermaidBlock';

/** Split content into markdown and mermaid segments for reliable rendering */
function splitContent(content: string): Array<{ type: 'markdown' | 'mermaid'; content: string }> {
  const parts: Array<{ type: 'markdown' | 'mermaid'; content: string }> = [];
  const regex = /```mermaid\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'markdown', content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'mermaid', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'markdown', content: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'markdown', content }];
}

export function ReportRenderer({
  content,
  citations,
}: {
  content: string;
  citations: any[];
}) {
  const parts = splitContent(content);
  const imageCount = (content.match(/!\[.*?\]\(https?:\/\/.*?\)/g) || []).length;
  const mermaidCount = parts.filter((p) => p.type === 'mermaid').length;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-root)',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent)',
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Research Complete
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Research Report
          </h1>
          {/* Media summary badges */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {mermaidCount > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  padding: '3px 8px',
                  borderRadius: 10,
                  background: 'rgba(6,182,212,0.1)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(6,182,212,0.2)',
                }}
              >
                {mermaidCount} diagram{mermaidCount > 1 ? 's' : ''}
              </span>
            )}
            {imageCount > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  padding: '3px 8px',
                  borderRadius: 10,
                  background: 'rgba(167,139,250,0.1)',
                  color: 'var(--phase-observe)',
                  border: '1px solid rgba(167,139,250,0.2)',
                }}
              >
                {imageCount} AI image{imageCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Report Content */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: '32px 28px',
            lineHeight: 1.8,
            fontSize: 15,
            color: 'var(--text-secondary)',
          }}
          className="report-content"
        >
          <style>{`
            .report-content h1, .report-content h2, .report-content h3 {
              color: var(--text-primary);
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
            .report-content h1 { font-size: 22px; }
            .report-content h2 { font-size: 18px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
            .report-content h3 { font-size: 15px; }
            .report-content p { margin-bottom: 1em; }
            .report-content ul, .report-content ol { padding-left: 1.5em; margin-bottom: 1em; }
            .report-content li { margin-bottom: 0.3em; }
            .report-content a { color: var(--accent); text-decoration: none; }
            .report-content a:hover { text-decoration: underline; }
            .report-content code {
              background: var(--bg-root);
              padding: 2px 6px;
              border-radius: 4px;
              font-family: var(--font-mono);
              font-size: 13px;
              color: var(--phase-observe);
            }
            .report-content blockquote {
              border-left: 3px solid var(--accent);
              padding-left: 16px;
              color: var(--text-muted);
              margin: 1em 0;
            }
            .report-content strong { color: var(--text-primary); }
            .report-content pre {
              background: var(--bg-root);
              padding: 16px;
              border-radius: var(--radius-md);
              overflow-x: auto;
              border: 1px solid var(--border);
              margin: 1em 0;
            }
            .report-content pre code {
              background: none;
              padding: 0;
            }
            .report-content table {
              width: 100%;
              border-collapse: collapse;
              margin: 1em 0;
            }
            .report-content th, .report-content td {
              border: 1px solid var(--border);
              padding: 8px 12px;
              text-align: left;
              font-size: 13px;
            }
            .report-content th {
              background: var(--bg-elevated);
              color: var(--text-primary);
              font-weight: 600;
            }
            .report-content img {
              max-width: 100%;
              border-radius: var(--radius-md);
              margin: 1em 0;
              border: 1px solid var(--border);
            }
          `}</style>

          {parts.map((part, i) =>
            part.type === 'mermaid' ? (
              <MermaidBlock key={i} chart={part.content} />
            ) : (
              <ReactMarkdown
                key={i}
                components={{
                  img: ({ src, alt }) => <ReportImage src={src || ''} alt={alt || ''} />,
                }}
              >
                {part.content}
              </ReactMarkdown>
            ),
          )}
        </div>

        {/* Citations */}
        {citations.length > 0 && (
          <div
            style={{
              marginTop: 20,
              padding: 20,
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Sources ({citations.length})
            </div>
            {citations.map((c: any) => (
              <div
                key={c.id}
                style={{
                  fontSize: 12,
                  marginBottom: 8,
                  display: 'flex',
                  gap: 8,
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent)',
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                >
                  [{c.id}]
                </span>
                <div>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                  >
                    {c.title || c.url}
                  </a>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 8 }}>
                    — {c.foundBy}, round {c.foundAt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Report stats */}
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-light)',
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}
        >
          <span>Report: {content.length.toLocaleString()} chars</span>
          <span>Sources: {citations.length}</span>
          {mermaidCount > 0 && <span>Diagrams: {mermaidCount}</span>}
          {imageCount > 0 && <span>Images: {imageCount}</span>}
          <span>Generated by Mini DeepResearch Agent</span>
        </div>
      </div>
    </div>
  );
}

/** Image component with loading state and error handling */
function ReportImage({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div style={{ margin: '1em 0', textAlign: 'center' }}>
      {status === 'loading' && (
        <div
          style={{
            padding: 24,
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: 12,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: '2px solid var(--border-light)',
              borderTopColor: 'var(--phase-observe)',
              borderRadius: '50%',
              animation: 'spin-slow 1s linear infinite',
              margin: '0 auto 8px',
            }}
          />
          Loading AI-generated image...
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        style={{
          maxWidth: '100%',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          display: status === 'loaded' ? 'inline-block' : 'none',
        }}
      />
      {status === 'error' && (
        <div
          style={{
            padding: 12,
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: 11,
          }}
        >
          Image unavailable: {alt}
        </div>
      )}
      {status === 'loaded' && alt && (
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          AI-generated: {alt}
        </div>
      )}
    </div>
  );
}
