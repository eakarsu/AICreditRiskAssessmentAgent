const express = require('express');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../services/openrouter');

const router = express.Router();

const SYSTEM_PROMPT =
  'You are a senior credit platform product and risk operations advisor. Assess credit decisioning ' +
  'platform modules for operational readiness, integration gaps, compliance controls, model risk, ' +
  'auditability, and implementation sequencing. Return strict JSON only.';

const FEATURE_DEFINITIONS = [
  {
    slug: 'credit-bureau-integrations',
    title: 'Credit Bureau Integrations',
    description: 'Equifax, Experian, and TransUnion pulls, disputes, freezes, and tradeline deltas.',
    category: 'Data Integrations',
    columns: ['bureau', 'applicant', 'pullType', 'score', 'status', 'lastRefresh'],
  },
  {
    slug: 'bank-cash-flow-analysis',
    title: 'Bank Statement Cash Flow',
    description: 'Income verification, deposit volatility, overdraft behavior, and affordability signals.',
    category: 'Underwriting',
    columns: ['applicant', 'avgMonthlyDeposits', 'overdrafts', 'cashFlowGrade', 'status', 'lastRefresh'],
  },
  {
    slug: 'document-ocr',
    title: 'Document OCR',
    description: 'Pay stubs, tax returns, bank statements, IDs, and document fraud checks.',
    category: 'Document Intelligence',
    columns: ['documentType', 'applicant', 'confidence', 'exceptions', 'status', 'lastRefresh'],
  },
  {
    slug: 'underwriting-rules-engine',
    title: 'Underwriting Rules Engine',
    description: 'Configurable eligibility, policy, pricing, and exception rules with explainable outcomes.',
    category: 'Decisioning',
    columns: ['ruleName', 'product', 'threshold', 'owner', 'status', 'lastRefresh'],
  },
  {
    slug: 'approval-workflow',
    title: 'Approval Workflow',
    description: 'Role-based queues, escalation, dual control, SLAs, and signoff history.',
    category: 'Operations',
    columns: ['caseRef', 'queue', 'assignee', 'slaHours', 'status', 'lastRefresh'],
  },
  {
    slug: 'loan-origination',
    title: 'Loan Origination',
    description: 'Application intake through decision, offer, conditions, closing, and booking.',
    category: 'Operations',
    columns: ['applicationRef', 'applicant', 'product', 'amount', 'status', 'lastRefresh'],
  },
  {
    slug: 'adverse-action-mapping',
    title: 'Adverse Action Mapping',
    description: 'FCRA and Reg B reason mapping, reason-code governance, and letter readiness.',
    category: 'Compliance',
    columns: ['reasonCode', 'regulation', 'trigger', 'letterStatus', 'status', 'lastRefresh'],
  },
  {
    slug: 'model-monitoring',
    title: 'Model Monitoring',
    description: 'Drift, bias, override rates, calibration, challenger models, and validation evidence.',
    category: 'Model Risk',
    columns: ['modelName', 'metric', 'currentValue', 'threshold', 'status', 'lastRefresh'],
  },
  {
    slug: 'decision-audit-trail',
    title: 'Decision Audit Trail',
    description: 'Immutable timeline of AI recommendations, human overrides, policy hits, and final decisions.',
    category: 'Audit',
    columns: ['eventRef', 'actor', 'eventType', 'entityRef', 'status', 'lastRefresh'],
  },
  {
    slug: 'notifications-webhooks',
    title: 'Notifications & Webhooks',
    description: 'Email, webhook, and task notifications for decisions, escalations, exceptions, and SLAs.',
    category: 'Integrations',
    columns: ['channel', 'event', 'recipient', 'deliveryRate', 'status', 'lastRefresh'],
  },
  {
    slug: 'customer-portal',
    title: 'Customer Application Portal',
    description: 'Applicant-facing status tracking, document upload, consent, and condition clearing.',
    category: 'Customer Experience',
    columns: ['portalUser', 'applicationRef', 'openConditions', 'completionPct', 'status', 'lastRefresh'],
  },
  {
    slug: 'loan-officer-mobile',
    title: 'Loan Officer Mobile',
    description: 'Mobile pipeline, applicant notes, document capture, pricing review, and offline tasks.',
    category: 'Field Productivity',
    columns: ['loanOfficer', 'pipelineCount', 'todayTasks', 'mobileVersion', 'status', 'lastRefresh'],
  },
  {
    slug: 'rate-sheets-eligibility',
    title: 'Rate Sheets & Eligibility',
    description: 'Product matrix, rate sheets, eligibility filters, fees, terms, and exception pricing.',
    category: 'Pricing',
    columns: ['product', 'rateSheet', 'minScore', 'maxLtv', 'status', 'lastRefresh'],
  },
  {
    slug: 'portfolio-stress-testing',
    title: 'Portfolio Stress Testing',
    description: 'Macro scenarios, CECL loss sensitivity, concentration shocks, and capital impact.',
    category: 'Portfolio Risk',
    columns: ['scenario', 'portfolio', 'lossImpact', 'capitalImpact', 'status', 'lastRefresh'],
  },
  {
    slug: 'examiner-reports',
    title: 'Examiner Reports',
    description: 'Audit-ready exports for underwriting, overrides, model governance, compliance, and fair lending.',
    category: 'Compliance',
    columns: ['reportName', 'period', 'owner', 'evidenceCount', 'status', 'lastRefresh'],
  },
];

