# CRITICAL: DASHBOARD ARCHITECTURE - DO NOT MIX THESE DASHBOARDS

## ⚠️ EXTREMELY IMPORTANT - READ THIS BEFORE MAKING ANY CHANGES ⚠️

This document defines the STRICT separation between different dashboard types in the system.
**VIOLATING THIS ARCHITECTURE WILL BREAK THE ENTIRE SYSTEM.**

---

## 1. SYSTEM ADMINISTRATION DASHBOARD

### Component
`ManagementDashboard.jsx`

### Purpose
System-wide administration dashboard for **SYSTEM ADMINISTRATORS ONLY**.

### Route
`/admin/dashboard`

### Access Control
- **Role**: `admin` ONLY
- **Organization**: `NULL` (no organization assigned)
- **Protected Route**: `<ProtectedRoute adminOnly={true}>`

### Capabilities
- Manage ALL organizations in the system
- Create new organizations
- Approve law firm registrations
- Approve new user requests across ALL organizations
- System-wide security settings
- Manage system users
- View ALL system data

### Key Characteristics
- **NO** organization_id (system-level access)
- Can see and manage EVERYTHING across all organizations
- Should NEVER be accessible to organization-level users

---

## 2. CLIENT MANAGEMENT DASHBOARD (Organization Management)

### Component
`ClientManagementDashboard.jsx`

### Purpose
Organization-level management dashboard for **ORGANIZATION MANAGERS** (partners, senior partners, management).

### Route
`/dashboard/management`

### Access Control
- **Roles**: `management`, `senior_partner`, `partner`
- **Organization**: MUST have `organization_id` (assigned to a specific organization)
- **Protected Route**: `<ProtectedRoute managementOnly={true}>`

### Capabilities
- Manage users WITHIN their organization ONLY
- View and manage KYC clients for their organization
- Handle matters and cases for their organization
- Review assessments for their organization
- Manage transaction alerts for their organization
- Approve role upgrade requests within their organization

### Key Characteristics
- **MUST** have an organization_id
- Can ONLY see and manage data for THEIR organization
- Cannot access other organizations' data
- Cannot create new organizations

---

## 3. CLIENT DASHBOARD (Standard User Dashboard)

### Component
`Dashboard.jsx` (also known as Client Dashboard)

### Purpose
Standard dashboard for regular firm users (clients, basic users).

### Route
`/client/dashboard`

### Access Control
- **Roles**: `client` (default role)
- **Organization**: MUST have `organization_id`

### Capabilities
- View their organization's assessments
- Start new assessments
- View KYC clients
- View suspicious activity alerts
- Manage their own profile

### Key Characteristics
- **MUST** have an organization_id
- Limited to viewing and basic operations
- Cannot manage users or approve requests

---

## 4. STAFF DASHBOARD

### Component
`StaffDashboard.jsx`

### Purpose
Operational dashboard for staff members and lawyers.

### Route
`/dashboard/staff`

### Access Control
- **Roles**: `staff`, `lawyer`
- **Organization**: MUST have `organization_id`

### Capabilities
- Manage KYC clients they are assigned to
- Handle matters assigned to them
- Conduct due diligence
- Upload and manage documents
- Screen clients

---

## 5. COMPLIANCE DASHBOARD

### Component
`ComplianceOfficerDashboard.jsx`

### Purpose
Compliance monitoring and reporting dashboard.

### Route
`/dashboard/compliance`

### Access Control
- **Roles**: `compliance_officer`, `mlro`
- **Organization**: MUST have `organization_id`

### Capabilities
- Review suspicious activity alerts
- Generate STR reports
- Monitor transaction alerts
- Review assessments (read-only)
- Compliance reporting

---

## ROUTING CONFIGURATION (App.jsx)

### CRITICAL ROUTING RULES

```jsx
// Default route after login - BASED ON ROLE
if (profile?.role === 'admin') {
  return <Navigate to="/admin/dashboard" replace />;  // ← System Admin Dashboard
} else if (profile?.role === 'management' || profile?.role === 'senior_partner' || profile?.role === 'partner') {
  return <Navigate to="/dashboard/management" replace />;  // ← Client Management Dashboard
} else if (profile?.role === 'staff' || profile?.role === 'lawyer') {
  return <Navigate to="/dashboard/staff" replace />;
} else if (profile?.role === 'compliance_officer' || profile?.role === 'mlro') {
  return <Navigate to="/dashboard/compliance" replace />;
} else {
  return <Navigate to="/client/dashboard" replace />;  // ← Client Dashboard
}
```

