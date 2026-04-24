import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Applicants from './pages/Applicants';
import Assessments from './pages/Assessments';
import Portfolio from './pages/Portfolio';
import FraudDetection from './pages/FraudDetection';
import Regulatory from './pages/Regulatory';
import CollateralPage from './pages/Collateral';
import EarlyWarningPage from './pages/EarlyWarning';
import PricingPage from './pages/Pricing';
import AIChat from './pages/AIChat';
import Layout from './components/Layout';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  const handleLogin = (t, u) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Login onLogin={handleLogin} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/applicants" element={<Applicants />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/fraud" element={<FraudDetection />} />
          <Route path="/regulatory" element={<Regulatory />} />
          <Route path="/collateral" element={<CollateralPage />} />
          <Route path="/early-warning" element={<EarlyWarningPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/ai-chat" element={<AIChat />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
