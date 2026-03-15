import React, { useState, useEffect, useCallback } from 'react';
import type { ICardInstance } from '../db';
import { CARD_TEMPLATES, type Rarity } from '../cardData';

const RARITY_STYLES: Record<Rarity, { border: string; glow: string; text: string; label: string; bg: string }> = {
  common:    { border: '2px solid #6b7280', glow: 'none',                          text: '#d1d5db', label: 'Common',    bg: 'rgba(31,41,55,0.9)' },
  rare:      { border: '2px solid #3b82f6', glow: '0 0 12px rgba(59,130,246,0.6)', text: '#93c5fd', label: 'Rare',      bg: 'rgba(23,37,84,0.9)' },
  epic:      { border: '2px solid #a855f7', glow: '0 0 12px rgba(168,85,247,0.6)', text: '#d8b4fe', label: 'Epic',      bg: 'rgba(46,16,101,0.9)' },
  legendary: { border: '2px solid #facc15', glow: '0 0 16px rgba(250,204,21,0.7)', text: '#fde68a', label: 'Legendary', bg: 'rgba(66,32,6,0.9)' },
  mythic:    { border: '2px solid #f472b6', glow: '0 0 20px rgba(244,114,182,0.8)',text: '#fbcfe8', label: 'Mythic',    bg: 'rgba(80,7,36,0.9)' },
};

const REVEAL_DELAY_MS = 600;

interface CardRevealModalProps {
  cards: ICardInstance[];
  onClose: () => void;
  isOpen: boolean;
}

interface FlipCardProps {
  card: ICardInstance;
  revealed: boolean;
}

function FlipCard({ card, revealed }: FlipCardProps) {
  const template = CARD_TEMPLATES.find(t => t.id === card.cardId);
  const style = RARITY_STYLES[card.rarity];

  return (
    <div
      style={{
        perspective: '800px',
        width: '120px',
        height: '160px',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s ease',
          transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Back face */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            border: '2px solid #4c1d95',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
          }}
        >
          🃏
        </div>

        {/* Front face */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '12px',
            background: style.bg,
            border: style.border,
            boxShadow: style.glow,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
          }}
        >
          <span style={{ fontSize: '2.5rem' }}>{template?.icon ?? '🃏'}</span>
          <span style={{ color: style.text, fontWeight: 700, fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.2 }}>
            {template?.name ?? `Card #${card.cardId}`}
          </span>
          <span style={{ color: '#9ca3af', fontSize: '0.6rem', textAlign: 'center' }}>
            {template?.series}
          </span>
          <span
            style={{
              color: style.text,
              fontSize: '0.6rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              border: style.border,
              borderRadius: '999px',
              padding: '1px 6px',
            }}
          >
            {style.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CardRevealModal({ cards, onClose, isOpen }: CardRevealModalProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [allRevealed, setAllRevealed] = useState(false);

  // Reset state when modal opens with new cards
  useEffect(() => {
    if (isOpen && cards.length > 0) {
      setRevealedCount(0);
      setAllRevealed(false);
    }
  }, [isOpen, cards]);

  // Sequentially reveal cards
  useEffect(() => {
    if (!isOpen || allRevealed || revealedCount >= cards.length) return;

    const timer = setTimeout(() => {
      const next = revealedCount + 1;
      setRevealedCount(next);
      if (next >= cards.length) {
        setAllRevealed(true);
      }
    }, REVEAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isOpen, revealedCount, cards.length, allRevealed]);

  const handleRevealAll = useCallback(() => {
    setRevealedCount(cards.length);
    setAllRevealed(true);
  }, [cards.length]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Dark backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={allRevealed ? onClose : undefined}
      />

      {/* Modal panel */}
      <div
        style={{
          position: 'relative',
          background: '#0f0a1e',
          border: '1px solid #4c1d95',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '640px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ color: '#e9d5ff', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>
            🎴 Card Reveal ({revealedCount}/{cards.length})
          </h2>
          {allRevealed && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #6b7280',
                borderRadius: '8px',
                color: '#d1d5db',
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              ✕ Close
            </button>
          )}
        </div>

        {/* Cards grid */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          {cards.map((card, i) => (
            <FlipCard key={i} card={card} revealed={i < revealedCount} />
          ))}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {!allRevealed && (
            <button
              onClick={handleRevealAll}
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                padding: '10px 24px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              ✨ Reveal All
            </button>
          )}
          {allRevealed && (
            <button
              onClick={onClose}
              style={{
                background: '#1e1b4b',
                border: '1px solid #4c1d95',
                borderRadius: '10px',
                color: '#e9d5ff',
                padding: '10px 24px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