### ROUTE DEFINITIONS

```jsx
// System Administration Dashboard - ADMIN ONLY
<Route
  path="/admin/dashboard"
  element={
    <ProtectedRoute adminOnly={true}>
      <ManagementDashboard />  {/* ← System Admin Component */}
    </ProtectedRoute>
  }
/>

// Client Management Dashboard - ORGANIZATION MANAGERS
<Route
  path="/dashboard/management"
  element={
    <ProtectedRoute managementOnly={true}>
      <ClientManagementDashboard />  {/* ← Organization Management Component */}
    </ProtectedRoute>
  }
/>

// Client Dashboard - STANDARD USERS
<Route
  path="/client/dashboard"
  element={
    <ProtectedRoute>
      <ClientDashboard />  {/* ← Client Selection Component */}
    </ProtectedRoute>
  }
/>
```

---

## COMMON MISTAKES TO AVOID

### ❌ WRONG: Using ManagementDashboard for organization managers
```jsx
// DO NOT DO THIS!
<Route path="/dashboard/management" element={<ManagementDashboard />} />
```

### ✅ CORRECT: Using ClientManagementDashboard for organization managers
```jsx
<Route path="/dashboard/management" element={<ClientManagementDashboard />} />
```

### ❌ WRONG: Routing admin to /dashboard/management
```jsx
// DO NOT DO THIS!
if (profile?.role === 'admin') {
  return <Navigate to="/dashboard/management" replace />;
}
```

### ✅ CORRECT: Routing admin to /admin/dashboard
```jsx
if (profile?.role === 'admin') {
  return <Navigate to="/admin/dashboard" replace />;
}
```

---

## COMPONENT FILE NAMING

| Dashboard Type | Component File | Route |
|---------------|----------------|-------|
| System Administration | `ManagementDashboard.jsx` | `/admin/dashboard` |
| Organization Management | `ClientManagementDashboard.jsx` | `/dashboard/management` |
| Standard Client | `Dashboard.jsx` | `/client/dashboard` |
| Staff Operations | `StaffDashboard.jsx` | `/dashboard/staff` |
| Compliance | `ComplianceOfficerDashboard.jsx` | `/dashboard/compliance` |

---

## ICON ROUTING IN CLIENT DASHBOARD

When users click the "Management" icon in the Client Dashboard selector, they should be routed based on their role:

```jsx
// In ClientDashboard.jsx
{
  id: 'management',
  title: 'Management',
  icon: '📊',
  route: '/dashboard/management',  // ← Organization Management Dashboard
  hasAccess: hasManagementAccess
}
```

**NEVER** route to `/admin/dashboard` from the Client Dashboard selector - that is ONLY for system administrators!

---

## VERIFICATION CHECKLIST

Before deploying any changes:

- [ ] System Admins (role='admin') are routed to `/admin/dashboard`
- [ ] System Admins see `ManagementDashboard.jsx` component
- [ ] Organization Managers (role='management'/'partner'/'senior_partner') are routed to `/dashboard/management`
- [ ] Organization Managers see `ClientManagementDashboard.jsx` component
- [ ] Client Dashboard Management icon routes to `/dashboard/management` NOT `/admin/dashboard`
- [ ] No mixing of these two completely separate dashboards

---

## FINAL NOTES

These two dashboards serve COMPLETELY DIFFERENT purposes:

1. **System Administration Dashboard** (`/admin/dashboard`):
   - For system administrators ONLY
   - Manages the ENTIRE system
   - No organization assignment needed
   - Component: `ManagementDashboard.jsx`

2. **Client Management Dashboard** (`/dashboard/management`):
   - For organization managers (partners, management)
   - Manages ONLY their organization
   - MUST have organization assignment
   - Component: `ClientManagementDashboard.jsx`

**THESE ARE NOT INTERCHANGEABLE. DO NOT MIX THEM.**

If you see these being mixed in the code, it is a BUG and must be fixed immediately.
