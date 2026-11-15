-- =============================================================================
-- Migration: 003_activity_logs_insert_policy.sql
-- Description: Allow authenticated users to securely insert their own activity logs.
-- Narrowly scoped: Users can ONLY insert rows where auth.uid() matches user_id.
-- Strictly preserves existing records, tables, and RLS protection.
-- =============================================================================

-- 1. Ensure RLS is active
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop any previous conflicting policy
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_logs;

-- 3. Create narrowly scoped policy: user can ONLY insert rows for their own verified user_id
CREATE POLICY "Users can insert their own activity logs"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. Grant INSERT privilege to authenticated role
GRANT INSERT ON public.activity_logs TO authenticated;
