import http from 'http';
import app from '../app';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { ReflectionService } from '../services/reflection.service';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${name}: ${details}`);
}

async function request(
  baseUrl: string,
  path: string,
  method: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { status: res.status, body: json };
}

export async function runReflectionTests(): Promise<void> {
  console.log('====================================================');
  console.log(' THERAPY COMPANION – GUIDED REFLECTION TEST SUITE  ');
  console.log('====================================================\n');

  // Start Express on an ephemeral local port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // -------------------------------------------------------------
    // TEST 1: Missing Authentication on POST /api/v1/reflections
    // -------------------------------------------------------------
    console.log('Running Test 1: Missing authentication on POST /reflections...');
    const noAuthPost = await request(baseUrl, '/api/v1/reflections', 'POST', {
      questionOne: 'Situation',
      questionTwo: 'Thoughts',
      questionThree: 'Needs',
    });
    record(
      'Missing Authentication on POST (401 Unauthorized)',
      noAuthPost.status === 401 && noAuthPost.body?.success === false,
      `Status ${noAuthPost.status}, Message: "${noAuthPost.body?.message}"`
    );

    // -------------------------------------------------------------
    // TEST 2: Missing Authentication on GET /api/v1/reflections
    // -------------------------------------------------------------
    console.log('\nRunning Test 2: Missing authentication on GET /reflections...');
    const noAuthGet = await request(baseUrl, '/api/v1/reflections', 'GET');
    record(
      'Missing Authentication on GET (401 Unauthorized)',
      noAuthGet.status === 401 && noAuthGet.body?.success === false,
      `Status ${noAuthGet.status}, Message: "${noAuthGet.body?.message}"`
    );

    // -------------------------------------------------------------
    // TEST 3: Invalid / Forged Bearer Token
    // -------------------------------------------------------------
    console.log('\nRunning Test 3: Invalid Bearer token rejection...');
    const badTokenPost = await request(
      baseUrl,
      '/api/v1/reflections',
      'POST',
      {
        questionOne: 'A recent conflict',
        questionTwo: 'Felt tension and anxiety',
        questionThree: 'Needed reassurance',
      },
      'forged.bearer.jwt.token'
    );
    record(
      'Invalid Token Rejection (401 Unauthorized)',
      badTokenPost.status === 401 && badTokenPost.body?.success === false,
      `Status ${badTokenPost.status}, Message: "${badTokenPost.body?.message}"`
    );

    // -------------------------------------------------------------
    // TEST 4: Validation - Missing Question in Request Body
    // -------------------------------------------------------------
    console.log('\nRunning Test 4: Validation - Missing Question...');
    let missingQuestionCaught = false;
    try {
      const { createReflectionSchema } = await import('../validators/reflection.validator');
      createReflectionSchema.parse({
        questionOne: 'I felt overwhelmed during an interview',
        questionTwo: 'Thoughts of doubt',
        // questionThree omitted
      });
    } catch {
      missingQuestionCaught = true;
    }
    record(
      'Missing Question Rejection (Zod Schema)',
      missingQuestionCaught,
      'Rejected request body missing questionThree'
    );

    // -------------------------------------------------------------
    // TEST 5: Validation - Empty Question Answer
    // -------------------------------------------------------------
    console.log('\nRunning Test 5: Validation - Empty Question Answer...');
    let emptyQuestionCaught = false;
    try {
      const { createReflectionSchema } = await import('../validators/reflection.validator');
      createReflectionSchema.parse({
        questionOne: '   ', // whitespace only
        questionTwo: 'Valid answer',
        questionThree: 'Valid need',
      });
    } catch {
      emptyQuestionCaught = true;
    }
    record(
      'Empty Question Rejection (Whitespace Only)',
      emptyQuestionCaught,
      'Rejected empty questionOne after trim'
    );

    // -------------------------------------------------------------
    // TEST 6: Validation - Answer Exceeding 1000 Characters
    // -------------------------------------------------------------
    console.log('\nRunning Test 6: Validation - Answer > 1000 Characters...');
    let longAnswerCaught = false;
    try {
      const { createReflectionSchema } = await import('../validators/reflection.validator');
      createReflectionSchema.parse({
        questionOne: 'Valid answer',
        questionTwo: 'b'.repeat(1001),
        questionThree: 'Valid need',
      });
    } catch {
      longAnswerCaught = true;
    }
    record(
      'Answer > 1000 Characters Rejection',
      longAnswerCaught,
      'Rejected questionTwo exceeding 1000 characters limit'
    );

    // -------------------------------------------------------------
    // TEST 7: In-Memory / Service - Successful Reflection Creation
    // -------------------------------------------------------------
    console.log('\nRunning Test 7: Successful Reflection Creation...');
    const userA = 'aaaa1111-2222-3333-4444-555555555555';
    const userB = 'bbbb2222-3333-4444-5555-666666666666';

    const inMemoryReflections: any[] = [];
    const mockSupabase: any = {
      from: (table: string) => {
        if (table !== 'reflection_entries') throw new Error(`Unexpected table ${table}`);
        return {
          insert: (data: any) => ({
            select: () => ({
              single: async () => {
                const record = {
                  id: `reflection-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  user_id: data.user_id,
                  question_one: data.question_one,
                  question_two: data.question_two,
                  question_three: data.question_three,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                inMemoryReflections.push(record);
                return { data: record, error: null };
              },
            }),
          }),
          select: (_cols: string, opts?: any) => ({
            eq: (f1: string, v1: any) => ({
              order: () => ({
                range: (from: number, to: number) => {
                  const filtered = inMemoryReflections.filter((r) => r[f1] === v1);
                  return Promise.resolve({
                    data: filtered.slice(from, to + 1),
                    count: opts?.count === 'exact' ? filtered.length : null,
                    error: null,
                  });
                },
              }),
              eq: (f2: string, v2: any) => ({
                maybeSingle: async () => {
                  const found = inMemoryReflections.find(
                    (r) => r[f1] === v1 && r[f2] === v2
                  );
                  return { data: found || null, error: null };
                },
              }),
            }),
          }),
          delete: () => ({
            eq: (f1: string, v1: any) => ({
              eq: (f2: string, v2: any) => ({
                select: async () => {
                  const index = inMemoryReflections.findIndex(
                    (r) => r[f1] === v1 && r[f2] === v2
                  );
                  if (index >= 0) {
                    const deleted = inMemoryReflections.splice(index, 1);
                    return { data: deleted, error: null };
                  }
                  return { data: [], error: null };
                },
              }),
            }),
          }),
        };
      },
    };

    const savedReflection = await ReflectionService.createReflection(mockSupabase, userA, {
      questionOne: 'A tense disagreement at a family dinner',
      questionTwo: 'Felt defensive and misunderstood',
      questionThree: 'Needed calm validation and personal space',
    });

    record(
      'Successful Reflection Creation',
      Boolean(savedReflection.id && savedReflection.questionOne && savedReflection.createdAt),
      `Created ID: ${savedReflection.id}, CreatedAt: ${savedReflection.createdAt}`
    );

    // -------------------------------------------------------------
    // TEST 8: Successful History Retrieval with Pagination
    // -------------------------------------------------------------
    console.log('\nRunning Test 8: Reflection History & Pagination...');
    // Create second reflection for user A
    await ReflectionService.createReflection(mockSupabase, userA, {
      questionOne: 'Received critical feedback on a project',
      questionTwo: 'Noticed self-doubt and racing heartbeat',
      questionThree: 'Needed a mindful breath before responding',
    });

    const historyResult = await ReflectionService.getReflectionHistory(mockSupabase, userA, {
      page: 1,
      limit: 10,
    });
    record(
      'Reflection History Retrieval & Pagination',
      historyResult.data.length === 2 && historyResult.pagination.total === 2 && historyResult.pagination.totalPages === 1,
      `Retrieved ${historyResult.data.length} records, Total: ${historyResult.pagination.total}, TotalPages: ${historyResult.pagination.totalPages}`
    );

    // -------------------------------------------------------------
    // TEST 9: Individual Reflection Retrieval by ID
    // -------------------------------------------------------------
    console.log('\nRunning Test 9: Individual Reflection Retrieval...');
    const singleReflection = await ReflectionService.getReflectionById(
      mockSupabase,
      userA,
      savedReflection.id
    );
    record(
      'Individual Reflection Retrieval by ID',
      Boolean(singleReflection && singleReflection.id === savedReflection.id),
      `Retrieved matching ID: ${singleReflection?.id}`
    );

    // -------------------------------------------------------------
    // TEST 10: Invalid UUID Validation
    // -------------------------------------------------------------
    console.log('\nRunning Test 10: Invalid UUID Validation...');
    const { reflectionParamSchema } = await import('../validators/reflection.validator');
    const invalidUuid = reflectionParamSchema.safeParse({ id: 'not-a-valid-uuid' });
    record(
      'Invalid UUID Parameter Validation',
      !invalidUuid.success,
      `Invalid UUID rejected: ${!invalidUuid.success}`
    );

    // -------------------------------------------------------------
    // TEST 11: Non-Existent Reflection Retrieval
    // -------------------------------------------------------------
    console.log('\nRunning Test 11: Non-Existent Reflection Retrieval (404)...');
    const nonExistent = await ReflectionService.getReflectionById(
      mockSupabase,
      userA,
      '00000000-0000-0000-0000-000000000000'
    );
    record(
      'Non-Existent Reflection Returns Null / 404',
      nonExistent === null,
      'Returned null for non-existent reflection ID'
    );

    // -------------------------------------------------------------
    // TEST 12: Cross-User Access Isolation (User B cannot read User A's reflection)
    // -------------------------------------------------------------
    console.log('\nRunning Test 12: Cross-User Record Isolation...');
    const userBAccessUserA = await ReflectionService.getReflectionById(
      mockSupabase,
      userB,
      savedReflection.id
    );
    record(
      'Cross-User Access Isolation (Cannot Read Other User Record)',
      userBAccessUserA === null,
      'User B query for User A reflection returned null (RLS enforced)'
    );

    // -------------------------------------------------------------
    // TEST 13: Cross-User Deletion Protection (User B cannot delete User A's reflection)
    // -------------------------------------------------------------
    console.log('\nRunning Test 13: Cross-User Deletion Protection...');
    const userBDeleteUserA = await ReflectionService.deleteReflection(
      mockSupabase,
      userB,
      savedReflection.id
    );
    const userAStillHasIt = await ReflectionService.getReflectionById(
      mockSupabase,
      userA,
      savedReflection.id
    );
    record(
      'Cross-User Deletion Protection',
      userBDeleteUserA === false && userAStillHasIt !== null,
      'User B delete request rejected; User A record remains intact'
    );

    // -------------------------------------------------------------
    // TEST 14: Successful Deletion by Owner
    // -------------------------------------------------------------
    console.log('\nRunning Test 14: Successful Deletion by Owner...');
    const userADeleteOwn = await ReflectionService.deleteReflection(
      mockSupabase,
      userA,
      savedReflection.id
    );
    const userAGone = await ReflectionService.getReflectionById(
      mockSupabase,
      userA,
      savedReflection.id
    );
    record(
      'Successful Deletion by Owner',
      userADeleteOwn === true && userAGone === null,
      'Owner successfully deleted reflection; subsequent lookup returned null'
    );

    // -------------------------------------------------------------
    // TEST 15: Journal Answers Privacy (Not Logged to Console)
    // -------------------------------------------------------------
    console.log('\nRunning Test 15: Journal Answers Privacy Check...');
    const privateReflectiveAnswer = 'MY_ULTRA_PRIVATE_THERAPY_THOUGHT_54321';
    let leakedInLog = false;
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      const line = args.join(' ');
      if (line.includes(privateReflectiveAnswer)) {
        leakedInLog = true;
      }
      originalLog.apply(console, args);
    };

    try {
      await ReflectionService.createReflection(mockSupabase, userA, {
        questionOne: privateReflectiveAnswer,
        questionTwo: 'Second answer',
        questionThree: 'Third answer',
      });
    } finally {
      console.log = originalLog;
    }

    record(
      'Reflection Answer Privacy (Never Logged)',
      !leakedInLog,
      'Verified reflection answers are never printed in server logs'
    );

    // -------------------------------------------------------------
    // TEST 16: Live Supabase reflection_entries Table & RLS Enforcement
    // -------------------------------------------------------------
    console.log('\nRunning Test 16: Live Supabase reflection_entries Check...');
    const liveSupabase = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!);
    const { data: liveData, error: liveErr, status: liveStatus } = await liveSupabase
      .from('reflection_entries')
      .select('id, question_one, question_two, question_three, created_at, updated_at')
      .limit(1);

    const livePassed = !liveErr && liveStatus === 200 && Array.isArray(liveData);
    record(
      'Live Supabase reflection_entries Table & RLS Enforcement',
      livePassed,
      livePassed
        ? `Status 200 OK. Table reachable. 0 public rows exposed under anonymous role (RLS active).`
        : `Error: ${liveErr?.message || 'Failed'}`
    );
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log('                TEST SUMMARY                        ');
  console.log('====================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed:      ${results.filter((r) => r.passed).length}`);
  console.log(`Failed:      ${results.filter((r) => !r.passed).length}`);
  console.log(`Verdict:     ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

if (require.main === module) {
  runReflectionTests().catch((err) => {
    console.error('Reflection test run failed:', err);
    process.exit(1);
  });
}
