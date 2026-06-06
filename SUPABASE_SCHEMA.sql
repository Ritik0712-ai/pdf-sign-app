-- ============================================
-- PDF Sign App - Supabase Database Schema
-- Day 3: Updated for Supabase Auth integration
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(20),
    company VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
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
    signer_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    page_number INTEGER NOT NULL,
    x_percent DECIMAL(5,2) NOT NULL CHECK (x_percent >= 0 AND x_percent <= 100),
    y_percent DECIMAL(5,2) NOT NULL CHECK (y_percent >= 0 AND y_percent <= 100),
    width_percent DECIMAL(5,2) DEFAULT 20.00,
    height_percent DECIMAL(5,2) DEFAULT 10.00,
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
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
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
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can view/update their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

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
-- STORAGE BUCKETS
-- ============================================
-- Run these in Supabase Dashboard > Storage:
-- Create buckets: "documents", "signatures"

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, name, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Apply triggers to tables
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();