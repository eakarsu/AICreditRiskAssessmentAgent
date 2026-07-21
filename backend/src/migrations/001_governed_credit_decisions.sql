BEGIN;
CREATE TABLE IF NOT EXISTS credit_policy_versions (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  policy_key TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  version INTEGER NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  rules JSONB NOT NULL,
  approved_by TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL,
  UNIQUE (tenant_id,policy_key,version)
);
CREATE TABLE IF NOT EXISTS governed_credit_applications (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  applicant_reference TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  requested_product TEXT NOT NULL,
  requested_amount_cents BIGINT NOT NULL CHECK (requested_amount_cents > 0),
  source_snapshot_uri TEXT NOT NULL,
  source_snapshot_sha256 CHAR(64) NOT NULL,
  consent_reference TEXT NOT NULL,
  consent_recorded_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('verified','policy_evaluation','human_review','approved','declined','withdrawn','disputed','corrected')),
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS credit_policy_evaluations (
  id UUID PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES governed_credit_applications(id),
  tenant_id TEXT NOT NULL,
  policy_version_id UUID NOT NULL REFERENCES credit_policy_versions(id),
  input_sha256 CHAR(64) NOT NULL,
  rule_results JSONB NOT NULL,
  score NUMERIC(8,5),
  calibrated_probability NUMERIC(8,7) CHECK (calibrated_probability BETWEEN 0 AND 1),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('review','approve','decline')),
  model_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS credit_decisions (
  id UUID PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES governed_credit_applications(id),
  tenant_id TEXT NOT NULL,
  evaluation_id UUID NOT NULL REFERENCES credit_policy_evaluations(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved','declined','withdrawn','corrected')),
  reason_codes JSONB NOT NULL,
  explanation_text TEXT NOT NULL,
  authority_actor_id TEXT NOT NULL,
  authority_role TEXT NOT NULL,
  policy_version_id UUID NOT NULL REFERENCES credit_policy_versions(id),
  supersedes_decision_id UUID REFERENCES credit_decisions(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS credit_disputes (
  id UUID PRIMARY KEY, application_id UUID NOT NULL REFERENCES governed_credit_applications(id), tenant_id TEXT NOT NULL,
  submitted_by TEXT NOT NULL, reason TEXT NOT NULL, evidence_uri TEXT, status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','rejected')),
  resolution TEXT, resolved_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS credit_contact_outbox (
  id UUID PRIMARY KEY, application_id UUID NOT NULL REFERENCES governed_credit_applications(id), tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('secure_portal','email','postal','case_system')), template_key TEXT NOT NULL,
  jurisdiction TEXT NOT NULL, contact_window_evidence JSONB NOT NULL, idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivering','delivered','failed','suppressed','dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0, last_error_code TEXT, provider_reference TEXT, next_attempt_at TIMESTAMPTZ,
  UNIQUE (tenant_id,channel,idempotency_key)
);
CREATE TABLE IF NOT EXISTS credit_model_evaluations (
  id UUID PRIMARY KEY, tenant_id TEXT NOT NULL, model_reference TEXT NOT NULL, policy_version_id UUID NOT NULL REFERENCES credit_policy_versions(id),
  population_window JSONB NOT NULL, calibration_metrics JSONB NOT NULL, fairness_metrics JSONB NOT NULL, drift_metrics JSONB NOT NULL,
  disposition TEXT NOT NULL CHECK (disposition IN ('pass','review','blocked')), reviewed_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS credit_audit_events (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, application_id UUID NOT NULL REFERENCES governed_credit_applications(id),
  actor_id TEXT NOT NULL, action TEXT NOT NULL, evidence JSONB NOT NULL DEFAULT '{}'::jsonb, occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_application_tenant_status ON governed_credit_applications(tenant_id,status);
CREATE INDEX IF NOT EXISTS idx_credit_contact_retry ON credit_contact_outbox(status,next_attempt_at);
COMMIT;
