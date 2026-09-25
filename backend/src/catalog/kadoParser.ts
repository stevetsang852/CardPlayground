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
  const linkRe = /\[([^\]]+)\]\((\/(?:set|database\/tw|database\/cn)\/[^)]+)\)[^\d]{0,12}(\d+)\s*(?:張|cards)?/gi;
  const hrefRe = /href="(\/(?:set|database\/tw|database\/cn)\/[^"]+)"[^>]*>([^<]+)<\/a>[^\d]{0,20}(\d+)\s*(?:張|cards)?/gi;
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
  let match: RegExpExecArray | null;
  const numbered = /\[(\d{3}|[A-Z]{3})\s+([^\]]+)\]\((\/card\/[^)]+)\)/g;
  while ((match = numbered.exec(html)) !== null) {
    const sourceUrl = absoluteUrl(match[3]);
    if (seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);
    cards.push({
      id: match[3].replace(/^\/card\//, ''),
      name: match[2].trim(),
      number: match[1],
      sourceUrl,
      packId,
    });
  }

  const hrefRe = /href="(\/card\/[^"\?]+)"[^>]*>([^<]+)<\/a>/g;
  while ((match = hrefRe.exec(html)) !== null) {
    const sourceUrl = absoluteUrl(match[1]);
    if (seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);
    const label = match[2].trim();
    const num = label.match(/^(\d{3}|[A-Z]{3})\s+(.+)$/);
    cards.push({
      id: match[1].replace(/^\/card\//, ''),
      name: num ? num[2] : label,
      number: num ? num[1] : undefined,
      sourceUrl,
      packId,
    });
  }

  return cards;
}
