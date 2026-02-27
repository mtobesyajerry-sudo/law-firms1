# Organization Requirement Enforcement

## Overview

This document describes the organization assignment requirements and enforcement mechanisms implemented in the system.

## Business Rules

### System Administrator (Admin Role)
- **Organization Assignment**: MUST have `organization_id = NULL`
- **Access Scope**: Global access to all organizations and data across the entire system
- **Dashboard**: System Administration Dashboard (`/admin/dashboard`)
- **Purpose**: Manages the entire system, all organizations, and all users

### All Other Roles (Non-Admin)
- **Organization Assignment**: MUST have a valid `organization_id`
- **Access Scope**: Limited to data within their assigned organization only
- **Dashboards**: Organization-specific dashboards
  - Management: `/dashboard/management`
  - Staff: `/dashboard/staff`
  - Compliance Officer: `/dashboard/compliance`
  - Client: `/client/dashboard`
- **Purpose**: Work within a specific organization's context

## Database Enforcement

### CHECK Constraint
```sql
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_organization_requirement
CHECK (
  (role = 'admin' AND organization_id IS NULL) OR
  (role != 'admin' AND organization_id IS NOT NULL)
);
```

This constraint ensures:
- Admin users cannot be assigned to an organization
- Non-admin users must be assigned to an organization
- Database will reject any INSERT/UPDATE that violates this rule

### Trigger Function
```sql
CREATE FUNCTION validate_organization_assignment()
```

This trigger:
- Runs on every INSERT and UPDATE to `user_profiles`
- Validates organization assignment rules
- Provides clear error messages when rules are violated

### Row Level Security (RLS) Policies

All data tables enforce organization-based access:

#### SELECT Policies
- **Admins**: Can view ALL records across ALL organizations
- **Non-admins**: Can ONLY view records from their own organization

#### INSERT/UPDATE/DELETE Policies
- **Admins**: Can modify records for ANY organization
- **Non-admins**: Can ONLY modify records within their own organization

## Helper Functions

### `can_access_dashboard()`
Returns `TRUE` if the current user can access dashboards:
- Admins: Always `TRUE`
- Non-admins with organization: `TRUE`
- Non-admins without organization: `FALSE`

### `get_user_dashboard_info()`
Returns comprehensive dashboard access information:
- User role
- Organization ID and name
- Access status (can/cannot access)
- Human-readable access message

### `must_have_organization()`
Validates organization requirement for operations:
- Admins: `TRUE` (no organization needed)
- Non-admins with organization: `TRUE`
- Non-admins without organization: `FALSE`

### `get_organization_requirement_message()`
Returns human-readable message about organization status:
- Admins: "System Administrator - Global access to all organizations"
- Non-admins with org: "Organization: [Organization Name]"
- Non-admins without org: "ERROR: No organization assigned..."

## Current System Status

All users in the system currently comply with these rules:
- 1 admin user with `organization_id = NULL`
- 7 non-admin users with valid `organization_id` assignments

## Impact on User Experience

### For Admins
- No change - admins continue to have global access
- Default dashboard: System Administration Dashboard
- Can manage all organizations and users

### For Non-Admins
- Must have organization assigned to access system features
- Can only see and modify data within their organization
- Clear error messages if organization not assigned
- Dashboard access restricted to organization-specific data

## Error Messages

### Database-Level Errors
- **Admin with organization**: "Admin users cannot be assigned to an organization. They have global system access."
- **Non-admin without organization**: "Non-admin users must be assigned to an organization. Role: [role_name]"

### Application-Level Messages
- **No organization assigned**: "Access denied: No organization assigned. Please contact your system administrator."
- **Invalid access attempt**: "You cannot access data outside your organization."

## Migration Files

1. `enforce_organization_requirement_for_non_admins.sql`
   - Adds CHECK constraint
   - Creates validation trigger
   - Updates RLS policies

2. `add_organization_validation_for_dashboards.sql`
   - Adds dashboard access validation functions
   - Creates user-friendly status functions

## Testing

To verify a user's organization status:
```sql
SELECT * FROM get_user_dashboard_info();
```

To check if current user meets organization requirements:
```sql
SELECT must_have_organization();
```

To get a status message:
```sql
SELECT get_organization_requirement_message();
```

## Maintenance

### Adding New Users

#### Adding Admin Users
```sql
-- Admins MUST have organization_id = NULL
INSERT INTO user_profiles (id, email, role, organization_id)
VALUES ('[uuid]', 'admin@example.com', 'admin', NULL);
```

#### Adding Non-Admin Users
```sql
-- Non-admins MUST have a valid organization_id
INSERT INTO user_profiles (id, email, role, organization_id)
VALUES ('[uuid]', 'user@example.com', 'staff', '[org_uuid]');
```

### Converting User Roles

#### Making a User Admin (Global Access)
```sql
-- Remove organization assignment when promoting to admin
UPDATE user_profiles
SET role = 'admin', organization_id = NULL
WHERE id = '[user_uuid]';
```

#### Demoting Admin to Regular User
```sql
-- MUST assign organization when demoting from admin
UPDATE user_profiles
SET role = 'staff', organization_id = '[org_uuid]'
WHERE id = '[user_uuid]';
```

## Security Benefits

1. **Data Isolation**: Organizations cannot access each other's data
2. **Clear Access Control**: Role-based access tied to organization context
3. **Audit Trail**: Clear organization assignment in all records
4. **Error Prevention**: Database enforces rules, prevents invalid states
5. **Scalability**: System supports multiple organizations with proper isolation

## Notes

- The constraint and triggers prevent invalid data at the database level
- RLS policies enforce access control at the query level
- Helper functions provide application-level validation
- All three layers work together for comprehensive security