const statuses = ['ready', 'review', 'blocked', 'active', 'monitoring'];
const applicants = [
  'Emily Williams', 'James Morrison', 'Sarah Johnson', 'Michael Chen', 'Olivia Patel',
  'David Brown', 'Amanda Garcia', 'Robert Lee', 'Jennifer Davis', 'Chris Wilson',
  'Priya Shah', 'Daniel Kim', 'Maria Lopez', 'Ethan Walker', 'Grace Nguyen',
];

function money(value) {
  return `$${Number(value).toLocaleString()}`;
}

function baseRecord(feature, index) {
  const n = index + 1;
  const status = statuses[index % statuses.length];
  const lastRefresh = `2026-06-${String(1 + (index % 26)).padStart(2, '0')}`;
  const applicant = applicants[index % applicants.length];

  const common = {
    id: `${feature.slug.toUpperCase().replace(/-/g, '_')}-${String(n).padStart(3, '0')}`,
    priority: ['low', 'medium', 'high', 'critical'][index % 4],
    owner: ['Credit Ops', 'Risk Team', 'Compliance', 'Model Risk', 'Loan Ops'][index % 5],
    status,
    lastRefresh,
    notes: `${feature.title} seeded operating record ${n}. Review policy fit, data quality, controls, and next action before production rollout.`,
  };

  switch (feature.slug) {
    case 'credit-bureau-integrations':
      return { ...common, bureau: ['Equifax', 'Experian', 'TransUnion'][index % 3], applicant, pullType: ['Soft Pull', 'Hard Pull', 'Tri-merge'][index % 3], score: 610 + ((index * 17) % 210) };
    case 'bank-cash-flow-analysis':
      return { ...common, applicant, avgMonthlyDeposits: money(4200 + index * 550), overdrafts: index % 5, cashFlowGrade: ['A', 'B', 'C', 'D'][index % 4] };
    case 'document-ocr':
      return { ...common, documentType: ['Pay Stub', 'W-2', '1040', 'Bank Statement', 'Driver License'][index % 5], applicant, confidence: `${88 + (index % 11)}%`, exceptions: index % 4 };
    case 'underwriting-rules-engine':
      return { ...common, ruleName: `Policy Rule ${n}`, product: ['Personal Loan', 'Auto', 'Mortgage', 'SMB Term', 'HELOC'][index % 5], threshold: ['DTI <= 43%', 'FICO >= 680', 'LTV <= 80%', 'No BK 24m', 'Income verified'][index % 5] };
    case 'approval-workflow':
      return { ...common, caseRef: `WF-${202600 + n}`, queue: ['Auto Approval', 'Manual Review', 'Senior Credit', 'Compliance', 'Closing'][index % 5], assignee: ['A. Carter', 'M. Singh', 'J. Allen', 'T. Brooks', 'L. Perez'][index % 5], slaHours: 4 + (index % 8) * 2 };
    case 'loan-origination':
      return { ...common, applicationRef: `APP-${2026000 + n}`, applicant, product: ['Personal Loan', 'Auto Loan', 'Mortgage', 'SMB Credit', 'Student Refi'][index % 5], amount: money(15000 + index * 18500) };
    case 'adverse-action-mapping':
      return { ...common, reasonCode: `AA-${String(n).padStart(3, '0')}`, regulation: ['FCRA', 'Reg B', 'ECOA', 'UDAAP'][index % 4], trigger: ['High DTI', 'Insufficient income', 'Delinquency', 'Thin file', 'Collateral gap'][index % 5], letterStatus: ['draft', 'approved', 'legal review'][index % 3] };
    case 'model-monitoring':
      return { ...common, modelName: ['Risk Score v4', 'PD Model', 'Fraud Graph', 'Pricing Elasticity', 'Income Verifier'][index % 5], metric: ['KS drift', 'AUC', 'Override rate', 'Adverse impact', 'Calibration'][index % 5], currentValue: `${(4 + index * 1.7).toFixed(1)}%`, threshold: `${(8 + index).toFixed(1)}%` };
    case 'decision-audit-trail':
      return { ...common, eventRef: `AUD-${20260600 + n}`, actor: ['AI Copilot', 'Underwriter', 'Manager', 'Compliance', 'System'][index % 5], eventType: ['AI recommendation', 'Human override', 'Policy hit', 'Document verified', 'Final decision'][index % 5], entityRef: `APP-${2026000 + n}` };
    case 'notifications-webhooks':
      return { ...common, channel: ['Email', 'Webhook', 'SMS', 'Slack', 'Task Queue'][index % 5], event: ['approval.ready', 'document.missing', 'sla.breach', 'offer.accepted', 'model.drift'][index % 5], recipient: ['ops@creditrisk.ai', 'webhook/core', 'loan.officer', 'compliance', 'model.risk'][index % 5], deliveryRate: `${94 + (index % 6)}%` };
    case 'customer-portal':
      return { ...common, portalUser: applicant, applicationRef: `APP-${2026000 + n}`, openConditions: index % 6, completionPct: `${55 + (index * 3) % 45}%` };
    case 'loan-officer-mobile':
      return { ...common, loanOfficer: ['A. Carter', 'M. Singh', 'J. Allen', 'T. Brooks', 'L. Perez'][index % 5], pipelineCount: 9 + index, todayTasks: 2 + (index % 7), mobileVersion: `iOS ${2 + (index % 3)}.${index % 10}` };
    case 'rate-sheets-eligibility':
      return { ...common, product: ['Personal Loan', 'Auto Prime', 'Auto Subprime', 'Mortgage 30Y', 'SMB Term'][index % 5], rateSheet: `RS-2026-${String(n).padStart(2, '0')}`, minScore: 580 + (index % 8) * 25, maxLtv: `${65 + (index % 7) * 5}%` };
    case 'portfolio-stress-testing':
      return { ...common, scenario: ['Base', 'Mild recession', 'Rate shock', 'Unemployment spike', 'Housing downturn'][index % 5], portfolio: ['Consumer', 'Auto', 'Mortgage', 'SMB', 'HELOC'][index % 5], lossImpact: money(250000 + index * 125000), capitalImpact: `${(0.8 + index * 0.22).toFixed(2)}%` };
    case 'examiner-reports':
      return { ...common, reportName: ['Underwriting Overrides', 'Fair Lending', 'Model Governance', 'Adverse Action', 'Portfolio Stress'][index % 5], period: `2026-Q${1 + (index % 4)}`, evidenceCount: 24 + index * 3 };
    default:
      return common;
  }
}

