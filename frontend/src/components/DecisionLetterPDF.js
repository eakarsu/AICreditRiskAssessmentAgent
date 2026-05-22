import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function DecisionLetterPDF() {
  const [applicants, setApplicants] = useState([]);
  const [applicantId, setApplicantId] = useState('');
  const [decision, setDecision] = useState('approve');
  const [apr, setApr] = useState(7.49);
  const [termMonths, setTermMonths] = useState(60);
  const [amount, setAmount] = useState(25000);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/custom-views/applicants')
      .then((r) => {
        const list = r.data?.data || [];
        setApplicants(list);
        if (list[0]) setApplicantId(list[0].id);
      })
      .catch((e) => setStatus(`Failed to load applicants: ${e.message}`));
  }, []);

  const generate = async () => {
    if (!applicantId) return;
    setBusy(true);
    setStatus(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/custom-views/decision-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          applicantId,
          decision,
          apr: Number(apr),
          termMonths: Number(termMonths),
          amount: Number(amount),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision-letter-${applicantId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus('Decision letter downloaded.');
    } catch (e) {
      setStatus(`Generation failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const decisionColor = decision === 'approve' ? '#059669' : decision === 'decline' ? '#dc2626' : '#d97706';

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>Credit Decision Letter (PDF)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <label style={{ fontSize: 13, color: '#334155' }}>
          Applicant
          <select
            value={applicantId}
            onChange={(e) => setApplicantId(e.target.value)}
            style={inputStyle}
          >
            {applicants.map((a) => (
              <option key={a.id} value={a.id}>{a.name} — FICO {a.ficoBase}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 13, color: '#334155' }}>
          Decision
          <select value={decision} onChange={(e) => setDecision(e.target.value)} style={inputStyle}>
            <option value="approve">Approve</option>
            <option value="conditional">Conditional</option>
            <option value="decline">Decline</option>
          </select>
        </label>

        <label style={{ fontSize: 13, color: '#334155' }}>
          Loan Amount ($)
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} />
        </label>

        <label style={{ fontSize: 13, color: '#334155' }}>
          APR (%)
          <input type="number" step="0.01" value={apr} onChange={(e) => setApr(e.target.value)} style={inputStyle} />
        </label>

        <label style={{ fontSize: 13, color: '#334155' }}>
          Term (months)
          <input type="number" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={generate}
            disabled={busy || !applicantId}
            style={{
              padding: '10px 16px', borderRadius: 8, border: 'none',
              background: decisionColor, color: '#fff', fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, width: '100%',
            }}
          >
            {busy ? 'Generating…' : 'Generate & Download PDF'}
          </button>
        </div>
      </div>

      {status && (
        <div style={{ marginTop: 12, fontSize: 13, color: status.startsWith('Decision') ? '#059669' : '#dc2626' }}>
          {status}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 10px', marginTop: 4,
  borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14,
};
