# Subscription Management Specifications

Complete specifications for implementing subscription management functionality in the AML Risk Assessment System.

---

## Database Schema

### User Profiles Table Fields

```sql
-- Add these fields to user_profiles table
subscription_expiry_date TIMESTAMPTZ  -- When the subscription expires
suspension_reason TEXT                -- Reason for account suspension
suspended_at TIMESTAMPTZ             -- When the account was suspended
is_active BOOLEAN DEFAULT TRUE       -- Whether user is active
```

### Migration SQL

```sql
/*
  # Add Subscription Management Fields

  1. Changes
    - Add subscription_expiry_date field to track when subscription expires
    - Add suspension_reason field to record why a user was suspended
    - Add suspended_at timestamp to track when suspension occurred

  2. Security
    - Only admins can view and modify subscription fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_expiry_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_expiry_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'suspension_reason'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN suspension_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'suspended_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN suspended_at timestamptz;
  END IF;
END $$;
```

---

## Component State Management

### Required State Variables

```jsx
const [users, setUsers] = useState([]);
const [organizations, setOrganizations] = useState([]);
const [activeTab, setActiveTab] = useState('users');
const [suspendModal, setSuspendModal] = useState({
  show: false,
  userId: null,
  userName: '',
  currentStatus: true
});
const [suspensionReason, setSuspensionReason] = useState('');
const [subscriptionExpiry, setSubscriptionExpiry] = useState('');
```

---

## Data Loading

### Load Users and Organizations

```jsx
const loadData = async () => {
  try {
    const [usersRes, orgsRes] = await Promise.all([
      supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('organizations').select('*').order('created_at', { ascending: false })
    ]);

    if (usersRes.error) throw usersRes.error;
    if (orgsRes.error) throw orgsRes.error;

    setUsers(usersRes.data || []);
    setOrganizations(orgsRes.data || []);
  } catch (error) {
    console.error('Error loading data:', error);
  }
};
```

---

## Core Functions

### 1. Toggle User Status (Suspend/Activate)

```jsx
const toggleUserStatus = async (userId, currentStatus, userName) => {
  if (currentStatus) {
    // Show suspension modal if currently active
    setSuspendModal({ show: true, userId, userName, currentStatus });
    setSuspensionReason('');
  } else {
    // Activate user immediately
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_active: true,
          suspension_reason: null,
          suspended_at: null
        })
        .eq('id', userId);

      if (error) throw error;
      await loadData();
      alert('User activated successfully');
    } catch (error) {
      console.error('Error activating user:', error);
      alert('Error activating user: ' + error.message);
    }
  }
};
```

### 2. Handle User Suspension

```jsx
const handleSuspendUser = async () => {
  try {
    if (!suspensionReason.trim()) {
      alert('Please provide a reason for suspension');
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        is_active: false,
        suspension_reason: suspensionReason,
        suspended_at: new Date().toISOString()
      })
      .eq('id', suspendModal.userId);

    if (error) throw error;
    await loadData();
    setSuspendModal({ show: false, userId: null, userName: '', currentStatus: true });
    setSuspensionReason('');
    alert('User suspended successfully');
  } catch (error) {
    console.error('Error suspending user:', error);
    alert('Error suspending user: ' + error.message);
  }
};
```

### 3. Update Subscription Expiry Date

```jsx
const updateSubscriptionExpiry = async (userId, expiryDate) => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ subscription_expiry_date: expiryDate })
      .eq('id', userId);

    if (error) throw error;
    await loadData();
    alert('Subscription expiry updated successfully');
  } catch (error) {
    console.error('Error updating subscription:', error);
    alert('Error updating subscription: ' + error.message);
  }
};
```

---

## UI Components

### Navigation Tab

```jsx
<button
  onClick={() => setActiveTab('subscriptions')}
  style={{
    ...styles.tab,
    ...(activeTab === 'subscriptions' ? styles.tabActive : {})
  }}
>
  Subscriptions
</button>
```

