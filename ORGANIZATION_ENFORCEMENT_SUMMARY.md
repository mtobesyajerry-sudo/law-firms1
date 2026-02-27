# Organization Enforcement - Quick Reference

## System Changes Implemented

### Database Rules (Enforced at DB Level)

✅ **Admins MUST have `organization_id = NULL`**
- They work across ALL organizations
- Global system access

✅ **Non-admins MUST have a valid `organization_id`**
- Staff, Management, Compliance Officers, Clients
- Confined to their organization's data only

### What Happens Now

#### ✓ For Admin Users (System Administrators)
- `organization_id` is always `NULL`
- See ALL data across ALL organizations
- Default dashboard: System Administration Dashboard (`/admin/dashboard`)
- Can manage users, organizations, assessments globally

#### ✓ For Non-Admin Users
- MUST have `organization_id` assigned
- Can ONLY see data from their organization
- Cannot access data from other organizations
- Attempting to work without organization = ERROR

### Enforcement Mechanisms

1. **CHECK Constraint**
   - Database rejects invalid organization assignments
   - Cannot save admin with organization_id
   - Cannot save non-admin without organization_id

2. **Trigger Function**
   - Validates on every INSERT/UPDATE
   - Provides clear error messages

3. **RLS Policies**
   - Admins: Read/write ALL organizations
   - Non-admins: Read/write ONLY their organization
   - Automatic filtering based on `organization_id`

### Validation Functions Available

```sql
-- Check if user can access dashboards
SELECT can_access_dashboard();

-- Get full dashboard access info
SELECT * FROM get_user_dashboard_info();

-- Check organization requirement
SELECT must_have_organization();

-- Get human-readable status
SELECT get_organization_requirement_message();
```

### Example Scenarios

#### ❌ REJECTED: Admin with Organization
```sql
-- This will FAIL with error
INSERT INTO user_profiles (email, role, organization_id)
VALUES ('admin@test.com', 'admin', '[some-org-id]');
-- Error: "Admin users cannot be assigned to an organization"
```

#### ❌ REJECTED: Staff without Organization
```sql
-- This will FAIL with error
INSERT INTO user_profiles (email, role, organization_id)
VALUES ('staff@test.com', 'staff', NULL);
-- Error: "Non-admin users must be assigned to an organization"
```

#### ✅ ACCEPTED: Admin without Organization
```sql
-- This will SUCCEED
INSERT INTO user_profiles (email, role, organization_id)
VALUES ('admin@test.com', 'admin', NULL);
```

#### ✅ ACCEPTED: Staff with Organization
```sql
-- This will SUCCEED
INSERT INTO user_profiles (email, role, organization_id)
VALUES ('staff@test.com', 'staff', '[org-id]');
```

### Current System Status

All 8 users in the system comply with these rules:
- 1 admin with `NULL` organization_id ✓
- 7 non-admins with valid organization_id ✓

### Key Benefits

1. **Data Isolation**: Each organization's data is isolated
2. **Security**: Cannot accidentally access wrong organization
3. **Clarity**: Clear separation between global admin and organization users
4. **Automatic**: Database enforces rules automatically
5. **Scalable**: Supports unlimited organizations with proper isolation

### Migration Files

1. `enforce_organization_requirement_for_non_admins.sql`
   - Constraint and trigger
   - Updated RLS policies

2. `add_organization_validation_for_dashboards.sql`
   - Helper validation functions
   - User-friendly status checks

### Testing Validation

```sql
-- See all users and their compliance status
SELECT
  email,
  role,
  organization_id,
  CASE
    WHEN role = 'admin' AND organization_id IS NULL THEN '✓ VALID'
    WHEN role != 'admin' AND organization_id IS NOT NULL THEN '✓ VALID'
    ELSE '✗ INVALID'
  END as status
FROM user_profiles;
```

## Result

The System Administration Dashboard is now the only dashboard that operates without an organization context. All other dashboards require and enforce organization assignment, ensuring proper data isolation and security.
