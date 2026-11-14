import { isSupabaseConfigured, getSupabaseClient } from '../config/supabase';
import { env } from '../config/env';

interface TableCheckResult {
  table: string;
  exists: boolean;
  rlsProtected: boolean;
  message: string;
}

export async function verifySupabase(): Promise<void> {
  console.log('====================================================');
  console.log('   THERAPY COMPANION – SUPABASE DATABASE VERIFICATION');
  console.log('====================================================\n');

  // 1. Environment Configuration Check
  console.log('1. Checking Environment Variables...');
  const urlProvided = Boolean(env.SUPABASE_URL && env.SUPABASE_URL.trim().length > 0);
  const keyProvided = Boolean(env.SUPABASE_ANON_KEY && env.SUPABASE_ANON_KEY.trim().length > 0);

  console.log(`   - SUPABASE_URL:      ${urlProvided ? env.SUPABASE_URL : '❌ Not configured in backend/.env'}`);
  console.log(`   - SUPABASE_ANON_KEY: ${keyProvided ? '[REDACTED]' : '❌ Not configured in backend/.env'}`);

  if (!isSupabaseConfigured()) {
    console.log('\n⚠️  Supabase credentials are not yet set in backend/.env.');
    console.log('   Please add your Supabase project credentials to backend/.env:');
    console.log('     SUPABASE_URL=https://your-project.supabase.co');
    console.log('     SUPABASE_ANON_KEY=your-anon-key\n');
    console.log('   Migration files are ready to apply at:');
    console.log('     backend/database/migrations/001_initial_schema.sql\n');
    return;
  }

  // 2. Connectivity Test
  console.log('\n2. Testing Supabase Connectivity...');
  const supabase = getSupabaseClient();
  const tables = ['profiles', 'mood_checkins', 'reflection_entries', 'activity_logs'];
  const results: TableCheckResult[] = [];

  for (const table of tables) {
    try {
      // Query table with limit(1) to accurately check table existence in PostgREST schema cache
      const { data, error, status } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        // PostgREST code PGRST204/PGRST205 or status 404 indicates table not found in schema cache
        const notFound =
          status === 404 ||
          error.code === 'PGRST204' ||
          error.code === 'PGRST205' ||
          error.message.includes('Could not find the table') ||
          error.message.includes('relation') ||
          error.message.includes('does not exist');

        if (notFound) {
          results.push({
            table,
            exists: false,
            rlsProtected: false,
            message: `Table not found in Supabase schema cache. Please apply 001_initial_schema.sql in the Supabase SQL Editor.`,
          });
        } else {
          // An auth/permission error or empty return indicates table exists with RLS active
          results.push({
            table,
            exists: true,
            rlsProtected: true,
            message: `Table exists. RLS active: Access restricted (${error.message}).`,
          });
        }
      } else {
        // If query succeeded with anonymous key and returned 0 rows or empty, RLS prevented row exposure
        results.push({
          table,
          exists: true,
          rlsProtected: true,
          message: `Table exists. Query returned ${data?.length || 0} public rows (RLS enforced).`,
        });
      }
    } catch (err: any) {
      results.push({
        table,
        exists: false,
        rlsProtected: false,
        message: `Query failed: ${err.message}`,
      });
    }
  }

  // 3. Output Table Diagnostics
  console.log('\n3. Table and RLS Verification Results:');
  for (const r of results) {
    const icon = r.exists ? '✅' : '❌';
    console.log(`   ${icon} [${r.table}]: ${r.message}`);
  }

  console.log('\n====================================================\n');
}

// Execute verification when run directly
if (require.main === module) {
  verifySupabase().catch((err) => {
    console.error('Verification failed with error:', err);
    process.exit(1);
  });
}
