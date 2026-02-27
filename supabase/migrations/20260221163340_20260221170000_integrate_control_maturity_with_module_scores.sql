/*
  # Integrate Control Maturity Assessment with Module Scores
  
  ## Problem Statement
  The system currently has TWO SEPARATE maturity measurement systems that are not connected:
  1. Module 2/3 scores (from questionnaire responses) - shown as "Technical Compliance" and "Effectiveness"
  2. Control assessments (from control library) - shown as "Institutional Maturity"
  
  This creates confusion and system integrity issues as they measure the same thing differently.
  
  ## Solution
  Create a unified maturity system where:
  - Control assessments (detailed, evidence-based) are the PRIMARY source of truth
  - Module scores are DERIVED from control assessment maturity levels
  - The TC/E display uses control maturity data mapped to the correct domains
  
  ## Implementation
  
  1. **Mapping Table**: Maps AML control domains to assessment modules
  2. **Sync Function**: Automatically calculates module scores from control maturity
  3. **Trigger**: Keeps module scores in sync when control assessments change
  4. **View**: Provides unified maturity data for reporting
  
  ## Changes
  
  ### New Tables
  - `control_domain_module_mapping` - Maps domains to modules (GOV/ERA/CDD → Module 2, effectiveness controls → Module 3)
  
  ### New Functions
  - `calculate_module_scores_from_controls()` - Derives module scores from control maturity
  - `sync_assessment_module_scores()` - Trigger function to auto-sync
  
  ### New Views
  - `unified_maturity_assessment` - Combined view of control maturity and module scores
*/

-- 1. Create mapping table between control domains and assessment modules
CREATE TABLE IF NOT EXISTS control_domain_module_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES aml_domains(id) ON DELETE CASCADE,
  module_number integer NOT NULL CHECK (module_number IN (2, 3)),
  weight numeric(3,2) NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1.0),
  mapping_rationale text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(domain_id, module_number)
);

ALTER TABLE control_domain_module_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users"
  ON control_domain_module_mapping FOR SELECT
  TO authenticated
  USING (true);

-- 2. Seed the mapping data
-- Module 2 (Technical Compliance) = Existence and documentation of controls
-- Primarily governance, policy, CDD, transaction monitoring, sanctions, reporting frameworks
INSERT INTO control_domain_module_mapping (domain_id, module_number, weight, mapping_rationale)
SELECT 
  d.id,
  2 as module_number,
  CASE 
    WHEN d.code IN ('GOV', 'ERA', 'CDD', 'TM', 'SAN', 'SAR') THEN 1.0
    WHEN d.code IN ('ICC', 'AUD', 'TRN') THEN 0.8
    ELSE 0.5
  END as weight,
  'Technical compliance measures existence and documentation of controls in this domain' as mapping_rationale
FROM aml_domains d
WHERE d.code IN ('GOV', 'ERA', 'CDD', 'TM', 'SAN', 'SAR', 'ICC', 'AUD', 'TRN')
ON CONFLICT (domain_id, module_number) DO NOTHING;

-- Module 3 (Effectiveness) = How well controls operate in practice
-- All domains contribute to effectiveness, but monitoring, audit, and compliance are key
INSERT INTO control_domain_module_mapping (domain_id, module_number, weight, mapping_rationale)
SELECT 
  d.id,
  3 as module_number,
  CASE 
    WHEN d.code IN ('ICC', 'AUD', 'TM', 'SAR') THEN 1.0
    WHEN d.code IN ('CDD', 'SAN', 'GOV', 'TRN') THEN 0.8
    ELSE 0.6
  END as weight,
  'Effectiveness measures how well controls in this domain operate in practice' as mapping_rationale
FROM aml_domains d
WHERE d.code IN ('GOV', 'ERA', 'CDD', 'TM', 'SAN', 'SAR', 'ICC', 'AUD', 'TRN')
ON CONFLICT (domain_id, module_number) DO NOTHING;

