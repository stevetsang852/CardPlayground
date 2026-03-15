import { Router } from 'express';
import cardRoutes from './cards';
import synthesisRoutes from './synthesis';
import eventRoutes from './events';
import socialRoutes from './social';
import marketRoutes from './market';
import achievementRoutes from './achievements';
import seasonRoutes from './season';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API version
router.get('/version', (req, res) => {
  res.json({ version: '1.0.0', apiVersion: 'v1' });
});

// Route modules
router.use('/cards', cardRoutes);
router.use('/synthesis', synthesisRoutes);
router.use('/events', eventRoutes);
router.use('/social', socialRoutes);
router.use('/market', marketRoutes);
router.use('/achievements', achievementRoutes);
router.use('/season', seasonRoutes);

export default router;
