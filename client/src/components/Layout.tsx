import React from 'react';
import type { Page } from '../App';
import { useGameStore } from '../store';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { page: Page; label: string; icon: string }[] = [
  { page: 'home', label: 'Atelier', icon: '\u2726' },
  { page: 'draw', label: 'Packs', icon: '\u25A3' },
  { page: 'inventory', label: 'Binder', icon: '\u25A6' },
  { page: 'synthesis', label: 'Craft', icon: '\u2727' },
  { page: 'battle', label: 'Table', icon: '\u2694' },
  { page: 'shop', label: 'Counter', icon: '\u25C8' },
  { page: 'achievements', label: 'Marks', icon: '\u2605' },
  { page: 'settings', label: 'Settings', icon: '\u2699' },
];

const BOTTOM: Page[] = ['home', 'draw', 'inventory', 'battle', 'shop'];

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { player, cards } = useGameStore();
  const bottom = NAV_ITEMS.filter((item) => BOTTOM.includes(item.page));

  return (
    <div className="atelier-bg flex min-h-screen flex-col">
      <header className="glass sticky top-0 z-40 flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-atelier-muted">CardPlayground</p>
          <h1 className="text-sm font-semibold text-atelier-text">Premium Card Atelier</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-atelier-warm font-semibold">{player.softCurrency.toLocaleString()}</span>
          <span className="text-atelier-muted">luck {player.luckValue}</span>
        </div>
      </header>

      <nav className="hidden gap-1 overflow-x-auto border-b border-white/10 px-3 py-2 md:flex" aria-label="Primary">
        {NAV_ITEMS.map(({ page, label }) => (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            className={`min-h-11 rounded-full px-4 text-sm ${
              currentPage === page ? 'bg-atelier-warm text-black' : 'text-atelier-muted hover:bg-white/10 hover:text-white'
            }`}
          >
            {label}
            {page === 'inventory' ? <span className="ml-2 text-xs">{cards.length}</span> : null}
          </button>
        ))}
      </nav>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-24 md:pb-8">{children}</main>

      <nav className="glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 px-1 py-2 md:hidden" aria-label="Mobile">
        {bottom.map(({ page, label }) => (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            className={`relative min-h-11 rounded-xl text-[11px] ${currentPage === page ? 'text-atelier-warm' : 'text-atelier-muted'}`}
          >
            {label}
            {page === 'inventory' && cards.length > 0 ? (
              <span className="absolute right-2 top-0 rounded-full bg-atelier-warm px-1 text-[9px] text-black">{cards.length}</span>
            ) : null}
          </button>
        ))}
      </nav>
    </div>
  );
}
