require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
require('./config/runtime').validateRuntime();
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
    console.log('Database schema validated; run scripts/migrate.sh for schema changes');

    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
