import { Router } from 'express';
import cardRoutes from './cards';
import synthesisRoutes from './synthesis';
import eventRoutes from './events';
import socialRoutes from './social';
import marketRoutes from './market';
import achievementRoutes from './achievements';
import seasonRoutes from './season';
import authRoutes from './auth';
import assetRoutes from './assets';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/version', (req, res) => {
  res.json({ version: '1.0.0', apiVersion: 'v1' });
});

router.use('/auth', authRoutes);

router.use('/cards', authenticate, cardRoutes);
router.use('/synthesis', authenticate, synthesisRoutes);
router.use('/events', authenticate, eventRoutes);
router.use('/social', authenticate, socialRoutes);
router.use('/market', authenticate, marketRoutes);
router.use('/achievements', authenticate, achievementRoutes);
router.use('/season', authenticate, seasonRoutes);
router.use('/assets', authenticate, assetRoutes);

export default router;
