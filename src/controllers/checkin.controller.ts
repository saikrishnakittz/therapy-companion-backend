import { Request, Response, NextFunction } from 'express';
import { CheckInService } from '../services/checkin.service';
import { CreateCheckInInput, checkInQuerySchema } from '../validators/checkin.validator';

/**
 * POST /api/v1/check-ins
 * Saves a new mood check-in for the authenticated user.
 */
export const createCheckIn = async (
  req: Request<{}, {}, CreateCheckInInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userClient = req.supabase!;

    // Sensitive journal notes are never logged
    const checkIn = await CheckInService.createCheckIn(userClient, userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Check-in saved successfully',
      data: checkIn,
    });
  } catch (err: any) {
    next(err);
  }
};

/**
 * GET /api/v1/check-ins
 * Retrieves paginated mood check-in history for the authenticated user.
 * Supports ?page=1&limit=10.
 */
export const getCheckInHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userClient = req.supabase!;

    // Validate pagination query parameters
    const parseResult = checkInQuerySchema.safeParse(req.query);
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

    const result = await CheckInService.getCheckInHistory(
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

