import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { isCatalogValid, syncKadoCatalog } from '../../catalog/kadoCatalogService';

const router = Router();

router.get('/status', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ valid: await isCatalogValid(), source: 'https://www.kado.hk/database' });
  } catch (error) {
    next(error);
  }
});

router.post('/sync', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await syncKadoCatalog({ force: Boolean(req.body?.force) });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
