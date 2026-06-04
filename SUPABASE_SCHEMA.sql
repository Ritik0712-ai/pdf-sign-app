-- ============================================
-- PDF Sign App - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    original_file_url TEXT NOT NULL,
    signed_file_url TEXT,
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'signed', 'rejected', 'expired')),
    total_pages INTEGER DEFAULT 1,
    file_size BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SIGNATURES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    signer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    page_number INTEGER NOT NULL,
    x_percent DECIMAL(5,2) NOT NULL CHECK (x_percent >= 0 AND x_percent <= 100),
    y_percent DECIMAL(5,2) NOT NULL CHECK (y_percent >= 0 AND y_percent <= 100),
    signature_type VARCHAR(20) DEFAULT 'typed' CHECK (signature_type IN ('typed', 'image', 'drawn')),
    signature_value TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'rejected')),
    signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SIGNING LINKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.signing_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    signer_name VARCHAR(100) NOT NULL,
    signer_email VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_signatures_document_id ON public.signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_signatures_signer_id ON public.signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_signatures_status ON public.signatures(status);
CREATE INDEX IF NOT EXISTS idx_signing_links_token ON public.signing_links(token);
CREATE INDEX IF NOT EXISTS idx_signing_links_document_id ON public.signing_links(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id ON public.audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users: Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Documents: Owners can do everything
CREATE POLICY "Owners can view their documents" ON public.documents
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert documents" ON public.documents
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their documents" ON public.documents
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their documents" ON public.documents
    FOR DELETE USING (owner_id = auth.uid());

-- Signatures: Related to document access
CREATE POLICY "Users can view signatures on their documents" ON public.signatures
    FOR SELECT USING (
        document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can insert signatures on their documents" ON public.signatures
    FOR INSERT WITH CHECK (
        document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can update signatures on their documents" ON public.signatures
    FOR UPDATE USING (
        document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid())
    );

-- Signing Links: Document owners can manage
CREATE POLICY "Owners can view links on their documents" ON public.signing_links
    FOR SELECT USING (
        document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can create links on their documents" ON public.signing_links
    FOR INSERT WITH CHECK (
        document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid())
    );

-- Audit Logs: Document owners can view
CREATE POLICY "Owners can view audit logs on their documents" ON public.audit_logs
    FOR SELECT USING (
        document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid())
    );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- ============================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- ============================================
-- Go to Storage > New Bucket
-- Create buckets:
-- 1. "documents" (public: false)
-- 2. "signatures" (public: false)
-- 
-- Add storage policies:
-- INSERT into storage.buckets (name, id, public) VALUES ('documents', 'documents', false);
-- INSERT into storage.buckets (name, id, public) VALUES ('signatures', 'signatures', false);

-- ============================================
-- FUNCTION: Update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
