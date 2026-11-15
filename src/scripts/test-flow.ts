import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

async function testFullFlow() {
  const anonSupabase = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!);

  console.log('--- Step 1: Sign up new user ---');
  const testEmail = `flow_${Date.now()}@example.com`;
  const { data: authData, error: authErr } = await anonSupabase.auth.signUp({
    email: testEmail,
    password: 'Password123!',
  });

  if (authErr || !authData.session || !authData.user) {
    console.error('Auth error:', authErr);
    return;
  }
  const token = authData.session.access_token;
  console.log('User created:', authData.user.id);

  console.log('\n--- Step 2: Save reflection via Render API ---');
  const refRes = await fetch('https://therapy-companion-backend.onrender.com/api/v1/reflections', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      questionOne: 'Felt stressed by upcoming presentation',
      questionTwo: 'Tightness in neck and shallow breathing',
      questionThree: 'A 5-minute walk outside in the fresh air',
    }),
  });
  console.log('POST /reflections status:', refRes.status);
  const refJson = await refRes.json();
  console.log('POST /reflections body:', refJson);

  const reflectionId = refJson.data?.id;
  if (!reflectionId) {
    console.error('No reflection ID returned!');
    return;
  }

  console.log('\n--- Step 3: Call POST /exercises/complete on Render with valid reflection ID ---');
  const exRes = await fetch('https://therapy-companion-backend.onrender.com/api/v1/exercises/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      exerciseId: 'understanding-emotional-triggers',
      reflectionEntryId: reflectionId,
    }),
  });
  console.log('POST /exercises/complete status:', exRes.status);
  const exJson = await exRes.json();
  console.log('POST /exercises/complete body:', JSON.stringify(exJson, null, 2));
}

testFullFlow().catch(console.error);
