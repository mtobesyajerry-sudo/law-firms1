-- Add 'pending_senior' to senior_approval_status constraint for two-step PEP approval flow.
-- The existing constraint allows: not_required, pending, approved, rejected.
-- We add pending_senior to distinguish "CO has submitted assessment, awaiting MLRO sign-off"
-- from the generic 'pending' (which means "awaiting any compliance action").

ALTER TABLE kyc_clients DROP CONSTRAINT IF EXISTS kyc_clients_senior_approval_status_check;

ALTER TABLE kyc_clients ADD CONSTRAINT kyc_clients_senior_approval_status_check
  CHECK (senior_approval_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'pending_senior'::text, 'approved'::text, 'rejected'::text]));
