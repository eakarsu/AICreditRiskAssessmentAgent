import React, { useState } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';

const quickPrompts = [
  'What are the key risk factors in consumer lending?',
  'Explain Basel III capital requirements for credit risk',
  'How does debt-to-income ratio impact credit decisions?',
  'What are common fraud patterns in mortgage lending?',
  'Describe best practices for credit portfolio diversification',
  'What are the CECL requirements for loan loss provisions?',
];

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { message: msg });
      setMessages((prev) => [...prev, { role: 'ai', content: data.analysis, model: data.model, timestamp: data.timestamp, usage: data.usage }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'ai', content: 'Error: ' + err.message }]);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>AI Assistant</h1><p>Chat with AI for credit risk insights and analysis</p></div>
      </div>

      {messages.length === 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>Quick Prompts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {quickPrompts.map((p, i) => (
              <button key={i} className="btn btn-secondary" style={{ textAlign: 'left', padding: '12px 16px' }} onClick={() => sendMessage(p)}>{p}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'user' ? (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>You</div>
                <div style={{ fontSize: 15 }}>{msg.content}</div>
              </div>
            ) : (
              <AIAnalysis data={{ analysis: msg.content, model: msg.model, timestamp: msg.timestamp, usage: msg.usage }} />
            )}
          </div>
        ))}
        {loading && <AIAnalysis loading={true} />}
      </div>

      <div style={{ position: 'sticky', bottom: 24, background: 'var(--bg-primary)', paddingTop: 16 }}>
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ display: 'flex', gap: 12 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about credit risk, fraud detection, compliance..."
            style={{ flex: 1, padding: '14px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 15, fontFamily: 'inherit' }}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !input.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
}
