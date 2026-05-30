/*
  # Fix kyc_clients_decrypted view — add security_invoker=true

  ## Problem
  The kyc_clients_decrypted view was created without security_invoker=true.
  In Postgres default mode, views run as their owner (postgres/service_role),
  which bypasses RLS on the underlying kyc_clients table. This means any
  authenticated user querying the view can see ALL organisations' clients,
  defeating the entire tenant isolation model.

  ## Fix
  ALTER the view to set security_invoker=true. With this option, the view
  executes RLS checks using the CALLING user's identity and role, so the
  exact same policies that protect kyc_clients also protect the view.

  ## Impact
  - All components that query kyc_clients_decrypted (KycCddForm, AccountantKycForm,
    KycCddReport, AccountantKycReport, StaffDashboard, etc.) will now correctly
    see only their own organisation's clients.
  - No schema changes — columns, decrypt functions, and WHERE clause unchanged.
  - Admins (role=admin, organization_id IS NULL) are unaffected because the
    kyc_clients admin policy already grants them full access.
*/

ALTER VIEW public.kyc_clients_decrypted SET (security_invoker = true);
