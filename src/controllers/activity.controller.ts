import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/activity.service';
import { activityLogQuerySchema } from '../validators/exercise.validator';

/**
 * GET /api/v1/activity-logs
 * Retrieves paginated activity logs for the authenticated user (newest first).
 * Never exposes reflection answers or notes.
 */
export const getActivityLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userClient = req.supabase!;

    const parseResult = activityLogQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid pagination query parameters',
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    const result = await ActivityService.getActivityLogs(
      userClient,
      userId,
      parseResult.data
    );

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err: any) {
    next(err);
  }
};

/**
 * GET /api/v1/activity-logs/summary
 * Calculates real-time activity statistics for the authenticated user.
 */
export const getActivitySummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userClient = req.supabase!;

    const summary = await ActivityService.getActivitySummary(
      userClient,
      userId
    );

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err: any) {
    next(err);
  }
};
