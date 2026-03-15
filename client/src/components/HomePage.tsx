import React from 'react';
import { useGameStore } from '../store';
import { getSeasonProgress } from '../game/SeasonService';
import { CurrencyDisplay } from './CurrencyDisplay';
import type { Page } from '../App';

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { player, cards, activeEvents, seasonMissions } = useGameStore();
  const seasonProgress = getSeasonProgress(seasonMissions);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-game-accent">✨ Card Mystery Realm</h2>

      {/* Player stats */}
      <div className="bg-game-surface border border-game-border rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <div className="text-purple-400 text-xs mb-1">Soft Currency</div>
          <CurrencyDisplay amount={player.softCurrency} />
        </div>
        <div>
          <div className="text-purple-400 text-xs mb-1">Luck Value</div>
          <div className="text-game-gold font-bold">🍀 {player.luckValue}</div>
        </div>
        <div>
          <div className="text-purple-400 text-xs mb-1">Total Draws</div>
          <div className="text-white font-bold">{player.totalDraws}</div>
        </div>
        <div>
          <div className="text-purple-400 text-xs mb-1">Collection</div>
          <div className="text-white font-bold">{cards.length} cards</div>
        </div>
      </div>

      {/* Active events */}
      {activeEvents.length > 0 && (
        <div className="bg-yellow-950/50 border border-yellow-700 rounded-xl p-3">
          <div className="text-yellow-400 text-sm font-bold mb-2">⚡ Active Events</div>
          <div className="flex flex-wrap gap-2">
            {activeEvents.map(event => (
              <div key={event.id} className="bg-yellow-900/50 border border-yellow-700 rounded px-3 py-1 text-xs">
                <span className="text-yellow-300 font-bold">
                  {event.type === 'lucky' ? '🍀 Lucky Moment' :
                   event.type === 'double_drop' ? '✨ Double Drop' :
                   '⚗️ Synthesis Boost'}
                </span>
                <span className="text-yellow-500 ml-2">{event.remainingActions} actions left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Season progress */}
      <div className="bg-game-surface border border-game-border rounded-xl p-4">
        <div className="text-purple-400 text-sm mb-2">📅 Season Progress</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-purple-950 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min((seasonProgress.completedMissions / Math.max(seasonProgress.nextMilestoneAt, 1)) * 100, 100)}%` }}
            />
          </div>
          <span className="text-purple-300 text-xs whitespace-nowrap">
            {seasonProgress.completedMissions} / {seasonProgress.nextMilestoneAt} missions
          </span>
        </div>
        <div className="text-yellow-400 text-xs mt-1">
          Next reward: 🪙 {seasonProgress.nextMilestoneReward.toLocaleString()}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { page: 'draw' as Page,         icon: '🎴', label: 'Draw Cards',    color: 'from-purple-800 to-purple-700' },
          { page: 'synthesis' as Page,    icon: '⚗️', label: 'Synthesis',     color: 'from-blue-800 to-blue-700' },
          { page: 'gallery' as Page,      icon: '🖼️', label: 'Gallery',       color: 'from-indigo-800 to-indigo-700' },
          { page: 'shop' as Page,         icon: '🛒', label: 'System Shop',   color: 'from-green-800 to-green-700' },
          { page: 'achievements' as Page, icon: '🏆', label: 'Achievements',  color: 'from-yellow-800 to-yellow-700' },
          { page: 'settings' as Page,     icon: '⚙️', label: 'Settings',      color: 'from-gray-800 to-gray-700' },
        ].map(({ page, icon, label, color }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className={`bg-gradient-to-br ${color} hover:brightness-110 rounded-xl p-4 text-center transition-all`}
          >
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-white text-sm font-medium">{label}</div>
          </button>
        ))}
      </div>

      {/* Pity info */}
      <div className="bg-game-surface border border-game-border rounded-xl p-3 text-xs text-purple-400">
        <span className="mr-4">⚔️ Legendary pity: {player.drawsSinceLastLegendary} draws</span>
        <span>✨ Mythic pity: {player.drawsSinceLastMythic} draws</span>
      </div>
    </div>
  );
}
