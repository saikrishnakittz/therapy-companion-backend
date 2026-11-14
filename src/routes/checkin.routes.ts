import { Router } from 'express';
import { createCheckIn, getCheckInHistory } from '../controllers/checkin.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate';
import { createCheckInSchema } from '../validators/checkin.validator';

const router = Router();

// All check-in endpoints require user authentication
router.use(requireAuth);

// POST /api/v1/check-ins - Create a new emotional check-in
router.post('/', validateBody(createCheckInSchema), createCheckIn);

// GET /api/v1/check-ins - Retrieve paginated check-in history
router.get('/', getCheckInHistory);

export default router;

