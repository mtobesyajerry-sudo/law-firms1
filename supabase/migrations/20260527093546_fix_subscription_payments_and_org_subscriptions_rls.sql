/*
  # Fix RLS on subscription_payments and organization_subscriptions

  ## subscription_payments
  - Drop the admin-only write policy and the management read-only policy
  - Add management full access (own org only)
  - Add admin full access (all orgs)

  ## organization_subscriptions
  - Drop the admin/system_admin-only write policy and the mixed SELECT policy
  - Add management full access (own org only)
  - Add admin full access (all orgs)
  - Add read-only SELECT for all org members (same behaviour the old SELECT policy had,
    minus the stale system_admin role)

  All other roles have no access to either table.
  Service role bypasses RLS entirely.
*/

-- ── subscription_payments ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "subscription_payments_admin_write" ON subscription_payments;
DROP POLICY IF EXISTS "subscription_payments_mgmt_read"   ON subscription_payments;

CREATE POLICY "subscription_payments_mgmt_own_org"
  ON subscription_payments
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'management'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'management'
    )
  );

CREATE POLICY "subscription_payments_admin_all"
  ON subscription_payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── organization_subscriptions ────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can manage organization subscriptions"  ON organization_subscriptions;
DROP POLICY IF EXISTS "Users can view their organization subscriptions" ON organization_subscriptions;

-- Management: full access to their own org's subscription rows
CREATE POLICY "org_subscriptions_mgmt_own_org"
  ON organization_subscriptions
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'management'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'management'
    )
  );

-- Admin: full access across all orgs
CREATE POLICY "org_subscriptions_admin_all"
  ON organization_subscriptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- All org members: read-only view of their own org's subscription
CREATE POLICY "org_subscriptions_members_read"
  ON organization_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );
