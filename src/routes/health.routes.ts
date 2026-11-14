import { Router } from 'express';
import { getHealth, getDatabaseHealth } from '../controllers/health.controller';

const router = Router();

// GET /api/v1/health - Basic server health
router.get('/health', getHealth);

// GET /api/v1/health/database - Supabase PostgreSQL connectivity check
router.get('/health/database', getDatabaseHealth);

export default router;
