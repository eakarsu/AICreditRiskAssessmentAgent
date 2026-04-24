import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';

const emptyForm = { applicantId: '', caseNumber: '', fraudType: 'Identity Theft', riskLevel: 'medium', amount: '', description: '', indicators: '[]', status: 'open', investigator: '' };

export default function FraudDetection() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { const { data } = await api.get('/fraud'); setItems(data); };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editing) await api.put(`/fraud/${selected.id}`, form);
    else await api.post('/fraud', form);
    setShowForm(false); setForm(emptyForm); setEditing(false); load();
  };
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.delete(`/fraud/${id}`); setSelected(null); load(); };
  const handleEdit = (item) => { setForm(item); setEditing(true); setSelected(null); setShowForm(true); };
  const runAI = async (id) => {
    setAiLoading(true); setAiData(null);
    try { const { data } = await api.post('/ai/analyze-fraud', { caseId: id }); setAiData(data); }
    catch (err) { setAiData({ analysis: 'Error: ' + err.message }); }
    setAiLoading(false);
  };

  const parseIndicators = (str) => { try { return JSON.parse(str); } catch { return []; } };

  return (
    <div>
      <div className="page-header">
        <div><h1>Fraud Detection</h1><p>AI-powered fraud pattern detection and investigation</p></div>
        <button className="btn btn-primary" onClick={() => { setForm({ ...emptyForm, caseNumber: `FRD-${Date.now()}` }); setEditing(false); setShowForm(true); }}>+ New Case</button>
      </div>
      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Case #</th><th>Type</th><th>Risk Level</th><th>Amount</th><th>Status</th><th>Investigator</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiData(null); }}>
                <td style={{ fontWeight: 600 }}>{item.caseNumber}</td>
                <td>{item.fraudType}</td>
                <td><span className={`badge badge-${item.riskLevel}`}>{item.riskLevel}</span></td>
                <td>${Number(item.amount).toLocaleString()}</td>
                <td><span className={`badge ${item.status === 'resolved' ? 'badge-success' : item.status === 'open' ? 'badge-danger' : 'badge-warning'}`}>{item.status}</span></td>
                <td>{item.investigator}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Case {selected.caseNumber}</h2><button className="modal-close" onClick={() => setSelected(null)}>×</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Case Number</label><div className="value">{selected.caseNumber}</div></div>
                <div className="detail-item"><label>Fraud Type</label><div className="value">{selected.fraudType}</div></div>
                <div className="detail-item"><label>Risk Level</label><div className="value"><span className={`badge badge-${selected.riskLevel}`}>{selected.riskLevel}</span></div></div>
                <div className="detail-item"><label>Amount</label><div className="value">${Number(selected.amount).toLocaleString()}</div></div>
                <div className="detail-item"><label>Status</label><div className="value">{selected.status}</div></div>
                <div className="detail-item"><label>Investigator</label><div className="value">{selected.investigator}</div></div>
                <div className="detail-item full-width"><label>Description</label><div className="value">{selected.description}</div></div>
                <div className="detail-item full-width"><label>Fraud Indicators</label>
                  <div className="value">{parseIndicators(selected.indicators).map((ind, i) => <span key={i} className="badge badge-danger" style={{ margin: '2px 4px' }}>{ind}</span>)}</div>
                </div>
                {selected.Applicant && <div className="detail-item full-width"><label>Applicant</label><div className="value">{selected.Applicant.firstName} {selected.Applicant.lastName}</div></div>}
              </div>
              <div style={{ marginTop: 16 }}><button className="btn btn-primary btn-sm" onClick={() => runAI(selected.id)} disabled={aiLoading}>🤖 Run AI Fraud Analysis</button></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit' : 'New'} Fraud Case</h2><button className="modal-close" onClick={() => setShowForm(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Case Number</label><input value={form.caseNumber} onChange={(e) => setForm({ ...form, caseNumber: e.target.value })} /></div>
                <div className="form-group"><label>Fraud Type</label>
                  <select value={form.fraudType} onChange={(e) => setForm({ ...form, fraudType: e.target.value })}>
                    <option>Identity Theft</option><option>Income Fraud</option><option>Application Fraud</option><option>Synthetic Identity</option><option>Account Takeover</option><option>Collusion</option><option>Wire Fraud</option><option>Money Laundering</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Risk Level</label>
                  <select value={form.riskLevel} onChange={(e) => setForm({ ...form, riskLevel: e.target.value })}><option>low</option><option>medium</option><option>high</option><option>critical</option></select>
                </div>
                <div className="form-group"><label>Amount</label><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-group"><label>Investigator</label><input value={form.investigator} onChange={(e) => setForm({ ...form, investigator: e.target.value })} /></div>
              <div className="form-group"><label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>open</option><option>investigating</option><option>resolved</option></select>
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
