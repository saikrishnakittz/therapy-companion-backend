import { Request, Response, NextFunction } from 'express';
import { getSupabaseClient, createAuthenticatedClient, isSupabaseConfigured } from '../config/supabase';

/**
 * Authentication Middleware
 * - Verifies Bearer JWT tokens strictly with Supabase Auth getUser(token)
 * - Attaches verified user and user-scoped Supabase client (respects RLS) to req
 * - Never trusts any user ID passed via the request body
 * - Returns uniform 401 Unauthorized errors on invalid, expired, or missing tokens
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({
        success: false,
        message: 'Database/Auth service is temporarily unconfigured.',
      });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Missing Authorization header.',
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Authorization header must be in "Bearer <token>" format.',
      });
      return;
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Missing Bearer token.',
      });
      return;
    }

    // Verify token cryptographically and server-side with Supabase Auth
    // Never decode a JWT and treat that alone as proof of authentication
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        success: false,
        message: 'Invalid, revoked, or expired authentication token.',
      });
      return;
    }

    // Attach verified user identity and RLS-scoped Supabase client to the request
    req.user = data.user;
    req.token = token;
    req.supabase = createAuthenticatedClient(token);

    next();
  } catch (error: any) {
    next(error);
  }
};
