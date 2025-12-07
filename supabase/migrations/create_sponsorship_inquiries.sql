-- Create sponsorship_inquiries table
CREATE TABLE IF NOT EXISTS sponsorship_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  sponsorship_interest TEXT NOT NULL,
  budget_range TEXT,
  message TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'completed', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_sponsorship_inquiries_status ON sponsorship_inquiries(status);
CREATE INDEX idx_sponsorship_inquiries_created_at ON sponsorship_inquiries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE sponsorship_inquiries ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (submit inquiry)
CREATE POLICY "Anyone can submit sponsorship inquiry"
  ON sponsorship_inquiries
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Only admins can view all inquiries
CREATE POLICY "Admins can view all sponsorship inquiries"
  ON sponsorship_inquiries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update inquiries
CREATE POLICY "Admins can update sponsorship inquiries"
  ON sponsorship_inquiries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sponsorship_inquiries_updated_at
  BEFORE UPDATE ON sponsorship_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE sponsorship_inquiries IS 'Stores sponsorship inquiry submissions from potential sponsors';
