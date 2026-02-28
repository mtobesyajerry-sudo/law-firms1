# User Access Requests - System Administrator Dashboard

## Overview

User access requests submitted through the public registration form (via the "Request Access" link at the login page) are now visible and manageable in the **System Administrator Dashboard**.

## What Was Added

### New Tab in Admin Dashboard

A new **"User Access Requests"** tab has been added to the System Administrator Dashboard with:

- **Badge Counter:** Shows the number of pending requests in real-time
- **Full Request Details:** View all submitted information including:
  - Full name
  - Email address
  - Position/title
  - Requested access level (staff, compliance_officer, management)
  - Reason for access request
  - Status (pending, approved, rejected)
  - Submission date

### Administrator Actions

System administrators can now:

1. **Approve Requests:**
   - Creates a new user account
   - Assigns to specified organization (or creates new organization if needed)
   - Generates temporary password
   - Sets `password_change_required` flag
   - Displays credentials to admin for distribution

2. **Reject Requests:**
   - Mark request as rejected
   - Optionally provide rejection reason
   - Records reviewer and timestamp

3. **Delete Requests:**
   - Remove processed (approved/rejected) requests
   - Keeps database clean
   - Requires confirmation

## How It Works

### Request Flow

```
Public User at Login Page
    ↓
Clicks "Request Access"
    ↓
Fills New User Request Form
    ↓
Submits to `new_user_requests` table
    ↓
System Admin sees request in dashboard
    ↓
Admin approves/rejects
    ↓
If approved: User account created with temp password
```

### Approval Process Details

When an admin approves a request:

1. **Email Verification:**
   - Uses email from request
   - Prompts admin if email not provided

2. **Organization Assignment:**
   - Uses organization name from request
   - Searches for existing organization (case-insensitive)
   - Creates new organization if not found
   - Assigns user to that organization

3. **Account Creation:**
   - Calls `create-user` edge function
   - Generates secure temporary password (format: `TempXXXXXXXX!`)
   - Sets role to requested access level
   - Marks account for password change on first login

4. **Request Update:**
   - Marks request as "approved"
   - Records reviewer ID and timestamp
   - Links created user ID

5. **Admin Notification:**
   - Shows success alert with credentials
   - Admin must securely share credentials with user

## Database Changes

### Updated Query

The `loadData()` function now fetches from `new_user_requests`:

```javascript
supabase
  .from('new_user_requests')
  .select('*')
  .order('created_at', { ascending: false })
```

### Table Structure

The `new_user_requests` table contains:
- `id`: Unique request identifier
- `full_name`: User's full name
- `email`: User's email address
- `position`: Job title/position
- `organization_name`: Law firm name
- `phone`: Contact number
- `requested_access`: Desired role (staff, compliance_officer, management)
- `reason`: Explanation for access request
- `status`: pending/approved/rejected
- `reviewed_by`: Admin user ID who processed request
- `reviewed_at`: Timestamp of review
- `rejection_reason`: Reason if rejected
- `created_user_id`: ID of created user account (if approved)
- `encrypted_temporary_password`: Encrypted temp password
- `created_at`: Request submission timestamp

## Security Features

1. **Admin-Only Access:**
   - Only users with `role='admin'` can see this tab
   - RLS policies enforce access control

2. **Audit Trail:**
   - All actions recorded with timestamps
   - Reviewer ID captured
   - Request status tracked

3. **Secure Password Handling:**
   - Temporary passwords auto-generated
   - Force password change on first login
   - Passwords displayed once to admin only

4. **Organization Validation:**
   - Checks for existing organizations
   - Prevents duplicate organization creation
   - Links users to correct law firm

## User Interface

### Tab Layout

```
┌─────────────────────────────────────────────────────┐
│ Law Firm Registrations (2)                          │
│ [User Access Requests (6)] ← New Tab                │
│ Users (15)                                           │
│ Subscriptions                                        │
│ Organizations (8)                                    │
│ Assessments (42)                                     │
│ Content Management                                   │
└─────────────────────────────────────────────────────┘
```

