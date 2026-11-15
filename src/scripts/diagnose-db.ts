import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

async function diagnose() {
  const maskedUrl = env.SUPABASE_URL
    ? env.SUPABASE_URL.replace(/https:\/\/(.{4}).*(\.supabase\.co)/, 'https://$1***$2')
    : 'undefined';
  console.log('Connecting to SUPABASE_URL:', maskedUrl);

  const anonSupabase = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!);

  console.log('\n--- Test 1: Testing unauthenticated RPC call to complete_exercise ---');
  const { data: _d1, error: e1 } = await anonSupabase.rpc('complete_exercise', {
    p_exercise_id: 'understanding-emotional-triggers',
    p_reflection_entry_id: '00000000-0000-0000-0000-000000000000',
  });
  console.log('Unauthenticated RPC Error:', e1);

  console.log('\n--- Test 2: Creating authenticated session ---');
  const testEmail = `diag_${Date.now()}@example.com`;
  const { data: authData, error: authErr } = await anonSupabase.auth.signUp({
    email: testEmail,
    password: 'Password123!',
  });

  if (authErr || !authData.session || !authData.user) {
    console.error('Auth error during sign up:', authErr);
    return;
  }
  const token = authData.session.access_token;
  const userId = authData.user.id;
  console.log('User signed up. ID:', userId);

  const authSupabase = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  console.log('\n--- Test 3: Testing authenticated RPC call to complete_exercise ---');
  const { data: _d2, error: e2 } = await authSupabase.rpc('complete_exercise', {
    p_exercise_id: 'understanding-emotional-triggers',
    p_reflection_entry_id: '00000000-0000-0000-0000-000000000000',
  });
  console.log('Authenticated RPC Error code:', e2?.code);
  console.log('Authenticated RPC Error message:', e2?.message);
  console.log('Authenticated RPC Error details:', e2?.details);

  console.log('\n--- Test 4: Testing direct INSERT into activity_logs with authenticated user ---');
  const { data: _d3, error: e3 } = await authSupabase
    .from('activity_logs')
    .insert({
      user_id: userId,
      event_type: 'exercise_completed',
      exercise_id: 'understanding-emotional-triggers',
    })
    .select();
  console.log('Authenticated Direct Insert Error code:', e3?.code);
  console.log('Authenticated Direct Insert Error message:', e3?.message);
  console.log('Authenticated Direct Insert Error details:', e3?.details);

  console.log('\n--- Test 5: Testing query against live Render endpoint ---');
  try {
    const liveRes = await fetch('https://therapy-companion-backend.onrender.com/api/v1/exercises/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        exerciseId: 'understanding-emotional-triggers',
        reflectionEntryId: '00000000-0000-0000-0000-000000000000',
      }),
    });
    console.log('Live Render POST /exercises/complete status:', liveRes.status);
    const liveJson = await liveRes.json();
    console.log('Live Render response:', JSON.stringify(liveJson, null, 2));
  } catch (err: any) {
    console.error('Failed to contact live Render API:', err.message);
  }
}

diagnose().catch(console.error);
