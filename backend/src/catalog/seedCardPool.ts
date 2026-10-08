import { collections } from '../config/database';
import { JP_HIT_AS_APP_RARITY } from '@shared/drawing/ptcgOdds';
import { guessRarity } from './rarityGuess';
import { KADO_M6A_CARDS, KADO_PACKS } from './kadoSnapshot';
import { loadDownloadedM6aCards } from './m6aCardsFile';

const PACK_ART = {
  booster: 'https://asia.pokemon-card.com/hk/archive/special/card/m6a/images/locale/hk/m6a_pillow_4f272152.webp',
  partners: 'https://asia.pokemon-card.com/hk/archive/special/card/m6a/images/locale/hk/others/special-deck_e24e2df6.webp',
  special: 'https://asia.pokemon-card.com/hk/archive/special/card/m6a/images/locale/hk/others/special-set_c5d9d762.webp',
};

const PACKS = [
  {
    id: 'm6a',
    type: 'basic',
    name: '擴充包「30th CELEBRATION」',
    imageUrl: PACK_ART.booster,
    setCode: 'M6a',
    cost: 25,
    currencyType: 'soft',
    model: 'jp-sv-5',
    cardsPerPack: 6,
    packsIncluded: 1,
    packsPerBox: 20,
    probabilities: {
      legendary: JP_HIT_AS_APP_RARITY.legendary,
      epic: JP_HIT_AS_APP_RARITY.epic,
      rare: JP_HIT_AS_APP_RARITY.rare,
      common: 0,
    },
    guaranteedLegendaryAfter: 150,
  },
  {
    id: 'm6a-first-partners',
    type: 'premium',
    name: '特別卡組「最初的夥伴」',
    imageUrl: PACK_ART.partners,
    setCode: 'M6a',
    cost: 135,
    currencyType: 'soft',
    model: 'jp-sv-5',
    cardsPerPack: 6,
    packsIncluded: 4,
    packsPerBox: 1,
    probabilities: {
      legendary: 0.02,
      epic: 0.35,
      rare: 0.63,
      common: 0,
    },
    guaranteedLegendaryAfter: 80,
  },
  {
    id: 'm6a-special',
    type: 'legendary',
    name: '特別組合 仙子伊布ex／甲賀忍蛙ex',
    imageUrl: PACK_ART.special,
    setCode: 'M6a',
    cost: 145,
    currencyType: 'soft',
    model: 'jp-sv-5',
    cardsPerPack: 6,
    packsIncluded: 5,
    packsPerBox: 1,
    probabilities: {
      legendary: 0.04,
      epic: 0.4,
      rare: 0.56,
      common: 0,
    },
    guaranteedLegendaryAfter: 80,
  },
];

function catalogCards() {
  const downloaded = loadDownloadedM6aCards();
  const byId = new Map(downloaded.map(card => [card.id, card]));
  const seeded = KADO_M6A_CARDS.map(card => ({
    ...card,
    imageUrl: byId.get(card.id)?.imageUrl || card.imageUrl,
    name: byId.get(card.id)?.name || card.name,
  }));
  const seededIds = new Set(seeded.map(card => card.id));
  return [...seeded, ...downloaded.filter(card => !seededIds.has(card.id))];
}

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
  for (const card of catalogCards()) {
    const rarity = guessRarity(card.name, card.number);
    const existing = await collections.cardTemplates().doc(card.id).get();
    if (existing.exists) {
      const data = existing.data() || {};
      if ((!data.imageUrl || data.imageUrl.includes('official-artwork')) && card.imageUrl) {
        await collections.cardTemplates().doc(card.id).set({ ...data, imageUrl: card.imageUrl, name: card.name });
      }
      continue;
    }
    await collections.cardTemplates().doc(card.id).set({
      ...card,
      templateId: card.id,
      rarity,
      description: `${card.name} (${card.number})`,
      theme: 'ptcg',
      imageUrl: card.imageUrl,
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
