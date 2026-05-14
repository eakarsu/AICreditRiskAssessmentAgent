import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';

const emptyForm = { applicantId: '', type: 'Residential Property', description: '', estimatedValue: '', verifiedValue: '', loanToValue: '', condition: 'Good', location: '', lastAppraisalDate: '', status: 'active' };

export default function CollateralPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [applicants, setApplicants] = useState([]);

  const load = async () => {
    const { data } = await api.get('/collateral'); setItems(Array.isArray(data) ? data : (data.data || []));
    const { data: apps } = await api.get('/applicants'); setApplicants(Array.isArray(apps) ? apps : (apps.data || []));
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editing) await api.put(`/collateral/${selected.id}`, form);
    else await api.post('/collateral', form);
    setShowForm(false); setForm(emptyForm); setEditing(false); load();
  };
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.delete(`/collateral/${id}`); setSelected(null); load(); };
  const handleEdit = (item) => { setForm(item); setEditing(true); setSelected(null); setShowForm(true); };
  const runAI = async (id) => {
    setAiLoading(true); setAiData(null);
    try { const { data } = await api.post('/ai/value-collateral', { collateralId: id }); setAiData(data); }
    catch (err) { setAiData({ analysis: 'Error: ' + err.message }); }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Collateral Management</h1><p>Asset valuation and collateral tracking</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditing(false); setShowForm(true); }}>+ New Collateral</button>
      </div>
      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Type</th><th>Applicant</th><th>Estimated Value</th><th>Verified Value</th><th>LTV</th><th>Condition</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiData(null); }}>
                <td style={{ fontWeight: 600 }}>{item.type}</td>
                <td>{item.Applicant ? `${item.Applicant.firstName} ${item.Applicant.lastName}` : 'N/A'}</td>
                <td>${Number(item.estimatedValue).toLocaleString()}</td>
                <td>${Number(item.verifiedValue).toLocaleString()}</td>
                <td style={{ color: item.loanToValue > 80 ? 'var(--danger)' : item.loanToValue > 60 ? 'var(--warning)' : 'var(--success)' }}>{item.loanToValue}%</td>
                <td>{item.condition}</td>
                <td><span className={`badge ${item.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>{selected.type}</h2><button className="modal-close" onClick={() => setSelected(null)}>×</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Type</label><div className="value">{selected.type}</div></div>
                <div className="detail-item"><label>Applicant</label><div className="value">{selected.Applicant ? `${selected.Applicant.firstName} ${selected.Applicant.lastName}` : 'N/A'}</div></div>
                <div className="detail-item full-width"><label>Description</label><div className="value">{selected.description}</div></div>
                <div className="detail-item"><label>Estimated Value</label><div className="value">${Number(selected.estimatedValue).toLocaleString()}</div></div>
                <div className="detail-item"><label>Verified Value</label><div className="value">${Number(selected.verifiedValue).toLocaleString()}</div></div>
                <div className="detail-item"><label>LTV Ratio</label><div className="value">{selected.loanToValue}%</div></div>
                <div className="detail-item"><label>Condition</label><div className="value">{selected.condition}</div></div>
                <div className="detail-item"><label>Location</label><div className="value">{selected.location}</div></div>
                <div className="detail-item"><label>Last Appraisal</label><div className="value">{selected.lastAppraisalDate}</div></div>
              </div>
              <div style={{ marginTop: 16 }}><button className="btn btn-primary btn-sm" onClick={() => runAI(selected.id)} disabled={aiLoading}>🤖 Run AI Valuation</button></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit' : 'New'} Collateral</h2><button className="modal-close" onClick={() => setShowForm(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Applicant</label>
                <select value={form.applicantId} onChange={(e) => setForm({ ...form, applicantId: e.target.value })}>
                  <option value="">Select</option>
                  {applicants.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option>Residential Property</option><option>Commercial Property</option><option>Vehicle</option><option>Business Equipment</option><option>Investment Portfolio</option><option>Accounts Receivable</option><option>Inventory</option><option>Life Insurance</option><option>Other</option>
                  </select>
                </div>
                <div className="form-group"><label>Condition</label>
                  <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}><option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option><option>New</option><option>N/A</option></select>
                </div>
              </div>
              <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label>Estimated Value</label><input type="number" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} /></div>
                <div className="form-group"><label>Verified Value</label><input type="number" value={form.verifiedValue} onChange={(e) => setForm({ ...form, verifiedValue: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>LTV Ratio %</label><input type="number" step="0.1" value={form.loanToValue} onChange={(e) => setForm({ ...form, loanToValue: e.target.value })} /></div>
                <div className="form-group"><label>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Last Appraisal Date</label><input type="date" value={form.lastAppraisalDate} onChange={(e) => setForm({ ...form, lastAppraisalDate: e.target.value })} /></div>
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
