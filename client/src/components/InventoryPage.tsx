import { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { CARD_TEMPLATES } from '../cardData';
import type { Rarity } from '../cardData';
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

const RARITY_BG: Record<Rarity, string> = {
  common:    'bg-gray-800',
  rare:      'bg-blue-950',
  epic:      'bg-purple-950',
  legendary: 'bg-yellow-950',
  mythic:    'bg-[#1a0020]',
};

interface CardFaceProps {
  icon: string;
  name: string;
  rarity: Rarity;
  extraClass?: string;
  count?: number;
  onClick?: () => void;
}

function CardFace({ icon, name, rarity, extraClass = '', count, onClick }: CardFaceProps) {
  return (
    <div className="card-container relative" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className={`inv-card ${rarity} ${RARITY_BG[rarity]} ${extraClass} w-24 h-32 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 select-none`}>
        <span className="text-4xl leading-none pointer-events-none">{icon}</span>
        <span className="text-[9px] font-medium text-center leading-tight line-clamp-2 text-gray-200 pointer-events-none">{name}</span>
        <span className={`text-[8px] px-1.5 py-0.5 rounded-full capitalize font-semibold pointer-events-none ${RARITY_BADGE[rarity]}`}>{rarity}</span>
      </div>
      {count !== undefined && count > 1 && (
        <span className="absolute top-1 right-1 text-[9px] bg-black/70 text-white rounded-full px-1 leading-4 z-10 pointer-events-none">x{count}</span>
      )}
    </div>
  );
}

interface CardDetailProps {
  cardId: number;
  instances: ICardInstance[];
  onClose: () => void;
}

function CardDetail({ cardId, instances, onClose }: CardDetailProps) {
  const template = CARD_TEMPLATES.find((t) => t.id === cardId)!;
  const owned = instances.length;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="relative flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-8 right-0 text-gray-400 hover:text-white text-2xl leading-none z-10">✕</button>
        <div className="card-container">
          <div className={`detail-card ${template.rarity} ${RARITY_BG[template.rarity]} w-48 h-64 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 select-none`}>
            <span className="text-7xl leading-none pointer-events-none">{template.icon}</span>
            <span className="text-sm font-bold text-gray-100 text-center pointer-events-none">{template.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-semibold pointer-events-none ${RARITY_BADGE[template.rarity]}`}>{template.rarity}</span>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 max-w-xs w-full text-gray-100">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>#{template.id} · {template.series}</span>
            <span className={owned > 0 ? 'text-green-400 font-semibold' : 'text-gray-600'}>
              {owned > 0 ? `Owned x${owned}` : 'Not obtained'}
            </span>
          </div>
          {template.story && <p className="text-sm text-gray-300 italic leading-relaxed">"{template.story}"</p>}
        </div>
      </div>
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

  const inventoryCards = useMemo(() => {
    const ownedIds = Array.from(instancesByCardId.keys());
    let templates = CARD_TEMPLATES.filter((t) => ownedIds.includes(t.id));
    if (filterRarity !== 'all') templates = templates.filter((t) => t.rarity === filterRarity);
    if (search.trim()) {
      const q = search.toLowerCase();
      templates = templates.filter((t) => t.name.toLowerCase().includes(q) || t.series.toLowerCase().includes(q));
    }
    return [...templates].sort((a, b) => {
      if (sortKey === 'rarity') return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      const aTime = Math.max(...(instancesByCardId.get(a.id) ?? []).map((c) => c.obtainedAt));
      const bTime = Math.max(...(instancesByCardId.get(b.id) ?? []).map((c) => c.obtainedAt));
      return bTime - aTime;
    });
  }, [cards, instancesByCardId, filterRarity, search, sortKey]);

  const catalogCards = useMemo(() => {
    let templates = [...CARD_TEMPLATES];
    if (filterRarity !== 'all') templates = templates.filter((t) => t.rarity === filterRarity);
    if (search.trim()) {
      const q = search.toLowerCase();
      templates = templates.filter((t) => t.name.toLowerCase().includes(q) || t.series.toLowerCase().includes(q));
    }
    if (sortKey === 'rarity') templates.sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]);
    else if (sortKey === 'name') templates.sort((a, b) => a.name.localeCompare(b.name));
    return templates;
  }, [filterRarity, search, sortKey]);

  const totalOwned = instancesByCardId.size;
  const totalCards = CARD_TEMPLATES.length;
  const detailInstances = detailCardId !== null ? (instancesByCardId.get(detailCardId) ?? []) : [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-8">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-bold text-game-accent mb-1">Collection</h1>
        <p className="text-sm text-gray-400">{totalOwned} / {totalCards} unique cards collected</p>
      </div>

      <div className="flex border-b border-gray-800 px-4 mb-4">
        {(['inventory', 'catalog'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-game-accent text-game-accent' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'inventory' ? `Inventory (${totalOwned})` : `Catalog (${totalCards})`}
          </button>
        ))}
      </div>

      <div className="px-4 flex flex-wrap gap-2 mb-4">
        <input
          type="text" placeholder="Search..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 w-36"
        />
        <select
          value={filterRarity}
          onChange={(e) => setFilterRarity(e.target.value as Rarity | 'all')}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
        >
          <option value="all">All rarities</option>
          {(['common', 'rare', 'epic', 'legendary', 'mythic'] as Rarity[]).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
        >
          <option value="obtained">Recent</option>
          <option value="rarity">Rarity</option>
          <option value="name">Name</option>
        </select>
      </div>

      <div className="px-4">
        {tab === 'inventory' && (
          inventoryCards.length === 0 ? (
            <p className="text-gray-600 text-center py-16">
              {cards.length === 0 ? 'No cards yet — draw some packs first!' : 'No cards match your filters.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {inventoryCards.map((template) => (
                <CardFace
                  key={template.id}
                  icon={template.icon}
                  name={template.name}
                  rarity={template.rarity}
                  count={instancesByCardId.get(template.id)?.length}
                  onClick={() => setDetailCardId(template.id)}
                />
              ))}
            </div>
          )
        )}

        {tab === 'catalog' && (
          <div className="flex flex-wrap gap-3">
            {catalogCards.map((template) => {
              const owned = (instancesByCardId.get(template.id)?.length ?? 0) > 0;
              return owned ? (
                <CardFace
                  key={template.id}
                  icon={template.icon}
                  name={template.name}
                  rarity={template.rarity}
                  extraClass="cat-card owned"
                  onClick={() => setDetailCardId(template.id)}
                />
              ) : (
                <div
                  key={template.id}
                  className="w-24 h-32 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 border-gray-800 bg-gray-900 opacity-30 grayscale select-none cursor-pointer"
                  onClick={() => setDetailCardId(template.id)}
                >
                  <span className="text-4xl leading-none">?</span>
                  <span className="text-[9px] text-gray-600 text-center">???</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {detailCardId !== null && (
        <CardDetail cardId={detailCardId} instances={detailInstances} onClose={() => setDetailCardId(null)} />
      )}
    </div>
  );
}
