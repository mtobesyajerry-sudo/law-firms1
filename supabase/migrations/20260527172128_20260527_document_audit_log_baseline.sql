/*
  # Document audit_log subscription_activated baseline

  Pre-migration activations (before 20260527) are NOT represented in audit_logs
  with action_type = 'subscription_activated'. This is intentional — fabricating
  retroactive audit entries is inappropriate for an AML/CFT compliance product.

  Source of truth for pre-migration activations:
    subscription_payments.completed_at     — when payment was confirmed
    subscription_payments.status           — 'completed'
    organizations.subscription_tier        — tier activated
    organizations.subscription_expiry_date — period end

  audit_logs.subscription_activated entries begin with the deployment of
  activate_subscription_after_payment (migration 20260527_fix_activate_...).
*/
INSERT INTO system_settings (key, value)
VALUES (
  'audit_log_subscription_activated_baseline',
  '"2026-05-27: audit_logs subscription_activated entries began with migration 20260527. Pre-migration activations visible in subscription_payments.completed_at only. No retroactive entries fabricated."'
)
ON CONFLICT (key) DO UPDATE
  SET value      = EXCLUDED.value,
      updated_at = NOW();
