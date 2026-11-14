import { Router } from 'express';
import {
  getActivityLogs,
  getActivitySummary,
} from '../controllers/activity.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All activity log endpoints require user authentication
router.use(requireAuth);

// GET /api/v1/activity-logs/summary - Activity statistics summary
router.get('/summary', getActivitySummary);

// GET /api/v1/activity-logs - Paginated activity log history
router.get('/', getActivityLogs);

export default router;
