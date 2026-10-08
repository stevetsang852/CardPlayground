import { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { drawCards, PACK_CONFIGS, type PackConfig, type DrawResult } from '../game/DrawService';
import { type Rarity } from '../cardData';
import { findPtcgTemplate } from '../game/ptcgPool';
import type { ICardInstance } from '../db';
import { PackOpenAnimation, type DrawnCardInfo } from '../animations';
import { foilForCard } from '../game/foilMap';

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
    icon: template?.icon ?? template?.name ?? 'card',
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
            <img src={template.imageUrl} alt={template.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, background: '#0e1830' }} />
          ) : null}
          <span className={`relative font-bold ${style.text}`} style={{ fontSize: 8, zIndex: 6, background: 'rgba(0,0,0,0.55)', padding: '1px 4px', borderRadius: 4 }}>{template?.name ?? `#${card.cardId}`}</span>
        </div>
      </div>
    </div>
  );
}

export function DrawPage() {
  const { player, activeEvents, addCards, setPlayer, incrementActionCount } = useGameStore();
  const [selectedPack, setSelectedPack] = useState<PackConfig>(PACK_CONFIGS[0]!);
  const [lastResult, setLastResult] = useState<DrawResult | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [skipMotion, setSkipMotion] = useState(() => localStorage.getItem('cardplayground.skipReveal') === '1');

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
    const finish = () => {
      setLastResult(result);
      setShowReveal(true);
      setIsDrawing(false);
    };
    const reduced = skipMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      finish();
      return;
    }
    new PackOpenAnimation().play(selectedPack.icon, firstPack.map(toInfo), finish);
  }, [canAfford, isDrawing, selectedPack, player, activeEvents, setPlayer, addCards, incrementActionCount, skipMotion]);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] uppercase tracking-[0.28em] text-atelier-muted">Pack opening stage</p>
        <h2 className="text-2xl font-semibold text-white">Five cards. One hit.</h2>
      </header>
      <div className="glass grid grid-cols-3 gap-3 rounded-2xl p-4 text-center">
        <div>
          <div className="text-[11px] text-atelier-muted">Purse</div>
          <div className="font-semibold text-atelier-warm">{player.softCurrency.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[11px] text-atelier-muted">Since SAR/UR</div>
          <div className="font-semibold text-white">{player.drawsSinceLastLegendary}</div>
        </div>
        <div>
          <div className="text-[11px] text-atelier-muted">Pity</div>
          <div className="font-semibold text-white">{selectedPack.pityLegendaryAt}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PACK_CONFIGS.map((pack, index) => {
          const isSelected = selectedPack.id === pack.id;
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => setSelectedPack(pack)}
              className={`pack-float glass min-h-11 rounded-2xl p-4 text-left ${isSelected ? 'ring-2 ring-atelier-warm' : ''}`}
              style={{ animationDelay: `${index * 0.35}s` }}
            >
              <div className="text-2xl">{pack.icon}</div>
              <div className="mt-2 font-semibold text-white">{pack.name}</div>
              <div className="text-sm text-atelier-warm">{pack.cost}</div>
              <div className="mt-1 text-xs text-atelier-muted">{pack.description}</div>
            </button>
          );
        })}
      </div>

      <label className="flex min-h-11 items-center gap-2 text-sm text-atelier-muted">
        <input
          type="checkbox"
          checked={skipMotion}
          onChange={(e) => {
            setSkipMotion(e.target.checked);
            localStorage.setItem('cardplayground.skipReveal', e.target.checked ? '1' : '0');
          }}
        />
        Skip animation
      </label>

      <div className="flex gap-3">
        <button type="button" onClick={() => handleDraw(1)} disabled={!canAfford(1) || isDrawing} className="glow-press min-h-12 flex-1 rounded-2xl bg-white/10 font-semibold text-white">
          {isDrawing ? 'Opening\u2026' : `Open 1 \u00b7 ${selectedPack.cost}`}
        </button>
        <button type="button" onClick={() => handleDraw(10)} disabled={!canAfford(10) || isDrawing} className="glow-press min-h-12 flex-1 rounded-2xl bg-atelier-warm font-semibold text-black">
          {isDrawing ? 'Opening\u2026' : `Open 10 \u00b7 ${selectedPack.cost * 10}`}
        </button>
      </div>

      {showReveal && lastResult && (
        <div className="glass space-y-4 rounded-2xl p-4">
          <h3 className="font-semibold text-white">{lastResult.packs.length} pack(s) \u00b7 {lastResult.cards.length} cards</h3>
          {lastResult.packs.map((pack, i) => (
            <div key={i} className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-atelier-warm">Pack {i + 1} \u00b7 {pack.hitKind} \u00b7 {pack.hitRarity}</div>
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
