# Multi-User Testing Guide

## Overview
The application now supports simultaneous testing with multiple users in separate browser tabs. Each tab maintains its own isolated session using URL query parameters.

## How It Works

### Session Isolation
- Each browser tab can maintain a different user session
- Sessions are isolated using the `?session=<id>` URL parameter
- Different sessions use different localStorage keys, preventing conflicts

### Test Users
Three test users are configured for Bower & Associates:

1. **Jack Bower** (Management)
   - Email: `jb@gmail.com`
   - Session ID: `jack`
   - Color: Blue
   - Can approve requests

2. **Anna Schmitz** (Staff)
   - Email: `as@gmail.com`
   - Session ID: `anna`
   - Color: Green
   - Can approve requests

3. **John D. Doe** (Staff)
   - Email: `jdd@gmail.com`
   - Session ID: `john`
   - Color: Orange
   - Can approve requests

## Testing Instructions

### Quick Start - Open All Three Users
1. Open the application in your browser
2. Look for the floating "Testing as:" button in the bottom-right corner
3. Click the button to open the Session Switcher panel
4. Click "Open All Three Users in New Tabs"
5. Three new tabs will open, each with a different session ID

### Login Each Tab
For each tab, log in with the respective user credentials:
- **Tab 1 (Jack)**: `jb@gmail.com`
- **Tab 2 (Anna)**: `as@gmail.com`
- **Tab 3 (John)**: `jdd@gmail.com`

### Manual Session Switching
You can also manually add session parameters to URLs:
- Jack: `http://localhost:5173/?session=jack`
- Anna: `http://localhost:5173/?session=anna`
- John: `http://localhost:5173/?session=john`

## What to Test

### Multi-User Collaboration Features

1. **Shared Client Dashboard**
   - All three users belong to the same organization (Bower & Associates)
   - They should all see the same clients and data
   - Test viewing the same client simultaneously from different tabs

2. **Dual Approval Workflows**
   - Create approval requests in one tab
   - See them appear in real-time in other tabs
   - Test approving/rejecting from different user accounts

3. **Access Request Management**
   - Test Jack (management) approving access requests
   - Verify Anna and John can see updates

4. **Role-Based Permissions**
   - Jack has management access (can approve, manage users)
   - Anna and John have staff access (limited permissions)
   - Test that each user sees appropriate UI elements

5. **Real-Time Updates**
   - Make changes in one tab
   - Refresh other tabs to see updates
   - Test concurrent data access

## Session Switcher Features

### Current Session Indicator
- Shows which test user you're currently using
- Color-coded for easy identification
- Always visible in bottom-right corner

### Switch Users
- Click "Switch" to change the current tab to a different user
- Page will reload with new session ID

### Open in New Tab
- Click the "↗" button to open a specific user in a new tab
- Keeps current tab unchanged

### Reset to Default
- Removes the session parameter
- Returns to standard authentication behavior

## Technical Details

### Storage Keys
- Default session: `supabase.auth.token`
- Jack's session: `sb-session-jack`
- Anna's session: `sb-session-anna`
- John's session: `sb-session-john`

### Implementation
- Modified `src/supabaseClient.js` to use dynamic storage keys
- Added `src/components/SessionSwitcher.jsx` for UI controls
- Sessions persist in localStorage with unique keys

## Troubleshooting

### If sessions get mixed up:
1. Click "Reset to Default Session" in the Session Switcher
2. Clear browser localStorage
3. Refresh the page

### If you can't log in to a specific session:
1. Make sure you're using the correct email for that session
2. Check the URL has the right session parameter
3. Try logging out and back in

### To verify which session you're using:
1. Open the Session Switcher panel
2. Check "Currently Logged In" section
3. Look at the URL parameter

## Benefits

This testing setup allows you to:
- Test collaboration features without multiple devices
- Verify role-based access controls
- Debug concurrent user scenarios
- Demonstrate multi-user capabilities
- Test dual approval workflows in real-time

## Notes

- This feature is designed for testing and demonstration purposes
- In production, each user would naturally use their own device/browser
- Session isolation is achieved through URL parameters and storage keys
- All sessions use the same Supabase backend, so data is truly shared
