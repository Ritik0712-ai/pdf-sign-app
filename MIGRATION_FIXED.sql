-- Run this in Supabase SQL Editor FIRST (before the main migration)

-- Step 1: Update existing signature types to new values
UPDATE public.signatures 
SET signature_type = 'signature' 
WHERE signature_type IN ('typed', 'image', 'drawn');

-- Step 2: Now add the new column and constraint
ALTER TABLE public.signatures 
DROP CONSTRAINT IF EXISTS signatures_signature_type_check;

ALTER TABLE public.signatures 
ADD CONSTRAINT signatures_signature_type_check 
CHECK (signature_type IN ('signature', 'date', 'initials', 'checkbox'));

-- Step 3: Add signature_id column to signing_links if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'signing_links' AND column_name = 'signature_id'
  ) THEN
    ALTER TABLE public.signing_links ADD COLUMN signature_id UUID REFERENCES public.signatures(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 4: Add indexes
CREATE INDEX IF NOT EXISTS idx_signing_links_signature_id ON public.signing_links(signature_id);
CREATE INDEX IF NOT EXISTS idx_documents_title ON public.documents(title);

SELECT 'Migration completed successfully!' as status;