-- 3. Function to calculate module scores from control assessments
CREATE OR REPLACE FUNCTION calculate_module_scores_from_controls(p_assessment_id uuid)
RETURNS TABLE (
  module_2_score numeric,
  module_3_score numeric,
  control_count integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_module_2_score numeric;
  v_module_3_score numeric;
  v_control_count integer;
BEGIN
  -- Calculate Module 2 score (Technical Compliance)
  -- Average maturity of controls mapped to Module 2, weighted by domain importance
  SELECT 
    COALESCE(
      SUM(ca.maturity_level * cdm.weight) / NULLIF(SUM(cdm.weight), 0),
      1.0
    ),
    COUNT(ca.id)
  INTO v_module_2_score, v_control_count
  FROM control_assessments ca
  JOIN aml_controls c ON c.id = ca.control_id
  JOIN control_domain_module_mapping cdm ON cdm.domain_id = c.domain_id AND cdm.module_number = 2
  WHERE ca.assessment_id = p_assessment_id;

  -- Calculate Module 3 score (Effectiveness)
  -- Average maturity of controls mapped to Module 3, weighted by domain importance
  SELECT 
    COALESCE(
      SUM(ca.maturity_level * cdm.weight) / NULLIF(SUM(cdm.weight), 0),
      1.0
    )
  INTO v_module_3_score
  FROM control_assessments ca
  JOIN aml_controls c ON c.id = ca.control_id
  JOIN control_domain_module_mapping cdm ON cdm.domain_id = c.domain_id AND cdm.module_number = 3
  WHERE ca.assessment_id = p_assessment_id;

  RETURN QUERY SELECT 
    ROUND(v_module_2_score, 2) as module_2_score,
    ROUND(v_module_3_score, 2) as module_3_score,
    v_control_count as control_count;
END;
$$;

-- 4. Trigger function to auto-sync module scores when control assessments change
CREATE OR REPLACE FUNCTION sync_assessment_module_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_module_2 numeric;
  v_module_3 numeric;
  v_count integer;
BEGIN
  -- Calculate new scores from controls
  SELECT module_2_score, module_3_score, control_count
  INTO v_module_2, v_module_3, v_count
  FROM calculate_module_scores_from_controls(
    COALESCE(NEW.assessment_id, OLD.assessment_id)
  );

  -- Update assessment with calculated scores
  UPDATE assessments
  SET 
    module_2_score = v_module_2,
    module_3_score = v_module_3,
    updated_at = now()
  WHERE id = COALESCE(NEW.assessment_id, OLD.assessment_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on control_assessments
DROP TRIGGER IF EXISTS trigger_sync_module_scores ON control_assessments;
CREATE TRIGGER trigger_sync_module_scores
AFTER INSERT OR UPDATE OR DELETE ON control_assessments
FOR EACH ROW
EXECUTE FUNCTION sync_assessment_module_scores();

-- 5. Create unified maturity view for reporting
CREATE OR REPLACE VIEW unified_maturity_assessment AS
SELECT 
  a.id as assessment_id,
  a.organization_id,
  a.dnfbp_category,
  
  -- Module scores (derived from controls)
  a.module_1_score as inherent_risk_score,
  a.module_2_score as technical_compliance_score,
  a.module_3_score as effectiveness_score,
  a.overall_risk_score as residual_risk_score,
  
  -- Overall institutional maturity (average across all controls)
  COALESCE(
    (SELECT AVG(ca.maturity_level)
     FROM control_assessments ca
     WHERE ca.assessment_id = a.id),
    1.0
  ) as overall_institutional_maturity,
  
  -- Control assessment summary
  (SELECT COUNT(*)
   FROM control_assessments ca
   WHERE ca.assessment_id = a.id) as total_controls_assessed,
   
  (SELECT COUNT(*)
   FROM control_assessments ca
   WHERE ca.assessment_id = a.id
   AND ca.maturity_level >= 3) as controls_at_level_3_plus,
   
  -- Gap summary
  (SELECT SUM(ds.gaps_critical)
   FROM domain_scores ds
   WHERE ds.assessment_id = a.id) as total_critical_gaps,
   
  (SELECT SUM(ds.gaps_high)
   FROM domain_scores ds
   WHERE ds.assessment_id = a.id) as total_high_gaps,
   
  -- Timestamps
  a.completed_at,
  a.created_at,
  a.updated_at
FROM assessments a
WHERE a.status = 'completed';

-- Grant access to view
GRANT SELECT ON unified_maturity_assessment TO authenticated;

-- 6. Add helpful comment to assessments table
COMMENT ON COLUMN assessments.module_2_score IS 'Technical Compliance score (1-5 scale) - AUTO-CALCULATED from control_assessments maturity levels for controls mapped to Module 2. Measures existence and documentation of AML/CFT controls.';
COMMENT ON COLUMN assessments.module_3_score IS 'Effectiveness score (1-5 scale) - AUTO-CALCULATED from control_assessments maturity levels for controls mapped to Module 3. Measures how well controls operate in practice.';

-- 7. Recalculate all existing assessment module scores from their control assessments
DO $$
DECLARE
  v_assessment_id uuid;
  v_module_2 numeric;
  v_module_3 numeric;
  v_count integer;
BEGIN
  FOR v_assessment_id IN 
    SELECT DISTINCT assessment_id 
    FROM control_assessments
  LOOP
    SELECT module_2_score, module_3_score, control_count
    INTO v_module_2, v_module_3, v_count
    FROM calculate_module_scores_from_controls(v_assessment_id);
    
    IF v_count > 0 THEN
      UPDATE assessments
      SET 
        module_2_score = v_module_2,
        module_3_score = v_module_3,
        updated_at = now()
      WHERE id = v_assessment_id;
      
      RAISE NOTICE 'Updated assessment % with Module 2: %, Module 3: % (from % controls)', 
        v_assessment_id, v_module_2, v_module_3, v_count;
    END IF;
  END LOOP;
END $$;
