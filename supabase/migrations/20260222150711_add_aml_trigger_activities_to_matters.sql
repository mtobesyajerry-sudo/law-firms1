/*
  # Add AML Trigger Activities to Matters

  ## Overview
  This migration adds tracking for AML/CTF/CPF trigger activities to the matters table.

  ## Tanzania AML Law Requirements
  Law firms in Tanzania are subject to AML/CTF/CPF laws when performing these activities for clients:

  1. Assisting clients in preparing or executing transactions involving:
     - Purchase or sale of real property or commercial enterprises
     - Management of funds, securities or other assets which belong to a client
     - Opening or management of bank accounts, saving accounts or portfolios
     - Organization of contributions required to create, manage or direct corporations or legal entities
     - Creation, management or direction of corporations or legal entities
     - Buying or selling of business entities

  2. Acting on behalf of a client in any financial or real estate transaction

  ## Changes
  - Add `aml_trigger_activities` column to track which activities trigger AML obligations
  - Add `aml_subject_to_obligations` computed flag to easily identify matters requiring AML compliance
  - Add indexes for efficient querying

  ## Security
  - Maintains existing RLS policies
  - No new security risks introduced
*/

-- Add AML trigger activities column to matters table
ALTER TABLE matters
ADD COLUMN IF NOT EXISTS aml_trigger_activities text[] DEFAULT ARRAY[]::text[];

-- Add flag to indicate if matter is subject to AML obligations
ALTER TABLE matters
ADD COLUMN IF NOT EXISTS aml_subject_to_obligations boolean GENERATED ALWAYS AS (
  COALESCE(array_length(aml_trigger_activities, 1), 0) > 0
) STORED;

-- Add comment for documentation
COMMENT ON COLUMN matters.aml_trigger_activities IS 'Array of AML trigger activities from Tanzania AML/CTF/CPF laws. Possible values: real_property_transaction, commercial_enterprise_transaction, client_funds_management, bank_account_management, corporation_capital_organization, entity_creation_management, business_entity_transaction, financial_transaction_representation, real_estate_transaction_representation';

COMMENT ON COLUMN matters.aml_subject_to_obligations IS 'Computed flag indicating whether this matter triggers AML/CTF/CPF obligations under Tanzania law';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_matters_aml_obligations ON matters(aml_subject_to_obligations) WHERE aml_subject_to_obligations = true;

-- Create GIN index for array operations
CREATE INDEX IF NOT EXISTS idx_matters_aml_trigger_activities ON matters USING gin(aml_trigger_activities);
