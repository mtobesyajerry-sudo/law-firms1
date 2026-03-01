/*
  # Fix Matters Constraint - Update to AML Trigger Activity Types
  
  1. Changes
    - Drop the old generic matter_type check constraint
    - Add new constraint with AML/CTF trigger activities as per Tanzania law
    
  2. Valid Matter Types (Tanzania AML Act Requirements)
    - litigation (general litigation not involving AML triggers)
    - real_property_transaction (purchase/sale of real property)
    - commercial_enterprise_transaction (purchase/sale of commercial enterprises)
    - client_funds_management (managing client funds/securities/assets)
    - bank_account_management (opening/managing bank accounts)
    - corporation_capital_organization (organizing capital for corporations)
    - entity_creation_management (creating/managing/directing legal entities)
    - business_entity_transaction (buying/selling business entities)
    - financial_transaction_representation (acting for client in financial transactions)
    - real_estate_transaction_representation (acting for client in real estate transactions)
    
  3. Security
    - No RLS changes needed
*/

-- Drop the old constraint with generic types
ALTER TABLE matters DROP CONSTRAINT IF EXISTS matters_matter_type_check;

-- Add new constraint with AML trigger activities
ALTER TABLE matters ADD CONSTRAINT matters_matter_type_check CHECK (
  matter_type IN (
    'litigation',
    'real_property_transaction',
    'commercial_enterprise_transaction',
    'client_funds_management',
    'bank_account_management',
    'corporation_capital_organization',
    'entity_creation_management',
    'business_entity_transaction',
    'financial_transaction_representation',
    'real_estate_transaction_representation'
  )
);
