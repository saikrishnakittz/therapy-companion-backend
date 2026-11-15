-- =============================================================================
-- Migration: 003_exercise_automation_fix.sql
-- Description: Complete fix for Exercise Completion Automation & Activity Logs
-- 1. Narrowly scoped RLS INSERT policy for activity_logs (allows direct fallback)
-- 2. Unique idempotency index uq_activity_logs_exercise_reflection
-- 3. Secure SECURITY DEFINER RPC function complete_exercise supporting all aliases
-- Strictly preserves all existing tables, rows, columns, and security policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1: Ensure RLS and grant INSERT policy to authenticated users
-- -----------------------------------------------------------------------------
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can insert their own activity logs"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT INSERT, SELECT ON public.activity_logs TO authenticated;

-- -----------------------------------------------------------------------------
-- Step 2: Unique Idempotency Constraint
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_logs_exercise_reflection
  ON public.activity_logs (user_id, exercise_id, reflection_entry_id)
  WHERE reflection_entry_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Step 3: Secure SECURITY DEFINER RPC function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_exercise(
  p_exercise_id TEXT,
  p_reflection_entry_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_reflection_owner UUID;
  v_canonical_exercise_id TEXT;
  v_existing_id UUID;
  v_existing_created_at TIMESTAMPTZ;
  v_new_id UUID;
  v_new_created_at TIMESTAMPTZ;
BEGIN
  -- A. Verify caller is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- B. Verify and normalize exercise ID
  IF p_exercise_id NOT IN ('understanding-emotional-triggers', 'emotional-triggers', 'understanding-triggers') THEN
    RAISE EXCEPTION 'Unsupported exercise ID: %', p_exercise_id USING ERRCODE = '22023';
  END IF;
  v_canonical_exercise_id := 'understanding-emotional-triggers';

  -- C. Verify reflection entry exists and belongs to auth.uid()
  SELECT user_id INTO v_reflection_owner
  FROM public.reflection_entries
  WHERE id = p_reflection_entry_id;

  IF v_reflection_owner IS NULL THEN
    RAISE EXCEPTION 'Reflection entry not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_reflection_owner <> v_user_id THEN
    RAISE EXCEPTION 'Reflection entry does not belong to authenticated user' USING ERRCODE = '42501';
  END IF;

  -- D. Idempotency check: Return existing record if already completed
  SELECT id, created_at INTO v_existing_id, v_existing_created_at
  FROM public.activity_logs
  WHERE user_id = v_user_id
    AND exercise_id = v_canonical_exercise_id
    AND reflection_entry_id = p_reflection_entry_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'id', v_existing_id,
      'eventType', 'exercise_completed',
      'exerciseId', v_canonical_exercise_id,
      'reflectionEntryId', p_reflection_entry_id,
      'createdAt', v_existing_created_at,
      'alreadyCompleted', true
    );
  END IF;

  -- E. Insert only completion metadata (never stores reflection answers or notes)
  INSERT INTO public.activity_logs (
    user_id,
    event_type,
    exercise_id,
    reflection_entry_id,
    created_at
  )
  VALUES (
    v_user_id,
    'exercise_completed',
    v_canonical_exercise_id,
    p_reflection_entry_id,
    timezone('utc'::text, now())
  )
  RETURNING id, created_at INTO v_new_id, v_new_created_at;

  -- F. Return metadata
  RETURN jsonb_build_object(
    'id', v_new_id,
    'eventType', 'exercise_completed',
    'exerciseId', v_canonical_exercise_id,
    'reflectionEntryId', p_reflection_entry_id,
    'createdAt', v_new_created_at,
    'alreadyCompleted', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_exercise(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_exercise(TEXT, UUID) TO authenticated;
