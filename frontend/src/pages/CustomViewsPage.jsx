import React from 'react';
import CreditScoreGauge from '../components/CreditScoreGauge.js';
import DefaultDistribution from '../components/DefaultDistribution.js';
import DecisionLetterPDF from '../components/DecisionLetterPDF.js';
import ScoringModelConfig from '../components/ScoringModelConfig.js';

export default function CustomViewsPage() {
  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1>Risk Views</h1>
          <p>Custom credit-risk visualizations and decisioning tools.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
        <CreditScoreGauge />
        <DefaultDistribution />
        <DecisionLetterPDF />
        <ScoringModelConfig />
      </div>
    </div>
  );
}
