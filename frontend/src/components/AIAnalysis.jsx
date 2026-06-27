import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

const META_KEYS = new Set([
  'id',
  'object',
  'created',
  'created_at',
  'createdAt',
  'model',
  'timestamp',
  'usage',
  'tokens',
  'parsed',
  'raw',
  'choices',
  'provider',
  'provider_id',
  'applicant',
  'inputs',
  'peer_stats',
  'similar_sample',
]);

const SUMMARY_KEYS = [
  'summary',
  'analysis',
  'comparison_summary',
  'recommendation',
  'overall_recommendation',
  'decision',
  'executive_summary',
  'narrative',
];

const SCORE_KEYS = new Set([
  'score',
  'risk_score',
  'confidence',
  'probability',
  'approval_probability',
  'default_probability',
  'credit_score_percentile',
  'debt_percentile',
  'overall_risk_percentile',
  'percentile',
]);

const BADGE_KEYS = new Set([
  'risk',
  'risk_level',
  'risk_category',
  'severity',
  'status',
  'rank_label',
  'tier',
  'approval_status',
  'decision',
  'recommendation',
]);

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stripJsonFences(text) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function removeNumericThousandsCommas(text) {
  return String(text).replace(/(-?\d{1,3}(?:,\d{3})+)(\.\d+)?/g, (match, whole, decimal = '') =>
    whole.replace(/,/g, '') + decimal
  );
}

function parseJsonLike(text) {
  if (typeof text !== 'string') return null;
  const stripped = stripJsonFences(text);
  const directCandidates = [stripped, removeNumericThousandsCommas(stripped)];
  for (const candidate of directCandidates) {
    try { return JSON.parse(candidate); } catch (_) {}
  }

  const candidates = [];
  for (let start = 0; start < stripped.length; start += 1) {
    if (stripped[start] !== '{' && stripped[start] !== '[') continue;
    const stack = [stripped[start]];
    let inString = false;
    let escaped = false;
    for (let i = start + 1; i < stripped.length; i += 1) {
      const ch = stripped[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === '{' || ch === '[') stack.push(ch);
      if (ch === '}' || ch === ']') {
        const open = stack[stack.length - 1];
        if ((open === '{' && ch === '}') || (open === '[' && ch === ']')) stack.pop();
        else break;
        if (stack.length === 0) {
          candidates.push(stripped.slice(start, i + 1));
          break;
        }
      }
    }
  }

  candidates.sort((a, b) => b.length - a.length);
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch (_) {}
    try { return JSON.parse(removeNumericThousandsCommas(candidate)); } catch (_) {}
  }
  return null;
}

