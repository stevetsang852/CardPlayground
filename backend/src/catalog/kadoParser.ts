export interface ParsedPack {
  id: string;
  name: string;
  sourceUrl: string;
  cardCount?: number;
  locale?: string;
}

export interface ParsedCard {
  id: string;
  name: string;
  number?: string;
  sourceUrl: string;
  packId: string;
  imageUrl?: string;
}

const BASE = 'https://www.kado.hk';

export function absoluteUrl(href: string): string {
  if (href.startsWith('http')) return href;
  return `${BASE}${href.startsWith('/') ? href : `/${href}`}`;
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function parsePackIndex(html: string, locale = 'mixed'): ParsedPack[] {
  const packs = new Map<string, ParsedPack>();
  const linkRe = /\[([^\]]+)\]\((\/(?:set|database\/tw|database\/cn)\/[^)]+)\)[^\d]{0,16}(\d+)\s*(?:張|cards)?/gi;
  const hrefRe = /href="(\/(?:set|database\/tw|database\/cn)\/[^"]+)"[^>]*>([^<]+)<\/a>[^\d]{0,24}(\d+)\s*(?:張|cards)?/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRe.exec(html)) !== null) {
    const sourceUrl = absoluteUrl(match[2]);
    packs.set(sourceUrl, {
      id: match[2].replace(/^\//, '').replace(/\//g, '_'),
      name: decodeHtml(match[1]),
      sourceUrl,
      cardCount: Number(match[3]),
      locale,
    });
  }
  while ((match = hrefRe.exec(html)) !== null) {
    const sourceUrl = absoluteUrl(match[1]);
    packs.set(sourceUrl, {
      id: match[1].replace(/^\//, '').replace(/\//g, '_'),
      name: decodeHtml(match[2]),
      sourceUrl,
      cardCount: Number(match[3]),
      locale,
    });
  }
  return [...packs.values()];
}

export function extractCardImageUrl(html: string): string | undefined {
  const og = html.match(/property="og:image" content="([^"]+)"/);
  if (og && /card-images\/|images\.pokemontcg\.io/.test(og[1])) return og[1];
  const scan = html.match(/https:\/\/[^"'\s]+card-images\/[^"'\s]+\.png/);
  return scan?.[0];
}

/** Live KADO TW set pages: `<a href="/card/tw/uuid">001 <!-- -->蛋蛋</a>`. */
export function parseTwSetList(html: string, packId = 'kado-m6a'): ParsedCard[] {
  const cards: ParsedCard[] = [];
  const seen = new Set<string>();
  const re = /href="(\/card\/tw\/[a-f0-9-]+)"[^>]*>(\d{3}|[A-Z]{3})(?:\s|<!--\s*-->)*([^<]+)<\/a>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const href = match[1];
    if (seen.has(href)) continue;
    seen.add(href);
    cards.push({
      id: `tw_${href.split('/').pop()}`,
      name: decodeHtml(match[3]),
      number: match[2],
      sourceUrl: absoluteUrl(href),
      packId,
    });
  }
  return cards;
}

export function parseSetCards(html: string, packId: string, _packUrl: string): ParsedCard[] {
  const cards: ParsedCard[] = [];
  const seen = new Set<string>();
  const imageUrl = extractCardImageUrl(html);

  const push = (href: string, name: string, number?: string) => {
    const sourceUrl = absoluteUrl(href);
    if (seen.has(sourceUrl)) return;
    seen.add(sourceUrl);
    cards.push({
      id: href.replace(/^\/card\//, '').replace(/\//g, '_'),
      name: decodeHtml(name),
      number,
      sourceUrl,
      packId,
      imageUrl,
    });
  };

  let match: RegExpExecArray | null;
  const numbered = /\[(\d{3}|[A-Z]{3})\s+([^\]]+)\]\((\/card\/[^)]+)\)/g;
  while ((match = numbered.exec(html)) !== null) {
    push(match[3], match[2], match[1]);
  }

  const bullet = /\[([^\]]+)\]\((\/card\/[^)]+)\)\s*·\s*(\d{3}|[A-Z]{3})/g;
  while ((match = bullet.exec(html)) !== null) {
    push(match[2], match[1], match[3]);
  }

  const hrefRe = /href="(\/card\/[^"?]+)"[^>]*>([^<]+)<\/a>/g;
  while ((match = hrefRe.exec(html)) !== null) {
    const label = decodeHtml(match[2].replace(/<!--\s*-->/g, ' ').replace(/\s+/g, ' '));
    const num = label.match(/^(\d{3}|[A-Z]{3})\s+(.+)$/);
    push(match[1], num ? num[2] : label, num ? num[1] : undefined);
  }

  if (cards.length === 0) return parseTwSetList(html, packId);
  return cards;
}
