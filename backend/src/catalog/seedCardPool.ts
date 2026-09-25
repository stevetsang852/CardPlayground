import { collections } from '../config/database';
import { JP_HIT_AS_APP_RARITY } from '@shared/drawing/ptcgOdds';
import { guessRarity } from './rarityGuess';
import { KADO_M6A_CARDS, KADO_PACKS } from './kadoSnapshot';

const PACKS = [
  {
    id: 'basic',
    type: 'basic',
    name: 'JP Expansion Pack',
    cost: 100,
    currencyType: 'soft',
    model: 'jp-sv-5',
    cardsPerPack: 5,
    packsPerBox: 30,
    probabilities: {
      legendary: JP_HIT_AS_APP_RARITY.legendary,
      epic: JP_HIT_AS_APP_RARITY.epic,
      rare: JP_HIT_AS_APP_RARITY.rare,
      common: 0,
    },
    guaranteedLegendaryAfter: 150,
  },
  {
    id: 'premium',
    type: 'premium',
    name: 'JP High Class Pack',
    cost: 500,
    currencyType: 'soft',
    model: 'jp-sv-5',
    cardsPerPack: 5,
    packsPerBox: 10,
    probabilities: {
      legendary: 0.02,
      epic: 0.35,
      rare: 0.63,
      common: 0,
    },
    guaranteedLegendaryAfter: 80,
  },
  {
    id: 'legendary',
    type: 'legendary',
    name: 'God Pack Demo',
    cost: 2000,
    currencyType: 'soft',
    model: 'jp-sv-5',
    cardsPerPack: 5,
    packsPerBox: 1,
    probabilities: {
      legendary: 0.15,
      epic: 0.55,
      rare: 0.30,
      common: 0,
    },
    guaranteedLegendaryAfter: 10,
  },
];

export async function seedCardPool(): Promise<{ packs: number; templates: number }> {
  for (const pack of [...PACKS, ...KADO_PACKS]) {
    await collections.packConfigurations().doc(pack.id).set({
      ...pack,
      aspectRatio: '63/88',
      cardWidthMm: 63,
      cardHeightMm: 88,
    });
  }

  let added = 0;
  for (const card of KADO_M6A_CARDS) {
    const rarity = guessRarity(card.name, card.number);
    const existing = await collections.cardTemplates().doc(card.id).get();
    if (existing.exists) continue;
    await collections.cardTemplates().doc(card.id).set({
      ...card,
      templateId: card.id,
      rarity,
      description: `${card.name} (${card.number})`,
      theme: 'ptcg',
      imageUrl: '',
      score: rarity === 'legendary' ? 100 : rarity === 'epic' ? 40 : rarity === 'rare' ? 15 : 5,
      isLimitedEdition: false,
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'draw',
      packId: card.packId,
      aspectRatio: '63/88',
      sourceUrl: card.sourceUrl,
    });
    added += 1;
  }

  return { packs: PACKS.length + KADO_PACKS.length, templates: added };
}
