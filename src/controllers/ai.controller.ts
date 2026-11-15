import { Request, Response, NextFunction } from 'express';
import { AiService } from '../services/ai.service';
import { DirectAiReflectionInput } from '../validators/ai.validator';

/**
 * POST /api/v1/ai/reflection
 * Generates an empathetic, non-clinical AI reflection from guided journal answers.
 * Requires authenticated user, explicit consent, and valid non-empty answers.
 * Privacy rule: Raw journal answers and generated content are NEVER logged or written to activity_logs.
 */
export const generateDirectAiReflection = async (
  req: Request<{}, {}, DirectAiReflectionInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { questionOne, questionTwo, questionThree, communicationStyle } = req.body;

    const result = await AiService.generateReflection({
      questionOne,
      questionTwo,
      questionThree,
      communicationStyle,
    });

    res.status(200).json({
      success: true,
      message: 'AI reflection generated successfully',
      data: {
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
