/*
  # Drop overly-broad org_subscriptions_members_read policy

  ## Summary
  Removes the policy that granted SELECT on organization_subscriptions to every
  member of an organization regardless of role. Only management and admin users
  should have visibility into subscription records.

  ## Why it is safe to drop
  A full grep of /src confirms zero frontend components query organization_subscriptions
  directly. All subscription state surfaces via the organizations table columns
  (subscription_tier, subscription_expiry_date, is_trialing, trial_ends_at) which
  already have appropriate per-role visibility.

  ## Policies after this migration
  - org_subscriptions_admin_all   — admin ALL (unchanged)
  - org_subscriptions_mgmt_own_org — management ALL own org (unchanged)
  - (removed) org_subscriptions_members_read — was SELECT for all org members
*/

DROP POLICY IF EXISTS "org_subscriptions_members_read" ON organization_subscriptions;
