import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/activity.service';
import { CompleteExerciseInput } from '../validators/exercise.validator';

/**
 * POST /api/v1/exercises/complete
 * Records exercise completion for the authenticated user linked to a valid reflection entry.
 * Idempotent: If already completed, returns existing record without duplicating.
 * Privacy safe: Never logs or stores reflection answers in activity logs.
 */
export const completeExercise = async (
  req: Request<{}, {}, CompleteExerciseInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userClient = req.supabase!;

    const result = await ActivityService.completeExercise(
      userClient,
      userId,
      req.body
    );

    const statusCode = result.alreadyCompleted ? 200 : 201;
    const message = result.alreadyCompleted
      ? 'Exercise already marked as completed'
      : 'Exercise completed successfully';

    res.status(statusCode).json({
      success: true,
      message,
      data: {
        id: result.id,
        eventType: result.eventType,
        exerciseId: result.exerciseId,
        reflectionEntryId: result.reflectionEntryId,
        createdAt: result.createdAt,
      },
    });
  } catch (err: any) {
    next(err);
  }
};

