/**
 * Lightweight contract probe for Worker root endpoints used by frontend bootstrapping.
 * Usage:
 *   node test_frontend_api.js
 *   WORKER_URL=https://... node test_frontend_api.js
 */

const workerUrl = (process.env.WORKER_URL || 'https://wastewater-api.juankael37.workers.dev').replace(/\/$/, '');

async function run() {
  const root = await fetch(`${workerUrl}/`);
  if (!root.ok) {
    throw new Error(`GET / failed with status ${root.status}`);
  }
  const rootBody = await root.json();
  if (rootBody?.capabilities?.mode) {
    if (rootBody.capabilities.mode !== 'worker') {
      throw new Error(`Unexpected capabilities mode: ${rootBody.capabilities.mode}`);
    }
  } else if (rootBody?.message !== 'Wastewater Monitoring API') {
    throw new Error('Root payload missing expected worker marker');
  }

  const capabilities = await fetch(`${workerUrl}/capabilities`);
  if (capabilities.ok) {
    const capBody = await capabilities.json();
    if (capBody.mode !== 'worker') {
      throw new Error(`Unexpected mode from /capabilities: ${capBody.mode}`);
    }
  } else {
    console.log(`WARN: /capabilities not available yet (status ${capabilities.status})`);
  }

  console.log('OK: Worker contract probe passed');
}

run().catch((err) => {
  console.error('FAIL:', err.message || err);
  process.exit(1);
});
