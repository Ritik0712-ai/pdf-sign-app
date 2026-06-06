-- ============================================
-- FIX: Completely disable RLS and recreate
-- Run this to fix duplicate policies
-- ============================================

-- Disable RLS on all tables first
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Drop all policies using a different method
DO $$ 
DECLARE
    p RECORD;
BEGIN
    FOR p IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p.policyname, p.tablename);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Recreate all policies

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Documents Policies
CREATE POLICY "Owners can view their documents" ON public.documents FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Owners can insert documents" ON public.documents FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update their documents" ON public.documents FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owners can delete their documents" ON public.documents FOR DELETE USING (owner_id = auth.uid());

-- Signatures Policies
CREATE POLICY "Users can view signatures" ON public.signatures FOR SELECT USING (document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert signatures" ON public.signatures FOR INSERT WITH CHECK (document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update signatures" ON public.signatures FOR UPDATE USING (document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid()));

-- Signing Links Policies
CREATE POLICY "Owners can view links" ON public.signing_links FOR SELECT USING (document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid()));
CREATE POLICY "Owners can create links" ON public.signing_links FOR INSERT WITH CHECK (document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid()));

-- Audit Logs Policies
CREATE POLICY "Owners can view audit logs" ON public.audit_logs FOR SELECT USING (document_id IN (SELECT id FROM public.documents WHERE owner_id = auth.uid()));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Recreate auto-create profile function
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