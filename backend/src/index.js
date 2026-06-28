require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
let helmet;
try { helmet = require('helmet'); } catch (_) { helmet = null; }
const { sequelize } = require('./models');

const authRoutes = require('./routes/auth');
const applicantRoutes = require('./routes/applicants');
const assessmentRoutes = require('./routes/assessments');
const portfolioRoutes = require('./routes/portfolio');
const fraudRoutes = require('./routes/fraud');
const regulatoryRoutes = require('./routes/regulatory');
const collateralRoutes = require('./routes/collateral');
const earlyWarningRoutes = require('./routes/earlyWarning');
const pricingRoutes = require('./routes/pricing');
const aiRoutes = require('./routes/ai');
const aiAdvancedRoutes = require('./routes/aiAdvanced');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Helmet security headers (graceful fallback if not installed)
if (helmet) app.use(helmet({ contentSecurityPolicy: false }));

// CORS — env-driven allow list
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/applicants', applicantRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/regulatory', regulatoryRoutes);
app.use('/api/collateral', collateralRoutes);
app.use('/api/early-warning', earlyWarningRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-advanced', aiAdvancedRoutes);





app.use('/api/ai', require('./routes/clvModeling'));
app.use('/api/ai', require('./routes/scenarioModeling'));
app.use('/api/ai', require('./routes/concentration'));
app.use('/api/ai', require('./routes/collateralPricing'));
app.use('/api/ai', require('./routes/defaultModeling'));
app.use('/api/export', exportRoutes);
app.use('/api/custom-views', require('./routes/customViews'));
app.use('/api/covenant-breach-risk', require('./routes/covenantBreachRisk'));
app.use('/api/feature-suite', require('./routes/featureSuite'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    await sequelize.sync({ alter: true });
    console.log('Models synced');
// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-applicants-lacks-predict-approval-likelihood', require('./routes/gap_applicants_lacks_predict_approval_likelihood'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-export-lacks-generate-regulatory-narrative', require('./routes/gap_export_lacks_generate_regulatory_narrative'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-assessments-lacks-ai-driven-underwriting-copilot', require('./routes/gap_assessments_lacks_ai_driven_underwriting_copilot'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-credit-bureau-integrations-equifax-experian-transunion', require('./routes/gap_no_credit_bureau_integrations_equifax_experian_transunion'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-workflow-automation-auto-approval-for-low-risk-auto-escal', require('./routes/gap_no_workflow_automation_auto_approval_for_low_risk_auto_escal'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-limited-third-party-integrations-no-salesforce-servicenow-co', require('./routes/gap_limited_third_party_integrations_no_salesforce_servicenow_co'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-loan-officer-mobile-app', require('./routes/gap_no_loan_officer_mobile_app'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-webhooks', require('./routes/gap_no_webhooks'));

    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
