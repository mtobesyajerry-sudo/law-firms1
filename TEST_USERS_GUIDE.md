# Test Users Guide

## Overview
Six test users are now available for testing different roles and access levels in the system. All users are part of the Bower & Associates organization.

## Test User Credentials

All users have the same password: **password123**

### 1. Jack Bower (Management)
- **Email**: `jb@gmail.com`
- **Role**: Management
- **Access**: Management Dashboard
- **Session ID**: `jack`
- **Color**: Blue (#3b82f6)
- **Purpose**: Test management features and dual approval as approver

### 2. Anna Schmitz (Management)
- **Email**: `as@gmail.com`
- **Role**: Management
- **Access**: Management Dashboard
- **Session ID**: `anna`
- **Color**: Green (#10b981)
- **Purpose**: Test management features and dual approval as approver

### 3. John D. Doe (Management)
- **Email**: `jdd@gmail.com`
- **Role**: Management
- **Access**: Management Dashboard
- **Session ID**: `john`
- **Color**: Orange (#f59e0b)
- **Purpose**: Test management features and dual approval as approver

### 4. Juma Ally (Staff)
- **Email**: `jumaa@gmail.com`
- **Role**: Staff
- **Access**: Staff Dashboard
- **Session ID**: `juma`
- **Color**: Purple (#8b5cf6)
- **Purpose**: Test standard staff dashboard access (no approval rights)

### 5. John Doe (Compliance Officer)
- **Email**: `jd@gmail.com`
- **Role**: Compliance Officer
- **Access**: Compliance Officer Dashboard
- **Session ID**: `johndoe`
- **Color**: Pink (#ec4899)
- **Purpose**: Test compliance officer dashboard and features

### 6. Sarah John (Staff)
- **Email**: `sarah@bowerassociates.com`
- **Role**: Staff
- **Access**: Staff Dashboard
- **Session ID**: `sarah`
- **Color**: Teal (#14b8a6)
- **Purpose**: Test additional staff user dashboard access

## Access Matrix

| User | Management | Staff | Compliance | Can Approve Roles |
|------|-----------|-------|------------|------------------|
| Jack Bower | ✓ | - | - | ✓ |
| Anna Schmitz | ✓ | - | - | ✓ |
| John D. Doe | ✓ | - | - | ✓ |
| Juma Ally | - | ✓ | - | - |
| John Doe | - | - | ✓ | - |
| Sarah John | - | ✓ | - | - |

## How to Use the Session Switcher

### Quick Start
1. Click the "Testing as:" button in the bottom-right corner
2. Click "🚀 Open All Test Users in New Tabs"
3. Six tabs will open, each with a different session ID
4. Log in each tab with the respective user credentials
5. All passwords are: **password123**

### Manual Switching
You can also switch sessions manually:
- Click any user in the session switcher to switch in the current tab
- Click the ↗ button to open that user in a new tab
- Use URL parameters: `?session=jack`, `?session=anna`, etc.

## Testing Scenarios

### Scenario 1: Dual Approval Workflow
**Users**: Jack, Anna, John D. Doe (all Management)

1. Open three tabs (Jack, Anna, John)
2. Log in all three users (all have management/approval rights)
3. Have Juma Ally request a role upgrade
4. In Jack's tab, approve the request (1 of 2)
5. Try to approve again in Jack's tab (should be blocked)
6. In Anna's tab, approve the request (2 of 2)
7. Verify the role upgrade is completed

### Scenario 2: Staff Dashboard Access
**Users**: Juma Ally

1. Login as Juma Ally
2. Should be routed to `/dashboard/staff`
3. Test staff-specific features
4. Verify cannot access management features

### Scenario 3: Compliance Officer Dashboard
**Users**: John Doe (Compliance)

1. Login as John Doe
2. Should be routed to `/dashboard/compliance`
3. Test compliance officer features
4. Verify STR alerts, monitoring, and reporting features

### Scenario 4: Multi-User Collaboration
**Users**: All six users

1. Open all six tabs
2. Login all users
3. Create activities in different tabs
4. Verify real-time updates across sessions
5. Test permission boundaries between roles

## URLs for Direct Access

Use these URLs to directly open specific user sessions:
- Jack: `http://localhost:5173/?session=jack`
- Anna: `http://localhost:5173/?session=anna`
- John D. Doe: `http://localhost:5173/?session=john`
- Juma Ally: `http://localhost:5173/?session=juma`
- John Doe: `http://localhost:5173/?session=johndoe`
- Sarah John: `http://localhost:5173/?session=sarah`

## Role-Specific Features

### Management Role (Jack, Anna, John D. Doe)
- View all organization assessments
- Manage users and permissions
- Approve role upgrade requests
- Access management dashboard
- View organization analytics

### Staff Role (Juma, Sarah)
- Create and manage assessments
- View assigned clients
- Upload documents
- Standard staff dashboard access

### Compliance Officer Role (John Doe)
- Review STR alerts
- Monitor transactions
- Generate compliance reports
- Access FIU reporting tools
- Review and approve compliance documents

## Database Verification

You can verify user setup in the database:

```sql
-- Check all test users
SELECT id, email, full_name, role, organization_id
FROM user_profiles
WHERE email IN (
  'jb@gmail.com',
  'as@gmail.com',
  'jdd@gmail.com',
  'jumaa@gmail.com',
  'jd@gmail.com',
  'sarah@bowerassociates.com'
)
ORDER BY role, email;

-- Check user roles
SELECT
  up.full_name,
  up.email,
  up.role,
  CASE
    WHEN oua.id IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_management_access
FROM user_profiles up
LEFT JOIN organization_user_access oua ON oua.user_id = up.id AND oua.is_active = true
WHERE up.organization_id = (
  SELECT id FROM organizations WHERE name LIKE 'Bower & Associates%'
)
ORDER BY up.role, up.full_name;
```

## Troubleshooting

### Cannot login
- Verify password is exactly: `password123`
- Check user exists in database
- Ensure email is correct (case-sensitive)

### Wrong dashboard showing
- Check user's role in database
- Verify routing logic in App.jsx
- Clear browser cache and localStorage

### Cannot access certain features
- Verify user has correct role
- Check RLS policies for the table
- Ensure organization_id matches

### Session not switching
- Clear localStorage for the session key
- Hard refresh the browser (Ctrl+Shift+R)
- Check URL parameter is correct

## Clean Up Test Data

To reset test data between testing sessions:

```sql
-- Delete test role upgrade requests
DELETE FROM role_upgrade_requests
WHERE organization_id = (
  SELECT id FROM organizations WHERE name LIKE 'Bower & Associates%'
);

-- Reset user roles if needed (example)
UPDATE user_profiles
SET role = 'staff'
WHERE email = 'jumaa@gmail.com';
```

## Security Note

These are test users with demo passwords. In production:
- All users must change password on first login
- Passwords should meet complexity requirements
- Multi-factor authentication should be enabled
- Regular security audits should be performed
