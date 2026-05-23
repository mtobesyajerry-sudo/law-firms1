/*
  # Add mfa_used column to login_history

  The SecurityDashboard MFA column and audit accuracy for FIU inspections
  requires a boolean flag on each login record indicating whether the session
  was elevated to AAL2 via TOTP or backup code.

  Changes:
  - login_history: add mfa_used BOOLEAN NOT NULL DEFAULT FALSE
*/

ALTER TABLE login_history
  ADD COLUMN IF NOT EXISTS mfa_used BOOLEAN NOT NULL DEFAULT FALSE;
