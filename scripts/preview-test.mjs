import { preview } from 'astro';

process.env.ASTRO_TELEMETRY_DISABLED = '1';
const server = await preview({ server: { host: '127.0.0.1', port: 43210 } });
if (server.port !== 43210) {
  await server.stop();
  throw new Error('Test port 43210 is in use. Refusing to test another project.');
}
