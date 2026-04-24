require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
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

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(cors());
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
    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
