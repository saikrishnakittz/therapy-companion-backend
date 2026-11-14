-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Initial schema for Therapy Companion
-- Tables: profiles, mood_checkins, reflection_entries, activity_logs
-- Features: Foreign keys, cascade rules, indexes, updated_at triggers, RLS policies
-- =============================================================================

-- Enable pgcrypto / uuid-ossp for gen_random_uuid() if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. REUSABLE TRIGGER FOR UPDATED_AT
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. PROFILES TABLE
-- References auth.users(id) - Created when a user signs up
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  primary_goal TEXT,
  preferred_tone TEXT,
  reminder_preference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger to maintain updated_at on profiles
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies: Users can only select, insert, or update their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- 3. MOOD_CHECKINS TABLE
-- Stores daily emotional check-ins with intensity and optional journal notes
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mood_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emotion TEXT NOT NULL,
  intensity SMALLINT NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
  optional_note VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for mood_checkins
CREATE INDEX IF NOT EXISTS idx_mood_checkins_user_id ON public.mood_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_checkins_created_at ON public.mood_checkins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_checkins_user_created ON public.mood_checkins(user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;

-- Mood Check-ins RLS Policies: Users can only CRUD their own check-in records
DROP POLICY IF EXISTS "Users can view their own check-ins" ON public.mood_checkins;
CREATE POLICY "Users can view their own check-ins"
  ON public.mood_checkins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own check-ins" ON public.mood_checkins;
CREATE POLICY "Users can insert their own check-ins"
  ON public.mood_checkins
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own check-ins" ON public.mood_checkins;
CREATE POLICY "Users can update their own check-ins"
  ON public.mood_checkins
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own check-ins" ON public.mood_checkins;
CREATE POLICY "Users can delete their own check-ins"
  ON public.mood_checkins
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- 4. REFLECTION_ENTRIES TABLE
-- Stores multi-step guided reflection entries
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.reflection_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_one TEXT NOT NULL CHECK (char_length(question_one) > 0),
  question_two TEXT NOT NULL CHECK (char_length(question_two) > 0),
  question_three TEXT NOT NULL CHECK (char_length(question_three) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger to maintain updated_at on reflection_entries
DROP TRIGGER IF EXISTS set_reflection_entries_updated_at ON public.reflection_entries;
CREATE TRIGGER set_reflection_entries_updated_at
  BEFORE UPDATE ON public.reflection_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for reflection_entries
CREATE INDEX IF NOT EXISTS idx_reflection_entries_user_id ON public.reflection_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_reflection_entries_created_at ON public.reflection_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reflection_entries_user_created ON public.reflection_entries(user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reflection_entries ENABLE ROW LEVEL SECURITY;

-- Reflection Entries RLS Policies: Users can only CRUD their own reflections
DROP POLICY IF EXISTS "Users can view their own reflection entries" ON public.reflection_entries;
CREATE POLICY "Users can view their own reflection entries"
  ON public.reflection_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own reflection entries" ON public.reflection_entries;
CREATE POLICY "Users can insert their own reflection entries"
  ON public.reflection_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reflection entries" ON public.reflection_entries;
CREATE POLICY "Users can update their own reflection entries"
  ON public.reflection_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reflection entries" ON public.reflection_entries;
CREATE POLICY "Users can delete their own reflection entries"
  ON public.reflection_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- 5. ACTIVITY_LOGS TABLE
-- Tracks verified exercise completions and sanctuary activity events.
-- IMPORTANT: Clients must NOT directly insert or modify activity logs.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  reflection_entry_id UUID NULL REFERENCES public.reflection_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_reflection_entry_id ON public.activity_logs(reflection_entry_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON public.activity_logs(user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Activity Logs RLS Policy: Users can view their own activity logs
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- NOTE: By enabling RLS and defining ONLY a SELECT policy for authenticated users,
-- direct INSERT, UPDATE, and DELETE operations from clients are strictly blocked by PostgreSQL.
-- Activity logging must be performed through verified server endpoints or SECURITY DEFINER functions.

-- =============================================================================
-- 6. OPTIONAL PROFILE AUTO-CREATION HOOK
-- Automatically creates a public.profiles record when a user signs up via auth.users
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Friend')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
