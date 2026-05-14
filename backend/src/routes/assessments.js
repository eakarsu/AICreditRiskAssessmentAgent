const express = require('express');
const { Assessment, Applicant } = require('../models');
const auth = require('../middleware/auth');
const router = express.Router();

// Validation helper
function validateRequired(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  return missing.length ? missing : null;
}

// GET /api/assessments — list with pagination
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.riskCategory) where.riskCategory = req.query.riskCategory;
    if (req.query.applicantId) where.applicantId = req.query.applicantId;

    const { count, rows } = await Assessment.findAndCountAll({
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

// GET /api/assessments/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Assessment.findByPk(req.params.id, { include: [Applicant] });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/assessments — create with validation
router.post('/', auth, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['applicantId', 'riskScore', 'riskCategory']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const validCategories = ['low', 'medium', 'high', 'critical'];
    if (!validCategories.includes(req.body.riskCategory)) {
      return res.status(400).json({ error: `riskCategory must be one of: ${validCategories.join(', ')}` });
    }
    if (isNaN(Number(req.body.riskScore)) || Number(req.body.riskScore) < 0 || Number(req.body.riskScore) > 100) {
      return res.status(400).json({ error: 'riskScore must be a number between 0 and 100.' });
    }

    const item = await Assessment.create(req.body);
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/assessments/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Assessment.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/assessments/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Assessment.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