function withRecords(feature) {
  return {
    ...feature,
    records: Array.from({ length: 15 }, (_, index) => baseRecord(feature, index)),
  };
}

router.get('/features', auth, (req, res) => {
  res.json({
    data: FEATURE_DEFINITIONS.map((feature) => {
      const records = Array.from({ length: 15 }, (_, index) => baseRecord(feature, index));
      return {
        ...feature,
        recordCount: records.length,
        openIssues: records.filter((record) => ['review', 'blocked'].includes(record.status)).length,
      };
    }),
  });
});

router.get('/features/:slug', auth, (req, res) => {
  const feature = FEATURE_DEFINITIONS.find((item) => item.slug === req.params.slug);
  if (!feature) return res.status(404).json({ error: 'Feature not found' });
  res.json({ data: withRecords(feature) });
});

router.post('/features/:slug/analyze', auth, async (req, res) => {
  const feature = FEATURE_DEFINITIONS.find((item) => item.slug === req.params.slug);
  if (!feature) return res.status(404).json({ error: 'Feature not found' });
  const records = Array.from({ length: 15 }, (_, index) => baseRecord(feature, index));
  const selectedRecord = records.find((record) => record.id === req.body?.recordId) || records[0];

  const baseline = {
    feature: feature.title,
    category: feature.category,
    description: feature.description,
    record_count: records.length,
    readiness_score: Math.max(62, 92 - records.filter((record) => record.status === 'blocked').length * 4),
    selected_record: selectedRecord,
    status_breakdown: statuses.reduce((acc, status) => {
      acc[status] = records.filter((record) => record.status === status).length;
      return acc;
    }, {}),
    sample_records: records.slice(0, 6),
    baseline_actions: [
      'Confirm required source-system integration and owner accountability.',
      'Validate policy thresholds against current underwriting standards.',
      'Capture decision evidence and examiner-ready audit notes before production use.',
      'Add SLA monitoring and notification routing for blocked or review records.',
    ],
    control_checks: [
      { check: 'Data lineage', status: 'review', owner: 'Data Governance' },
      { check: 'Human approval', status: 'ready', owner: 'Credit Ops' },
      { check: 'Audit trail', status: 'ready', owner: 'Compliance' },
      { check: 'Model risk review', status: 'monitoring', owner: 'Model Risk' },
    ],
  };

  const prompt = `Analyze this credit platform feature module and return strict JSON with this schema:
{
  "summary": "concise executive summary",
  "readiness_score": number,
  "readiness_level": "pilot|ready|needs-work|blocked",
  "top_risks": [{"risk": string, "severity": "low|medium|high|critical", "evidence": string}],
  "implementation_plan": [{"step": string, "owner": string, "timing": string}],
  "integration_requirements": [string],
  "compliance_controls": [{"control": string, "status": "ready|review|missing", "evidence": string}],
  "recommended_actions": [string],
  "questions_for_business_owner": [string],
  "confidence": "low|medium|high"
}

Use the baseline records as evidence. Do not invent production integrations that are not implied by the baseline.

Baseline:
${JSON.stringify(baseline, null, 2)}`;

  try {
    const ai = await queryOpenRouter(prompt, SYSTEM_PROMPT);
    res.json({
      ...baseline,
      ...ai,
      baseline,
      ai_provider: ai.analysis?.startsWith('AI analysis unavailable') ? 'not_configured' : 'openrouter',
    });
  } catch (err) {
    res.status(500).json({
      ...baseline,
      analysis: `AI service error: ${err.message}`,
      baseline,
      ai_provider: 'error',
    });
  }
});

module.exports = router;
