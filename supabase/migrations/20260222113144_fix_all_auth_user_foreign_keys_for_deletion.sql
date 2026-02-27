/*
  # Fix all auth.users foreign key constraints for user deletion

  1. Changes
    - Update all foreign key constraints referencing auth.users
    - Change from NO ACTION to SET NULL for audit trail columns (created_by, modified_by, etc.)
    - This allows users to be deleted without cascading deletes
    - Preserves data integrity while maintaining audit history
    
  2. Security
    - Maintains referential integrity
    - Preserves audit trails by setting to NULL instead of deleting records
    - Allows proper user account cleanup
*/

-- Organizations table
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_created_by_fkey;
ALTER TABLE organizations ADD CONSTRAINT organizations_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_assigned_user_id_fkey;
ALTER TABLE organizations ADD CONSTRAINT organizations_assigned_user_id_fkey 
  FOREIGN KEY (assigned_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Assessments table
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_created_by_fkey;
ALTER TABLE assessments ADD CONSTRAINT assessments_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Assessment attachments
ALTER TABLE assessment_attachments DROP CONSTRAINT IF EXISTS assessment_attachments_uploaded_by_fkey;
ALTER TABLE assessment_attachments ADD CONSTRAINT assessment_attachments_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- KYC Clients
ALTER TABLE kyc_clients DROP CONSTRAINT IF EXISTS kyc_clients_created_by_fkey;
ALTER TABLE kyc_clients ADD CONSTRAINT kyc_clients_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE kyc_clients DROP CONSTRAINT IF EXISTS kyc_clients_last_modified_by_fkey;
ALTER TABLE kyc_clients ADD CONSTRAINT kyc_clients_last_modified_by_fkey 
  FOREIGN KEY (last_modified_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE kyc_clients DROP CONSTRAINT IF EXISTS kyc_clients_approved_by_fkey;
ALTER TABLE kyc_clients ADD CONSTRAINT kyc_clients_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE kyc_clients DROP CONSTRAINT IF EXISTS kyc_clients_relationship_manager_id_fkey;
ALTER TABLE kyc_clients ADD CONSTRAINT kyc_clients_relationship_manager_id_fkey 
  FOREIGN KEY (relationship_manager_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Client documents
ALTER TABLE client_documents DROP CONSTRAINT IF EXISTS client_documents_uploaded_by_fkey;
ALTER TABLE client_documents ADD CONSTRAINT client_documents_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE client_documents DROP CONSTRAINT IF EXISTS client_documents_verified_by_fkey;
ALTER TABLE client_documents ADD CONSTRAINT client_documents_verified_by_fkey 
  FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Matters
ALTER TABLE matters DROP CONSTRAINT IF EXISTS matters_created_by_fkey;
ALTER TABLE matters ADD CONSTRAINT matters_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE matters DROP CONSTRAINT IF EXISTS matters_responsible_lawyer_id_fkey;
ALTER TABLE matters ADD CONSTRAINT matters_responsible_lawyer_id_fkey 
  FOREIGN KEY (responsible_lawyer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Client matter relationships
ALTER TABLE client_matter_relationships DROP CONSTRAINT IF EXISTS client_matter_relationships_created_by_fkey;
ALTER TABLE client_matter_relationships ADD CONSTRAINT client_matter_relationships_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Conflict checks
ALTER TABLE conflict_checks DROP CONSTRAINT IF EXISTS conflict_checks_created_by_fkey;
ALTER TABLE conflict_checks ADD CONSTRAINT conflict_checks_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE conflict_checks DROP CONSTRAINT IF EXISTS conflict_checks_resolved_by_fkey;
ALTER TABLE conflict_checks ADD CONSTRAINT conflict_checks_resolved_by_fkey 
  FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE conflict_checks DROP CONSTRAINT IF EXISTS conflict_checks_approved_by_senior_partner_fkey;
ALTER TABLE conflict_checks ADD CONSTRAINT conflict_checks_approved_by_senior_partner_fkey 
  FOREIGN KEY (approved_by_senior_partner) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Matter risk assessments
ALTER TABLE matter_risk_assessments DROP CONSTRAINT IF EXISTS matter_risk_assessments_assessed_by_fkey;
ALTER TABLE matter_risk_assessments ADD CONSTRAINT matter_risk_assessments_assessed_by_fkey 
  FOREIGN KEY (assessed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- DD workflow states
ALTER TABLE dd_workflow_states DROP CONSTRAINT IF EXISTS dd_workflow_states_assigned_to_fkey;
ALTER TABLE dd_workflow_states ADD CONSTRAINT dd_workflow_states_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE dd_workflow_states DROP CONSTRAINT IF EXISTS dd_workflow_states_completed_by_fkey;
ALTER TABLE dd_workflow_states ADD CONSTRAINT dd_workflow_states_completed_by_fkey 
  FOREIGN KEY (completed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE dd_workflow_states DROP CONSTRAINT IF EXISTS dd_workflow_states_approved_by_fkey;
ALTER TABLE dd_workflow_states ADD CONSTRAINT dd_workflow_states_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Client red flag incidents
ALTER TABLE client_red_flag_incidents DROP CONSTRAINT IF EXISTS client_red_flag_incidents_detected_by_fkey;
ALTER TABLE client_red_flag_incidents ADD CONSTRAINT client_red_flag_incidents_detected_by_fkey 
  FOREIGN KEY (detected_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE client_red_flag_incidents DROP CONSTRAINT IF EXISTS client_red_flag_incidents_investigated_by_fkey;
ALTER TABLE client_red_flag_incidents ADD CONSTRAINT client_red_flag_incidents_investigated_by_fkey 
  FOREIGN KEY (investigated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE client_red_flag_incidents DROP CONSTRAINT IF EXISTS client_red_flag_incidents_resolved_by_fkey;
ALTER TABLE client_red_flag_incidents ADD CONSTRAINT client_red_flag_incidents_resolved_by_fkey 
  FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- STR drafts
ALTER TABLE str_drafts DROP CONSTRAINT IF EXISTS str_drafts_prepared_by_fkey;
ALTER TABLE str_drafts ADD CONSTRAINT str_drafts_prepared_by_fkey 
  FOREIGN KEY (prepared_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE str_drafts DROP CONSTRAINT IF EXISTS str_drafts_reviewed_by_mlro_fkey;
ALTER TABLE str_drafts ADD CONSTRAINT str_drafts_reviewed_by_mlro_fkey 
  FOREIGN KEY (reviewed_by_mlro) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE str_drafts DROP CONSTRAINT IF EXISTS str_drafts_filed_by_fkey;
ALTER TABLE str_drafts ADD CONSTRAINT str_drafts_filed_by_fkey 
  FOREIGN KEY (filed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
