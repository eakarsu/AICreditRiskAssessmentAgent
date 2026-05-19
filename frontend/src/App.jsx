import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Applicants from './pages/Applicants';
import Assessments from './pages/Assessments';
import Portfolio from './pages/Portfolio';
import FraudDetection from './pages/FraudDetection';
import Regulatory from './pages/Regulatory';
import CollateralPage from './pages/Collateral';
import EarlyWarningPage from './pages/EarlyWarning';
import PricingPage from './pages/Pricing';
import AIChat from './pages/AIChat';
import AIAdvanced from './pages/AIAdvanced';
import CustomViewsPage from './pages/CustomViewsPage';
import Layout from './components/Layout';

// // === Batch 02 Gaps & Frontend Mounts ===
import CfPredictiveDefaultModeling from './pages/CfPredictiveDefaultModeling';
import CfCollateralAwarePricing from './pages/CfCollateralAwarePricing';
import CfPortfolioConcentrationAnalysis from './pages/CfPortfolioConcentrationAnalysis';
import CfRegulatoryScenarioModeling from './pages/CfRegulatoryScenarioModeling';
import CfCustomerLifetimeValueModeling from './pages/CfCustomerLifetimeValueModeling';
import GapApplicantsLacksPredictApprovalLikelihood from './pages/GapApplicantsLacksPredictApprovalLikelihood';
import GapExportLacksGenerateRegulatoryNarrative from './pages/GapExportLacksGenerateRegulatoryNarrative';
import GapAssessmentsLacksAiDrivenUnderwritingCopilot from './pages/GapAssessmentsLacksAiDrivenUnderwritingCopilot';
import GapNoCreditBureauIntegrationsEquifaxExperianTransunion from './pages/GapNoCreditBureauIntegrationsEquifaxExperianTransunion';
import GapNoWorkflowAutomationAutoApprovalForLowRiskAutoEscal from './pages/GapNoWorkflowAutomationAutoApprovalForLowRiskAutoEscal';
import GapLimitedThirdPartyIntegrationsNoSalesforceServicenowCo from './pages/GapLimitedThirdPartyIntegrationsNoSalesforceServicenowCo';
import GapNoLoanOfficerMobileApp from './pages/GapNoLoanOfficerMobileApp';
import GapNoWebhooks from './pages/GapNoWebhooks';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  const handleLogin = (t, u) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Login onLogin={handleLogin} />} />
        
        {/* // === Batch 02 Gaps & Frontend Mounts === */}
        <Route path="/cf/predictive-default-modeling" element={<CfPredictiveDefaultModeling />} />
        <Route path="/cf/collateral-aware-pricing" element={<CfCollateralAwarePricing />} />
        <Route path="/cf/portfolio-concentration-analysis" element={<CfPortfolioConcentrationAnalysis />} />
        <Route path="/cf/regulatory-scenario-modeling" element={<CfRegulatoryScenarioModeling />} />
        <Route path="/cf/customer-lifetime-value-modeling" element={<CfCustomerLifetimeValueModeling />} />
        <Route path="/gap/applicants-lacks-predict-approval-likelihood" element={<GapApplicantsLacksPredictApprovalLikelihood />} />
        <Route path="/gap/export-lacks-generate-regulatory-narrative" element={<GapExportLacksGenerateRegulatoryNarrative />} />
        <Route path="/gap/assessments-lacks-ai-driven-underwriting-copilot" element={<GapAssessmentsLacksAiDrivenUnderwritingCopilot />} />
        <Route path="/gap/no-credit-bureau-integrations-equifax-experian-transunion" element={<GapNoCreditBureauIntegrationsEquifaxExperianTransunion />} />
        <Route path="/gap/no-workflow-automation-auto-approval-for-low-risk-auto-escal" element={<GapNoWorkflowAutomationAutoApprovalForLowRiskAutoEscal />} />
        <Route path="/gap/limited-third-party-integrations-no-salesforce-servicenow-co" element={<GapLimitedThirdPartyIntegrationsNoSalesforceServicenowCo />} />
        <Route path="/gap/no-loan-officer-mobile-app" element={<GapNoLoanOfficerMobileApp />} />
        <Route path="/gap/no-webhooks" element={<GapNoWebhooks />} />
      </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/applicants" element={<Applicants />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/fraud" element={<FraudDetection />} />
          <Route path="/regulatory" element={<Regulatory />} />
          <Route path="/collateral" element={<CollateralPage />} />
          <Route path="/early-warning" element={<EarlyWarningPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/ai-chat" element={<AIChat />} />
          <Route path="/ai-advanced" element={<AIAdvanced />} />
          <Route path="/custom-views" element={<CustomViewsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
