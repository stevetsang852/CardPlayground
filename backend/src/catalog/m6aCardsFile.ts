import * as fs from 'fs';
import * as path from 'path';

export interface DownloadedCard {
  id: string;
  name: string;
  number: string;
  packId: string;
  sourceUrl: string;
  imageUrl: string;
}

export function m6aCardsPath(): string {
  return path.resolve(process.cwd(), 'data', 'm6a-cards.json');
}

export function loadDownloadedM6aCards(filePath = m6aCardsPath()): DownloadedCard[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const cards = Array.isArray(raw) ? raw : raw.cards;
  if (!Array.isArray(cards)) return [];
  return cards.filter((card: DownloadedCard) => card?.id && card?.imageUrl && card?.name);
}
