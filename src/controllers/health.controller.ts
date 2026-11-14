import { Request, Response } from 'express';
import { env } from '../config/env';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';

/**
 * Basic server health check endpoint: GET /api/v1/health
 * Verifies that the Express application server is running.
 */
export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Therapy Companion API is running',
    environment: env.NODE_ENV,
  });
};

/**
 * Dedicated database connectivity health check: GET /api/v1/health/database
 * Performs a safe connectivity probe to Supabase PostgreSQL without exposing credentials or internal errors.
 */
export const getDatabaseHealth = async (_req: Request, res: Response): Promise<void> => {
  if (!isSupabaseConfigured()) {
    res.status(503).json({
      success: false,
      database: 'unconfigured',
      message: 'Database service is unconfigured. Supabase environment variables are missing.',
      environment: env.NODE_ENV,
    });
    return;
  }

  try {
    const supabase = getSupabaseClient();

    // Probe database connectivity via a lightweight query
    const { status, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    // A responding PostgREST instance returns an HTTP status code (200, 206, 401, 404/PGRST205, etc.)
    const isResponding = typeof status === 'number' && status > 0 && status < 500;

    if (isResponding) {
      const isSchemaMigrated = !error || (error.code !== 'PGRST205' && error.code !== 'PGRST204');

      res.status(200).json({
        success: true,
        database: 'connected',
        schema: isSchemaMigrated ? 'ready' : 'migration_pending',
        message: isSchemaMigrated
          ? 'Database connection healthy and schema verified'
          : 'Database connection established; schema migration pending in Supabase',
        environment: env.NODE_ENV,
      });
    } else {
      res.status(503).json({
        success: false,
        database: 'disconnected',
        message: 'Database service did not return an acceptable response.',
        environment: env.NODE_ENV,
      });
    }
  } catch (_err) {
    // Fail safely without exposing database credentials or internal errors
    res.status(503).json({
      success: false,
      database: 'error',
      message: 'Unable to connect to database.',
      environment: env.NODE_ENV,
    });
  }
};
