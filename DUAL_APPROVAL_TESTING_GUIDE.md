# Dual Approval System - Testing Guide

## Overview
The dual approval system requires **2 out of 3 authorized users** to approve role upgrade requests. This ensures proper oversight and prevents unauthorized access escalation.

## System Verified Working

The dual approval system has been tested and verified with the following results:

### Test Scenario
- **Request**: Anna Schmitz requesting upgrade from Staff to Management
- **Approver 1**: Jack Bower - ✓ Approved successfully
- **Approver 1 retry**: Jack Bower - ✗ Blocked (already approved)
- **Approver 2**: John D. Doe - ✓ Approved successfully
- **Result**: Request fully approved, Anna's role updated to Management

## Test Users Setup

All three users have been granted management access in the database:

1. **Jack Bower**
   - Email: `jb@gmail.com`
   - Role: Management
   - Can approve role upgrade requests
   - Session: `?session=jack`

2. **Anna Schmitz**
   - Email: `as@gmail.com`
   - Role: Staff (has management access for approvals)
   - Can approve role upgrade requests
   - Session: `?session=anna`

3. **John D. Doe**
   - Email: `jdd@gmail.com`
   - Role: Staff (has management access for approvals)
   - Can approve role upgrade requests
   - Session: `?session=john`

## How to Test Dual Approval

### Step 1: Open Three Browser Tabs
1. Click the "Testing as:" button in the bottom-right corner
2. Click "Open All Three Users in New Tabs"
3. Three tabs will open with different session IDs

### Step 2: Login Each Tab
- **Tab 1**: Login as Jack (`jb@gmail.com`)
- **Tab 2**: Login as Anna (`as@gmail.com`)
- **Tab 3**: Login as John (`jdd@gmail.com`)

### Step 3: Navigate to Management Dashboard
In each tab, the user should automatically be routed to `/dashboard/management`

### Step 4: Create a Role Upgrade Request
In one tab (e.g., Anna's):
1. Navigate to the role upgrade section
2. Request an upgrade (e.g., Staff → Management)
3. Provide justification
4. Submit request

### Step 5: First Approval
In Jack's tab:
1. Refresh or navigate to the role upgrade requests section
2. You should see Anna's pending request
3. Click "Approve"
4. You should see: "Approval recorded. 1 of 2 approvals received"
5. The request status should remain "pending"

### Step 6: Verify Single User Cannot Approve Twice
Still in Jack's tab:
1. Try to click "Approve" again
2. The button should be disabled with text "Already Approved"
3. Or you'll see error: "You have already approved this request"

### Step 7: Second Approval
In John's tab:
1. Refresh or navigate to the role upgrade requests section
2. You should see Anna's pending request with 1/2 approvals
3. Click "Approve"
4. You should see: "Request fully approved and role updated"
5. The request status should change to "approved"

### Step 8: Verify Role Was Updated
1. Check Anna's profile/user record
2. Her role should now be updated to the requested role
3. She should have the new permissions

## Expected System Behaviors

### Security Controls
- ✓ Users cannot approve their own requests
- ✓ Users cannot approve the same request twice
- ✓ Only users with management access can approve
- ✓ Requires exactly 2 approvals before role is updated
- ✓ Approval count is tracked accurately
- ✓ Approver information is recorded

### UI Indicators
- Request shows "X of 2 approvals" counter
- List of users who have approved with timestamps
- Approve button disabled after user approves
- Status badge changes: Pending → Approved
- Success messages indicate approval progress

### Database Records
- Each approval creates a record in `role_upgrade_approvals`
- Request's `approvals_count` increments correctly
- Request's `approved_by_user_ids` array updated
- User's role updated only after 2nd approval

## Troubleshooting

### "You do not have management access"
- Check the user has a record in `organization_user_access`
- Verify `is_active = true`
- Ensure user belongs to correct organization

### Cannot see pending requests
- Verify you're logged into the correct organization
- Check RLS policies allow viewing organization requests
- Ensure requests exist with status = 'pending'

### Approval not counting
- Check browser console for errors
- Verify `process_role_upgrade_approval` function exists
- Ensure database schema has required columns:
  - `approvals_count`
  - `approvals_required`
  - `approved_by_user_ids`

### Role not updating after 2 approvals
- Check if `approvals_count >= approvals_required`
- Verify `user_profiles` table update permissions
- Look for errors in function execution

## Technical Details

### Database Tables
- `organization_user_access` - Tracks who can approve (max 3 users)
- `role_upgrade_requests` - Stores requests with approval counts
- `role_upgrade_approvals` - Individual approval records

### Key Function
```sql
process_role_upgrade_approval(request_id, approver_id)
```
Returns JSON with:
- `success` (boolean)
- `fully_approved` (boolean)
- `approvals_count` (integer)
- `message` (string)

### Approval Logic
1. Verify approver has management access
2. Check approver is not the requester
3. Check approver hasn't already approved
4. Insert approval record
5. Increment approval count
6. If count >= required (2):
   - Update request status to 'approved'
   - Update user's role
   - Return fully_approved = true
7. Otherwise return current progress

## Real-World Usage

In production, this system ensures:
- No single person can escalate privileges
- All role changes require peer review
- Clear audit trail of who approved what
- Prevents unauthorized access
- Enforces organizational hierarchy

## Success Criteria

The dual approval system is working correctly if:
1. ✓ Request creation succeeds
2. ✓ First approval increments counter to 1/2
3. ✓ Same user blocked from approving twice
4. ✓ Second approval from different user succeeds
5. ✓ Request marked as approved after 2nd approval
6. ✓ User's role updated automatically
7. ✓ All approvals recorded in database
8. ✓ UI reflects status changes in real-time
