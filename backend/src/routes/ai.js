const express = require('express');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../services/openrouter');
const { Applicant, Assessment, Portfolio, FraudCase, RegulatoryReport, Collateral, EarlyWarning, PricingModel } = require('../models');
const router = express.Router();

// AI Credit Risk Assessment
router.post('/assess-risk', auth, async (req, res) => {
  try {
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

Provide: 1) Risk Score (0-100), 2) Risk Category (low/medium/high/critical), 3) Recommended Credit Limit, 4) Suggested Interest Rate, 5) Approval Recommendation, 6) Key Risk Factors, 7) Mitigating Factors`;

    const systemPrompt = 'You are an expert credit risk analyst AI. Provide detailed, professional credit risk assessments with specific numerical recommendations. Format your response with clear sections and bullet points.';
    const result = await queryOpenRouter(prompt, systemPrompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Fraud Detection Analysis
router.post('/analyze-fraud', auth, async (req, res) => {
  try {
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

Provide: 1) Fraud Probability (0-100%), 2) Risk Level Assessment, 3) Pattern Analysis, 4) Recommended Actions, 5) Similar Known Fraud Patterns, 6) Prevention Recommendations`;

    const systemPrompt = 'You are an AI fraud detection specialist. Analyze potential fraud cases with detailed pattern recognition and risk assessment. Be thorough and specific.';
    const result = await queryOpenRouter(prompt, systemPrompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Portfolio Analysis
router.post('/analyze-portfolio', auth, async (req, res) => {
  try {
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

Provide: 1) Portfolio Health Score, 2) Risk Concentration Analysis, 3) Diversification Assessment, 4) Stress Test Scenarios, 5) Optimization Recommendations, 6) Market Risk Factors`;

    const systemPrompt = 'You are an AI portfolio risk analyst. Provide comprehensive portfolio analysis with actionable insights and quantitative assessments.';
    const result = await queryOpenRouter(prompt, systemPrompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Regulatory Compliance Check
router.post('/compliance-check', auth, async (req, res) => {
  try {
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

Provide: 1) Compliance Gap Analysis, 2) Risk Areas, 3) Required Actions, 4) Timeline Recommendations, 5) Regulatory Impact Assessment, 6) Best Practices`;

    const systemPrompt = 'You are an AI regulatory compliance expert for financial institutions. Provide detailed compliance analysis with specific regulatory references and actionable recommendations.';
    const result = await queryOpenRouter(prompt, systemPrompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Collateral Valuation
router.post('/value-collateral', auth, async (req, res) => {
  try {
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

Provide: 1) Market Value Assessment, 2) Liquidation Value Estimate, 3) Value Trend Analysis, 4) Risk Factors, 5) Maintenance Recommendations, 6) Reappraisal Timeline`;

    const systemPrompt = 'You are an AI collateral valuation expert. Provide detailed asset valuations with market analysis and risk assessments.';
    const result = await queryOpenRouter(prompt, systemPrompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Early Warning Analysis
router.post('/analyze-warning', auth, async (req, res) => {
  try {
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

Provide: 1) Urgency Assessment, 2) Root Cause Analysis, 3) Probability of Default, 4) Recommended Interventions, 5) Escalation Protocol, 6) Monitoring Plan`;

    const systemPrompt = 'You are an AI early warning system analyst for credit risk. Provide detailed analysis of warning signals with specific intervention recommendations.';
    const result = await queryOpenRouter(prompt, systemPrompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Pricing Optimization
router.post('/optimize-pricing', auth, async (req, res) => {
  try {
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

Provide: 1) Rate Competitiveness Analysis, 2) Risk-Adjusted Return, 3) Market Comparison, 4) Optimization Suggestions, 5) Profitability Projection, 6) Customer Impact Assessment`;

    const systemPrompt = 'You are an AI loan pricing optimization expert. Provide detailed pricing analysis with market comparisons and profitability projections.';
    const result = await queryOpenRouter(prompt, systemPrompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// General AI Chat
router.post('/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const systemPrompt = 'You are an AI credit risk assessment assistant. Help users with credit risk analysis, fraud detection, regulatory compliance, portfolio management, and financial risk assessment. Provide professional, detailed responses.';
    const result = await queryOpenRouter(message, systemPrompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
