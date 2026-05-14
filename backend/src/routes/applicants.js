const express = require('express');
const { Applicant } = require('../models');
const auth = require('../middleware/auth');
const router = express.Router();

// Validation helper
function validateRequired(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  return missing.length ? missing : null;
}

// GET /api/applicants — list with pagination
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.employmentStatus) where.employmentStatus = req.query.employmentStatus;

    const { count, rows } = await Applicant.findAndCountAll({
      where,
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

// GET /api/applicants/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Applicant.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/applicants — create with validation
router.post('/', auth, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['firstName', 'lastName', 'email', 'annualIncome']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    if (req.body.annualIncome && isNaN(Number(req.body.annualIncome))) {
      return res.status(400).json({ error: 'annualIncome must be a number.' });
    }
    if (req.body.creditScore && (isNaN(Number(req.body.creditScore)) || Number(req.body.creditScore) < 300 || Number(req.body.creditScore) > 850)) {
      return res.status(400).json({ error: 'creditScore must be a number between 300 and 850.' });
    }

    const item = await Applicant.create(req.body);
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/applicants/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Applicant.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/applicants/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Applicant.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
