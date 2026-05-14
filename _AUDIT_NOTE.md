# Audit Apply Notes — AICreditRiskAssessmentAgent

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_02.md` (lines 518-566).

This project is classified **substantive** with 22 existing AI endpoints
(13 in `routes/ai.js` plus 9 in `routes/aiAdvanced.js`), which is over the
>15-AI-endpoint threshold. Per apply-pass policy this pass is **backlog-only**.

## Original audit recommendations

### Existing AI features
13 documented in audit (assess-risk, analyze-fraud, analyze-portfolio,
compliance-check, value-collateral, analyze-warning, optimize-pricing, chat,
fraud-detection, portfolio-stress-test, early-warning, pricing-model,
regulatory-report). Inspection shows additional endpoints in `aiAdvanced.js`
(peer-comparison, scenario-simulation, auto-tier, market-benchmark,
macro-impact, similarity, risk-mitigation, adverse-action, results).

### Missing AI counterparts (minor)
- `applicants.js` lacks `/predict-approval-likelihood`.
- `export.js` lacks `/generate-regulatory-narrative`.

### Missing non-AI features
- Credit-bureau integration (Equifax, Experian, TransUnion).
- Workflow automation (auto-approval, auto-escalation).
- Salesforce / ServiceNow / core-banking integration.
- Mobile app for loan officers.

### Custom feature suggestions
- Predictive default modeling (PD at 6/12/24 months).
- Collateral-aware pricing.
- Portfolio concentration analysis.
- Regulatory scenario modeling.
- Customer lifetime value modeling.

## Implemented in this pass

None. Backlog-only per substantive-project policy.

## Backlog (prioritized)

### Mechanical, low-risk (do next)
1. `/api/ai/predict-approval-likelihood` in `routes/aiAdvanced.js` —
   stateless analysis given an applicant payload.
2. `/api/ai/generate-regulatory-narrative` in `routes/aiAdvanced.js` — turn
   structured exposure data into a human-readable filing narrative.

### Needs product decision
- Concentration-analysis endpoints (need agreed segmentation taxonomy).
- Default-probability endpoints (need decision on stateless vs. backed by
  ML model + feature store).

### Needs credentials / external SDK
- Credit-bureau API integrations.
- Salesforce / ServiceNow / core-banking integration.

### Too risky / large refactor
- Real PD/LGD ML pipeline (separate project).
- Mobile app (frontend-only constraint).

## Apply pass 3 (frontend)
LEFT-AS-IS. Frontend (React + Vite, axios `services/api.js` with Bearer interceptor on `localStorage.token`) already wires every AI-bearing backend route: `pages/AIChat.jsx` (`/ai/chat`), `pages/AIAdvanced.jsx` (8 tools against `/ai-advanced/*`), plus `pages/FraudDetection`, `EarlyWarning`, `Regulatory`, `Pricing`, `Collateral`, `Portfolio`, `Assessments`, `Applicants`. No FE work needed. Log: `_AUDIT/apply3_logs/ab3_84.md`.

## Apply pass 4 (mechanical backlog)
LEFT-AS-IS. Both mechanical-tier items (`/api/ai-advanced/predict-approval-likelihood` and `/api/ai-advanced/generate-regulatory-narrative`) are already implemented end-to-end: BE in `backend/src/routes/aiAdvanced.js` (lines 398, 450) with 503-on-no-key, FE wired in `frontend/src/pages/AIAdvanced.jsx` (lines 14-15) with the existing Bearer-token axios client. Remaining backlog (concentration analysis, default probability, credit-bureau / Salesforce / ServiceNow integration, mobile app, real PD/LGD ML pipeline) is NEEDS-CREDS / NEEDS-PRODUCT-DECISION / TOO-RISKY. Log: `_AUDIT/apply4_logs/ab3_84.md`.
