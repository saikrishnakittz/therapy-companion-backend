import { Router } from 'express';
import {
  createReflection,
  getReflectionHistory,
  getReflectionById,
  deleteReflection,
} from '../controllers/reflection.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate';
import { createReflectionSchema } from '../validators/reflection.validator';

const router = Router();

// All reflection endpoints require user authentication
router.use(requireAuth);

// POST /api/v1/reflections - Save a new guided reflection
router.post('/', validateBody(createReflectionSchema), createReflection);

// GET /api/v1/reflections - Retrieve paginated reflection history
router.get('/', getReflectionHistory);

// GET /api/v1/reflections/:id - Retrieve individual reflection by ID
router.get('/:id', getReflectionById);

// DELETE /api/v1/reflections/:id - Delete individual reflection by ID
router.delete('/:id', deleteReflection);

export default router;

