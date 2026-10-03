import { collections } from '../config/database';
import { cache } from '../config/redis';
import { parsePackIndex, parseSetCards, ParsedPack } from './kadoParser';
import { parseOfficialPackIndex, parseOfficialCardList } from './officialAsiaParser';

const INDEX_URLS = [
  { url: 'https://www.kado.hk/database', locale: 'jp-en' },
  { url: 'https://www.kado.hk/database/tw', locale: 'tw' },
  { url: 'https://www.kado.hk/database/cn', locale: 'cn' },
];

const OFFICIAL_INDEX = 'https://asia.pokemon-card.com/hk/card-search/';
const META_DOC = 'kado-catalog-meta';
const REDIS_KEY = 'kado:catalog';
const DEFAULT_TTL_HOURS = 24;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function maxSets(): number {
  return Number(process.env.KADO_SYNC_MAX_SETS || '3');
}

function ttlMs(): number {
  return Number(process.env.KADO_CATALOG_TTL_HOURS || DEFAULT_TTL_HOURS) * 3600 * 1000;
}

export async function fetchPublicHtml(url: string): Promise<string> {
  if (url.includes('kado.hk') && url.includes('/api/')) {
    throw new Error('kado.hk /api/ is disallowed by robots.txt');
  }
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'CardPlaygroundLocalCatalog/1.0 (personal playground; +https://github.com/stevetsang852/CardPlayground)',
      Accept: 'text/html',
    },
  });
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return res.text();
}

export async function isCatalogValid(): Promise<boolean> {
  const meta = await collections.packConfigurations().doc(META_DOC).get();
  if (!meta.exists) return false;
  const fetchedAt = new Date(meta.data()?.fetchedAt || 0).getTime();
  if (!fetchedAt || Date.now() - fetchedAt > ttlMs()) return false;
  const packs = await collections.packConfigurations().limit(3).get();
  return packs.size > 1;
}

async function persistSummary(summary: Record<string, unknown>) {
  await collections.packConfigurations().doc(META_DOC).set(summary);
  await cache.set(REDIS_KEY, summary, Math.floor(ttlMs() / 1000));
}

async function syncFromKado(fetchHtml: (url: string) => Promise<string>) {
  const packs: ParsedPack[] = [];
  for (const index of INDEX_URLS) {
    const html = await fetchHtml(index.url);
    packs.push(...parsePackIndex(html, index.locale).map(p => ({ ...p, locale: index.locale })));
    await delay(Number(process.env.KADO_REQUEST_DELAY_MS || '500'));
  }

  const unique = new Map(packs.map(p => [p.sourceUrl, p]));
  const selected = [...unique.values()].slice(0, maxSets());
  if (selected.length === 0) throw new Error('KADO index returned no packs');

  let cardCount = 0;
  for (const pack of selected) {
    await collections.packConfigurations().doc(pack.id).set({
      id: pack.id,
      name: pack.name,
      type: pack.id,
      sourceUrl: pack.sourceUrl,
      cardCount: pack.cardCount,
      locale: pack.locale,
      currencyType: 'soft',
      cost: 0,
    });
    const setHtml = await fetchHtml(pack.sourceUrl);
    const cards = parseSetCards(setHtml, pack.id, pack.sourceUrl);
    for (const card of cards) {
      await collections.cardTemplates().doc(card.id).set({
        id: card.id,
        name: card.name,
        number: card.number,
        sourceUrl: card.sourceUrl,
        packId: card.packId,
        rarity: 'common',
      });
      cardCount += 1;
    }
    await delay(Number(process.env.KADO_REQUEST_DELAY_MS || '500'));
  }

  const summary = {
    fetchedAt: new Date().toISOString(),
    packs: selected.length,
    cards: cardCount,
    source: 'kado-html',
    sourceIndex: INDEX_URLS.map(i => i.url),
    attribution: 'Primary: public pages on https://www.kado.hk/database',
  };
  await persistSummary(summary);
  return { packs: selected.length, cards: cardCount, source: 'kado-html', refreshed: true };
}

async function syncFromOfficial(fetchHtml: (url: string) => Promise<string>) {
  const indexHtml = await fetchHtml(OFFICIAL_INDEX);
  const packs = parseOfficialPackIndex(indexHtml).slice(0, maxSets());
  if (packs.length === 0) throw new Error('Official HK card-search returned no packs');

  let cardCount = 0;
  for (const pack of packs) {
    await collections.packConfigurations().doc(pack.id).set({
      id: pack.id,
      name: pack.name,
      type: pack.code,
      sourceUrl: pack.sourceUrl,
      locale: 'hk',
      currencyType: 'soft',
      cost: 0,
    });
    const listHtml = await fetchHtml(pack.sourceUrl);
    const cards = parseOfficialCardList(listHtml, pack.id);
    for (const card of cards) {
      await collections.cardTemplates().doc(card.id).set({
        id: card.id,
        name: card.name,
        sourceUrl: card.sourceUrl,
        packId: card.packId,
        rarity: 'common',
      });
      cardCount += 1;
    }
    await delay(Number(process.env.KADO_REQUEST_DELAY_MS || '500'));
  }

  const summary = {
    fetchedAt: new Date().toISOString(),
    packs: packs.length,
    cards: cardCount,
    source: 'official-hk',
    sourceIndex: [OFFICIAL_INDEX],
    attribution: 'Fallback: public pages on https://asia.pokemon-card.com/hk/card-search/',
  };
  await persistSummary(summary);
  return { packs: packs.length, cards: cardCount, source: 'official-hk', refreshed: true };
}

export async function syncKadoCatalog(options?: { force?: boolean; fetchHtml?: (url: string) => Promise<string> }): Promise<{
  packs: number;
  cards: number;
  source: string;
  refreshed: boolean;
}> {
  if (!options?.force && await isCatalogValid()) {
    const cached = await cache.get<any>(REDIS_KEY);
    return {
      packs: cached?.packs || 0,
      cards: cached?.cards || 0,
      source: 'local-valid',
      refreshed: false,
    };
  }

  const fetchHtml = options?.fetchHtml || fetchPublicHtml;
  const preferOfficial = (process.env.CATALOG_PRIMARY || 'kado').toLowerCase() === 'official';

  try {
    if (preferOfficial) return await syncFromOfficial(fetchHtml);
    return await syncFromKado(fetchHtml);
  } catch (primaryErr) {
    console.warn('Primary catalog source failed:', (primaryErr as Error).message);
    if (preferOfficial) return await syncFromKado(fetchHtml);
    return await syncFromOfficial(fetchHtml);
  }
}
