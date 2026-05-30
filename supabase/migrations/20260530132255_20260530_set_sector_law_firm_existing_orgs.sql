/*
  # Backfill sector = 'law_firm' on existing organizations

  All existing organizations have business_type = 'law_firm' and sector = NULL.
  resolveFrameworkType(null) already returns 'legal_professionals' (the default branch),
  which is identical to resolveFrameworkType('law_firm'). This update is behavior-neutral
  for the assessment pipeline — it simply makes the stored value explicit so the admin
  sector picker and future org-creation paths have a clean starting point.

  Changes:
  - organizations: set sector = 'law_firm' where sector IS NULL AND business_type = 'law_firm'

  No RLS changes. No table structure changes.
*/

UPDATE organizations
SET sector = 'law_firm'
WHERE sector IS NULL
  AND business_type = 'law_firm';
