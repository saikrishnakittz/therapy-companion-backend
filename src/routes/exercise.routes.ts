import { Router } from 'express';
import { completeExercise } from '../controllers/exercise.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate';
import { completeExerciseSchema } from '../validators/exercise.validator';

const router = Router();

// All exercise endpoints require user authentication
router.use(requireAuth);

// POST /api/v1/exercises/complete - Record exercise completion
router.post('/complete', validateBody(completeExerciseSchema), completeExercise);

export default router;
