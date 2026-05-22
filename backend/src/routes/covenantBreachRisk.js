const router = require('express').Router();

router.post('/score', (req, res) => {
  const { dscr = 1.2, leverageRatio = 3, liquidityDays = 60, lateReportingDays = 0 } = req.body || {};
  const score = Math.min(100, Math.round(
    Math.max(0, 1.25 - Number(dscr)) * 70 +
    Math.max(0, Number(leverageRatio) - 3.5) * 12 +
    Math.max(0, 45 - Number(liquidityDays)) * 1.1 +
    Number(lateReportingDays) * 2
  ));
  res.json({
    feature: 'covenant_breach_risk',
    score,
    level: score >= 70 ? 'breach-likely' : score >= 35 ? 'watch' : 'compliant',
    actions: [
      Number(dscr) < 1.25 && 'Request updated cash flow support for DSCR covenant.',
      Number(leverageRatio) > 3.5 && 'Review leverage cure provisions before renewal.',
      Number(lateReportingDays) > 0 && 'Escalate late borrower reporting.',
    ].filter(Boolean),
  });
});

module.exports = router;
