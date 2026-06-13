-- Audit Logs Table for Document Signature App
-- Run this in Supabase SQL Editor

-- Create the table only if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create the policy only if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'Allow all access to audit_logs'
  ) THEN
    CREATE POLICY "Allow all access to audit_logs"
      ON public.audit_logs
      FOR ALL
      USING (true);
  END IF;
END $$;