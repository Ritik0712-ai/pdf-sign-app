-- Migration: Add new field types (signature, date, initials, checkbox)
-- Run this in Supabase SQL Editor

-- Drop old constraint and add new one for signature_type
ALTER TABLE public.signatures 
DROP CONSTRAINT IF EXISTS signatures_signature_type_check;

ALTER TABLE public.signatures 
ADD CONSTRAINT signatures_signature_type_check 
CHECK (signature_type IN ('signature', 'date', 'initials', 'checkbox'));

-- Add signature_id to signing_links if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'signing_links' AND column_name = 'signature_id'
  ) THEN
    ALTER TABLE public.signing_links ADD COLUMN signature_id UUID REFERENCES public.signatures(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update existing records to use 'signature' instead of 'typed', 'image', or 'drawn'
UPDATE public.signatures 
SET signature_type = 'signature' 
WHERE signature_type IN ('typed', 'image', 'drawn');

-- Create index on signature_id if not exists
CREATE INDEX IF NOT EXISTS idx_signing_links_signature_id ON public.signing_links(signature_id);

-- Add index for searching documents
CREATE INDEX IF NOT EXISTS idx_documents_title ON public.documents(title);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

SELECT 'Migration completed successfully!' as status;
