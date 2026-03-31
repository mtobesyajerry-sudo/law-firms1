/*
  # Fix Control Effectiveness Calculation - Response Mapping Issue

  ## Problem
  The map_control_response_to_score function was looking for "Fully implemented" but 
  actual responses are "Fully implemented & documented", causing 0% control effectiveness.

  ## Solution
  Update the function to handle all actual response formats from the assessment forms.

  ## Response Formats
  Module 2 (Technical Compliance):
  - "Fully implemented & documented" → 1.0
  - "Partially implemented or documented" → 0.6
  - "Weakly implemented or lacks documentation" → 0.3
  - "Not in place or not documented" → 0.0

  Module 3 (Effectiveness):
  - Responses are ratings from 1-5, not text
*/

-- Drop and recreate the function with correct response mapping
CREATE OR REPLACE FUNCTION map_control_response_to_score(response text)
RETURNS numeric AS $$
BEGIN
  -- Handle Module 2 responses (implementation levels)
  IF LOWER(response) LIKE '%fully implemented%' OR 
     LOWER(response) IN ('fully', 'full', 'yes', 'strong', 'fully implemented and documented') THEN
    RETURN 1.0;
  END IF;
  
  IF LOWER(response) LIKE '%partially implemented%' OR 
     LOWER(response) LIKE '%partially%documented%' OR
     LOWER(response) IN ('partially', 'partial', 'moderate') THEN
    RETURN 0.6;
  END IF;
  
  IF LOWER(response) LIKE '%weakly implemented%' OR 
     LOWER(response) LIKE '%lacks documentation%' OR
     LOWER(response) IN ('weak', 'limited', 'weakly') THEN
    RETURN 0.3;
  END IF;
  
  IF LOWER(response) LIKE '%not in place%' OR 
     LOWER(response) LIKE '%not documented%' OR
     LOWER(response) IN ('not in place', 'no', 'not implemented', 'none') THEN
    RETURN 0.0;
  END IF;
  
  -- Default to no control if unclear
  RETURN 0.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION map_control_response_to_score IS 
'Map control implementation responses to 0-1 effectiveness scale (updated for actual response formats)';
