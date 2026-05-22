import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import api from '../services/api';

export default function DefaultDistribution() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/custom-views/default-distribution')
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ color: '#dc2626', padding: 12 }}>Failed to load: {error}</div>;
  if (!data) return <div style={{ padding: 12 }}>Loading distribution…</div>;

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a' }}>Portfolio Default Probability Distribution</h3>
          <div style={{ color: '#64748b', fontSize: 13 }}>
            {data.portfolioSize.toLocaleString()} loans • Avg PD {data.avgPdPct}%
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.buckets} margin={{ top: 10, right: 24, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="pdFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="pd" tick={{ fontSize: 12 }}
              label={{ value: 'Default Probability (%)', position: 'insideBottom', offset: -2, fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }}
              label={{ value: 'Loans', angle: -90, position: 'insideLeft', fontSize: 12 }} />
            <Tooltip
              formatter={(value, key) => key === 'loans'
                ? [value, 'Loans']
                : [`$${Number(value).toLocaleString()}`, 'Expected Loss']
              }
              labelFormatter={(v) => `PD: ${v}%`}
            />
            <Legend />
            <ReferenceLine x={data.thresholds.low} stroke="#059669" strokeDasharray="4 4"
              label={{ value: 'Low', fill: '#059669', fontSize: 11, position: 'top' }} />
            <ReferenceLine x={data.thresholds.medium} stroke="#d97706" strokeDasharray="4 4"
              label={{ value: 'Med', fill: '#d97706', fontSize: 11, position: 'top' }} />
            <ReferenceLine x={data.thresholds.high} stroke="#dc2626" strokeDasharray="4 4"
              label={{ value: 'High', fill: '#dc2626', fontSize: 11, position: 'top' }} />
            <Area type="monotone" dataKey="loans" stroke="#2563eb" fill="url(#pdFill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
