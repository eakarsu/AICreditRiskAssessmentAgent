/**
 * Advanced AI endpoints — implements the audit-proposed NEW custom non-CRUD features.
 * All endpoints persist results to the AIResult JSONB audit table.
 */
const express = require('express');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { queryOpenRouter, parseAIJson } = require('../services/openrouter');
const { Applicant, Assessment, Portfolio, AIResult } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

const SYSTEM_PROMPT =
  'You are an expert credit risk analyst. Provide quantitative, defensible analysis aligned to Basel III, CECL, and IFRS 9 frameworks.';

const DISCLAIMER =
  '\n\n---\nThis assessment is for informational purposes. All credit decisions require human review by qualified financial professionals.';

function validateRequired(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  return missing.length ? missing : null;
}

async function persistAIResult({ endpoint, entityType, entityId, userId, result }) {
  try {
    await AIResult.create({
      endpoint,
      entityType,
      entityId,
      userId,
      model: result.model,
      result,
      usageTokens: result.usage ? (result.usage.total_tokens || 0) : 0,
    });
  } catch (e) {
    // Non-fatal — audit storage failure should not break the response
    console.error('[AIResult.persist] failed:', e.message);
  }
}

// ── 1. Peer Comparison Scoring ──────────────────────────────────────────────
// POST /api/ai-advanced/peer-comparison { applicantId }
router.post('/peer-comparison', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['applicantId']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const applicant = await Applicant.findByPk(req.body.applicantId);
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

    // Fetch peer cohort: same employment status, income within ±25%
    const incomeMin = parseFloat(applicant.annualIncome || 0) * 0.75;
    const incomeMax = parseFloat(applicant.annualIncome || 0) * 1.25;
    const peers = await Applicant.findAll({
      where: {
        id: { [Op.ne]: applicant.id },
        employmentStatus: applicant.employmentStatus,
        annualIncome: { [Op.between]: [incomeMin, incomeMax] },
      },
      limit: 50,
    });

    const peerStats = {
      count: peers.length,
      avgCreditScore: peers.length ? (peers.reduce((s, p) => s + (p.creditScore || 0), 0) / peers.length).toFixed(0) : 0,
      avgDebt: peers.length ? (peers.reduce((s, p) => s + parseFloat(p.existingDebt || 0), 0) / peers.length).toFixed(0) : 0,
      bankruptcyRate: peers.length ? ((peers.filter((p) => p.bankruptcyHistory).length / peers.length) * 100).toFixed(1) : 0,
    };

    const prompt = `Compare this applicant to their peer cohort and rank them.

Subject Applicant:
- Credit Score: ${applicant.creditScore}
- Annual Income: $${applicant.annualIncome}
- Existing Debt: $${applicant.existingDebt}
- Bankruptcy: ${applicant.bankruptcyHistory ? 'Yes' : 'No'}
- Employment: ${applicant.employmentStatus}

Peer Cohort (n=${peerStats.count}, same employment + income ±25%):
- Avg Credit Score: ${peerStats.avgCreditScore}
- Avg Existing Debt: $${peerStats.avgDebt}
- Bankruptcy Rate: ${peerStats.bankruptcyRate}%

Return JSON: {
  "credit_score_percentile": 0,
  "debt_percentile": 0,
  "overall_risk_percentile": 0,
  "rank_label": "top_10|top_25|median|bottom_25|bottom_10",
  "comparison_summary": "",
  "key_advantages": [],
  "key_disadvantages": []
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, SYSTEM_PROMPT);
    await persistAIResult({ endpoint: 'peer-comparison', entityType: 'Applicant', entityId: applicant.id, userId: req.user.id, result });
    res.json({ applicant: `${applicant.firstName} ${applicant.lastName}`, peer_stats: peerStats, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 2. Scenario Simulation Tool ─────────────────────────────────────────────
// POST /api/ai-advanced/scenario-simulation { applicantId, scenarios: [{income_change, debt_change, rate}] }
router.post('/scenario-simulation', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['applicantId', 'scenarios']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    if (!Array.isArray(req.body.scenarios) || req.body.scenarios.length === 0) {
      return res.status(400).json({ error: 'scenarios must be a non-empty array' });
    }

    const applicant = await Applicant.findByPk(req.body.applicantId);
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

    const scenariosText = req.body.scenarios
      .map((s, i) => `Scenario ${i + 1}: income change ${s.income_change || 0}%, debt change ${s.debt_change || 0}%, rate ${s.rate || 'baseline'}%`)
      .join('\n');

    const prompt = `Simulate loan approval outcomes under multiple scenarios for this applicant.

Baseline:
- Credit Score: ${applicant.creditScore}
- Annual Income: $${applicant.annualIncome}
- Existing Debt: $${applicant.existingDebt}
- Monthly Expenses: $${applicant.monthlyExpenses}

Scenarios to model:
${scenariosText}

For each scenario return JSON: {
  "scenarios": [{
    "scenario_id": 1,
    "projected_dti": 0,
    "approval_probability_pct": 0,
    "recommended_credit_limit": 0,
    "rate_recommendation_pct": 0,
    "risk_category_change": "improve|stable|worsen",
    "narrative": ""
  }],
  "best_scenario_id": 1,
  "worst_scenario_id": 1
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, SYSTEM_PROMPT);
    await persistAIResult({ endpoint: 'scenario-simulation', entityType: 'Applicant', entityId: applicant.id, userId: req.user.id, result });
    res.json({ applicant: `${applicant.firstName} ${applicant.lastName}`, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 3. Auto-Tier Assignment ─────────────────────────────────────────────────
// POST /api/ai-advanced/auto-tier { applicantId }
router.post('/auto-tier', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['applicantId']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const applicant = await Applicant.findByPk(req.body.applicantId);
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

    const prompt = `Assign this applicant to a credit tier (Tier 1=premium, Tier 2=standard, Tier 3=subprime) and route to appropriate workflow.

Applicant:
- Credit Score: ${applicant.creditScore}
- Annual Income: $${applicant.annualIncome}
- Debt-to-Income: ${applicant.annualIncome ? (((parseFloat(applicant.existingDebt || 0) + parseFloat(applicant.monthlyExpenses || 0) * 12) / parseFloat(applicant.annualIncome)) * 100).toFixed(1) : 'N/A'}%
- Bankruptcy: ${applicant.bankruptcyHistory ? 'Yes' : 'No'}
- Years Employed: ${applicant.yearsEmployed}

Return JSON: {
  "tier": "Tier 1|Tier 2|Tier 3",
  "tier_score": 0,
  "approval_workflow": "auto_approve|standard_review|manual_underwriting|escalate_committee",
  "max_credit_offer": 0,
  "rate_band_pct": "X-Y%",
  "tier_rationale": "",
  "next_review_period_months": 12
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, SYSTEM_PROMPT);
    await persistAIResult({ endpoint: 'auto-tier', entityType: 'Applicant', entityId: applicant.id, userId: req.user.id, result });
    res.json({ applicant: `${applicant.firstName} ${applicant.lastName}`, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 4. Market Rate Benchmark ────────────────────────────────────────────────
// POST /api/ai-advanced/market-benchmark { proposed_rate, loan_type, credit_score, term_months }
router.post('/market-benchmark', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['proposed_rate', 'loan_type', 'credit_score', 'term_months']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const { proposed_rate, loan_type, credit_score, term_months } = req.body;

    const prompt = `Benchmark this proposed loan rate against current US market rates and recommend competitiveness adjustments.

Proposed Loan:
- Rate: ${proposed_rate}%
- Type: ${loan_type}
- Borrower Credit Score: ${credit_score}
- Term: ${term_months} months

Return JSON: {
  "market_rate_low_pct": 0,
  "market_rate_avg_pct": 0,
  "market_rate_high_pct": 0,
  "competitive_position": "below_market|at_market|above_market",
  "spread_vs_market_bps": 0,
  "win_probability_pct": 0,
  "recommended_adjustment_pct": 0,
  "rationale": ""
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, SYSTEM_PROMPT);
    await persistAIResult({ endpoint: 'market-benchmark', userId: req.user.id, result });
    res.json({ inputs: { proposed_rate, loan_type, credit_score, term_months }, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 5. Macro Economic Impact Modeling ───────────────────────────────────────
// POST /api/ai-advanced/macro-impact { portfolioId, gdp_forecast, unemployment_forecast, rate_forecast }
router.post('/macro-impact', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['portfolioId', 'gdp_forecast', 'unemployment_forecast', 'rate_forecast']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const portfolio = await Portfolio.findByPk(req.body.portfolioId);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const { gdp_forecast, unemployment_forecast, rate_forecast } = req.body;

    const prompt = `Adjust portfolio risk projections based on macroeconomic forecasts.

Portfolio:
- Name: ${portfolio.name}
- Total Value: $${portfolio.totalValue}
- Current Default Rate: ${portfolio.defaultRate}%
- Avg Risk Score: ${portfolio.averageRiskScore}
- Sector: ${portfolio.sector}

Macro Forecasts (12-month horizon):
- GDP Growth: ${gdp_forecast}%
- Unemployment: ${unemployment_forecast}%
- Fed Funds Rate: ${rate_forecast}%

Return JSON: {
  "adjusted_default_rate_pct": 0,
  "adjusted_expected_loss_usd": 0,
  "credit_demand_change_pct": 0,
  "sector_outlook": "improving|stable|deteriorating",
  "recommended_actions": [],
  "macro_sensitivity_score": 0,
  "narrative": ""
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, SYSTEM_PROMPT);
    await persistAIResult({ endpoint: 'macro-impact', entityType: 'Portfolio', entityId: portfolio.id, userId: req.user.id, result });
    res.json({ portfolio: portfolio.name, macro: { gdp_forecast, unemployment_forecast, rate_forecast }, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 6. Applicant Similarity Engine ──────────────────────────────────────────
// POST /api/ai-advanced/similarity { applicantId }
router.post('/similarity', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['applicantId']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const applicant = await Applicant.findByPk(req.body.applicantId);
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

    // Find structurally similar past applicants with assessments
    const candidates = await Applicant.findAll({
      where: {
        id: { [Op.ne]: applicant.id },
        creditScore: { [Op.between]: [Math.max(300, (applicant.creditScore || 0) - 30), Math.min(850, (applicant.creditScore || 0) + 30)] },
      },
      include: [Assessment],
      limit: 20,
    });

    const similar = candidates.map((c) => ({
      name: `${c.firstName} ${c.lastName}`,
      creditScore: c.creditScore,
      annualIncome: c.annualIncome,
      status: c.status,
      lastRiskCategory: (c.Assessments || [])[0]?.riskCategory || 'n/a',
    }));

    const prompt = `Identify how similar past applicants performed and what insights apply to this new application.

Subject:
- Credit Score: ${applicant.creditScore}
- Income: $${applicant.annualIncome}
- Status: ${applicant.status}

Similar Past Applicants (n=${similar.length}, score within ±30):
${similar.slice(0, 10).map((s, i) => `  ${i + 1}. ${s.name} | Score ${s.creditScore} | Income $${s.annualIncome} | Status: ${s.status} | Last category: ${s.lastRiskCategory}`).join('\n')}

Return JSON: {
  "similar_count": ${similar.length},
  "approval_rate_pct": 0,
  "default_rate_pct": 0,
  "common_traits": [],
  "performance_summary": "",
  "recommended_decision": "approve|review|deny",
  "confidence_pct": 0
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, SYSTEM_PROMPT);
    await persistAIResult({ endpoint: 'similarity', entityType: 'Applicant', entityId: applicant.id, userId: req.user.id, result });
    res.json({ applicant: `${applicant.firstName} ${applicant.lastName}`, similar_sample: similar.slice(0, 5), ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 7. Risk Mitigation Recommendation ───────────────────────────────────────
// POST /api/ai-advanced/risk-mitigation { applicantId }
router.post('/risk-mitigation', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['applicantId']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const applicant = await Applicant.findByPk(req.body.applicantId);
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

    const prompt = `Suggest specific risk mitigation actions (collateral, guarantor, covenants) that would lower this applicant's risk tier.

Applicant:
- Credit Score: ${applicant.creditScore}
- Income: $${applicant.annualIncome}
- Debt: $${applicant.existingDebt}
- Bankruptcy: ${applicant.bankruptcyHistory ? 'Yes' : 'No'}
- Employment: ${applicant.employmentStatus}

Return JSON: {
  "current_risk_tier": "low|medium|high|critical",
  "achievable_risk_tier": "low|medium|high|critical",
  "mitigation_options": [{
    "type": "collateral|guarantor|covenant|down_payment|term_reduction|insurance",
    "description": "",
    "tier_improvement": "",
    "implementation_steps": [],
    "estimated_rate_reduction_bps": 0
  }],
  "priority_action": "",
  "expected_outcome": ""
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, SYSTEM_PROMPT);
    await persistAIResult({ endpoint: 'risk-mitigation', entityType: 'Applicant', entityId: applicant.id, userId: req.user.id, result });
    res.json({ applicant: `${applicant.firstName} ${applicant.lastName}`, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 8. Adverse Action Notification Generator ────────────────────────────────
// POST /api/ai-advanced/adverse-action { applicantId, denial_reasons: [...] }
router.post('/adverse-action', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['applicantId', 'denial_reasons']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    if (!Array.isArray(req.body.denial_reasons) || req.body.denial_reasons.length === 0) {
      return res.status(400).json({ error: 'denial_reasons must be a non-empty array' });
    }

    const applicant = await Applicant.findByPk(req.body.applicantId);
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

    const prompt = `Draft an FCRA / Reg B compliant adverse action notification for the applicant explaining the credit denial.

Applicant: ${applicant.firstName} ${applicant.lastName}
Credit Score (used): ${applicant.creditScore}

Denial Reasons (in priority order):
${req.body.denial_reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}

The letter must:
- Reference Equal Credit Opportunity Act (Reg B) rights
- Disclose credit score used and source
- Cite specific principal reasons (max 4)
- Provide consumer reporting agency contact statement
- Include 60-day right to free report

Return JSON: {
  "letter_subject": "",
  "letter_body_html": "",
  "letter_body_plain": "",
  "principal_reasons": [],
  "compliance_checklist_complete": true,
  "regulatory_citations": []
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, SYSTEM_PROMPT);
    await persistAIResult({ endpoint: 'adverse-action', entityType: 'Applicant', entityId: applicant.id, userId: req.user.id, result });
    res.json({ applicant: `${applicant.firstName} ${applicant.lastName}`, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 9. Predict Approval Likelihood ──────────────────────────────────────────
// POST /api/ai-advanced/predict-approval-likelihood { applicantId } OR { profile }
router.post('/predict-approval-likelihood', auth, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your-openrouter-key-here') {
      return res.status(503).json({ error: 'AI provider not configured. Set OPENROUTER_API_KEY in backend/.env to enable this endpoint.' });
    }
    let applicantSnapshot = null;
    let applicantName = null;
    let applicantId = null;
    if (req.body.applicantId) {
      const applicant = await Applicant.findByPk(req.body.applicantId);
      if (!applicant) return res.status(404).json({ error: 'Applicant not found' });
      applicantId = applicant.id;
      applicantName = `${applicant.firstName} ${applicant.lastName}`;
      applicantSnapshot = {
        creditScore: applicant.creditScore,
        annualIncome: applicant.annualIncome,
        existingDebt: applicant.existingDebt,
        monthlyExpenses: applicant.monthlyExpenses,
        bankruptcyHistory: applicant.bankruptcyHistory,
        employmentStatus: applicant.employmentStatus,
        yearsEmployed: applicant.yearsEmployed,
      };
    } else if (req.body.profile && typeof req.body.profile === 'object') {
      applicantSnapshot = req.body.profile;
      applicantName = req.body.profile.name || 'ad-hoc applicant';
    } else {
      return res.status(400).json({ error: 'Missing applicantId or profile' });
    }

    const prompt = `Estimate the probability that this credit applicant will be approved under standard underwriting (US, 2024 prime/near-prime guidelines).

Applicant snapshot:
${JSON.stringify(applicantSnapshot, null, 2)}

Return JSON: {
  "approval_probability_pct": 0,
  "confidence": "low|medium|high",
  "primary_drivers_positive": [],
  "primary_drivers_negative": [],
  "borderline_factors": [],
  "recommended_action": "auto_approve|standard_review|manual_underwriting|likely_denial",
  "rationale": ""
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, SYSTEM_PROMPT);
    await persistAIResult({ endpoint: 'predict-approval-likelihood', entityType: applicantId ? 'Applicant' : null, entityId: applicantId, userId: req.user.id, result });
    res.json({ applicant: applicantName, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 10. Generate Regulatory Narrative ──────────────────────────────────────
// POST /api/ai-advanced/generate-regulatory-narrative { exposureData, framework, periodLabel }
router.post('/generate-regulatory-narrative', auth, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your-openrouter-key-here') {
      return res.status(503).json({ error: 'AI provider not configured. Set OPENROUTER_API_KEY in backend/.env to enable this endpoint.' });
    }
    const missing = validateRequired(req.body, ['exposureData']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const framework = req.body.framework || 'Basel III / CECL';
    const periodLabel = req.body.periodLabel || 'current reporting period';

    const prompt = `Convert the following structured exposure data into a human-readable regulatory filing narrative aligned to ${framework}, covering the ${periodLabel}.

Structured exposure data:
${JSON.stringify(req.body.exposureData, null, 2)}

Return JSON: {
  "executive_summary": "",
  "exposure_overview_paragraph": "",
  "credit_quality_paragraph": "",
  "concentration_paragraph": "",
  "stress_and_outlook_paragraph": "",
  "controls_and_governance_paragraph": "",
  "footnotes": [],
  "regulatory_citations": []
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, SYSTEM_PROMPT);
    await persistAIResult({ endpoint: 'generate-regulatory-narrative', userId: req.user.id, result });
    res.json({ framework, periodLabel, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/ai-advanced/results — paginated AI audit log ──────────────────
router.get('/results', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20)));
    const offset = (page - 1) * limit;
    const where = {};
    if (req.query.endpoint) where.endpoint = req.query.endpoint;
    if (req.query.entityType) where.entityType = req.query.entityType;
    if (req.query.entityId) where.entityId = req.query.entityId;

    const { count, rows } = await AIResult.findAndCountAll({
      where, order: [['createdAt', 'DESC']], limit, offset,
    });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
