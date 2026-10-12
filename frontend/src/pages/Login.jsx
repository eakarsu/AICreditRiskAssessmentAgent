import React, { useRef, useState } from 'react';
import api from '../services/api';

export default function Login({ onLogin }) {
  const demoLoginLock = useRef(false);
  const [demoLoginBusy, setDemoLoginBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async (credentials) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', credentials);
      onLogin(data.token, data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    login({ email, password });
  };

  const loginAsDemo = async () => {
    if (demoLoginLock.current) return;
    demoLoginLock.current = true;
    setDemoLoginBusy(true);
    setError('');
    try {
      const { data } = await api.get('/auth/demo-credentials');
      if (!data.email || !data.password) throw new Error('Demo credentials are unavailable');
      setEmail(data.email);
      setPassword(data.password);
      await login({ email: data.email, password: data.password });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Demo credentials are unavailable');
    } finally {
      demoLoginLock.current = false;
      setDemoLoginBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <div className="icon">🛡️</div>
          <h1>CreditRisk AI</h1>
          <p>AI-Powered Credit Risk Assessment Agent</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button
          type="button"
          disabled={loading || demoLoginBusy}
          className="btn-auto-fill"
          onClick={loginAsDemo}
          aria-label="Log In as Demo"
        >
          {demoLoginBusy ? 'Signing in as Demo...' : '🔑 Log In as Demo'}
        </button>
      </div>
    </div>
  );
}
