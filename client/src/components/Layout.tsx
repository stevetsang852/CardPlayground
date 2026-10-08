import React from 'react';
import type { Page } from '../App';
import { useGameStore } from '../store';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { page: Page; label: string; icon: string }[] = [
  { page: 'home', label: '櫃檯', icon: '✦' },
  { page: 'draw', label: '抽卡', icon: '▣' },
  { page: 'inventory', label: '卡冊', icon: '▦' },
  { page: 'synthesis', label: '合成', icon: '✧' },
  { page: 'battle', label: '對戰', icon: '⚔' },
  { page: 'shop', label: '商店', icon: '◈' },
  { page: 'achievements', label: '成就', icon: '★' },
  { page: 'settings', label: '設定', icon: '⚙' },
];

const BOTTOM: Page[] = ['home', 'draw', 'inventory', 'battle', 'shop'];

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { player, cards } = useGameStore();
  const bottom = NAV_ITEMS.filter((item) => BOTTOM.includes(item.page));

  return (
    <div className="atelier-bg flex min-h-screen flex-col">
      <header className="glass sticky top-0 z-40 flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" onClick={() => onNavigate('home')} className="text-left">
          <p className="text-[10px] uppercase tracking-[0.28em] text-atelier-muted">CardPlayground</p>
          <h1 className="display text-base font-semibold text-atelier-text">M6a 抽卡櫃</h1>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="rounded-full bg-black/30 px-3 py-1.5 text-sm font-semibold text-atelier-warm"
        >
          {player.softCurrency.toLocaleString()} 幣
        </button>
      </header>

      <nav className="hidden gap-1 overflow-x-auto border-b border-white/10 px-3 py-2 md:flex" aria-label="Primary">
        {NAV_ITEMS.map(({ page, label, icon }) => (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            className={`min-h-11 rounded-full px-4 text-sm ${
              currentPage === page ? 'bg-atelier-warm text-black' : 'text-atelier-muted hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="mr-1" aria-hidden="true">{icon}</span>
            {label}
            {page === 'inventory' ? <span className="ml-2 text-xs">{cards.length}</span> : null}
          </button>
        ))}
      </nav>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-28 md:pb-8">{children}</main>

      <nav
        className="glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 px-1 pt-1 md:hidden"
        style={{ paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom))' }}
        aria-label="Mobile"
      >
        {bottom.map(({ page, label, icon }) => (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            className={`relative flex min-h-12 flex-col items-center justify-center rounded-xl text-[10px] ${
              currentPage === page ? 'text-atelier-warm' : 'text-atelier-muted'
            }`}
          >
            <span className="text-base leading-none" aria-hidden="true">{icon}</span>
            <span className="mt-1">{label}</span>
            {page === 'inventory' && cards.length > 0 ? (
              <span className="absolute right-2 top-0 rounded-full bg-atelier-warm px-1 text-[9px] text-black">{cards.length}</span>
            ) : null}
          </button>
        ))}
      </nav>
    </div>
  );
}
