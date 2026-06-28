import React, { useState } from 'react';
import AIAnalysis from '../components/AIAnalysis';

const DEFAULT_FORM = {
  dscr: 1.08,
  leverageRatio: 4.1,
  liquidityDays: 32,
  lateReportingDays: 8,
};

const SAMPLES = [
  {
    label: 'Watchlist borrower',
    values: { dscr: 1.08, leverageRatio: 4.1, liquidityDays: 32, lateReportingDays: 8 },
  },
  {
    label: 'Compliant borrower',
    values: { dscr: 1.42, leverageRatio: 2.8, liquidityDays: 74, lateReportingDays: 0 },
  },
  {
    label: 'Likely breach',
    values: { dscr: 0.91, leverageRatio: 5.2, liquidityDays: 18, lateReportingDays: 21 },
  },
  {
    label: 'Liquidity stress',
    values: { dscr: 1.22, leverageRatio: 3.4, liquidityDays: 12, lateReportingDays: 3 },
  },
];

const FIELDS = [
  {
    key: 'dscr',
    label: 'Debt Service Coverage Ratio',
    helper: 'Lower than 1.25x increases covenant pressure.',
    step: '0.01',
  },
  {
    key: 'leverageRatio',
    label: 'Leverage Ratio',
    helper: 'Higher than 3.5x increases breach likelihood.',
    step: '0.01',
  },
  {
    key: 'liquidityDays',
    label: 'Liquidity Days',
    helper: 'Days of cash runway available to borrower.',
    step: '1',
  },
  {
    key: 'lateReportingDays',
    label: 'Late Reporting Days',
    helper: 'Number of days borrower reporting is overdue.',
    step: '1',
  },
];

function levelBadge(level) {
  if (level === 'breach-likely') return 'badge-danger';
  if (level === 'watch') return 'badge-warning';
  return 'badge-success';
}

export default function CovenantBreachRisk() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/covenant-breach-risk/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Covenant Breach Risk</h1>
          <p>Score borrower covenant pressure using DSCR, leverage, liquidity runway, and late reporting signals.</p>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="data-table-container covenant-panel">
        <div className="table-header">
          <h3>Borrower Covenant Inputs</h3>
          {result && (
            <span className={`badge ${levelBadge(result.covenant_status)}`}>
              {String(result.covenant_status).replace(/-/g, ' ')} · {result.breach_score}/100
            </span>
          )}
        </div>

        <div className="covenant-body">
          <div className="sample-fill-row">
            {SAMPLES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setForm(sample.values); setResult(null); setError(null); }}
              >
                {sample.label}
              </button>
            ))}
          </div>

          <div className="form-row">
            {FIELDS.map((field) => (
              <div key={field.key} className="form-group">
                <label>{field.label}</label>
                <input
                  type="number"
                  step={field.step}
                  value={form[field.key]}
                  onChange={(event) => setField(field.key, Number(event.target.value))}
                />
                <div className="field-helper">{field.helper}</div>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Scoring...' : 'Score Covenant'}
          </button>
        </div>
      </div>

      <AIAnalysis data={result} loading={loading} />
    </div>
  );
}
