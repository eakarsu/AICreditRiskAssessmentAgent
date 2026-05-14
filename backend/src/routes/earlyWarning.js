const express = require('express');
const { EarlyWarning, Applicant } = require('../models');
const auth = require('../middleware/auth');
const router = express.Router();

// Validation helper
function validateRequired(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  return missing.length ? missing : null;
}

// GET /api/early-warning/active — currently triggered warnings with severity
router.get('/active', auth, async (req, res) => {
  try {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    const items = await EarlyWarning.findAll({
      where: { isActive: true },
      include: [Applicant],
      order: [['createdAt', 'DESC']],
    });

    // Sort by severity in JS (Sequelize doesn't easily ORDER BY custom enum)
    items.sort((a, b) => {
      const sa = severityOrder[a.severity] ?? 99;
      const sb = severityOrder[b.severity] ?? 99;
      return sa - sb;
    });

    const grouped = {
      critical: items.filter((w) => w.severity === 'critical'),
      high: items.filter((w) => w.severity === 'high'),
      medium: items.filter((w) => w.severity === 'medium'),
      low: items.filter((w) => w.severity === 'low'),
    };

    res.json({
      total_active: items.length,
      by_severity: {
        critical: grouped.critical.length,
        high: grouped.high.length,
        medium: grouped.medium.length,
        low: grouped.low.length,
      },
      warnings: items,
      grouped,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/early-warning — list all (with pagination)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.active !== undefined) {
      where.isActive = req.query.active === 'true';
    }
    if (req.query.severity) {
      where.severity = req.query.severity;
    }

    const { count, rows } = await EarlyWarning.findAndCountAll({
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

// GET /api/early-warning/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await EarlyWarning.findByPk(req.params.id, { include: [Applicant] });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/early-warning — create warning
router.post('/', auth, async (req, res) => {
  try {
    const missing = validateRequired(req.body, ['warningType', 'severity', 'triggerMetric', 'triggerValue', 'thresholdValue']);
    if (missing) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(req.body.severity)) {
      return res.status(400).json({ error: `severity must be one of: ${validSeverities.join(', ')}` });
    }

    const item = await EarlyWarning.create({ ...req.body, isActive: true });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/early-warning/:id — update warning
router.put('/:id', auth, async (req, res) => {
  try {
    const item = await EarlyWarning.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/early-warning/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await EarlyWarning.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
