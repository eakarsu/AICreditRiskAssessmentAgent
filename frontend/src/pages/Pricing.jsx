import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';

const emptyForm = { name: '', loanType: 'Personal', baseRate: '', riskPremium: '', finalRate: '', minCreditScore: '', maxCreditScore: '', minLoanAmount: '', maxLoanAmount: '', termMonths: '', fees: '', status: 'active' };

export default function PricingPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => { const { data } = await api.get('/pricing'); setItems(data); };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editing) await api.put(`/pricing/${selected.id}`, form);
    else await api.post('/pricing', form);
    setShowForm(false); setForm(emptyForm); setEditing(false); load();
  };
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.delete(`/pricing/${id}`); setSelected(null); load(); };
  const handleEdit = (item) => { setForm(item); setEditing(true); setSelected(null); setShowForm(true); };
  const runAI = async (id) => {
    setAiLoading(true); setAiData(null);
    try { const { data } = await api.post('/ai/optimize-pricing', { pricingId: id }); setAiData(data); }
    catch (err) { setAiData({ analysis: 'Error: ' + err.message }); }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Pricing Models</h1><p>Risk-based pricing and rate optimization</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditing(false); setShowForm(true); }}>+ New Model</button>
      </div>
      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Loan Type</th><th>Base Rate</th><th>Risk Premium</th><th>Final Rate</th><th>Credit Range</th><th>Amount Range</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelected(item); setAiData(null); }}>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td>{item.loanType}</td>
                <td>{item.baseRate}%</td>
                <td>{item.riskPremium}%</td>
                <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{item.finalRate}%</td>
                <td>{item.minCreditScore}-{item.maxCreditScore}</td>
                <td>${Number(item.minLoanAmount).toLocaleString()}-${Number(item.maxLoanAmount).toLocaleString()}</td>
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
                <div className="detail-item"><label>Name</label><div className="value">{selected.name}</div></div>
                <div className="detail-item"><label>Loan Type</label><div className="value">{selected.loanType}</div></div>
                <div className="detail-item"><label>Base Rate</label><div className="value">{selected.baseRate}%</div></div>
                <div className="detail-item"><label>Risk Premium</label><div className="value">{selected.riskPremium}%</div></div>
                <div className="detail-item"><label>Final Rate</label><div className="value" style={{ color: 'var(--primary-light)', fontSize: 18 }}>{selected.finalRate}%</div></div>
                <div className="detail-item"><label>Term</label><div className="value">{selected.termMonths} months</div></div>
                <div className="detail-item"><label>Credit Score Range</label><div className="value">{selected.minCreditScore} - {selected.maxCreditScore}</div></div>
                <div className="detail-item"><label>Loan Amount Range</label><div className="value">${Number(selected.minLoanAmount).toLocaleString()} - ${Number(selected.maxLoanAmount).toLocaleString()}</div></div>
                <div className="detail-item"><label>Fees</label><div className="value">{selected.fees}%</div></div>
                <div className="detail-item"><label>Status</label><div className="value">{selected.status}</div></div>
              </div>
              <div style={{ marginTop: 16 }}><button className="btn btn-primary btn-sm" onClick={() => runAI(selected.id)} disabled={aiLoading}>🤖 Run AI Pricing Optimization</button></div>
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
            <div className="modal-header"><h2>{editing ? 'Edit' : 'New'} Pricing Model</h2><button className="modal-close" onClick={() => setShowForm(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label>Loan Type</label>
                  <select value={form.loanType} onChange={(e) => setForm({ ...form, loanType: e.target.value })}>
                    <option>Personal</option><option>Auto</option><option>Mortgage</option><option>Business</option><option>Student</option><option>HELOC</option><option>Equipment</option><option>Credit Card</option><option>Construction</option><option>Agricultural</option><option>SBA</option><option>Bridge</option><option>BNPL</option>
                  </select>
                </div>
                <div className="form-group"><label>Term (months)</label><input type="number" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Base Rate %</label><input type="number" step="0.1" value={form.baseRate} onChange={(e) => setForm({ ...form, baseRate: e.target.value })} /></div>
                <div className="form-group"><label>Risk Premium %</label><input type="number" step="0.1" value={form.riskPremium} onChange={(e) => setForm({ ...form, riskPremium: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Final Rate %</label><input type="number" step="0.1" value={form.finalRate} onChange={(e) => setForm({ ...form, finalRate: e.target.value })} /></div>
                <div className="form-group"><label>Fees %</label><input type="number" step="0.1" value={form.fees} onChange={(e) => setForm({ ...form, fees: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Min Credit Score</label><input type="number" value={form.minCreditScore} onChange={(e) => setForm({ ...form, minCreditScore: e.target.value })} /></div>
                <div className="form-group"><label>Max Credit Score</label><input type="number" value={form.maxCreditScore} onChange={(e) => setForm({ ...form, maxCreditScore: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Min Loan Amount</label><input type="number" value={form.minLoanAmount} onChange={(e) => setForm({ ...form, minLoanAmount: e.target.value })} /></div>
                <div className="form-group"><label>Max Loan Amount</label><input type="number" value={form.maxLoanAmount} onChange={(e) => setForm({ ...form, maxLoanAmount: e.target.value })} /></div>
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
