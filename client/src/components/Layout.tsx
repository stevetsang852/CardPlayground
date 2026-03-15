import React from 'react';
import type { Page } from '../App';
import { useGameStore } from '../store';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { page: Page; label: string; icon: string }[] = [
  { page: 'home',         label: 'Home',        icon: '🏠' },
  { page: 'draw',         label: 'Draw',        icon: '🎴' },
  { page: 'synthesis',    label: 'Synthesis',   icon: '⚗️' },
  { page: 'inventory',    label: 'Inventory',   icon: '🃏' },
  { page: 'shop',         label: 'Shop',        icon: '🛒' },
  { page: 'achievements', label: 'Achievements',icon: '🏆' },
  { page: 'settings',     label: 'Settings',    icon: '⚙️' },
];

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { player } = useGameStore();

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-950 to-blue-950 border-b border-game-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-game-accent text-lg font-bold tracking-widest uppercase">✨ Card Mystery Realm</h1>
        <div className="flex gap-4 text-sm">
          <span className="text-game-gold font-bold">🪙 {player.softCurrency.toLocaleString()}</span>
          <span className="text-purple-300">🍀 {player.luckValue}</span>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-purple-950/50 border-b border-game-border px-2 py-1 flex gap-1 overflow-x-auto">
        {NAV_ITEMS.map(({ page, label, icon }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className={`px-3 py-2 rounded text-sm whitespace-nowrap transition-colors ${
              currentPage === page
                ? 'bg-purple-800 text-game-accent border border-purple-600'
                : 'text-purple-300 hover:bg-purple-900 hover:text-white'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
