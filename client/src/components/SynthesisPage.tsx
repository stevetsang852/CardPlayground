import { useState, useCallback, useMemo, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  synthesize,
  calculateSuccessRate,
  SYNTHESIS_RECIPES,
  type SynthesisRecipe,
  type SynthesisResult,
} from '../game/SynthesisService';
import { CARD_TEMPLATES, type Rarity } from '../cardData';
import type { ICardInstance } from '../db';
import { SynthesisEffect, type CardInfo } from '../animations';

const RARITY_STYLES: Record<Rarity, { border: string; bg: string; text: string; label: string; ring: string }> = {
  common:    { border: 'border-gray-500',   bg: 'bg-gray-800/60',    text: 'text-gray-300',   label: 'Common',    ring: 'ring-gray-500' },
  rare:      { border: 'border-blue-500',   bg: 'bg-blue-900/60',    text: 'text-blue-300',   label: 'Rare',      ring: 'ring-blue-500' },
  epic:      { border: 'border-purple-500', bg: 'bg-purple-900/60',  text: 'text-purple-300', label: 'Epic',      ring: 'ring-purple-500' },
  legendary: { border: 'border-yellow-400', bg: 'bg-yellow-900/60',  text: 'text-yellow-300', label: 'Legendary', ring: 'ring-yellow-400' },
  mythic:    { border: 'border-pink-400',   bg: 'bg-pink-900/60',    text: 'text-pink-300',   label: 'Mythic',    ring: 'ring-pink-400' },
};

function CardItem({
  card,
  selected,
  onClick,
}: {
  card: ICardInstance;
  selected: boolean;
  onClick?: () => void;
}) {
  const template = CARD_TEMPLATES.find(t => t.id === card.cardId);
  const style = RARITY_STYLES[card.rarity];

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all w-full
        ${style.border} ${style.bg}
        ${selected ? `ring-2 ${style.ring} brightness-125` : 'hover:brightness-110'}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span className="text-xl">{template?.icon ?? '🃏'}</span>
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-xs truncate ${style.text}`}>
          {template?.name ?? `Card #${card.cardId}`}
        </div>
        <div className="text-xs text-gray-500 truncate">{template?.series}</div>
      </div>
      {selected && <span className="text-green-400 text-xs font-bold">✓</span>}
    </button>
  );
}

