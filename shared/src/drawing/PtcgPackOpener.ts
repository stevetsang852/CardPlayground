import { Card, CardRarity } from '../types/card';
import { SeededRandom } from '../random/SeededRandom';
import { hitKindToAppRarity, rollJpHitSlot } from './ptcgOdds';

function pick(pool: Map<CardRarity, Card[]>, rarity: CardRarity, rng: SeededRandom): Card {
  const fallbackOrder: CardRarity[] = [rarity, 'rare', 'common', 'epic', 'legendary'];
  let cards: Card[] | undefined;
  for (const r of fallbackOrder) {
    cards = pool.get(r);
    if (cards && cards.length) break;
  }
  if (!cards || !cards.length) throw new Error('Card pool is empty');
  const template = cards[Math.floor(rng.next() * cards.length)];
  return {
    ...template,
    id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    rarity: template.rarity,
    obtainedAt: new Date().toISOString(),
    obtainedFrom: 'draw',
  };
}

export interface OpenedPack {
  cards: Card[];
  hitKind: ReturnType<typeof rollJpHitSlot>;
  hitRarity: CardRarity;
}

export function openJpExpansionPack(cardPool: Map<CardRarity, Card[]>, serverSeed: number): OpenedPack {
  const rng = new SeededRandom(serverSeed);
  const cards: Card[] = [];
  cards.push(pick(cardPool, 'common', rng));
  cards.push(pick(cardPool, 'common', rng));
  cards.push(pick(cardPool, 'common', rng));
  cards.push(pick(cardPool, 'rare', rng));
  const hitKind = rollJpHitSlot(rng.next());
  const hitRarity = hitKindToAppRarity(hitKind);
  const hit = pick(cardPool, hitRarity, rng);
  hit.rarity = hitRarity;
  cards.push(hit);
  return { cards, hitKind, hitRarity };
}
