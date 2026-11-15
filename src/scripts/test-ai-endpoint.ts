import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const RENDER_BASE = 'https://therapy-companion-backend.onrender.com/api/v1';

async function testAi() {
  const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!);
  const testEmail = `aitest_${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: 'Password123!',
  });

  if (error || !data.session) {
    console.error('Sign up error:', error);
    return;
  }

  const token = data.session.access_token;
  console.log('Token acquired successfully.');

  console.log('Calling POST', `${RENDER_BASE}/ai/reflection...`);
  const res = await fetch(`${RENDER_BASE}/ai/reflection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      questionOne: 'Felt overwhelmed at work today with deadlines.',
      questionTwo: 'My heart was racing and I felt inadequate.',
      questionThree: 'I needed a short breathing break and some reassurance.',
      consentGranted: true,
    }),
  });

  console.log('Status:', res.status);
  const json = await res.json();
  console.log('Response:', JSON.stringify(json, null, 2));
}

testAi().catch(console.error);