### Request Table

| Full Name | Email | Position | Access | Reason | Status | Submitted | Actions |
|-----------|-------|----------|--------|--------|--------|-----------|---------|
| Sarah John | sara@... | Staff | STAFF | Want to see... | PENDING | 02/23/2026 | [Approve] [Reject] |
| John Deep | jdeep@... | Staff | STAFF | Access My... | APPROVED | 02/23/2026 | [Delete] |

### Status Badges

- **PENDING:** Yellow badge - awaiting admin review
- **APPROVED:** Green badge - account created successfully
- **REJECTED:** Red badge - request denied

### Action Buttons

- **Approve:** Green button - creates user account
- **Reject:** Red button - marks as rejected with optional reason
- **Delete:** Gray button - removes processed requests

## Integration Points

### With Organizations

- Searches existing organizations by name
- Creates new organization if needed
- Sets organization type to "law_firm"
- Assigns created user as organization member

### With User Profiles

- Creates user via `create-user` edge function
- Sets appropriate role based on request
- Links to organization
- Enforces password change requirement

### With Authentication

- Uses Supabase Auth for user creation
- Generates secure temporary passwords
- Handles email verification settings
- Manages user sessions

## Testing the Feature

To test this functionality:

1. **Submit a Request:**
   - Log out if logged in
   - Click "Request Access" at login page
   - Fill out the form completely
   - Submit request

2. **View in Admin Dashboard:**
   - Log in as system administrator
   - Navigate to "User Access Requests" tab
   - Verify request appears with "PENDING" status

3. **Approve Request:**
   - Click "Approve" button
   - Provide email and organization if prompted
   - Note the generated temporary password
   - Verify success message

4. **Test New Account:**
   - Log out as admin
   - Log in with new email and temporary password
   - Verify forced password change
   - Confirm proper role and organization assignment

## Common Scenarios

### Scenario 1: New User for Existing Organization

**Request Details:**
- Email: newuser@bowerassociates.com
- Organization: Bower & Associates
- Role: Staff

**Admin Action:**
1. Approve request
2. System finds existing "Bower & Associates" organization
3. Creates user linked to that organization
4. User joins existing team

### Scenario 2: First User for New Organization

**Request Details:**
- Email: admin@newlawfirm.co.tz
- Organization: New Law Firm
- Role: Management

**Admin Action:**
1. Approve request
2. System creates new organization "New Law Firm"
3. Creates user as first member
4. Organization ready for more users

### Scenario 3: Duplicate or Spam Request

**Request Details:**
- Suspicious email or reason
- Duplicate submission

**Admin Action:**
1. Reject request with reason
2. Or delete if already processed
3. Monitor for patterns

## Benefits

1. **Centralized Management:**
   - All requests in one place
   - System admin has full visibility
   - No requests missed

2. **Streamlined Onboarding:**
   - Quick user creation
   - Automatic organization assignment
   - Immediate access provisioning

3. **Security & Compliance:**
   - Manual approval required
   - Audit trail maintained
   - Proper role assignment enforced

4. **Professional Experience:**
   - Clear request status
   - Organized workflow
   - Timely processing

## Future Enhancements

Potential improvements for this feature:

1. **Email Notifications:**
   - Auto-notify users when approved/rejected
   - Send credentials via secure email
   - Reminder for password change

2. **Bulk Actions:**
   - Approve multiple requests at once
   - Export request data
   - Batch organization assignment

3. **Advanced Filtering:**
   - Filter by status
   - Search by organization
   - Sort by date/role

4. **Request Details Modal:**
   - View full request in popup
   - See additional context
   - Review submission history

5. **Organization Auto-Suggest:**
   - Dropdown of existing organizations
   - Reduce typos and duplicates
   - Faster processing

## Conclusion

The User Access Requests feature in the System Administrator Dashboard provides a complete, secure workflow for managing public registration requests. Administrators now have full control over who accesses the system, ensuring only authorized users from verified law firms can use the platform.

This complements the existing Law Firm Registrations feature (for completely new law firms) and creates a comprehensive user management system.
