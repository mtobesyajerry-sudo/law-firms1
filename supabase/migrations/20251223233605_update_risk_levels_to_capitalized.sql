/*
  # Update Risk Levels to Capitalized Format

  1. Changes
    - Update all existing risk levels in section_scores from lowercase to capitalized
    - Update all existing risk ratings in assessments from lowercase to capitalized
    - Changes: 'low' -> 'Low', 'medium' -> 'Medium', 'high' -> 'High'
  
  2. Security
    - No RLS changes needed
*/

-- Update section_scores table
UPDATE section_scores
SET risk_level = 'Low'
WHERE risk_level = 'low';

UPDATE section_scores
SET risk_level = 'Medium'
WHERE risk_level = 'medium';

UPDATE section_scores
SET risk_level = 'High'
WHERE risk_level = 'high';

-- Update assessments table
UPDATE assessments
SET overall_risk_rating = 'Low'
WHERE overall_risk_rating = 'low';

UPDATE assessments
SET overall_risk_rating = 'Medium'
WHERE overall_risk_rating = 'medium';

UPDATE assessments
SET overall_risk_rating = 'High'
WHERE overall_risk_rating = 'high';
