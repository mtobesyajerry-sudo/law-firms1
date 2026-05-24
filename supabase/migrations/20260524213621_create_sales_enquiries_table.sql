/*
  # Create sales_enquiries table

  Stores contact-sales form submissions from the public pricing page.
  Anonymous users can insert; only admins can read/manage.

  1. New Tables
    - `sales_enquiries` — firm name, contact details, advocate count, message, status workflow

  2. Security
    - RLS enabled
    - Anonymous users can INSERT (no auth required — public pricing page)
    - Authenticated admins have full access
*/

CREATE TABLE IF NOT EXISTS sales_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  advocate_count TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'pricing_page',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'won', 'lost')),
  assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sales_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_enquiries_admin_all"
  ON sales_enquiries FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "sales_enquiries_anon_insert"
  ON sales_enquiries FOR INSERT TO anon
  WITH CHECK (true);

-- Also allow authenticated (non-admin) users to submit from the pricing page
CREATE POLICY "sales_enquiries_authenticated_insert"
  ON sales_enquiries FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sales_enquiries_status ON sales_enquiries(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_enquiries_email ON sales_enquiries(email);

-- updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_sales_enquiries ON sales_enquiries;
CREATE TRIGGER set_updated_at_sales_enquiries
  BEFORE UPDATE ON sales_enquiries
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
