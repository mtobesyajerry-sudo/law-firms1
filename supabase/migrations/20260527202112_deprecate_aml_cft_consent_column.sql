/*
  # Deprecate aml_cft_consent column

  The aml_cft_consent column on management_user_registrations is no longer
  written to by the registration form. Consent is not the correct legal basis
  for operating an AML compliance tool; the column is kept to preserve existing
  row data and avoid a breaking schema change, but is treated as deprecated.

  No application code writes to this column going forward.
  The column will be removed in a future cleanup migration once confirmed safe.
*/

-- Mark as deprecated via a comment on the column (no data risk)
COMMENT ON COLUMN management_user_registrations.aml_cft_consent
  IS 'DEPRECATED — no longer written by the registration form as of 2026-05-27. Legal basis for AML tool usage is not consent. Retained for historical row data only.';
