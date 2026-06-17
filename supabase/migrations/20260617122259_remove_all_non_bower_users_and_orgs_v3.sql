/*
  Remove all users except Bower & Associates test users and the system admin.
*/

-- Null out FK references in subscription_payments for users being deleted
UPDATE subscription_payments
SET initiated_by = NULL
WHERE initiated_by IN (
  SELECT id FROM auth.users WHERE email IN (
    'smoke-test@iuris-peritis.co.tz',
    'trial-flow-test@iuris-peritis.co.tz',
    'info@trialtest.com',
    'testaccountant2026@mailtest.com',
    'testinsurer2026@mailtest.com',
    'derickolotu65@gmail.com',
    'info@lawage.co.tz',
    'stephenm@lawage.co.tz'
  )
);

-- Delete from auth.users (cascades to user_profiles, identities, sessions)
DELETE FROM auth.users
WHERE email IN (
  'smoke-test@iuris-peritis.co.tz',
  'trial-flow-test@iuris-peritis.co.tz',
  'info@trialtest.com',
  'testaccountant2026@mailtest.com',
  'testinsurer2026@mailtest.com',
  'derickolotu65@gmail.com',
  'info@lawage.co.tz',
  'stephenm@lawage.co.tz'
);

-- Clean up any orphan user_profiles not caught by cascade
DELETE FROM user_profiles
WHERE email IN (
  'smoke-test@iuris-peritis.co.tz',
  'trial-flow-test@iuris-peritis.co.tz',
  'info@trialtest.com',
  'testaccountant2026@mailtest.com',
  'testinsurer2026@mailtest.com',
  'derickolotu65@gmail.com',
  'info@lawage.co.tz',
  'stephenm@lawage.co.tz',
  'sarah.john@smithlegal.co.tz'
);

-- Delete organization_subscriptions for the orgs being removed
DELETE FROM organization_subscriptions
WHERE organization_id IN (
  '2ae6c5da-474c-4021-bd5e-073731aa9865',
  '198372c7-41d6-490d-9fd9-aa254709268f',
  '7fa55cd7-d891-49fb-860a-a4a97146c41a',
  '29a7b48a-6aa2-4903-ac79-9dae51315709',
  '8147d56a-c932-48ac-8b93-9c4ca88f621c',
  '4efb6ad8-d373-48fc-88de-f125f6e0bd19'
);

-- Delete subscription_payments for those orgs
DELETE FROM subscription_payments
WHERE organization_id IN (
  '2ae6c5da-474c-4021-bd5e-073731aa9865',
  '198372c7-41d6-490d-9fd9-aa254709268f',
  '7fa55cd7-d891-49fb-860a-a4a97146c41a',
  '29a7b48a-6aa2-4903-ac79-9dae51315709',
  '8147d56a-c932-48ac-8b93-9c4ca88f621c',
  '4efb6ad8-d373-48fc-88de-f125f6e0bd19'
);

-- Delete the now-empty organizations
DELETE FROM organizations
WHERE id IN (
  '2ae6c5da-474c-4021-bd5e-073731aa9865',
  '198372c7-41d6-490d-9fd9-aa254709268f',
  '7fa55cd7-d891-49fb-860a-a4a97146c41a',
  '29a7b48a-6aa2-4903-ac79-9dae51315709',
  '8147d56a-c932-48ac-8b93-9c4ca88f621c',
  '4efb6ad8-d373-48fc-88de-f125f6e0bd19'
);

-- Catch any remaining orphan orgs (from failed approval retries)
DELETE FROM organizations
WHERE id NOT IN (
  SELECT DISTINCT organization_id FROM user_profiles WHERE organization_id IS NOT NULL
);
