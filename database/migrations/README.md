# Therapy Companion – Supabase Database Migrations

This directory contains version-controlled SQL migrations for the Therapy Companion Supabase PostgreSQL database.

## Migrations Inventory

- **`001_initial_schema.sql`**: Initial core schema defining:
  - `profiles`: User preferences and profile details (linked 1:1 with `auth.users`).
  - `mood_checkins`: Daily emotional check-in records with 1–5 intensity constraints and optional notes.
  - `reflection_entries`: Multi-step guided reflections with non-empty text validations and updated_at triggers.
  - `activity_logs`: Sanctuary activity logs and exercise completion tracking with unique idempotency constraints.
  - Foreign key cascades, compound indexes (`user_id`, `created_at DESC`), updated_at trigger, and signup auto-profile hook.
  - Row Level Security (RLS) enabled on all tables restricting access strictly to `auth.uid() = user_id`, with client writes blocked on `activity_logs`.

- **`002_exercise_completion_rpc.sql`**: Exercise completion automation & security defining:
  - Unique idempotency index `uq_activity_logs_exercise_reflection` on `(user_id, exercise_id, reflection_entry_id)`.
  - Secure `SECURITY DEFINER` function `complete_exercise(p_exercise_id, p_reflection_entry_id)`.
  - Enforces `auth.uid()`, ownership of `reflection_entry_id`, exercise verification, and idempotency.
  - Revokes permissions from `PUBLIC` and grants execution strictly to `authenticated`.

- **`003_exercise_automation_fix.sql`** (Recommended Complete Fix):
  - Solves RLS insert policy errors on `activity_logs`.
  - Adds narrowly scoped policy: `Users can insert their own activity logs` (`WITH CHECK (auth.uid() = user_id)`).
  - Deploys `complete_exercise` RPC function supporting all aliases (`understanding-emotional-triggers`, `emotional-triggers`, `understanding-triggers`).
  - Ensures both the direct insert and RPC paths succeed seamlessly.

---

## How to Apply Migrations in Supabase SQL Editor

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (**tueaueufywgfzicyewpm**).
3. In the left-hand navigation sidebar, click **SQL Editor** (icon `>_`).
4. Click **+ New Query**.
5. Copy the SQL script to apply (e.g. [`002_exercise_completion_rpc.sql`](./002_exercise_completion_rpc.sql)).
6. Paste into the editor and click **Run** (or `Ctrl + Enter`).
7. Confirm output indicates `Success. No rows returned`.

---

## How to Verify Table Creation & RLS

1. **Table Editor**:
   - `profiles`, `mood_checkins`, `reflection_entries`, `activity_logs`.
2. **Authentication -> Policies**:
   - Confirm RLS is **Enabled** on all tables.
   - Confirm `activity_logs` has only `SELECT` granted to `authenticated` users, while insertions run strictly through `complete_exercise` RPC.
3. **Database -> Functions**:
   - Verify `complete_exercise` is listed with security type `DEFINER`.
