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

---

## How to Apply Migrations to Supabase

### Option 1: Supabase Dashboard SQL Editor (Recommended)

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (**tueaueufywgfzicyewpm**).
3. In the left-hand navigation sidebar, click **SQL Editor** (icon `>_`).
4. Click **+ New Query**.
5. Copy the entire contents of [`001_initial_schema.sql`](./001_initial_schema.sql).
6. Paste the SQL script into the editor.
7. Click the green **Run** button (or press `Ctrl + Enter` / `Cmd + Enter`).
8. You should see `Success. No rows returned`.

---

## How to Verify Table Creation

1. In the Supabase Dashboard, click **Table Editor** (grid icon) in the left sidebar.
2. In the `public` schema dropdown, verify the presence of all 4 tables:
   - `profiles`
   - `mood_checkins`
   - `reflection_entries`
   - `activity_logs`
3. Click on each table to inspect columns, constraints, and relationships.

---

## How to Verify Row Level Security (RLS)

1. In the Supabase Dashboard, navigate to **Authentication** -> **Policies** (or click the shield icon next to each table in the Table Editor).
2. Verify that:
   - **`profiles`**: RLS is **Enabled** (green badge). Policies: `Users can view their own profile`, `Users can insert their own profile`, `Users can update their own profile`.
   - **`mood_checkins`**: RLS is **Enabled**. Policies: `Users can view their own check-ins`, `insert`, `update`, `delete`.
   - **`reflection_entries`**: RLS is **Enabled**. Policies: `Users can view their own reflection entries`, `insert`, `update`, `delete`.
   - **`activity_logs`**: RLS is **Enabled**. Only `Users can view their own activity logs` (`SELECT`) is present. **No direct client insert/update/delete policies are permitted**, ensuring completion events cannot be forged by clients.

---

## How to Keep Future Migrations Version-Controlled

1. Whenever schema changes are needed, create a new sequential migration file in this directory:
   - Format: `00X_descriptive_name.sql` (e.g., `002_add_journal_tags.sql`).
2. Always write idempotent SQL statements using `IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`, etc.
3. Test the migration locally or in a staging project before committing.
4. Commit the migration file to Git repository:
   ```bash
   git add backend/database/migrations/
   git commit -m "feat(database): Add 00X migration"
   ```
5. Apply the migration script to the production Supabase database via the SQL Editor or Supabase CLI.
6. Verify live status using the automated diagnostic tool:
   ```bash
   npm run db:verify
   ```
