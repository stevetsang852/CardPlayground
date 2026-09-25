import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { authSecret, isAuthBypassEnabled } from '../../config/authConfig';
import { issuePlaygroundToken } from '../../utils/playgroundToken';
import { collections } from '../../config/database';

const router = Router();

router.get('/status', (req: Request, res: Response) => {
  res.json({
    bypass: isAuthBypassEnabled(),
    mode: isAuthBypassEnabled() ? 'debug-bypass' : 'token',
  });
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerId = String(req.body?.playerId || '').trim();
    const secret = String(req.body?.secret || '');
    if (!playerId) {
      throw new AppError(400, 'INVALID_PLAYER', 'playerId is required', false);
    }
    if (!isAuthBypassEnabled() && secret !== authSecret()) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid login secret', false);
    }

    const playerRef = collections.players().doc(playerId);
    const existing = await playerRef.get();
    if (!existing.exists) {
      await playerRef.set({
        id: playerId,
        cards: [],
        softCurrency: 1000,
        hardCurrency: 0,
        luckValue: 0,
        drawsSinceLastLegendary: 0,
        legendaryPacksThisWeek: 0,
        weekResetDate: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      });
    }

    const token = issuePlaygroundToken(playerId, authSecret());
    res.json({ token, playerId, bypass: isAuthBypassEnabled() });
  } catch (error) {
    next(error);
  }
});

export default router;
