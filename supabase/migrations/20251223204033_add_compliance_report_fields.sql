/*
  # Add Compliance Report Fields

  ## Overview
  This migration adds fields required for generating government-compliant
  ML/TF risk assessment reports. These fields capture additional contextual
  information needed for formal compliance reporting.

  ## Changes to assessments table

  New fields added:
  - `assessment_period_start` (date) - Start date of assessment period
  - `assessment_period_end` (date) - End date of assessment period
  - `business_overview` (text) - Detailed business overview and structure
  - `products_services_overview` (text) - Description of products/services offered
  - `customer_categories_overview` (text) - Types/categories of customers
  - `geographic_overview` (text) - Geographic distribution of customers
  - `delivery_channels_overview` (text) - How products/services are delivered
  
  Risk Factor Weights (must total 100%):
  - `customer_risk_weight` (numeric) - Weight assigned to customer risks
  - `product_risk_weight` (numeric) - Weight assigned to product/service risks  
  - `geographic_risk_weight` (numeric) - Weight assigned to geographic risks
  - `delivery_risk_weight` (numeric) - Weight assigned to delivery channel risks
  - `other_risk_weight` (numeric) - Weight assigned to other risks (optional)

  Risk Statistics:
  - `customer_risk_statistics` (jsonb) - Detailed customer risk breakdown
  - `product_risk_statistics` (jsonb) - Detailed product/service risk breakdown
  - `geographic_risk_statistics` (jsonb) - Detailed geographic risk breakdown
  - `delivery_risk_statistics` (jsonb) - Detailed delivery channel risk breakdown

  Risk Assessments:
  - `customer_risk_assessment` (text) - Customer risk analysis and rating
  - `product_risk_assessment` (text) - Product/service risk analysis and rating
  - `geographic_risk_assessment` (text) - Geographic risk analysis and rating
  - `delivery_risk_assessment` (text) - Delivery channel risk analysis and rating

  Control Measures:
  - `risk_control_measures` (jsonb) - Array of implemented control measures
  - `compliance_conclusion` (text) - Final compliance assessment conclusion

  Report Metadata:
  - `compliance_report_generated` (boolean) - Track if compliance report completed
  - `compliance_report_date` (timestamp) - When compliance report was finalized

  ## Purpose
  These fields enable the system to generate formal compliance reports that meet
  government regulatory requirements for ML/TF risk assessment reporting.
*/

-- Add assessment period fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'assessment_period_start'
  ) THEN
    ALTER TABLE assessments ADD COLUMN assessment_period_start date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'assessment_period_end'
  ) THEN
    ALTER TABLE assessments ADD COLUMN assessment_period_end date;
  END IF;
END $$;

-- Add business overview fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'business_overview'
  ) THEN
    ALTER TABLE assessments ADD COLUMN business_overview text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'products_services_overview'
  ) THEN
    ALTER TABLE assessments ADD COLUMN products_services_overview text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'customer_categories_overview'
  ) THEN
    ALTER TABLE assessments ADD COLUMN customer_categories_overview text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'geographic_overview'
  ) THEN
    ALTER TABLE assessments ADD COLUMN geographic_overview text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'delivery_channels_overview'
  ) THEN
    ALTER TABLE assessments ADD COLUMN delivery_channels_overview text;
  END IF;
END $$;

-- Add risk weight fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'customer_risk_weight'
  ) THEN
    ALTER TABLE assessments ADD COLUMN customer_risk_weight numeric DEFAULT 25;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'product_risk_weight'
  ) THEN
    ALTER TABLE assessments ADD COLUMN product_risk_weight numeric DEFAULT 25;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'geographic_risk_weight'
  ) THEN
    ALTER TABLE assessments ADD COLUMN geographic_risk_weight numeric DEFAULT 25;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'delivery_risk_weight'
  ) THEN
    ALTER TABLE assessments ADD COLUMN delivery_risk_weight numeric DEFAULT 25;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'other_risk_weight'
  ) THEN
    ALTER TABLE assessments ADD COLUMN other_risk_weight numeric DEFAULT 0;
  END IF;
END $$;

-- Add risk statistics fields (JSONB for flexible data storage)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'customer_risk_statistics'
  ) THEN
    ALTER TABLE assessments ADD COLUMN customer_risk_statistics jsonb DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'product_risk_statistics'
  ) THEN
    ALTER TABLE assessments ADD COLUMN product_risk_statistics jsonb DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'geographic_risk_statistics'
  ) THEN
    ALTER TABLE assessments ADD COLUMN geographic_risk_statistics jsonb DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'delivery_risk_statistics'
  ) THEN
    ALTER TABLE assessments ADD COLUMN delivery_risk_statistics jsonb DEFAULT '{}';
  END IF;
END $$;

-- Add risk assessment text fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'customer_risk_assessment'
  ) THEN
    ALTER TABLE assessments ADD COLUMN customer_risk_assessment text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'product_risk_assessment'
  ) THEN
    ALTER TABLE assessments ADD COLUMN product_risk_assessment text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'geographic_risk_assessment'
  ) THEN
    ALTER TABLE assessments ADD COLUMN geographic_risk_assessment text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'delivery_risk_assessment'
  ) THEN
    ALTER TABLE assessments ADD COLUMN delivery_risk_assessment text;
  END IF;
END $$;

-- Add control measures and conclusion fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'risk_control_measures'
  ) THEN
    ALTER TABLE assessments ADD COLUMN risk_control_measures jsonb DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'compliance_conclusion'
  ) THEN
    ALTER TABLE assessments ADD COLUMN compliance_conclusion text;
  END IF;
END $$;

-- Add compliance report tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'compliance_report_generated'
  ) THEN
    ALTER TABLE assessments ADD COLUMN compliance_report_generated boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'compliance_report_date'
  ) THEN
    ALTER TABLE assessments ADD COLUMN compliance_report_date timestamptz;
  END IF;
END $$;