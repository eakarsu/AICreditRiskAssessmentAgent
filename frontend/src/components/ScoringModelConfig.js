import React, { useEffect, useState } from 'react';
import api from '../services/api';

const FACTORS = [
  { key: 'income',      label: 'Annual Income' },
  { key: 'dti',         label: 'Debt-to-Income (DTI)' },
  { key: 'utilization', label: 'Credit Utilization' },
  { key: 'inquiries',   label: 'Recent Inquiries' },
  { key: 'length',      label: 'Credit History Length' },
];

export default function ScoringModelConfig() {
  const [weights, setWeights] = useState({ income: 25, dti: 25, utilization: 20, inquiries: 10, length: 20 });
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const total = Object.values(weights).reduce((s, v) => s + Number(v), 0);

  const preview = async (w = weights) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/custom-views/score-preview', { weights: w });
      setResults(res.data?.results || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { preview(); /* initial */ }, []);

  const onChange = (key, value) => {
    const next = { ...weights, [key]: Number(value) };
    setWeights(next);
    preview(next);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#0f172a' }}>Scoring Model Configurator</h3>
        <div style={{ fontSize: 13, color: '#64748b' }}>Total weight: {total}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          {FACTORS.map((f) => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#334155' }}>
                <span>{f.label}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{weights[f.key]}</span>
              </div>
              <input
                type="range" min={0} max={50} step={1}
                value={weights[f.key]}
                onChange={(e) => onChange(f.key, e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          ))}
          {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
            Preview ({busy ? 'updating…' : 'live'})
          </div>
          <div style={{ maxHeight: 360, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={th}>Applicant</th>
                  <th style={th}>Baseline</th>
                  <th style={th}>Preview</th>
                  <th style={th}>Δ</th>
                  <th style={th}>Band</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const deltaColor = r.delta > 0 ? '#059669' : r.delta < 0 ? '#dc2626' : '#64748b';
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={td}>{r.name}</td>
                      <td style={td}>{r.baselineScore}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{r.previewScore}</td>
                      <td style={{ ...td, color: deltaColor, fontWeight: 600 }}>
                        {r.delta > 0 ? '+' : ''}{r.delta}
                      </td>
                      <td style={td}>{r.band}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const th = { padding: '8px 10px', textAlign: 'left', color: '#475569', fontWeight: 600 };
const td = { padding: '8px 10px', color: '#0f172a' };
