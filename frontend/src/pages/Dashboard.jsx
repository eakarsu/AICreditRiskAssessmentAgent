import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const featureCards = [
  { title: 'Credit Applicants', desc: 'Manage loan applications and applicant profiles', icon: '👥', color: '#1a56db', path: '/applicants', key: 'applicants' },
  { title: 'Risk Assessments', desc: 'AI-powered credit risk scoring and analysis', icon: '📊', color: '#7c3aed', path: '/assessments', key: 'assessments' },
  { title: 'Portfolio Management', desc: 'Monitor and analyze credit portfolios', icon: '📈', color: '#059669', path: '/portfolio', key: 'portfolio' },
  { title: 'Fraud Detection', desc: 'AI fraud pattern detection and investigation', icon: '🛡️', color: '#dc2626', path: '/fraud', key: 'fraud' },
  { title: 'Early Warnings', desc: 'Proactive risk monitoring and alerts', icon: '⚠️', color: '#d97706', path: '/early-warning', key: 'earlyWarning' },
  { title: 'Collateral', desc: 'Asset valuation and collateral management', icon: '🏠', color: '#0891b2', path: '/collateral', key: 'collateral' },
  { title: 'Regulatory Compliance', desc: 'Compliance reporting and audit trail', icon: '📋', color: '#6366f1', path: '/regulatory', key: 'regulatory' },
  { title: 'Pricing Models', desc: 'Risk-based pricing and rate optimization', icon: '💰', color: '#ec4899', path: '/pricing', key: 'pricing' },
  { title: 'AI Assistant', desc: 'Chat with AI for credit risk insights', icon: '🤖', color: '#8b5cf6', path: '/ai-chat', key: 'ai' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [a, b, c, d, e, f, g, h] = await Promise.all([
          api.get('/applicants'),
          api.get('/assessments'),
          api.get('/portfolio'),
          api.get('/fraud'),
          api.get('/early-warning'),
          api.get('/collateral'),
          api.get('/regulatory'),
          api.get('/pricing'),
        ]);
        setCounts({
          applicants: a.data.length,
          assessments: b.data.length,
          portfolio: c.data.length,
          fraud: d.data.length,
          earlyWarning: e.data.length,
          collateral: f.data.length,
          regulatory: g.data.length,
          pricing: h.data.length,
        });
      } catch (err) { console.error(err); }
    };
    loadCounts();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>AI Credit Risk Assessment Agent - Overview</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Applicants</div>
          <div className="stat-value">{counts.applicants || 0}</div>
          <div className="stat-change positive">Active pipeline</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Risk Assessments</div>
          <div className="stat-value">{counts.assessments || 0}</div>
          <div className="stat-change positive">AI-powered</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Fraud Cases</div>
          <div className="stat-value">{counts.fraud || 0}</div>
          <div className="stat-change negative">Requires attention</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Early Warnings</div>
          <div className="stat-value">{counts.earlyWarning || 0}</div>
          <div className="stat-change negative">Active alerts</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {featureCards.map((card) => (
          <div
            key={card.key}
            className="dash-card"
            onClick={() => navigate(card.path)}
            style={{ '--card-color': card.color }}
          >
            <div className="card-icon" style={{ background: `${card.color}20`, color: card.color }}>
              {card.icon}
            </div>
            <h3>{card.title}</h3>
            <div className="card-value" style={{ color: card.color }}>
              {counts[card.key] !== undefined ? counts[card.key] : '—'}
            </div>
            <div className="card-desc">{card.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
