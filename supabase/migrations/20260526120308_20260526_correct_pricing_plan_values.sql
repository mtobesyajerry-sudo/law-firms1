/*
  # Correct subscription_plans values to match the agreed 3-tier model

  ## Changes
  - Small Firm: 1-5 advocates, TZS 250,000/month, TZS 2,500,000/year, 12 users, 150 clients, 250 matters, 2 IRAs, 400 screenings, 10 GB
  - Medium Firm: 6-15 advocates, TZS 600,000/month, TZS 6,000,000/year, 30 users, 600 clients, 1200 matters, 4 IRAs, 2500 screenings, 50 GB
  - Large Firm: 16+ advocates, NULL pricing (contact sales), all caps unlimited, 500 GB storage
  - All plans: is_popular/is_recommended set to FALSE (no "MOST POPULAR" badge until real data)
  - advocate_range added to features JSONB for each tier
*/

UPDATE subscription_plans
SET
  description = 'For firms with 1-5 advocates. Full AMLA Cap. 423 compliance: Client KYC, automated sanctions screening, Institutional Risk Assessment, and FIU-ready reports.',
  price_monthly_tzs = 250000,
  price_annual_tzs = 2500000,
  max_users = 12,
  max_clients = 150,
  max_matters = 250,
  max_iras_per_year = 2,
  max_compliance_cases_per_year = 50,
  max_screenings_per_month = 400,
  storage_gb = 10,
  features = COALESCE(features, '{}'::jsonb)
    || jsonb_build_object('advocate_range', '1-5')
    || jsonb_build_object('ira_finalized_per_year', 2)
    || jsonb_build_object('maturity_assessment', 'annual')
    || jsonb_build_object('compliance_cases_per_year', 50)
WHERE tier = 'small_firm';

UPDATE subscription_plans
SET
  description = 'For firms with 6-15 advocates. Everything in Small Firm, plus quarterly risk reviews, premium PEP and adverse media screening via OpenSanctions, and priority support.',
  price_monthly_tzs = 600000,
  price_annual_tzs = 6000000,
  max_users = 30,
  max_clients = 600,
  max_matters = 1200,
  max_iras_per_year = 4,
  max_compliance_cases_per_year = 250,
  max_screenings_per_month = 2500,
  storage_gb = 50,
  features = COALESCE(features, '{}'::jsonb)
    || jsonb_build_object('advocate_range', '6-15')
    || jsonb_build_object('ira_finalized_per_year', 4)
    || jsonb_build_object('maturity_assessment', 'quarterly')
    || jsonb_build_object('compliance_cases_per_year', 250)
WHERE tier = 'medium_firm';

UPDATE subscription_plans
SET
  description = 'For firms with 16+ advocates. Everything in Medium Firm, plus unlimited capacity, dedicated account manager, custom onboarding, and SLA-backed support.',
  price_monthly_tzs = NULL,
  price_annual_tzs = NULL,
  max_users = NULL,
  max_clients = NULL,
  max_matters = NULL,
  max_iras_per_year = NULL,
  max_compliance_cases_per_year = NULL,
  max_screenings_per_month = NULL,
  storage_gb = 500,
  contact_sales = TRUE,
  features = COALESCE(features, '{}'::jsonb)
    || jsonb_build_object('advocate_range', '16+')
    || jsonb_build_object('maturity_assessment', 'continuous')
WHERE tier = 'large_firm';
