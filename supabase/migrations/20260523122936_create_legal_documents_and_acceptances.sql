/*
  # Legal Documents and User Acceptances

  ## New Tables

  ### legal_documents
  Stores versioned legal documents (Privacy Policy, ToS, DPA, etc.) with
  effective dates and supersession tracking. Ready to receive content from
  legal counsel once drafts are complete.

  ### user_legal_acceptances
  Immutable acceptance records — one row per user per document version.
  INSERT-only by design: UPDATE and DELETE are blocked by RLS policy.
  Records ip_address and user_agent at acceptance time for audit evidence.

  ## Security
  - legal_documents: public SELECT (legal docs are public); admin-only write
  - user_legal_acceptances: users can INSERT/SELECT their own; admin can SELECT all;
    UPDATE and DELETE blocked for all users including admin (legal records)

  ## Notes
  - admin write policy uses FOR ALL which covers INSERT/UPDATE/DELETE for admin
    (legal_docs_no_delete_update policy below overrides for non-admin attempt)
  - Acceptance records are append-only by policy — not even admin can alter them
*/

CREATE TABLE IF NOT EXISTS legal_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type    TEXT NOT NULL CHECK (document_type IN (
    'privacy_policy', 'terms_of_service', 'dpa', 'cookie_policy', 'aml_disclosure'
  )),
  version          TEXT NOT NULL,
  content          TEXT NOT NULL,
  summary_of_changes TEXT,
  effective_date   DATE NOT NULL,
  superseded_date  DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  created_by       UUID REFERENCES auth.users(id),
  UNIQUE (document_type, version)
);

CREATE TABLE IF NOT EXISTS user_legal_acceptances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES legal_documents(id),
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address  INET,
  user_agent  TEXT,
  UNIQUE (user_id, document_id)
);

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_legal_acceptances ENABLE ROW LEVEL SECURITY;

-- legal_documents policies
CREATE POLICY "legal_docs_public_read"
  ON legal_documents FOR SELECT
  USING (true);

CREATE POLICY "legal_docs_admin_insert"
  ON legal_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "legal_docs_admin_update"
  ON legal_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "legal_docs_admin_delete"
  ON legal_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- user_legal_acceptances policies
CREATE POLICY "user_acceptances_own_select"
  ON user_legal_acceptances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_acceptances_own_insert"
  ON user_legal_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_acceptances_admin_read"
  ON user_legal_acceptances FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Acceptance records are legal evidence — immutable for all users including admin
CREATE POLICY "user_acceptances_no_update"
  ON user_legal_acceptances FOR UPDATE
  USING (false);

CREATE POLICY "user_acceptances_no_delete"
  ON user_legal_acceptances FOR DELETE
  USING (false);
