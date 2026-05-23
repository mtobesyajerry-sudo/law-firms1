/*
  # Expand user_role_permissions role constraint and seed management + staff

  The user_role_permissions table had a check constraint limiting roles to only
  5 values. This expands it to include all 7 assignable non-admin roles so that
  management and staff can be seeded to match what RLS policies actually grant them.
*/

-- Expand the role check constraint
ALTER TABLE user_role_permissions
  DROP CONSTRAINT IF EXISTS user_role_permissions_role_check;

ALTER TABLE user_role_permissions
  ADD CONSTRAINT user_role_permissions_role_check
  CHECK (role = ANY (ARRAY[
    'admin', 'management', 'senior_partner', 'staff', 'lawyer',
    'compliance_officer', 'mlro', 'client'
  ]));

-- Seed management: read-only oversight across all key areas
INSERT INTO user_role_permissions
  (role, permission_name, permission_category, can_create, can_read, can_update, can_delete)
VALUES
  ('management', 'clients',      'client_management', false, true,  false, false),
  ('management', 'matters',      'matter_management',  false, true,  false, false),
  ('management', 'assessments',  'risk_assessment',    false, true,  false, false),
  ('management', 'reports',      'reporting',          false, true,  false, false),
  ('management', 'users',        'user_management',    false, true,  false, false)
ON CONFLICT (role, permission_name) DO NOTHING;

-- Seed staff: operational CRUD on clients, matters; read-only on assessments/reports
INSERT INTO user_role_permissions
  (role, permission_name, permission_category, can_create, can_read, can_update, can_delete)
VALUES
  ('staff', 'clients',      'client_management', true,  true,  true,  false),
  ('staff', 'matters',      'matter_management',  true,  true,  true,  false),
  ('staff', 'assessments',  'risk_assessment',    false, true,  true,  false),
  ('staff', 'reports',      'reporting',          false, true,  false, false)
ON CONFLICT (role, permission_name) DO NOTHING;
