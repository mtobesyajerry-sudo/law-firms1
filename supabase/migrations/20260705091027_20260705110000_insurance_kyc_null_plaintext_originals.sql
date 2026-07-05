-- Section F: Null plaintext originals after verified encryption
-- Pre-condition: beneficiaries_mismatch_count = 0, beneficial_owners_mismatch_count = 0 (verified)
UPDATE kyc_clients SET beneficiaries = NULL WHERE beneficiaries_encrypted IS NOT NULL;
UPDATE kyc_clients SET beneficial_owners = NULL WHERE beneficial_owners_encrypted IS NOT NULL;
