import React from 'react';
import { useGameStore } from '../store';

interface CurrencyDisplayProps {
  /** If provided, displays a single currency value inline (prop-based mode). */
  amount?: number;
  icon?: string;
  label?: string;
  className?: string;
}

/**
 * CurrencyDisplay — reusable currency display component.
 *
 * Usage A — inline single value (prop-based):
 *   <CurrencyDisplay amount={player.softCurrency} />
 *
 * Usage B — full panel reading from store (no props needed):
 *   <CurrencyDisplay />
 */
export function CurrencyDisplay({ amount, icon = '🪙', label, className = '' }: CurrencyDisplayProps) {
  const player = useGameStore((s) => s.player);

  // Inline / single-value mode
  if (amount !== undefined) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <span>{icon}</span>
        {label && <span className="text-purple-400 text-sm">{label}:</span>}
        <span className="text-game-gold font-bold">{amount.toLocaleString()}</span>
      </div>
    );
  }

  // Full panel mode — reads both currencies from store
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-1">
        <span>🪙</span>
        <span className="text-purple-400 text-xs">软货币</span>
        <span className="text-game-gold font-bold">{player.softCurrency.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1">
        <span>💎</span>
        <span className="text-purple-400 text-xs">硬货币</span>
        <span className="text-blue-300 font-bold">{player.hardCurrency.toLocaleString()}</span>
      </div>
    </div>
  );
}
