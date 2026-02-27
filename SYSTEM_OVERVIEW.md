# AML/CFT/CPF Risk Assessment System - Role-Based Access

## System Architecture

This system implements a comprehensive role-based access control (RBAC) architecture with two distinct user types: Administrators and Client Users.

## User Roles

### 1. Administrator Role
**Purpose**: System management and oversight

**Capabilities**:
- Full system access to all data (read-only for oversight)
- Create and manage client user accounts
- Create organizations and assign them to clients
- View all assessments across all organizations
- Activate or deactivate user accounts
- Monitor compliance activities system-wide

**Access Level**: Unrestricted access to all tables and records

### 2. Client Role
**Purpose**: Conduct risk assessments for assigned organization

**Capabilities**:
- Access only their assigned organization
- Create and manage assessments for their organization
- View and complete risk assessment questionnaires
- Generate compliance reports
- Track remediation actions

**Access Level**: Restricted to assigned organization data only

## Key Features

### Automatic Admin Assignment
- The first user to sign up automatically receives the admin role
- All subsequent users are created as clients by the admin
- This ensures proper system initialization

### User Account Management (Admin Only)
Admins can:
- Create client accounts with email and password
- Assign organizations to clients
- Toggle user account status (active/inactive)
- View all user activity

### Organization Assignment
- Each client user can be assigned to one organization
- Organizations can only be created by admins
- Assignment links the client to specific organization data
- Clients without assigned organizations see a notification

### Data Isolation
- Row-Level Security (RLS) enforces strict data separation
- Clients cannot see other organizations' data
- Admins have oversight access while maintaining security
- All database operations respect role permissions

## Database Schema

### New Tables
**user_profiles**
- Links auth.users to application roles
- Stores role (admin/client)
- Tracks organization assignment for clients
- Manages account status

### Updated Tables
**organizations**
- Added `assigned_user_id` to link to client users
- Maintains organization-user relationship

## Authentication Flow

### Sign Up (First User)
1. User signs up with email/password
2. Trigger automatically creates user_profile with admin role
3. User gains full admin access

### Sign Up (Admin Creating Client)
1. Admin navigates to user management
2. Creates user with credentials
3. System creates auth user and profile with client role
4. Admin assigns organization to client

### Sign In
1. User authenticates
2. System loads user profile including role
3. App routes to appropriate dashboard:
   - Admin → AdminDashboard (all data)
   - Client → Dashboard (assigned org only)

## Security Implementation

### Row-Level Security Policies

**Admin Policies**: Allow full access to all tables
- Can SELECT, INSERT, UPDATE, DELETE on all records
- Used for system management and oversight

**Client Policies**: Restrict to assigned organization
- Can only access data where organization matches assignment
- Enforced at database level (cannot be bypassed)

### Route Protection
- Protected routes check authentication
- Admin-only routes verify role
- Automatic redirect if access denied

## User Interface

### Admin Dashboard
**Three Tabs**:
1. **Users**: Manage client accounts
2. **Organizations**: Create and assign organizations
3. **Assessments**: View all system assessments

### Client Dashboard
**Simplified View**:
- Organization details
- List of assessments
- Create new assessment button
- No access to user management

## Typical Workflows

### Admin Workflow: Onboard New Client
1. Sign in to admin dashboard
2. Go to Users tab → Create User
3. Enter client details (name, email, password)
4. Go to Organizations tab → Create Organization
5. Assign organization to the new client user
6. Provide credentials to client

### Client Workflow: Complete Assessment
1. Sign in with provided credentials
2. View assigned organization
3. Click "New Assessment"
4. Complete all 13 sections
5. Review risk report
6. Add remediation actions

## Technical Details

### Database Trigger
- `handle_new_user()` function automatically creates user profiles
- Runs on INSERT to auth.users table
- First user gets admin role, others get client role

### Role Checking
- React context provides role information
- `isAdmin` and `isClient` helper properties
- Conditional rendering based on role

### RLS Enforcement
All queries automatically filtered by:
- User authentication status
- User role (admin/client)
- Organization assignment (for clients)

## Benefits

1. **Security**: Strong data isolation between organizations
2. **Scalability**: Support multiple organizations and clients
3. **Compliance**: Clear audit trail of user actions
4. **Usability**: Role-appropriate interfaces
5. **Control**: Centralized user and organization management

## Future Enhancements

Potential additions:
- Multiple admins with different permission levels
- Clients assigned to multiple organizations
- Granular permissions within roles
- Activity logging and audit trails
- Email invitations with temporary passwords
- Role delegation capabilities
