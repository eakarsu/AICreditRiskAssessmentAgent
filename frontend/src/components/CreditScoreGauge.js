import React, { useEffect, useState } from 'react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import api from '../services/api';

export default function CreditScoreGauge() {
  const [data, setData] = useState(null);
  const [applicantId, setApplicantId] = useState('');
  const [error, setError] = useState(null);

  const load = async (id) => {
    try {
      setError(null);
      const params = id ? `?applicantId=${encodeURIComponent(id)}` : '';
      const res = await api.get(`/custom-views/credit-score${params}`);
      setData(res.data);
      if (!applicantId && res.data?.applicantId) setApplicantId(res.data.applicantId);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { load(); }, []);

  if (error) return <div style={{ color: '#dc2626', padding: 12 }}>Failed to load: {error}</div>;
  if (!data) return <div style={{ padding: 12 }}>Loading credit score…</div>;

  const { score, min, max, band, bands, applicants } = data;
  const pct = ((score - min) / (max - min)) * 100;
  const color = (bands.find((b) => score >= b.from && score <= b.to) || bands[bands.length - 1]).color;

  const chartData = [{ name: 'score', value: pct, fill: color }];

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#0f172a' }}>FICO-Style Risk Score Gauge</h3>
        <select
          value={applicantId}
          onChange={(e) => { setApplicantId(e.target.value); load(e.target.value); }}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
        >
          {applicants?.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
          ))}
        </select>
      </div>

      <div style={{ position: 'relative', width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="55%"
            innerRadius="65%" outerRadius="95%"
            barSize={22}
            data={chartData}
            startAngle={210} endAngle={-30}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: '#e2e8f0' }} dataKey="value" cornerRadius={12} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 44, fontWeight: 700, color }}>{score}</div>
          <div style={{ color: '#475569', fontSize: 13 }}>{min} – {max}</div>
          <div style={{
            marginTop: 6, padding: '4px 10px', borderRadius: 999,
            background: color + '22', color, fontWeight: 600, fontSize: 13,
          }}>{band}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        {bands.map((b) => (
          <div key={b.label} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155',
          }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: b.color }} />
            {b.label} ({b.from}-{b.to})
          </div>
        ))}
      </div>
    </div>
  );
}
