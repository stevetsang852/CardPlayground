import { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Rarity } from '../cardData';
import { PTCG_TEMPLATES, findPtcgTemplate } from '../game/ptcgPool';
import type { ICardInstance } from '../db/CardGameDB';

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

function CardFace({ cardId, rarity, extraClass = '', count, onClick }: { cardId: number; rarity: Rarity; extraClass?: string; count?: number; onClick?: () => void }) {
  const template = findPtcgTemplate(cardId) || PTCG_TEMPLATES[0]!;
  return (
    <div className="card-container relative" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className={`inv-card ${rarity} ${extraClass} w-24 h-32 rounded-xl border-2 overflow-hidden bg-[#0e1830]`}>
        <img src={template.imageUrl} alt={template.name} className="w-full h-full object-contain pointer-events-none" />
        <span className={`absolute bottom-1 left-1 text-[8px] px-1 rounded-full capitalize ${RARITY_BADGE[rarity]}`}>{template.name}</span>
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-8">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-bold text-game-accent mb-1">Collection</h1>
        <p className="text-sm text-gray-400">{instancesByCardId.size} / {PTCG_TEMPLATES.length} M6a Pokemon</p>
      </div>
      <div className="flex border-b border-gray-800 px-4 mb-4">
        {(['inventory', 'catalog'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 text-sm font-semibold capitalize border-b-2 -mb-px ${
            tab === t ? 'border-game-accent text-game-accent' : 'border-transparent text-gray-500'
          }`}>{t}</button>
        ))}
      </div>
      <div className="px-4 flex flex-wrap gap-2 mb-4">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm w-36" />
        <select value={filterRarity} onChange={(e) => setFilterRarity(e.target.value as Rarity | 'all')} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm">
          <option value="all">All rarities</option>
          {(['common', 'rare', 'epic', 'legendary'] as Rarity[]).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm">
          <option value="obtained">Recent</option>
          <option value="rarity">Rarity</option>
          <option value="name">Name</option>
        </select>
      </div>
      <div className="px-4 flex flex-wrap gap-3">
        {(tab === 'inventory' ? inventoryCards : filtered).map((template) => (
          <CardFace key={template.id} cardId={template.id} rarity={template.rarity} count={instancesByCardId.get(template.id)?.length} onClick={() => setDetailCardId(template.id)} extraClass={instancesByCardId.has(template.id) ? '' : 'opacity-30'} />
        ))}
      </div>
      {detail && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setDetailCardId(null)}>
          <div className="bg-gray-900 rounded-xl p-4 max-w-xs" onClick={(e) => e.stopPropagation()}>
            <img src={detail.imageUrl} alt={detail.name} className="w-48 h-48 object-contain mx-auto" />
            <div className="text-center mt-2 font-bold">{detail.name}</div>
            <div className="text-center text-xs text-gray-400">{detail.series} · #{detail.id}</div>
          </div>
        </div>
      )}
    </div>
  );
}
