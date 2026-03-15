import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { ACHIEVEMENT_DEFINITIONS, getAllAchievementProgress } from '../game/AchievementService';
import type { IAchievementProgress } from '../db';

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
      <div
        className="h-2 rounded-full transition-all bg-gradient-to-r from-yellow-500 to-green-400"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface AchievementCardProps {
  defId: string;
  name: string;
  description: string;
  target: number;
  reward: number;
  progress: IAchievementProgress;
}

function AchievementCard({ name, description, target, reward, progress }: AchievementCardProps) {
  const unlocked = progress.unlocked;
  const current = progress.progress ?? 0;

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-2 transition-all ${
        unlocked
          ? 'border-yellow-500 bg-yellow-900/30 shadow-md shadow-yellow-900/20'
          : 'border-gray-700 bg-gray-800/50 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{unlocked ? '🏆' : '🔒'}</span>
          <div>
            <div className={`font-bold text-sm ${unlocked ? 'text-yellow-300' : 'text-gray-400'}`}>{name}</div>
            <div className="text-xs text-gray-500">{description}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-game-gold font-semibold">🪙 {reward.toLocaleString()}</div>
          {unlocked && progress.unlockedAt && (
            <div className="text-xs text-gray-500 mt-0.5">
              {new Date(progress.unlockedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>Progress</span>
          <span>{current} / {target}</span>
        </div>
        <ProgressBar current={current} target={target} />
      </div>
    </div>
  );
}

export function AchievementsPage() {
  const { player, cards, achievements } = useGameStore();

  const allProgress = useMemo(
    () => getAllAchievementProgress(player, cards, achievements),
    [player, cards, achievements]
  );

  const progressMap = useMemo(
    () => new Map(allProgress.map((p) => [p.id, p])),
    [allProgress]
  );

  const unlockedCount = allProgress.filter((p) => p.unlocked).length;
  const totalRewardsEarned = useMemo(() => {
    return ACHIEVEMENT_DEFINITIONS.filter((def) => progressMap.get(def.id)?.unlocked).reduce(
      (sum, def) => sum + def.reward,
      0
    );
  }, [progressMap]);

  const recentlyUnlocked = useMemo(() => {
    return allProgress
      .filter((p) => p.unlocked && p.unlockedAt != null)
      .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))
      .slice(0, 5);
  }, [allProgress]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-game-accent">🏆 Achievements</h2>
        <div className="text-right">
          <div className="text-yellow-300 font-bold text-sm">
            {unlockedCount} / {ACHIEVEMENT_DEFINITIONS.length} unlocked
          </div>
          <div className="text-game-gold text-xs">🪙 {totalRewardsEarned.toLocaleString()} earned</div>
        </div>
      </div>

      {/* Recently Unlocked */}
      {recentlyUnlocked.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Recently Unlocked</h3>
          <div className="flex flex-col gap-2">
            {recentlyUnlocked.map((p) => {
              const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === p.id);
              if (!def) return null;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-green-700 bg-green-900/20 px-4 py-2"
                >
                  <span className="text-xl">🏆</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-green-300 truncate">{def.name}</div>
                    <div className="text-xs text-gray-500">
                      {p.unlockedAt ? new Date(p.unlockedAt).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className="text-xs text-game-gold font-semibold shrink-0">🪙 +{def.reward.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Achievements */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">All Achievements</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACHIEVEMENT_DEFINITIONS.map((def) => {
            const progress = progressMap.get(def.id) ?? { id: def.id, unlocked: false, progress: 0 };
            return (
              <AchievementCard
                key={def.id}
                defId={def.id}
                name={def.name}
                description={def.description}
                target={def.target}
                reward={def.reward}
                progress={progress}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
