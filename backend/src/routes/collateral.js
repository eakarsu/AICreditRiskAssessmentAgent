const express = require('express');
const { Collateral, Applicant } = require('../models');
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

// GET /api/collateral — list all (with pagination)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.type) where.type = req.query.type;

    const { count, rows } = await Collateral.findAndCountAll({
      where,
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

// GET /api/collateral/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Collateral.findByPk(req.params.id, { include: [Applicant] });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/collateral — create collateral record
router.post('/', auth, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['type', 'estimatedValue']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    if (isNaN(Number(req.body.estimatedValue)) || Number(req.body.estimatedValue) <= 0) {
      return res.status(400).json({ error: 'estimatedValue must be a positive number.' });
    }

    const item = await Collateral.create(req.body);
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/collateral/:id — update collateral
router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Collateral.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/collateral/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Collateral.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/collateral/:id/value — AI estimates current collateral value based on market conditions
router.post('/:id/value', auth, aiRateLimiter, async (req, res) => {
  try {
    const collateral = await Collateral.findByPk(req.params.id, { include: [Applicant] });
    if (!collateral) return res.status(404).json({ error: 'Collateral not found' });

    const { market_context } = req.body; // Optional additional market context from caller

    const prompt = `Estimate the current market value of this collateral asset based on current market conditions.

Collateral Details:
- Type: ${collateral.type}
- Description: ${collateral.description}
- Original Estimated Value: $${collateral.estimatedValue}
- Verified Value: $${collateral.verifiedValue || 'Not verified'}
- Condition: ${collateral.condition}
- Location: ${collateral.location}
- Loan-to-Value Ratio: ${collateral.loanToValue}%
- Last Appraisal Date: ${collateral.lastAppraisalDate || 'Unknown'}
${collateral.Applicant ? `
Borrower: ${collateral.Applicant.firstName} ${collateral.Applicant.lastName}
Borrower Credit Score: ${collateral.Applicant.creditScore}
` : ''}
${market_context ? `Additional Market Context: ${market_context}` : ''}

Provide a comprehensive current market valuation:
1. Current Market Value Estimate with confidence interval
2. Liquidation Value (distressed sale estimate, typically 60-80% of market)
3. Value Change from Last Appraisal (% change, direction)
4. Market Conditions Affecting Value (interest rates, sector trends, regional factors)
5. Risk-Adjusted Value (value net of disposal costs, legal fees, time-to-liquidate)
6. LTV Impact (updated LTV given new estimated value)
7. Recommended Reappraisal Urgency (immediate/6-months/annual)
8. Key Value Drivers and Detractors

Return as JSON: {
  "current_market_value": 0, "value_low": 0, "value_high": 0,
  "liquidation_value": 0, "risk_adjusted_value": 0,
  "value_change_pct": 0, "updated_ltv_pct": 0,
  "market_conditions": [], "value_drivers": [], "value_detractors": [],
  "reappraisal_urgency": "immediate|6-months|annual",
  "confidence_level": "low|medium|high",
  "valuation_narrative": ""
}${DISCLAIMER}`;

    const result = await queryOpenRouter(prompt, CREDIT_SYSTEM_PROMPT);

    // Update lastAppraisalDate if we got a new value estimate
    await collateral.update({ lastAppraisalDate: new Date().toISOString().split('T')[0] });

    res.json({
      collateral_id: collateral.id,
      collateral_type: collateral.type,
      valued_at: new Date().toISOString(),
      original_estimate: collateral.estimatedValue,
      ...result,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
