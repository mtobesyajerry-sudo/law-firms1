/*
  # Fix features column structure for subscription_plans

  The features column was a JSONB array of mixed strings and objects.
  Replace it with a proper JSONB object with a top-level 'advocate_range' key
  and other metadata keys. Feature bullet strings are managed in the frontend.
*/

UPDATE subscription_plans
SET features = jsonb_build_object(
  'advocate_range', '1-5',
  'ira_finalized_per_year', 2,
  'maturity_assessment', 'annual',
  'compliance_cases_per_year', 50
)
WHERE tier = 'small_firm';

UPDATE subscription_plans
SET features = jsonb_build_object(
  'advocate_range', '6-15',
  'ira_finalized_per_year', 4,
  'maturity_assessment', 'quarterly',
  'compliance_cases_per_year', 250
)
WHERE tier = 'medium_firm';

UPDATE subscription_plans
SET features = jsonb_build_object(
  'advocate_range', '16+',
  'maturity_assessment', 'continuous'
)
WHERE tier = 'large_firm';
