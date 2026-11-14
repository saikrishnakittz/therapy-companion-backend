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

  // Safe error logging without logging sensitive headers, body or tokens
  console.error(`[ERROR] ${req.method} ${req.originalUrl} - ${err.message || 'Internal Server Error'}`);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

