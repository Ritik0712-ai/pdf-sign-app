import app from './app.js';
import { config } from './config/index.js';

const server = app.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║         Document Signature App - Backend API             ║
╠══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${config.port}                 ║
║  Environment: ${config.nodeEnv.padEnd(39)}║
╚══════════════════════════════════════════════════════════╝
  `);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});
