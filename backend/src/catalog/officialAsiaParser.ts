export interface OfficialPack {
  id: string;
  code: string;
  name: string;
  sourceUrl: string;
}

export interface OfficialCard {
  id: string;
  name: string;
  sourceUrl: string;
  packId: string;
}

const BASE = 'https://asia.pokemon-card.com';

export function parseOfficialPackIndex(html: string): OfficialPack[] {
  const packs: OfficialPack[] = [];
  const seen = new Set<string>();
  const re = /\/hk\/card-search\/list\/\?expansionCodes=([A-Za-z0-9-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const code = match[1];
    if (seen.has(code)) continue;
    seen.add(code);
    const window = html.slice(Math.max(0, match.index - 80), match.index + 400);
    const nameMatch = window.match(/\u64f4\u5145\u5305[「\u300d\w\s「」・·・A-Za-z0-9\u4e00-\u9fff\u300c\u300d]+|\u6230\u8853\u724c\u7d44[「\u300d\w\s\u4e00-\u9fff]+|\u9ad8\u7d1a\u64f4\u5145\u5305[「\u300d\w\s\u4e00-\u9fff]+|[A-Za-z0-9][^\n]{0,40}/);
    const name = (nameMatch?.[0] || code).replace(/\s+/g, ' ').trim();
    packs.push({
      id: `official_${code}`,
      code,
      name,
      sourceUrl: `${BASE}/hk/card-search/list/?expansionCodes=${code}`,
    });
  }
  return packs;
}

export function parseOfficialCardList(html: string, packId: string): OfficialCard[] {
  const cards: OfficialCard[] = [];
  const seen = new Set<string>();
  const re = /\/hk\/card-search\/detail\/(\d+)\//g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const id = match[1];
    if (seen.has(id)) continue;
    seen.add(id);
    cards.push({
      id: `official_${id}`,
      name: `card-${id}`,
      sourceUrl: `${BASE}/hk/card-search/detail/${id}/`,
      packId,
    });
  }
  return cards;
}
