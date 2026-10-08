import { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Rarity } from '../cardData';
import { PTCG_TEMPLATES, findPtcgTemplate } from '../game/ptcgPool';
import type { ICardInstance } from '../db/CardGameDB';
import { foilForCard, gradeForFoil, GRADE_RANK } from '../game/foilMap';

type Tab = 'inventory' | 'catalog';
type SortKey = 'obtained' | 'rarity' | 'name';

const RARITY_ORDER: Record<Rarity, number> = {
  common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4,
};

const RARITY_BADGE: Record<Rarity, string> = {
  common:    'bg-gray-700 text-gray-300',
  rare:      'bg-blue-800 text-blue-200',
  epic:      'bg-purple-800 text-purple-200',
  legendary: 'bg-yellow-800 text-yellow-200',
  mythic:    'bg-pink-800 text-pink-200',
};

function bestFoil(instances: ICardInstance[] | undefined, rarity: Rarity): string {
  if (!instances?.length) return foilForCard(undefined, rarity);
  return instances.reduce((best, card) => {
    const foil = card.foil || foilForCard(undefined, card.rarity);
    return (GRADE_RANK[gradeForFoil(foil)] ?? 0) > (GRADE_RANK[gradeForFoil(best)] ?? 0) ? foil : best;
  }, instances[0]?.foil || foilForCard(undefined, rarity));
}

function CardFace({ cardId, rarity, foil, extraClass = '', count, onClick }: { cardId: number; rarity: Rarity; foil: string; extraClass?: string; count?: number; onClick?: () => void }) {
  const template = findPtcgTemplate(cardId) || PTCG_TEMPLATES[0]!;
  const grade = gradeForFoil(foil);
  return (
    <div className="card-container relative" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className={`card inv-card ${rarity} ${extraClass} w-24 h-32 rounded-xl border-2 overflow-hidden bg-[#0e1830]`} data-rarity={foil} data-grade={grade}>
        <div className="card__shine" />
        <div className="card__glare" />
        <img src={template.imageUrl} alt={template.name} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 1 }} />
        <span className={`absolute bottom-1 left-1 text-[8px] px-1 rounded-full capitalize ${RARITY_BADGE[rarity]}`} style={{ zIndex: 6 }}>{template.name}</span>
      </div>
      {count !== undefined && count > 1 && (
        <span className="absolute top-1 right-1 text-[9px] bg-black/70 text-white rounded-full px-1 leading-4 z-10">x{count}</span>
      )}
    </div>
  );
}

export function InventoryPage() {
  const cards = useGameStore((s) => s.cards);
  const [tab, setTab] = useState<Tab>('inventory');
  const [sortKey, setSortKey] = useState<SortKey>('obtained');
  const [filterRarity, setFilterRarity] = useState<Rarity | 'all'>('all');
  const [search, setSearch] = useState('');
  const [detailCardId, setDetailCardId] = useState<number | null>(null);

  const instancesByCardId = useMemo(() => {
    const map = new Map<number, ICardInstance[]>();
    for (const c of cards) {
      const arr = map.get(c.cardId) ?? [];
      arr.push(c);
      map.set(c.cardId, arr);
    }
    return map;
  }, [cards]);

  const filtered = useMemo(() => {
    let templates = [...PTCG_TEMPLATES];
    if (filterRarity !== 'all') templates = templates.filter((t) => t.rarity === filterRarity);
    if (search.trim()) {
      const q = search.toLowerCase();
      templates = templates.filter((t) => t.name.toLowerCase().includes(q));
    }
    return templates;
  }, [filterRarity, search]);

  const inventoryCards = useMemo(() => {
    const owned = filtered.filter((t) => instancesByCardId.has(t.id));
    return [...owned].sort((a, b) => {
      if (sortKey === 'rarity') return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      const aTime = Math.max(...(instancesByCardId.get(a.id) ?? []).map((c) => c.obtainedAt));
      const bTime = Math.max(...(instancesByCardId.get(b.id) ?? []).map((c) => c.obtainedAt));
      return bTime - aTime;
    });
  }, [filtered, instancesByCardId, sortKey]);

  const detail = detailCardId !== null ? findPtcgTemplate(detailCardId) : undefined;
  const detailFoil = detail ? bestFoil(instancesByCardId.get(detail.id), detail.rarity) : 'common';

  return (
    <div className="pb-4 text-atelier-text">
      <div className="pb-3">
        <p className="text-[11px] uppercase tracking-[0.28em] text-atelier-muted">Binder</p>
        <h1 className="text-2xl font-semibold text-white">Collection</h1>
        <p className="text-sm text-atelier-muted">{instancesByCardId.size} / {PTCG_TEMPLATES.length} owned</p>
      </div>
      <div className="flex border-b border-white/10 mb-4">
        {(['inventory', 'catalog'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`min-h-11 px-5 text-sm font-semibold capitalize border-b-2 -mb-px ${
            tab === t ? 'border-atelier-warm text-atelier-warm' : 'border-transparent text-atelier-muted'
          }`}>{t}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input type="search" placeholder="Search the binder" value={search} onChange={(e) => setSearch(e.target.value)} className="glass min-h-11 rounded-xl px-3 text-sm text-white" />
        <select value={filterRarity} onChange={(e) => setFilterRarity(e.target.value as Rarity | 'all')} className="glass min-h-11 rounded-xl px-3 text-sm">
          <option value="all">All rarities</option>
          {(['common', 'rare', 'epic', 'legendary'] as Rarity[]).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="glass min-h-11 rounded-xl px-3 text-sm">
          <option value="obtained">Recent</option>
          <option value="rarity">Rarity</option>
          <option value="name">Name</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        {(tab === 'inventory' ? inventoryCards : filtered).length === 0 && (
          <div className="glass w-full rounded-2xl p-6 text-center">
            <p className="text-white">The binder is still quiet.</p>
            <p className="mt-1 text-sm text-atelier-muted">Open a pack and the first five cards will land here.</p>
          </div>
        )}
        {(tab === 'inventory' ? inventoryCards : filtered).map((template) => (
          <CardFace
            key={template.id}
            cardId={template.id}
            rarity={template.rarity}
            foil={bestFoil(instancesByCardId.get(template.id), template.rarity)}
            count={instancesByCardId.get(template.id)?.length}
            onClick={() => setDetailCardId(template.id)}
            extraClass={instancesByCardId.has(template.id) ? '' : 'opacity-30'}
          />
        ))}
      </div>
      {detail && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setDetailCardId(null)}>
          <div className="glass max-w-xs rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="card detail-card relative mx-auto overflow-hidden rounded-xl border-2" data-rarity={detailFoil} data-grade={gradeForFoil(detailFoil)}>
              <div className="card__shine" />
              <div className="card__glare" />
              <img src={detail.imageUrl} alt={detail.name} className="w-full h-full object-contain" style={{ position: 'relative', zIndex: 1 }} />
            </div>
            <div className="text-center mt-2 font-bold">{detail.name}</div>
            <div className="text-center text-xs text-atelier-muted">{detail.series} #{detail.id} · {gradeForFoil(detailFoil)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
