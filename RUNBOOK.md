# Governed credit decision runbook

Use `scripts/bootstrap.sh`, configure `.env`, apply explicit migrations, and run the non-mutating `start.sh`. Startup no longer calls Sequelize schema alteration. The existing destructive seed is available only through `scripts/seed-demo.sh`, which requires confirmation and rejects production.

The governed migration stores verified source snapshot references (not raw SSNs), consent, approved/versioned jurisdiction policy, deterministic rule results, calibrated recommendations, human decisions with reason codes and supersession, disputes/redress, contact-rule evidence, delivery failures, fairness/drift evaluations, and immutable audit events. Generated `gap_*` endpoints are not mounted. Models may recommend review; they have no decision or outreach authority.

Before production: obtain licensed bureau/identity/servicing/payment/case adapters, validate consent and permissible purpose, calibrate and evaluate protected-group outcomes with compliance counsel, test adverse-action notices and disputes, enforce jurisdiction contact windows, encrypt identifiers, and reconcile every decision/contact receipt. This code is not financial or legal approval.
