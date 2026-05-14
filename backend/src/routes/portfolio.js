const express = require('express');
const { Portfolio } = require('../models');
const auth = require('../middleware/auth');
const router = express.Router();

// Validation helper
function validateRequired(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  return missing.length ? missing : null;
}

// GET /api/portfolio — list with pagination
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.sector) where.sector = req.query.sector;
    if (req.query.region) where.region = req.query.region;

    const { count, rows } = await Portfolio.findAndCountAll({
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

// GET /api/portfolio/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Portfolio.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/portfolio — create with validation
router.post('/', auth, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['name', 'totalValue', 'sector']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    if (isNaN(Number(req.body.totalValue)) || Number(req.body.totalValue) < 0) {
      return res.status(400).json({ error: 'totalValue must be a non-negative number.' });
    }

    const item = await Portfolio.create(req.body);
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/portfolio/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Portfolio.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/portfolio/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Portfolio.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
