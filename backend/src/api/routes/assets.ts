import { Router, Response, NextFunction } from 'express';
import { AuthRequest, getPlayerId } from '../middleware/auth';
import { verifyClientAssets } from '../../services/assetVerificationService';

const router = Router();

router.post('/verify', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const playerId = getPlayerId(req);
    const claimedCardIds = Array.isArray(req.body?.cardIds) ? req.body.cardIds.map(String) : [];
    const result = await verifyClientAssets(playerId, claimedCardIds);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