### Subscription Tab Content

```jsx
{activeTab === 'subscriptions' && (
  <div style={styles.tabContent}>
    <h2 style={styles.sectionTitle}>Subscription Management</h2>

    <div style={styles.subscriptionSection}>
      {/* Active Clients Card */}
      <div style={styles.subscriptionCard}>
        <h3 style={styles.subscriptionCardTitle}>
          Active Clients ({users.filter(u => u.role === 'client' && u.is_active).length})
        </h3>
        <div style={styles.tableContainer}>
          {users.filter(u => u.role === 'client' && u.is_active).length === 0 ? (
            <p style={styles.emptyState}>No active clients</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Organization</th>
                  <th style={styles.th}>Subscription Expiry</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.role === 'client' && u.is_active).map((user) => {
                  const org = organizations.find(o => o.id === user.organization_id);
                  const isExpiringSoon = user.subscription_expiry_date &&
                    new Date(user.subscription_expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  const isExpired = user.subscription_expiry_date &&
                    new Date(user.subscription_expiry_date) < new Date();
                  return (
                    <tr key={user.id} style={styles.tr}>
                      <td style={styles.td}>{user.full_name || '-'}</td>
                      <td style={styles.td}>{user.email}</td>
                      <td style={styles.td}>{org?.name || 'Not assigned'}</td>
                      <td style={styles.td}>
                        <div>
                          {user.subscription_expiry_date ? (
                            <span style={{
                              ...styles.badge,
                              background: isExpired ? '#fee2e2' : isExpiringSoon ? '#fef3c7' : '#d1fae5',
                              color: isExpired ? '#991b1b' : isExpiringSoon ? '#92400e' : '#065f46'
                            }}>
                              {new Date(user.subscription_expiry_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span style={styles.noExpiry}>Not set</span>
                          )}
                          <input
                            type="date"
                            defaultValue={user.subscription_expiry_date?.split('T')[0] || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                updateSubscriptionExpiry(user.id, e.target.value);
                              }
                            }}
                            style={styles.dateInput}
                          />
                        </div>
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => toggleUserStatus(user.id, user.is_active, user.full_name || user.email)}
                          style={styles.actionButton}
                        >
                          Suspend
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Inactive/Suspended Clients Card */}
      <div style={styles.subscriptionCard}>
        <h3 style={styles.subscriptionCardTitle}>
          Inactive/Suspended Clients ({users.filter(u => u.role === 'client' && !u.is_active).length})
        </h3>
        <div style={styles.tableContainer}>
          {users.filter(u => u.role === 'client' && !u.is_active).length === 0 ? (
            <p style={styles.emptyState}>No inactive clients</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Organization</th>
                  <th style={styles.th}>Suspended At</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.role === 'client' && !u.is_active).map((user) => {
                  const org = organizations.find(o => o.id === user.organization_id);
                  return (
                    <tr key={user.id} style={styles.tr}>
                      <td style={styles.td}>{user.full_name || '-'}</td>
                      <td style={styles.td}>{user.email}</td>
                      <td style={styles.td}>{org?.name || 'Not assigned'}</td>
                      <td style={styles.td}>
                        {user.suspended_at ? new Date(user.suspended_at).toLocaleDateString() : '-'}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.suspensionReason}>
                          {user.suspension_reason || 'No reason provided'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => toggleUserStatus(user.id, user.is_active, user.full_name || user.email)}
                          style={styles.activateButton}
                        >
                          Activate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  </div>
)}
```

### Suspend User Modal

