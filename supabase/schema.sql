-- ==============================================================================
-- DocVault: Solicitor & Document Vault Database Schema for Supabase (PostgreSQL)
-- ==============================================================================

-- 1. Create Profiles Table (Solicitor / User Account Details)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  company_name TEXT DEFAULT 'Legal Chambers & Solicitor Practice',
  company_logo TEXT,
  phone TEXT,
  address TEXT,
  pin_code TEXT DEFAULT '1234',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Collection Tabs (Client Tabs, Case Applications)
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_name TEXT,
  case_number TEXT,
  icon TEXT DEFAULT 'briefcase',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Documents & Requirement Slots Table
-- Document statuses:
--   'missing': Red (Action required, no file uploaded yet)
--   'disapproved': Red (Solicitor requested re-upload)
--   'approved': Green (Verified and approved)
--   'pending': White / Normal (Uploaded, awaiting review)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'png', 'jpg', 'jpeg', 'epub', etc.
  file_size BIGINT DEFAULT 0,
  url TEXT,
  has_file BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('missing', 'disapproved', 'pending', 'approved')),
  notes TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Shared Links Table (Protected by 4-digit PIN)
CREATE TABLE IF NOT EXISTS public.shared_links (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('single', 'multiple', 'collection')),
  target_ids TEXT[] NOT NULL,
  passcode TEXT NOT NULL, -- 4-digit privacy PIN
  allow_client_upload BOOLEAN DEFAULT true,
  allow_client_approve BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMPTZ
);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can manage their own profile" 
ON public.profiles FOR ALL 
USING (auth.uid() = id);

-- Collections: Users can view and manage their own client tabs
CREATE POLICY "Users can manage their own collections" 
ON public.collections FOR ALL 
USING (auth.uid() = user_id);

-- Documents: Users can view and manage their own documents
CREATE POLICY "Users can manage their own documents" 
ON public.documents FOR ALL 
USING (auth.uid() = user_id);

-- Shared Links: Users can manage their own shared links
CREATE POLICY "Users can manage their own shares" 
ON public.shared_links FOR ALL 
USING (auth.uid() = user_id);

-- Public Read Policy for Shared Links (Protected by 4-digit PIN in app query)
CREATE POLICY "Public can view valid shared link metadata" 
ON public.shared_links FOR SELECT 
USING (true);

-- ==============================================================================
-- Storage Bucket Setup (Run in Supabase Dashboard -> Storage)
-- 1. Create a bucket named "documents" (Public or Private with signed URLs)
-- 2. Storage Policy:
--    Allow authenticated users to upload and read files where bucket_id = 'documents'
-- ==============================================================================
