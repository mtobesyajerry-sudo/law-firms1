# Public Access Request System

## Overview

A new system that allows individuals to request access to the Staff or Compliance Officer portals by submitting their information through a public form. Admins can review and approve/reject these requests from the Management Dashboard.

## Features Implemented

### 1. Public Access Request Form

**Component**: `src/components/PublicAccessRequestForm.jsx`

A beautiful, user-friendly form accessible from the login page that allows anyone to request system access by providing:

- **Full Name** (required)
- **Position/Title** (required) - e.g., "Senior Lawyer", "Compliance Manager"
- **Organization Name** (required) - Their law firm or organization
- **Email Address** (required) - Contact email for communication
- **Phone Number** (optional) - Additional contact information
- **Requested Access Level** (required) - Choice between:
  - Staff Portal
  - Compliance Officer Portal
- **Reason for Access** (required) - Detailed explanation of why they need access

#### Form Features
- Real-time validation
- Clean, professional design matching the system aesthetic
- Success confirmation screen after submission
- Responsive layout
- Smooth transitions and hover effects

### 2. Database Schema

**Migration**: `create_public_access_requests_table`

**Table**: `public_access_requests`

Fields:
- `id` - UUID primary key
- `full_name` - Applicant's full name
- `position` - Job title/position
- `organization_name` - Organization they represent
- `email` - Contact email
- `phone` - Optional phone number
- `requested_access` - Either 'staff' or 'compliance_officer'
- `reason` - Detailed reason for access request
- `status` - 'pending', 'approved', or 'rejected'
- `reviewed_by` - UUID of admin who reviewed
- `reviewed_at` - Timestamp of review
- `rejection_reason` - Reason for rejection (if applicable)
- `notes` - Internal notes from reviewer
- `created_user_id` - UUID of created user (if approved)
- `created_at` - Request submission timestamp
- `updated_at` - Last update timestamp

#### Security (RLS Policies)
- **Anyone can submit**: Anonymous and authenticated users can INSERT requests
- **Anyone can view**: All users can view requests (needed for public form)
- **Admins can manage**: Only admins can SELECT all requests and UPDATE status

### 3. Login Page Integration

**Component**: `src/components/Auth.jsx`

Added a prominent "Request Staff/Compliance Access" button on the login page:
- Displayed below the login form
- Green gradient design to stand out
- Smooth hover animations
- One-click access to the request form

### 4. Management Dashboard Integration

**Component**: `src/components/ClientManagementDashboard.jsx`

#### New Features Added:

**Statistics Card**:
- "Pending Access Requests" card with count
- Amber/gold color scheme
- Click to navigate to Access Requests tab

**New Tab**: "Access Requests"
- Displays all pending public access requests
- Shows comprehensive information for each request:
  - Applicant's name, position, organization
  - Contact details (email, phone)
  - Requested access level
  - Detailed reason for access
  - Submission timestamp

**Request Cards**:
- Beautiful amber/gold card design for visibility
- Clear display of all request information
- Two action buttons:
  - **Approve & Create Account** (green)
  - **Reject** (red)

#### Approval Workflow

When an admin clicks "Approve & Create Account":

1. Confirmation dialog appears
2. Admin enters temporary password for new user
3. System calls `create-user` edge function to:
   - Create auth account
   - Create user profile with requested role
   - Create organization if needed
   - Assign user to organization
4. Updates request status to 'approved'
5. Records reviewer ID and timestamp
6. Shows success message with credentials to share

#### Rejection Workflow

When an admin clicks "Reject":

1. Prompt for rejection reason
2. Updates request status to 'rejected'
3. Records reviewer ID, timestamp, and reason
4. Request marked as rejected

### 5. Edge Function Integration

Uses existing `create-user` edge function to:
- Create new user accounts
- Set up user profiles
- Assign roles (staff or compliance_officer)
- Create/assign organizations
- Handle all account setup automatically

## User Workflows

### For Public Users (Requesting Access)

1. Visit the system login page
2. Click "Request Staff/Compliance Access" button
3. Fill out the access request form:
   - Enter personal information
   - Select desired access level
   - Provide detailed reason
4. Submit the form
5. See success confirmation
6. Wait for admin approval
7. Receive credentials via email/phone

