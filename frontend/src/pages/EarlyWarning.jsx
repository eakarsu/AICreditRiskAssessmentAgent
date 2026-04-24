import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';

const emptyForm = { applicantId: '', warningType: '', severity: 'medium', triggerMetric: '', triggerValue: '', thresholdValue: '', description: '', recommendedAction: '', status: 'active' };

export default function EarlyWarningPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [applicants, setApplicants] = useState([]);

  const load = async () => {
    const { data } = await api.get('/early-warning'); setItems(data);
    const { data: apps } = await api.get('/applicants'); setApplicants(apps);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editing) await api.put(`/early-warning/${selected.id}`, form);
    else await api.post('/early-warning', form);
    setShowForm(false); setForm(emptyForm); setEditing(false); load();
  };
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.delete(`/early-warning/${id}`); setSelected(null); load(); };
  const handleEdit = (item) => { setForm(item); setEditing(true); setSelected(null); setShowForm(true); };
  const runAI = async (id) => {
    setAiLoading(true); setAiData(null);
    try { const { data } = await api.post('/ai/analyze-warning', { warningId: id }); setAiData(data); }
    catch (err) { setAiData({ analysis: 'Error: ' + err.message }); }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Early Warning System</h1><p>Proactive risk monitoring and alerts</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditing(false); setShowForm(true); }}>+ New Warning</button>
      </div>
      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Warning Type</th><th>Applicant</th><th>Severity</th><th>Trigger</th><th>Value</th><th>Threshold</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiData(null); }}>
                <td style={{ fontWeight: 600 }}>{item.warningType}</td>
                <td>{item.Applicant ? `${item.Applicant.firstName} ${item.Applicant.lastName}` : 'N/A'}</td>
                <td><span className={`badge badge-${item.severity}`}>{item.severity}</span></td>
                <td>{item.triggerMetric}</td>
                <td style={{ fontWeight: 600 }}>{item.triggerValue}</td>
                <td>{item.thresholdValue}</td>
                <td><span className={`badge ${item.status === 'active' ? 'badge-danger' : 'badge-success'}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>{selected.warningType}</h2><button className="modal-close" onClick={() => setSelected(null)}>×</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Warning Type</label><div className="value">{selected.warningType}</div></div>
                <div className="detail-item"><label>Severity</label><div className="value"><span className={`badge badge-${selected.severity}`}>{selected.severity}</span></div></div>
                <div className="detail-item"><label>Trigger Metric</label><div className="value">{selected.triggerMetric}</div></div>
                <div className="detail-item"><label>Trigger Value</label><div className="value">{selected.triggerValue}</div></div>
                <div className="detail-item"><label>Threshold</label><div className="value">{selected.thresholdValue}</div></div>
                <div className="detail-item"><label>Status</label><div className="value">{selected.status}</div></div>
                <div className="detail-item full-width"><label>Description</label><div className="value">{selected.description}</div></div>
                <div className="detail-item full-width"><label>Recommended Action</label><div className="value">{selected.recommendedAction}</div></div>
                {selected.Applicant && <div className="detail-item full-width"><label>Applicant</label><div className="value">{selected.Applicant.firstName} {selected.Applicant.lastName}</div></div>}
              </div>
              <div style={{ marginTop: 16 }}><button className="btn btn-primary btn-sm" onClick={() => runAI(selected.id)} disabled={aiLoading}>🤖 Run AI Warning Analysis</button></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit' : 'New'} Warning</h2><button className="modal-close" onClick={() => setShowForm(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Applicant</label>
                <select value={form.applicantId} onChange={(e) => setForm({ ...form, applicantId: e.target.value })}>
                  <option value="">Select</option>
                  {applicants.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Warning Type</label><input value={form.warningType} onChange={(e) => setForm({ ...form, warningType: e.target.value })} /></div>
                <div className="form-group"><label>Severity</label>
                  <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}><option>low</option><option>medium</option><option>high</option><option>critical</option></select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Trigger Metric</label><input value={form.triggerMetric} onChange={(e) => setForm({ ...form, triggerMetric: e.target.value })} /></div>
                <div className="form-group"><label>Trigger Value</label><input type="number" value={form.triggerValue} onChange={(e) => setForm({ ...form, triggerValue: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Threshold Value</label><input type="number" value={form.thresholdValue} onChange={(e) => setForm({ ...form, thresholdValue: e.target.value })} /></div>
              <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-group"><label>Recommended Action</label><textarea value={form.recommendedAction} onChange={(e) => setForm({ ...form, recommendedAction: e.target.value })} /></div>
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
