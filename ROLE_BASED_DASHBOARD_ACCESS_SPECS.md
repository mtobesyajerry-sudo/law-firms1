# Role-Based Dashboard Access System Specifications

**Document Version:** 1.0
**Date:** 2026-03-09
**Purpose:** Complete technical specifications for implementing exclusive role-based dashboard access

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Role Definitions](#role-definitions)
3. [Routing Architecture](#routing-architecture)
4. [Access Control Implementation](#access-control-implementation)
5. [Authentication Context](#authentication-context)
6. [Protected Route Component](#protected-route-component)
7. [Automatic Role-Based Redirection](#automatic-role-based-redirection)
8. [Dashboard Component Mapping](#dashboard-component-mapping)
9. [Database Schema](#database-schema)
10. [Implementation Code Examples](#implementation-code-examples)

---

## 1. System Overview

The system implements a **strict role-based access control (RBAC)** mechanism where each user role has access to **only one specific dashboard**. Users cannot access dashboards designed for other roles.

### Key Principles

1. **Exclusive Access**: Each role can only access its designated dashboard
2. **Automatic Routing**: Users are automatically redirected to their appropriate dashboard upon login
3. **Protection at Route Level**: All routes are protected with role validation
4. **Fallback Handling**: Unauthorized access attempts redirect to appropriate location
5. **No Manual Dashboard Selection**: Users don't choose dashboards - the system assigns them based on role

---

## 2. Role Definitions

### Role-to-Dashboard Mapping

```javascript
const ROLE_DASHBOARD_MAPPING = {
  // System Administration
  'admin': '/admin/dashboard',                    // SystemAdminDashboard.jsx

  // Management Roles (Limited to 3 users per organization)
  'management': '/dashboard/management',          // ClientManagementDashboard.jsx
  'senior_partner': '/dashboard/management',      // ClientManagementDashboard.jsx
  'partner': '/dashboard/management',             // ClientManagementDashboard.jsx

  // Operational Staff
  'staff': '/dashboard/staff',                    // StaffDashboard.jsx
  'lawyer': '/dashboard/staff',                   // StaffDashboard.jsx

  // Compliance & Review
  'compliance_officer': '/dashboard/compliance',  // ComplianceOfficerDashboard.jsx
  'mlro': '/dashboard/compliance',                // ComplianceOfficerDashboard.jsx

  // Default/Client (fallback)
  'client': '/client/dashboard'                   // ClientDashboard.jsx (generic view)
};
```

### Role Capabilities

| Role | Dashboard | Create | Edit | Delete | Review | Approve |
|------|-----------|--------|------|--------|--------|---------|
| admin | System Admin | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All |
| management | Client Management | ❌ | ❌ | ❌ | ✅ | ✅ |
| senior_partner | Client Management | ❌ | ❌ | ❌ | ✅ | ✅ |
| partner | Client Management | ❌ | ❌ | ❌ | ✅ | ✅ |
| staff | Staff Dashboard | ✅ | ✅ | ⚠️ Own | ❌ | ❌ |
| lawyer | Staff Dashboard | ✅ | ✅ | ⚠️ Own | ❌ | ❌ |
| compliance_officer | Compliance Dashboard | ❌ | ❌ | ❌ | ✅ | ❌ |
| mlro | Compliance Dashboard | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 3. Routing Architecture

### Route Structure in App.jsx

```javascript
// File: src/App.jsx

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Route */}
      <Route path="/auth" element={user ? <Navigate to="/" /> : <Auth />} />

      {/* Root - Redirects to role-appropriate dashboard */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleBasedRedirect />
          </ProtectedRoute>
        }
      />

      {/* Admin Dashboard - admin ONLY */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute adminOnly={true}>
            <SystemAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Management Dashboard - management/senior_partner/partner ONLY */}
      <Route
        path="/dashboard/management"
        element={
          <ProtectedRoute managementOnly={true}>
            <ClientManagementDashboard />
          </ProtectedRoute>
        }
      />

      {/* Staff Dashboard - staff/lawyer ONLY */}
      <Route
        path="/dashboard/staff"
        element={
          <ProtectedRoute staffOnly={true}>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />

      {/* Compliance Dashboard - compliance_officer/mlro ONLY */}
      <Route
        path="/dashboard/compliance"
        element={
          <ProtectedRoute complianceOnly={true}>
            <ComplianceOfficerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Generic Client Dashboard - Fallback for all authenticated users */}
      <Route
        path="/client/dashboard"
        element={
          <ProtectedRoute>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />

      {/* Shared Routes - Accessible by all authenticated users */}
      <Route path="/assessment/:id" element={<ProtectedRoute><AssessmentForm /></ProtectedRoute>} />
      <Route path="/report/:id" element={<ProtectedRoute><AssessmentReport /></ProtectedRoute>} />
      <Route path="/kyc-client/:clientId" element={<ProtectedRoute><KYCClientDetails /></ProtectedRoute>} />

      {/* Catch-all - Redirect to root */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
```

---

## 4. Access Control Implementation

### ProtectedRoute Component

The `ProtectedRoute` component wraps all protected routes and enforces access control based on role flags.

```javascript
// File: src/App.jsx

function ProtectedRoute({
  children,
  adminOnly = false,
  managementOnly = false,
  staffOnly = false,
  complianceOnly = false
}) {
  const { user, profile, loading, isEarlyClient } = useAuth();

  // Step 1: Wait for authentication state to load
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        color: '#718096'
      }}>
        Loading...
      </div>
    );
  }

  // Step 2: Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" />;
  }

  // Step 3: Block suspended users
  if (profile && !profile.is_active) {
    return <SuspendedAccountScreen profile={profile} />;
  }

  // Step 4: Admin-only route validation
  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/client/dashboard" replace />;
  }

  // Step 5: Management-only route validation
  // Includes: admin, management, senior_partner, partner
  // Also allows "early clients" (first 5 users) - legacy feature
  if (managementOnly && !(
    profile?.role === 'admin' ||
    profile?.role === 'management' ||
    profile?.role === 'senior_partner' ||
    profile?.role === 'partner' ||
    (profile?.role === 'client' && isEarlyClient)
  )) {
    return <Navigate to="/client/dashboard" replace />;
  }

  // Step 6: Staff-only route validation
  // ONLY admin, staff, and lawyer (NOT client)
  if (staffOnly && (
    !(profile?.role === 'admin' || profile?.role === 'staff' || profile?.role === 'lawyer') ||
    profile?.role === 'client'
  )) {
    return <Navigate to="/client/dashboard" replace />;
  }

  // Step 7: Compliance-only route validation
  // ONLY admin, compliance_officer, and mlro (NOT client)
  if (complianceOnly && (
    !(profile?.role === 'admin' || profile?.role === 'compliance_officer' || profile?.role === 'mlro') ||
    profile?.role === 'client'
  )) {
    return <Navigate to="/client/dashboard" replace />;
  }

  // Step 8: All checks passed - render protected content
  return children;
}
```

### Key Security Features

1. **Loading State**: Prevents flash of unauthorized content
2. **Account Status Check**: Blocks suspended users immediately
3. **Hierarchical Validation**: Admin bypasses most restrictions
4. **Explicit Role Checks**: No ambiguous access rules
5. **Fallback Redirect**: Always redirects unauthorized users to safe location

---

## 5. Authentication Context

### AuthContext Structure

The `AuthContext` provides centralized authentication state and user profile data.

```javascript
// File: src/contexts/AuthContext.jsx

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);              // Supabase auth user
  const [profile, setProfile] = useState(null);        // User profile from database
  const [organization, setOrganization] = useState(null); // User's organization
  const [loading, setLoading] = useState(true);        // Authentication loading state
  const [isEarlyClient, setIsEarlyClient] = useState(false); // Legacy feature flag

  // Load user profile from database
  const loadUserProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    setProfile(data);

    // Load organization if user has one
    if (data?.organization_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', data.organization_id)
        .maybeSingle();

      setOrganization(orgData);
    }
  }, []);

  // Initialize authentication state
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  // Context value
  const value = {
    user,              // Supabase auth.users object
    profile,           // user_profiles table data (includes role)
    organization,      // organizations table data
    loading,           // Boolean: is auth state loading?
    isAdmin: profile?.role === 'admin',
    isEarlyClient,
    signIn,
    signOut,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

### Key Profile Fields

```javascript
profile = {
  id: 'uuid',                          // References auth.users(id)
  email: 'user@example.com',
  role: 'staff',                       // CRITICAL: Determines dashboard access
  organization_id: 'uuid',             // References organizations(id)
  full_name: 'John Doe',
  first_name: 'John',
  last_name: 'Doe',
  position: 'Associate Lawyer',
  is_active: true,                     // Account suspension flag
  password_change_required: false,
  created_at: 'timestamp',
  created_by: 'uuid'
};
```

---

## 6. Protected Route Component

### Complete Implementation with Comments

```javascript
/**
 * ProtectedRoute - Wrapper component that enforces role-based access control
 *
 * @param {ReactNode} children - Content to render if access is granted
 * @param {boolean} adminOnly - Restrict to admin role only
 * @param {boolean} managementOnly - Restrict to management roles only
 * @param {boolean} staffOnly - Restrict to staff roles only
 * @param {boolean} complianceOnly - Restrict to compliance roles only
 *
 * @returns {ReactNode} Protected content or redirect
 */
function ProtectedRoute({
  children,
  adminOnly = false,
  managementOnly = false,
  staffOnly = false,
  complianceOnly = false
}) {
  const { user, profile, loading, signOut, isEarlyClient } = useAuth();

  // PHASE 1: LOADING STATE
  // Show loading spinner while authentication state is being determined
  if (loading) {
    return <LoadingScreen />;
  }

  // PHASE 2: AUTHENTICATION CHECK
  // Redirect to login page if user is not authenticated
  if (!user) {
    return <Navigate to="/auth" />;
  }

  // PHASE 3: ACCOUNT STATUS CHECK
  // Block access for suspended users and show suspension notice
  if (profile && !profile.is_active) {
    return <SuspendedAccountScreen profile={profile} signOut={signOut} />;
  }

  // PHASE 4: ROLE-BASED ACCESS CONTROL
  // Check specific role requirements and redirect if not authorized

  // Admin-only routes (e.g., /admin/dashboard)
  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/client/dashboard" replace />;
  }

  // Management-only routes (e.g., /dashboard/management)
  if (managementOnly) {
    const isAuthorized = (
      profile?.role === 'admin' ||
      profile?.role === 'management' ||
      profile?.role === 'senior_partner' ||
      profile?.role === 'partner' ||
      (profile?.role === 'client' && isEarlyClient) // Legacy: first 5 clients
    );

    if (!isAuthorized) {
      return <Navigate to="/client/dashboard" replace />;
    }
  }

  // Staff-only routes (e.g., /dashboard/staff)
  if (staffOnly) {
    const isAuthorized = (
      profile?.role === 'admin' ||
      profile?.role === 'staff' ||
      profile?.role === 'lawyer'
    );

    const isClient = profile?.role === 'client';

    if (!isAuthorized || isClient) {
      return <Navigate to="/client/dashboard" replace />;
    }
  }

  // Compliance-only routes (e.g., /dashboard/compliance)
  if (complianceOnly) {
    const isAuthorized = (
      profile?.role === 'admin' ||
      profile?.role === 'compliance_officer' ||
      profile?.role === 'mlro'
    );

    const isClient = profile?.role === 'client';

    if (!isAuthorized || isClient) {
      return <Navigate to="/client/dashboard" replace />;
    }
  }

  // PHASE 5: ACCESS GRANTED
  // All checks passed - render the protected content
  return children;
}
```

### Security Logic Breakdown

#### Admin Routes
```javascript
if (adminOnly && profile?.role !== 'admin') {
  return <Navigate to="/client/dashboard" replace />;
}
```
- **Rule**: ONLY users with `role='admin'` can access
- **Blocked**: All other roles (management, staff, compliance, client)
- **Redirect**: Fallback to generic client dashboard

#### Management Routes
```javascript
if (managementOnly && !(
  profile?.role === 'admin' ||
  profile?.role === 'management' ||
  profile?.role === 'senior_partner' ||
  profile?.role === 'partner' ||
  (profile?.role === 'client' && isEarlyClient)
)) {
  return <Navigate to="/client/dashboard" replace />;
}
```
- **Allowed**: admin, management, senior_partner, partner, early clients
- **Blocked**: staff, lawyer, compliance_officer, mlro, regular clients
- **Special Case**: `isEarlyClient` allows first 5 registered users (legacy feature)

#### Staff Routes
```javascript
if (staffOnly && (
  !(profile?.role === 'admin' || profile?.role === 'staff' || profile?.role === 'lawyer') ||
  profile?.role === 'client'
)) {
  return <Navigate to="/client/dashboard" replace />;
}
```
- **Allowed**: admin, staff, lawyer
- **Blocked**: management, senior_partner, partner, compliance_officer, mlro, client
- **Explicit Client Block**: Even if user somehow passes first check, clients are explicitly blocked

#### Compliance Routes
```javascript
if (complianceOnly && (
  !(profile?.role === 'admin' || profile?.role === 'compliance_officer' || profile?.role === 'mlro') ||
  profile?.role === 'client'
)) {
  return <Navigate to="/client/dashboard" replace />;
}
```
- **Allowed**: admin, compliance_officer, mlro
- **Blocked**: management, senior_partner, partner, staff, lawyer, client
- **Explicit Client Block**: Ensures no client access even if database role is compromised

---

## 7. Automatic Role-Based Redirection

### RoleBasedRedirect Component

This component automatically routes users to their appropriate dashboard based on their role upon login or when accessing the root URL.

```javascript
// File: src/App.jsx

function RoleBasedRedirect() {
  const { profile, loading } = useAuth();

  // Wait for profile to load
  if (loading) {
    return <LoadingScreen />;
  }

  console.log('=== ROLE BASED REDIRECT ===');
  console.log('Profile:', profile);
  console.log('Role:', profile?.role);

  // Route users to appropriate dashboard based on role
  switch (profile?.role) {
    case 'admin':
      console.log('>>> REDIRECTING TO /admin/dashboard <<<');
      return <Navigate to="/admin/dashboard" replace />;

    case 'management':
    case 'senior_partner':
    case 'partner':
      console.log('>>> REDIRECTING TO /dashboard/management <<<');
      return <Navigate to="/dashboard/management" replace />;

    case 'staff':
    case 'lawyer':
      console.log('>>> REDIRECTING TO /dashboard/staff <<<');
      return <Navigate to="/dashboard/staff" replace />;

    case 'compliance_officer':
    case 'mlro':
      console.log('>>> REDIRECTING TO /dashboard/compliance <<<');
      return <Navigate to="/dashboard/compliance" replace />;

    default:
      console.log('>>> REDIRECTING TO /client/dashboard (default) <<<');
      return <Navigate to="/client/dashboard" replace />;
  }
}
```

### Usage in Routes

```javascript
<Route
  path="/"
  element={
    <ProtectedRoute>
      <RoleBasedRedirect />
    </ProtectedRoute>
  }
/>
```

### Redirect Flow Diagram

```
User Accesses Root URL (/)
         ↓
   ProtectedRoute
         ↓
  Check Authentication
         ↓
   Check is_active
         ↓
  RoleBasedRedirect
         ↓
    Read profile.role
         ↓
    ┌─────────────┐
    │             │
admin│   management│   staff│   compliance│   default
    │             │        │              │
    ↓             ↓        ↓              ↓
/admin/dashboard  /dashboard/management  /dashboard/staff  /dashboard/compliance  /client/dashboard
```

---

## 8. Dashboard Component Mapping

### Three Primary Dashboards

#### 1. Client Management Dashboard
**File:** `src/components/ClientManagementDashboard.jsx`
**Path:** `/dashboard/management`
**Roles:** management, senior_partner, partner

**Key Features:**
- Organization overview statistics
- Staff user management (read-only view)
- Client portfolio overview (read-only view)
- Matter tracking (read-only view)
- Assessment monitoring (read-only view)
- Approval workflows (dual approval system)

**Access Restrictions:**
- **Cannot** create new clients
- **Cannot** edit client data
- **Cannot** create matters
- **Cannot** upload documents
- **Can** view all organizational data
- **Can** approve staff/compliance role upgrade requests
- **Can** approve client access requests (requires 2 approvals)

---

#### 2. Staff Dashboard
**File:** `src/components/StaffDashboard.jsx`
**Path:** `/dashboard/staff`
**Roles:** staff, lawyer

**Key Features:**
- Client onboarding workflow
- Matter creation and management
- Document upload and verification
- Risk assessment initiation
- SOF/SOW verification forms
- Beneficial ownership tracking
- AML trigger activity monitoring

**Access Restrictions:**
- **Can** create new clients (pending management approval)
- **Can** edit client data (own clients only)
- **Can** create and manage matters
- **Can** upload/verify documents
- **Can** initiate risk assessments
- **Cannot** approve users
- **Cannot** access system administration
- **Cannot** view other staff members' private data

---

#### 3. Compliance Officer Dashboard
**File:** `src/components/ComplianceOfficerDashboard.jsx`
**Path:** `/dashboard/compliance`
**Roles:** compliance_officer, mlro

**Key Features:**
- Assessment review and monitoring (read-only)
- High-risk client identification
- STR (Suspicious Transaction Report) oversight
- Compliance report generation
- Audit trail review
- Risk dashboard and analytics

**Access Restrictions:**
- **Cannot** create clients
- **Cannot** edit client data
- **Cannot** modify assessments
- **Cannot** upload documents
- **Cannot** create matters
- **Cannot** approve requests
- **Can** view all assessments (read-only)
- **Can** monitor high-risk clients
- **Can** view STR submissions
- **Can** generate compliance reports
- **Can** access audit logs

---

## 9. Database Schema

### user_profiles Table

```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,

  -- CRITICAL: Role determines dashboard access
  role text NOT NULL CHECK (role IN (
    'admin',
    'management',
    'senior_partner',
    'partner',
    'staff',
    'lawyer',
    'compliance_officer',
    'mlro',
    'client'
  )),

  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  full_name text,
  first_name text,
  last_name text,
  position text,

  -- Account status
  is_active boolean DEFAULT true,
  password_change_required boolean DEFAULT false,

  -- Audit
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for fast role-based queries
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_organization ON user_profiles(organization_id);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active) WHERE is_active = true;
```

### Row-Level Security (RLS) Policies

```sql
-- Users can only see profiles in their organization
CREATE POLICY "users_select_own_organization" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins and management can view all user profiles
CREATE POLICY "management_can_view_users" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'management', 'senior_partner', 'partner')
    )
  );

-- Users can update their own profile (limited fields)
CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Cannot change role
    role = (SELECT role FROM user_profiles WHERE id = auth.uid()) AND
    -- Cannot change organization
    organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );
```

---

## 10. Implementation Code Examples

### Example 1: Adding a New Dashboard for a New Role

Let's say you want to add a new role called `auditor` with its own dashboard.

#### Step 1: Add Role to Database

```sql
-- Update role check constraint
ALTER TABLE user_profiles
DROP CONSTRAINT user_profiles_role_check;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check
CHECK (role IN (
  'admin',
  'management',
  'senior_partner',
  'partner',
  'staff',
  'lawyer',
  'compliance_officer',
  'mlro',
  'client',
  'auditor'  -- NEW ROLE
));
```

#### Step 2: Create Dashboard Component

```javascript
// File: src/components/AuditorDashboard.jsx

export default function AuditorDashboard() {
  const { profile } = useAuth();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Auditor Dashboard</h1>
        <p>Welcome, {profile.full_name}</p>
      </header>

      <div style={styles.content}>
        {/* Audit-specific features */}
        <AuditLogViewer />
        <ComplianceReportReview />
        <SystemHealthMonitoring />
      </div>
    </div>
  );
}
```

#### Step 3: Add Route in App.jsx

```javascript
// Add to imports
import AuditorDashboard from './components/AuditorDashboard';

// Add new route
<Route
  path="/dashboard/auditor"
  element={
    <ProtectedRoute auditorOnly={true}>
      <AuditorDashboard />
    </ProtectedRoute>
  }
/>
```

#### Step 4: Update ProtectedRoute

```javascript
function ProtectedRoute({
  children,
  adminOnly = false,
  managementOnly = false,
  staffOnly = false,
  complianceOnly = false,
  auditorOnly = false  // NEW FLAG
}) {
  // ... existing code ...

  // Add auditor check
  if (auditorOnly && profile?.role !== 'auditor' && profile?.role !== 'admin') {
    return <Navigate to="/client/dashboard" replace />;
  }

  return children;
}
```

#### Step 5: Update RoleBasedRedirect

```javascript
function RoleBasedRedirect() {
  const { profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  switch (profile?.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;

    case 'auditor':  // NEW CASE
      return <Navigate to="/dashboard/auditor" replace />;

    // ... other cases ...

    default:
      return <Navigate to="/client/dashboard" replace />;
  }
}
```

---

### Example 2: Checking Role Permissions Programmatically

Sometimes you need to conditionally render UI elements or enable/disable features based on role.

```javascript
import { useAuth } from '../contexts/AuthContext';

export default function SomeComponent() {
  const { profile } = useAuth();

  // Helper functions for role checks
  const isAdmin = () => profile?.role === 'admin';

  const isManagement = () => ['admin', 'management', 'senior_partner', 'partner'].includes(profile?.role);

  const isStaff = () => ['admin', 'staff', 'lawyer'].includes(profile?.role);

  const isCompliance = () => ['admin', 'compliance_officer', 'mlro'].includes(profile?.role);

  const canEditClients = () => isAdmin() || isStaff();

  const canApproveUsers = () => isAdmin() || isManagement();

  return (
    <div>
      {/* Show different buttons based on role */}
      {canEditClients() && (
        <button onClick={handleEditClient}>
          Edit Client
        </button>
      )}

      {canApproveUsers() && (
        <button onClick={handleApproveUser}>
          Approve User
        </button>
      )}

      {isCompliance() && (
        <section>
          <h3>Compliance Reports</h3>
          <ComplianceReportsViewer />
        </section>
      )}
    </div>
  );
}
```

---

### Example 3: Server-Side Role Validation (Edge Function)

Always validate roles server-side for sensitive operations:

```typescript
// File: supabase/functions/approve-user/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;

    // Get user's profile and role
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // SERVER-SIDE ROLE CHECK: Only management can approve users
    const allowedRoles = ['admin', 'management', 'senior_partner', 'partner'];
    if (!allowedRoles.includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Management access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, action } = await req.json();

    // Perform approval action
    const { error: updateError } = await supabaseClient
      .from('user_profiles')
      .update({ is_active: action === 'approve' })
      .eq('id', userId)
      .eq('organization_id', profile.organization_id); // Same organization

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Summary

The role-based dashboard access system is implemented through:

1. **Database-Driven Roles**: User roles stored in `user_profiles.role` column
2. **Centralized Auth Context**: `AuthContext` provides role information to all components
3. **Protected Routes**: `ProtectedRoute` component enforces access control at route level
4. **Automatic Redirection**: `RoleBasedRedirect` sends users to appropriate dashboard on login
5. **Exclusive Access**: Each role can ONLY access its designated dashboard
6. **Security Layers**:
   - Frontend route protection
   - Backend RLS policies
   - Edge function validation

The system ensures that:
- **Staff** can ONLY access `/dashboard/staff` (StaffDashboard.jsx)
- **Compliance** can ONLY access `/dashboard/compliance` (ComplianceOfficerDashboard.jsx)
- **Management** can ONLY access `/dashboard/management` (ClientManagementDashboard.jsx)

Any attempt to access a different dashboard results in automatic redirection to the fallback `/client/dashboard`.
