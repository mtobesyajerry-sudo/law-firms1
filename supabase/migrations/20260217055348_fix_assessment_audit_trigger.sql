/*
  # Fix Assessment Audit Trigger

  1. Changes
    - Fix log_assessment_changes() function to use correct column names
    - Change NEW.user_id to NEW.created_by (assessments table uses created_by)
    - Fix organization_name reference to use correct column name
  
  2. Security
    - Maintains SECURITY DEFINER for proper audit logging
    - No changes to RLS policies
*/

-- Drop and recreate the function with correct column references
CREATE OR REPLACE FUNCTION log_assessment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      event_type,
      event_category,
      user_id,
      target_table,
      target_record_id,
      action_description,
      new_values,
      success
    ) VALUES (
      'assessment_created',
      'data_modification',
      NEW.created_by,
      'assessments',
      NEW.id,
      'Assessment created for ' || (SELECT name FROM organizations WHERE id = NEW.organization_id),
      to_jsonb(NEW),
      true
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      event_type,
      event_category,
      user_id,
      target_table,
      target_record_id,
      action_description,
      old_values,
      new_values,
      success
    ) VALUES (
      'assessment_updated',
      'data_modification',
      auth.uid(),
      'assessments',
      NEW.id,
      'Assessment updated',
      to_jsonb(OLD),
      to_jsonb(NEW),
      true
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      event_type,
      event_category,
      user_id,
      target_table,
      target_record_id,
      action_description,
      old_values,
      success
    ) VALUES (
      'assessment_deleted',
      'data_modification',
      auth.uid(),
      'assessments',
      OLD.id,
      'Assessment deleted',
      to_jsonb(OLD),
      true
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;