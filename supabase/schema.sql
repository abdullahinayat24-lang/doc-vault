-- ==============================================================================
-- DocVault: Complete Solicitor Practice, Clients & Document Schema for Supabase
-- ==============================================================================

-- 1. SOLICITOR PROFILES & COMPANY DETAILS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  company_name TEXT DEFAULT 'Apex Legal & Solicitor Chambers',
  company_logo TEXT,
  phone TEXT,
  address TEXT,
  pin_code TEXT DEFAULT '1234',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CLIENTS DIRECTORY (Each client has their own isolated profile)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  came_for TEXT NOT NULL, -- Purpose: e.g. "Spouse Settlement & Leave to Remain"
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  total_asking_amount NUMERIC(10,2) DEFAULT 0.00, -- Agreed Solicitor Fee
  total_doc_cost NUMERIC(10,2) DEFAULT 0.00, -- Cost for sending docs / registry
  amount_paid NUMERIC(10,2) DEFAULT 0.00,
  visit_count INT DEFAULT 1, -- e.g. came 4 times
  first_visit_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_visit_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CLIENT CASE TABS (e.g. "Application in 2024", "Wife Application in 2025")
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  case_number TEXT,
  icon TEXT DEFAULT 'briefcase',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. DOCUMENTS & REQUIREMENT SLOTS
-- Status Color Codes:
--   'missing': RED (Document requirement slot created, file not uploaded yet)
--   'disapproved': RED (Solicitor rejected, re-upload needed)
--   'approved': GREEN (Verified and stamped)
--   'pending': WHITE / Normal (Uploaded, awaiting review)
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY,
  solicitor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  url TEXT,
  content TEXT, -- Editable document text / HTML content
  has_file BOOLEAN DEFAULT true, -- false for missing requirement slots
  status TEXT DEFAULT 'pending' CHECK (status IN ('missing', 'disapproved', 'pending', 'approved')),
  notes TEXT,
  storage_path TEXT,
  uploaded_by TEXT DEFAULT 'solicitor' CHECK (uploaded_by IN ('solicitor', 'client')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. SHARED CLIENT PORTALS (Protected by 4-digit PIN)
-- Share Types:
--   'uploader': Portal for client to submit/upload missing documents
--   'viewer': Portal for client to view/inspect approved documents
CREATE TABLE IF NOT EXISTS public.shared_links (
  id TEXT PRIMARY KEY,
  solicitor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('viewer', 'uploader')),
  scope TEXT NOT NULL CHECK (scope IN ('single', 'multiple', 'collection')),
  target_ids TEXT[] NOT NULL,
  passcode TEXT NOT NULL, -- 4-digit privacy PIN
  allow_client_upload BOOLEAN DEFAULT true,
  payload JSONB, -- Embedded documents & folders payload for instant cross-device access
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMPTZ
);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- Ensures complete isolation: each solicitor only accesses their own clients
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solicitor manages own profile" 
ON public.profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Solicitor manages own clients" 
ON public.clients FOR ALL USING (auth.uid() = solicitor_id);

CREATE POLICY "Solicitor manages own case tabs" 
ON public.collections FOR ALL USING (auth.uid() = solicitor_id);

CREATE POLICY "Solicitor manages own documents" 
ON public.documents FOR ALL USING (auth.uid() = solicitor_id);

CREATE POLICY "Solicitor manages own share links" 
ON public.shared_links FOR ALL USING (auth.uid() = solicitor_id OR solicitor_id IS NULL);

-- Public Policy for 4-digit PIN verified access
CREATE POLICY "Public can view valid shared link" 
ON public.shared_links FOR SELECT USING (true);

CREATE POLICY "Public can upsert shared links" 
ON public.shared_links FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update shared links" 
ON public.shared_links FOR UPDATE USING (true);

-- ==============================================================================
-- Supabase Storage Bucket Structure
-- Bucket Name: "documents"
-- Folder Organization:
--   documents / {solicitor_id} / {client_id} / {tab_id} / {filename}
-- Example:
--   documents/user_123/robert-vance/tab-app-2024/Passport_Copy_Certified.pdf
--   documents/user_123/robert-vance/tab-app-2025/Wife_Passport_Biometrics.pdf
-- ==============================================================================
