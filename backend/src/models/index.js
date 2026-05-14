const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

// User model
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'analyst' },
});

// Credit Applicant
const Applicant = sequelize.define('Applicant', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  ssn: { type: DataTypes.STRING },
  dateOfBirth: { type: DataTypes.DATEONLY },
  address: { type: DataTypes.TEXT },
  employmentStatus: { type: DataTypes.STRING },
  annualIncome: { type: DataTypes.DECIMAL(15, 2) },
  employerName: { type: DataTypes.STRING },
  yearsEmployed: { type: DataTypes.DECIMAL(4, 1) },
  creditScore: { type: DataTypes.INTEGER },
  existingDebt: { type: DataTypes.DECIMAL(15, 2) },
  monthlyExpenses: { type: DataTypes.DECIMAL(15, 2) },
  bankruptcyHistory: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
});

// Credit Assessment
const Assessment = sequelize.define('Assessment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  applicantId: { type: DataTypes.INTEGER, allowNull: false },
  riskScore: { type: DataTypes.DECIMAL(5, 2) },
  riskCategory: { type: DataTypes.STRING }, // low, medium, high, critical
  creditLimit: { type: DataTypes.DECIMAL(15, 2) },
  interestRate: { type: DataTypes.DECIMAL(5, 2) },
  approvalStatus: { type: DataTypes.STRING }, // approved, denied, review
  loanType: { type: DataTypes.STRING },
  loanAmount: { type: DataTypes.DECIMAL(15, 2) },
  loanTerm: { type: DataTypes.INTEGER }, // months
  debtToIncomeRatio: { type: DataTypes.DECIMAL(5, 2) },
  aiAnalysis: { type: DataTypes.TEXT },
  aiRecommendation: { type: DataTypes.TEXT },
  assessedBy: { type: DataTypes.STRING },
  assessedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

// Portfolio
const Portfolio = sequelize.define('Portfolio', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  totalValue: { type: DataTypes.DECIMAL(15, 2) },
  totalLoans: { type: DataTypes.INTEGER },
  averageRiskScore: { type: DataTypes.DECIMAL(5, 2) },
  defaultRate: { type: DataTypes.DECIMAL(5, 2) },
  performanceGrade: { type: DataTypes.STRING },
  sector: { type: DataTypes.STRING },
  region: { type: DataTypes.STRING },
  vintage: { type: DataTypes.STRING },
  expectedLoss: { type: DataTypes.DECIMAL(15, 2) },
  actualLoss: { type: DataTypes.DECIMAL(15, 2) },
  status: { type: DataTypes.STRING, defaultValue: 'active' },
});

// Fraud Detection
const FraudCase = sequelize.define('FraudCase', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  applicantId: { type: DataTypes.INTEGER },
  caseNumber: { type: DataTypes.STRING, unique: true },
  fraudType: { type: DataTypes.STRING },
  riskLevel: { type: DataTypes.STRING },
  amount: { type: DataTypes.DECIMAL(15, 2) },
  description: { type: DataTypes.TEXT },
  indicators: { type: DataTypes.TEXT }, // JSON string of fraud indicators
  status: { type: DataTypes.STRING, defaultValue: 'open' },
  aiAnalysis: { type: DataTypes.TEXT },
  investigator: { type: DataTypes.STRING },
  resolvedAt: { type: DataTypes.DATE },
});

// Regulatory Compliance
const RegulatoryReport = sequelize.define('RegulatoryReport', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reportType: { type: DataTypes.STRING, allowNull: false },
  regulatoryBody: { type: DataTypes.STRING },
  period: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'draft' },
  complianceScore: { type: DataTypes.DECIMAL(5, 2) },
  findings: { type: DataTypes.TEXT },
  recommendations: { type: DataTypes.TEXT },
  dueDate: { type: DataTypes.DATEONLY },
  submittedAt: { type: DataTypes.DATE },
  aiAnalysis: { type: DataTypes.TEXT },
});

// Collateral
const Collateral = sequelize.define('Collateral', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  applicantId: { type: DataTypes.INTEGER },
  type: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  estimatedValue: { type: DataTypes.DECIMAL(15, 2) },
  verifiedValue: { type: DataTypes.DECIMAL(15, 2) },
  loanToValue: { type: DataTypes.DECIMAL(5, 2) },
  condition: { type: DataTypes.STRING },
  location: { type: DataTypes.STRING },
  lastAppraisalDate: { type: DataTypes.DATEONLY },
  status: { type: DataTypes.STRING, defaultValue: 'active' },
  aiValuation: { type: DataTypes.TEXT },
});

// Early Warning System
const EarlyWarning = sequelize.define('EarlyWarning', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  applicantId: { type: DataTypes.INTEGER },
  warningType: { type: DataTypes.STRING },
  severity: { type: DataTypes.STRING },
  triggerMetric: { type: DataTypes.STRING },
  triggerValue: { type: DataTypes.DECIMAL(15, 2) },
  thresholdValue: { type: DataTypes.DECIMAL(15, 2) },
  description: { type: DataTypes.TEXT },
  recommendedAction: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING, defaultValue: 'active' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  acknowledgedAt: { type: DataTypes.DATE },
  aiAnalysis: { type: DataTypes.TEXT },
});

// Pricing Model
const PricingModel = sequelize.define('PricingModel', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  loanType: { type: DataTypes.STRING },
  baseRate: { type: DataTypes.DECIMAL(5, 2) },
  riskPremium: { type: DataTypes.DECIMAL(5, 2) },
  finalRate: { type: DataTypes.DECIMAL(5, 2) },
  minCreditScore: { type: DataTypes.INTEGER },
  maxCreditScore: { type: DataTypes.INTEGER },
  minLoanAmount: { type: DataTypes.DECIMAL(15, 2) },
  maxLoanAmount: { type: DataTypes.DECIMAL(15, 2) },
  termMonths: { type: DataTypes.INTEGER },
  fees: { type: DataTypes.DECIMAL(5, 2) },
  status: { type: DataTypes.STRING, defaultValue: 'active' },
  aiOptimization: { type: DataTypes.TEXT },
});

// AI Result audit trail (JSONB for full payload, including parsed structured fields)
const AIResult = sequelize.define('AIResult', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  endpoint: { type: DataTypes.STRING, allowNull: false }, // e.g. "assess-risk"
  entityType: { type: DataTypes.STRING }, // e.g. "Applicant"
  entityId: { type: DataTypes.INTEGER },
  userId: { type: DataTypes.INTEGER },
  model: { type: DataTypes.STRING },
  promptHash: { type: DataTypes.STRING },
  result: { type: DataTypes.JSONB }, // full AI response payload
  usageTokens: { type: DataTypes.INTEGER },
});

// Associations
Applicant.hasMany(Assessment, { foreignKey: 'applicantId' });
Assessment.belongsTo(Applicant, { foreignKey: 'applicantId' });
Applicant.hasMany(FraudCase, { foreignKey: 'applicantId' });
FraudCase.belongsTo(Applicant, { foreignKey: 'applicantId' });
Applicant.hasMany(Collateral, { foreignKey: 'applicantId' });
Collateral.belongsTo(Applicant, { foreignKey: 'applicantId' });
Applicant.hasMany(EarlyWarning, { foreignKey: 'applicantId' });
EarlyWarning.belongsTo(Applicant, { foreignKey: 'applicantId' });

module.exports = {
  sequelize,
  User,
  Applicant,
  Assessment,
  Portfolio,
  FraudCase,
  RegulatoryReport,
  Collateral,
  EarlyWarning,
  PricingModel,
  AIResult,
};
