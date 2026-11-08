-- =========================================================================
-- Supabase Setup Script for Sakhuwanankarkatti Municipal Portal
-- Project ID: bwhuqislebkgmoarbjjs
-- Instructions: Copy and paste this script into your Supabase SQL Editor and click "Run"
-- =========================================================================

-- 1. Create Complaints Table
CREATE TABLE IF NOT EXISTS public.complaints (
    id TEXT PRIMARY KEY,
    reference_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    ward_number INTEGER NOT NULL DEFAULT 1,
    landmark TEXT DEFAULT '',
    description TEXT NOT NULL,
    preferred_reply_language TEXT DEFAULT 'ne',
    contact_method TEXT DEFAULT 'phone',
    citizen_name TEXT,
    citizen_phone TEXT,
    citizen_email TEXT,
    is_confidential_identity BOOLEAN DEFAULT FALSE,
    is_chairperson_attention_requested BOOLEAN DEFAULT FALSE,
    is_conflict_of_interest BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'Submitted',
    assigned_department TEXT,
    assigned_ward INTEGER,
    assigned_officer_name TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    status_history JSONB DEFAULT '[]'::jsonb,
    sla_target_days INTEGER DEFAULT 7,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Messages / Timeline Notes Table
CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY,
    complaint_id TEXT REFERENCES public.complaints(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Chairperson Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    reference_number TEXT UNIQUE NOT NULL,
    citizen_name TEXT NOT NULL,
    citizen_phone TEXT NOT NULL,
    citizen_ward INTEGER NOT NULL DEFAULT 1,
    requested_date TEXT NOT NULL,
    requested_time_slot TEXT NOT NULL DEFAULT '10:00 AM',
    purpose TEXT NOT NULL DEFAULT '',
    related_complaint_ref TEXT,
    status TEXT NOT NULL DEFAULT 'Requested',
    secretariat_notes TEXT,
    reviewed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 5. Create Permissive Policies for Web Portal (allows public reading and writing via anon/publishable key)
DROP POLICY IF EXISTS "Public complaints read policy" ON public.complaints;
CREATE POLICY "Public complaints read policy" ON public.complaints
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public complaints insert policy" ON public.complaints;
CREATE POLICY "Public complaints insert policy" ON public.complaints
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public complaints update policy" ON public.complaints;
CREATE POLICY "Public complaints update policy" ON public.complaints
    FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Public messages read policy" ON public.messages;
CREATE POLICY "Public messages read policy" ON public.messages
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public messages insert policy" ON public.messages;
CREATE POLICY "Public messages insert policy" ON public.messages
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public appointments read policy" ON public.appointments;
CREATE POLICY "Public appointments read policy" ON public.appointments
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public appointments insert policy" ON public.appointments;
CREATE POLICY "Public appointments insert policy" ON public.appointments
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public appointments update policy" ON public.appointments;
CREATE POLICY "Public appointments update policy" ON public.appointments
    FOR UPDATE TO public USING (true);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_complaints_ref ON public.complaints (reference_number);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints (status);
CREATE INDEX IF NOT EXISTS idx_messages_complaint ON public.messages (complaint_id);
CREATE INDEX IF NOT EXISTS idx_appointments_ref ON public.appointments (reference_number);
