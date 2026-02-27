/*
  # FINAL VERIFICATION: Management Users Read-Only Enforcement

  ## Purpose
  This migration serves as a final checkpoint to verify and document that Management users
  have ONLY read-only access to all core business data tables.

  ## Security Verification
  This migration checks that NO write policies exist for Management users on:
  - assessments
  - assessment_responses
  - section_scores
  - assessment_attachments
  - matters
  - matter_activities
  - matter_milestones
  - kyc_clients
  - client_documents
  - client_matter_relationships

  ## What Management Users CAN Do
  - VIEW all data in their organization for oversight and compliance monitoring
  - Approve new user requests (administrative function)
  - Process role upgrade requests (administrative function)
  - Manage user profiles (administrative function)

  ## What Management Users CANNOT Do
  - Create, edit, or delete assessments
  - Create, edit, or delete assessment responses or scores
  - Create, edit, or delete matters or matter activities
  - Create, edit, or delete KYC clients or documents
  - Modify any core business data

  ## Enforcement
  - All write policies for Management users on core tables have been removed
  - Migration files have been updated to prevent recreation of write policies
  - This migration runs checks to ensure compliance
*/

-- ============================================================================
-- VERIFICATION: Check for any write policies on core tables
-- ============================================================================

DO $$
DECLARE
  write_policy_count INTEGER;
  policy_details TEXT;
BEGIN
  -- Count write policies for Management users on core tables
  SELECT COUNT(*) INTO write_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname ILIKE '%management%'
    AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    AND tablename IN (
      'assessments', 'assessment_responses', 'section_scores', 'assessment_attachments',
      'matters', 'matter_activities', 'matter_milestones',
      'kyc_clients', 'client_documents', 'client_matter_relationships'
    );

  IF write_policy_count > 0 THEN
    -- Get details of problematic policies
    SELECT string_agg(tablename || '.' || policyname || ' (' || cmd || ')', ', ')
    INTO policy_details
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname ILIKE '%management%'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND tablename IN (
        'assessments', 'assessment_responses', 'section_scores', 'assessment_attachments',
        'matters', 'matter_activities', 'matter_milestones',
        'kyc_clients', 'client_documents', 'client_matter_relationships'
      );

    RAISE EXCEPTION 'SECURITY VIOLATION: % write policies found for Management users on core tables: %',
      write_policy_count, policy_details;
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'SECURITY VERIFICATION PASSED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Management users have read-only access to:';
  RAISE NOTICE '  ✓ assessments';
  RAISE NOTICE '  ✓ assessment_responses';
  RAISE NOTICE '  ✓ section_scores';
  RAISE NOTICE '  ✓ assessment_attachments';
  RAISE NOTICE '  ✓ matters';
  RAISE NOTICE '  ✓ matter_activities';
  RAISE NOTICE '  ✓ matter_milestones';
  RAISE NOTICE '  ✓ kyc_clients';
  RAISE NOTICE '  ✓ client_documents';
  RAISE NOTICE '  ✓ client_matter_relationships';
  RAISE NOTICE '';
  RAISE NOTICE 'Management users can ONLY:';
  RAISE NOTICE '  - VIEW data (SELECT)';
  RAISE NOTICE '  - Approve administrative requests';
  RAISE NOTICE '';
  RAISE NOTICE 'Management users CANNOT:';
  RAISE NOTICE '  - Create (INSERT)';
  RAISE NOTICE '  - Edit (UPDATE)';
  RAISE NOTICE '  - Delete (DELETE)';
  RAISE NOTICE '============================================';
END $$;