```jsx
{suspendModal.show && (
  <div style={styles.modal} onClick={() => setSuspendModal({ show: false, userId: null, userName: '', currentStatus: true })}>
    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
      <h2 style={styles.modalTitle}>Suspend User</h2>
      <p style={styles.modalText}>
        You are about to suspend the following user:
      </p>
      <p style={{ ...styles.modalText, fontWeight: '600' }}>
        {suspendModal.userName}
      </p>
      <div style={styles.formGroup}>
        <label style={styles.label}>Reason for Suspension *</label>
        <textarea
          value={suspensionReason}
          onChange={(e) => setSuspensionReason(e.target.value)}
          placeholder="e.g., Subscription payment overdue, Terms violation, etc."
          style={styles.textarea}
          rows={4}
          required
        />
      </div>
      <p style={{ ...styles.modalText, color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>
        The user will be unable to access the system until reactivated.
      </p>
      <div style={styles.modalActions}>
        <button
          onClick={() => setSuspendModal({ show: false, userId: null, userName: '', currentStatus: true })}
          style={styles.cancelButton}
        >
          Cancel
        </button>
        <button
          onClick={handleSuspendUser}
          style={styles.dangerButton}
        >
          Suspend User
        </button>
      </div>
    </div>
  </div>
)}
```

---

## Styles

### Subscription-Specific Styles

```jsx
subscriptionSection: {
  display: 'flex',
  flexDirection: 'column',
  gap: '32px',
  marginTop: '24px',
},
subscriptionCard: {
  background: '#f7fafc',
  padding: '24px',
  borderRadius: '12px',
  border: '2px solid #e2e8f0',
},
subscriptionCardTitle: {
  margin: '0 0 16px 0',
  fontSize: '20px',
  fontWeight: '700',
  color: '#1a202c',
},
noExpiry: {
  color: '#718096',
  fontSize: '13px',
  fontStyle: 'italic',
},
suspensionReason: {
  fontSize: '13px',
  color: '#718096',
  fontStyle: 'italic',
  display: 'block',
  maxWidth: '300px',
},
dateInput: {
  padding: '4px 8px',
  border: '1px solid #e2e8f0',
  borderRadius: '4px',
  fontSize: '12px',
  marginTop: '4px',
  width: '100%',
},
activateButton: {
  padding: '6px 12px',
  background: '#10b981',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: '600',
},
```

### General UI Styles

```jsx
tabContent: {
  padding: '24px',
},
sectionTitle: {
  fontSize: '24px',
  fontWeight: '700',
  color: '#0a1929',
  margin: '0 0 24px 0',
},
tableContainer: {
  background: 'white',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  border: '1px solid #d4af37',
},
table: {
  width: '100%',
  borderCollapse: 'collapse',
},
th: {
  padding: '16px',
  textAlign: 'left',
  background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
  fontWeight: '700',
  color: '#ffffff',
  fontSize: '14px',
  borderBottom: '3px solid #d4af37',
  letterSpacing: '0.5px',
},
tr: {
  borderBottom: '1px solid #e8eaed',
  transition: 'background 0.2s ease',
},
td: {
  padding: '16px',
  color: '#2d3748',
  fontSize: '14px',
},
badge: {
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: '600',
  display: 'inline-block',
},
actionButton: {
  padding: '6px 12px',
  background: 'transparent',
  color: '#0a1929',
  border: '2px solid #d4af37',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '12px',
  transition: 'all 0.3s ease',
},
emptyState: {
  padding: '40px',
  textAlign: 'center',
  color: '#718096',
  fontSize: '14px',
},
```

### Modal Styles

```jsx
modal: {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
},
modalContent: {
  background: 'white',
  padding: '32px',
  borderRadius: '12px',
  maxWidth: '500px',
  width: '90%',
  border: '2px solid #d4af37',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
},
modalTitle: {
  margin: '0 0 16px 0',
  fontSize: '24px',
  fontWeight: '700',
  color: '#0a1929',
  borderBottom: '2px solid #d4af37',
  paddingBottom: '12px',
},
modalText: {
  margin: '0 0 16px 0',
  fontSize: '14px',
  color: '#2d3748',
},
modalActions: {
  display: 'flex',
  gap: '12px',
  justifyContent: 'flex-end',
},
cancelButton: {
  padding: '10px 24px',
  background: '#f0f0f0',
  color: '#2d3748',
  border: '2px solid #cbd5e0',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '14px',
  transition: 'all 0.3s ease',
},
dangerButton: {
  padding: '10px 24px',
  background: '#ef4444',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '14px',
},
```

