/*
  # Populate AML Trigger Activities from Matter Type

  1. Problem
    - Existing matters have empty aml_trigger_activities arrays
    - The UI shows "0" for AML Triggers count even for matters that should trigger AML obligations
    - Matter types directly correspond to AML trigger activities

  2. Solution
    - Update all matters to populate aml_trigger_activities based on their matter_type
    - Map each matter_type to its corresponding AML trigger activity
    - Litigation matters get empty array (no AML triggers by default)

  3. Mapping
    - real_property_transaction → real_property_transaction
    - commercial_enterprise_transaction → commercial_enterprise_transaction
    - client_funds_management → client_funds_management
    - bank_account_management → bank_account_management
    - corporation_capital_organization → corporation_capital_organization
    - entity_creation_management → entity_creation_management
    - business_entity_transaction → business_entity_transaction
    - financial_transaction_representation → financial_transaction_representation
    - real_estate_transaction_representation → real_estate_transaction_representation
    - litigation → [] (no AML trigger)
*/

-- Update matters with AML trigger activities based on matter_type
UPDATE matters
SET aml_trigger_activities = 
  CASE matter_type
    WHEN 'real_property_transaction' THEN '["real_property_transaction"]'::jsonb
    WHEN 'commercial_enterprise_transaction' THEN '["commercial_enterprise_transaction"]'::jsonb
    WHEN 'client_funds_management' THEN '["client_funds_management"]'::jsonb
    WHEN 'bank_account_management' THEN '["bank_account_management"]'::jsonb
    WHEN 'corporation_capital_organization' THEN '["corporation_capital_organization"]'::jsonb
    WHEN 'entity_creation_management' THEN '["entity_creation_management"]'::jsonb
    WHEN 'business_entity_transaction' THEN '["business_entity_transaction"]'::jsonb
    WHEN 'financial_transaction_representation' THEN '["financial_transaction_representation"]'::jsonb
    WHEN 'real_estate_transaction_representation' THEN '["real_estate_transaction_representation"]'::jsonb
    WHEN 'litigation' THEN '[]'::jsonb
    ELSE '[]'::jsonb
  END
WHERE aml_trigger_activities = '[]'::jsonb OR aml_trigger_activities IS NULL;
