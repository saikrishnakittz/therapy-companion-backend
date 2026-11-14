import { spawn } from 'child_process';
import path from 'path';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyDistBuild(): Promise<void> {
  console.log('Testing production build (dist/server.js)...');

  const serverProcess = spawn('node', [path.join(__dirname, '../../dist/server.js')], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '5055' },
  });

  try {
    // Wait for server to start listening
    await wait(2000);

    // Test GET /api/v1/health
    const healthRes = await fetch('http://127.0.0.1:5055/api/v1/health');
    const healthJson = await healthRes.json();
    console.log('GET /api/v1/health status:', healthRes.status, healthJson);

    if (healthRes.status !== 200 || !healthJson.success) {
      throw new Error('Health check failed on compiled dist/server.js');
    }

    // Test GET /api/v1/health/database
    const dbRes = await fetch('http://127.0.0.1:5055/api/v1/health/database');
    const dbJson = await dbRes.json();
    console.log('GET /api/v1/health/database status:', dbRes.status, dbJson);

    if (dbRes.status !== 200 || dbJson.database !== 'connected') {
      throw new Error('Database health check failed on compiled dist/server.js');
    }

    console.log('✅ Production dist/server.js verified successfully!');
  } finally {
    serverProcess.kill('SIGTERM');
  }
}

verifyDistBuild().catch((err) => {
  console.error('Dist verification failed:', err);
  process.exit(1);
});
