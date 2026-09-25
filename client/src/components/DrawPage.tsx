import { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { drawCards, PACK_CONFIGS, type PackConfig, type DrawResult } from '../game/DrawService';
import { CARD_TEMPLATES, type Rarity } from '../cardData';
import type { ICardInstance } from '../db';
import { PackOpenAnimation, type DrawnCardInfo } from '../animations';

const RARITY_STYLES: Record<Rarity, { border: string; bg: string; text: string; label: string }> = {
  common:    { border: 'border-gray-500',   bg: 'bg-gray-800/60',    text: 'text-gray-300',   label: 'Common' },
  rare:      { border: 'border-blue-500',   bg: 'bg-blue-900/60',    text: 'text-blue-300',   label: 'Rare' },
  epic:      { border: 'border-purple-500', bg: 'bg-purple-900/60',  text: 'text-purple-300', label: 'Epic' },
  legendary: { border: 'border-yellow-400', bg: 'bg-yellow-900/60',  text: 'text-yellow-300', label: 'Legendary' },
  mythic:    { border: 'border-pink-400',   bg: 'bg-pink-900/60',    text: 'text-pink-300',   label: 'Mythic' },
};

function CardResultItem({ card }: { card: ICardInstance }) {
  const template = CARD_TEMPLATES.find(t => t.id === card.cardId);
  const style = RARITY_STYLES[card.rarity];

  return (
    <div className="card-container">
      <div className={`drawn-card ptcg-card ptcg-card-sm ${card.rarity}`}>
        <div className="card__shine" />
        <div className="card__glare" />
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 4px',
            background: 'linear-gradient(160deg, #1e1040 0%, #0e1830 100%)',
            borderRadius: 10,
          }}
        >
          <span style={{ fontSize: 32, lineHeight: 1 }}>{template?.icon ?? '🃏'}</span>
          <span className={`text-center font-bold leading-tight ${style.text}`}
            style={{ fontSize: 9, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {template?.name ?? `Card #${card.cardId}`}
          </span>
          <span className={`font-bold uppercase tracking-wide ${style.text}`} style={{ fontSize: 8 }}>
            {style.label}
          </span>
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

  const handleDraw = useCallback(
    async (count: number) => {
      if (!canAfford(count) || isDrawing) return;
      setIsDrawing(true);
      setShowReveal(false);

      const result = drawCards(selectedPack, count, player, activeEvents);
      setPlayer(result.updatedPlayer);
      await addCards(result.cards);
      incrementActionCount();

      const drawnCardInfos: DrawnCardInfo[] = result.cards.map(card => {
        const template = CARD_TEMPLATES.find(t => t.id === card.cardId);
        return { icon: template?.icon ?? '🃏', name: template?.name ?? `Card #${card.cardId}`, rarity: card.rarity };
      });

      new PackOpenAnimation().play(selectedPack.icon, drawnCardInfos, () => {
        setLastResult(result);
        setShowReveal(true);
        setIsDrawing(false);
      });
    },
    [canAfford, isDrawing, selectedPack, player, activeEvents, setPlayer, addCards, incrementActionCount]
  );

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-game-accent">🃏 Draw Cards</h2>
      <div className="bg-game-surface border border-game-border rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-purple-400 text-xs mb-1">Balance</div>
          <div className="text-game-gold font-bold">🪙 {player.softCurrency.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-purple-400 text-xs mb-1">Legendary Pity</div>
          <div className="text-yellow-300 font-bold">⚔️ {player.drawsSinceLastLegendary}</div>
        </div>
        <div>
          <div className="text-purple-400 text-xs mb-1">Mythic Pity</div>
          <div className="text-pink-300 font-bold">✨ {player.drawsSinceLastMythic}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PACK_CONFIGS.map(pack => {
          const isSelected = selectedPack.id === pack.id;
          return (
            <button
              key={pack.id}
              onClick={() => setSelectedPack(pack)}
              className={`rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-purple-400 bg-purple-900/50 ring-1 ring-purple-400'
                  : 'border-game-border bg-game-surface hover:border-purple-600'
              }`}
            >
              <div className="text-2xl mb-1">{pack.icon}</div>
              <div className="font-bold text-white text-sm">{pack.name}</div>
              <div className="text-game-gold text-sm font-semibold">🪙 {pack.cost.toLocaleString()}</div>
              <div className="text-gray-400 text-xs mt-1">{pack.description}</div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => handleDraw(1)}
          disabled={!canAfford(1) || isDrawing}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-all bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white"
        >
          {isDrawing ? 'Drawing…' : `Single Draw — ${selectedPack.cost}`}
        </button>
        <button
          onClick={() => handleDraw(10)}
          disabled={!canAfford(10) || isDrawing}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-purple-700 to-pink-700 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
        >
          {isDrawing ? 'Drawing…' : `10-Pull — ${selectedPack.cost * 10}`}
        </button>
      </div>

      {showReveal && lastResult && (
        <div className="bg-game-surface border border-game-border rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-white">You got {lastResult.cards.length} cards</h3>
          <div className="flex flex-wrap gap-3 justify-center py-2 max-h-96 overflow-y-auto">
            {lastResult.cards.map((card, i) => (
              <CardResultItem key={i} card={card} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
