import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { refreshDailyShop, purchaseItem } from '../game/SystemShop';
import { CARD_TEMPLATES, type Rarity } from '../cardData';
import type { IMarketListing } from '../db';

const RARITY_STYLES: Record<Rarity, { border: string; bg: string; text: string; badge: string; label: string }> = {
  common:    { border: 'border-gray-500',   bg: 'bg-gray-800/60',    text: 'text-gray-300',   badge: 'bg-gray-700 text-gray-300',     label: 'Common' },
  rare:      { border: 'border-blue-500',   bg: 'bg-blue-900/60',    text: 'text-blue-300',   badge: 'bg-blue-800 text-blue-200',     label: 'Rare' },
  epic:      { border: 'border-purple-500', bg: 'bg-purple-900/60',  text: 'text-purple-300', badge: 'bg-purple-800 text-purple-200', label: 'Epic' },
  legendary: { border: 'border-yellow-400', bg: 'bg-yellow-900/60',  text: 'text-yellow-300', badge: 'bg-yellow-700 text-yellow-200', label: 'Legendary' },
  mythic:    { border: 'border-pink-400',   bg: 'bg-pink-900/60',    text: 'text-pink-300',   badge: 'bg-pink-800 text-pink-200',     label: 'Mythic' },
};

function useCountdownToMidnight() {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}

interface ListingCardProps {
  listing: IMarketListing;
  onPurchase: (listing: IMarketListing) => void;
  canAfford: boolean;
  isPurchasing: boolean;
}

function ListingCard({ listing, onPurchase, canAfford, isPurchasing }: ListingCardProps) {
  const template = CARD_TEMPLATES.find(t => t.id === listing.cardId);
  const style = RARITY_STYLES[listing.rarity];
  const disabled = listing.purchased || !canAfford || isPurchasing;

  return (
    <div className={`flex flex-col gap-3 rounded-xl border ${style.border} ${style.bg} p-4`}>
      {/* Card info */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{template?.icon ?? '🃏'}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm truncate ${style.text}`}>
            {template?.name ?? `Card #${listing.cardId}`}
          </div>
          <div className="text-xs text-gray-500">{template?.series}</div>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
          {style.label}
        </span>
      </div>

      {/* Price & buy */}
      <div className="flex items-center justify-between">
        <span className="text-game-gold font-semibold text-sm">🪙 {listing.price.toLocaleString()}</span>
        {listing.purchased ? (
          <span className="text-xs text-gray-500 font-medium">✓ Purchased</span>
        ) : (
          <button
            onClick={() => onPurchase(listing)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white"
          >
            {isPurchasing ? '⏳' : 'Buy'}
          </button>
        )}
      </div>
    </div>
  );
}

export function ShopPage() {
  const store = useGameStore();
  const { player, cards, marketListings, lastShopRefreshDate } = store;
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const countdown = useCountdownToMidnight();

  // Refresh shop if stale
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]!;
    if (lastShopRefreshDate !== today) {
      const listings = refreshDailyShop(player, cards, today);
      store.setLastShopRefreshDate(today);
      store.setMarketListings(listings);
    }
  }, [lastShopRefreshDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePurchase = useCallback(
    async (listing: IMarketListing) => {
      if (listing.id == null) return;
      setPurchasingId(listing.id);
      setError(null);

      const result = purchaseItem(listing.id, marketListings, player);

      if (!result.success || !result.card) {
        setError(result.error ?? 'Purchase failed');
        setPurchasingId(null);
        return;
      }

      // Update player currency
      store.setPlayer(result.updatedPlayer);

      // Add card to collection
      await store.addCards([result.card]);

      // Mark listing as purchased
      const updatedListings = marketListings.map(l =>
        l.id === listing.id ? { ...l, purchased: true } : l
      );
      await store.setMarketListings(updatedListings);

      store.incrementActionCount();
      setPurchasingId(null);
    },
    [marketListings, player, store]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-game-accent">🛒 Daily Shop</h2>
        <div className="text-right">
          <div className="text-game-gold font-bold text-sm">🪙 {player.softCurrency.toLocaleString()}</div>
          <div className="text-gray-500 text-xs">Refreshes in {countdown}</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-600 rounded-lg px-4 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {marketListings.length === 0 ? (
        <div className="text-center text-gray-500 py-12">Loading shop…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketListings.map((listing, i) => (
            <ListingCard
              key={listing.id ?? i}
              listing={listing}
              onPurchase={handlePurchase}
              canAfford={player.softCurrency >= listing.price}
              isPurchasing={purchasingId === listing.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
