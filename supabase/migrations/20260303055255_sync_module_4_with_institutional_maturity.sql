/*
  # Sync Module 4 Scores with Institutional Maturity Assessment

  ## Problem Identified
  Module 4 scores in the assessments table were NOT automatically syncing with the
  Institutional Maturity Assessment scores from control_assessments table.

  Example mismatch found:
  - Stored module_4_score: 2.5
  - Actual control_assessments average: 4.15
  - This is a 66% discrepancy!

  ## Root Cause
  - Module 4 was originally part of the questionnaire (removed in consolidation)
  - No trigger existed to update module_4_score when control_assessments changed
  - Manual scores remained while institutional maturity assessments were updated separately

  ## Solution
  1. Create trigger function to auto-sync Module 4 from control_assessments
  2. Fix existing mismatched data
  3. Ensure future changes automatically propagate

  ## Changes
  - New function: sync_module_4_from_maturity()
  - New trigger: trigger_sync_module_4_score on control_assessments
  - Data fix: Update all existing assessments to match their control maturity
*/

-- Function to sync Module 4 score from control assessments average maturity
CREATE OR REPLACE FUNCTION sync_module_4_from_maturity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_maturity numeric;
  v_maturity_rating text;
BEGIN
  -- Calculate average maturity across all controls for this assessment
  SELECT AVG(maturity_level)
  INTO v_avg_maturity
  FROM control_assessments
  WHERE assessment_id = COALESCE(NEW.assessment_id, OLD.assessment_id);

  -- Handle case where all controls are deleted
  IF v_avg_maturity IS NULL THEN
    v_avg_maturity := 0;
    v_maturity_rating := NULL;
  ELSE
    -- Determine maturity rating based on 1-5 scale
    v_maturity_rating := CASE
      WHEN v_avg_maturity >= 4.5 THEN 'Optimised'
      WHEN v_avg_maturity >= 3.5 THEN 'Managed'
      WHEN v_avg_maturity >= 2.5 THEN 'Defined'
      WHEN v_avg_maturity >= 1.5 THEN 'Developing'
      ELSE 'Initial'
    END;
  END IF;

  -- Update assessment with Module 4 score derived from control maturity
  UPDATE assessments
  SET
    module_4_score = ROUND(v_avg_maturity, 2),
    module_4_rating = v_maturity_rating,
    updated_at = now()
  WHERE id = COALESCE(NEW.assessment_id, OLD.assessment_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_module_4_score ON control_assessments;

-- Create trigger to auto-update Module 4 when control assessments change
CREATE TRIGGER trigger_sync_module_4_score
AFTER INSERT OR UPDATE OR DELETE ON control_assessments
FOR EACH ROW
EXECUTE FUNCTION sync_module_4_from_maturity();

-- Fix existing data: Update all Module 4 scores from control assessments
UPDATE assessments a
SET
  module_4_score = ROUND(ca_avg.avg_maturity, 2),
  module_4_rating = CASE
    WHEN ca_avg.avg_maturity >= 4.5 THEN 'Optimised'
    WHEN ca_avg.avg_maturity >= 3.5 THEN 'Managed'
    WHEN ca_avg.avg_maturity >= 2.5 THEN 'Defined'
    WHEN ca_avg.avg_maturity >= 1.5 THEN 'Developing'
    ELSE 'Initial'
  END,
  updated_at = now()
FROM (
  SELECT
    assessment_id,
    AVG(maturity_level) as avg_maturity
  FROM control_assessments
  GROUP BY assessment_id
) ca_avg
WHERE a.id = ca_avg.assessment_id;

COMMENT ON COLUMN assessments.module_4_score IS 'Control Maturity score (1-5 scale) - AUTO-CALCULATED from control_assessments average maturity level';
COMMENT ON COLUMN assessments.module_4_rating IS 'Control Maturity level rating - AUTO-CALCULATED from module_4_score';