# Database Migrations – Therapy Companion

This directory contains version-controlled SQL migrations for the Supabase PostgreSQL database.

## Migrations List

- `001_initial_schema.sql`: Creates core tables (`profiles`, `mood_checkins`, `reflection_entries`, `activity_logs`), triggers, foreign keys, cascade rules, compound indexes, and Row Level Security (RLS) policies.

---

## How to Apply Migrations to Supabase

### Option A: Using the Supabase Dashboard SQL Editor (Recommended & Quickest)

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your **Therapy Companion** project.
3. In the left navigation, click **SQL Editor**.
4. Click **New Query**.
5. Copy the entire contents of [`001_initial_schema.sql`](./001_initial_schema.sql) and paste into the editor.
6. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
7. Verify that the execution succeeds with `Success. No rows returned`.

---

### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link to your Supabase project (find project-ref in your Supabase project URL)
supabase link --project-ref <your-project-id>

# Apply local migrations
supabase db push
```

---

## Verifying Migrations in Supabase Dashboard

After running the script, navigate to:
1. **Table Editor**:
   - `profiles`
   - `mood_checkins`
   - `reflection_entries`
   - `activity_logs`
2. **Authentication -> Policies**:
   - Ensure Row Level Security (RLS) is marked **Enabled** for all 4 tables.
   - Confirm policies restrict read/write access to matching `auth.uid()`.
   - Confirm `activity_logs` only has `SELECT` enabled for clients.
