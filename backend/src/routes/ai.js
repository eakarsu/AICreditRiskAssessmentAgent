const express = require('express');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { queryOpenRouter } = require('../services/openrouter');
const { Applicant, Assessment, Portfolio, FraudCase, RegulatoryReport, Collateral, EarlyWarning, PricingModel } = require('../models');
const router = express.Router();

const CREDIT_SYSTEM_PROMPT =
  'You are an expert credit risk analyst and financial institutions specialist. Provide rigorous quantitative analysis following Basel III, CECL, and IFRS 9 frameworks.';

const DISCLAIMER =
  '\n\n---\nThis assessment is for informational purposes. All credit decisions require human review by qualified financial professionals.';

// ── Validation helper ─────────────────────────────────────────────────────────
function validateRequired(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  return missing.length ? missing : null;
}

// ── Existing endpoints (upgraded model + rate limiting + disclaimer) ───────────

// POST /api/ai/assess-risk
router.post('/assess-risk', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['applicantId']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const { applicantId } = req.body;
    const applicant = await Applicant.findByPk(applicantId);
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

    const prompt = `Analyze credit risk for this applicant and provide a detailed risk assessment:
Name: ${applicant.firstName} ${applicant.lastName}
Credit Score: ${applicant.creditScore}
Annual Income: $${applicant.annualIncome}
Existing Debt: $${applicant.existingDebt}
Monthly Expenses: $${applicant.monthlyExpenses}
Employment: ${applicant.employmentStatus} at ${applicant.employerName} for ${applicant.yearsEmployed} years
Bankruptcy History: ${applicant.bankruptcyHistory ? 'Yes' : 'No'}

Provide: 1) Risk Score (0-100), 2) Risk Category (low/medium/high/critical), 3) Recommended Credit Limit, 4) Suggested Interest Rate, 5) Approval Recommendation, 6) Key Risk Factors, 7) Mitigating Factors${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/analyze-fraud
router.post('/analyze-fraud', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['caseId']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const { caseId } = req.body;
    const fraudCase = await FraudCase.findByPk(caseId, { include: [Applicant] });
    if (!fraudCase) return res.status(404).json({ error: 'Case not found' });

    const prompt = `Analyze this potential fraud case:
Case #: ${fraudCase.caseNumber}
Fraud Type: ${fraudCase.fraudType}
Amount: $${fraudCase.amount}
Description: ${fraudCase.description}
Indicators: ${fraudCase.indicators}
Applicant: ${fraudCase.Applicant ? `${fraudCase.Applicant.firstName} ${fraudCase.Applicant.lastName}` : 'N/A'}

Provide: 1) Fraud Probability (0-100%), 2) Risk Level Assessment, 3) Pattern Analysis, 4) Recommended Actions, 5) Similar Known Fraud Patterns, 6) Prevention Recommendations${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/analyze-portfolio
router.post('/analyze-portfolio', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['portfolioId']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const { portfolioId } = req.body;
    const portfolio = await Portfolio.findByPk(portfolioId);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const prompt = `Analyze this credit portfolio:
Name: ${portfolio.name}
Total Value: $${portfolio.totalValue}
Total Loans: ${portfolio.totalLoans}
Average Risk Score: ${portfolio.averageRiskScore}
Default Rate: ${portfolio.defaultRate}%
Sector: ${portfolio.sector}
Region: ${portfolio.region}
Expected Loss: $${portfolio.expectedLoss}
Actual Loss: $${portfolio.actualLoss}

Provide: 1) Portfolio Health Score, 2) Risk Concentration Analysis, 3) Diversification Assessment, 4) Stress Test Scenarios, 5) Optimization Recommendations, 6) Market Risk Factors${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/compliance-check
router.post('/compliance-check', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['reportId']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const { reportId } = req.body;
    const report = await RegulatoryReport.findByPk(reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const prompt = `Analyze regulatory compliance for this report:
Report Type: ${report.reportType}
Regulatory Body: ${report.regulatoryBody}
Period: ${report.period}
Current Compliance Score: ${report.complianceScore}%
Findings: ${report.findings}
Due Date: ${report.dueDate}

Provide: 1) Compliance Gap Analysis, 2) Risk Areas, 3) Required Actions, 4) Timeline Recommendations, 5) Regulatory Impact Assessment, 6) Best Practices${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/value-collateral
router.post('/value-collateral', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['collateralId']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const { collateralId } = req.body;
    const collateral = await Collateral.findByPk(collateralId, { include: [Applicant] });
    if (!collateral) return res.status(404).json({ error: 'Collateral not found' });

    const prompt = `Evaluate this collateral:
Type: ${collateral.type}
Description: ${collateral.description}
Estimated Value: $${collateral.estimatedValue}
Verified Value: $${collateral.verifiedValue}
LTV Ratio: ${collateral.loanToValue}%
Condition: ${collateral.condition}
Location: ${collateral.location}
Last Appraisal: ${collateral.lastAppraisalDate}

Provide: 1) Market Value Assessment, 2) Liquidation Value Estimate, 3) Value Trend Analysis, 4) Risk Factors, 5) Maintenance Recommendations, 6) Reappraisal Timeline${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/analyze-warning
router.post('/analyze-warning', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['warningId']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const { warningId } = req.body;
    const warning = await EarlyWarning.findByPk(warningId, { include: [Applicant] });
    if (!warning) return res.status(404).json({ error: 'Warning not found' });

    const prompt = `Analyze this early warning signal:
Warning Type: ${warning.warningType}
Severity: ${warning.severity}
Trigger Metric: ${warning.triggerMetric}
Trigger Value: ${warning.triggerValue}
Threshold: ${warning.thresholdValue}
Description: ${warning.description}
Applicant: ${warning.Applicant ? `${warning.Applicant.firstName} ${warning.Applicant.lastName}` : 'N/A'}

Provide: 1) Urgency Assessment, 2) Root Cause Analysis, 3) Probability of Default, 4) Recommended Interventions, 5) Escalation Protocol, 6) Monitoring Plan${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/optimize-pricing
router.post('/optimize-pricing', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['pricingId']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const { pricingId } = req.body;
    const pricing = await PricingModel.findByPk(pricingId);
    if (!pricing) return res.status(404).json({ error: 'Pricing model not found' });

    const prompt = `Optimize this loan pricing model:
Name: ${pricing.name}
Loan Type: ${pricing.loanType}
Base Rate: ${pricing.baseRate}%
Risk Premium: ${pricing.riskPremium}%
Final Rate: ${pricing.finalRate}%
Credit Score Range: ${pricing.minCreditScore}-${pricing.maxCreditScore}
Loan Amount Range: $${pricing.minLoanAmount}-$${pricing.maxLoanAmount}
Term: ${pricing.termMonths} months
Fees: ${pricing.fees}%

Provide: 1) Rate Competitiveness Analysis, 2) Risk-Adjusted Return, 3) Market Comparison, 4) Optimization Suggestions, 5) Profitability Projection, 6) Customer Impact Assessment${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/chat
router.post('/chat', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['message']);
    if (missing) return res.status(400).json({ error: 'message is required.' });

    const result = await queryOpenRouter(req.body.message + DISCLAIMER, CREDIT_SYSTEM_PROMPT);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── NEW ENDPOINTS ─────────────────────────────────────────────────────────────

// POST /api/ai/fraud-detection
// Takes { applicant_id } → analyze for synthetic identity, velocity abuse, anomalous patterns
router.post('/fraud-detection', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['applicant_id']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const { applicant_id } = req.body;
    const applicant = await Applicant.findByPk(applicant_id);
    if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

    // Gather associated fraud cases and assessments for context
    const [fraudCases, assessments] = await Promise.all([
      FraudCase.findAll({ where: { applicantId: applicant_id }, limit: 10 }),
      Assessment.findAll({ where: { applicantId: applicant_id }, limit: 5, order: [['createdAt', 'DESC']] }),
    ]);

    const prompt = `Perform a comprehensive fraud detection analysis for this credit applicant.

Applicant Profile:
- Name: ${applicant.firstName} ${applicant.lastName}
- Credit Score: ${applicant.creditScore}
- Annual Income: $${applicant.annualIncome}
- Employment: ${applicant.employmentStatus} at ${applicant.employerName} for ${applicant.yearsEmployed} years
- Existing Debt: $${applicant.existingDebt}
- Bankruptcy History: ${applicant.bankruptcyHistory ? 'Yes' : 'No'}
- SSN provided: ${applicant.ssn ? 'Yes' : 'No'}

Prior Fraud Cases on File: ${fraudCases.length}
${fraudCases.map((c) => `  - Case ${c.caseNumber}: ${c.fraudType}, Amount: $${c.amount}, Status: ${c.status}`).join('\n') || '  None'}

Recent Assessments: ${assessments.length}
${assessments.map((a) => `  - Risk Score: ${a.riskScore}, Category: ${a.riskCategory}, Date: ${a.createdAt}`).join('\n') || '  None'}

Analyze for the following fraud indicators:
1. Synthetic Identity Risk — inconsistencies that suggest a fabricated identity
2. Velocity Abuse — signs of rapid multiple application attempts
3. Anomalous Income/Employment Patterns — implausible financial claims
4. Document Fraud Indicators — red flags in submitted documentation
5. Known Fraud Pattern Matches — comparison to common fraud typologies

Provide:
- Fraud Probability Score (0-100%)
- Risk Level (low/medium/high/critical)
- Detected Indicators with evidence
- Recommended Verification Actions
- Suggested SAR (Suspicious Activity Report) filing decision
Return as JSON: { "fraud_probability": 0, "risk_level": "", "detected_indicators": [], "verification_actions": [], "sar_recommendation": "", "narrative": "" }${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);
    res.json({ applicant: `${applicant.firstName} ${applicant.lastName}`, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/portfolio-stress-test
// Takes { portfolio_id, economic_scenario } → models loss under various scenarios
router.post('/portfolio-stress-test', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['portfolio_id', 'economic_scenario']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const { portfolio_id, economic_scenario } = req.body;
    const validScenarios = ['recession', 'inflation', 'rate_shock', 'stagflation', 'recovery'];
    if (!validScenarios.includes(economic_scenario)) {
      return res.status(400).json({ error: `economic_scenario must be one of: ${validScenarios.join(', ')}` });
    }

    const portfolio = await Portfolio.findByPk(portfolio_id);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    const scenarioDescriptions = {
      recession: 'GDP contraction -3%, unemployment +5pp, credit spreads +300bps, real estate -20%',
      inflation: 'CPI +8% YoY, central bank rate hikes +400bps, consumer purchasing power -15%',
      rate_shock: 'Overnight rate spike +500bps over 6 months, yield curve inversion, liquidity crunch',
      stagflation: 'GDP flat, inflation +6%, unemployment +3pp, commodity prices +40%',
      recovery: 'GDP growth +4%, unemployment -2pp, credit spreads tightening -150bps, consumer confidence high',
    };

    const prompt = `Perform a Basel III-compliant stress test on this credit portfolio under the specified economic scenario.

Portfolio:
- Name: ${portfolio.name}
- Total Value: $${portfolio.totalValue}
- Total Loans: ${portfolio.totalLoans}
- Current Default Rate: ${portfolio.defaultRate}%
- Average Risk Score: ${portfolio.averageRiskScore}
- Sector: ${portfolio.sector}
- Region: ${portfolio.region}
- Expected Loss (baseline): $${portfolio.expectedLoss}
- Actual Loss (to date): $${portfolio.actualLoss}

Stress Scenario: ${economic_scenario.toUpperCase()}
Scenario Parameters: ${scenarioDescriptions[economic_scenario]}

Model the following under this scenario:
1. Projected Default Rate Change (bps shift from baseline)
2. Estimated Portfolio Loss ($) under stress
3. Loss Given Default (LGD) impact
4. Probability of Default (PD) migration matrix (current → stressed)
5. Required Capital Buffer increase (Basel III Tier 1)
6. Sector-Specific Vulnerabilities within this portfolio
7. Recovery timeline and exit strategy recommendations
8. Mitigation actions to reduce stress impact

Return as JSON: {
  "scenario": "", "baseline_default_rate": 0, "stressed_default_rate": 0,
  "estimated_loss_usd": 0, "capital_buffer_increase_pct": 0,
  "pd_migration": {}, "lgd_impact": "", "sector_vulnerabilities": [],
  "mitigation_actions": [], "recovery_timeline_months": 0, "narrative": ""
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);
    res.json({ portfolio: portfolio.name, economic_scenario, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/early-warning
// Takes { portfolio_id } → identifies deteriorating accounts before default, triggers alerts
router.post('/early-warning', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['portfolio_id']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const { portfolio_id } = req.body;
    const portfolio = await Portfolio.findByPk(portfolio_id);
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    // Fetch active early warnings for this portfolio's applicants
    const warnings = await EarlyWarning.findAll({
      where: { isActive: true },
      include: [{ model: Applicant, required: true }],
      limit: 50,
      order: [['createdAt', 'DESC']],
    });

    const prompt = `Identify deteriorating accounts in this credit portfolio before they reach default status.

Portfolio:
- Name: ${portfolio.name}
- Total Value: $${portfolio.totalValue}
- Current Default Rate: ${portfolio.defaultRate}%
- Average Risk Score: ${portfolio.averageRiskScore}
- Sector: ${portfolio.sector}

Active Early Warning Signals (${warnings.length} total):
${warnings.slice(0, 20).map((w) => `
  - Warning: ${w.warningType}, Severity: ${w.severity}
    Trigger: ${w.triggerMetric} = ${w.triggerValue} (threshold: ${w.thresholdValue})
    Applicant: ${w.Applicant ? `${w.Applicant.firstName} ${w.Applicant.lastName} (Score: ${w.Applicant.creditScore})` : 'Unknown'}
    Description: ${w.description}
`).join('') || '  No active warnings on file'}

Based on this data, identify:
1. Accounts at highest risk of default in next 90 days (with probability estimates)
2. Patterns suggesting systemic deterioration in specific segments
3. Early intervention recommendations per account tier
4. Escalation triggers — which accounts need immediate review
5. Automated alert rules to set up for ongoing monitoring
6. Portfolio-level deterioration score (0-100, 100=critical)

Return as JSON: {
  "portfolio_deterioration_score": 0,
  "high_risk_accounts": [{ "applicant_name": "", "default_probability_90d": 0, "recommended_action": "" }],
  "systemic_patterns": [],
  "intervention_recommendations": [],
  "escalation_triggers": [],
  "monitoring_rules": [],
  "narrative": ""
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);
    res.json({ portfolio: portfolio.name, active_warnings: warnings.length, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/pricing-model
// Takes { risk_score, loan_amount, term_months } → optimal interest rate with competitive positioning
router.post('/pricing-model', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['risk_score', 'loan_amount', 'term_months']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const { risk_score, loan_amount, term_months, loan_type = 'personal', collateral_type = 'unsecured' } = req.body;

    if (isNaN(Number(risk_score)) || Number(risk_score) < 0 || Number(risk_score) > 100) {
      return res.status(400).json({ error: 'risk_score must be a number between 0 and 100.' });
    }
    if (isNaN(Number(loan_amount)) || Number(loan_amount) <= 0) {
      return res.status(400).json({ error: 'loan_amount must be a positive number.' });
    }
    if (isNaN(Number(term_months)) || Number(term_months) <= 0) {
      return res.status(400).json({ error: 'term_months must be a positive number.' });
    }

    // Fetch existing pricing models for benchmarking
    const models = await PricingModel.findAll({ limit: 10, order: [['createdAt', 'DESC']] });

    const prompt = `Calculate the optimal interest rate for a loan application using risk-based pricing methodology.

Loan Parameters:
- Risk Score: ${risk_score}/100 (higher = higher risk)
- Loan Amount: $${loan_amount}
- Term: ${term_months} months
- Loan Type: ${loan_type}
- Collateral: ${collateral_type}

Benchmark Pricing Models on File:
${models.map((m) => `- ${m.name}: Base ${m.baseRate}%, Risk Premium ${m.riskPremium}%, Final ${m.finalRate}%, Score Range ${m.minCreditScore}-${m.maxCreditScore}`).join('\n') || 'No benchmark models available'}

Apply the following pricing framework:
1. Risk-Based Rate Calculation (base rate + credit risk premium + liquidity premium)
2. Basel III Capital Adequacy Impact on pricing
3. Competitive Rate Benchmarking (typical market rates for this risk tier)
4. Profitability Analysis (NIM projection, expected ROE)
5. Customer Retention Sensitivity (rate elasticity estimate)
6. Recommended Rate Range (floor, target, ceiling)
7. Fee Structure Optimization

Return as JSON: {
  "recommended_rate_pct": 0, "rate_floor_pct": 0, "rate_ceiling_pct": 0,
  "base_rate_pct": 0, "risk_premium_pct": 0, "liquidity_premium_pct": 0,
  "origination_fee_pct": 0, "monthly_payment_estimate": 0,
  "nim_projection_pct": 0, "roe_estimate_pct": 0,
  "competitive_positioning": "", "rate_rationale": "", "fee_structure": {}
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);
    res.json({ inputs: { risk_score, loan_amount, term_months, loan_type, collateral_type }, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/regulatory-report
// Takes { report_type, period } → generates CECL, Basel III, stress test narrative reports
router.post('/regulatory-report', auth, aiRateLimiter, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['report_type', 'period']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const { report_type, period } = req.body;
    const validTypes = ['CECL', 'Basel_III', 'stress_test', 'IFRS9', 'AML_SAR', 'CRA'];
    if (!validTypes.includes(report_type)) {
      return res.status(400).json({ error: `report_type must be one of: ${validTypes.join(', ')}` });
    }

    // Fetch existing regulatory reports for context
    const existingReports = await RegulatoryReport.findAll({
      where: { reportType: report_type },
      limit: 3,
      order: [['createdAt', 'DESC']],
    });

    // Aggregate portfolio summary
    const portfolios = await Portfolio.findAll({ limit: 10 });
    const totalValue = portfolios.reduce((s, p) => s + parseFloat(p.totalValue || 0), 0);
    const avgRisk = portfolios.length
      ? portfolios.reduce((s, p) => s + parseFloat(p.averageRiskScore || 0), 0) / portfolios.length
      : 0;
    const avgDefault = portfolios.length
      ? portfolios.reduce((s, p) => s + parseFloat(p.defaultRate || 0), 0) / portfolios.length
      : 0;

    const reportDescriptions = {
      CECL: 'Current Expected Credit Loss — FASB ASC 326 forward-looking loss reserve calculation',
      Basel_III: 'Capital adequacy, leverage ratio, liquidity coverage ratio (LCR), net stable funding ratio (NSFR) assessment',
      stress_test: 'Federal Reserve DFAST/CCAR-style stress testing narrative with adverse and severely adverse scenarios',
      IFRS9: 'International Financial Reporting Standard 9 — ECL staging, loss allowance, and PD/LGD/EAD estimates',
      AML_SAR: 'Anti-Money Laundering Suspicious Activity Report compilation and narrative',
      CRA: 'Community Reinvestment Act performance evaluation and compliance assessment',
    };

    const prompt = `Generate a comprehensive ${report_type} regulatory report for the period: ${period}.

Report Framework: ${reportDescriptions[report_type]}

Portfolio Summary (${portfolios.length} portfolios):
- Total Portfolio Value: $${totalValue.toLocaleString()}
- Average Risk Score: ${avgRisk.toFixed(1)}
- Average Default Rate: ${avgDefault.toFixed(2)}%

Historical Reports (${existingReports.length} prior):
${existingReports.map((r) => `- Period: ${r.period}, Compliance Score: ${r.complianceScore}%, Body: ${r.regulatoryBody}`).join('\n') || '  No prior reports'}

Generate a formal regulatory report including:
1. Executive Summary
2. Methodology and Assumptions
3. Key Metrics and Quantitative Analysis
4. Compliance Assessment
5. Material Findings and Risk Areas
6. Recommended Management Actions
7. Forward-Looking Outlook
8. Required Disclosures

Return as JSON: {
  "report_type": "", "period": "", "executive_summary": "",
  "methodology": "", "key_metrics": {}, "compliance_score": 0,
  "material_findings": [], "management_actions": [],
  "forward_outlook": "", "required_disclosures": [], "full_narrative": ""
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);
    res.json({ report_type, period, generated_at: new Date().toISOString(), ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