### Form Styles

```jsx
formGroup: {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
},
label: {
  display: 'block',
  marginBottom: '8px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#2d3748',
},
textarea: {
  padding: '12px',
  border: '2px solid #cbd5e0',
  borderRadius: '8px',
  fontSize: '14px',
  resize: 'vertical',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
},
```

---

## Business Logic

### Subscription Status Indicators

1. **Active** (Green Badge): `subscription_expiry_date` is more than 30 days away or not set
2. **Expiring Soon** (Yellow Badge): `subscription_expiry_date` is within 30 days
3. **Expired** (Red Badge): `subscription_expiry_date` has passed

```jsx
const isExpiringSoon = user.subscription_expiry_date &&
  new Date(user.subscription_expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const isExpired = user.subscription_expiry_date &&
  new Date(user.subscription_expiry_date) < new Date();
```

### Badge Color Mapping

```jsx
// For subscription expiry
background: isExpired ? '#fee2e2' : isExpiringSoon ? '#fef3c7' : '#d1fae5'
color: isExpired ? '#991b1b' : isExpiringSoon ? '#92400e' : '#065f46'

// For user status
background: user.is_active ? '#d1fae5' : '#fee2e2'
color: user.is_active ? '#065f46' : '#991b1b'
```

---

## Key Features

### 1. Active Clients Management
- View all active client accounts
- See subscription expiry dates with color-coded status
- Update subscription expiry dates via date picker
- Quick suspend action

### 2. Suspended Clients Management
- View all suspended/inactive accounts
- See suspension date and reason
- Quick activate action to restore access

### 3. Suspension Workflow
- Requires mandatory suspension reason
- Records suspension timestamp
- Shows warning message to admin
- Prevents access until reactivation

### 4. Date Management
- Inline date picker for quick updates
- Automatic status calculation
- Visual indicators for expiry status

---

## Color Scheme

**Primary Colors:**
- Gold accent: `#d4af37`
- Dark blue: `#0a1929`
- Light blue: `#1a2f45`

**Status Colors:**
- Success/Active: `#10b981`, `#d1fae5`, `#065f46`
- Warning/Expiring: `#fef3c7`, `#92400e`
- Danger/Expired: `#ef4444`, `#fee2e2`, `#991b1b`
- Neutral: `#718096`, `#f7fafc`, `#e2e8f0`

---

## Security Considerations

1. **Admin Only Access**: Only users with `role='admin'` can access subscription management
2. **Mandatory Suspension Reason**: Requires reason before suspending accounts
3. **Audit Trail**: Records `suspended_at` timestamp for tracking
4. **Immediate Effect**: Suspended users are immediately blocked from system access

---

## Integration Points

### Required Imports

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
```

### Required User Profile Fields

- `id` (UUID)
- `email` (TEXT)
- `full_name` (TEXT)
- `role` (TEXT) - 'admin' or 'client'
- `is_active` (BOOLEAN)
- `organization_id` (UUID, foreign key)
- `subscription_expiry_date` (TIMESTAMPTZ)
- `suspension_reason` (TEXT)
- `suspended_at` (TIMESTAMPTZ)

---

## Usage Example

To implement subscription management in a new component:

1. Copy the state variables section
2. Copy the three core functions (toggleUserStatus, handleSuspendUser, updateSubscriptionExpiry)
3. Add the navigation tab
4. Copy the subscription tab content JSX
5. Copy the suspend modal JSX
6. Copy all required styles
7. Ensure proper data loading with users and organizations

This will give you a complete, functional subscription management system.
