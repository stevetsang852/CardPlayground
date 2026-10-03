import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { collections } from '../../config/database';
import { openJpExpansionPack } from '@shared/drawing/PtcgPackOpener';
import { JP_HIT_SLOT, JP_BOX_PACKS } from '@shared/drawing/ptcgOdds';
import { Card, CardRarity } from '@shared/types/card';
import { getPlayerId } from '../middleware/auth';

const router = Router();

router.get('/odds', (_req: Request, res: Response) => {
  res.json({
    model: 'jp-sv-5',
    cardsPerPack: 5,
    packsPerBox: JP_BOX_PACKS,
    structure: ['common', 'common', 'common', 'uncommon-or-rare', 'hit-slot'],
    hitSlotPerPack: {
      UR: JP_HIT_SLOT.ur,
      SAR: JP_HIT_SLOT.sar,
      SR: JP_HIT_SLOT.sr,
      AR: JP_HIT_SLOT.ar,
      RR: JP_HIT_SLOT.rr,
      R: 1 - Object.values(JP_HIT_SLOT).reduce((a, b) => a + b, 0),
    },
    mappedToAppRarity: {
      legendary: 'UR + SAR',
      epic: 'SR + AR + RR',
      rare: 'R / U',
      common: 'C x3',
    },
    note: 'Community box observations for JP expansion packs. Not an official Pokemon Company table.',
  });
});

router.post('/open-pack', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quantity = Math.min(Math.max(Number(req.body?.quantity || 1), 1), 10);
    const playerId = getPlayerId(req);
    const templates = await collections.cardTemplates().get();
    const pool = new Map<CardRarity, Card[]>();
    templates.docs.forEach((doc: any) => {
      const card = doc.data() as Card;
      const rarity = (card.rarity || 'common') as CardRarity;
      if (!pool.has(rarity)) pool.set(rarity, []);
      pool.get(rarity)!.push({ ...card, id: doc.id });
    });
    if ([...pool.values()].every(arr => !arr.length)) {
      throw new AppError(500, 'CARD_POOL_EMPTY', 'No card templates seeded', true);
    }

    const packs = [];
    const allCards: Card[] = [];
    for (let i = 0; i < quantity; i++) {
      const opened = openJpExpansionPack(pool, Date.now() + i * 997);
      packs.push({ hitKind: opened.hitKind, hitRarity: opened.hitRarity, cards: opened.cards });
      allCards.push(...opened.cards);
    }

    const playerRef = collections.players().doc(playerId);
    const playerDoc = await playerRef.get();
    if (playerDoc.exists) {
      const player = playerDoc.data() as any;
      const ids = [...(player.cards || []), ...allCards.map(c => c.id)];
      await playerRef.update({ cards: ids, lastActiveAt: new Date().toISOString() });
    }

    res.json({ quantity, cardsPerPack: 5, packs, cards: allCards });
  } catch (error) {
    next(error);
  }
});

export default router;
