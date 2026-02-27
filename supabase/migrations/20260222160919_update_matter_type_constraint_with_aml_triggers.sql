/*
  # Update Matter Type Constraint to Include AML/CTF/CPF Trigger Activities
  
  1. Changes
    - Drop the old matter_type check constraint
    - Add new constraint with AML/CTF/CPF trigger activities as per Tanzania law
    - Include 'litigation' as one of the valid options
    
  2. New Valid Matter Types
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

-- Drop the old constraint
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
