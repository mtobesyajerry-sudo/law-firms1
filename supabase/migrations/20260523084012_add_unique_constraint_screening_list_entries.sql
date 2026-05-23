/*
  # Add UNIQUE constraint on screening_list_entries(list_id, external_id)

  Required for the ingestion-processor upsert ON CONFLICT clause to work.
  Uses DO block to skip if constraint already exists.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'screening_list_entries_list_id_external_id_key'
      AND conrelid = 'screening_list_entries'::regclass
  ) THEN
    ALTER TABLE screening_list_entries
      ADD CONSTRAINT screening_list_entries_list_id_external_id_key
      UNIQUE (list_id, external_id);
  END IF;
END $$;
