import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';

const TOOLS = [
  { id: 'peer-comparison',     label: 'Peer Comparison Scoring',  desc: 'Compare applicant to cohort with similar profile.', needs: ['applicantId'] },
  { id: 'auto-tier',           label: 'Auto-Tier Assignment',      desc: 'Assign Tier 1/2/3 and route approval workflow.',     needs: ['applicantId'] },
  { id: 'similarity',          label: 'Applicant Similarity',     desc: 'Find similar past applicants and outcomes.',          needs: ['applicantId'] },
  { id: 'risk-mitigation',     label: 'Risk Mitigation',          desc: 'Suggest collateral/guarantor/covenant changes.',      needs: ['applicantId'] },
  { id: 'scenario-simulation', label: 'Scenario Simulation',      desc: 'Model approval under various assumptions.',           needs: ['applicantId', 'scenarios'] },
  { id: 'adverse-action',      label: 'Adverse Action Letter',    desc: 'Draft FCRA/Reg-B compliant denial letter.',           needs: ['applicantId', 'denial_reasons'] },
  { id: 'market-benchmark',    label: 'Market Rate Benchmark',    desc: 'Compare proposed rate vs current market.',            needs: ['proposed_rate', 'loan_type', 'credit_score', 'term_months'] },
  { id: 'macro-impact',        label: 'Macro Economic Impact',    desc: 'Adjust portfolio risk by GDP/unemp/rate forecast.',   needs: ['portfolioId', 'gdp_forecast', 'unemployment_forecast', 'rate_forecast'] },
  { id: 'predict-approval-likelihood', label: 'Predict Approval Likelihood', desc: 'Probability the applicant clears standard underwriting.', needs: ['applicantId'] },
  { id: 'generate-regulatory-narrative', label: 'Regulatory Narrative', desc: 'Turn structured exposure data into a filing narrative.', needs: ['exposureData', 'framework', 'periodLabel'] },
];

export default function AIAdvanced() {
  const [tool, setTool] = useState(TOOLS[0]);
  const [applicants, setApplicants] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [a, p, h] = await Promise.all([
          api.get('/applicants'),
          api.get('/portfolio'),
          api.get('/ai-advanced/results').catch(() => ({ data: { data: [] } })),
        ]);
        setApplicants(Array.isArray(a.data) ? a.data : (a.data.data || []));
        setPortfolios(Array.isArray(p.data) ? p.data : (p.data.data || []));
        setHistory(h.data?.data || []);
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const reloadHistory = async () => {
    try {
      const h = await api.get('/ai-advanced/results');
      setHistory(h.data?.data || []);
    } catch (e) { /* ignore */ }
  };

  const submit = async () => {
    setLoading(true); setResult(null);
    try {
      const body = { ...form };
      if (tool.id === 'scenario-simulation' && typeof body.scenarios === 'string') {
        try { body.scenarios = JSON.parse(body.scenarios); } catch { body.scenarios = []; }
      }
      if (tool.id === 'adverse-action' && typeof body.denial_reasons === 'string') {
        body.denial_reasons = body.denial_reasons.split('\n').map((r) => r.trim()).filter(Boolean);
      }
      if (tool.id === 'generate-regulatory-narrative' && typeof body.exposureData === 'string') {
        try { body.exposureData = JSON.parse(body.exposureData); } catch { body.exposureData = { raw: body.exposureData }; }
      }
      const { data } = await api.post(`/ai-advanced/${tool.id}`, body);
      setResult(data);
      reloadHistory();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.message;
      setResult({ analysis: status === 503 ? `AI provider not configured (503): ${msg}` : `Error: ${msg}` });
    }
    setLoading(false);
  };

  const renderField = (n) => {
    if (n === 'applicantId') {
      return (
        <select value={form.applicantId || ''} onChange={(e) => setForm({ ...form, applicantId: parseInt(e.target.value) })}>
          <option value="">— Select applicant —</option>
          {applicants.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName} ({a.creditScore})</option>)}
        </select>
      );
    }
    if (n === 'portfolioId') {
      return (
        <select value={form.portfolioId || ''} onChange={(e) => setForm({ ...form, portfolioId: parseInt(e.target.value) })}>
          <option value="">— Select portfolio —</option>
          {portfolios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      );
    }
    if (n === 'scenarios') {
      return (
        <textarea
          rows={4}
          placeholder='[{"income_change":10,"debt_change":-5,"rate":7.5}]'
          value={typeof form.scenarios === 'string' ? form.scenarios : JSON.stringify(form.scenarios || [], null, 2)}
          onChange={(e) => setForm({ ...form, scenarios: e.target.value })}
        />
      );
    }
    if (n === 'exposureData') {
      return (
        <textarea
          rows={6}
          placeholder='{"totalExposure":1000000,"weightedAvgPD":0.024,"sectorBreakdown":{"consumer":600000,"smb":400000}}'
          value={typeof form.exposureData === 'string' ? form.exposureData : JSON.stringify(form.exposureData || {}, null, 2)}
          onChange={(e) => setForm({ ...form, exposureData: e.target.value })}
        />
      );
    }
    if (n === 'denial_reasons') {
      return (
        <textarea
          rows={4}
          placeholder="One reason per line, e.g.&#10;Insufficient income&#10;High debt-to-income ratio"
          value={form.denial_reasons || ''}
          onChange={(e) => setForm({ ...form, denial_reasons: e.target.value })}
        />
      );
    }
    return (
      <input value={form[n] || ''} onChange={(e) => setForm({ ...form, [n]: e.target.value })} placeholder={n} />
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Advanced Analytics</h1>
          <p>Specialized AI tools for credit decisioning, fraud, and portfolio strategy</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`btn ${tool.id === t.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textAlign: 'left', padding: '12px 16px' }}
            onClick={() => { setTool(t); setForm({}); setResult(null); }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <div className="data-table-container" style={{ padding: 16, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>{tool.label}</h3>
        {tool.needs.map((n) => (
          <div key={n} className="form-group" style={{ marginBottom: 12 }}>
            <label>{n}</label>
            {renderField(n)}
          </div>
        ))}
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Running…' : 'Run AI'}
        </button>
      </div>

      <AIAnalysis data={result} loading={loading} />

      {history.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Recent AI Runs</h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr><th>Endpoint</th><th>Entity</th><th>Model</th><th>When</th><th>Tokens</th></tr>
              </thead>
              <tbody>
                {history.slice(0, 20).map((h) => (
                  <tr key={h.id}>
                    <td>{h.endpoint}</td>
                    <td>{h.entityType ? `${h.entityType} #${h.entityId}` : '—'}</td>
                    <td>{h.model || '—'}</td>
                    <td>{new Date(h.createdAt).toLocaleString()}</td>
                    <td>{h.usageTokens || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
