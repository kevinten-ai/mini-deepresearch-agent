import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'report' | 'qa'>('report');
  const [agentCount, setAgentCount] = useState(2);
  const [maxIterations, setMaxIterations] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    <div style={{ maxWidth: 700, margin: '80px auto', padding: '0 20px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Mini DeepResearch Agent</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>
        An educational deep research agent with transparent Think-Act-Observe-Evaluate loop
      </p>

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter your research question..."
        rows={3}
        style={{
          width: '100%',
          padding: 12,
          fontSize: 16,
          borderRadius: 8,
          border: '1px solid #ddd',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <button
          onClick={() => setMode('report')}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: '1px solid #ddd',
            background: mode === 'report' ? '#0066ff' : '#fff',
            color: mode === 'report' ? '#fff' : '#333',
            cursor: 'pointer',
          }}
        >
          Report Mode
        </button>
        <button
          onClick={() => setMode('qa')}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: '1px solid #ddd',
            background: mode === 'qa' ? '#0066ff' : '#fff',
            color: mode === 'qa' ? '#fff' : '#333',
            cursor: 'pointer',
          }}
        >
          Q&A Mode
        </button>
      </div>

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          background: 'none',
          border: 'none',
          color: '#0066ff',
          cursor: 'pointer',
          padding: 0,
          marginBottom: 12,
        }}
      >
        {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
      </button>

      {showAdvanced && (
        <div style={{ padding: 16, background: '#f8f8f8', borderRadius: 8, marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Parallel Agents: {agentCount}
            <input
              type="range"
              min={1}
              max={3}
              value={agentCount}
              onChange={(e) => setAgentCount(+e.target.value)}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
          <label style={{ display: 'block' }}>
            Max Iterations: {maxIterations}
            <input
              type="range"
              min={1}
              max={10}
              value={maxIterations}
              onChange={(e) => setMaxIterations(+e.target.value)}
              style={{ display: 'block', width: '100%' }}
            />
          </label>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!query.trim()}
        style={{
          width: '100%',
          padding: '12px 24px',
          fontSize: 16,
          borderRadius: 8,
          border: 'none',
          background: query.trim() ? '#0066ff' : '#ccc',
          color: '#fff',
          cursor: query.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        Start Research
      </button>
    </div>
  );
}
