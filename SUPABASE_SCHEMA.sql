-- ============================================
-- PDF Sign App - Complete Database Setup
-- Safe to run multiple times (idempotent)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_signatures_document_id ON public.signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_signing_links_token ON public.signing_links(token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id ON public.audit_logs(document_id);

-- ============================================
-- ROW LEVEL SECURITY (Tables)
-- ============================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop all table policies
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- Recreate table policies
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Owners can view their documents" ON public.documents FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Owners can insert documents" ON public.documents FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update their documents" ON public.documents FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owners can delete their documents" ON public.documents FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Users can view signatures" ON public.signatures FOR SELECT USING (document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert signatures" ON public.signatures FOR INSERT WITH CHECK (document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update signatures" ON public.signatures FOR UPDATE USING (document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can view links" ON public.signing_links FOR SELECT USING (document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid()));
CREATE POLICY "Owners can create links" ON public.signing_links FOR INSERT WITH CHECK (document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can view audit logs" ON public.audit_logs FOR SELECT USING (document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid()));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, name, email, avatar_url)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email, NEW.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STORAGE (buckets only - no policies here)
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;