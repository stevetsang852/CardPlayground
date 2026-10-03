import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import * as dotenv from 'dotenv';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { WebSocketManager } from './api/websocket';
import { errorHandler } from './api/middleware/errorHandler';
import routes from './api/routes';
import { getEventCleanupService } from './services/eventCleanupService';
import { LeaderboardService } from './services/leaderboardService';
import { syncKadoCatalog } from './catalog/kadoCatalogService';
import { seedCardPool } from './catalog/seedCardPool';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] ||
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

app.use('/api/v1', routes);
app.use(errorHandler);

const server = createServer(app);
let wsManager: WebSocketManager;

async function startServer() {
  try {
    console.log('Initializing database...');
    const db = initializeDatabase();

    console.log('Initializing Redis...');
    await initializeRedis();

    if ((process.env.KADO_SYNC_ON_START || 'true').toLowerCase() !== 'false') {
      try {
        const catalog = await syncKadoCatalog();
        console.log('KADO catalog', catalog);
      } catch (err) {
        console.warn('KADO catalog sync skipped:', (err as Error).message);
      }
    }

    try {
      const seeded = await seedCardPool();
      console.log('Card pool seed', seeded);
    } catch (err) {
      console.warn('Card pool seed skipped:', (err as Error).message);
    }

    const leaderboardService = new LeaderboardService(db);
    wsManager = new WebSocketManager(server, leaderboardService, db);
    app.set('wsManager', wsManager);

    const eventCleanupService = getEventCleanupService();
    eventCleanupService.start();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  getEventCleanupService().stop();
  server.close(() => process.exit(0));
});

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, wsManager };
