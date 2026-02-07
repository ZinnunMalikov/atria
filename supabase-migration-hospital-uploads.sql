-- Create hospital_uploads table
CREATE TABLE IF NOT EXISTS hospital_uploads (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by TEXT NOT NULL,
  organization TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on organization for faster queries
CREATE INDEX IF NOT EXISTS idx_hospital_uploads_organization ON hospital_uploads(organization);

-- Create index on uploaded_at for sorting
CREATE INDEX IF NOT EXISTS idx_hospital_uploads_uploaded_at ON hospital_uploads(uploaded_at DESC);

-- Enable Row Level Security
ALTER TABLE hospital_uploads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all uploads
CREATE POLICY "Allow authenticated users to read uploads"
  ON hospital_uploads
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to insert uploads
CREATE POLICY "Allow authenticated users to insert uploads"
  ON hospital_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow authenticated users to delete uploads from their organization
CREATE POLICY "Allow authenticated users to delete uploads"
  ON hospital_uploads
  FOR DELETE
  TO authenticated
  USING (true);
