# User Access Security Policy

## Management Dashboard User Visibility

### Security Requirement
**CRITICAL**: For security and accountability reasons, ALL management-level dashboards MUST display complete information about every user who has access to the organization's data and systems.

### Why This Is Important

1. **Security Transparency**: Management must know exactly who has access to sensitive organizational data
2. **Accountability**: Clear visibility of all users and their roles prevents unauthorized access
3. **Audit Trail**: Provides clear documentation of who has what level of access
4. **Compliance**: Meets regulatory requirements for access control and monitoring
5. **Risk Management**: Enables quick identification and removal of unauthorized or unnecessary access

## Three Management Dashboard Levels

### 1. System Administrator Dashboard (`/admin/dashboard`)
**Access**: System administrators with `role='admin'` and `organization_id=NULL`

**User Visibility**:
- Displays ALL users across ALL organizations in the entire system
- Shows exact count: "User Management (X Users)"
- Table columns: Name, Email, Position, Role, Organization, Account Status, Subscription, Actions
- Can view and manage any user in the system

**Purpose**: Global system oversight and management

### 2. Organization Management Dashboard (`/dashboard/management`)
**Access**: Organization-level managers with roles:
- `management`
- `senior_partner`
- `partner`
- First 5 clients in organization (early access)

**User Visibility**:
- Displays ALL users within their specific organization only
- Shows exact count: "Organization Users (X User/Users)"
- Display format: Card-based view with Name, Email, Position, Role badge
- Shows WHY each user has access through their position field

**Purpose**: Organization-level user oversight and team management

### 3. Compliance Officer Dashboard (`/dashboard/compliance`)
**Access**: Compliance officers with `role='compliance_officer'`

**User Visibility**:
- Displays ALL users within their organization
- Shows exact count: "Organization Team (X User/Users)"
- Display format: Scrollable card view with Name, Email, Position, Role badge
- Enables compliance officers to monitor who has access to sensitive compliance data

**Purpose**: Compliance monitoring and audit support

## Current Test Users - Bower & Associates

### Active Users with Access

| User | Email | Role | Position | Access Level | Reason for Access |
|------|-------|------|----------|--------------|-------------------|
| Jack Bower | jb@gmail.com | management | Senior Partner - Management Access | Full Management Dashboard | Senior partner with management authority |
| Anna Schmitz | as@gmail.com | management | Partner - Management Access | Full Management Dashboard | Partner with management authority |
| John D. Doe | jdd@gmail.com | management | Partner - Management Access | Full Management Dashboard | Partner with management authority |
| Juma Ally | jumaa@gmail.com | staff | Legal Staff - Standard Access | Staff Dashboard Only | Standard legal staff member |
| John Doe | jd@gmail.com | compliance_officer | Compliance Officer - Compliance Access | Compliance Dashboard | AML/CFT compliance monitoring |

### Security Notes

1. **Management Users (3)**: Jack Bower, Anna Schmitz, and John D. Doe all have management roles and can:
   - View all organization data
   - Manage users and permissions
   - Approve role upgrade requests
   - Access sensitive business information

2. **Staff User (1)**: Juma Ally has standard staff access:
   - Cannot access management features
   - Limited to staff dashboard
   - Cannot view other users' sensitive data

3. **Compliance Officer (1)**: John Doe has compliance-specific access:
   - Can view all users for compliance monitoring
   - Access to AML/CFT data and reports
   - Cannot modify user permissions

## Access Verification Checklist

For security compliance, management should regularly verify:

- [ ] Total number of users with access
- [ ] Each user's full name and email
- [ ] Each user's position and role
- [ ] Reason why each user has access
- [ ] When each user was granted access
- [ ] Last activity date for each user
- [ ] Any inactive accounts that should be disabled

## Recommended Security Actions

1. **Regular Review**: Review user access list monthly
2. **Position Updates**: Ensure all users have clear position descriptions explaining their access
3. **Access Removal**: Immediately remove access for users who leave the organization
4. **Role Verification**: Verify that each user's role matches their actual job function
5. **Audit Logging**: Monitor the audit logs for unusual access patterns

## Database Verification

To verify current users at any time:

```sql
-- View all users in an organization with their access reasons
SELECT
  up.full_name,
  up.email,
  up.role,
  up.position,
  up.is_active,
  up.created_at,
  o.name as organization
FROM user_profiles up
LEFT JOIN organizations o ON o.id = up.organization_id
WHERE o.name LIKE 'Bower & Associates%'
ORDER BY up.role, up.full_name;
```

## Emergency Access Removal

If unauthorized access is detected:

```sql
-- Immediately suspend a user
UPDATE user_profiles
SET is_active = false,
    suspension_reason = 'Unauthorized access detected - immediate suspension'
WHERE email = 'suspicious@email.com';
```

## Compliance Statement

This system is designed to meet regulatory requirements for:
- Know Your Customer (KYC) processes
- Anti-Money Laundering (AML) regulations
- Customer Due Diligence (CDD) requirements
- Data protection and privacy laws

All user access must be justified, documented, and regularly reviewed to maintain compliance.

---

**Last Updated**: 2026-02-22
**Policy Owner**: System Administrator
**Review Frequency**: Monthly
