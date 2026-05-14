import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';

const emptyForm = { name: '', totalValue: '', totalLoans: '', averageRiskScore: '', defaultRate: '', performanceGrade: 'B', sector: '', region: '', vintage: '', expectedLoss: '', actualLoss: '', status: 'active' };

export default function Portfolio() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { const { data } = await api.get('/portfolio'); setItems(Array.isArray(data) ? data : (data.data || [])); };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editing) await api.put(`/portfolio/${selected.id}`, form);
    else await api.post('/portfolio', form);
    setShowForm(false); setForm(emptyForm); setEditing(false); load();
  };
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.delete(`/portfolio/${id}`); setSelected(null); load(); };
  const handleEdit = (item) => { setForm(item); setEditing(true); setSelected(null); setShowForm(true); };
  const runAI = async (id) => {
    setAiLoading(true); setAiData(null);
    try { const { data } = await api.post('/ai/analyze-portfolio', { portfolioId: id }); setAiData(data); }
    catch (err) { setAiData({ analysis: 'Error: ' + err.message }); }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Portfolio Management</h1><p>Monitor and analyze credit portfolios</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditing(false); setShowForm(true); }}>+ New Portfolio</button>
      </div>
      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Total Value</th><th>Loans</th><th>Avg Risk</th><th>Default Rate</th><th>Grade</th><th>Sector</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiData(null); }}>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td>${(Number(item.totalValue) / 1e6).toFixed(1)}M</td>
                <td>{item.totalLoans?.toLocaleString()}</td>
                <td>{item.averageRiskScore}</td>
                <td style={{ color: item.defaultRate > 5 ? 'var(--danger)' : item.defaultRate > 3 ? 'var(--warning)' : 'var(--success)' }}>{item.defaultRate}%</td>
                <td><span className="badge badge-info">{item.performanceGrade}</span></td>
                <td>{item.sector}</td>
                <td><span className={`badge ${item.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>{selected.name}</h2><button className="modal-close" onClick={() => setSelected(null)}>×</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Total Value</label><div className="value">${Number(selected.totalValue).toLocaleString()}</div></div>
                <div className="detail-item"><label>Total Loans</label><div className="value">{selected.totalLoans?.toLocaleString()}</div></div>
                <div className="detail-item"><label>Avg Risk Score</label><div className="value">{selected.averageRiskScore}</div></div>
                <div className="detail-item"><label>Default Rate</label><div className="value">{selected.defaultRate}%</div></div>
                <div className="detail-item"><label>Performance Grade</label><div className="value">{selected.performanceGrade}</div></div>
                <div className="detail-item"><label>Sector</label><div className="value">{selected.sector}</div></div>
                <div className="detail-item"><label>Region</label><div className="value">{selected.region}</div></div>
                <div className="detail-item"><label>Vintage</label><div className="value">{selected.vintage}</div></div>
                <div className="detail-item"><label>Expected Loss</label><div className="value">${Number(selected.expectedLoss).toLocaleString()}</div></div>
                <div className="detail-item"><label>Actual Loss</label><div className="value">${Number(selected.actualLoss).toLocaleString()}</div></div>
              </div>
              <div style={{ marginTop: 16 }}><button className="btn btn-primary btn-sm" onClick={() => runAI(selected.id)} disabled={aiLoading}>🤖 Run AI Portfolio Analysis</button></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit' : 'New'} Portfolio</h2><button className="modal-close" onClick={() => setShowForm(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label>Total Value</label><input type="number" value={form.totalValue} onChange={(e) => setForm({ ...form, totalValue: e.target.value })} /></div>
                <div className="form-group"><label>Total Loans</label><input type="number" value={form.totalLoans} onChange={(e) => setForm({ ...form, totalLoans: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Avg Risk Score</label><input type="number" value={form.averageRiskScore} onChange={(e) => setForm({ ...form, averageRiskScore: e.target.value })} /></div>
                <div className="form-group"><label>Default Rate %</label><input type="number" step="0.1" value={form.defaultRate} onChange={(e) => setForm({ ...form, defaultRate: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Performance Grade</label><input value={form.performanceGrade} onChange={(e) => setForm({ ...form, performanceGrade: e.target.value })} /></div>
                <div className="form-group"><label>Sector</label><input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Region</label><input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
                <div className="form-group"><label>Vintage</label><input value={form.vintage} onChange={(e) => setForm({ ...form, vintage: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Expected Loss</label><input type="number" value={form.expectedLoss} onChange={(e) => setForm({ ...form, expectedLoss: e.target.value })} /></div>
                <div className="form-group"><label>Actual Loss</label><input type="number" value={form.actualLoss} onChange={(e) => setForm({ ...form, actualLoss: e.target.value })} /></div>
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
