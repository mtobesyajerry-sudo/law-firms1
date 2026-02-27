/*
  # Fix Audit Trigger Organization Name Reference

  1. Changes
    - Update `log_assessment_changes()` function to use `name` instead of `organization_name`
    - The organizations table uses `name` field, not `organization_name`
  
  2. Security
    - Maintains SECURITY DEFINER for audit logging
    - No changes to RLS policies
*/

-- Drop and recreate the trigger function with correct field name
CREATE OR REPLACE FUNCTION log_assessment_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
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
      COALESCE(NEW.created_by, auth.uid()),
      'assessments',
      NEW.id,
      'Assessment created for ' || COALESCE((SELECT name FROM organizations WHERE id = NEW.organization_id), 'Unknown'),
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
