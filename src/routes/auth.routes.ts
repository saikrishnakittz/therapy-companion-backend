import { Router } from 'express';
import { register, login, logout, getCurrentUser } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', validateBody(registerSchema), register);

// POST /api/v1/auth/login
router.post('/login', validateBody(loginSchema), login);

// POST /api/v1/auth/logout (Authenticated)
router.post('/logout', requireAuth, logout);

// GET /api/v1/auth/me (Authenticated)
router.get('/me', requireAuth, getCurrentUser);

export default router;
