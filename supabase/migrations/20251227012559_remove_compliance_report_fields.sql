/*
  # Remove Compliance Report Fields

  ## Overview
  This migration removes all compliance report related fields from the
  assessments table, completely removing the government compliance report
  functionality from the system.

  ## Changes to assessments table
  
  Columns being removed:
  - Assessment period fields (assessment_period_start, assessment_period_end)
  - Business overview fields (business_overview, products_services_overview, etc.)
  - Risk weight fields (customer_risk_weight, product_risk_weight, etc.)
  - Risk statistics fields (customer_risk_statistics, product_risk_statistics, etc.)
  - Risk assessment fields (customer_risk_assessment, product_risk_assessment, etc.)
  - Control measures fields (risk_control_measures, compliance_conclusion)
  - Report tracking fields (compliance_report_generated, compliance_report_date)

  ## Purpose
  Remove all compliance report functionality from the system as requested by the user.
*/

-- Drop all compliance report related columns from assessments table
DO $$
BEGIN
  -- Drop assessment period fields
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'assessment_period_start') THEN
    ALTER TABLE assessments DROP COLUMN assessment_period_start;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'assessment_period_end') THEN
    ALTER TABLE assessments DROP COLUMN assessment_period_end;
  END IF;

  -- Drop business overview fields
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'business_overview') THEN
    ALTER TABLE assessments DROP COLUMN business_overview;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'products_services_overview') THEN
    ALTER TABLE assessments DROP COLUMN products_services_overview;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'customer_categories_overview') THEN
    ALTER TABLE assessments DROP COLUMN customer_categories_overview;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'geographic_overview') THEN
    ALTER TABLE assessments DROP COLUMN geographic_overview;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'delivery_channels_overview') THEN
    ALTER TABLE assessments DROP COLUMN delivery_channels_overview;
  END IF;

  -- Drop risk weight fields
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'customer_risk_weight') THEN
    ALTER TABLE assessments DROP COLUMN customer_risk_weight;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'product_risk_weight') THEN
    ALTER TABLE assessments DROP COLUMN product_risk_weight;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'geographic_risk_weight') THEN
    ALTER TABLE assessments DROP COLUMN geographic_risk_weight;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'delivery_risk_weight') THEN
    ALTER TABLE assessments DROP COLUMN delivery_risk_weight;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'other_risk_weight') THEN
    ALTER TABLE assessments DROP COLUMN other_risk_weight;
  END IF;

  -- Drop risk statistics fields
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'customer_risk_statistics') THEN
    ALTER TABLE assessments DROP COLUMN customer_risk_statistics;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'product_risk_statistics') THEN
    ALTER TABLE assessments DROP COLUMN product_risk_statistics;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'geographic_risk_statistics') THEN
    ALTER TABLE assessments DROP COLUMN geographic_risk_statistics;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'delivery_risk_statistics') THEN
    ALTER TABLE assessments DROP COLUMN delivery_risk_statistics;
  END IF;

  -- Drop risk assessment fields
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'customer_risk_assessment') THEN
    ALTER TABLE assessments DROP COLUMN customer_risk_assessment;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'product_risk_assessment') THEN
    ALTER TABLE assessments DROP COLUMN product_risk_assessment;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'geographic_risk_assessment') THEN
    ALTER TABLE assessments DROP COLUMN geographic_risk_assessment;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'delivery_risk_assessment') THEN
    ALTER TABLE assessments DROP COLUMN delivery_risk_assessment;
  END IF;

  -- Drop control measures and conclusion fields
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'risk_control_measures') THEN
    ALTER TABLE assessments DROP COLUMN risk_control_measures;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'compliance_conclusion') THEN
    ALTER TABLE assessments DROP COLUMN compliance_conclusion;
  END IF;

  -- Drop report tracking fields
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'compliance_report_generated') THEN
    ALTER TABLE assessments DROP COLUMN compliance_report_generated;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'compliance_report_date') THEN
    ALTER TABLE assessments DROP COLUMN compliance_report_date;
  END IF;
END $$;