function looksLikeJson(text) {
  if (typeof text !== 'string') return false;
  const trimmed = text.trim();
  return /```(?:json)?/i.test(trimmed) || /^[\s\S]*[{[]\s*"[^"]+"\s*:/.test(trimmed);
}

function normalizeResult(data) {
  if (!data) return null;
  if (typeof data === 'string') {
    const parsed = parseJsonLike(data);
    return parsed || { analysis: data };
  }
  if (Array.isArray(data)) return { results: data };
  if (!isObject(data)) return { value: data };

  const rawPayload = data.ai_result || data.result || data.output || data;
  const parsedAnalysis = parseJsonLike(rawPayload.analysis);
  const parsedRawPayload = typeof rawPayload === 'string' ? parseJsonLike(rawPayload) : null;
  const normalizedPayload = parsedRawPayload || (
    parsedAnalysis && isObject(parsedAnalysis)
      ? { ...rawPayload, ...parsedAnalysis, analysis: rawPayload.analysis }
      : parsedAnalysis
        ? { ...rawPayload, parsed_analysis: parsedAnalysis }
        : rawPayload
  );

  if (isObject(normalizedPayload) && isObject(data) && normalizedPayload !== data) {
    return {
      ...data,
      ...normalizedPayload,
      model: normalizedPayload.model || data.model,
      timestamp: normalizedPayload.timestamp || data.timestamp,
      usage: normalizedPayload.usage || data.usage,
      tokens: normalizedPayload.tokens || data.tokens,
    };
  }
  return normalizedPayload;
}

function formatValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (!Number.isInteger(value) && value > 0 && value <= 1) return `${Math.round(value * 100)}%`;
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
}

function badgeTone(value) {
  const normalized = String(value || '').toLowerCase();
  if (['critical', 'high', 'denied', 'decline', 'reject', 'top_75', 'bottom_25'].includes(normalized)) return 'danger';
  if (['medium', 'review', 'manual_review', 'conditional', 'top_50'].includes(normalized)) return 'warning';
  if (['low', 'approved', 'approve', 'clear', 'top_25', 'tier_1'].includes(normalized)) return 'success';
  return 'info';
}

function ScoreMeter({ value }) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return <span>{formatValue(value)}</span>;
  const pct = Math.max(0, Math.min(100, numeric > 1 ? numeric : numeric * 100));
  return (
    <div className="ai-score-meter">
      <div className="ai-score-track">
        <div className={`ai-score-fill ${pct >= 70 ? 'danger' : pct >= 40 ? 'warning' : 'success'}`} style={{ width: `${pct}%` }} />
      </div>
      <span>{Math.round(pct)}%</span>
    </div>
  );
}

function SmartValue({ name, value }) {
  if (value == null || value === '') return <span className="ai-muted">—</span>;
  const key = String(name || '').toLowerCase();

  if (typeof value === 'string' && looksLikeJson(value)) {
    const parsed = parseJsonLike(value);
    return parsed ? <SmartValue name={name} value={parsed} /> : <span className="ai-muted">Malformed structured output hidden. Rerun the analysis.</span>;
  }

  if (SCORE_KEYS.has(key) || key.endsWith('_percentile') || key.endsWith('_probability')) {
    return <ScoreMeter value={value} />;
  }
  if (BADGE_KEYS.has(key)) {
    return <span className={`ai-report-badge ${badgeTone(value)}`}>{formatValue(value).replace(/_/g, ' ')}</span>;
  }
  if (Array.isArray(value)) {
    if (value.every((item) => ['string', 'number', 'boolean'].includes(typeof item))) {
      return (
        <div className="ai-chip-list">
          {value.map((item, idx) => <span key={idx} className="ai-chip">{formatValue(item)}</span>)}
        </div>
      );
    }
    return <CardList items={value} />;
  }
  if (isObject(value)) return <KeyValueGrid data={value} />;
  if (typeof value === 'string' && value.length > 160) return <ReactMarkdown>{value}</ReactMarkdown>;
  return <span>{formatValue(value)}</span>;
}

function KeyValueGrid({ data }) {
  return (
    <div className="ai-kv-grid">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="ai-kv-item">
          <div className="ai-kv-label">{titleCase(key)}</div>
          <div className="ai-kv-value"><SmartValue name={key} value={value} /></div>
        </div>
      ))}
    </div>
  );
}

function uniformKeys(items) {
  if (!Array.isArray(items) || items.length < 2 || !items.every(isObject)) return null;
  const keys = Object.keys(items[0]);
  if (!keys.length || keys.length > 7) return null;
  const compatible = items.every((item) => keys.filter((key) => key in item).length / keys.length >= 0.75);
  return compatible ? keys : null;
}

function SmartTable({ rows, keys }) {
  return (
    <div className="ai-table-wrap">
      <table className="ai-report-table">
        <thead>
          <tr>{keys.map((key) => <th key={key}>{titleCase(key)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {keys.map((key) => <td key={key}><SmartValue name={key} value={row[key]} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardList({ items }) {
  const tableKeys = uniformKeys(items);
  if (tableKeys) return <SmartTable rows={items} keys={tableKeys} />;
  return (
    <div className="ai-card-list">
      {items.map((item, idx) => (
        <div key={idx} className="ai-report-mini-card">
          {isObject(item) ? <KeyValueGrid data={item} /> : <SmartValue value={item} />}
        </div>
      ))}
    </div>
  );
}

function ReportSection({ name, value }) {
  return (
    <section className="ai-report-section">
      <div className="ai-report-section-header">
        <h4>{titleCase(name)}</h4>
        {Array.isArray(value) && <span>{value.length}</span>}
      </div>
      <SmartValue name={name} value={value} />
    </section>
  );
}

function getTokenCount(data) {
  if (data?.tokens) return data.tokens;
  if (data?.usage?.total_tokens) return data.usage.total_tokens;
  if (data?.usage?.prompt_tokens || data?.usage?.completion_tokens) {
    return (data.usage.prompt_tokens || 0) + (data.usage.completion_tokens || 0);
  }
  return null;
}

export default function AIAnalysis({ data, loading }) {
  const report = useMemo(() => normalizeResult(data), [data]);

  if (loading) {
    return (
      <div className="ai-analysis-card">
        <div className="ai-loading">
          <div className="spinner"></div>
          <p>AI is analyzing... Please wait</p>
        </div>
      </div>
    );
  }

  if (!data || !report) return null;

  const summaryKey = SUMMARY_KEYS.find((key) => report[key]);
  const summaryValue = summaryKey ? report[summaryKey] : null;
  const parsedSummary = typeof summaryValue === 'string' && looksLikeJson(summaryValue) ? parseJsonLike(summaryValue) : null;
  const effectiveReport = parsedSummary && isObject(parsedSummary) ? { ...report, ...parsedSummary } : report;
  const sections = Object.entries(effectiveReport).filter(([key, value]) =>
    !META_KEYS.has(key) &&
    key !== summaryKey &&
    value != null &&
    value !== ''
  );
  const model = effectiveReport.model || data.model || 'AI Model';
  const timestamp = effectiveReport.timestamp || data.timestamp;
  const tokens = getTokenCount(effectiveReport) || getTokenCount(data);

  return (
    <div className="ai-analysis-card">
      <div className="ai-analysis-header">
        <div className="ai-icon">AI</div>
        <div>
          <h3>AI Analysis Report</h3>
          {effectiveReport.applicant && <div className="ai-report-subtitle">{effectiveReport.applicant}</div>}
        </div>
        <span className="ai-model">{model}</span>
      </div>

      <div className="ai-analysis-content ai-report-content">
        {summaryValue && !parsedSummary && !looksLikeJson(summaryValue) && (
          <div className="ai-executive-summary">
            <div className="ai-summary-label">Executive Summary</div>
            <ReactMarkdown>{String(summaryValue)}</ReactMarkdown>
          </div>
        )}

        {sections.length > 0 ? (
          <div className="ai-report-sections">
            {sections.map(([key, value]) => <ReportSection key={key} name={key} value={value} />)}
          </div>
        ) : (
          <div className="ai-executive-summary">
            <ReactMarkdown>{typeof report.analysis === 'string' ? report.analysis : 'No analysis available'}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="ai-analysis-footer">
        <span>Generated at: {timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString()}</span>
        {tokens && <span>Tokens: {tokens}</span>}
      </div>
    </div>
  );
}
