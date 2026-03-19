import ReactMarkdown from 'react-markdown';

export function ReportRenderer({
  content,
  citations,
}: {
  content: string;
  citations: any[];
}) {
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h3>Research Report</h3>
      <div style={{ lineHeight: 1.7, fontSize: 15 }}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
      {citations.length > 0 && (
        <div style={{ marginTop: 24, padding: 16, background: '#f8f8f8', borderRadius: 8 }}>
          <h4>Sources</h4>
          {citations.map((c: any) => (
            <div key={c.id} style={{ fontSize: 13, marginBottom: 6 }}>
              [{c.id}]{' '}
              <a href={c.url} target="_blank" rel="noopener noreferrer">
                {c.title || c.url}
              </a>
              <span style={{ color: '#999' }}>
                {' '}
                — found by {c.foundBy}, round {c.foundAt}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
