import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode =
    err.statusCode ||
    (res.statusCode && res.statusCode >= 400 ? res.statusCode : 500);

  // Check if running in production or on Render hosting
  const isProduction =
    env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    process.env.NODE_ENV === 'production';

  // Server-side diagnostic logging (full stack trace retained for developers in Render console)
  console.error(
    `[ERROR] ${req.method} ${req.originalUrl} - Status: ${statusCode} - ${err.message || 'Internal Server Error'}`
  );
  if (err.stack) {
    console.error(`[STACK] ${err.stack}`);
  }

  // Client response: Never expose internal stack traces in production / deployed environments
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(!isProduction && { stack: err.stack }),
  });
};

