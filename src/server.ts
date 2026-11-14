import app from './app';
import { env } from './config/env';

const HOST = '0.0.0.0';

const server = app.listen(env.PORT, HOST, () => {
  console.log(`🚀 Therapy Companion API server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  console.log(`🔗 Health check endpoint: http://localhost:${env.PORT}/api/v1/health`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10 seconds if lingering
  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default server;

