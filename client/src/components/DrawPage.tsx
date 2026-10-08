import { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { drawCards, PACK_CONFIGS, type PackConfig, type DrawResult } from '../game/DrawService';
import { type Rarity } from '../cardData';
import { findPtcgTemplate } from '../game/ptcgPool';
import type { ICardInstance } from '../db';
import { PackOpenAnimation, type DrawnCardInfo } from '../animations';
import { foilForCard } from '../game/foilMap';
import { cardImageAttrs } from '../game/cardImage';
import { localizedPack, useI18n } from '../i18n';
import '../card-effects.css';
import '../vendor/pokemon-cards-css/index.css';

const RARITY_STYLES: Record<Rarity, { text: string; label: string }> = {
  common:    { text: 'text-gray-300',   label: 'Common' },
  rare:      { text: 'text-blue-300',   label: 'Rare' },
  epic:      { text: 'text-purple-300', label: 'Epic' },
  legendary: { text: 'text-yellow-300', label: 'Legendary' },
  mythic:    { text: 'text-pink-300',   label: 'Mythic' },
};

function toInfo(card: ICardInstance): DrawnCardInfo {
  const template = findPtcgTemplate(card.cardId);
  return {
    icon: template?.icon ?? '🃏',
    name: template?.name ?? `#${card.cardId}`,
    rarity: card.rarity,
    imageUrl: template?.imageUrl,
  };
}

function CardResultItem({ card }: { card: ICardInstance }) {
  const template = findPtcgTemplate(card.cardId);
  const style = RARITY_STYLES[card.rarity];
  const foil = card.foil || foilForCard(undefined, card.rarity);
  return (
    <div className="card-container">
      <div className={`card drawn-card ptcg-card ptcg-card-sm ${card.rarity}`} data-rarity={foil}>
        <div className="card__shine" />
        <div className="card__glare" />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: 4, borderRadius: 10, overflow: 'hidden' }}>
          {template?.imageUrl ? (
            <img src={template.imageUrl} alt={template.name} {...cardImageAttrs('high')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, background: '#0e1830' }} />
          ) : null}
          <span className={`relative font-bold ${style.text}`} style={{ fontSize: 8, zIndex: 6, background: 'rgba(0,0,0,0.55)', padding: '1px 4px', borderRadius: 4 }}>{template?.name ?? `#${card.cardId}`}</span>
        </div>
      </div>
    </div>
  );
}

export function DrawPage() {
  const { player, activeEvents, addCards, setPlayer, incrementActionCount } = useGameStore();
  const { locale, t } = useI18n();
  const [selectedPack, setSelectedPack] = useState<PackConfig>(PACK_CONFIGS[0]!);
  const [lastResult, setLastResult] = useState<DrawResult | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showReveal, setShowReveal] = useState(false);

  const canAfford = useCallback(
    (count: number) => player.softCurrency >= selectedPack.cost * count,
    [player.softCurrency, selectedPack.cost]
  );

  const handleDraw = useCallback(async (packCount: number) => {
    if (!canAfford(packCount) || isDrawing) return;
    setIsDrawing(true);
    setShowReveal(false);
    const result = drawCards(selectedPack, packCount, player, activeEvents);
    setPlayer(result.updatedPlayer);
    await addCards(result.cards);
    incrementActionCount();
    const firstPack = result.packs[0]?.cards ?? result.cards.slice(0, 5);
    new PackOpenAnimation().play(selectedPack.icon, firstPack.map(toInfo), () => {
      setLastResult(result);
      setShowReveal(true);
      setIsDrawing(false);
    });
  }, [canAfford, isDrawing, selectedPack, player, activeEvents, setPlayer, addCards, incrementActionCount]);

  return (
    <div className="space-y-5">
      <h2 className="display text-2xl text-amber-50">{t('draw.title')}</h2>
      <p className="text-xs text-violet-200/70">{t('draw.subtitle')}</p>
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
        <div>
          <div className="mb-1 text-[11px] text-violet-200/70">{t('draw.balance')}</div>
          <div className="font-semibold text-amber-300">{player.softCurrency.toLocaleString()}</div>
        </div>
        <div>
          <div className="mb-1 text-[11px] text-violet-200/70">{t('draw.since')}</div>
          <div className="font-semibold text-amber-100">{player.drawsSinceLastLegendary}</div>
        </div>
        <div>
          <div className="mb-1 text-[11px] text-violet-200/70">{t('draw.pity')}</div>
          <div className="font-semibold text-pink-200">{t('draw.pityPacks', { n: selectedPack.pityLegendaryAt })}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {PACK_CONFIGS.map(pack => {
          const isSelected = selectedPack.id === pack.id;
          const label = localizedPack(locale, pack);
          return (
            <button key={pack.id} onClick={() => setSelectedPack(pack)} className={`rounded-2xl border p-4 text-left ${isSelected ? 'border-amber-200/70 bg-violet-900/50' : 'border-white/10 bg-white/5'}`}>
              <div className="mb-1 text-xl">{pack.icon}</div>
              <div className="text-sm font-semibold text-white">{label.name}</div>
              <div className="text-sm text-amber-300">{pack.cost}</div>
              <div className="mt-1 text-xs text-violet-200/70">{label.description}</div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button onClick={() => handleDraw(1)} disabled={!canAfford(1) || isDrawing} className="flex-1 rounded-2xl bg-violet-700 py-3 text-sm font-semibold text-white disabled:opacity-40">
          {isDrawing ? t('draw.opening') : t('draw.one', { cost: selectedPack.cost })}
        </button>
        <button onClick={() => handleDraw(10)} disabled={!canAfford(10) || isDrawing} className="flex-1 rounded-2xl bg-gradient-to-r from-violet-700 to-amber-700 py-3 text-sm font-semibold text-white disabled:opacity-40">
          {isDrawing ? t('draw.opening') : t('draw.ten', { cost: selectedPack.cost * 10 })}
        </button>
      </div>

      {showReveal && lastResult && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-semibold text-white">{t('draw.result', { packs: lastResult.packs.length, cards: lastResult.cards.length })}</h3>
          {lastResult.packs.map((pack, i) => (
            <div key={i} className="space-y-2">
              <div className="text-xs text-violet-200">{t('draw.hit', { n: i + 1, kind: pack.hitKind.toUpperCase(), rarity: t(`rarity.${pack.hitRarity}`) })}</div>
              <div className="flex flex-wrap gap-3">
                {pack.cards.map((card, j) => <CardResultItem key={j} card={card} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
