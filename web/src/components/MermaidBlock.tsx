import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

let initialized = false;

export function MermaidBlock({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 9)}`);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!initialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#111827',
          primaryColor: '#1a2035',
          primaryTextColor: '#e8edf5',
          primaryBorderColor: '#06b6d4',
          lineColor: '#566178',
          secondaryColor: '#1a2035',
          tertiaryColor: '#0a0e1a',
          fontFamily: 'Outfit, sans-serif',
          fontSize: '13px',
          nodeBorder: '#06b6d4',
          mainBkg: '#1a2035',
          clusterBkg: '#111827',
          clusterBorder: '#566178',
          titleColor: '#e8edf5',
          edgeLabelBackground: '#111827',
        },
      });
      initialized = true;
    }

    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    mermaid
      .render(idRef.current, chart)
      .then(({ svg }) => {
        if (cancelled) return;
        // Sanitize the SVG output using DOMPurify before inserting into the DOM
        const sanitized = DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['foreignObject'],
        });
        el.textContent = '';
        const wrapper = document.createElement('div');
        wrapper.innerHTML = sanitized;
        el.appendChild(wrapper);
        setRendered(true);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err.message || err));
      });

    return () => {
      cancelled = true;
      // Clean up mermaid's DOM nodes so React doesn't encounter stale children
      if (el) el.textContent = '';
    };
  }, [chart]);

  if (error) {
    return (
      <div
        style={{
          margin: '1em 0',
          padding: 12,
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Diagram source:</div>
        <pre style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div
      style={{
        margin: '1em 0',
        padding: 16,
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        textAlign: 'center',
        overflow: 'auto',
      }}
    >
      {/* Loading indicator — React-managed, kept OUTSIDE the mermaid container */}
      {!rendered && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 20 }}>
          Rendering diagram...
        </div>
      )}
      {/* Mermaid container — exclusively managed by mermaid.js, no React children */}
      <div ref={containerRef} />
      {rendered && (
        <div
          style={{
            marginTop: 8,
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Auto-generated Mermaid Diagram
        </div>
      )}
    </div>
  );
}
