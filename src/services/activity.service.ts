import { SupabaseClient } from '@supabase/supabase-js';
import { CompleteExerciseInput, ActivityLogQueryInput } from '../validators/exercise.validator';

export interface ActivityLogDTO {
  id: string;
  eventType: string;
  exerciseId: string;
  reflectionEntryId: string | null;
  createdAt: string;
}

export interface CompleteExerciseResult extends ActivityLogDTO {
  alreadyCompleted: boolean;
}

export interface ActivityHistoryResult {
  data: ActivityLogDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ActivitySummaryDTO {
  totalCompletedExercises: number;
  completedExerciseIds: string[];
  mostRecentCompletionDate: string | null;
  activityCountThisWeek: number;
}

export class ActivityService {
  /**
   * Completes an exercise and logs the activity event.
   * Invokes PostgreSQL SECURITY DEFINER RPC `complete_exercise` enforcing user ownership & idempotency.
   * Reflection answers are NEVER stored or logged.
   */
  public static async completeExercise(
    supabase: SupabaseClient,
    userId: string,
    input: CompleteExerciseInput
  ): Promise<CompleteExerciseResult> {
    // 1. First verify reflection entry exists and belongs to authenticated user
    const { data: refEntry, error: refErr } = await supabase
      .from('reflection_entries')
      .select('id, user_id')
      .eq('id', input.reflectionEntryId)
      .maybeSingle();

    if (refErr || !refEntry) {
      const err: any = new Error('Reflection entry not found');
      err.statusCode = 404;
      throw err;
    }

    if (refEntry.user_id !== userId) {
      const err: any = new Error('Reflection entry not found');
      err.statusCode = 404;
      throw err;
    }

    // 2. Invoke secure RPC function `complete_exercise`
    const { data: rpcData, error: rpcErr } = await supabase.rpc('complete_exercise', {
      p_exercise_id: input.exerciseId,
      p_reflection_entry_id: input.reflectionEntryId,
    });

    if (!rpcErr && rpcData) {
      return {
        id: rpcData.id,
        eventType: rpcData.eventType,
        exerciseId: rpcData.exerciseId,
        reflectionEntryId: rpcData.reflectionEntryId,
        createdAt: rpcData.createdAt,
        alreadyCompleted: Boolean(rpcData.alreadyCompleted),
      };
    }

    // If RPC returned a specific application error
    if (rpcErr) {
      const msg = rpcErr.message || '';
      if (msg.includes('Reflection entry not found') || msg.includes('does not belong')) {
        const err: any = new Error('Reflection entry not found');
        err.statusCode = 404;
        throw err;
      }
      if (msg.includes('Unsupported exercise')) {
        const err: any = new Error(msg);
        err.statusCode = 400;
        throw err;
      }

      // If function does not exist in schema cache yet, handle idempotency check & direct insert fallback
      if (rpcErr.code === 'PGRST202' || msg.includes('complete_exercise')) {
        // Check for existing completion (idempotency)
        const { data: existing } = await supabase
          .from('activity_logs')
          .select('id, event_type, exercise_id, reflection_entry_id, created_at')
          .eq('user_id', userId)
          .eq('exercise_id', input.exerciseId)
          .eq('reflection_entry_id', input.reflectionEntryId)
          .maybeSingle();

        if (existing) {
          return {
            id: existing.id,
            eventType: existing.event_type,
            exerciseId: existing.exercise_id,
            reflectionEntryId: existing.reflection_entry_id,
            createdAt: existing.created_at,
            alreadyCompleted: true,
          };
        }

        // Insert completion metadata
        const { data: inserted, error: insertErr } = await supabase
          .from('activity_logs')
          .insert({
            user_id: userId,
            event_type: 'exercise_completed',
            exercise_id: input.exerciseId,
            reflection_entry_id: input.reflectionEntryId,
          })
          .select('id, event_type, exercise_id, reflection_entry_id, created_at')
          .single();

        if (insertErr || !inserted) {
          throw new Error(
            `Failed to record exercise completion: ${insertErr?.message || rpcErr.message}. Ensure migration 002_exercise_completion_rpc.sql is applied in Supabase.`
          );
        }

        return {
          id: inserted.id,
          eventType: inserted.event_type,
          exerciseId: inserted.exercise_id,
          reflectionEntryId: inserted.reflection_entry_id,
          createdAt: inserted.created_at,
          alreadyCompleted: false,
        };
      }

      throw new Error(`Failed to complete exercise: ${rpcErr.message}`);
    }

    throw new Error('Unexpected error recording exercise completion');
  }

  /**
   * Retrieves paginated activity logs for the authenticated user.
   * Sorted newest first (created_at DESC).
   * Never retrieves or returns reflection answers.
   */
  public static async getActivityLogs(
    supabase: SupabaseClient,
    userId: string,
    query: ActivityLogQueryInput
  ): Promise<ActivityHistoryResult> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase
      .from('activity_logs')
      .select('id, event_type, exercise_id, reflection_entry_id, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to retrieve activity logs: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    const formattedRecords: ActivityLogDTO[] = (data || []).map((row) => ({
      id: row.id,
      eventType: row.event_type,
      exerciseId: row.exercise_id,
      reflectionEntryId: row.reflection_entry_id,
      createdAt: row.created_at,
    }));

    return {
      data: formattedRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Calculates actual activity statistics based on real database records.
   * Never hardcodes statistics.
   */
  public static async getActivitySummary(
    supabase: SupabaseClient,
    userId: string
  ): Promise<ActivitySummaryDTO> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('exercise_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to calculate activity summary: ${error.message}`);
    }

    const records = data || [];
    const totalCompletedExercises = records.length;
    const completedExerciseIds = Array.from(new Set(records.map((r) => r.exercise_id)));
    const mostRecentCompletionDate = records.length > 0 ? records[0].created_at : null;

    // Calculate completions for the current week starting from Monday 00:00:00
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStartTime = startOfWeek.getTime();

    const activityCountThisWeek = records.filter(
      (r) => new Date(r.created_at).getTime() >= weekStartTime
    ).length;

    return {
      totalCompletedExercises,
      completedExerciseIds,
      mostRecentCompletionDate,
      activityCountThisWeek,
    };
  }
}
