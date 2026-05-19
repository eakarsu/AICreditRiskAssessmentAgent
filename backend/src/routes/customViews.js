const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

let PDFDocument;
try { PDFDocument = require('pdfkit'); } catch (_) { PDFDocument = null; }

// ---- Sample applicants (synthesized) ---------------------------------------
const APPLICANTS = [
  { id: 'A-1001', name: 'John Carter',     income: 92000,  dti: 0.28, utilization: 0.22, inquiries: 1, lengthYears: 9,  ficoBase: 782 },
  { id: 'A-1002', name: 'Maria Lopez',     income: 64000,  dti: 0.41, utilization: 0.55, inquiries: 4, lengthYears: 4,  ficoBase: 648 },
  { id: 'A-1003', name: 'Daniel Kim',      income: 128000, dti: 0.18, utilization: 0.12, inquiries: 0, lengthYears: 14, ficoBase: 820 },
  { id: 'A-1004', name: 'Aisha Patel',     income: 47000,  dti: 0.52, utilization: 0.78, inquiries: 6, lengthYears: 2,  ficoBase: 552 },
  { id: 'A-1005', name: 'Robert Chen',     income: 81000,  dti: 0.33, utilization: 0.36, inquiries: 2, lengthYears: 7,  ficoBase: 712 },
  { id: 'A-1006', name: 'Sofia Rivera',    income: 56000,  dti: 0.45, utilization: 0.61, inquiries: 3, lengthYears: 3,  ficoBase: 612 },
  { id: 'A-1007', name: 'Liam OConnor',    income: 103000, dti: 0.24, utilization: 0.18, inquiries: 1, lengthYears: 11, ficoBase: 768 },
  { id: 'A-1008', name: 'Hannah Becker',   income: 71000,  dti: 0.31, utilization: 0.27, inquiries: 1, lengthYears: 6,  ficoBase: 734 },
];

function band(score) {
  if (score >= 750) return 'Excellent';
  if (score >= 700) return 'Good';
  if (score >= 640) return 'Fair';
  return 'Poor';
}

