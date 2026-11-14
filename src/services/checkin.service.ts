import { SupabaseClient } from '@supabase/supabase-js';
import { CreateCheckInInput, CheckInQueryInput } from '../validators/checkin.validator';

export interface CheckInRecordDTO {
  id: string;
  emotion: string;
  intensity: number;
  optionalNote: string | null;
  createdAt: string;
}

export interface CheckInHistoryResult {
  data: CheckInRecordDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Service to handle mood check-in persistence and history retrieval.
 * All operations execute through the user-scoped SupabaseClient enforcing PostgreSQL RLS.
 */
export class CheckInService {
  /**
   * Persists a new emotional check-in for the verified authenticated user.
   * Note content is never logged.
   */
  public static async createCheckIn(
    supabase: SupabaseClient,
    userId: string,
    input: CreateCheckInInput
  ): Promise<CheckInRecordDTO> {
    const { data, error } = await supabase
      .from('mood_checkins')
      .insert({
        user_id: userId,
        emotion: input.emotion,
        intensity: input.intensity,
        optional_note: input.optionalNote ? input.optionalNote.trim() : null,
      })
      .select('id, emotion, intensity, optional_note, created_at')
      .single();

    if (error || !data) {
      // Safe error message without exposing connection strings or table internals
      throw new Error(`Failed to save check-in: ${error?.message || 'Database error'}`);
    }

    return {
      id: data.id,
      emotion: data.emotion,
      intensity: data.intensity,
      optionalNote: data.optional_note,
      createdAt: data.created_at,
    };
  }

  /**
   * Retrieves paginated check-in history belonging exclusively to the verified user.
   * Sorted newest first (created_at DESC).
   */
  public static async getCheckInHistory(
    supabase: SupabaseClient,
    userId: string,
    query: CheckInQueryInput
  ): Promise<CheckInHistoryResult> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase
      .from('mood_checkins')
      .select('id, emotion, intensity, optional_note, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to retrieve check-in history: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    const formattedRecords: CheckInRecordDTO[] = (data || []).map((row) => ({
      id: row.id,
      emotion: row.emotion,
      intensity: row.intensity,
      optionalNote: row.optional_note,
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
}

