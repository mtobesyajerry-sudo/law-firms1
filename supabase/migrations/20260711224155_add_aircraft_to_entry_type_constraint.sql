ALTER TABLE screening_list_entries DROP CONSTRAINT screening_list_entries_entry_type_check;
ALTER TABLE screening_list_entries ADD CONSTRAINT screening_list_entries_entry_type_check
  CHECK (entry_type = ANY (ARRAY['individual'::text, 'entity'::text, 'vessel'::text, 'address'::text, 'aircraft'::text]));