// ---- VIZ 1: Credit Score Gauge ---------------------------------------------
router.get('/credit-score', auth, (req, res) => {
  try {
    const id = req.query.applicantId;
    const a = APPLICANTS.find((x) => x.id === id) || APPLICANTS[0];
    const score = a.ficoBase;
    res.json({
      applicantId: a.id,
      applicantName: a.name,
      score,
      min: 300,
      max: 850,
      band: band(score),
      bands: [
        { label: 'Poor',      from: 300, to: 580, color: '#dc2626' },
        { label: 'Fair',      from: 580, to: 670, color: '#d97706' },
        { label: 'Good',      from: 670, to: 740, color: '#0891b2' },
        { label: 'Very Good', from: 740, to: 800, color: '#2563eb' },
        { label: 'Excellent', from: 800, to: 850, color: '#059669' },
      ],
      applicants: APPLICANTS.map((x) => ({ id: x.id, name: x.name, score: x.ficoBase })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- VIZ 2: Default Probability Distribution -------------------------------
router.get('/default-distribution', auth, (req, res) => {
  try {
    // Synthesize a portfolio of 600 loans with a right-skewed default-probability distribution.
    const buckets = [];
    for (let i = 0; i <= 30; i++) {
      const pd = i * 0.01; // 0% to 30%
      // bell-ish with right skew
      const peak = 0.06;
      const sigma = 0.05;
      const base = Math.exp(-Math.pow(pd - peak, 2) / (2 * sigma * sigma));
      const skew = pd > peak ? Math.exp(-(pd - peak) * 6) : 1;
      const count = Math.max(0, Math.round(180 * base * skew + (Math.random() - 0.5) * 4));
      buckets.push({
        pd: Number((pd * 100).toFixed(1)),
        loans: count,
        expectedLoss: Number((count * pd * 24500).toFixed(0)),
      });
    }
    const total = buckets.reduce((s, b) => s + b.loans, 0);
    const weighted = buckets.reduce((s, b) => s + b.loans * b.pd, 0) / Math.max(1, total);
    res.json({
      portfolioSize: total,
      avgPdPct: Number(weighted.toFixed(2)),
      buckets,
      thresholds: { low: 5, medium: 10, high: 18 },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- NON-VIZ 1: Decision Letter PDF ----------------------------------------
router.get('/applicants', auth, (req, res) => {
  res.json({ data: APPLICANTS.map((a) => ({ id: a.id, name: a.name, income: a.income, ficoBase: a.ficoBase })) });
});

router.post('/decision-letter', auth, (req, res) => {
  try {
    if (!PDFDocument) return res.status(500).json({ error: 'pdfkit not installed' });
    const { applicantId, decision = 'approve', apr = 7.49, termMonths = 60, amount = 25000, reasons = [] } = req.body || {};
    const a = APPLICANTS.find((x) => x.id === applicantId) || APPLICANTS[0];
    const dec = String(decision).toLowerCase();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="decision-letter-${a.id}.pdf"`);

    const doc = new PDFDocument({ size: 'LETTER', margin: 56 });
    doc.pipe(res);

    doc.fontSize(20).fillColor('#1a56db').text('CreditRisk AI — Loan Decision Letter', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#475569').text(new Date().toISOString().slice(0, 10));
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#0f172a').text(`Applicant: ${a.name}`);
    doc.text(`Applicant ID: ${a.id}`);
    doc.text(`Annual Income: $${a.income.toLocaleString()}`);
    doc.text(`Credit Score (FICO): ${a.ficoBase} (${band(a.ficoBase)})`);
    doc.moveDown(0.8);

    const decisionLabel = dec === 'approve' ? 'APPROVED'
      : dec === 'decline' ? 'DECLINED'
      : 'CONDITIONALLY APPROVED';
    const decisionColor = dec === 'approve' ? '#059669'
      : dec === 'decline' ? '#dc2626' : '#d97706';

    doc.fontSize(16).fillColor(decisionColor).text(`Decision: ${decisionLabel}`);
    doc.moveDown(0.6);

    doc.fontSize(12).fillColor('#0f172a').text('Proposed Terms', { underline: true });
    doc.fontSize(11).fillColor('#1e293b');
    doc.text(`Loan Amount: $${Number(amount).toLocaleString()}`);
    doc.text(`Term: ${termMonths} months`);
    doc.text(`APR: ${Number(apr).toFixed(2)}%`);
    const monthlyRate = Number(apr) / 100 / 12;
    const payment = monthlyRate === 0
      ? amount / termMonths
      : (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
    doc.text(`Estimated Monthly Payment: $${payment.toFixed(2)}`);
    doc.moveDown(0.8);

    doc.fontSize(12).fillColor('#0f172a').text('Reasons / Notes', { underline: true });
    doc.fontSize(11).fillColor('#334155');
    const defaultReasons = {
      approve: [
        'Strong credit profile and low utilization',
        'DTI within acceptable underwriting band',
        'Stable employment history meets thresholds',
      ],
      decline: [
        'Debt-to-income ratio exceeds policy limit',
        'Recent hard inquiries indicate elevated risk',
        'Insufficient credit history length for requested amount',
      ],
      conditional: [
        'Approval contingent on documentation of income',
        'Required reduction of revolving utilization below 40%',
        'Co-signer recommended to mitigate residual risk',
      ],
    };
    const reasonList = (reasons && reasons.length ? reasons : defaultReasons[dec] || defaultReasons.approve);
    reasonList.forEach((r) => doc.text(`• ${r}`));

    doc.moveDown(1.2);
    doc.fontSize(9).fillColor('#64748b').text(
      'This letter is generated by CreditRisk AI for demonstration purposes. Final lending decisions require human underwriter review and comply with FCRA and ECOA regulations.',
      { align: 'left' }
    );

    doc.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- NON-VIZ 2: Scoring Model Configurator ---------------------------------
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

router.post('/score-preview', auth, (req, res) => {
  try {
    // Weights are 0..100; we normalize. Default weights sum to 100.
    const w = req.body?.weights || {};
    const weights = {
      income:      Number(w.income      ?? 25),
      dti:         Number(w.dti         ?? 25),
      utilization: Number(w.utilization ?? 20),
      inquiries:   Number(w.inquiries   ?? 10),
      length:      Number(w.length      ?? 20),
    };
    const total = Object.values(weights).reduce((s, v) => s + v, 0) || 1;

    const results = APPLICANTS.map((a) => {
      // Per-factor sub-scores in 0..1 (higher = better)
      const incomeScore = clamp(a.income / 150000, 0, 1);
      const dtiScore = clamp(1 - a.dti / 0.6, 0, 1);
      const utilScore = clamp(1 - a.utilization, 0, 1);
      const inqScore = clamp(1 - a.inquiries / 8, 0, 1);
      const lengthScore = clamp(a.lengthYears / 15, 0, 1);

      const blended =
        (incomeScore      * weights.income +
         dtiScore         * weights.dti +
         utilScore        * weights.utilization +
         inqScore         * weights.inquiries +
         lengthScore      * weights.length) / total;

      const previewScore = Math.round(300 + blended * 550);
      return {
        id: a.id,
        name: a.name,
        baselineScore: a.ficoBase,
        previewScore,
        delta: previewScore - a.ficoBase,
        band: band(previewScore),
        factors: {
          income:      Number(incomeScore.toFixed(3)),
          dti:         Number(dtiScore.toFixed(3)),
          utilization: Number(utilScore.toFixed(3)),
          inquiries:   Number(inqScore.toFixed(3)),
          length:      Number(lengthScore.toFixed(3)),
        },
      };
    });

    res.json({
      weights,
      normalizedWeights: Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, Number((v / total).toFixed(3))])),
      results,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
