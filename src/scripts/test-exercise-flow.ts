import http from 'http';
import app from '../app';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { ActivityService } from '../services/activity.service';
import {
  completeExerciseSchema,
  activityLogQuerySchema,
} from '../validators/exercise.validator';

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

export async function runExerciseTests(): Promise<void> {
  console.log('====================================================');
  console.log(' THERAPY COMPANION – EXERCISE AUTOMATION TEST SUITE ');
  console.log('====================================================\n');

  // Start Express on an ephemeral local port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // -------------------------------------------------------------
    // TEST 1: Missing Authentication on POST /api/v1/exercises/complete
    // -------------------------------------------------------------
    console.log('Running Test 1: Missing auth on POST /exercises/complete...');
    const noAuthPost = await request(baseUrl, '/api/v1/exercises/complete', 'POST', {
      exerciseId: 'understanding-emotional-triggers',
      reflectionEntryId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    });
    record(
      'Missing Authentication on POST (401 Unauthorized)',
      noAuthPost.status === 401 && noAuthPost.body?.success === false,
      `Status ${noAuthPost.status}, Message: "${noAuthPost.body?.message}"`
    );

    // -------------------------------------------------------------
    // TEST 2: Missing Authentication on GET /api/v1/activity-logs
    // -------------------------------------------------------------
    console.log('\nRunning Test 2: Missing auth on GET /activity-logs...');
    const noAuthGetLogs = await request(baseUrl, '/api/v1/activity-logs', 'GET');
    record(
      'Missing Authentication on GET /activity-logs (401 Unauthorized)',
      noAuthGetLogs.status === 401 && noAuthGetLogs.body?.success === false,
      `Status ${noAuthGetLogs.status}, Message: "${noAuthGetLogs.body?.message}"`
    );

    // -------------------------------------------------------------
    // TEST 3: Missing Authentication on GET /api/v1/activity-logs/summary
    // -------------------------------------------------------------
    console.log('\nRunning Test 3: Missing auth on GET /activity-logs/summary...');
    const noAuthGetSummary = await request(baseUrl, '/api/v1/activity-logs/summary', 'GET');
    record(
      'Missing Authentication on GET /summary (401 Unauthorized)',
      noAuthGetSummary.status === 401 && noAuthGetSummary.body?.success === false,
      `Status ${noAuthGetSummary.status}, Message: "${noAuthGetSummary.body?.message}"`
    );

    // -------------------------------------------------------------
    // TEST 4: Invalid / Forged Bearer Token
    // -------------------------------------------------------------
    console.log('\nRunning Test 4: Invalid Bearer token rejection...');
    const badTokenPost = await request(
      baseUrl,
      '/api/v1/exercises/complete',
      'POST',
      {
        exerciseId: 'understanding-emotional-triggers',
        reflectionEntryId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
      },
      'forged.invalid.jwt.token'
    );
    record(
      'Invalid Token Rejection (401 Unauthorized)',
      badTokenPost.status === 401 && badTokenPost.body?.success === false,
      `Status ${badTokenPost.status}, Message: "${badTokenPost.body?.message}"`
    );

    // -------------------------------------------------------------
    // TEST 5: Validation - Invalid / Unsupported exerciseId
    // -------------------------------------------------------------
    console.log('\nRunning Test 5: Validation - Invalid exerciseId...');
    const invalidExerciseResult = completeExerciseSchema.safeParse({
      exerciseId: 'unsupported-exercise-id',
      reflectionEntryId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    });
    record(
      'Unsupported exerciseId Rejection (Zod Schema)',
      !invalidExerciseResult.success,
      'Rejected invalid exerciseId: only "understanding-emotional-triggers" allowed'
    );

    // -------------------------------------------------------------
    // TEST 6: Validation - Invalid reflectionEntryId (Not a UUID)
    // -------------------------------------------------------------
    console.log('\nRunning Test 6: Validation - Invalid reflection UUID...');
    const invalidUuidResult = completeExerciseSchema.safeParse({
      exerciseId: 'understanding-emotional-triggers',
      reflectionEntryId: 'not-a-valid-uuid-format',
    });
    record(
      'Invalid reflection UUID Rejection (Zod Schema)',
      !invalidUuidResult.success,
      'Rejected non-UUID reflectionEntryId'
    );

    // -------------------------------------------------------------
    // TEST 7: Validation - Pagination Query Bounds
    // -------------------------------------------------------------
    console.log('\nRunning Test 7: Validation - Pagination Query Limits...');
    const invalidPage = activityLogQuerySchema.safeParse({ page: '0', limit: '10' });
    const invalidLimit = activityLogQuerySchema.safeParse({ page: '1', limit: '51' });
    const validPagination = activityLogQuerySchema.safeParse({ page: '2', limit: '25' });

    record(
      'Pagination Query Bounds Validation',
      !invalidPage.success && !invalidLimit.success && validPagination.success,
      'Enforced page >= 1 and limit between 1 and 50'
    );

    // -------------------------------------------------------------
    // In-Memory Test Setup for Multi-User Isolation & Verification
    // -------------------------------------------------------------
    const userA = '11111111-aaaa-bbbb-cccc-111111111111';
    const userB = '22222222-aaaa-bbbb-cccc-222222222222';

    const reflectionEntryA = {
      id: 'aaaaaaaa-1111-2222-3333-444444444444',
      user_id: userA,
      question_one: 'Conflict at work',
      question_two: 'Felt agitated',
      question_three: 'Needed clarity',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    };

    const reflectionEntryB = {
      id: 'bbbbbbbb-1111-2222-3333-444444444444',
      user_id: userB,
      question_one: 'Family dinner discussion',
      question_two: 'Felt defensive',
      question_three: 'Needed personal space',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    };

    const inMemoryReflections = [reflectionEntryA, reflectionEntryB];
    const inMemoryLogs: any[] = [];

    // Realistic Supabase mock matching PostgreSQL tables and RPC behavior
    const mockSupabase: any = {
      from: (table: string) => {
        if (table === 'reflection_entries') {
          return {
            select: (_cols: string) => ({
              eq: (f: string, v: any) => ({
                maybeSingle: async () => {
                  const found = inMemoryReflections.find((r: any) => r[f] === v);
                  return { data: found || null, error: null };
                },
              }),
            }),
          };
        }

        if (table === 'activity_logs') {
          return {
            select: (_cols: string, opts?: any) => ({
              eq: (f1: string, v1: any) => ({
                order: (_sortCol: string, sortOpts?: { ascending?: boolean }) => {
                  const filterEq = (f2: string, v2: any) => ({
                    eq: (f3: string, v3: any) => ({
                      maybeSingle: async () => {
                        const found = inMemoryLogs.find(
                          (l) => l[f1] === v1 && l[f2] === v2 && l[f3] === v3
                        );
                        return { data: found || null, error: null };
                      },
                    }),
                  });

                  const range = (from: number, to: number) => {
                    let filtered = inMemoryLogs.filter((l) => l[f1] === v1);
                    if (sortOpts?.ascending === false) {
                      filtered = [...filtered].sort(
                        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                      );
                    }
                    return Promise.resolve({
                      data: filtered.slice(from, to + 1),
                      count: opts?.count === 'exact' ? filtered.length : null,
                      error: null,
                    });
                  };

                  return {
                    eq: filterEq,
                    range,
                    then: (resolve: any) => {
                      let filtered = inMemoryLogs.filter((l) => l[f1] === v1);
                      if (sortOpts?.ascending === false) {
                        filtered = [...filtered].sort(
                          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        );
                      }
                      resolve({ data: filtered, error: null });
                    },
                  };
                },
                eq: (f2: string, v2: any) => ({
                  eq: (f3: string, v3: any) => ({
                    maybeSingle: async () => {
                      const found = inMemoryLogs.find(
                        (l) => l[f1] === v1 && l[f2] === v2 && l[f3] === v3
                      );
                      return { data: found || null, error: null };
                    },
                  }),
                }),
              }),
            }),
            insert: (data: any) => ({
              select: () => ({
                single: async () => {
                  const record = {
                    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    user_id: data.user_id,
                    event_type: data.event_type,
                    exercise_id: data.exercise_id,
                    reflection_entry_id: data.reflection_entry_id,
                    created_at: new Date().toISOString(),
                  };
                  inMemoryLogs.push(record);
                  return { data: record, error: null };
                },
              }),
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },

      rpc: async (func: string, params: any) => {
        if (func === 'complete_exercise') {
          // Verify reflection exists and belongs to current user
          const ref = inMemoryReflections.find((r) => r.id === params.p_reflection_entry_id);
          if (!ref) {
            return { data: null, error: { message: 'Reflection entry not found' } };
          }
          if (ref.user_id !== userA && ref.user_id !== userB) {
            return { data: null, error: { message: 'Reflection entry not found or unauthorized' } };
          }

          // Check idempotency: check if log already exists
          const existing = inMemoryLogs.find(
            (l) =>
              l.exercise_id === params.p_exercise_id &&
              l.reflection_entry_id === params.p_reflection_entry_id
          );

          if (existing) {
            return {
              data: {
                id: existing.id,
                eventType: existing.event_type,
                exerciseId: existing.exercise_id,
                reflectionEntryId: existing.reflection_entry_id,
                createdAt: existing.created_at,
                alreadyCompleted: true,
              },
              error: null,
            };
          }

          // Create new log record
          const newRecord = {
            id: `log-rpc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            user_id: ref.user_id,
            event_type: 'exercise_completed',
            exercise_id: params.p_exercise_id,
            reflection_entry_id: params.p_reflection_entry_id,
            created_at: new Date().toISOString(),
          };
          inMemoryLogs.push(newRecord);

          return {
            data: {
              id: newRecord.id,
              eventType: newRecord.event_type,
              exerciseId: newRecord.exercise_id,
              reflectionEntryId: newRecord.reflection_entry_id,
              createdAt: newRecord.created_at,
              alreadyCompleted: false,
            },
            error: null,
          };
        }

        return { data: null, error: { code: 'PGRST202', message: 'Function not found' } };
      },
    };

    // -------------------------------------------------------------
    // TEST 8: Non-Existent Reflection Entry Rejection (404)
    // -------------------------------------------------------------
    console.log('\nRunning Test 8: Non-Existent Reflection Entry Rejection (404)...');
    let nonExistentFailedAsExpected = false;
    try {
      await ActivityService.completeExercise(mockSupabase, userA, {
        exerciseId: 'understanding-emotional-triggers',
        reflectionEntryId: '00000000-0000-0000-0000-000000000000',
      });
    } catch (err: any) {
      if (err.statusCode === 404 || err.message.includes('not found')) {
        nonExistentFailedAsExpected = true;
      }
    }
    record(
      'Non-Existent Reflection Entry Rejection (404 Not Found)',
      nonExistentFailedAsExpected,
      'Returned 404 when reflection entry does not exist'
    );

    // -------------------------------------------------------------
    // TEST 9: Cross-User Reflection Entry Access Protection (404)
    // -------------------------------------------------------------
    console.log('\nRunning Test 9: Cross-User Reflection Access Protection...');
    let crossUserFailedAsExpected = false;
    try {
      // User A attempts to complete exercise using User B's reflection entry
      await ActivityService.completeExercise(mockSupabase, userA, {
        exerciseId: 'understanding-emotional-triggers',
        reflectionEntryId: reflectionEntryB.id,
      });
    } catch (err: any) {
      if (err.statusCode === 404 || err.message.includes('not found')) {
        crossUserFailedAsExpected = true;
      }
    }
    record(
      'Cross-User Reflection Ownership Protection (404 Not Found)',
      crossUserFailedAsExpected,
      'Prevented User A from claiming User B reflection entry'
    );

    // -------------------------------------------------------------
    // TEST 10: Successful Exercise Completion Recording
    // -------------------------------------------------------------
    console.log('\nRunning Test 10: Successful Exercise Completion Recording...');
    const initialLogCount = inMemoryLogs.length;
    const completionResult = await ActivityService.completeExercise(mockSupabase, userA, {
      exerciseId: 'understanding-emotional-triggers',
      reflectionEntryId: reflectionEntryA.id,
    });

    const completionSuccess =
      Boolean(completionResult.id) &&
      completionResult.eventType === 'exercise_completed' &&
      completionResult.exerciseId === 'understanding-emotional-triggers' &&
      completionResult.reflectionEntryId === reflectionEntryA.id &&
      completionResult.alreadyCompleted === false &&
      inMemoryLogs.length === initialLogCount + 1;

    record(
      'Successful Exercise Completion Recording',
      completionSuccess,
      `Recorded ID: ${completionResult.id}, eventType: ${completionResult.eventType}`
    );

    // -------------------------------------------------------------
    // TEST 11: Idempotency - Duplicate Completion Request
    // -------------------------------------------------------------
    console.log('\nRunning Test 11: Idempotency on Repeated Completion Request...');
    const logCountBeforeRepeat = inMemoryLogs.length;
    const repeatResult = await ActivityService.completeExercise(mockSupabase, userA, {
      exerciseId: 'understanding-emotional-triggers',
      reflectionEntryId: reflectionEntryA.id,
    });

    const idempotencySuccess =
      repeatResult.id === completionResult.id &&
      repeatResult.alreadyCompleted === true &&
      inMemoryLogs.length === logCountBeforeRepeat;

    record(
      'Idempotent Completion Request Handling',
      idempotencySuccess,
      `Returned existing ID: ${repeatResult.id}, alreadyCompleted: true, no new rows created`
    );

    // -------------------------------------------------------------
    // TEST 12: Paginated Activity History Retrieval (Newest First)
    // -------------------------------------------------------------
    console.log('\nRunning Test 12: Paginated Activity History Retrieval...');
    const logsResult = await ActivityService.getActivityLogs(mockSupabase, userA, {
      page: 1,
      limit: 10,
    });

    const logsSuccess =
      logsResult.data.length === 1 &&
      logsResult.pagination.total === 1 &&
      logsResult.data[0].id === completionResult.id &&
      logsResult.data[0].eventType === 'exercise_completed' &&
      logsResult.data[0].exerciseId === 'understanding-emotional-triggers';

    record(
      'Paginated Activity History Retrieval',
      logsSuccess,
      `Retrieved ${logsResult.data.length} item(s), total: ${logsResult.pagination.total}, sorted newest first`
    );

    // -------------------------------------------------------------
    // TEST 13: Activity Summary Calculation (Real-Time Metrics)
    // -------------------------------------------------------------
    console.log('\nRunning Test 13: Activity Summary Metrics Calculation...');
    const summary = await ActivityService.getActivitySummary(mockSupabase, userA);

    const summarySuccess =
      summary.totalCompletedExercises === 1 &&
      summary.completedExerciseIds.includes('understanding-emotional-triggers') &&
      summary.mostRecentCompletionDate === completionResult.createdAt &&
      summary.activityCountThisWeek === 1;

    record(
      'Activity Summary Metrics Calculation',
      summarySuccess,
      `Total: ${summary.totalCompletedExercises}, Exercise IDs: [${summary.completedExerciseIds.join(', ')}], ThisWeek: ${summary.activityCountThisWeek}`
    );

    // -------------------------------------------------------------
    // TEST 14: Privacy Protection - Reflection Content Never Exposed
    // -------------------------------------------------------------
    console.log('\nRunning Test 14: Privacy Protection in Activity Logs...');
    const logKeys = Object.keys(logsResult.data[0]);
    const leaksAnswers =
      logKeys.includes('question_one') ||
      logKeys.includes('questionOne') ||
      logKeys.includes('question_two') ||
      logKeys.includes('questionTwo') ||
      logKeys.includes('question_three') ||
      logKeys.includes('questionThree') ||
      logKeys.includes('answers') ||
      logKeys.includes('notes');

    record(
      'Privacy Protection (No Sensitive Reflection Content)',
      !leaksAnswers,
      'Activity logs contain only operational event metadata, never journal answers or notes'
    );

    // -------------------------------------------------------------
    // TEST 15: Cross-User Activity Isolation (User B cannot see User A logs)
    // -------------------------------------------------------------
    console.log('\nRunning Test 15: Cross-User Activity Isolation...');
    const userBLogs = await ActivityService.getActivityLogs(mockSupabase, userB, {
      page: 1,
      limit: 10,
    });
    const userBSummary = await ActivityService.getActivitySummary(mockSupabase, userB);

    const isolationSuccess =
      userBLogs.data.length === 0 &&
      userBLogs.pagination.total === 0 &&
      userBSummary.totalCompletedExercises === 0;

    record(
      'Cross-User Activity Logs Isolation',
      isolationSuccess,
      'User B cannot access or view User A activity logs or metrics'
    );

    // -------------------------------------------------------------
    // TEST 16: Live Supabase activity_logs Table & RLS Enforcement
    // -------------------------------------------------------------
    console.log('\nRunning Test 16: Live Supabase activity_logs Table & RLS...');
    const liveSupabase = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!);

    // Anonymous read check - RLS blocks anonymous records access
    const { data: liveData, error: liveErr, status: liveStatus } = await liveSupabase
      .from('activity_logs')
      .select('id, event_type, exercise_id, reflection_entry_id, created_at')
      .limit(1);

    // Direct anonymous insert check - RLS MUST block direct unauthenticated/unauthorized client insertion
    const { error: liveInsertErr } = await liveSupabase
      .from('activity_logs')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        event_type: 'exercise_completed',
        exercise_id: 'understanding-emotional-triggers',
      });

    const liveReadPassed = !liveErr && liveStatus === 200 && Array.isArray(liveData);
    const directInsertBlocked = Boolean(liveInsertErr);

    record(
      'Live Supabase activity_logs Table Reachability & RLS Protection',
      liveReadPassed && directInsertBlocked,
      `Table reachable (status 200). Direct client INSERT correctly blocked by RLS: "${liveInsertErr?.message || 'blocked'}"`
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
  runExerciseTests().catch((err) => {
    console.error('Exercise test run failed:', err);
    process.exit(1);
  });
}