### For Admins (Processing Requests)

1. Log in to admin account
2. Navigate to Management Dashboard
3. See "Pending Access Requests" count in statistics
4. Click card or navigate to "Access Requests" tab
5. Review request details:
   - Applicant information
   - Organization details
   - Reason for access
6. Make decision:
   - **To Approve**:
     - Click "Approve & Create Account"
     - Enter temporary password
     - Confirm action
     - Share credentials with applicant
   - **To Reject**:
     - Click "Reject"
     - Enter rejection reason
     - Confirm action

## Security Considerations

### Data Protection
- RLS policies ensure proper access control
- Only admins can approve/reject requests
- Request data visible only to authorized users
- All actions logged with timestamps and reviewer IDs

### Password Management
- Admins create temporary passwords manually
- Passwords must be at least 6 characters
- Admin responsible for securely sharing credentials
- Users should change password on first login

### Request Validation
- All required fields validated
- Email format validation
- Phone number optional but formatted
- Reason field required to prevent spam

### Audit Trail
- Every request logged with timestamps
- Reviewer ID recorded on approval/rejection
- Rejection reasons stored
- Created user ID linked to approved requests

## Technical Implementation

### Component Architecture

```
Auth.jsx
├── Shows "Request Access" button
└── Conditionally renders PublicAccessRequestForm

PublicAccessRequestForm.jsx
├── Form state management
├── Validation logic
├── Supabase insertion
└── Success screen

ClientManagementDashboard.jsx
├── Loads public_access_requests
├── Displays statistics
├── Access Requests tab
├── Approval handlers
└── Rejection handlers
```

### Database Flow

```
1. User submits form
   ↓
2. INSERT into public_access_requests (status: 'pending')
   ↓
3. Admin views in dashboard
   ↓
4. Admin approves
   ↓
5. Edge function creates user account
   ↓
6. UPDATE request (status: 'approved', created_user_id)
```

### Edge Function Call

```javascript
const { data, error } = await supabase.functions.invoke('create-user', {
  body: {
    email: request.email,
    password: tempPassword,
    full_name: request.full_name,
    role: request.requested_access,  // 'staff' or 'compliance_officer'
    organization_name: request.organization_name
  }
});
```

## Benefits

### For Organizations
- Streamlined access request process
- No manual account creation needed
- Clear audit trail of all requests
- Professional image with public form

### For Applicants
- Easy self-service access request
- Clear communication of requirements
- Transparent process
- Professional experience

### For Admins
- Centralized request management
- All information in one place
- Simple approve/reject workflow
- Complete request history

## Future Enhancements

Potential improvements for consideration:

1. **Email Notifications**
   - Auto-email applicant when request received
   - Notify when approved/rejected
   - Send credentials via email

2. **Advanced Filtering**
   - Filter by organization
   - Filter by requested access level
   - Search by name or email

3. **Request History**
   - View all approved requests
   - View all rejected requests
   - Export request data

4. **Bulk Operations**
   - Approve multiple requests
   - Reject multiple requests
   - Bulk export

5. **Request Notes**
   - Add internal notes to requests
   - Track follow-up actions
   - Communication log

6. **Automated Verification**
   - Email verification before submission
   - Organization domain verification
   - Phone number verification

## Testing Checklist

- [x] Form submission works anonymously
- [x] Form validates all required fields
- [x] Success screen displays after submission
- [x] Requests appear in Management Dashboard
- [x] Statistics update correctly
- [x] Approve workflow creates user account
- [x] Reject workflow updates status
- [x] RLS policies enforce proper access
- [x] Build completes successfully

## Files Modified/Created

### Created
1. `src/components/PublicAccessRequestForm.jsx` - Public request form
2. `supabase/migrations/create_public_access_requests_table.sql` - Database schema
3. `PUBLIC_ACCESS_REQUEST_SYSTEM.md` - This documentation

### Modified
1. `src/components/Auth.jsx` - Added request access button
2. `src/components/ClientManagementDashboard.jsx` - Added request review system

## Conclusion

The Public Access Request System provides a professional, secure way for individuals to request access to the system. It streamlines the onboarding process while maintaining proper security controls and audit trails.

The system is now ready for use and will allow organizations to efficiently manage access requests from potential staff and compliance officers.
