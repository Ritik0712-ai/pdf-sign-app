-- ============================================
-- Fix missing columns in signatures table
-- Run this in Supabase SQL Editor
-- ============================================

-- Add missing columns to signatures table
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS width_percent DECIMAL(5,2) DEFAULT 20.00;
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS height_percent DECIMAL(5,2) DEFAULT 10.00;

-- Also add missing columns to documents table if needed
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS total_pages INTEGER DEFAULT 1;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;

-- Refresh the PostgREST schema cache so changes take effect immediately
NOTIFY pgrst, 'reload';

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'signatures' AND column_name IN ('width_percent', 'height_percent');