const router = require('express').Router();
const { queryOpenRouter } = require('../services/openrouter');

const SYSTEM_PROMPT =
  'You are a senior commercial credit risk officer. Analyze loan covenant breach risk using ' +
  'DSCR, leverage, liquidity runway, reporting timeliness, cure rights, lender monitoring, ' +
  'and practical borrower management actions. Return strict JSON only.';

router.post('/score', async (req, res) => {
  const { dscr = 1.2, leverageRatio = 3, liquidityDays = 60, lateReportingDays = 0 } = req.body || {};
  const drivers = [
    {
      metric: 'Debt Service Coverage Ratio',
      value: Number(dscr),
      threshold: '>= 1.25x',
      status: Number(dscr) < 1.25 ? 'watch' : 'compliant',
      impact: Number(dscr) < 1.25 ? 'Cash flow coverage is below covenant comfort level.' : 'Coverage supports current debt service.',
    },
    {
      metric: 'Leverage Ratio',
      value: Number(leverageRatio),
      threshold: '<= 3.5x',
      status: Number(leverageRatio) > 3.5 ? 'watch' : 'compliant',
      impact: Number(leverageRatio) > 3.5 ? 'Borrower leverage exceeds policy watch threshold.' : 'Leverage remains inside policy threshold.',
    },
    {
      metric: 'Liquidity Days',
      value: Number(liquidityDays),
      threshold: '>= 45 days',
      status: Number(liquidityDays) < 45 ? 'watch' : 'compliant',
      impact: Number(liquidityDays) < 45 ? 'Liquidity runway is thin and may limit cure capacity.' : 'Liquidity runway is adequate.',
    },
    {
      metric: 'Reporting Timeliness',
      value: Number(lateReportingDays),
      threshold: '0 days late',
      status: Number(lateReportingDays) > 0 ? 'watch' : 'compliant',
      impact: Number(lateReportingDays) > 0 ? 'Late reporting weakens lender visibility.' : 'Borrower reporting is current.',
    },
  ];
  const score = Math.min(100, Math.round(
    Math.max(0, 1.25 - Number(dscr)) * 70 +
    Math.max(0, Number(leverageRatio) - 3.5) * 12 +
    Math.max(0, 45 - Number(liquidityDays)) * 1.1 +
    Number(lateReportingDays) * 2
  ));
  const level = score >= 70 ? 'breach-likely' : score >= 35 ? 'watch' : 'compliant';
  const baseline = {
    feature: 'covenant_breach_risk',
    breach_score: score,
    covenant_status: level,
    borrower_metrics: {
      dscr: Number(dscr),
      leverageRatio: Number(leverageRatio),
      liquidityDays: Number(liquidityDays),
      lateReportingDays: Number(lateReportingDays),
    },
    drivers,
    baseline_actions: [
      Number(dscr) < 1.25 && 'Request updated cash flow support for DSCR covenant.',
      Number(leverageRatio) > 3.5 && 'Review leverage cure provisions before renewal.',
      Number(liquidityDays) < 45 && 'Ask borrower for liquidity bridge plan and 13-week cash flow forecast.',
      Number(lateReportingDays) > 0 && 'Escalate late borrower reporting.',
      score < 35 && 'Continue routine covenant monitoring at next reporting cycle.',
    ].filter(Boolean),
  };

  const prompt = `Analyze this covenant breach risk case and return strict JSON with this schema:
{
  "summary": "one concise executive summary",
  "breach_score": number,
  "covenant_status": "compliant|watch|breach-likely",
  "risk_drivers": [{"driver": string, "severity": "low|medium|high|critical", "evidence": string}],
  "borrower_questions": [string],
  "recommended_actions": [string],
  "monitoring_plan": [{"action": string, "owner": string, "timing": string}],
  "cure_strategy": string,
  "confidence": "low|medium|high"
}

Use the deterministic rules score as baseline evidence, but provide professional commercial-credit judgment.

Baseline:
${JSON.stringify(baseline, null, 2)}`;

  try {
    const ai = await queryOpenRouter(prompt, SYSTEM_PROMPT);
    res.json({
      ...baseline,
      ...ai,
      baseline,
      ai_provider: ai.analysis?.startsWith('AI analysis unavailable') ? 'not_configured' : 'openrouter',
    });
  } catch (err) {
    res.status(500).json({
      ...baseline,
      analysis: `AI service error: ${err.message}`,
      baseline,
      ai_provider: 'error',
    });
  }
});

module.exports = router;
