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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// Routes
app.use('/api/v1', routes);

// Error handler (must be last)
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket (leaderboard service wired in after DB init)
let wsManager: WebSocketManager;

// Make WebSocket manager available to routes
// (set after startServer initializes services)

// Initialize services and start server
async function startServer() {
  try {
    console.log('Initializing database...');
    const db = initializeDatabase();
    
    console.log('Initializing Redis...');
    await initializeRedis();
    
    // Initialize WebSocket with leaderboard service and db (for gallery real-time updates)
    const leaderboardService = new LeaderboardService(db);
    wsManager = new WebSocketManager(server, leaderboardService, db);
    app.set('wsManager', wsManager);
    
    // Start event cleanup service
    console.log('Starting event cleanup service...');
    const eventCleanupService = getEventCleanupService();
    eventCleanupService.start();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
      console.log(`Leaderboard WebSocket available at ws://localhost:${PORT}/ws/leaderboards`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Stop event cleanup service
  const eventCleanupService = getEventCleanupService();
  eventCleanupService.stop();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Only start the server when not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, wsManager };
