# BRELA Number Multi-User Registration System

## Overview

The BRELA number is the **critical identifier** that allows multiple users from the same law firm to register without duplicating firm information. This guide explains how the system works and how it's displayed.

## How It Works

### First User Registration (Primary Contact)

1. User visits the registration page
2. Enters their law firm's BRELA number
3. System checks if this BRELA number already exists in approved registrations
4. If not found, user is marked as `is_primary_contact: true` and enters full firm details:
   - Law firm name
   - Firm email
   - TLS registration number
   - User details (name, email, position, mobile)

### Subsequent Users (Users 2 & 3)

1. User visits the registration page
2. Enters the **same BRELA number** as the first user
3. System detects existing approved registration with this BRELA number
4. System **automatically pre-fills** firm information:
   - Law firm name (read-only)
   - Firm email (read-only)
   - TLS registration number (read-only)
5. User only needs to enter their personal details:
   - Full name
   - Email address
   - Position in firm
   - Mobile number

### Key Database Logic

```javascript
// In Auth.jsx registration flow
const { data: existingRegs } = await supabase
  .from('management_user_registrations')
  .select('id')
  .eq('brela_registration_number', brelaRegistrationNumber)
  .eq('registration_status', 'approved');

const isPrimaryContact = !existingRegs || existingRegs.length === 0;
const registrationSequence = (existingRegs?.length || 0) + 1;
```

## BRELA Number Display Locations

### 1. Admin Dashboard - Pending Registrations Tab

Location: `ManagementUserApproval.jsx` (line 351)

```jsx
<div style={styles.firmHeader}>
  <div>
    <div style={styles.firmName}>{firm.law_firm_name}</div>
    <div style={styles.brelaNumber}>BRELA: {firm.brela}</div>
  </div>
  <div style={styles.userCountBadge}>
    {firm.registrations.filter(r => r.registration_status === 'approved').length}/3 Approved
  </div>
</div>
```

**Display Style:**
- Shown under the law firm name
- Gray text, smaller font
- Format: "BRELA: 123456789"
- Groups all registrations with the same BRELA number together

### 2. System Admin Dashboard - Recent Law Firms Table

Location: `SystemAdminDashboard.jsx` (line 426, 446)

```jsx
<th style={styles.th}>BRELA Number</th>
...
<td style={styles.td}>
  <span style={{
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#0a1929',
    fontWeight: '600'
  }}>
    {org.brela_registration || 'N/A'}
  </span>
</td>
```

**Display Style:**
- Dedicated column in organizations table
- Monospace font for easy readability
- Shows as "N/A" if not set
- Dark text, medium weight

### 3. System Admin Dashboard - Organizations Tab

Location: `SystemAdminDashboard.jsx` (line 527, 552)

```jsx
<th style={styles.th}>BRELA Number</th>
...
<span style={{
  fontFamily: 'monospace',
  fontSize: '13px',
  color: '#0a1929',
  fontWeight: '600',
  background: '#f1f5f9',
  padding: '4px 8px',
  borderRadius: '6px'
}}>
  {org.brela_registration || 'N/A'}
</span>
```

**Display Style:**
- Dedicated column in full organizations list
- Monospace font with gray background badge
- Rounded corners, subtle padding
- Easy to scan and copy

## Database Schema

### management_user_registrations Table

```sql
CREATE TABLE management_user_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brela_registration_number text NOT NULL,  -- The critical identifier
  law_firm_name text NOT NULL,
  tls_registration_number text,
  firm_email text NOT NULL,
  user_full_name text NOT NULL,
  user_email text NOT NULL,
  user_position text NOT NULL,
  mobile_number text,
  is_primary_contact boolean DEFAULT false,
  existing_organization_id uuid,           -- Links to existing org if found
  registration_sequence integer DEFAULT 1, -- 1, 2, or 3
  registration_status text DEFAULT 'pending',
  ...
);
```

### organizations Table

```sql
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brela_registration text,  -- Stored here after approval
  tls_registration text,
  contact_email text NOT NULL,
  law_firm_type text,
  ...
);
```

## Approval Process

When an admin approves a registration:

1. **First User (Primary Contact)**
   - Creates new organization with BRELA number
   - Creates user profile linked to organization
   - Sets organization subscription details

2. **Second & Third Users**
   - Looks up existing organization by BRELA number
   - Creates user profile linked to same organization
   - Does NOT create duplicate organization
   - Organization remains unchanged

### Approval Code Logic

```javascript
// In ManagementUserApproval.jsx
let organizationId = registration.existing_organization_id;

if (!organizationId && registration.is_primary_contact) {
  // Create new organization only for primary contact
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: registration.law_firm_name,
      brela_registration: registration.brela_registration_number,
      tls_registration: registration.tls_registration_number,
      contact_email: registration.firm_email,
      law_firm_type: registration.law_firm_type || 'small_firm',
      business_type: 'law_firm',
      max_users: 3,
      created_by: user.id
    })
    .select()
    .single();
}
```

## Benefits of BRELA-Based Registration

1. **No Duplicate Organizations**: Same BRELA number = Same organization
2. **Reduced Data Entry**: Users 2 & 3 don't re-enter firm details
3. **Data Integrity**: All users from same firm linked to same organization
4. **Easy Management**: Admins see users grouped by BRELA number
5. **Audit Trail**: Can track which user was primary contact vs subsequent users

## Testing the System

### Test Scenario

1. **User 1 - Jack Bower** registers with BRELA: 123456789
   - Enters full firm details for "Bower & Associates"
   - Status: Pending, Primary Contact: Yes

2. **Admin** approves Jack Bower
   - Creates organization "Bower & Associates" with BRELA 123456789
   - Creates user account for Jack

3. **User 2 - Sarah Smith** registers with BRELA: 123456789
   - System auto-fills "Bower & Associates" details
   - Sarah only enters personal info
   - Status: Pending, Primary Contact: No

4. **Admin** approves Sarah Smith
   - Looks up existing org by BRELA 123456789
   - Creates user account for Sarah
   - Links to same organization as Jack

5. **User 3 - John Doe** registers with BRELA: 123456789
   - System auto-fills "Bower & Associates" details
   - John only enters personal info
   - Status: Pending, Primary Contact: No

6. **Admin** approves John Doe
   - Looks up existing org by BRELA 123456789
   - Creates user account for John
   - Links to same organization as Jack & Sarah
   - Organization now has 3/3 management users

## Important Notes

1. BRELA number must be entered **exactly the same** by all users from the same firm
2. Maximum of **3 management users** per organization
3. Only the **first user** needs to enter full firm details
4. BRELA number is displayed prominently to help admins verify registrations
5. System prevents duplicate organizations through BRELA number matching

## Fixed Issues (2026-02-28)

1. **Column Name Mismatch**:
   - Fixed references from `brela_registration_number` to `brela_registration` in SystemAdminDashboard
   - Database uses `brela_registration` in organizations table
   - Registration table uses `brela_registration_number`

2. **Edge Function Parameter**:
   - Fixed from `created_by: user.id` to `admin_user_id: user.id`
   - Edge function expects `admin_user_id` for validation

3. **Law Firm Type Constraint**:
   - Fixed from `'Private Practice'` to `'small_firm'`
   - Matches database constraint values
