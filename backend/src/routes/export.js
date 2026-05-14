/**
 * GET /api/export/risk-report
 * PDF portfolio risk summary with AI assessment distribution.
 * Uses pdfkit if available, falls back to plain-text PDF if not installed.
 */

const express = require('express');
const auth = require('../middleware/auth');
const { Portfolio, Assessment, Applicant, FraudCase, EarlyWarning } = require('../models');
const router = express.Router();

async function buildPDF(res, data) {
  let PDFDocument;
  try {
    PDFDocument = require('pdfkit');
  } catch (_) {
    // pdfkit not installed — return a minimal plain-text "PDF" for graceful degradation
    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="risk-report-${data.generatedAt}.txt"`,
    });
    return res.send([
      'PORTFOLIO CREDIT RISK SUMMARY REPORT',
      `Generated: ${data.generatedAt}`,
      `Period: ${data.period}`,
      '',
      '=== PORTFOLIO SUMMARY ===',
      `Total Portfolios: ${data.totalPortfolios}`,
      `Total Portfolio Value: $${data.totalValue.toLocaleString()}`,
      `Average Risk Score: ${data.avgRiskScore}`,
      `Average Default Rate: ${data.avgDefaultRate}%`,
      '',
      '=== AI ASSESSMENT DISTRIBUTION ===',
      `Total Assessments: ${data.totalAssessments}`,
      `Low Risk: ${data.distribution.low} (${data.distribution.lowPct}%)`,
      `Medium Risk: ${data.distribution.medium} (${data.distribution.mediumPct}%)`,
      `High Risk: ${data.distribution.high} (${data.distribution.highPct}%)`,
      `Critical Risk: ${data.distribution.critical} (${data.distribution.criticalPct}%)`,
      '',
      '=== FRAUD & EARLY WARNINGS ===',
      `Open Fraud Cases: ${data.openFraudCases}`,
      `Active Early Warnings: ${data.activeWarnings}`,
      '',
      '=== PORTFOLIOS ===',
      ...data.portfolios.map((p) =>
        `- ${p.name} | Value: $${parseFloat(p.totalValue).toLocaleString()} | Loans: ${p.totalLoans} | Risk: ${p.averageRiskScore} | Default: ${p.defaultRate}%`
      ),
      '',
      '=== DISCLAIMER ===',
      'This report is for informational purposes. All credit decisions require human review by qualified financial professionals.',
    ].join('\n'));
  }

  const doc = new PDFDocument({ margin: 50 });
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="risk-report-${data.generatedAt}.pdf"`,
  });
  doc.pipe(res);

  // Title
  doc.fontSize(20).font('Helvetica-Bold').text('Portfolio Credit Risk Summary Report', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`Generated: ${data.generatedAt}  |  Period: ${data.period}`, { align: 'center' });
  doc.moveDown(1.5);

  // Portfolio Summary
  doc.fontSize(14).font('Helvetica-Bold').text('Portfolio Summary');
  doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  [
    [`Total Portfolios:`, data.totalPortfolios],
    [`Total Portfolio Value:`, `$${data.totalValue.toLocaleString()}`],
    [`Average Risk Score:`, data.avgRiskScore],
    [`Average Default Rate:`, `${data.avgDefaultRate}%`],
  ].forEach(([label, val]) => {
    doc.text(`${label}  ${val}`);
  });
  doc.moveDown(1);

  // AI Assessment Distribution
  doc.fontSize(14).font('Helvetica-Bold').text('AI Assessment Distribution');
  doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Total Assessments: ${data.totalAssessments}`);
  const dist = data.distribution;
  [
    ['Low Risk', dist.low, dist.lowPct, '#22c55e'],
    ['Medium Risk', dist.medium, dist.mediumPct, '#f59e0b'],
    ['High Risk', dist.high, dist.highPct, '#f97316'],
    ['Critical Risk', dist.critical, dist.criticalPct, '#ef4444'],
  ].forEach(([label, count, pct]) => {
    doc.text(`  ${label}: ${count} (${pct}%)`);
  });
  doc.moveDown(1);

  // Fraud & Early Warnings
  doc.fontSize(14).font('Helvetica-Bold').text('Fraud & Early Warning Signals');
  doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Open Fraud Cases: ${data.openFraudCases}`);
  doc.text(`Active Early Warnings: ${data.activeWarnings}`);
  doc.moveDown(1);

  // Portfolio Table
  doc.fontSize(14).font('Helvetica-Bold').text('Portfolio Detail');
  doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica');
  data.portfolios.forEach((p) => {
    doc.text(
      `${p.name}  |  $${parseFloat(p.totalValue).toLocaleString()}  |  ${p.totalLoans} loans  |  Risk: ${p.averageRiskScore}  |  Default: ${p.defaultRate}%`,
      { continued: false }
    );
  });
  doc.moveDown(1);

  // Disclaimer
  doc.fontSize(8).fillColor('gray')
    .text(
      'DISCLAIMER: This report is for informational purposes only. All credit decisions require human review by qualified financial professionals.',
      { align: 'center' }
    );

  doc.end();
}

// GET /api/export/risk-report?period=YYYY-MM
router.get('/risk-report', auth, async (req, res) => {
  try {
    const period = req.query.period || new Date().toISOString().substring(0, 7);
    const generatedAt = new Date().toISOString().split('T')[0];

    const [portfolios, assessments, openFraud, activeWarnings] = await Promise.all([
      Portfolio.findAll({ order: [['totalValue', 'DESC']] }),
      Assessment.findAll({ order: [['createdAt', 'DESC']] }),
      FraudCase.count({ where: { status: 'open' } }),
      EarlyWarning.count({ where: { isActive: true } }),
    ]);

    const totalValue = portfolios.reduce((s, p) => s + parseFloat(p.totalValue || 0), 0);
    const avgRiskScore = portfolios.length
      ? (portfolios.reduce((s, p) => s + parseFloat(p.averageRiskScore || 0), 0) / portfolios.length).toFixed(1)
      : 0;
    const avgDefaultRate = portfolios.length
      ? (portfolios.reduce((s, p) => s + parseFloat(p.defaultRate || 0), 0) / portfolios.length).toFixed(2)
      : 0;

    const totalAssessments = assessments.length;
    const countBy = (cat) => assessments.filter((a) => a.riskCategory === cat).length;
    const pct = (n) => totalAssessments ? ((n / totalAssessments) * 100).toFixed(1) : '0.0';

    const distribution = {
      low: countBy('low'), lowPct: pct(countBy('low')),
      medium: countBy('medium'), mediumPct: pct(countBy('medium')),
      high: countBy('high'), highPct: pct(countBy('high')),
      critical: countBy('critical'), criticalPct: pct(countBy('critical')),
    };

    const reportData = {
      generatedAt,
      period,
      totalPortfolios: portfolios.length,
      totalValue,
      avgRiskScore,
      avgDefaultRate,
      totalAssessments,
      distribution,
      openFraudCases: openFraud,
      activeWarnings,
      portfolios,
    };

    await buildPDF(res, reportData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
