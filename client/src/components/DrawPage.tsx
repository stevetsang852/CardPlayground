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
  return { icon: template?.name ?? '🃏', name: template?.name ?? `#${card.cardId}`, rarity: card.rarity };
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
            <img src={template.imageUrl} alt={template.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#0e1830' }} />
          ) : null}
          <span className={`relative font-bold ${style.text}`} style={{ fontSize: 8, background: 'rgba(0,0,0,0.55)', padding: '1px 4px', borderRadius: 4 }}>{template?.name ?? `#${card.cardId}`}</span>
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
      <h2 className="text-xl font-bold text-game-accent">Open packs</h2>
      <p className="text-xs text-gray-400">M6a 30th CELEBRATION names + official Pokemon artwork.</p>
      <div className="bg-game-surface border border-game-border rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-purple-400 text-xs mb-1">Balance</div>
          <div className="text-game-gold font-bold">{player.softCurrency.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-purple-400 text-xs mb-1">Packs since SAR/UR</div>
          <div className="text-yellow-300 font-bold">{player.drawsSinceLastLegendary}</div>
        </div>
        <div>
          <div className="text-purple-400 text-xs mb-1">Pity at</div>
          <div className="text-pink-300 font-bold">{selectedPack.pityLegendaryAt} packs</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PACK_CONFIGS.map(pack => {
          const isSelected = selectedPack.id === pack.id;
          return (
            <button key={pack.id} onClick={() => setSelectedPack(pack)} className={`rounded-xl border p-4 text-left ${isSelected ? 'border-purple-400 bg-purple-900/50' : 'border-game-border bg-game-surface'}`}>
              <div className="text-2xl mb-1">{pack.icon}</div>
              <div className="font-bold text-white text-sm">{pack.name}</div>
              <div className="text-game-gold text-sm">{pack.cost}</div>
              <div className="text-gray-400 text-xs mt-1">{pack.description}</div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={() => handleDraw(1)} disabled={!canAfford(1) || isDrawing} className="flex-1 py-3 rounded-xl font-bold text-sm bg-purple-700 disabled:opacity-40 text-white">
          {isDrawing ? 'Opening…' : `1 pack — ${selectedPack.cost}`}
        </button>
        <button onClick={() => handleDraw(10)} disabled={!canAfford(10) || isDrawing} className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-700 to-pink-700 disabled:opacity-40 text-white">
          {isDrawing ? 'Opening…' : `10 packs — ${selectedPack.cost * 10}`}
        </button>
      </div>

      {showReveal && lastResult && (
        <div className="bg-game-surface border border-game-border rounded-xl p-4 space-y-4">
          <h3 className="font-bold text-white">{lastResult.packs.length} pack(s) · {lastResult.cards.length} cards</h3>
          {lastResult.packs.map((pack, i) => (
            <div key={i} className="space-y-2">
              <div className="text-xs text-purple-300">Pack {i + 1} hit: {pack.hitKind.toUpperCase()} → {pack.hitRarity}</div>
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
