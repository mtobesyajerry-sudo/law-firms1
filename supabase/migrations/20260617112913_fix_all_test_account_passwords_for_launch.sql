/*
  # Fix all test account credentials for launch

  - Resets passwords on accounts whose passwords are unknown (created via approval flow)
  - Clears password_change_required = true flags on Bower & Associates test users
  - Does NOT touch production LawAge Advocates accounts
*/

-- Bower & Associates — clear force-change flags so login works immediately
UPDATE user_profiles SET password_change_required = false
WHERE email IN (
  'jb@bowerassociates',
  'as@bowerassociates.co.tz',
  'jdd@bowerassociates.co.tz',
  'sarah@bowerassociates.co.tz'
);

-- smoke-test@iuris-peritis.co.tz → SmokeTest@2026!
UPDATE auth.users
SET encrypted_password = crypt('SmokeTest@2026!', gen_salt('bf')), updated_at = now()
WHERE email = 'smoke-test@iuris-peritis.co.tz';

UPDATE user_profiles SET password_change_required = false
WHERE email = 'smoke-test@iuris-peritis.co.tz';

-- trial-flow-test@iuris-peritis.co.tz → TrialFlow@2026!
UPDATE auth.users
SET encrypted_password = crypt('TrialFlow@2026!', gen_salt('bf')), updated_at = now()
WHERE email = 'trial-flow-test@iuris-peritis.co.tz';

UPDATE user_profiles SET password_change_required = false
WHERE email = 'trial-flow-test@iuris-peritis.co.tz';

-- info@trialtest.com → TrialTest@2026!
UPDATE auth.users
SET encrypted_password = crypt('TrialTest@2026!', gen_salt('bf')), updated_at = now()
WHERE email = 'info@trialtest.com';

UPDATE user_profiles SET password_change_required = false
WHERE email = 'info@trialtest.com';

-- testaccountant2026@mailtest.com → Accountant@2026!
UPDATE auth.users
SET encrypted_password = crypt('Accountant@2026!', gen_salt('bf')), updated_at = now()
WHERE email = 'testaccountant2026@mailtest.com';

UPDATE user_profiles SET password_change_required = false
WHERE email = 'testaccountant2026@mailtest.com';

-- testinsurer2026@mailtest.com → Insurer@2026!
UPDATE auth.users
SET encrypted_password = crypt('Insurer@2026!', gen_salt('bf')), updated_at = now()
WHERE email = 'testinsurer2026@mailtest.com';

UPDATE user_profiles SET password_change_required = false
WHERE email = 'testinsurer2026@mailtest.com';
