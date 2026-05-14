import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';

const emptyForm = { reportType: '', regulatoryBody: '', period: '', status: 'draft', complianceScore: '', findings: '', recommendations: '', dueDate: '' };

export default function Regulatory() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { const { data } = await api.get('/regulatory'); setItems(Array.isArray(data) ? data : (data.data || [])); };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editing) await api.put(`/regulatory/${selected.id}`, form);
    else await api.post('/regulatory', form);
    setShowForm(false); setForm(emptyForm); setEditing(false); load();
  };
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.delete(`/regulatory/${id}`); setSelected(null); load(); };
  const handleEdit = (item) => { setForm(item); setEditing(true); setSelected(null); setShowForm(true); };
  const runAI = async (id) => {
    setAiLoading(true); setAiData(null);
    try { const { data } = await api.post('/ai/compliance-check', { reportId: id }); setAiData(data); }
    catch (err) { setAiData({ analysis: 'Error: ' + err.message }); }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Regulatory Compliance</h1><p>Compliance reporting and audit management</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditing(false); setShowForm(true); }}>+ New Report</button>
      </div>
      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Report Type</th><th>Regulatory Body</th><th>Period</th><th>Score</th><th>Due Date</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiData(null); }}>
                <td style={{ fontWeight: 600 }}>{item.reportType}</td>
                <td>{item.regulatoryBody}</td>
                <td>{item.period}</td>
                <td style={{ color: item.complianceScore >= 90 ? 'var(--success)' : item.complianceScore >= 80 ? 'var(--warning)' : 'var(--danger)' }}>{item.complianceScore}%</td>
                <td>{item.dueDate}</td>
                <td><span className={`badge ${item.status === 'submitted' ? 'badge-success' : item.status === 'draft' ? 'badge-info' : 'badge-warning'}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>{selected.reportType}</h2><button className="modal-close" onClick={() => setSelected(null)}>×</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Regulatory Body</label><div className="value">{selected.regulatoryBody}</div></div>
                <div className="detail-item"><label>Period</label><div className="value">{selected.period}</div></div>
                <div className="detail-item"><label>Compliance Score</label><div className="value">{selected.complianceScore}%</div></div>
                <div className="detail-item"><label>Status</label><div className="value">{selected.status}</div></div>
                <div className="detail-item"><label>Due Date</label><div className="value">{selected.dueDate}</div></div>
                <div className="detail-item"><label>Submitted</label><div className="value">{selected.submittedAt ? new Date(selected.submittedAt).toLocaleDateString() : 'Not submitted'}</div></div>
                <div className="detail-item full-width"><label>Findings</label><div className="value">{selected.findings}</div></div>
                <div className="detail-item full-width"><label>Recommendations</label><div className="value">{selected.recommendations}</div></div>
              </div>
              <div style={{ marginTop: 16 }}><button className="btn btn-primary btn-sm" onClick={() => runAI(selected.id)} disabled={aiLoading}>🤖 Run AI Compliance Check</button></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit' : 'New'} Report</h2><button className="modal-close" onClick={() => setShowForm(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Report Type</label><input value={form.reportType} onChange={(e) => setForm({ ...form, reportType: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label>Regulatory Body</label><input value={form.regulatoryBody} onChange={(e) => setForm({ ...form, regulatoryBody: e.target.value })} /></div>
                <div className="form-group"><label>Period</label><input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="e.g. 2024-Q1" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Compliance Score</label><input type="number" step="0.1" value={form.complianceScore} onChange={(e) => setForm({ ...form, complianceScore: e.target.value })} /></div>
                <div className="form-group"><label>Due Date</label><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Findings</label><textarea value={form.findings} onChange={(e) => setForm({ ...form, findings: e.target.value })} /></div>
              <div className="form-group"><label>Recommendations</label><textarea value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} /></div>
              <div className="form-group"><label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>draft</option><option>review</option><option>submitted</option></select>
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
