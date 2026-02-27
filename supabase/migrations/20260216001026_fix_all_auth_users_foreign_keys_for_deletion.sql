/*
  # Fix All Foreign Key Constraints for User Deletion

  ## Issue
  Cannot delete users from auth.users because 50+ tables have NO ACTION constraints.
  This prevents user deletion when any related records exist.

  ## Solution
  Update all NO ACTION constraints to either:
  - SET NULL: For audit/tracking fields (who created, modified, reviewed, etc.)
  - CASCADE: For user-owned data that should be deleted with the user

  ## Changes
  Updates foreign key constraints on all tables that reference auth.users
*/

-- Approval workflows
ALTER TABLE approval_workflows
  DROP CONSTRAINT IF EXISTS approval_workflows_current_approver_fkey,
  DROP CONSTRAINT IF EXISTS approval_workflows_initiated_by_fkey;

ALTER TABLE approval_workflows
  ADD CONSTRAINT approval_workflows_current_approver_fkey 
    FOREIGN KEY (current_approver) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT approval_workflows_initiated_by_fkey 
    FOREIGN KEY (initiated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Assessment attachments
ALTER TABLE assessment_attachments
  DROP CONSTRAINT IF EXISTS assessment_attachments_uploaded_by_fkey;

ALTER TABLE assessment_attachments
  ADD CONSTRAINT assessment_attachments_uploaded_by_fkey 
    FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Assessments
ALTER TABLE assessments
  DROP CONSTRAINT IF EXISTS assessments_created_by_fkey;

ALTER TABLE assessments
  ADD CONSTRAINT assessments_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Audit logs
ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_target_user_id_fkey,
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_target_user_id_fkey 
    FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT audit_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Beneficial owners
ALTER TABLE beneficial_owners
  DROP CONSTRAINT IF EXISTS beneficial_owners_verified_by_fkey;

ALTER TABLE beneficial_owners
  ADD CONSTRAINT beneficial_owners_verified_by_fkey 
    FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Data deletion requests
ALTER TABLE data_deletion_requests
  DROP CONSTRAINT IF EXISTS data_deletion_requests_processed_by_fkey;

ALTER TABLE data_deletion_requests
  ADD CONSTRAINT data_deletion_requests_processed_by_fkey 
    FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Data retention policies
ALTER TABLE data_retention_policies
  DROP CONSTRAINT IF EXISTS data_retention_policies_created_by_fkey;

ALTER TABLE data_retention_policies
  ADD CONSTRAINT data_retention_policies_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Document access logs
ALTER TABLE document_access_logs
  DROP CONSTRAINT IF EXISTS document_access_logs_user_id_fkey;

ALTER TABLE document_access_logs
  ADD CONSTRAINT document_access_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Document sharing
ALTER TABLE document_sharing
  DROP CONSTRAINT IF EXISTS document_sharing_shared_by_fkey;

ALTER TABLE document_sharing
  ADD CONSTRAINT document_sharing_shared_by_fkey 
    FOREIGN KEY (shared_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Document versions
ALTER TABLE document_versions
  DROP CONSTRAINT IF EXISTS document_versions_changed_by_fkey;

ALTER TABLE document_versions
  ADD CONSTRAINT document_versions_changed_by_fkey 
    FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Documents
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_deleted_by_fkey,
  DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey,
  DROP CONSTRAINT IF EXISTS documents_verified_by_fkey;

ALTER TABLE documents
  ADD CONSTRAINT documents_deleted_by_fkey 
    FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT documents_uploaded_by_fkey 
    FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT documents_verified_by_fkey 
    FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- EDD workflows
ALTER TABLE edd_workflows
  DROP CONSTRAINT IF EXISTS edd_workflows_approver_fkey,
  DROP CONSTRAINT IF EXISTS edd_workflows_initiated_by_fkey,
  DROP CONSTRAINT IF EXISTS edd_workflows_senior_reviewer_fkey;

ALTER TABLE edd_workflows
  ADD CONSTRAINT edd_workflows_approver_fkey 
    FOREIGN KEY (approver) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT edd_workflows_initiated_by_fkey 
    FOREIGN KEY (initiated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT edd_workflows_senior_reviewer_fkey 
    FOREIGN KEY (senior_reviewer) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enhanced due diligence
ALTER TABLE enhanced_due_diligence
  DROP CONSTRAINT IF EXISTS enhanced_due_diligence_approved_by_fkey,
  DROP CONSTRAINT IF EXISTS enhanced_due_diligence_created_by_fkey;

ALTER TABLE enhanced_due_diligence
  ADD CONSTRAINT enhanced_due_diligence_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT enhanced_due_diligence_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- KYC assessments
ALTER TABLE kyc_assessments
  DROP CONSTRAINT IF EXISTS kyc_assessments_approved_by_fkey,
  DROP CONSTRAINT IF EXISTS kyc_assessments_created_by_fkey;

ALTER TABLE kyc_assessments
  ADD CONSTRAINT kyc_assessments_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT kyc_assessments_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- KYC clients
ALTER TABLE kyc_clients
  DROP CONSTRAINT IF EXISTS kyc_clients_created_by_fkey;

ALTER TABLE kyc_clients
  ADD CONSTRAINT kyc_clients_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Legal documents
ALTER TABLE legal_documents
  DROP CONSTRAINT IF EXISTS legal_documents_created_by_fkey;

ALTER TABLE legal_documents
  ADD CONSTRAINT legal_documents_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Login history
ALTER TABLE login_history
  DROP CONSTRAINT IF EXISTS login_history_user_id_fkey;

ALTER TABLE login_history
  ADD CONSTRAINT login_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Monitoring activities
ALTER TABLE monitoring_activities
  DROP CONSTRAINT IF EXISTS monitoring_activities_created_by_fkey;

ALTER TABLE monitoring_activities
  ADD CONSTRAINT monitoring_activities_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Organizations
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_assigned_user_id_fkey,
  DROP CONSTRAINT IF EXISTS organizations_created_by_fkey;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_assigned_user_id_fkey 
    FOREIGN KEY (assigned_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT organizations_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Review schedules
ALTER TABLE review_schedules
  DROP CONSTRAINT IF EXISTS review_schedules_assigned_to_fkey,
  DROP CONSTRAINT IF EXISTS review_schedules_completed_by_fkey;

ALTER TABLE review_schedules
  ADD CONSTRAINT review_schedules_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT review_schedules_completed_by_fkey 
    FOREIGN KEY (completed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Screening records
ALTER TABLE screening_records
  DROP CONSTRAINT IF EXISTS screening_records_reviewed_by_fkey;

ALTER TABLE screening_records
  ADD CONSTRAINT screening_records_reviewed_by_fkey 
    FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Secure documents
ALTER TABLE secure_documents
  DROP CONSTRAINT IF EXISTS secure_documents_deleted_by_fkey,
  DROP CONSTRAINT IF EXISTS secure_documents_last_accessed_by_fkey;

ALTER TABLE secure_documents
  ADD CONSTRAINT secure_documents_deleted_by_fkey 
    FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT secure_documents_last_accessed_by_fkey 
    FOREIGN KEY (last_accessed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Source verification
ALTER TABLE source_verification
  DROP CONSTRAINT IF EXISTS source_verification_verified_by_fkey;

ALTER TABLE source_verification
  ADD CONSTRAINT source_verification_verified_by_fkey 
    FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- STR workflows
ALTER TABLE str_workflows
  DROP CONSTRAINT IF EXISTS str_workflows_compliance_reviewer_fkey,
  DROP CONSTRAINT IF EXISTS str_workflows_initiated_by_fkey,
  DROP CONSTRAINT IF EXISTS str_workflows_investigator_fkey,
  DROP CONSTRAINT IF EXISTS str_workflows_mlro_reviewer_fkey,
  DROP CONSTRAINT IF EXISTS str_workflows_report_drafter_fkey;

ALTER TABLE str_workflows
  ADD CONSTRAINT str_workflows_compliance_reviewer_fkey 
    FOREIGN KEY (compliance_reviewer) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT str_workflows_initiated_by_fkey 
    FOREIGN KEY (initiated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT str_workflows_investigator_fkey 
    FOREIGN KEY (investigator) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT str_workflows_mlro_reviewer_fkey 
    FOREIGN KEY (mlro_reviewer) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT str_workflows_report_drafter_fkey 
    FOREIGN KEY (report_drafter) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Suspicious activity alerts
ALTER TABLE suspicious_activity_alerts
  DROP CONSTRAINT IF EXISTS suspicious_activity_alerts_resolved_by_fkey,
  DROP CONSTRAINT IF EXISTS suspicious_activity_alerts_user_id_fkey;

ALTER TABLE suspicious_activity_alerts
  ADD CONSTRAINT suspicious_activity_alerts_resolved_by_fkey 
    FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT suspicious_activity_alerts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Suspicious transaction reports
ALTER TABLE suspicious_transaction_reports
  DROP CONSTRAINT IF EXISTS suspicious_transaction_reports_created_by_fkey;

ALTER TABLE suspicious_transaction_reports
  ADD CONSTRAINT suspicious_transaction_reports_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- System alerts
ALTER TABLE system_alerts
  DROP CONSTRAINT IF EXISTS system_alerts_acknowledged_by_fkey,
  DROP CONSTRAINT IF EXISTS system_alerts_assigned_to_fkey,
  DROP CONSTRAINT IF EXISTS system_alerts_resolved_by_fkey;

ALTER TABLE system_alerts
  ADD CONSTRAINT system_alerts_acknowledged_by_fkey 
    FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT system_alerts_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT system_alerts_resolved_by_fkey 
    FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- User sessions
ALTER TABLE user_sessions
  DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

ALTER TABLE user_sessions
  ADD CONSTRAINT user_sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
