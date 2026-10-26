import { startWebServer } from '../src/web/server.js';

const port = Number(process.env.MOYU_PORT || 8787);
const server = await startWebServer({ port, open: false, reuse: false });

const stop = async () => {
  await server.close();
  process.exit(0);
};

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
