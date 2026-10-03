import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { collections } from '../../config/database';
import { isCatalogValid, syncKadoCatalog } from '../../catalog/kadoCatalogService';

const router = Router();

router.get('/status', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [valid, packs, cards] = await Promise.all([
      isCatalogValid(),
      collections.packConfigurations().get(),
      collections.cardTemplates().get(),
    ]);
    res.json({
      valid,
      source: 'https://www.kado.hk/database',
      packs: packs.size,
      cards: cards.size,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/cards', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const snap = await collections.cardTemplates().get();
    const cards = snap.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        number: data.number,
        rarity: data.rarity,
        packId: data.packId,
        sourceUrl: data.sourceUrl,
      };
    });
    res.json({ count: cards.length, cards });
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
