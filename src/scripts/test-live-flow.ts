import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const RENDER_BASE = 'https://therapy-companion-backend.onrender.com/api/v1';

async function run() {
  console.log('Testing live flow against:', RENDER_BASE);
  const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!);

  // 1. Create or log in a test user in Supabase
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  console.log('Creating test user via Supabase auth.signUp...');
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (authError || !authData.session) {
    console.error('Sign up error:', authError);
    // Try logging in with existing test user if signup fails
    return;
  }

  const token = authData.session.access_token;
  const userId = authData.user?.id;
  console.log('Test user created:', userId, 'Token acquired length:', token.length);

  // 2. Call POST /api/v1/reflections on live Render backend
  console.log('\nCalling live Render backend POST /api/v1/reflections...');
  const refRes = await fetch(`${RENDER_BASE}/reflections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      questionOne: 'Felt stressed before a big meeting at work',
      questionTwo: 'My chest was tight and I doubted my preparation',
      questionThree: 'I needed five minutes of quiet breathing and self-compassion',
    }),
  });

  console.log('POST /reflections status:', refRes.status);
  const refJson = await refRes.json();
  console.log('POST /reflections response:', JSON.stringify(refJson, null, 2));

  if (!refJson.data?.id) {
    console.error('Failed to create reflection on Render');
    return;
  }

  const reflectionId = refJson.data.id;
  console.log('Created reflection ID:', reflectionId);

  // Check if reflection exists in Supabase directly using user-scoped client
  const userClient = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: dbRef, error: dbRefErr } = await userClient
    .from('reflection_entries')
    .select('*')
    .eq('id', reflectionId);
  console.log('Direct Supabase query for reflection_entries:', dbRef, 'Error:', dbRefErr);

  // 3. Call POST /api/v1/exercises/complete on live Render backend
  console.log('\nCalling live Render backend POST /api/v1/exercises/complete...');
  const exRes = await fetch(`${RENDER_BASE}/exercises/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      exerciseId: 'understanding-emotional-triggers',
      reflectionEntryId: reflectionId,
    }),
  });

  console.log('POST /exercises/complete status:', exRes.status);
  const exJson = await exRes.json();
  console.log('POST /exercises/complete response:', JSON.stringify(exJson, null, 2));

  // Check Supabase activity_logs directly
  const { data: dbLogs, error: dbLogsErr } = await userClient
    .from('activity_logs')
    .select('*')
    .eq('reflection_entry_id', reflectionId);
  console.log('Direct Supabase query for activity_logs:', dbLogs, 'Error:', dbLogsErr);

  // 4. Call GET /api/v1/activity-logs on live Render backend
  console.log('\nCalling live Render backend GET /api/v1/activity-logs...');
  const actRes = await fetch(`${RENDER_BASE}/activity-logs`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  console.log('GET /activity-logs status:', actRes.status);
  const actJson = await actRes.json();
  console.log('GET /activity-logs response:', JSON.stringify(actJson, null, 2));
}

run().catch(console.error);
