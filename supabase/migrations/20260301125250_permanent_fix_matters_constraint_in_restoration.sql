/*
  # Permanent Fix - Ensure Matters Constraint Always Uses AML Types
  
  1. Purpose
    - This migration ensures the matters table constraint always uses AML trigger types
    - Fixes any potential issues from the restoration migration
    - Idempotent and safe to run multiple times
    
  2. Changes
    - Drop any existing matter_type check constraint
    - Create new constraint with correct AML trigger activities
    
  3. Valid Matter Types (Tanzania AML Act)
    - litigation
    - real_property_transaction
    - commercial_enterprise_transaction
    - client_funds_management
    - bank_account_management
    - corporation_capital_organization
    - entity_creation_management
    - business_entity_transaction
    - financial_transaction_representation
    - real_estate_transaction_representation
*/

-- Drop the constraint if it exists (idempotent)
ALTER TABLE matters DROP CONSTRAINT IF EXISTS matters_matter_type_check;

-- Add the correct constraint with AML trigger activities
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

-- Add a comment to document this
COMMENT ON CONSTRAINT matters_matter_type_check ON matters IS 
  'Enforces valid matter types based on Tanzania AML Act trigger activities. '
  'These correspond to activities that require enhanced due diligence for legal professionals.';
