import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';

const emptyForm = { applicantId: '', riskScore: '', riskCategory: 'low', creditLimit: '', interestRate: '', approvalStatus: 'review', loanType: 'Personal', loanAmount: '', loanTerm: '', debtToIncomeRatio: '', aiAnalysis: '', aiRecommendation: '', assessedBy: 'Manual' };

export default function Assessments() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [applicants, setApplicants] = useState([]);

  const load = async () => {
    const { data } = await api.get('/assessments');
    setItems(data);
    const { data: apps } = await api.get('/applicants');
    setApplicants(apps);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editing) await api.put(`/assessments/${selected.id}`, form);
    else await api.post('/assessments', form);
    setShowForm(false); setForm(emptyForm); setEditing(false); load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/assessments/${id}`); setSelected(null); load();
  };

  const handleEdit = (item) => { setForm(item); setEditing(true); setSelected(null); setShowForm(true); };

  const runAI = async (applicantId) => {
    setAiLoading(true); setAiData(null);
    try { const { data } = await api.post('/ai/assess-risk', { applicantId }); setAiData(data); }
    catch (err) { setAiData({ analysis: 'Error: ' + err.message }); }
    setAiLoading(false);
  };

  const riskBadge = (cat) => {
    const map = { low: 'badge-success', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-critical' };
    return <span className={`badge ${map[cat] || 'badge-info'}`}>{cat}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Risk Assessments</h1><p>AI-powered credit risk scoring and analysis</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditing(false); setShowForm(true); }}>+ New Assessment</button>
      </div>
      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Applicant</th><th>Risk Score</th><th>Risk Category</th><th>Loan Type</th><th>Loan Amount</th><th>Rate</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiData(null); }}>
                <td style={{ fontWeight: 600 }}>{item.Applicant ? `${item.Applicant.firstName} ${item.Applicant.lastName}` : `#${item.applicantId}`}</td>
                <td><span style={{ fontWeight: 700, color: item.riskScore <= 30 ? 'var(--success)' : item.riskScore <= 60 ? 'var(--warning)' : 'var(--danger)' }}>{item.riskScore}</span></td>
                <td>{riskBadge(item.riskCategory)}</td>
                <td>{item.loanType}</td>
                <td>${Number(item.loanAmount).toLocaleString()}</td>
                <td>{item.interestRate}%</td>
                <td><span className={`badge ${item.approvalStatus === 'approved' ? 'badge-success' : item.approvalStatus === 'denied' ? 'badge-danger' : 'badge-warning'}`}>{item.approvalStatus}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Assessment Details</h2><button className="modal-close" onClick={() => setSelected(null)}>×</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Applicant</label><div className="value">{selected.Applicant ? `${selected.Applicant.firstName} ${selected.Applicant.lastName}` : `#${selected.applicantId}`}</div></div>
                <div className="detail-item"><label>Risk Score</label><div className="value">{selected.riskScore}/100</div></div>
                <div className="detail-item"><label>Risk Category</label><div className="value">{riskBadge(selected.riskCategory)}</div></div>
                <div className="detail-item"><label>Credit Limit</label><div className="value">${Number(selected.creditLimit).toLocaleString()}</div></div>
                <div className="detail-item"><label>Interest Rate</label><div className="value">{selected.interestRate}%</div></div>
                <div className="detail-item"><label>Approval Status</label><div className="value">{selected.approvalStatus}</div></div>
                <div className="detail-item"><label>Loan Type</label><div className="value">{selected.loanType}</div></div>
                <div className="detail-item"><label>Loan Amount</label><div className="value">${Number(selected.loanAmount).toLocaleString()}</div></div>
                <div className="detail-item"><label>Loan Term</label><div className="value">{selected.loanTerm} months</div></div>
                <div className="detail-item"><label>DTI Ratio</label><div className="value">{selected.debtToIncomeRatio}%</div></div>
                <div className="detail-item full-width"><label>AI Analysis</label><div className="value">{selected.aiAnalysis}</div></div>
                <div className="detail-item full-width"><label>AI Recommendation</label><div className="value">{selected.aiRecommendation}</div></div>
              </div>
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-primary btn-sm" onClick={() => runAI(selected.applicantId)} disabled={aiLoading}>🤖 Run AI Assessment</button>
              </div>
              <AIAnalysis data={aiData} loading={aiLoading} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(selected)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>{editing ? 'Edit' : 'New'} Assessment</h2><button className="modal-close" onClick={() => setShowForm(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Applicant</label>
                <select value={form.applicantId} onChange={(e) => setForm({ ...form, applicantId: e.target.value })}>
                  <option value="">Select applicant</option>
                  {applicants.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Risk Score (0-100)</label><input type="number" value={form.riskScore} onChange={(e) => setForm({ ...form, riskScore: e.target.value })} /></div>
                <div className="form-group"><label>Risk Category</label>
                  <select value={form.riskCategory} onChange={(e) => setForm({ ...form, riskCategory: e.target.value })}><option>low</option><option>medium</option><option>high</option><option>critical</option></select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Loan Type</label><input value={form.loanType} onChange={(e) => setForm({ ...form, loanType: e.target.value })} /></div>
                <div className="form-group"><label>Loan Amount</label><input type="number" value={form.loanAmount} onChange={(e) => setForm({ ...form, loanAmount: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Loan Term (months)</label><input type="number" value={form.loanTerm} onChange={(e) => setForm({ ...form, loanTerm: e.target.value })} /></div>
                <div className="form-group"><label>Interest Rate %</label><input type="number" step="0.1" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Credit Limit</label><input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} /></div>
                <div className="form-group"><label>Approval Status</label>
                  <select value={form.approvalStatus} onChange={(e) => setForm({ ...form, approvalStatus: e.target.value })}><option>review</option><option>approved</option><option>denied</option></select>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
