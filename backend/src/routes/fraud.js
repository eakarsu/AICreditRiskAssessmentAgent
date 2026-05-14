const express = require('express');
const { FraudCase, Applicant } = require('../models');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { queryOpenRouter } = require('../services/openrouter');
const router = express.Router();

const CREDIT_SYSTEM_PROMPT =
  'You are an expert credit risk analyst and financial institutions specialist. Provide rigorous quantitative analysis following Basel III, CECL, and IFRS 9 frameworks.';

const DISCLAIMER =
  '\n\n---\nThis assessment is for informational purposes. All credit decisions require human review by qualified financial professionals.';

// Validation helper
function validateRequired(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  return missing.length ? missing : null;
}

// GET /api/fraud — list all fraud cases (with pagination)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const { count, rows } = await FraudCase.findAndCountAll({
      include: [Applicant],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/fraud/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await FraudCase.findByPk(req.params.id, { include: [Applicant] });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/fraud — create fraud case
router.post('/', auth, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['fraudType', 'amount']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const item = await FraudCase.create(req.body);
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/fraud/:id — update fraud case
router.put('/:id', auth, async (req, res) => {
  try {
    const item = await FraudCase.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/fraud/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await FraudCase.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/fraud/:id/investigate — AI investigation of fraud case
router.post('/:id/investigate', auth, aiRateLimiter, async (req, res) => {
  try {
    const fraudCase = await FraudCase.findByPk(req.params.id, { include: [Applicant] });
    if (!fraudCase) return res.status(404).json({ error: 'Fraud case not found' });

    const applicant = fraudCase.Applicant;

    const prompt = `Conduct a thorough AI investigation of this fraud case and provide findings with recommended actions.

Fraud Case Details:
- Case Number: ${fraudCase.caseNumber}
- Fraud Type: ${fraudCase.fraudType}
- Amount Involved: $${fraudCase.amount}
- Status: ${fraudCase.status}
- Description: ${fraudCase.description}
- Indicators: ${fraudCase.indicators}
- Reported: ${fraudCase.createdAt}

${applicant ? `
Linked Applicant:
- Name: ${applicant.firstName} ${applicant.lastName}
- Credit Score: ${applicant.creditScore}
- Annual Income: $${applicant.annualIncome}
- Employment: ${applicant.employmentStatus} at ${applicant.employerName}
- Bankruptcy History: ${applicant.bankruptcyHistory ? 'Yes' : 'No'}
` : 'No applicant linked to this case.'}

Investigation Requirements:
1. Evidence Analysis — assess the strength and relevance of reported indicators
2. Fraud Typology Classification — map to known fraud patterns (identity theft, bust-out, synthetic ID, etc.)
3. Culpability Assessment — evaluate intent vs. opportunistic fraud
4. Financial Impact Analysis — direct loss, recovery probability, indirect costs
5. Legal Action Recommendations — civil, criminal, regulatory referrals
6. Remediation Steps — immediate actions to limit further exposure
7. Prevention Recommendations — controls to prevent recurrence

Return as JSON: {
  "fraud_confirmed_probability": 0,
  "typology_classification": "",
  "evidence_strength": "weak|moderate|strong",
  "financial_impact": { "direct_loss": 0, "recovery_probability_pct": 0, "indirect_costs": "" },
  "legal_recommendations": [],
  "remediation_steps": [],
  "prevention_recommendations": [],
  "recommended_action": "close|escalate|refer_law_enforcement|civil_action|write_off",
  "findings_narrative": ""
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);

    // Update case status to 'under_review' after AI investigation
    await fraudCase.update({ status: 'under_review' });

    res.json({
      case_number: fraudCase.caseNumber,
      investigated_at: new Date().toISOString(),
      ...result,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
