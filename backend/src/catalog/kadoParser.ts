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
}

const BASE = 'https://www.kado.hk';

export function absoluteUrl(href: string): string {
  if (href.startsWith('http')) return href;
  return `${BASE}${href.startsWith('/') ? href : `/${href}`}`;
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
      name: match[1].trim(),
      sourceUrl,
      cardCount: Number(match[3]),
      locale,
    });
  }
  while ((match = hrefRe.exec(html)) !== null) {
    const sourceUrl = absoluteUrl(match[1]);
    packs.set(sourceUrl, {
      id: match[1].replace(/^\//, '').replace(/\//g, '_'),
      name: match[2].trim(),
      sourceUrl,
      cardCount: Number(match[3]),
      locale,
    });
  }
  return [...packs.values()];
}

export function parseSetCards(html: string, packId: string, _packUrl: string): ParsedCard[] {
  const cards: ParsedCard[] = [];
  const seen = new Set<string>();

  const push = (href: string, name: string, number?: string) => {
    const sourceUrl = absoluteUrl(href);
    if (seen.has(sourceUrl)) return;
    seen.add(sourceUrl);
    cards.push({
      id: href.replace(/^\/card\//, '').replace(/\//g, '_'),
      name: name.trim(),
      number,
      sourceUrl,
      packId,
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

  const hrefRe = /href="(\/card\/[^"\?]+)"[^>]*>([^<]+)<\/a>/g;
  while ((match = hrefRe.exec(html)) !== null) {
    const label = match[2].trim();
    const num = label.match(/^(\d{3}|[A-Z]{3})\s+(.+)$/);
    push(match[1], num ? num[2] : label, num ? num[1] : undefined);
  }

  return cards;
}
