# Complete Dashboard Specifications

**Document Version:** 3.0
**Date:** March 15, 2026
**Purpose:** Comprehensive specifications for Client Management, Compliance, and Staff Dashboards
**For:** Implementation in other systems

---

## Table of Contents

1. [Overview](#overview)
2. [Design System](#design-system)
3. [Client Management Dashboard](#client-management-dashboard)
4. [Compliance Officer Dashboard](#compliance-officer-dashboard)
5. [Staff Dashboard](#staff-dashboard)
6. [Common Components](#common-components)
7. [Database Schema](#database-schema)
8. [API Patterns](#api-patterns)
9. [Security Considerations](#security-considerations)

---

## Overview

### Dashboard Hierarchy

```
├── Client Management Dashboard (Role: management, senior_partner, partner)
│   ├── Overview Tab
│   ├── Users Tab (Dual Approval System)
│   ├── Clients Tab
│   ├── Matters Tab
│   ├── Assessments Tab
│   └── Alerts Tab
│
├── Compliance Officer Dashboard (Role: compliance_officer)
│   ├── Overview Tab
│   ├── Institutional Risk Assessment
│   ├── Client Management
│   ├── STR Alerts
│   └── Sanctions & Screening
│
└── Staff Dashboard (Role: staff)
    ├── Overview Tab
    ├── My Matters
    ├── My Clients
    └── Overdue Reviews
```

### Access Control

| Dashboard | Roles | Organization Required |
|-----------|-------|----------------------|
| Client Management | management, senior_partner, partner | Yes (own org only) |
| Compliance Officer | compliance_officer | Yes (own org only) |
| Staff | staff | Yes (own org only) |

---

## Design System

### Color Palette

#### Primary Colors

```css
--navy-dark: #0a1929;
--navy-medium: #1a2f45;
--gold: #d4af37;
--gold-light: #f4e4c1;
```

#### Status Colors

```css
--green: #10b981;
--green-light: #d1fae5;
--green-dark: #065f46;

--amber: #f59e0b;
--amber-light: #fef3c7;
--amber-dark: #92400e;

--red: #ef4444;
--red-light: #fee2e2;
--red-dark: #991b1b;

--blue: #3b82f6;
--blue-light: #dbeafe;
--blue-dark: #1e40af;

--purple: #8b5cf6;
--purple-light: #e0e7ff;
--purple-dark: #6d28d9;
```

#### Neutral Colors

```css
--gray-50: #f8f9fa;
--gray-100: #f1f5f9;
--gray-200: #e5e7eb;
--gray-300: #cbd5e1;
--gray-400: #94a3b8;
--gray-500: #64748b;
--gray-600: #475569;
--gray-700: #334155;
--gray-800: #1e293b;
--gray-900: #0f172a;
```

### Typography

```css
/* Headers */
h1: 36-44px, weight: 800, color: white
h2: 28-32px, weight: 700, color: #0a1929
h3: 18-24px, weight: 700, color: #0a1929
h4: 16-18px, weight: 600, color: #0a1929

/* Body */
body: 14px, weight: 400, color: #475569
label: 14px, weight: 600, color: #0a1929
small: 12-13px, weight: 500, color: #64748b

/* Fonts */
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
```

### Spacing System

```css
/* 8px base unit */
--space-1: 8px;
--space-2: 16px;
--space-3: 24px;
--space-4: 32px;
--space-5: 40px;
--space-6: 48px;
--space-8: 64px;

/* Border Radius */
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 20px;
```

### Elevation (Box Shadows)

```css
--shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
--shadow-md: 0 4px 16px rgba(0,0,0,0.1);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
--shadow-xl: 0 12px 32px rgba(0,0,0,0.15);
--shadow-2xl: 0 20px 60px rgba(0,0,0,0.3);
```

### Common Layout Patterns

#### Page Container

```jsx
<div style={{
  minHeight: '100vh',
  background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
  padding: '24px'
}}>
```

#### Header Card

```jsx
<div style={{
  background: 'linear-gradient(135deg, #0a1929, #1a2f45)',
  borderRadius: '16px',
  padding: '32px',
  marginBottom: '32px',
  border: '2px solid #d4af37',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
}}>
  <div style={{
    fontSize: '28px',
    fontWeight: '600',
    color: '#d4af37',
    letterSpacing: '1px',
    marginBottom: '8px'
  }}>
    AML/CFT Compliance System
  </div>
  <h1 style={{
    margin: '0',
    fontSize: '36px',
    fontWeight: '800',
    color: 'white'
  }}>
    Dashboard Name
  </h1>
</div>
```

#### Content Card

```jsx
<div style={{
  background: 'white',
  borderRadius: '12px',
  padding: '24px 32px',
  border: '2px solid #d4af37',
  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  marginBottom: '24px'
}}>
```

#### Stat Card

```jsx
<div style={{
  background: 'white',
  borderRadius: '12px',
  padding: '16px',
  border: '2px solid #d4af37',
  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
}}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px'
  }}>
    <span style={{ fontSize: '28px' }}>🔔</span>
    <div style={{
      fontSize: '32px',
      fontWeight: '700',
      color: '#ef4444'
    }}>
      12
    </div>
  </div>
  <div style={{
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b'
  }}>
    Pending Alerts
  </div>
</div>
```

#### Interactive Hover Effects

```jsx
onMouseEnter={(e) => {
  e.currentTarget.style.transform = 'translateY(-4px)';
  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
}}
onMouseLeave={(e) => {
  e.currentTarget.style.transform = 'translateY(0)';
  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
}}
```

---

## Client Management Dashboard

### Purpose
Organization-level management dashboard for partners, senior partners, and management roles to oversee their organization's operations.

### Access Control

**Roles:** `management`, `senior_partner`, `partner`
**Requirement:** Must have `organization_id` (not NULL)
**Scope:** Can ONLY access data within their own organization

**DO NOT CONFUSE WITH:**
- System Admin Dashboard (role='admin', organization_id=NULL)
- System admins manage ALL organizations; org managers manage ONLY their organization

### Navigation Structure

```
/dashboard/management
```

### Statistics Overview

```jsx
const [statistics, setStatistics] = useState({
  totalClients: 0,
  activeMatters: 0,
  pendingReviews: 0,
  highRiskClients: 0,
  sanctionedClients: 0,
  openAlerts: 0,
  matterAlerts: 0,
  pendingRoleRequests: 0,
  pendingAccessRequests: 0
});
```

### Tab Structure

#### 1. Overview Tab

**Layout:** 2-column grid for performance metrics

**Statistics Displayed:**
- Client Distribution (Low/Medium/High Risk)
- Matter Status (Active/Pending/Completed)
- Recent Activity (Last 30 days)

**Components:**
```jsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '24px'
}}>
  <StatisticsCard title="Client Distribution" data={clientDistribution} />
  <StatisticsCard title="Matter Status" data={matterStatus} />
  <StatisticsCard title="Recent Activity" data={recentActivity} />
</div>
```

#### 2. Users Tab (Dual Approval System)

**Key Features:**
- Organization user management
- Role upgrade requests (dual approval required)
- New user requests (dual approval required)
- User cards with role indicators

**Dual Approval Logic:**
```javascript
// New User Request Approval
- Requires 2 approvals from management users
- Creator cannot approve their own request
- User who already approved cannot approve again
- After 2 approvals, user account is created automatically

// Role Upgrade Request Approval
- Requires 2 approvals from management users
- Requester cannot approve their own request
- Other management users can approve
```

**User Card Design:**

```jsx
<div style={{
  padding: '24px',
  background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
  border: '2px solid #d4af37',
  borderRadius: '16px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease'
}}>
  {/* Avatar with initial */}
  <div style={{
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #d4af37, #f4e4c1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '700'
  }}>
    {user.full_name?.charAt(0)?.toUpperCase()}
  </div>

  {/* User Info */}
  <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1929' }}>
    {user.full_name}
  </div>
  <div style={{ fontSize: '12px', color: '#64748b' }}>
    {user.email}
  </div>

  {/* Role Badge */}
  <div style={{
    padding: '10px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '700',
    textAlign: 'center',
    background: getRoleGradient(user.role),
    color: getRoleColor(user.role),
    border: `2px solid ${getRoleBorderColor(user.role)}`
  }}>
    {user.role.toUpperCase()}
  </div>
</div>
```

**Role Color Scheme:**

```javascript
const roleStyles = {
  admin: {
    background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
    color: '#1e40af',
    border: '#3b82f6'
  },
  senior_partner: {
    background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
    color: '#4338ca',
    border: '#6366f1'
  },
  management: {
    background: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)',
    color: '#7c3aed',
    border: '#a855f7'
  },
  partner: {
    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    color: '#d97706',
    border: '#f59e0b'
  },
  compliance_officer: {
    background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)',
    color: '#db2777',
    border: '#ec4899'
  },
  staff: {
    background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
    color: '#16a34a',
    border: '#22c55e'
  }
};
```

**Request Approval Card:**

```jsx
<div style={{
  padding: '24px',
  background: approvalsCount === 1 ? '#f0fdf4' : '#fffbeb',
  border: `2px solid ${approvalsCount === 1 ? '#10b981' : '#fbbf24'}`,
  borderRadius: '12px'
}}>
  {/* Header */}
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  }}>
    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a1929' }}>
      {request.full_name}
    </div>
    <span style={{
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: '700',
      background: approvalsCount === 1 ? '#dcfce7' : '#fef3c7',
      color: approvalsCount === 1 ? '#166534' : '#92400e',
      border: `2px solid ${approvalsCount === 1 ? '#10b981' : '#f59e0b'}`
    }}>
      {approvalsCount}/2 APPROVALS
    </span>
  </div>

  {/* Request Details */}
  <div style={{
    padding: '16px',
    background: 'white',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    marginBottom: '12px'
  }}>
    <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
      Reason for Access:
    </div>
    <div style={{ fontSize: '14px', color: '#0a1929' }}>
      {request.reason}
    </div>
  </div>

  {/* Action Buttons */}
  <div style={{ display: 'flex', gap: '12px' }}>
    <button style={{
      flex: 1,
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #059669, #10b981)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontWeight: '600',
      fontSize: '15px',
      cursor: 'pointer'
    }}>
      ✓ Approve {approvalsCount === 1 ? '& Create Account' : '(1st Approval)'}
    </button>
    <button style={{
      flex: 1,
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontWeight: '600',
      fontSize: '15px',
      cursor: 'pointer'
    }}>
      ✕ Reject
    </button>
  </div>
</div>
```

#### 3. Clients Tab

**Read-Only Access:**
- View all clients in organization
- Filter by risk rating
- Click to view client details
- No edit/delete capabilities

**Client Card Layout:**

```jsx
<div onClick={() => navigate(`/kyc-client/${client.id}`)}
  style={{
    padding: '20px',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }}>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <div>
      <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929' }}>
        {client.client_name}
      </div>
      <div style={{ fontSize: '13px', color: '#64748b' }}>
        {client.client_type === 'individual' ? 'Individual' : 'Legal Entity'}
      </div>
    </div>
    <div>
      {/* Risk Badge */}
      <div style={{
        padding: '4px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        background: getRiskBackground(client.risk_rating),
        color: getRiskColor(client.risk_rating)
      }}>
        {client.risk_rating?.toUpperCase()}
      </div>
    </div>
  </div>
</div>
```

#### 4. Matters Tab

**Integration:** Displays `<MatterManagement />` component

**Features:**
- Read-only view of all organizational matters
- Filter by status
- View matter details
- See associated clients

#### 5. Assessments Tab

**Read-Only Access:**
- View all institutional risk assessments
- See assessment status and risk ratings
- Access completed assessment reports
- Cannot edit or delete assessments

**Assessment Card:**

```jsx
<div style={{
  padding: '20px',
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
}}>
  <div style={{
    fontSize: '16px',
    fontWeight: '600',
    color: '#0a1929',
    marginBottom: '8px'
  }}>
    {assessment.assessor_name || organization?.name || 'Institutional Assessment'}
  </div>
  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
    Created: {new Date(assessment.created_at).toLocaleDateString()}
  </div>
  {assessment.overall_risk_rating && (
    <div style={{
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block',
      background: getRiskBackground(assessment.overall_risk_rating),
      color: getRiskColor(assessment.overall_risk_rating)
    }}>
      {assessment.overall_risk_rating}
    </div>
  )}
</div>
```

#### 6. Alerts Tab

**Features:**
- Transaction alerts monitoring
- Matter AML alerts
- Link to full STR dashboard
- Alert status tracking

**Statistics:**
- Open alerts count
- Matter alerts count
- Alert distribution by type

### Database Queries

```sql
-- Load organization users
SELECT id, full_name, email, role, is_active, created_at
FROM user_profiles
WHERE organization_id = :org_id
ORDER BY created_at DESC
LIMIT 100;

-- Load KYC clients
SELECT id, client_name, current_risk_rating, pep_status, created_at, screening_status
FROM kyc_clients
WHERE organization_id = :org_id
ORDER BY created_at DESC;

-- Load matters
SELECT id, matter_name, status, created_at
FROM matters
WHERE organization_id = :org_id
ORDER BY created_at DESC;

-- Load assessments
SELECT id, entity_category, overall_risk_rating, status, created_at
FROM assessments
WHERE organization_id = :org_id
ORDER BY created_at DESC;

-- Load role upgrade requests
SELECT id, status, created_at,
       user_profiles.full_name, user_profiles.email, user_profiles.role
FROM role_upgrade_requests
INNER JOIN user_profiles ON role_upgrade_requests.user_id = user_profiles.id
WHERE role_upgrade_requests.organization_id = :org_id
ORDER BY created_at DESC
LIMIT 100;

-- Load new user requests
SELECT id, full_name, email, status, created_at, requested_access, position, reason
FROM new_user_requests
WHERE organization_id = :org_id
ORDER BY created_at DESC
LIMIT 100;

-- Load new user request approvals
SELECT request_id, approver_id, approval_status
FROM new_user_request_approvals
WHERE request_id IN (SELECT id FROM new_user_requests WHERE organization_id = :org_id)
LIMIT 200;
```

### Button Patterns

**Primary Action Button:**

```jsx
<button style={{
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
  border: '2px solid #10b981',
  borderRadius: '10px',
  color: 'white',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
}}
onMouseEnter={(e) => {
  e.currentTarget.style.transform = 'translateY(-2px)';
  e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.3)';
}}
onMouseLeave={(e) => {
  e.currentTarget.style.transform = 'translateY(0)';
  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
}}>
  <span style={{ fontSize: '18px' }}>➕</span>
  Add New User
</button>
```

**Secondary Action Button:**

```jsx
<button style={{
  padding: '10px 20px',
  background: 'transparent',
  border: '2px solid #d4af37',
  borderRadius: '8px',
  color: '#0a1929',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s'
}}>
  Cancel
</button>
```

---

## Compliance Officer Dashboard

### Purpose
Compliance oversight dashboard for monitoring institutional risk, client compliance, and regulatory requirements.

### Access Control

**Role:** `compliance_officer`
**Requirement:** Must have `organization_id`
**Scope:** Read-only access to organizational data

### Navigation Structure

```
/compliance/dashboard
```

### Statistics Overview

```jsx
const [stats, setStats] = useState({
  totalClients: 0,
  highRiskClients: 0,
  pepClients: 0,
  totalMatters: 0,
  activeMatters: 0,
  pendingAlerts: 0,
  overdueReviews: 0,
  activeSTRs: 0,
  redFlagIncidents: 0,
  conflictsPending: 0
});
```

### View Structure

#### 1. Overview View (Default)

**Top Statistics Row:**

```jsx
<div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
  <StatCard
    title="High Risk Clients"
    value={stats.highRiskClients}
    icon="⚠️"
    color="#ef4444"
    onClick={() => setActiveView('clients')}
  />
  <StatCard
    title="PEP Clients"
    value={stats.pepClients}
    icon="👔"
    color="#f59e0b"
  />
  <StatCard
    title="Pending Alerts"
    value={stats.pendingAlerts}
    icon="🚨"
    color="#ef4444"
    onClick={() => setActiveView('alerts')}
  />
  <StatCard
    title="Overdue Reviews"
    value={stats.overdueReviews}
    icon="📅"
    color="#f59e0b"
  />
  <StatCard
    title="Active STRs"
    value={stats.activeSTRs}
    icon="📝"
    color="#6366f1"
  />
  <StatCard
    title="Red Flag Incidents"
    value={stats.redFlagIncidents}
    icon="🚩"
    color="#ef4444"
  />
</div>
```

**Quick Actions Section:**

```jsx
<div style={{
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
}}>
  <button onClick={() => setActiveView('assessment')}
    style={actionButtonStyle}>
    <span style={{ fontSize: '20px' }}>📊</span>
    Institutional Risk Assessment
  </button>
  <button onClick={() => setActiveView('clients')}
    style={actionButtonStyle}>
    <span style={{ fontSize: '20px' }}>👥</span>
    View All Clients
  </button>
  <button onClick={() => setActiveView('alerts')}
    style={actionButtonStyle}>
    <span style={{ fontSize: '20px' }}>🚨</span>
    Review Alerts
  </button>
  <button onClick={() => setActiveView('screening')}
    style={actionButtonStyle}>
    <span style={{ fontSize: '20px' }}>🔍</span>
    Sanctions & Screening
  </button>
</div>
```

**Recent Red Flag Activity:**

```jsx
<div style={{
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  maxHeight: '300px',
  overflowY: 'auto'
}}>
  {recentActivity.map((item) => (
    <div key={item.id}
      style={{
        padding: '12px',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px'
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#0a1929'
        }}>
          {item.kyc_clients?.client_name}
        </span>
        <span style={{ fontSize: '11px', color: '#64748b' }}>
          {new Date(item.incident_date).toLocaleDateString()}
        </span>
      </div>
      <p style={{
        margin: '4px 0',
        fontSize: '12px',
        color: '#4a5568'
      }}>
        {item.incident_description.substring(0, 80)}...
      </p>
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '600',
        background: getStatusBackground(item.investigation_status),
        color: getStatusColor(item.investigation_status)
      }}>
        {item.investigation_status.replace('_', ' ')}
      </span>
    </div>
  ))}
</div>
```

**Compliance Priorities Section:**

```jsx
<div style={{
  background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)',
  borderRadius: '12px',
  padding: '24px',
  border: '2px solid #3b82f6'
}}>
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
    <span style={{ fontSize: '32px' }}>💡</span>
    <div>
      <h3 style={{
        margin: '0 0 8px 0',
        color: '#1e40af',
        fontSize: '18px',
        fontWeight: '700'
      }}>
        Compliance Priorities
      </h3>
      <ul style={{
        margin: 0,
        paddingLeft: '20px',
        color: '#1e3a8a',
        lineHeight: '1.8'
      }}>
        {stats.overdueReviews > 0 && (
          <li>Review {stats.overdueReviews} overdue client review{stats.overdueReviews !== 1 ? 's' : ''}</li>
        )}
        {stats.pendingAlerts > 0 && (
          <li>Investigate {stats.pendingAlerts} pending transaction alert{stats.pendingAlerts !== 1 ? 's' : ''}</li>
        )}
        {stats.redFlagIncidents > 0 && (
          <li>Address {stats.redFlagIncidents} red flag incident{stats.redFlagIncidents !== 1 ? 's' : ''}</li>
        )}
        {stats.conflictsPending > 0 && (
          <li>Resolve {stats.conflictsPending} pending conflict check{stats.conflictsPending !== 1 ? 's' : ''}</li>
        )}
        {stats.activeSTRs > 0 && (
          <li>Review {stats.activeSTRs} draft STR{stats.activeSTRs !== 1 ? 's' : ''}</li>
        )}
        {/* If all clear */}
        {stats.overdueReviews === 0 && stats.pendingAlerts === 0 &&
         stats.redFlagIncidents === 0 && stats.conflictsPending === 0 &&
         stats.activeSTRs === 0 && (
          <li>No urgent compliance tasks at this time</li>
        )}
      </ul>
    </div>
  </div>
</div>
```

#### 2. Institutional Risk Assessment View

**Features:**
- Create new institutional risk assessments
- View existing assessments
- Continue in-progress assessments
- View completed assessment reports
- Read-only access (no edit/delete)

**Assessment List Card:**

```jsx
<div style={{
  padding: '20px',
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
}}>
  <div style={{
    fontSize: '16px',
    fontWeight: '600',
    color: '#0a1929',
    marginBottom: '8px'
  }}>
    {assessment.assessor_name || 'Institutional Assessment'}
  </div>
  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
    Created: {new Date(assessment.created_at).toLocaleDateString()}
  </div>
  <div style={{ fontSize: '13px', color: '#64748b' }}>
    Status: <span style={{
      color: assessment.status === 'completed' ? '#16a34a' : '#f59e0b',
      fontWeight: '600'
    }}>
      {assessment.status === 'draft' ? 'Draft' :
       assessment.status === 'in_progress' ? 'In Progress' :
       assessment.status === 'completed' ? 'Completed' : assessment.status}
    </span>
  </div>

  {/* Risk Rating Badge */}
  {assessment.overall_risk_rating && (
    <div style={{
      marginTop: '12px',
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block',
      background: getRiskBackground(assessment.overall_risk_rating),
      color: getRiskColor(assessment.overall_risk_rating)
    }}>
      {assessment.overall_risk_rating}
    </div>
  )}

  {/* Action Buttons */}
  <div style={{
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f3f4f6'
  }}>
    <button style={{
      flex: 1,
      padding: '8px 16px',
      background: 'linear-gradient(135deg, #0a1929 0%, #1e3a5f 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer'
    }}>
      {assessment.status === 'completed' ? 'Edit Assessment' : 'Continue Assessment'}
    </button>
    {assessment.status === 'completed' && (
      <button style={{
        flex: 1,
        padding: '8px 16px',
        background: 'white',
        color: '#0a1929',
        border: '2px solid #0a1929',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer'
      }}>
        View Report
      </button>
    )}
  </div>
</div>
```

**Create New Assessment Button:**

```jsx
<button onClick={createNewAssessment}
  style={{
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #0a1929 0%, #1e3a5f 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  }}>
  + New Assessment
</button>
```

#### 3. Client Management View

**Features:**
- View all organization clients
- Read-only client cards
- Filter by risk rating
- Click to view full client details

**Empty State:**

```jsx
<div style={{
  textAlign: 'center',
  padding: '60px 20px',
  color: '#64748b'
}}>
  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
    No clients yet
  </div>
  <div style={{ fontSize: '14px' }}>
    Clients will appear here once they are added to the system
  </div>
</div>
```

#### 4. STR Alerts View

**Integration:** Displays `<STRAlertDashboard />` component

**Features:**
- Suspicious transaction reporting
- Alert investigation tracking
- STR draft management

#### 5. Sanctions & Screening View

**Integration:** Displays `<ScreeningDashboard />` component

**Features:**
- PEP screening
- Sanctions list checking
- Adverse media monitoring
- Match review and resolution

### Database Queries

```sql
-- Load compliance statistics
SELECT
  COUNT(*) FILTER (WHERE current_risk_rating IN ('High', 'Very High')) AS high_risk_clients,
  COUNT(*) FILTER (WHERE pep_status = true) AS pep_clients,
  COUNT(*) AS total_clients
FROM kyc_clients
WHERE organization_id = :org_id;

-- Load overdue reviews
SELECT id, client_name, next_review_date, current_risk_rating, pep_status
FROM kyc_clients
WHERE organization_id = :org_id
  AND next_review_date < CURRENT_DATE
  AND (last_review_date IS NULL OR last_review_date < next_review_date);

-- Load red flag incidents
SELECT
  rfi.id,
  rfi.incident_date,
  rfi.incident_description,
  rfi.investigation_status,
  kc.client_name
FROM client_red_flag_incidents rfi
INNER JOIN kyc_clients kc ON rfi.client_id = kc.id
WHERE rfi.organization_id = :org_id
  AND rfi.investigation_status IN ('identified', 'under_investigation')
ORDER BY rfi.incident_date DESC
LIMIT 10;

-- Load draft STRs
SELECT id, draft_status
FROM str_drafts
WHERE organization_id = :org_id
  AND draft_status IN ('draft', 'pending_mlro_review');

-- Load conflict checks
SELECT id, resolution_status
FROM conflict_checks
WHERE organization_id = :org_id
  AND resolution_status = 'pending';
```

### Action Button Style

```javascript
const actionButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '14px 20px',
  background: 'linear-gradient(135deg, #f9fafb, #ffffff)',
  border: '2px solid #e5e7eb',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600',
  color: '#0a1929',
  transition: 'all 0.3s ease',
  width: '100%',
  textAlign: 'left'
};
```

---

## Staff Dashboard

### Purpose
Personal dashboard for staff members to manage their assigned clients, matters, and daily tasks.

### Access Control

**Role:** `staff`
**Requirement:** Must have `organization_id`
**Scope:** Access ONLY to their assigned clients and matters

### Navigation Structure

```
/staff/dashboard
```

### Statistics Overview

```jsx
const [stats, setStats] = useState({
  myMatters: 0,
  openMatters: 0,
  myClients: 0,
  highRiskClients: 0,
  conflictsPending: 0,
  eddRequired: 0,
  overdueReviews: 0
});
```

### View Structure

#### 1. Overview View (Default)

**Workload Statistics:**

```jsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '12px'
}}>
  <StatCard
    title="My Matters"
    value={stats.myMatters}
    icon="📁"
    color="#3b82f6"
    onClick={() => changeView('matters')}
  />
  <StatCard
    title="My Clients"
    value={stats.myClients}
    icon="👥"
    color="#8b5cf6"
    onClick={() => changeView('clients', 'all')}
  />
  <StatCard
    title="High Risk"
    value={stats.highRiskClients}
    icon="⚠️"
    color="#ef4444"
    onClick={() => changeView('clients', 'high_risk')}
  />
  <StatCard
    title="EDD Required"
    value={stats.eddRequired}
    icon="🔍"
    color="#ec4899"
    onClick={() => changeView('clients', 'enhanced_dd')}
  />
  <StatCard
    title="Overdue Reviews"
    value={stats.overdueReviews}
    icon="📅"
    color="#f59e0b"
    onClick={() => changeView('overdue-reviews')}
  />
</div>
```

**Conflict Checks Alert (if pending):**

```jsx
{stats.conflictsPending > 0 && (
  <div style={{
    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    borderRadius: '12px',
    padding: '20px 24px',
    border: '2px solid #f59e0b',
    marginBottom: '24px',
    boxShadow: '0 4px 16px rgba(245,158,11,0.2)'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px'
    }}>
      <span style={{ fontSize: '32px' }}>⚠️</span>
      <div>
        <h3 style={{
          margin: '0 0 12px 0',
          color: '#92400e',
          fontSize: '18px',
          fontWeight: '700'
        }}>
          Action Required
        </h3>
        <div style={{
          padding: '12px 16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #f59e0b'
        }}>
          <div style={{ fontWeight: '700', color: '#92400e', fontSize: '20px' }}>
            {stats.conflictsPending}
          </div>
          <div style={{ fontSize: '13px', color: '#92400e' }}>
            Pending Conflict Check{stats.conflictsPending !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  </div>
)}
```

**Overdue Reviews Section:**

```jsx
{stats.overdueReviews > 0 && (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    border: '2px solid #ef4444',
    boxShadow: '0 4px 16px rgba(239,68,68,0.15)',
    marginBottom: '24px'
  }}>
    <h3 style={{
      margin: '0 0 16px 0',
      fontSize: '18px',
      fontWeight: '700',
      color: '#0a1929',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span style={{ fontSize: '24px' }}>⏰</span>
      Overdue Client Reviews ({stats.overdueReviews})
    </h3>

    {/* Overdue client cards */}
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {overdueClients.slice(0, 5).map((client) => {
        const daysOverdue = Math.floor(
          (new Date() - new Date(client.next_review_date)) / (1000 * 60 * 60 * 24)
        );
        const urgencyLevel = daysOverdue > 30 ? 'critical' :
                            daysOverdue > 14 ? 'high' : 'medium';
        const urgencyColor = urgencyLevel === 'critical' ? '#dc2626' :
                            urgencyLevel === 'high' ? '#f59e0b' : '#f97316';

        return (
          <div key={client.id}
            style={{
              padding: '16px',
              background: 'white',
              borderRadius: '12px',
              border: `2px solid ${urgencyColor}`,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
            {/* Client info and days overdue badge */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <h4 style={{
                  margin: '0 0 6px 0',
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#0a1929'
                }}>
                  {client.client_name}
                </h4>
                <div style={{
                  fontSize: '12px',
                  color: '#64748b'
                }}>
                  {client.client_type === 'individual' ? 'Individual' : 'Corporate'} •
                  DD Level: {client.current_dd_level}
                  {client.pep_status && ' • ⚠️ PEP'}
                </div>
              </div>
              <div style={{
                background: urgencyColor,
                color: 'white',
                padding: '10px 14px',
                borderRadius: '8px',
                textAlign: 'center',
                minWidth: '80px'
              }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  lineHeight: '1'
                }}>
                  {daysOverdue}
                </div>
                <div style={{
                  fontSize: '9px',
                  fontWeight: '600',
                  marginTop: '4px',
                  textTransform: 'uppercase'
                }}>
                  Days Overdue
                </div>
              </div>
            </div>

            {/* Review details grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '10px',
              padding: '10px',
              background: '#f8fafc',
              borderRadius: '6px',
              fontSize: '12px',
              marginTop: '12px'
            }}>
              <div>
                <div style={{
                  color: '#64748b',
                  fontSize: '10px',
                  fontWeight: '600',
                  marginBottom: '3px'
                }}>
                  Last Review
                </div>
                <div style={{
                  color: '#0a1929',
                  fontWeight: '600',
                  fontSize: '11px'
                }}>
                  {client.last_review_date ?
                   new Date(client.last_review_date).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{
                  color: '#64748b',
                  fontSize: '10px',
                  fontWeight: '600',
                  marginBottom: '3px'
                }}>
                  Due Date
                </div>
                <div style={{
                  color: urgencyColor,
                  fontWeight: '700',
                  fontSize: '11px'
                }}>
                  {new Date(client.next_review_date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div style={{
                  color: '#64748b',
                  fontSize: '10px',
                  fontWeight: '600',
                  marginBottom: '3px'
                }}>
                  Status
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: urgencyColor,
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '700'
                }}>
                  {urgencyLevel === 'critical' ? '🚨 CRITICAL' :
                   urgencyLevel === 'high' ? '⚠️ HIGH' : '📌 MEDIUM'}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
```

**My Active Matters & My Assigned Clients (2-column grid):**

```jsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '24px',
  marginBottom: '32px'
}}>
  {/* My Active Matters Card */}
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    border: '2px solid #d4af37',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    }}>
      <h3 style={{
        margin: 0,
        fontSize: '18px',
        fontWeight: '700',
        color: '#0a1929',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '24px' }}>📁</span>
        My Active Matters
      </h3>
      <button onClick={() => changeView('matters')}
        style={{
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(59,130,246,0.3)'
        }}>
        View All →
      </button>
    </div>

    {/* Matter cards */}
    {myMatters.length === 0 ? (
      <p style={{ color: '#64748b', fontSize: '14px' }}>
        No matters assigned
      </p>
    ) : (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {myMatters.map((matter) => (
          <div key={matter.id}
            style={{
              padding: '14px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '6px'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#0a1929'
              }}>
                {matter.matter_name}
              </span>
              <span style={{
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                background: getStatusBackground(matter.status),
                color: getStatusColor(matter.status)
              }}>
                {matter.status}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {matter.matter_type.replace('_', ' ')} •
              {new Date(matter.opened_date).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>

  {/* My Assigned Clients Card (similar structure) */}
</div>
```

**Quick Actions Section:**

```jsx
<div style={{
  background: 'white',
  borderRadius: '12px',
  padding: '24px',
  border: '2px solid #d4af37',
  boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
}}>
  <h3 style={{
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}>
    <span style={{ fontSize: '24px' }}>⚡</span>
    Quick Actions
  </h3>
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px'
  }}>
    <button onClick={() => changeView('matters')}
      style={actionButtonStyle}>
      <span style={{ fontSize: '24px' }}>📁</span>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontWeight: '700', fontSize: '15px' }}>
          Manage Matters
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          {stats.myMatters} assigned
        </div>
      </div>
    </button>
    <button onClick={() => changeView('clients')}
      style={actionButtonStyle}>
      <span style={{ fontSize: '24px' }}>👥</span>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontWeight: '700', fontSize: '15px' }}>
          Manage Clients
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          {stats.myClients} assigned
        </div>
      </div>
    </button>
    <button onClick={() => navigate('/client/dashboard')}
      style={actionButtonStyle}>
      <span style={{ fontSize: '24px' }}>📊</span>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontWeight: '700', fontSize: '15px' }}>
          Firm Dashboard
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Strategic view
        </div>
      </div>
    </button>
  </div>
</div>
```

#### 2. My Matters View

**Integration:** Displays `<MatterManagement />` component

**Features:**
- Full CRUD access to assigned matters
- Filter by status
- Add new matters
- Edit matter details
- Associate clients with matters

#### 3. My Clients View

**Integration:** Displays `<KYCClientManagement />` component with `initialFilter` prop

**Features:**
- Full access to assigned clients
- Add new clients
- Edit client information
- Perform KYC/CDD reviews
- Upload documents
- Update risk ratings

**Filter Support:**
```javascript
// URL parameters support filtering
?view=clients&filter=high_risk
?view=clients&filter=enhanced_dd
?view=clients&filter=all
```

#### 4. Overdue Reviews View

**Custom Component:** `<OverdueReviewsList />`

**Features:**
- Lists all clients with overdue reviews
- Sorted by review due date (oldest first)
- Urgency indicators (Critical/High/Medium)
- Days overdue calculation
- Direct link to client review page

**Overdue Client Card:**

```jsx
<div style={{
  background: 'white',
  borderRadius: '12px',
  padding: '20px',
  border: `2px solid ${urgencyColor}`,
  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  cursor: 'pointer'
}}>
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px'
  }}>
    <div>
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: '18px',
        fontWeight: '700',
        color: '#0a1929'
      }}>
        {client.client_name}
        <span style={{
          marginLeft: '8px',
          padding: '4px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          background: getRiskBackground(client.current_risk_rating),
          color: getRiskColor(client.current_risk_rating)
        }}>
          {client.current_risk_rating}
        </span>
      </h3>
      <div style={{
        display: 'flex',
        gap: '16px',
        fontSize: '13px',
        color: '#64748b'
      }}>
        <span>📋 {client.client_type === 'individual' ? 'Individual' : 'Corporate'}</span>
        <span>🔍 DD Level: {client.current_dd_level}</span>
        {client.pep_status && <span>⚠️ PEP</span>}
      </div>
    </div>
    <div style={{
      background: urgencyColor,
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      textAlign: 'center',
      minWidth: '120px'
    }}>
      <div style={{ fontSize: '24px', fontWeight: '700' }}>
        {daysOverdue}
      </div>
      <div style={{
        fontSize: '11px',
        fontWeight: '600',
        marginTop: '4px'
      }}>
        DAYS OVERDUE
      </div>
    </div>
  </div>

  {/* Review status grid */}
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    fontSize: '13px'
  }}>
    <div>
      <div style={{
        color: '#64748b',
        fontSize: '11px',
        fontWeight: '600',
        marginBottom: '4px'
      }}>
        Last Review
      </div>
      <div style={{
        color: '#0a1929',
        fontWeight: '600'
      }}>
        {client.last_review_date ?
         new Date(client.last_review_date).toLocaleDateString() : 'N/A'}
      </div>
    </div>
    <div>
      <div style={{
        color: '#64748b',
        fontSize: '11px',
        fontWeight: '600',
        marginBottom: '4px'
      }}>
        Due Date
      </div>
      <div style={{
        color: urgencyColor,
        fontWeight: '700'
      }}>
        {new Date(client.next_review_date).toLocaleDateString()}
      </div>
    </div>
    <div>
      <div style={{
        color: '#64748b',
        fontSize: '11px',
        fontWeight: '600',
        marginBottom: '4px'
      }}>
        Status
      </div>
      <div style={{
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '4px',
        background: urgencyColor,
        color: 'white',
        fontSize: '11px',
        fontWeight: '700'
      }}>
        {urgencyLevel === 'critical' ? '🚨 CRITICAL' :
         urgencyLevel === 'high' ? '⚠️ HIGH' : '📌 MEDIUM'}
      </div>
    </div>
  </div>
</div>
```

**Empty State:**

```jsx
<div style={{
  background: 'white',
  borderRadius: '12px',
  padding: '48px',
  border: '2px solid #d4af37',
  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  textAlign: 'center'
}}>
  <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
  <h3 style={{
    fontSize: '18px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 8px 0'
  }}>
    All Reviews Current
  </h3>
  <p style={{
    color: '#64748b',
    fontSize: '14px',
    margin: 0
  }}>
    No clients have overdue reviews at this time
  </p>
</div>
```

### Database Queries

```sql
-- Load staff's assigned matters
SELECT m.*,
       cmr.kyc_clients.id, cmr.kyc_clients.client_name, cmr.kyc_clients.current_risk_rating
FROM matters m
LEFT JOIN client_matter_relationships cmr ON m.id = cmr.matter_id
LEFT JOIN kyc_clients ON cmr.client_id = kyc_clients.id
WHERE m.organization_id = :org_id
  AND m.responsible_lawyer_id = :user_id
ORDER BY m.created_at DESC
LIMIT 5;

-- Count staff's matters by status
SELECT status, COUNT(*) as count
FROM matters
WHERE organization_id = :org_id
  AND responsible_lawyer_id = :user_id
GROUP BY status;

-- Load staff's assigned clients
SELECT kc.*,
       cmr.matter_id,
       cmr.matters.id, cmr.matters.status, cmr.matters.matter_name
FROM kyc_clients kc
LEFT JOIN client_matter_relationships cmr ON kc.id = cmr.client_id
LEFT JOIN matters ON cmr.matter_id = matters.id
WHERE kc.organization_id = :org_id
  AND kc.relationship_manager_id = :user_id
ORDER BY kc.created_at DESC
LIMIT 5;

-- Calculate statistics
SELECT
  COUNT(*) as total_clients,
  COUNT(*) FILTER (WHERE current_risk_rating IN ('High', 'Very High')) as high_risk,
  COUNT(*) FILTER (WHERE current_dd_level = 'enhanced') as edd_required,
  COUNT(*) FILTER (
    WHERE next_review_date < CURRENT_DATE
    AND (last_review_date IS NULL OR last_review_date < next_review_date)
  ) as overdue_reviews
FROM kyc_clients
WHERE organization_id = :org_id
  AND relationship_manager_id = :user_id;

-- Load overdue reviews (full details)
SELECT *
FROM kyc_clients
WHERE organization_id = :org_id
  AND relationship_manager_id = :user_id
  AND next_review_date < CURRENT_DATE
  AND (last_review_date IS NULL OR last_review_date < next_review_date)
ORDER BY next_review_date ASC;

-- Load conflict checks
SELECT id
FROM conflict_checks
WHERE organization_id = :org_id
  AND resolution_status = 'pending';
```

### State Persistence

**URL Parameters for View State:**

```javascript
// Save view state to URL
const changeView = (newView, filter = null) => {
  setActiveView(newView);
  const params = new URLSearchParams();
  if (newView !== 'overview') {
    params.set('view', newView);
  }
  if (filter) {
    params.set('filter', filter);
    setClientFilter(filter);
  }
  setSearchParams(params);
};

// Restore view state from URL on mount
useEffect(() => {
  const view = searchParams.get('view');
  const filter = searchParams.get('filter');
  if (view && ['overview', 'matters', 'overdue-reviews', 'clients'].includes(view)) {
    setActiveView(view);
  }
  if (filter) {
    setClientFilter(filter);
  }
}, []);
```

**Benefits:**
- Browser back/forward buttons work correctly
- Shareable URLs to specific views
- State persists across page refreshes

---

## Common Components

### StatCard Component

**Reusable across all dashboards**

```jsx
function StatCard({ title, value, icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '16px',
        border: '2px solid #d4af37',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        flex: '1',
        minWidth: '150px'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        }
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '8px'
      }}>
        <span style={{ fontSize: '28px' }}>{icon}</span>
        <div style={{
          fontSize: '32px',
          fontWeight: '700',
          color: color
        }}>
          {value}
        </div>
      </div>
      <div style={{
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b'
      }}>
        {title}
      </div>
    </div>
  );
}
```

### LoadingSpinner Component

**Used for async data loading states**

```jsx
function LoadingSpinner({ fullPage, minHeight }) {
  if (fullPage) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#d4af37',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: minHeight || '200px'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid #e5e7eb',
        borderTopColor: '#d4af37',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
    </div>
  );
}

// Add to global CSS
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Badge Helpers

```javascript
// Risk rating colors
export const getRiskBadgeStyle = (riskLevel) => {
  const styles = {
    'Low': { bg: '#d1fae5', color: '#065f46' },
    'Medium': { bg: '#fef3c7', color: '#92400e' },
    'Substantial': { bg: '#fed7aa', color: '#9a3412' },
    'High': { bg: '#fee2e2', color: '#991b1b' },
    'Very High': { bg: '#fce7f3', color: '#831843' }
  };
  const style = styles[riskLevel] || styles['Medium'];
  return {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    background: style.bg,
    color: style.color
  };
};

// Status colors
export const getStatusBadgeStyle = (status) => {
  const styles = {
    active: { bg: '#d1fae5', color: '#065f46' },
    open: { bg: '#dbeafe', color: '#1e40af' },
    pending: { bg: '#fef3c7', color: '#92400e' },
    completed: { bg: '#d1fae5', color: '#065f46' },
    closed: { bg: '#e5e7eb', color: '#374151' },
    rejected: { bg: '#fee2e2', color: '#991b1b' },
    suspended: { bg: '#fee2e2', color: '#991b1b' },
    approved: { bg: '#d1fae5', color: '#065f46' }
  };
  const style = styles[status?.toLowerCase()] || styles.pending;
  return {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    background: style.bg,
    color: style.color
  };
};

// Role colors
export const getRoleColor = (role) => {
  const colors = {
    admin: '#1e40af',
    senior_partner: '#4338ca',
    management: '#7c3aed',
    partner: '#d97706',
    compliance_officer: '#db2777',
    staff: '#16a34a',
    client: '#6b7280'
  };
  return colors[role] || colors.client;
};
```

---

## Database Schema

### Key Tables

#### user_profiles

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  position TEXT,
  role TEXT NOT NULL DEFAULT 'client',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Roles: admin, senior_partner, management, partner,
--        compliance_officer, staff, client
```

#### organizations

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  law_firm_type TEXT,
  brela_registration TEXT,
  tls_registration TEXT,
  practice_areas TEXT[],
  number_of_lawyers INTEGER,
  size TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  max_users INTEGER DEFAULT 10,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### kyc_clients

```sql
CREATE TABLE kyc_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations,
  client_type TEXT NOT NULL, -- 'individual' or 'corporate'
  client_name TEXT NOT NULL,
  client_id_number TEXT,
  date_of_birth DATE,
  nationality TEXT,
  country_of_residence TEXT,
  email TEXT,
  phone_number TEXT,
  physical_address TEXT,
  mailing_address TEXT,
  business_activity TEXT,
  industry_sector TEXT,
  registration_number TEXT,
  registration_country TEXT,
  source_of_funds TEXT,
  source_of_wealth TEXT,
  estimated_annual_income NUMERIC,
  estimated_net_worth NUMERIC,
  purpose_of_relationship TEXT,
  expected_transaction_volume NUMERIC,
  expected_transaction_frequency TEXT,
  pep_status BOOLEAN DEFAULT false,
  pep_details TEXT,
  sanctioned_entity BOOLEAN DEFAULT false,
  adverse_media BOOLEAN DEFAULT false,
  base_risk_score NUMERIC,
  current_risk_rating TEXT, -- Low, Medium, Substantial, High, Very High
  current_dd_level TEXT, -- simplified, standard, enhanced
  aml_trigger_activities JSONB,
  client_status TEXT,
  onboarding_status TEXT,
  next_review_date DATE,
  last_review_date DATE,
  review_frequency TEXT, -- annual, semi_annual, quarterly, monthly
  monitoring_frequency TEXT,
  edd_required BOOLEAN DEFAULT false,
  edd_reason TEXT,
  senior_approval_status TEXT,
  senior_approval_date TIMESTAMPTZ,
  senior_approval_by UUID REFERENCES auth.users,
  senior_approval_notes TEXT,
  beneficial_owners JSONB,
  ownership_structure_verified BOOLEAN DEFAULT false,
  relationship_manager_id UUID REFERENCES auth.users,
  compliance_officer_assigned UUID REFERENCES auth.users,
  source_of_funds_verified BOOLEAN DEFAULT false,
  sof_verification_date DATE,
  sof_verified_by UUID REFERENCES auth.users,
  source_of_wealth_verified BOOLEAN DEFAULT false,
  sow_verification_date DATE,
  sow_verified_by UUID REFERENCES auth.users,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### matters

```sql
CREATE TABLE matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations,
  matter_number TEXT,
  matter_name TEXT NOT NULL,
  matter_type TEXT NOT NULL,
  matter_description TEXT,
  service_category TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open, active, on_hold, closed, conflict_pending
  opened_date DATE,
  closed_date DATE,
  expected_completion_date DATE,
  estimated_value NUMERIC,
  actual_value NUMERIC,
  currency TEXT,
  billing_type TEXT,
  hourly_rate NUMERIC,
  fixed_fee_amount NUMERIC,
  involves_client_account BOOLEAN DEFAULT false,
  involves_cross_border BOOLEAN DEFAULT false,
  involves_high_risk_jurisdiction BOOLEAN DEFAULT false,
  high_risk_jurisdiction_list TEXT[],
  risk_level TEXT,
  aml_trigger_activities JSONB,
  responsible_lawyer_id UUID REFERENCES auth.users,
  assigned_team JSONB,
  internal_notes TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### assessments

```sql
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations,
  assessment_date DATE,
  status TEXT DEFAULT 'draft', -- draft, in_progress, completed
  overall_risk_rating TEXT, -- Low, Medium, High
  overall_risk_score NUMERIC,
  assessor_name TEXT,
  assessor_role TEXT,
  completed_at TIMESTAMPTZ,
  module_1_score NUMERIC, -- Inherent Risk
  module_2_score NUMERIC, -- Technical Compliance
  module_3_score NUMERIC, -- Operational Effectiveness / Residual Risk
  module_4_score NUMERIC, -- Institutional Maturity
  module_4_rating TEXT,
  framework_type TEXT NOT NULL DEFAULT 'legal_professionals',
  entity_category TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### role_upgrade_requests

```sql
CREATE TABLE role_upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  organization_id UUID NOT NULL REFERENCES organizations,
  current_user_role TEXT NOT NULL,
  requested_role TEXT NOT NULL,
  justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  approvals_required INTEGER DEFAULT 2,
  approvals_count INTEGER DEFAULT 0,
  approved_by_user_ids UUID[],
  requested_by UUID REFERENCES auth.users,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### new_user_requests

```sql
CREATE TABLE new_user_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  requested_access TEXT NOT NULL, -- staff, compliance_officer, etc.
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, completed
  reviewed_by UUID REFERENCES auth.users,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_user_id UUID REFERENCES auth.users,
  created_by UUID REFERENCES auth.users,
  encrypted_temporary_password TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### new_user_request_approvals

```sql
CREATE TABLE new_user_request_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES new_user_requests ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users,
  approval_status TEXT NOT NULL, -- approved, rejected
  approval_date TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security (RLS)

**Critical:** All tables MUST have RLS enabled with appropriate policies.

**Example Policies:**

```sql
-- User can view their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Management can view all users in their organization
CREATE POLICY "Management can view org users"
ON user_profiles FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('management', 'senior_partner', 'admin')
  )
);

-- Staff can only see their assigned clients
CREATE POLICY "Staff can view assigned clients"
ON kyc_clients FOR SELECT
TO authenticated
USING (
  relationship_manager_id = auth.uid()
  OR compliance_officer_assigned = auth.uid()
  OR organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('management', 'senior_partner', 'compliance_officer', 'admin')
  )
);

-- Staff can only view their assigned matters
CREATE POLICY "Staff can view assigned matters"
ON matters FOR SELECT
TO authenticated
USING (
  responsible_lawyer_id = auth.uid()
  OR organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('management', 'senior_partner', 'compliance_officer', 'admin')
  )
);
```

---

## API Patterns

### Data Loading Pattern

**Parallel queries for performance:**

```javascript
const loadDashboardData = async () => {
  try {
    setLoading(true);

    // Run ALL queries in parallel
    const [clientsRes, mattersRes, assessmentsRes, usersRes] = await Promise.all([
      supabase
        .from('kyc_clients')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),

      supabase
        .from('matters')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),

      supabase
        .from('assessments')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),

      supabase
        .from('user_profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
    ]);

    // Process results
    setClients(clientsRes.data || []);
    setMatters(mattersRes.data || []);
    setAssessments(assessmentsRes.data || []);
    setUsers(usersRes.data || []);

    // Calculate statistics
    calculateStatistics(clientsRes.data, mattersRes.data);

  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    setLoading(false);
  }
};
```

### Error Handling

```javascript
// Check for errors and log them
if (clientsRes.error) {
  console.error('Error loading clients:', clientsRes.error);
}

// Show user-friendly error messages
try {
  // ... operation
} catch (error) {
  console.error('Error:', error);
  alert('Failed to complete operation: ' + error.message);
}
```

### Optional Table Queries

**For tables that may not exist:**

```javascript
const optionalQueries = await Promise.allSettled([
  supabase
    .from('transaction_alerts')
    .select('*')
    .eq('organization_id', organizationId),

  supabase
    .from('matter_aml_alerts')
    .select('*')
    .eq('organization_id', organizationId)
]);

// Check if query succeeded
if (optionalQueries[0].status === 'fulfilled') {
  setTransactionAlerts(optionalQueries[0].value.data || []);
}
```

---

## Security Considerations

### 1. Organization Isolation

**CRITICAL:** Users must ONLY access data from their own organization.

```javascript
// ALWAYS filter by organization_id
const { data } = await supabase
  .from('kyc_clients')
  .select('*')
  .eq('organization_id', profile.organization_id); // REQUIRED

// NEVER query without organization filter (except for admins)
```

### 2. Role-Based Access Control

```javascript
// Check role before allowing actions
const canEdit = ['management', 'senior_partner', 'partner'].includes(profile.role);

// Management roles: Read-only access to most data
// Staff roles: Full access to assigned data only
// Compliance roles: Read-only access to compliance data
```

### 3. Dual Approval System

**Two independent approvers required:**

```javascript
// Check approval logic
const canApprove = (request) => {
  const hasApproved = request.approvals.some(a => a.approver_id === profile.id);
  const isCreator = request.created_by === profile.id;
  return !hasApproved && !isCreator;
};

// Process approval
if (request.approvals_count >= 2) {
  // Create user account
  // Mark request as completed
}
```

### 4. Data Validation

```javascript
// Validate organization exists
if (!profile?.organization_id) {
  alert('Error: No organization found');
  return;
}

// Validate user has required role
const requiredRoles = ['management', 'senior_partner', 'partner'];
if (!requiredRoles.includes(profile.role)) {
  navigate('/unauthorized');
  return;
}
```

### 5. Sensitive Data Handling

```javascript
// Never log sensitive data
console.log('Loading data for org:', profile.organization_id); // OK
console.log('User details:', user); // AVOID - may contain sensitive info

// Clear temporary passwords after use
await supabase
  .from('new_user_requests')
  .update({
    temporary_password: null,
    encrypted_temporary_password: null
  })
  .eq('id', requestId);
```

---

## Implementation Checklist

### Before Implementation

- [ ] Set up Supabase project
- [ ] Create all required database tables
- [ ] Configure Row Level Security policies
- [ ] Set up authentication
- [ ] Create test users with different roles
- [ ] Set up test organization

### Dashboard Components

- [ ] Implement design system (colors, typography, spacing)
- [ ] Create common components (StatCard, LoadingSpinner, Badges)
- [ ] Build Client Management Dashboard
- [ ] Build Compliance Officer Dashboard
- [ ] Build Staff Dashboard
- [ ] Implement navigation between views
- [ ] Add URL state persistence

### Security

- [ ] Verify RLS policies work correctly
- [ ] Test organization data isolation
- [ ] Verify role-based access control
- [ ] Test dual approval system
- [ ] Implement secure password handling
- [ ] Add input validation

### Testing

- [ ] Test with multiple organizations
- [ ] Test with different user roles
- [ ] Test permission boundaries
- [ ] Test data loading performance
- [ ] Test error handling
- [ ] Test on mobile devices

### Optimization

- [ ] Implement parallel data loading
- [ ] Add loading states
- [ ] Optimize database queries
- [ ] Add query result limits
- [ ] Implement pagination where needed

---

## Conclusion

This document provides complete specifications for implementing three interconnected dashboards:

1. **Client Management Dashboard** - Organization oversight and user management
2. **Compliance Officer Dashboard** - Regulatory compliance monitoring
3. **Staff Dashboard** - Personal workload management

**Key Principles:**
- Organization data isolation is MANDATORY
- Role-based access control throughout
- Parallel data loading for performance
- Consistent design system
- Mobile-responsive layouts
- Secure by default

**Next Steps:**
1. Review database schema
2. Set up RLS policies
3. Implement design system
4. Build dashboards iteratively
5. Test thoroughly with multiple roles and organizations

---

**Document Version:** 3.0
**Last Updated:** March 15, 2026
**Status:** Production Ready
