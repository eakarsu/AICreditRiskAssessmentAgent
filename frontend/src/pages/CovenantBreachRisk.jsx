import React, { useState } from 'react';

export default function CovenantBreachRisk() {
  const [form, setForm] = useState({ dscr: 1.08, leverageRatio: 4.1, liquidityDays: 32, lateReportingDays: 8 });
  const [result, setResult] = useState(null);
  const submit = async () => {
    const response = await fetch('/api/covenant-breach-risk/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      body: JSON.stringify(form),
    });
    setResult(await response.json());
  };
  return (
    <div className="page">
      <h1>Covenant Breach Risk</h1>
      {Object.entries(form).map(([key, value]) => (
        <label key={key}>{key.replace(/([A-Z])/g, ' $1')}<input type="number" step="0.01" value={value} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} /></label>
      ))}
      <button onClick={submit}>Score covenant</button>
      {result && <section><h2>{result.level.toUpperCase()} · {result.score}/100</h2><ul>{result.actions.map((action) => <li key={action}>{action}</li>)}</ul></section>}
    </div>
  );
}
