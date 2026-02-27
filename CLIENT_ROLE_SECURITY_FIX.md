# Client Role Access Security Fix

## Issue Identified

A critical security vulnerability was discovered where users assigned the `client` role but placed within an organization could potentially access management, staff, and compliance dashboards and data that should be restricted to internal staff only.

## Root Cause

The system was checking if a user belonged to an organization but **not properly validating their role** before granting access to sensitive features:

1. **Frontend Access Control**: The `ClientDashboard.jsx` component checked role-based access but didn't explicitly exclude `client` role
2. **Route Protection**: The `App.jsx` routing logic didn't have explicit client role blocking
3. **Database RLS Policies**: Database row-level security policies allowed any authenticated user in an organization to view sensitive data (matters, KYC clients, documents)

## Security Implications

Without this fix, a malicious user could:
- Create a client account
- Be assigned to an organization (legitimately or through social engineering)
- Access sensitive client information, matter details, and compliance data
- View other clients' KYC documents and risk assessments
- Access STR (Suspicious Transaction Report) drafts

## Fix Implementation

### 1. Frontend Access Control (ClientDashboard.jsx)

**BEFORE:**
```javascript
const hasManagementAccess = profile?.role === 'admin' || profile?.role === 'management';
const hasStaffAccess = profile?.role === 'admin' || profile?.role === 'staff' || profile?.role === 'lawyer';
const hasComplianceAccess = profile?.role === 'admin' || profile?.role === 'compliance_officer' || profile?.role === 'mlro';
```

**AFTER:**
```javascript
// Management: Only admin, management, and senior_partner roles
const hasManagementAccess = profile?.role === 'admin' || profile?.role === 'management' || profile?.role === 'senior_partner';

// Staff: Only admin, staff, and lawyer roles (NOT client)
const hasStaffAccess = (profile?.role === 'admin' || profile?.role === 'staff' || profile?.role === 'lawyer') && profile?.role !== 'client';

// Compliance: Only admin, compliance_officer, and mlro roles (NOT client)
const hasComplianceAccess = (profile?.role === 'admin' || profile?.role === 'compliance_officer' || profile?.role === 'mlro') && profile?.role !== 'client';
```

### 2. Route Protection (App.jsx)

**BEFORE:**
```javascript
if (managementOnly && !(profile?.role === 'admin' || profile?.role === 'management')) {
  return <Navigate to="/client/dashboard" replace />;
}
```

**AFTER (with correct parentheses for proper operator precedence):**
```javascript
// Management access: ONLY admin, management, and senior_partner (NOT client)
if (managementOnly && (!(profile?.role === 'admin' || profile?.role === 'management' || profile?.role === 'senior_partner') || profile?.role === 'client')) {
  return <Navigate to="/client/dashboard" replace />;
}

// Staff access: ONLY admin, staff, and lawyer (NOT client)
if (staffOnly && (!(profile?.role === 'admin' || profile?.role === 'staff' || profile?.role === 'lawyer') || profile?.role === 'client')) {
  return <Navigate to="/client/dashboard" replace />;
}

// Compliance access: ONLY admin, compliance_officer, and mlro (NOT client)
if (complianceOnly && (!(profile?.role === 'admin' || profile?.role === 'compliance_officer' || profile?.role === 'mlro') || profile?.role === 'client')) {
  return <Navigate to="/client/dashboard" replace />;
}
```

**Note:** Proper parentheses are critical! The condition only applies when the specific route guard (managementOnly, staffOnly, complianceOnly) is active.

### 3. Database RLS Policies

Created migration: `fix_client_role_access_restrictions.sql`

**Key Changes:**

#### Matters Table
- Changed policy from "Users can view matters in their organization" to "Staff can view matters in their organization"
- Explicitly requires role to be in: `('lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer')`
- **Excludes client role completely**

#### KYC Clients Table
- Changed policy from "Users can view clients in their organization" to "Staff can view clients in their organization"
- Explicitly requires role to be in: `('lawyer', 'mlro', 'senior_partner', 'management', 'staff', 'compliance_officer')`
- **Excludes client role completely**

#### Assessments Table
- Added new policy: "Clients can view own assessments"
- Clients can ONLY view assessments they created themselves
- Cannot view other assessments in the organization

#### Client Documents Table
- Changed to "Staff can view documents in their organization"
- Clients cannot access any client documents (including their own in this context)

#### STR Drafts Table
- Changed to "MLRO and compliance can view STR drafts"
- Restricted to: `('mlro', 'compliance_officer', 'senior_partner', 'management', 'admin')`
- **Even lawyers cannot access STR drafts** (proper need-to-know principle)

#### Conflict Checks Table
- Changed to "Staff can view conflict checks in organization"
- Restricted to staff roles only

## Role Definitions

### Client Role (`client`)
- **Purpose**: End-user clients of the law firm
- **Access**: Only their own assessments
- **Cannot Access**: Matters, other clients, KYC data, compliance reports, STR drafts

### Staff Roles (Internal Team)
- **Lawyer**: Can manage matters, clients, and conduct KYC
- **Compliance Officer**: Can view compliance data, manage risk assessments
- **MLRO** (Money Laundering Reporting Officer): Full compliance access including STR drafts
- **Senior Partner**: Management oversight, can approve high-risk matters
- **Management**: Strategic oversight and analytics
- **Staff**: General operational access

### Admin Role (`admin`)
- **Purpose**: System administrators
- **Access**: Full system access including user management

## Testing Verification

1. **Client Role Test**:
   - Login as user with `client` role
   - Verify cannot see "Management", "Staff", or "Compliance" dashboard sections
   - Verify direct URL navigation to `/dashboard/management` redirects to `/client/dashboard`
   - Verify database queries return no matters, clients, or documents

2. **Lawyer Role Test**:
   - Login as user with `lawyer` role
   - Verify CAN see "Staff" dashboard section
   - Verify CAN access matters and clients
   - Verify CANNOT see "Management" section (unless also has that role)

3. **Organization Assignment Test**:
   - Create client user and assign to organization
   - Verify they still cannot access staff features
   - Confirms organization assignment alone doesn't grant privileges

## Security Principles Applied

1. **Principle of Least Privilege**: Users only get access to what they absolutely need
2. **Defense in Depth**: Protection at multiple layers (frontend, routing, database)
3. **Explicit Deny**: Explicitly block client role rather than relying on omission
4. **Need to Know**: Even staff roles have differentiated access (e.g., lawyers can't see STR drafts)
5. **Zero Trust**: Organization membership doesn't automatically grant data access

## Migration Applied

Database migration: `fix_client_role_access_restrictions.sql`
- Date: 2026-02-22
- Status: Applied successfully
- Impact: All existing RLS policies updated to enforce role restrictions

## Files Modified

1. `/src/components/ClientDashboard.jsx` - Access control logic
2. `/src/App.jsx` - Route protection
3. `/supabase/migrations/[timestamp]_fix_client_role_access_restrictions.sql` - Database policies

## Recommendation

Going forward, when creating new features:
1. Always explicitly check `role !== 'client'` when granting staff access
2. Create separate policies for each role category
3. Test access control with accounts of different roles
4. Document role requirements for each feature
