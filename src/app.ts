import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestLogger } from './middleware/logger';
import { notFoundHandler } from './middleware/not-found';
import { errorHandler } from './middleware/error-handler';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import checkInRoutes from './routes/checkin.routes';
import reflectionRoutes from './routes/reflection.routes';
import exerciseRoutes from './routes/exercise.routes';
import activityRoutes from './routes/activity.routes';

export const createApp = (): Application => {
  const app: Application = express();

  // Security headers with Helmet
  app.use(helmet());

  // Configurable Cross-Origin Resource Sharing
  const allowedOrigins = env.CLIENT_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, native tools)
        if (!origin) {
          return callback(null, true);
        }
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin '${origin}' not allowed by CORS policy`));
      },
      credentials: true,
    })
  );

  // Safe body parser for JSON with request size limit to mitigate DoS attacks
  app.use(express.json({ limit: '100kb' }));

  // Safe request logging

  app.use(requestLogger);

  // API v1 Routes
  app.use('/api/v1', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/check-ins', checkInRoutes);
  app.use('/api/v1/reflections', reflectionRoutes);
  app.use('/api/v1/exercises', exerciseRoutes);
  app.use('/api/v1/activity-logs', activityRoutes);

  // 404 Fallback
  app.use(notFoundHandler);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};

export default createApp();

