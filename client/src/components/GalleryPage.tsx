import React, { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { CARD_TEMPLATES } from '../cardData';
import type { IGallery, IGallerySlot } from '../db/CardGameDB';
import type { Rarity } from '../cardData';

const GRID_SIZE = 25; // 5×5

const RARITY_MULTIPLIER: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 5,
  legendary: 10,
  mythic: 20,
};

const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-gray-400',
  rare: 'border-blue-400',
  epic: 'border-purple-500',
  legendary: 'border-yellow-400',
  mythic: 'border-pink-500',
};

const RARITY_GLOW: Record<Rarity, string> = {
  common: '',
  rare: 'shadow-blue-400/40',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-yellow-400/60',
  mythic: 'shadow-pink-500/70',
};

export function GalleryPage() {
  const cards = useGameStore((s) => s.cards);
  const gallery = useGameStore((s) => s.gallery);
  const setGallery = useGameStore((s) => s.setGallery);

  // slotIndex being targeted for assignment
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Build a map: slotIndex → cardInstanceId
  const slotMap = new Map<number, number>(
    (gallery?.slots ?? []).map((s) => [s.slotIndex, s.cardInstanceId])
  );

  // Set of cardInstanceIds already placed in the gallery
  const placedIds = new Set(slotMap.values());

  // Unassigned cards (not in any gallery slot)
  const unassignedCards = cards.filter((c) => c.id !== undefined && !placedIds.has(c.id!));

  // Compute gallery score
  const galleryScore = Array.from(slotMap.values()).reduce((total, cardInstanceId) => {
    const cardInstance = cards.find((c) => c.id === cardInstanceId);
    if (!cardInstance) return total;
    return total + RARITY_MULTIPLIER[cardInstance.rarity];
  }, 0);

  const buildGallery = useCallback(
    (newSlots: IGallerySlot[]): IGallery => ({
      userId: gallery?.userId ?? 'local',
      slots: newSlots,
      updatedAt: Date.now(),
    }),
    [gallery]
  );

  const handleSlotClick = (slotIndex: number) => {
    const existingCardId = slotMap.get(slotIndex);
    if (existingCardId !== undefined) {
      // Remove card from slot
      const newSlots = (gallery?.slots ?? []).filter((s) => s.slotIndex !== slotIndex);
      setGallery(buildGallery(newSlots));
      if (selectedSlot === slotIndex) setSelectedSlot(null);
    } else {
      // Select this slot for assignment
      setSelectedSlot((prev) => (prev === slotIndex ? null : slotIndex));
    }
  };

  const handleCardClick = (cardInstanceId: number) => {
    if (selectedSlot === null) return;
    const existingSlots = (gallery?.slots ?? []).filter((s) => s.slotIndex !== selectedSlot);
    const newSlots: IGallerySlot[] = [
      ...existingSlots,
      { slotIndex: selectedSlot, cardInstanceId },
    ];
    setGallery(buildGallery(newSlots));
    setSelectedSlot(null);
  };

  const handleSave = async () => {
    if (!gallery) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await setGallery({ ...gallery, updatedAt: Date.now() });
      setSaveMsg('Saved!');
    } catch {
      setSaveMsg('Save failed.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-400">🖼️ Gallery</h1>
          <p className="text-sm text-gray-400 mt-1">
            Score:{' '}
            <span className="text-yellow-300 font-semibold">{galleryScore}</span>
            <span className="text-gray-500 ml-2">
              ({slotMap.size}/{GRID_SIZE} slots filled)
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className="text-sm text-green-400">{saveMsg}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !gallery}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-semibold rounded-lg transition-colors text-sm"
          >
            {saving ? 'Saving…' : 'Save Gallery'}
          </button>
        </div>
      </div>

      {selectedSlot !== null && (
        <div className="mb-4 px-4 py-2 bg-blue-900/50 border border-blue-500 rounded-lg text-sm text-blue-300">
          Slot {selectedSlot + 1} selected — click a card below to assign it, or click the slot again to cancel.
        </div>
      )}

      {/* 5×5 Grid */}
      <div className="grid grid-cols-5 gap-2 mb-8 max-w-sm mx-auto md:max-w-md">
        {Array.from({ length: GRID_SIZE }, (_, i) => {
          const cardInstanceId = slotMap.get(i);
          const cardInstance = cardInstanceId !== undefined
            ? cards.find((c) => c.id === cardInstanceId)
            : undefined;
          const template = cardInstance
            ? CARD_TEMPLATES.find((t) => t.id === cardInstance.cardId)
            : undefined;
          const isSelected = selectedSlot === i;

          return (
            <button
              key={i}
              onClick={() => handleSlotClick(i)}
              className={[
                'aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all text-center p-1',
                cardInstance
                  ? `${RARITY_BORDER[cardInstance.rarity]} bg-gray-800 hover:bg-gray-700 shadow-md ${RARITY_GLOW[cardInstance.rarity]}`
                  : isSelected
                  ? 'border-blue-400 bg-blue-900/30 animate-pulse'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500',
              ].join(' ')}
              title={template ? `${template.name} (${cardInstance?.rarity})` : `Slot ${i + 1}`}
            >
              {template ? (
                <>
                  <span className="text-xl leading-none">{template.icon}</span>
                  <span className="text-[9px] text-gray-300 mt-0.5 leading-tight truncate w-full text-center">
                    {template.name}
                  </span>
                </>
              ) : (
                <span className="text-gray-600 text-xs">{i + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Unassigned cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Your Cards ({unassignedCards.length} unassigned)
        </h2>
        {unassignedCards.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">
            {cards.length === 0
              ? 'No cards yet — draw some packs first!'
              : 'All cards are placed in the gallery.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto pr-1">
            {unassignedCards.map((card) => {
              const template = CARD_TEMPLATES.find((t) => t.id === card.cardId);
              if (!template) return null;
              const isClickable = selectedSlot !== null;
              return (
                <button
                  key={card.id}
                  onClick={() => card.id !== undefined && handleCardClick(card.id)}
                  disabled={!isClickable}
                  className={[
                    'flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm transition-all',
                    RARITY_BORDER[card.rarity],
                    isClickable
                      ? 'bg-gray-800 hover:bg-gray-700 cursor-pointer'
                      : 'bg-gray-900 opacity-60 cursor-default',
                  ].join(' ')}
                  title={isClickable ? `Assign ${template.name} to slot ${selectedSlot! + 1}` : template.name}
                >
                  <span className="text-lg">{template.icon}</span>
                  <span className="text-gray-200">{template.name}</span>
                  <span className="text-xs text-gray-500 capitalize">{card.rarity}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Rarity legend */}
      <div className="mt-8 pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-600 mb-2">Score multipliers:</p>
        <div className="flex flex-wrap gap-3">
          {(Object.entries(RARITY_MULTIPLIER) as [Rarity, number][]).map(([rarity, mult]) => (
            <span key={rarity} className={`text-xs border rounded px-2 py-0.5 ${RARITY_BORDER[rarity]} text-gray-300`}>
              {rarity} ×{mult}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
