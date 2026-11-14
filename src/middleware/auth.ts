import { Request, Response, NextFunction } from 'express';
import { getSupabaseClient, createAuthenticatedClient, isSupabaseConfigured } from '../config/supabase';

/**
 * Middleware that verifies the Bearer JWT token from the Authorization header,
 * extracts the authenticated user profile from Supabase Auth, and attaches
 * an RLS-scoped Supabase client (`req.supabase`) to the request object.
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
        message: 'Database service is temporarily unconfigured. Please set Supabase environment variables.',
      });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Missing or malformed Authorization header.',
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

    // Verify token using the public Supabase client
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.',
      });
      return;
    }

    // Attach authenticated user and user-scoped Supabase client that respects RLS
    req.user = data.user;
    req.token = token;
    req.supabase = createAuthenticatedClient(token);

    next();
  } catch (error: any) {
    next(error);
  }
};

