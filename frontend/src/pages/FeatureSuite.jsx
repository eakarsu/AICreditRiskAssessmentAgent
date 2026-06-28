import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';

function badgeClass(status) {
  const value = String(status || '').toLowerCase();
  if (['ready', 'active'].includes(value)) return 'badge-success';
  if (['review', 'monitoring'].includes(value)) return 'badge-warning';
  if (['blocked', 'critical'].includes(value)) return 'badge-danger';
  return 'badge-info';
}

function formatValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function FeatureSuite() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [features, setFeatures] = useState([]);
  const [feature, setFeature] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const analysisRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.get('/feature-suite/features')
      .then((res) => {
        if (!active) return;
        const list = res.data?.data || [];
        setFeatures(list);
        const target = slug || list[0]?.slug;
        if (!slug && target) navigate(`/features/${target}`, { replace: true });
      })
      .catch((err) => { if (active) setError(err.response?.data?.error || err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug, navigate]);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setFeature(null);
    setSelected(null);
    setAnalysis(null);
    setError(null);
    api.get(`/feature-suite/features/${slug}`)
      .then((res) => { if (active) setFeature(res.data?.data); })
      .catch((err) => { if (active) setError(err.response?.data?.error || err.message); });
    return () => { active = false; };
  }, [slug]);

  const records = feature?.records || [];
  const stats = useMemo(() => {
    const total = records.length;
    const blocked = records.filter((record) => record.status === 'blocked').length;
    const review = records.filter((record) => record.status === 'review').length;
    const ready = records.filter((record) => ['ready', 'active'].includes(record.status)).length;
    return { total, blocked, review, ready };
  }, [records]);

  const runAnalysis = async (record = selected) => {
    if (!feature) return;
    setSelected(null);
    setAnalysisLoading(true);
    setAnalysis(null);
    setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    try {
      const res = await api.post(`/feature-suite/features/${feature.slug}/analyze`, { recordId: record?.id });
      setAnalysis(res.data);
    } catch (err) {
      setAnalysis({ analysis: err.response?.data?.error || err.message });
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{feature?.title || 'Credit Platform Features'}</h1>
          <p>{feature?.description || 'Operational modules for underwriting, compliance, workflow, integrations, and portfolio risk.'}</p>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="feature-suite-layout">
        <aside className="feature-suite-picker">
          <div className="feature-picker-title">Feature Modules</div>
          {features.map((item) => (
            <button
              key={item.slug}
              className={`feature-picker-item ${item.slug === slug ? 'active' : ''}`}
              onClick={() => navigate(`/features/${item.slug}`)}
            >
              <span>{item.title}</span>
              <small>{item.category} · {item.recordCount} records</small>
            </button>
          ))}
        </aside>

        <section className="feature-suite-main">
          {loading && <div className="data-table-container" style={{ padding: 24 }}>Loading features...</div>}

          {feature && (
            <>
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-label">Records</div>
                  <div className="stat-value">{stats.total}</div>
                  <div className="stat-change positive">seeded operating records</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Ready / Active</div>
                  <div className="stat-value">{stats.ready}</div>
                  <div className="stat-change positive">usable workflows</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Review</div>
                  <div className="stat-value">{stats.review}</div>
                  <div className="stat-change">needs owner review</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Blocked</div>
                  <div className="stat-value">{stats.blocked}</div>
                  <div className="stat-change negative">integration or policy gaps</div>
                </div>
              </div>

              <div ref={analysisRef} className="feature-analysis-anchor">
                {(analysisLoading || analysis) && <AIAnalysis data={analysis} loading={analysisLoading} />}
              </div>

              <div className="data-table-container">
                <div className="table-header">
                  <h3>{feature.title} Records</h3>
                  <button className="btn btn-primary" onClick={() => runAnalysis()} disabled={analysisLoading}>
                    {analysisLoading ? 'Analyzing with AI...' : 'Analyze Module with AI'}
                  </button>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      {feature.columns.map((column) => <th key={column}>{column.replace(/([A-Z])/g, ' $1')}</th>)}
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} onClick={() => setSelected(record)}>
                        {feature.columns.map((column) => (
                          <td key={column}>
                            {column === 'status'
                              ? <span className={`badge ${badgeClass(record[column])}`}>{record[column]}</span>
                              : formatValue(record[column])}
                          </td>
                        ))}
                        <td><span className={`badge badge-${record.priority}`}>{record.priority}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.id}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {Object.entries(selected).map(([key, value]) => (
                  <div key={key} className={`detail-item ${key === 'notes' ? 'full-width' : ''}`}>
                    <label>{key.replace(/([A-Z])/g, ' $1')}</label>
                    <div className="value">
                      {key === 'status'
                        ? <span className={`badge ${badgeClass(value)}`}>{value}</span>
                        : formatValue(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-secondary" onClick={() => runAnalysis(selected)} disabled={analysisLoading}>Analyze with AI</button>
              <button className="btn btn-primary" onClick={() => setSelected(null)}>Mark Reviewed</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
