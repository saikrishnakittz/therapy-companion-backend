import { Request, Response, NextFunction } from 'express';
import { ReflectionService } from '../services/reflection.service';
import {
  CreateReflectionInput,
  reflectionParamSchema,
  reflectionQuerySchema,
} from '../validators/reflection.validator';

/**
 * POST /api/v1/reflections
 * Saves a new guided reflection entry for the authenticated user.
 */
export const createReflection = async (
  req: Request<{}, {}, CreateReflectionInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userClient = req.supabase!;

    // Sensitive reflection answers are never logged
    const reflection = await ReflectionService.createReflection(
      userClient,
      userId,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'Reflection saved successfully',
      data: reflection,
    });
  } catch (err: any) {
    next(err);
  }
};

/**
 * GET /api/v1/reflections
 * Retrieves paginated guided reflection history for the authenticated user.
 * Supports ?page=1&limit=10.
 */
export const getReflectionHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userClient = req.supabase!;

    // Validate pagination query parameters
    const parseResult = reflectionQuerySchema.safeParse(req.query);
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

    const result = await ReflectionService.getReflectionHistory(
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
 * GET /api/v1/reflections/:id
 * Retrieves an individual reflection entry by ID for the authenticated user.
 * Returns 404 if not found or if owned by another user.
 */
export const getReflectionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userClient = req.supabase!;

    const paramCheck = reflectionParamSchema.safeParse(req.params);
    if (!paramCheck.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid reflection ID format. Must be a valid UUID.',
      });
      return;
    }

    const reflection = await ReflectionService.getReflectionById(
      userClient,
      userId,
      req.params.id
    );

    if (!reflection) {
      res.status(404).json({
        success: false,
        message: 'Reflection entry not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: reflection,
    });
  } catch (err: any) {
    next(err);
  }
};

/**
 * DELETE /api/v1/reflections/:id
 * Deletes an individual reflection entry by ID for the authenticated user.
 * Returns 404 if not found or if owned by another user.
 */
export const deleteReflection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userClient = req.supabase!;

    const paramCheck = reflectionParamSchema.safeParse(req.params);
    if (!paramCheck.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid reflection ID format. Must be a valid UUID.',
      });
      return;
    }

    const deleted = await ReflectionService.deleteReflection(
      userClient,
      userId,
      req.params.id
    );

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Reflection entry not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Reflection entry deleted successfully',
    });
  } catch (err: any) {
    next(err);
  }
};
