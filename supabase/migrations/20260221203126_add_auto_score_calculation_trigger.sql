/*
  # Add Automatic Score Calculation Trigger

  ## Problem
  When users answer assessment questions, the `section_scores` table is updated with individual
  section scores, but the assessment-level module scores (module_1_score, module_2_score, etc.)
  and overall_risk_score are NOT automatically calculated.

  Users see:
  - Section scores populated correctly
  - Module scores remain NULL
  - Risk level shows "Not Assessed"

  ## Solution
  Create a trigger that automatically calls `recalculate_assessment_risk_scores()` whenever
  section_scores are updated, ensuring all assessment-level scores are calculated in real-time.

  ## Changes
  1. Create trigger function to call recalculation
  2. Attach trigger to section_scores INSERT/UPDATE/DELETE
  3. Recalculate existing assessments
*/

-- 1. Create trigger function that calls the master recalculation
CREATE OR REPLACE FUNCTION trigger_recalculate_assessment_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the master recalculation function for this assessment
  PERFORM recalculate_assessment_risk_scores(
    COALESCE(NEW.assessment_id, OLD.assessment_id)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Create trigger on section_scores table
DROP TRIGGER IF EXISTS trigger_auto_recalculate_scores ON section_scores;
CREATE TRIGGER trigger_auto_recalculate_scores
AFTER INSERT OR UPDATE OR DELETE ON section_scores
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_assessment_scores();

-- 3. Recalculate all existing assessments that have section scores
DO $$
DECLARE
  v_assessment_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_assessment_id IN
    SELECT DISTINCT assessment_id
    FROM section_scores
    WHERE answered_questions > 0
  LOOP
    BEGIN
      PERFORM recalculate_assessment_risk_scores(v_assessment_id);
      v_count := v_count + 1;
      RAISE NOTICE 'Recalculated scores for assessment: %', v_assessment_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to recalculate assessment %: %', v_assessment_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Successfully recalculated % assessments', v_count;
END $$;

-- 4. Add helpful comments
COMMENT ON FUNCTION trigger_recalculate_assessment_scores() IS
'Automatically recalculates assessment-level scores (module scores, overall risk) whenever section_scores change. Ensures real-time score calculation as users answer questions.';

COMMENT ON TRIGGER trigger_auto_recalculate_scores ON section_scores IS
'Triggers automatic recalculation of assessment scores when section scores are inserted, updated, or deleted.';