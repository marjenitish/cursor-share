-- Create emailing_list table for admin notifications
CREATE TABLE IF NOT EXISTS emailing_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollments text[] DEFAULT '{}',
  paq_forms text[] DEFAULT '{}',
  payments text[] DEFAULT '{}',
  class_cancellation text[] DEFAULT '{}',
  customer_profile_updates text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE emailing_list ENABLE ROW LEVEL SECURITY;

-- Policies for admin access
CREATE POLICY "Admin users can manage emailing lists"
  ON emailing_list
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Insert default empty record
INSERT INTO emailing_list (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING; 