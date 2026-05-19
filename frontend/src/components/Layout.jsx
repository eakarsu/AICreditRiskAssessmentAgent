import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiUsers, FiFileText, FiPieChart, FiShield, FiBookOpen, FiBox, FiAlertTriangle, FiDollarSign, FiMessageSquare, FiLogOut, FiBarChart2 } from 'react-icons/fi';

const navItems = [
  { section: 'Overview', items: [
    { path: '/', label: 'Dashboard', icon: <FiHome /> },
  ]},
  { section: 'Credit Operations', items: [
    { path: '/applicants', label: 'Applicants', icon: <FiUsers /> },
    { path: '/assessments', label: 'Risk Assessments', icon: <FiFileText /> },
    { path: '/portfolio', label: 'Portfolio', icon: <FiPieChart /> },
  ]},
  { section: 'Risk Management', items: [
    { path: '/fraud', label: 'Fraud Detection', icon: <FiShield />, badge: '4' },
    { path: '/early-warning', label: 'Early Warnings', icon: <FiAlertTriangle />, badge: '12' },
    { path: '/collateral', label: 'Collateral', icon: <FiBox /> },
  ]},
  { section: 'Administration', items: [
    { path: '/regulatory', label: 'Compliance', icon: <FiBookOpen /> },
    { path: '/pricing', label: 'Pricing Models', icon: <FiDollarSign /> },
    { path: '/ai-chat', label: 'AI Assistant', icon: <FiMessageSquare /> },
    { path: '/ai-advanced', label: 'AI Advanced', icon: <FiMessageSquare /> },
  ]},
  { section: 'Custom Views', items: [
    { path: '/custom-views', label: 'Risk Views', icon: <FiBarChart2 /> },
  ]},
];

export default function Layout({ user, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">🛡️</div>
            <div className="logo-text">
              <h2>CreditRisk AI</h2>
              <span>Assessment Agent</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section) => (
            <div key={section.section} className="nav-section">
              <div className="nav-section-title">{section.section}</div>
              {section.items.map((item) => (
                <button
                  key={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.[0] || 'A'}</div>
            <div className="user-details">
              <h4>{user?.name || 'User'}</h4>
              <span>{user?.role || 'analyst'}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout}>
            <FiLogOut style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
