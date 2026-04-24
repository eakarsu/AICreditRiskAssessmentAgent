import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', address: '', employmentStatus: 'Full-time', annualIncome: '', employerName: '', yearsEmployed: '', creditScore: '', existingDebt: '', monthlyExpenses: '', bankruptcyHistory: false, status: 'pending' };

export default function Applicants() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    const { data } = await api.get('/applicants');
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editing) {
      await api.put(`/applicants/${selected.id}`, form);
    } else {
      await api.post('/applicants', form);
    }
    setShowForm(false);
    setForm(emptyForm);
    setEditing(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this applicant?')) return;
    await api.delete(`/applicants/${id}`);
    setSelected(null);
    load();
  };

  const handleEdit = (item) => {
    setForm(item);
    setEditing(true);
    setSelected(null);
    setShowForm(true);
  };

  const runAI = async (id) => {
    setAiLoading(true);
    setAiData(null);
    try {
      const { data } = await api.post('/ai/assess-risk', { applicantId: id });
      setAiData(data);
    } catch (err) { setAiData({ analysis: 'Error: ' + err.message }); }
    setAiLoading(false);
  };

  const statusBadge = (s) => {
    const map = { approved: 'badge-success', denied: 'badge-danger', pending: 'badge-warning', review: 'badge-info' };
    return <span className={`badge ${map[s] || 'badge-info'}`}>{s}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Credit Applicants</h1>
          <p>Manage loan applicants and their credit profiles</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditing(false); setShowForm(true); }}>+ New Applicant</button>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Credit Score</th>
              <th>Annual Income</th>
              <th>Employment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiData(null); }}>
                <td style={{ fontWeight: 600 }}>{item.firstName} {item.lastName}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{item.email}</td>
                <td><span style={{ fontWeight: 700, color: item.creditScore >= 700 ? 'var(--success)' : item.creditScore >= 600 ? 'var(--warning)' : 'var(--danger)' }}>{item.creditScore}</span></td>
                <td>${Number(item.annualIncome).toLocaleString()}</td>
                <td>{item.employmentStatus}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.firstName} {selected.lastName}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Email</label><div className="value">{selected.email}</div></div>
                <div className="detail-item"><label>Phone</label><div className="value">{selected.phone}</div></div>
                <div className="detail-item"><label>Date of Birth</label><div className="value">{selected.dateOfBirth}</div></div>
                <div className="detail-item"><label>Credit Score</label><div className="value">{selected.creditScore}</div></div>
                <div className="detail-item"><label>Annual Income</label><div className="value">${Number(selected.annualIncome).toLocaleString()}</div></div>
                <div className="detail-item"><label>Existing Debt</label><div className="value">${Number(selected.existingDebt).toLocaleString()}</div></div>
                <div className="detail-item"><label>Monthly Expenses</label><div className="value">${Number(selected.monthlyExpenses).toLocaleString()}</div></div>
                <div className="detail-item"><label>Employment</label><div className="value">{selected.employmentStatus}</div></div>
                <div className="detail-item"><label>Employer</label><div className="value">{selected.employerName}</div></div>
                <div className="detail-item"><label>Years Employed</label><div className="value">{selected.yearsEmployed}</div></div>
                <div className="detail-item full-width"><label>Address</label><div className="value">{selected.address}</div></div>
                <div className="detail-item"><label>Bankruptcy History</label><div className="value">{selected.bankruptcyHistory ? 'Yes' : 'No'}</div></div>
                <div className="detail-item"><label>Status</label><div className="value">{statusBadge(selected.status)}</div></div>
              </div>

              <div style={{ marginTop: 16 }}>
                <button className="btn btn-primary btn-sm" onClick={() => runAI(selected.id)} disabled={aiLoading}>
                  🤖 Run AI Risk Assessment
                </button>
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
            <div className="modal-header">
              <h2>{editing ? 'Edit Applicant' : 'New Applicant'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>First Name</label><input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                <div className="form-group"><label>Last Name</label><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="form-group"><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Date of Birth</label><input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
                <div className="form-group"><label>Credit Score</label><input type="number" value={form.creditScore} onChange={(e) => setForm({ ...form, creditScore: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label>Employment Status</label>
                  <select value={form.employmentStatus} onChange={(e) => setForm({ ...form, employmentStatus: e.target.value })}>
                    <option>Full-time</option><option>Part-time</option><option>Self-employed</option><option>Retired</option><option>Unemployed</option>
                  </select>
                </div>
                <div className="form-group"><label>Employer</label><input value={form.employerName} onChange={(e) => setForm({ ...form, employerName: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Annual Income</label><input type="number" value={form.annualIncome} onChange={(e) => setForm({ ...form, annualIncome: e.target.value })} /></div>
                <div className="form-group"><label>Years Employed</label><input type="number" step="0.5" value={form.yearsEmployed} onChange={(e) => setForm({ ...form, yearsEmployed: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Existing Debt</label><input type="number" value={form.existingDebt} onChange={(e) => setForm({ ...form, existingDebt: e.target.value })} /></div>
                <div className="form-group"><label>Monthly Expenses</label><input type="number" value={form.monthlyExpenses} onChange={(e) => setForm({ ...form, monthlyExpenses: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Bankruptcy History</label>
                  <select value={form.bankruptcyHistory} onChange={(e) => setForm({ ...form, bankruptcyHistory: e.target.value === 'true' })}>
                    <option value="false">No</option><option value="true">Yes</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="pending">Pending</option><option value="approved">Approved</option><option value="denied">Denied</option><option value="review">Review</option>
                  </select>
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
