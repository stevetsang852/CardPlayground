import type { PlayerState, Mission } from '../store/gameStore';

export interface LoginResult {
  isNewDay: boolean;
  reward: number; // soft currency
  updatedPlayer: Partial<PlayerState>;
}

export interface MissionResult {
  success: boolean;
  reward: number;
  error?: string;
}

export interface SeasonProgress {
  currentDay: number;
  totalMissions: number;
  completedMissions: number;
  nextMilestoneAt: number;
  nextMilestoneReward: number;
}

// Season milestones: every 5 completed missions gives a reward
const MILESTONE_REWARDS: Record<number, number> = {
  5:  500,
  10: 1000,
  15: 2000,
  20: 3000,
  25: 5000,
  30: 10000,
};

// Daily missions pool
export const DAILY_MISSIONS: Omit<Mission, 'progress' | 'completed'>[] = [
  { id: 'draw_3',       description: 'Draw 3 cards today',          target: 3,  reward: 100 },
  { id: 'draw_10',      description: 'Draw 10 cards today',         target: 10, reward: 300 },
  { id: 'synthesize_1', description: 'Perform 1 synthesis',         target: 1,  reward: 150 },
  { id: 'synthesize_3', description: 'Perform 3 syntheses',         target: 3,  reward: 400 },
  { id: 'visit_shop',   description: 'Visit the system shop',       target: 1,  reward: 50  },
  { id: 'purchase_1',   description: 'Purchase 1 item from shop',   target: 1,  reward: 200 },
];

/**
 * Check daily login — awards bonus if it's a new day.
 * Uses ISO date string (YYYY-MM-DD) for comparison.
 */
export function checkDailyLogin(player: PlayerState): LoginResult {
  const today = new Date().toISOString().slice(0, 10);
  const isNewDay = player.lastLoginDate !== today;

  if (!isNewDay) {
    return { isNewDay: false, reward: 0, updatedPlayer: {} };
  }

  const loginDays = player.loginDays + 1;
  // Daily reward scales with login streak (capped at 500)
  const reward = Math.min(100 + loginDays * 10, 500);

  return {
    isNewDay: true,
    reward,
    updatedPlayer: {
      lastLoginDate: today,
      loginDays,
      softCurrency: player.softCurrency + reward,
    },
  };
}

/**
 * Complete a mission and award its reward.
 */
export function completeMission(
  missionId: string,
  missions: Mission[],
  player: PlayerState
): MissionResult {
  const mission = missions.find(m => m.id === missionId);
  if (!mission) return { success: false, reward: 0, error: 'Mission not found' };
  if (mission.completed) return { success: false, reward: 0, error: 'Mission already completed' };

  return {
    success: true,
    reward: mission.reward,
  };
}

/**
 * Get current season progress.
 */
export function getSeasonProgress(missions: Mission[]): SeasonProgress {
  const completed = missions.filter(m => m.completed).length;
  const total = missions.length;

  // Find next milestone
  const milestoneKeys = Object.keys(MILESTONE_REWARDS).map(Number).sort((a, b) => a - b);
  const nextMilestone = milestoneKeys.find(k => k > completed) ?? milestoneKeys[milestoneKeys.length - 1]!;

  return {
    currentDay: 1,
    totalMissions: total,
    completedMissions: completed,
    nextMilestoneAt: nextMilestone,
    nextMilestoneReward: MILESTONE_REWARDS[nextMilestone] ?? 0,
  };
}

/**
 * Generate a fresh set of daily missions.
 */
export function generateDailyMissions(): Mission[] {
  return DAILY_MISSIONS.map(m => ({ ...m, progress: 0, completed: false }));
}

/**
 * Check if a milestone reward should be given.
 */
export function checkMilestoneReward(completedCount: number): number {
  return MILESTONE_REWARDS[completedCount] ?? 0;
}
