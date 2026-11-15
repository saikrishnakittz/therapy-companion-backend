import { Request, Response, NextFunction } from 'express';
import { ReflectionService } from '../services/reflection.service';
import { AiService } from '../services/ai.service';
import { isOpenAiConfigured } from '../config/openai';
import {
  CreateReflectionInput,
  GenerateAiReflectionInput,
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

/**
 * POST /api/v1/reflections/:id/ai-reflection
 * Generates an empathetic, non-clinical AI reflection via OpenAI for the authenticated user.
 * Explicit user consent is mandatory and validated before any AI request is initiated.
 */
export const generateAiReflection = async (
  req: Request<{ id: string }, {}, GenerateAiReflectionInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userClient = req.supabase!;
    const reflectionId = req.params.id;

    // 1. Verify AI provider prerequisites
    const activeProvider = AiService.getActiveProvider();
    if (activeProvider.name === 'openai' && !isOpenAiConfigured()) {
      res.status(503).json({
        success: false,
        message:
          'AI reflection service is currently unconfigured. Please ensure OPENAI_API_KEY is set in Render environment variables, or set AI_PROVIDER=mock for mock mode.',
      });
      return;
    }

    // 2. Resolve answers: either from request body or by looking up saved reflection in DB
    let q1 = req.body.questionOne?.trim();
    let q2 = req.body.questionTwo?.trim();
    let q3 = req.body.questionThree?.trim();

    // If answers were not provided in body, fetch them from DB using reflectionId
    if (!q1 || !q2 || !q3) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          reflectionId
        );
      if (!isUuid) {
        res.status(400).json({
          success: false,
          message:
            'Please provide question answers in the request body, or a valid reflection UUID.',
        });
        return;
      }

      const existingRecord = await ReflectionService.getReflectionById(
        userClient,
        userId,
        reflectionId
      );

      if (!existingRecord) {
        res.status(404).json({
          success: false,
          message: 'Reflection entry not found for this user.',
        });
        return;
      }

      q1 = q1 || existingRecord.questionOne;
      q2 = q2 || existingRecord.questionTwo;
      q3 = q3 || existingRecord.questionThree;
    }

    if (!q1 || !q2 || !q3) {
      res.status(400).json({
        success: false,
        message:
          'All three reflection answers are required to generate an AI reflection.',
      });
      return;
    }

    // 3. Call AI Service (never log journal content or result)
    const result = await AiService.generateReflection({
      questionOne: q1,
      questionTwo: q2,
      questionThree: q3,
      communicationStyle: req.body.communicationStyle,
    });

    res.status(200).json({
      success: true,
      message: 'AI reflection generated successfully',
      data: {
        reflectionId,
        generatedText: result.generatedText,
        keyThemes: result.keyThemes,
        model: result.model,
        provider: result.provider,
        generatedAt: result.generatedAt,
      },
    });
  } catch (err: any) {
    next(err);
  }
};

