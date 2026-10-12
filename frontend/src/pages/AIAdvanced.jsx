import NativeAIControls from "../components/NativeAIControls.jsx";
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';
import Modal from '../components/AIWorkspaceModal';

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

const PRESET_NAMES = ['Balanced case', 'Cautious case', 'Stress case'];
const TOOL_EXAMPLES = {
  'scenario-simulation': [
    { scenarios: '[{"income_change":8,"debt_change":-5,"rate":6.9},{"income_change":0,"debt_change":0,"rate":7.5}]' },
    { scenarios: '[{"income_change":3,"debt_change":5,"rate":7.8},{"income_change":-4,"debt_change":8,"rate":8.4}]' },
    { scenarios: '[{"income_change":-15,"debt_change":20,"rate":9.5},{"income_change":-25,"debt_change":30,"rate":10.5}]' },
  ],
  'adverse-action': [
    { denial_reasons: 'Debt-to-income ratio exceeds policy threshold\nInsufficient verified income for requested amount' },
    { denial_reasons: 'Limited credit history\nRecent delinquency reported by the selected applicant record' },
    { denial_reasons: 'Credit score below product minimum\nHigh revolving utilization\nRecent bankruptcy history' },
  ],
  'market-benchmark': [
    { proposed_rate: '7.25', loan_type: 'Auto', credit_score: '720', term_months: '60' },
    { proposed_rate: '9.10', loan_type: 'Personal', credit_score: '665', term_months: '36' },
    { proposed_rate: '12.75', loan_type: 'Small business', credit_score: '610', term_months: '48' },
  ],
  'macro-impact': [
    { gdp_forecast: '2.1', unemployment_forecast: '4.2', rate_forecast: '4.5' },
    { gdp_forecast: '0.5', unemployment_forecast: '5.6', rate_forecast: '5.25' },
    { gdp_forecast: '-2.0', unemployment_forecast: '7.8', rate_forecast: '6.0' },
  ],
  'generate-regulatory-narrative': [
    { exposureData: '{"totalExposure":1000000,"weightedAvgPD":0.024,"sectorBreakdown":{"consumer":600000,"smb":400000}}', framework: 'Basel III / CECL', periodLabel: '2026 Q3' },
    { exposureData: '{"totalExposure":2400000,"weightedAvgPD":0.041,"pastDue30Days":175000,"sectorBreakdown":{"consumer":900000,"commercial":1500000}}', framework: 'CECL', periodLabel: 'September 2026' },
    { exposureData: '{"totalExposure":5100000,"weightedAvgPD":0.087,"watchlistExposure":1250000,"sectorBreakdown":{"commercialRealEstate":3100000,"smb":2000000}}', framework: 'Basel III stress review', periodLabel: '2026 adverse scenario' },
  ],
};

function realReference(current, records, index) {
  if (current !== '' && current !== undefined && current !== null && records.some((record) => String(record.id) === String(current))) return current;
  return records[index % records.length]?.id ?? '';
}

export function buildAdvancedPreset(tool, index, current, applicants, portfolios) {
  const example = TOOL_EXAMPLES[tool.id]?.[index] || {};
  const next = {};
  const manual = [];
  tool.needs.forEach((field) => {
    if (field === 'applicantId') {
      next[field] = realReference(current.applicantId, applicants, index);
      if (!next[field]) manual.push('an existing applicant');
    } else if (field === 'portfolioId') {
      next[field] = realReference(current.portfolioId, portfolios, index);
      if (!next[field]) manual.push('an existing portfolio');
    } else {
      next[field] = example[field] ?? '';
      if (next[field] === '') manual.push(field.replace(/_/g, ' '));
    }
  });
  return { values: next, filled: Object.values(next).filter((value) => value !== '').length, manual };
}

export default function AIAdvanced() {
  const [tool, setTool] = useState(TOOLS[0]);
  const [applicants, setApplicants] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);

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
        <select data-ai-field={"applicantId"} value={form.applicantId || ''} onChange={(e) => setForm({ ...form, applicantId: parseInt(e.target.value) })}>
          <option value="">— Select applicant —</option>
          {applicants.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName} ({a.creditScore})</option>)}
        </select>
      );
    }
    if (n === 'portfolioId') {
      return (
        <select data-ai-field={"portfolioId"} value={form.portfolioId || ''} onChange={(e) => setForm({ ...form, portfolioId: parseInt(e.target.value) })}>
          <option value="">— Select portfolio —</option>
          {portfolios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      );
    }
    if (n === 'scenarios') {
      return (
        <textarea
          data-ai-field="scenarios"
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
          data-ai-field="exposureData"
          rows={6}
          placeholder='{"totalExposure":1000000,"weightedAvgPD":0.024,"sectorBreakdown":{"consumer":600000,"smb":400000}}'
          value={typeof form.exposureData === 'string' ? form.exposureData : JSON.stringify(form.exposureData || {}, null, 2)}
          onChange={(e) => setForm({ ...form, exposureData: e.target.value })}
        />
      );
    }
    if (n === 'denial_reasons') {
      return (
        <textarea data-ai-field={"denial_reasons"}
          rows={4}
          placeholder="One reason per line, e.g.&#10;Insufficient income&#10;High debt-to-income ratio"
          value={form.denial_reasons || ''}
          onChange={(e) => setForm({ ...form, denial_reasons: e.target.value })}
        />
      );
    }
    return (
      <input data-ai-field={n} value={form[n] || ''} onChange={(e) => setForm({ ...form, [n]: e.target.value })} placeholder={n} />
    );
  };

  const presets = PRESET_NAMES.map((name, index) => ({
    name,
    fill: () => {
      const preset = buildAdvancedPreset(tool, index, form, applicants, portfolios);
      setForm(preset.values);
      setResult(null);
      return { filled: preset.filled, manual: preset.manual };
    },
  }));

  return (
    <NativeAIControls busy={loading} context="CreditRiskAssessmentAgent" presets={presets}><div>
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
                <tr><th>Endpoint</th><th>Entity</th><th>Model</th><th>When</th><th>Tokens</th><th>Result</th></tr>
              </thead>
              <tbody>
                {history.slice(0, 20).map((h) => (
                  <tr key={h.id}>
                    <td>{h.endpoint}</td>
                    <td>{h.entityType ? `${h.entityType} #${h.entityId}` : '—'}</td>
                    <td>{h.model || '—'}</td>
                    <td>{new Date(h.createdAt).toLocaleString()}</td>
                    <td>{h.usageTokens || 0}</td>
                    <td><button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedHistory(h)}>View report</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selectedHistory && (
        <Modal
          title={`Saved ${selectedHistory.endpoint.replace(/-/g, ' ')} report`}
          onClose={() => setSelectedHistory(null)}
          footer={<button type="button" className="btn btn-secondary" onClick={() => setSelectedHistory(null)}>Close</button>}
        >
          <AIAnalysis data={selectedHistory.result} />
        </Modal>
      )}
    </div></NativeAIControls>
  );
}
