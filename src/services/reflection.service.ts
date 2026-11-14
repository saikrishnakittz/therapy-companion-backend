import { SupabaseClient } from '@supabase/supabase-js';
import { CreateReflectionInput, ReflectionQueryInput } from '../validators/reflection.validator';

export interface ReflectionRecordDTO {
  id: string;
  questionOne: string;
  questionTwo: string;
  questionThree: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReflectionHistoryResult {
  data: ReflectionRecordDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Service handling Guided Reflection persistence, retrieval, and deletion.
 * All queries execute through user-scoped SupabaseClient enforcing PostgreSQL RLS.
 */
export class ReflectionService {
  /**
   * Persists a new guided reflection entry for the verified user.
   * Reflection answers are never logged.
   */
  public static async createReflection(
    supabase: SupabaseClient,
    userId: string,
    input: CreateReflectionInput
  ): Promise<ReflectionRecordDTO> {
    const { data, error } = await supabase
      .from('reflection_entries')
      .insert({
        user_id: userId,
        question_one: input.questionOne.trim(),
        question_two: input.questionTwo.trim(),
        question_three: input.questionThree.trim(),
      })
      .select('id, question_one, question_two, question_three, created_at, updated_at')
      .single();

    if (error || !data) {
      throw new Error(`Failed to save reflection entry: ${error?.message || 'Database error'}`);
    }

    return {
      id: data.id,
      questionOne: data.question_one,
      questionTwo: data.question_two,
      questionThree: data.question_three,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Retrieves paginated reflection history belonging exclusively to the verified user.
   * Sorted newest first (created_at DESC).
   */
  public static async getReflectionHistory(
    supabase: SupabaseClient,
    userId: string,
    query: ReflectionQueryInput
  ): Promise<ReflectionHistoryResult> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase
      .from('reflection_entries')
      .select('id, question_one, question_two, question_three, created_at, updated_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to retrieve reflection history: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    const formattedRecords: ReflectionRecordDTO[] = (data || []).map((row) => ({
      id: row.id,
      questionOne: row.question_one,
      questionTwo: row.question_two,
      questionThree: row.question_three,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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
   * Retrieves an individual reflection entry by ID for the verified user.
   * Returns null if not found or if the entry belongs to a different user.
   */
  public static async getReflectionById(
    supabase: SupabaseClient,
    userId: string,
    id: string
  ): Promise<ReflectionRecordDTO | null> {
    const { data, error } = await supabase
      .from('reflection_entries')
      .select('id, question_one, question_two, question_three, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      questionOne: data.question_one,
      questionTwo: data.question_two,
      questionThree: data.question_three,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Deletes a reflection entry by ID for the verified user.
   * Returns true if deleted, false if not found or unauthorized.
   */
  public static async deleteReflection(
    supabase: SupabaseClient,
    userId: string,
    id: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('reflection_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error || !data || data.length === 0) {
      return false;
    }

    return true;
  }
}

