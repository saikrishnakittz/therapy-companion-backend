import { Router } from 'express';
import { generateDirectAiReflection } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate';
import { directAiReflectionSchema } from '../validators/ai.validator';

const router = Router();

// All AI reflection routes strictly require authenticated users
router.use(requireAuth);

/**
 * POST /api/v1/ai/reflection
 * Generates an empathetic AI reflection based on 3 guided reflection answers.
 */
router.post(
  '/reflection',
  validateBody(directAiReflectionSchema),
  generateDirectAiReflection
);

/**
 * POST /api/v1/ai (convenience alias)
 */
router.post(
  '/',
  validateBody(directAiReflectionSchema),
  generateDirectAiReflection
);

export default router;
