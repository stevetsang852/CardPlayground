import * as fs from 'fs';
import * as path from 'path';
import { fetchPublicHtml } from './kadoCatalogService';
import { decodeHtml, extractCardImageUrl, parseTwSetList } from './kadoParser';

const SET_URL = process.env.M6A_SET_URL || 'https://www.kado.hk/database/tw/M6a';
const DELAY_MS = Number(process.env.KADO_REQUEST_DELAY_MS || '400');

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const indexHtml = await fetchPublicHtml(SET_URL);
  const listed = parseTwSetList(indexHtml, 'kado-m6a');
  if (listed.length < 20) throw new Error(`M6a set page returned only ${listed.length} cards`);

  const cards = [];
  for (const card of listed) {
    const page = await fetchPublicHtml(card.sourceUrl);
    const imageUrl = extractCardImageUrl(page);
    if (!imageUrl) throw new Error(`Missing card image for ${card.number} ${card.name}`);
    cards.push({ ...card, name: decodeHtml(card.name), imageUrl });
    await delay(DELAY_MS);
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: SET_URL,
    set: 'M6a 30th CELEBRATION',
    cardCount: cards.length,
    cards,
  };
  const outDir = path.resolve(process.cwd(), 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'm6a-cards.json');
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(JSON.stringify({ wrote: outPath, cards: cards.length }));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
