import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestLogger } from './middleware/logger';
import { notFoundHandler } from './middleware/not-found';
import { errorHandler } from './middleware/error-handler';
import healthRoutes from './routes/health.routes';

export const createApp = (): Application => {
  const app: Application = express();

  // Security headers with Helmet
  app.use(helmet());

  // Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );

  // Body parser for JSON
  app.use(express.json());

  // Safe request logging
  app.use(requestLogger);

  // API v1 Routes
  app.use('/api/v1', healthRoutes);

  // 404 Fallback
  app.use(notFoundHandler);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};

export default createApp();

