import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function AIAnalysis({ data, loading, onClose }) {
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

  if (!data) return null;

  return (
    <div className="ai-analysis-card">
      <div className="ai-analysis-header">
        <div className="ai-icon">🤖</div>
        <h3>AI Analysis Report</h3>
        <span className="ai-model">{data.model || 'AI Model'}</span>
      </div>
      <div className="ai-analysis-content">
        <ReactMarkdown>{data.analysis || 'No analysis available'}</ReactMarkdown>
      </div>
      <div className="ai-analysis-footer">
        <span>Generated at: {data.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}</span>
        {data.usage && (
          <span>Tokens: {data.usage.prompt_tokens + data.usage.completion_tokens}</span>
        )}
      </div>
    </div>
  );
}
