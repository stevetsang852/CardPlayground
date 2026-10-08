import { useMemo, useState } from 'react';
import type { Rarity } from '../cardData';
import type { PackConfig } from '../game/DrawService';
import {
  RARITIES,
  readCatalog,
  resetCatalog,
  saveCatalog,
  type CatalogCard,
  type CatalogSnapshot,
} from '../game/adminCatalog';
import { useI18n } from '../i18n';
import { cardImageAttrs } from '../game/cardImage';

type Tab = 'cards' | 'packs';

const field = 'w-full rounded-lg border border-game-border bg-black/30 px-3 py-2 text-sm text-white';

function blankCard(cards: CatalogCard[]): CatalogCard {
  const nextId = cards.reduce((max, card) => Math.max(max, card.id), 1000) + 1;
  return { id: nextId, name: '', rarity: 'common', dex: 0, imageUrl: '', series: 'M6a 30th CELEBRATION' };
}

function blankPack(packs: PackConfig[]): PackConfig {
  return {
    id: `pack-${packs.length + 1}`,
    name: '',
    icon: '🃏',
    cost: 100,
    description: '',
    cardsPerPack: 5,
    pityLegendaryAt: 150,
    model: 'jp-sv-5',
  };
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('cards');
  const [catalog, setCatalog] = useState<CatalogSnapshot>(() => readCatalog());
  const [query, setQuery] = useState('');
  const [cardDraft, setCardDraft] = useState<CatalogCard | null>(null);
  const [cardOriginId, setCardOriginId] = useState<number | null>(null);
  const [packDraft, setPackDraft] = useState<PackConfig | null>(null);
  const [packOriginId, setPackOriginId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const { t } = useI18n();

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog.cards;
    return catalog.cards.filter((card) =>
      `${card.id} ${card.name} ${card.rarity} ${card.series}`.toLowerCase().includes(q),
    );
  }, [catalog.cards, query]);

  function commit(next: CatalogSnapshot) {
    saveCatalog(next);
    setCatalog(readCatalog());
    setNotice(t('admin.saved'));
  }

  function openCard(card: CatalogCard | null) {
    setNotice('');
    setCardOriginId(card?.id ?? null);
    setCardDraft(card ? { ...card } : blankCard(catalog.cards));
  }

  function saveCard() {
    if (!cardDraft) return;
    const name = cardDraft.name.trim();
    const imageUrl = cardDraft.imageUrl.trim();
    if (!Number.isInteger(cardDraft.id) || cardDraft.id <= 0 || !name || !imageUrl) {
      setNotice(t('admin.cardInvalid'));
      return;
    }
    const taken = catalog.cards.some((card) => card.id === cardDraft.id && card.id !== cardOriginId);
    if (taken) {
      setNotice(t('admin.cardTaken', { id: cardDraft.id }));
      return;
    }
    const row: CatalogCard = {
      ...cardDraft,
      name,
      imageUrl,
      dex: Number.isFinite(cardDraft.dex) ? cardDraft.dex : 0,
      series: cardDraft.series.trim() || 'M6a 30th CELEBRATION',
    };
    const next = catalog.cards.filter((card) => card.id !== cardOriginId && card.id !== row.id);
    next.push(row);
    next.sort((a, b) => a.id - b.id);
    commit({ ...catalog, cards: next });
    setCardDraft(null);
    setCardOriginId(null);
  }

  function deleteCard(id: number) {
    commit({ ...catalog, cards: catalog.cards.filter((card) => card.id !== id) });
    if (cardOriginId === id) {
      setCardDraft(null);
      setCardOriginId(null);
    }
  }

  function openPack(pack: PackConfig | null) {
    setNotice('');
    setPackOriginId(pack?.id ?? null);
    setPackDraft(pack ? { ...pack } : blankPack(catalog.packs));
  }

  function savePack() {
    if (!packDraft) return;
    const id = packDraft.id.trim();
    const name = packDraft.name.trim();
    if (!id || !name || packDraft.cost < 0 || packDraft.cardsPerPack < 1) {
      setNotice(t('admin.packInvalid'));
      return;
    }
    const taken = catalog.packs.some((pack) => pack.id === id && pack.id !== packOriginId);
    if (taken) {
      setNotice(t('admin.packTaken', { id }));
      return;
    }
    const row: PackConfig = { ...packDraft, id, name, description: packDraft.description.trim(), model: 'jp-sv-5' };
    const next = catalog.packs.filter((pack) => pack.id !== packOriginId && pack.id !== row.id);
    next.push(row);
    commit({ ...catalog, packs: next });
    setPackDraft(null);
    setPackOriginId(null);
  }

  function deletePack(id: string) {
    if (catalog.packs.length <= 1) {
      setNotice(t('admin.keepPack'));
      return;
    }
    commit({ ...catalog, packs: catalog.packs.filter((pack) => pack.id !== id) });
    if (packOriginId === id) {
      setPackDraft(null);
      setPackOriginId(null);
    }
  }

  function restore() {
    resetCatalog();
    setCatalog(readCatalog());
    setCardDraft(null);
    setPackDraft(null);
    setNotice(t('admin.restored'));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-2xl text-amber-50">{t('admin.title')}</h2>
          <p className="text-xs text-violet-200/70">{t('admin.hint')}</p>
        </div>
        <button type="button" onClick={restore} className="rounded-full border border-white/15 px-3 py-2 text-sm text-violet-100">
          {t('admin.restore')}
        </button>
      </div>

      <div className="flex gap-2">
        {(['cards', 'packs'] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === item ? 'bg-purple-700 text-white' : 'bg-game-surface text-purple-200 border border-game-border'}`}
          >
            {item === 'cards' ? t('admin.cards', { n: catalog.cards.length }) : t('admin.packs', { n: catalog.packs.length })}
          </button>
        ))}
      </div>

      {notice && <p className="text-sm text-yellow-300">{notice}</p>}

      {tab === 'cards' && (
        <section className="space-y-3">
          <div className="flex gap-2">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('admin.search')} className={field} />
            <button type="button" onClick={() => openCard(null)} className="shrink-0 rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white">
              {t('admin.addCard')}
            </button>
          </div>

          {cardDraft && (
            <form
              className="grid gap-2 rounded-xl border border-game-border bg-game-surface p-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveCard();
              }}
            >
              <label className="text-xs text-purple-300">{t('admin.id')}
                <input type="number" value={cardDraft.id} onChange={(event) => setCardDraft({ ...cardDraft, id: Number(event.target.value) })} className={field} />
              </label>
              <label className="text-xs text-purple-300">{t('admin.name')}
                <input value={cardDraft.name} onChange={(event) => setCardDraft({ ...cardDraft, name: event.target.value })} className={field} />
              </label>
              <label className="text-xs text-purple-300">{t('admin.rarity')}
                <select value={cardDraft.rarity} onChange={(event) => setCardDraft({ ...cardDraft, rarity: event.target.value as Rarity })} className={field}>
                  {RARITIES.map((rarity) => <option key={rarity} value={rarity}>{t(`rarity.${rarity}`)}</option>)}
                </select>
              </label>
              <label className="text-xs text-purple-300">{t('admin.dex')}
                <input type="number" value={cardDraft.dex} onChange={(event) => setCardDraft({ ...cardDraft, dex: Number(event.target.value) })} className={field} />
              </label>
              <label className="text-xs text-purple-300 sm:col-span-2">{t('admin.image')}
                <input value={cardDraft.imageUrl} onChange={(event) => setCardDraft({ ...cardDraft, imageUrl: event.target.value })} className={field} />
              </label>
              <label className="text-xs text-purple-300 sm:col-span-2">{t('admin.series')}
                <input value={cardDraft.series} onChange={(event) => setCardDraft({ ...cardDraft, series: event.target.value })} className={field} />
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white">{t('admin.saveCard')}</button>
                <button type="button" onClick={() => setCardDraft(null)} className="rounded-lg border border-game-border px-4 py-2 text-sm text-purple-200">{t('admin.cancel')}</button>
              </div>
            </form>
          )}

          <ul className="space-y-2">
            {cards.map((card) => (
              <li key={card.id} className="flex items-center gap-3 rounded-xl border border-game-border bg-game-surface p-2">
                <img src={card.imageUrl} alt="" {...cardImageAttrs()} className="h-16 w-12 rounded object-cover bg-black/40" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{card.name}</p>
                  <p className="text-xs text-purple-300">{t('admin.meta', { id: card.id, rarity: t(`rarity.${card.rarity}`), dex: card.dex })}</p>
                </div>
                <button type="button" onClick={() => openCard(card)} className="text-sm text-game-accent">{t('admin.edit')}</button>
                <button type="button" onClick={() => deleteCard(card.id)} className="text-sm text-pink-300">{t('admin.delete')}</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'packs' && (
        <section className="space-y-3">
          <button type="button" onClick={() => openPack(null)} className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white">
            {t('admin.addPack')}
          </button>
          {packDraft && (
            <form
              className="grid gap-2 rounded-xl border border-game-border bg-game-surface p-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                savePack();
              }}
            >
              <label className="text-xs text-purple-300">{t('admin.id')}
                <input value={packDraft.id} onChange={(event) => setPackDraft({ ...packDraft, id: event.target.value })} className={field} />
              </label>
              <label className="text-xs text-purple-300">{t('admin.name')}
                <input value={packDraft.name} onChange={(event) => setPackDraft({ ...packDraft, name: event.target.value })} className={field} />
              </label>
              <label className="text-xs text-purple-300">{t('admin.icon')}
                <input value={packDraft.icon} onChange={(event) => setPackDraft({ ...packDraft, icon: event.target.value })} className={field} />
              </label>
              <label className="text-xs text-purple-300">{t('admin.cost')}
                <input type="number" value={packDraft.cost} onChange={(event) => setPackDraft({ ...packDraft, cost: Number(event.target.value) })} className={field} />
              </label>
              <label className="text-xs text-purple-300">{t('admin.perPack')}
                <input type="number" value={packDraft.cardsPerPack} onChange={(event) => setPackDraft({ ...packDraft, cardsPerPack: Number(event.target.value) })} className={field} />
              </label>
              <label className="text-xs text-purple-300">{t('admin.pity')}
                <input type="number" value={packDraft.pityLegendaryAt} onChange={(event) => setPackDraft({ ...packDraft, pityLegendaryAt: Number(event.target.value) })} className={field} />
              </label>
              <label className="text-xs text-purple-300 sm:col-span-2">{t('admin.description')}
                <input value={packDraft.description} onChange={(event) => setPackDraft({ ...packDraft, description: event.target.value })} className={field} />
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white">{t('admin.savePack')}</button>
                <button type="button" onClick={() => setPackDraft(null)} className="rounded-lg border border-game-border px-4 py-2 text-sm text-purple-200">{t('admin.cancel')}</button>
              </div>
            </form>
          )}
          <ul className="space-y-2">
            {catalog.packs.map((pack) => (
              <li key={pack.id} className="flex items-center gap-3 rounded-xl border border-game-border bg-game-surface p-3">
                <span className="text-2xl">{pack.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{pack.name}</p>
                  <p className="text-xs text-purple-300">{t('admin.packMeta', { cost: pack.cost, count: pack.cardsPerPack, pity: pack.pityLegendaryAt })}</p>
                </div>
                <button type="button" onClick={() => openPack(pack)} className="text-sm text-game-accent">{t('admin.edit')}</button>
                <button type="button" onClick={() => deletePack(pack.id)} className="text-sm text-pink-300">{t('admin.delete')}</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
