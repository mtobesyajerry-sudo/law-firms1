/*
  # Extend sales_enquiries with discovery + admin fields

  ## Summary
  Adds 10 qualification discovery fields and 4 admin tracking fields to the
  existing sales_enquiries table. These fields allow the sales team to qualify
  and route Large Firm prospects without a separate phone screen.

  ## New columns — Discovery (Step 2 of contact form)
  - office_location, expected_system_users, primary_practice_areas,
    current_aml_approach, current_aml_tool_name, last_compliance_review,
    has_dedicated_mlro, mlro_name, reason_for_change, desired_timeline

  ## New columns — Admin tracking
  - internal_notes, assigned_to_user_id, last_contacted_at, next_follow_up_at

  ## Security
  Existing RLS policies cover all new columns — no new policies needed.
*/

-- Discovery fields
ALTER TABLE sales_enquiries
  ADD COLUMN IF NOT EXISTS office_location TEXT,
  ADD COLUMN IF NOT EXISTS expected_system_users TEXT,
  ADD COLUMN IF NOT EXISTS primary_practice_areas TEXT[],
  ADD COLUMN IF NOT EXISTS current_aml_approach TEXT,
  ADD COLUMN IF NOT EXISTS current_aml_tool_name TEXT,
  ADD COLUMN IF NOT EXISTS last_compliance_review TEXT,
  ADD COLUMN IF NOT EXISTS has_dedicated_mlro BOOLEAN,
  ADD COLUMN IF NOT EXISTS mlro_name TEXT,
  ADD COLUMN IF NOT EXISTS reason_for_change TEXT,
  ADD COLUMN IF NOT EXISTS desired_timeline TEXT;

-- Admin tracking fields
ALTER TABLE sales_enquiries
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;

-- CHECK constraints (using DO blocks to avoid errors if they already exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'sales_enquiries_expected_system_users_check'
  ) THEN
    ALTER TABLE sales_enquiries
      ADD CONSTRAINT sales_enquiries_expected_system_users_check
      CHECK (expected_system_users IS NULL OR
             expected_system_users IN ('under_10','10_25','26_50','51_100','over_100'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'sales_enquiries_current_aml_approach_check'
  ) THEN
    ALTER TABLE sales_enquiries
      ADD CONSTRAINT sales_enquiries_current_aml_approach_check
      CHECK (current_aml_approach IS NULL OR
             current_aml_approach IN (
               'paper_and_spreadsheets','internal_database','international_software',
               'local_software','consultant_outsourced','nothing_formal'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'sales_enquiries_last_compliance_review_check'
  ) THEN
    ALTER TABLE sales_enquiries
      ADD CONSTRAINT sales_enquiries_last_compliance_review_check
      CHECK (last_compliance_review IS NULL OR
             last_compliance_review IN (
               'within_6_months','6_to_12_months','1_to_2_years',
               'over_2_years','never','not_sure'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'sales_enquiries_desired_timeline_check'
  ) THEN
    ALTER TABLE sales_enquiries
      ADD CONSTRAINT sales_enquiries_desired_timeline_check
      CHECK (desired_timeline IS NULL OR
             desired_timeline IN (
               'asap','within_3_months','3_to_6_months','6_to_12_months','exploring_only'));
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_enquiries_advocate_count
  ON sales_enquiries(advocate_count);

CREATE INDEX IF NOT EXISTS idx_sales_enquiries_timeline
  ON sales_enquiries(desired_timeline) WHERE desired_timeline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_enquiries_status_created
  ON sales_enquiries(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_enquiries_assigned
  ON sales_enquiries(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_enquiries_follow_up
  ON sales_enquiries(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;

COMMENT ON COLUMN sales_enquiries.office_location IS 'City or region where firm is primarily based';
COMMENT ON COLUMN sales_enquiries.expected_system_users IS 'Total system users (advocates + paralegals + admin + compliance)';
COMMENT ON COLUMN sales_enquiries.primary_practice_areas IS 'Array of practice area codes';
COMMENT ON COLUMN sales_enquiries.current_aml_approach IS 'How the firm currently handles AMLA Cap. 423 compliance';
COMMENT ON COLUMN sales_enquiries.current_aml_tool_name IS 'Name of the current AML tool if applicable';
COMMENT ON COLUMN sales_enquiries.last_compliance_review IS 'When the firm last had a FIU inspection or Law Society compliance review';
COMMENT ON COLUMN sales_enquiries.has_dedicated_mlro IS 'Whether the firm has a dedicated MLRO';
COMMENT ON COLUMN sales_enquiries.mlro_name IS 'Name of the MLRO if applicable';
COMMENT ON COLUMN sales_enquiries.reason_for_change IS 'What is prompting the firm to look for a new solution';
COMMENT ON COLUMN sales_enquiries.desired_timeline IS 'When the firm wants to be using a new system';
COMMENT ON COLUMN sales_enquiries.internal_notes IS 'Admin-only notes — never exposed to the prospect';
COMMENT ON COLUMN sales_enquiries.assigned_to_user_id IS 'Admin user responsible for this lead';
COMMENT ON COLUMN sales_enquiries.last_contacted_at IS 'Timestamp of last outreach to this prospect';
COMMENT ON COLUMN sales_enquiries.next_follow_up_at IS 'Scheduled follow-up timestamp';