export function SynthesisPage() {
  const { player, cards, activeEvents, removeCard, addCards, setPlayer, incrementActionCount } =
    useGameStore();

  const [selectedRecipe, setSelectedRecipe] = useState<SynthesisRecipe>(SYNTHESIS_RECIPES[0]!);
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [lastResult, setLastResult] = useState<SynthesisResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [multiBatchInfo, setMultiBatchInfo] = useState<{ current: number; total: number } | null>(null);
  // All results from a skip-all multi-auto run
  const [batchResults, setBatchResults] = useState<SynthesisResult[]>([]);
  // Ref to latest cards/player so multi-auto loop always sees fresh state
  const storeRef = useRef({ cards, player, activeEvents });
  // Skip-all signal: set to true to make the loop skip remaining animations
  const skipAllRef = useRef(false);
  // Callback to immediately finish the currently-playing animation
  const skipCurrentAnimRef = useRef<(() => void) | null>(null);
  // True while the multi-auto loop is running (drives Skip All button visibility)
  const [isMultiRunning, setIsMultiRunning] = useState(false);
  // Pre-run dialog: null = hidden, 'pending' = showing
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const skipDialogResolveRef = useRef<((skip: boolean) => void) | null>(null);

  // Cards matching the selected recipe's input rarity
  const eligibleCards = useMemo(
    () => cards.filter(c => c.rarity === selectedRecipe.inputRarity && c.id !== undefined),
    [cards, selectedRecipe.inputRarity]
  );

  const successRate = useMemo(
    () => calculateSuccessRate(selectedRecipe, player, activeEvents),
    [selectedRecipe, player, activeEvents]
  );

  const canAfford = player.softCurrency >= selectedRecipe.softCurrencyCost;
  const hasEnoughCards = eligibleCards.length >= selectedRecipe.inputCount;
  const hasSelectedEnough = selectedCardIds.length === selectedRecipe.inputCount;
  const canSynthesize = canAfford && hasSelectedEnough && !isSynthesizing;

  // Keep ref in sync so multi-auto loop reads fresh state
  storeRef.current = { cards, player, activeEvents };

  // Max batches player can run right now (limited by cards and coins)
  const maxBatches = useMemo(() => {
    const byCards = Math.floor(eligibleCards.length / selectedRecipe.inputCount);
    const byCoins = Math.floor(player.softCurrency / selectedRecipe.softCurrencyCost);
    return Math.min(byCards, byCoins);
  }, [eligibleCards.length, selectedRecipe.inputCount, selectedRecipe.softCurrencyCost, player.softCurrency]);

  const handleAutoSelect = useCallback(() => {
    const ids = eligibleCards.slice(0, selectedRecipe.inputCount).map(c => c.id!);
    setSelectedCardIds(ids);
  }, [eligibleCards, selectedRecipe.inputCount]);

  // Run a single synthesis batch using the provided card ids and player state
  const runOneBatch = useCallback(
    (batchIds: number[], currentPlayer: typeof player, currentCards: typeof cards, currentEvents: typeof activeEvents): Promise<SynthesisResult> => {
      return new Promise(resolve => {
        const result = synthesize(selectedRecipe, batchIds, currentPlayer, currentEvents);

        // If skip-all was requested, resolve immediately without playing animation
        if (skipAllRef.current) {
          resolve(result);
          return;
        }

        const materialInfos: CardInfo[] = batchIds.map(id => {
          const card = currentCards.find(c => c.id === id);
          const template = card ? CARD_TEMPLATES.find(t => t.id === card.cardId) : undefined;
          return { icon: template?.icon ?? '🃏', name: template?.name ?? `Card #${id}`, rarity: card?.rarity ?? 'common' };
        });

        const resultInfo: CardInfo | null = result.success && result.outputCard
          ? (() => {
              const template = CARD_TEMPLATES.find(t => t.id === result.outputCard!.cardId);
              return { icon: template?.icon ?? '🃏', name: template?.name ?? 'Unknown', rarity: result.outputCard!.rarity };
            })()
          : null;

        const fx = new SynthesisEffect();
        // Register skip callback so the "Skip All" button can finish this animation immediately
        skipCurrentAnimRef.current = () => fx.skipToEnd();
        fx.play(materialInfos, resultInfo, result.success, () => {
          skipCurrentAnimRef.current = null;
          resolve(result);
        });
      });
    },
    [selectedRecipe]
  );

  const handleMultiAuto = useCallback(async () => {
    if (isSynthesizing || maxBatches < 1) return;

    // Ask player upfront whether to skip all animations
    const skipAll = await new Promise<boolean>(resolve => {
      skipDialogResolveRef.current = resolve;
      setShowSkipDialog(true);
    });

    setIsSynthesizing(true);
    setShowResult(false);
    setSelectedCardIds([]);
    setBatchResults([]);
    skipAllRef.current = skipAll;
    setIsMultiRunning(true);

    const total = maxBatches;
    let lastRes: SynthesisResult | null = null;
    const allResults: SynthesisResult[] = [];

    for (let i = 0; i < total; i++) {
      setMultiBatchInfo({ current: i + 1, total });

      // Always read fresh state from ref
      const { cards: freshCards, player: freshPlayer, activeEvents: freshEvents } = storeRef.current;
      const freshEligible = freshCards.filter(c => c.rarity === selectedRecipe.inputRarity && c.id !== undefined);

      if (freshEligible.length < selectedRecipe.inputCount) break;
      if (freshPlayer.softCurrency < selectedRecipe.softCurrencyCost) break;

      const batchIds = freshEligible.slice(0, selectedRecipe.inputCount).map(c => c.id!);

      const result = await runOneBatch(batchIds, freshPlayer, freshCards, freshEvents);

      // Commit to store
      for (const id of result.consumedCardIds) await removeCard(id);
      if (result.success && result.outputCard) await addCards([result.outputCard]);
      setPlayer(result.updatedPlayer);
      incrementActionCount();

      lastRes = result;
      allResults.push(result);
    }

    setMultiBatchInfo(null);
    skipAllRef.current = false;
    skipCurrentAnimRef.current = null;
    setIsMultiRunning(false);
    if (skipAll && allResults.length > 0) {
      setBatchResults(allResults);
      setShowResult(true);
    } else if (lastRes) {
      setLastResult(lastRes);
      setShowResult(true);
    }
    setIsSynthesizing(false);
  }, [
    isSynthesizing,
    maxBatches,
    selectedRecipe,
    runOneBatch,
    removeCard,
    addCards,
    setPlayer,
    incrementActionCount,
  ]);

  const handleRecipeSelect = useCallback((recipe: SynthesisRecipe) => {
    setSelectedRecipe(recipe);
    setSelectedCardIds([]);
    setShowResult(false);
    setLastResult(null);
    setBatchResults([]);
  }, []);

  const toggleCardSelection = useCallback(
    (id: number) => {
      setSelectedCardIds(prev => {
        if (prev.includes(id)) return prev.filter(x => x !== id);
        if (prev.length >= selectedRecipe.inputCount) return prev;
        return [...prev, id];
      });
    },
    [selectedRecipe.inputCount]
  );

  const handleSynthesize = useCallback(async () => {
    if (!canSynthesize) return;
    setIsSynthesizing(true);
    setShowResult(false);

    const result = synthesize(selectedRecipe, selectedCardIds, player, activeEvents);

    // Update store
    for (const id of result.consumedCardIds) {
      await removeCard(id);
    }
    if (result.success && result.outputCard) {
      await addCards([result.outputCard]);
    }
    setPlayer(result.updatedPlayer);
    incrementActionCount();

    // Map material cards to CardInfo for animation
    const materialInfos: CardInfo[] = selectedCardIds.map(id => {
      const card = cards.find(c => c.id === id);
      const template = card ? CARD_TEMPLATES.find(t => t.id === card.cardId) : undefined;
      return { icon: template?.icon ?? '🃏', name: template?.name ?? `Card #${id}`, rarity: card?.rarity ?? 'common' };
    });

    // Map result card to CardInfo
    const resultInfo: CardInfo | null = result.success && result.outputCard
      ? (() => {
          const template = CARD_TEMPLATES.find(t => t.id === result.outputCard!.cardId);
          return { icon: template?.icon ?? '🃏', name: template?.name ?? 'Unknown', rarity: result.outputCard!.rarity };
        })()
      : null;

    setSelectedCardIds([]);

    // Play synthesis cinematic, then show result panel
    new SynthesisEffect().play(materialInfos, resultInfo, result.success, () => {
      setLastResult(result);
      setShowResult(true);
      setIsSynthesizing(false);
    });
  }, [
    canSynthesize,
    selectedRecipe,
    selectedCardIds,
    player,
    activeEvents,
    cards,
    removeCard,
    addCards,
    setPlayer,
    incrementActionCount,
  ]);

  const inputStyle = RARITY_STYLES[selectedRecipe.inputRarity];
  const outputStyle = RARITY_STYLES[selectedRecipe.outputRarity];

  // Event bonus info
  const hasSynthesisBoost = activeEvents.some(
    e => e.type === 'synthesis_boost' && e.remainingActions > 0
  );
  const hasFailureProtection = player.consecutiveSynthesisFailures >= 3;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-game-accent">⚗️ Card Synthesis</h2>

      {/* Balance */}
      <div className="bg-game-surface border border-game-border rounded-xl p-4 flex items-center justify-between">
        <span className="text-purple-400 text-sm">Balance</span>
        <span className="text-game-gold font-bold">🪙 {player.softCurrency.toLocaleString()}</span>
      </div>

      {/* Recipe selection */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SYNTHESIS_RECIPES.map(recipe => {
          const isSelected = selectedRecipe.id === recipe.id;
          const inStyle = RARITY_STYLES[recipe.inputRarity];
          const outStyle = RARITY_STYLES[recipe.outputRarity];
          return (
            <button
              key={recipe.id}
              onClick={() => handleRecipeSelect(recipe)}
              className={`rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? `${inStyle.border} bg-gray-800 ring-1 ${inStyle.ring}`
                  : 'border-game-border bg-game-surface hover:border-gray-500'
              }`}
            >
              <div className="text-xs font-bold text-white mb-1">{recipe.name}</div>
              <div className="flex items-center gap-1 text-xs">
                <span className={inStyle.text}>{inStyle.label}</span>
                <span className="text-gray-500">→</span>
                <span className={outStyle.text}>{outStyle.label}</span>
              </div>
              <div className="text-game-gold text-xs mt-1">🪙 {recipe.softCurrencyCost.toLocaleString()}</div>
              <div className="text-gray-400 text-xs">{Math.round(recipe.baseSuccessRate * 100)}% base</div>
            </button>
          );
        })}
      </div>

      {/* Selected recipe details */}
      <div className="bg-game-surface border border-game-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">{selectedRecipe.name}</h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${outputStyle.border} ${outputStyle.text}`}>
            → {outputStyle.label}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <div className="text-purple-400 text-xs mb-1">Success Rate</div>
            <div className={`font-bold ${successRate >= 0.5 ? 'text-green-400' : successRate >= 0.3 ? 'text-yellow-400' : 'text-red-400'}`}>
              {Math.round(successRate * 100)}%
            </div>
          </div>
          <div>
            <div className="text-purple-400 text-xs mb-1">Materials</div>
            <div className="font-bold text-white">
              {selectedCardIds.length} / {selectedRecipe.inputCount}
            </div>
          </div>
          <div>
            <div className="text-purple-400 text-xs mb-1">Cost</div>
            <div className={`font-bold ${canAfford ? 'text-game-gold' : 'text-red-400'}`}>
              🪙 {selectedRecipe.softCurrencyCost.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Bonus indicators */}
        {(hasSynthesisBoost || hasFailureProtection) && (
          <div className="flex flex-wrap gap-2">
            {hasSynthesisBoost && (
              <span className="text-xs bg-green-900/50 border border-green-600 text-green-300 px-2 py-0.5 rounded-full">
                ✨ Synthesis Boost +20%
              </span>
            )}
            {hasFailureProtection && (
              <span className="text-xs bg-orange-900/50 border border-orange-600 text-orange-300 px-2 py-0.5 rounded-full">
                🛡 Failure Protection +10%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Material card selection */}
      <div className="bg-game-surface border border-game-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">
            Select {selectedRecipe.inputCount} <span className={inputStyle.text}>{inputStyle.label}</span> Cards
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">{eligibleCards.length} available</span>
            {hasEnoughCards && (
              <button
                onClick={handleAutoSelect}
                disabled={isSynthesizing}
                className="text-xs px-2 py-0.5 rounded-lg border border-purple-500 text-purple-300 hover:bg-purple-900/40 disabled:opacity-40 transition-all"
              >
                ⚡ Auto Select
              </button>
            )}
          </div>
        </div>

        {!hasEnoughCards ? (
          <p className="text-gray-500 text-sm text-center py-4">
            Not enough {inputStyle.label.toLowerCase()} cards. You need at least {selectedRecipe.inputCount}.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {eligibleCards.map(card => (
              <CardItem
                key={card.id}
                card={card}
                selected={selectedCardIds.includes(card.id!)}
                onClick={() => toggleCardSelection(card.id!)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Synthesize buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSynthesize}
          disabled={!canSynthesize}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-purple-700 to-pink-700 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
        >
          {isSynthesizing && !multiBatchInfo
            ? '⏳ Synthesizing…'
            : `⚗️ Synthesize — 🪙 ${selectedRecipe.softCurrencyCost.toLocaleString()}`}
        </button>
        <button
          onClick={handleMultiAuto}
          disabled={isSynthesizing || maxBatches < 1}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-indigo-700 to-purple-700 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white"
        >
          {multiBatchInfo
            ? `⏳ Batch ${multiBatchInfo.current}/${multiBatchInfo.total}`
            : `🔁 Multi Auto ×${maxBatches}`}
        </button>
      </div>

      {/* Skip All button — only visible during multi-auto */}

      {!canAfford && (
        <p className="text-red-400 text-xs text-center">
          Insufficient coins. Visit the Shop to get more currency.
        </p>
      )}

      {/* Result panel — batch skip-all mode: show all results */}
      {showResult && batchResults.length > 0 && (
        <div className="rounded-xl border border-purple-600 bg-purple-900/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">
              📋 Batch Results ({batchResults.length} runs)
            </h3>
            <button onClick={() => { setShowResult(false); setBatchResults([]); }} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
          </div>
          <div className="text-xs text-gray-400 flex gap-4">
            <span className="text-green-400">✅ {batchResults.filter(r => r.success).length} succeeded</span>
            <span className="text-red-400">💔 {batchResults.filter(r => !r.success).length} failed</span>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {batchResults.map((r, i) => {
              const template = r.success && r.outputCard
                ? CARD_TEMPLATES.find(t => t.id === r.outputCard!.cardId)
                : null;
              return (
                <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${r.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-400'}`}>
                  <span>{r.success ? '✅' : '💔'}</span>
                  <span className="font-bold">#{i + 1}</span>
                  {r.success && template ? (
                    <span>{template.icon} {template.name} <span className="opacity-60">({r.outputCard!.rarity})</span></span>
                  ) : (
                    <span>Failed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Result panel — single synthesis */}
      {showResult && batchResults.length === 0 && lastResult && (
        <div
          className={`rounded-xl border p-4 space-y-3 ${
            lastResult.success
              ? 'border-green-500 bg-green-900/20'
              : 'border-red-500 bg-red-900/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-lg">
              {lastResult.success ? '🎉 Synthesis Succeeded!' : '💔 Synthesis Failed'}
            </h3>
            <button
              onClick={() => setShowResult(false)}
              className="text-gray-500 hover:text-gray-300 text-sm"
            >
              ✕
            </button>
          </div>

          {lastResult.success && lastResult.outputCard ? (
            <div className="space-y-2">
              <p className="text-green-300 text-sm">You obtained a new card:</p>
              <CardItem card={lastResult.outputCard} selected={false} />
            </div>
          ) : (
            <p className="text-red-300 text-sm">
              The synthesis failed. Your materials were consumed.
              {player.consecutiveSynthesisFailures >= 3 && (
                <span className="block mt-1 text-orange-300 text-xs">
                  🛡 Failure protection is now active — next attempt gets +10% success rate.
                </span>
              )}
            </p>
          )}
        </div>
      )}
      {/* Pre-run skip dialog */}
      {showSkipDialog && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-purple-600 rounded-2xl p-6 w-80 space-y-4 shadow-2xl">
            <h3 className="text-white font-bold text-lg text-center">🔁 Multi Auto ×{maxBatches}</h3>
            <p className="text-gray-300 text-sm text-center">
              Play synthesis animations for each batch, or skip straight to results?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowSkipDialog(false);
                  skipDialogResolveRef.current?.(false);
                }}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-700 to-purple-700 hover:brightness-110 text-white transition-all"
              >
                ✨ Play Animations
              </button>
              <button
                onClick={() => {
                  setShowSkipDialog(false);
                  skipDialogResolveRef.current?.(true);
                }}
                className="w-full py-2 rounded-xl font-bold text-sm border border-gray-500 text-gray-300 hover:bg-gray-700/50 transition-all"
              >
                ⏭ Skip All — Show Results Only
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
