import { collections } from '../config/database';
import { JP_HIT_AS_APP_RARITY } from '@shared/drawing/ptcgOdds';

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

const SEED_CARDS: Array<{ id: string; name: string; rarity: 'common' | 'rare' | 'epic' | 'legendary'; number: string }> = [
  { id: 'seed-001', name: 'Exeggcute', rarity: 'common', number: '001' },
  { id: 'seed-002', name: 'Exeggutor', rarity: 'common', number: '002' },
  { id: 'seed-003', name: 'Volbeat', rarity: 'common', number: '003' },
  { id: 'seed-004', name: 'Illumise', rarity: 'common', number: '004' },
  { id: 'seed-005', name: 'Vivillon', rarity: 'rare', number: '005' },
  { id: 'seed-006', name: 'Moltres', rarity: 'rare', number: '006' },
  { id: 'seed-007', name: 'Ho-Oh', rarity: 'epic', number: '007' },
  { id: 'seed-008', name: 'Reshiram', rarity: 'epic', number: '008' },
  { id: 'seed-009', name: 'Fuecoco', rarity: 'common', number: '009' },
  { id: 'seed-010', name: 'Slowpoke', rarity: 'common', number: '010' },
  { id: 'seed-011', name: 'Lapras', rarity: 'rare', number: '011' },
  { id: 'seed-012', name: 'Articuno', rarity: 'rare', number: '012' },
  { id: 'seed-017', name: 'Pikachu', rarity: 'rare', number: '017' },
  { id: 'seed-126', name: 'Pikachu ex', rarity: 'legendary', number: '126' },
  { id: 'seed-135', name: 'Mew ex', rarity: 'legendary', number: '135' },
  { id: 'seed-137', name: 'Charizard', rarity: 'legendary', number: '137' },
  { id: 'seed-142', name: 'Lugia', rarity: 'legendary', number: '142' },
  { id: 'seed-150', name: 'Gengar', rarity: 'epic', number: '150' },
];

export async function seedCardPool(): Promise<{ packs: number; templates: number }> {
  for (const pack of PACKS) {
    await collections.packConfigurations().doc(pack.id).set({
      ...pack,
      sourceUrl: 'local-seed',
      aspectRatio: '63/88',
      cardWidthMm: 63,
      cardHeightMm: 88,
      attribution: 'Hit-slot rates approximate JP SV-era community box data, not an official TPC table.',
    });
  }

  let added = 0;
  for (const card of SEED_CARDS) {
    const existing = await collections.cardTemplates().doc(card.id).get();
    if (!existing.exists) {
      await collections.cardTemplates().doc(card.id).set({
        ...card,
        templateId: card.id,
        description: `${card.name} (${card.number})`,
        theme: 'ptcg',
        imageUrl: '',
        score: card.rarity === 'legendary' ? 100 : card.rarity === 'epic' ? 40 : card.rarity === 'rare' ? 15 : 5,
        isLimitedEdition: false,
        obtainedAt: new Date().toISOString(),
        obtainedFrom: 'draw',
        packId: 'basic',
        aspectRatio: '63/88',
      });
      added += 1;
    }
  }

  return { packs: PACKS.length, templates: added };
}
