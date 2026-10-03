import { BattleMode } from './BattleTypes';

export interface ModeConfig {
  mode: BattleMode;
  maxWaves: number | null; // null = unlimited
  onlyBosses: boolean;
  milestones: number[];
}

export interface DailyCheckResult {
  allowed: boolean;
  remainingMs?: number; // ms until reset if not allowed
}

const MODE_CONFIGS: Record<BattleMode, ModeConfig> = {
  daily_challenge: {
    mode: 'daily_challenge',
    maxWaves: 20,
    onlyBosses: false,
    milestones: [],
  },
  endless: {
    mode: 'endless',
    maxWaves: null,
    onlyBosses: false,
    milestones: [10, 25, 50, 100],
  },
  boss_rush: {
    mode: 'boss_rush',
    maxWaves: null,
    onlyBosses: true,
    milestones: [],
  },
};

function formatDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDailyKey(date: Date): string {
  return `battle_daily_${formatDateKey(date)}`;
}

function getNextMidnight(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

export class GameModeManager {
  getModeConfig(mode: BattleMode): ModeConfig {
    return MODE_CONFIGS[mode];
  }

  checkDailyChallenge(now: Date = new Date()): DailyCheckResult {
    const key = getDailyKey(now);
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const nextMidnight = getNextMidnight(now);
      const remainingMs = nextMidnight.getTime() - now.getTime();
      return { allowed: false, remainingMs };
    }
    return { allowed: true };
  }

  completeDailyChallenge(now: Date = new Date()): void {
    const key = getDailyKey(now);
    localStorage.setItem(key, String(now.getTime()));
  }

  isMilestone(wave: number, mode: BattleMode): boolean {
    const config = this.getModeConfig(mode);
    return config.milestones.includes(wave);
  }

  getHighScore(mode: BattleMode): number {
    const key = `battle_highscore_${mode}`;
    const stored = localStorage.getItem(key);
    return stored !== null ? parseInt(stored, 10) : 0;
  }

  setHighScore(mode: BattleMode, wave: number): void {
    const key = `battle_highscore_${mode}`;
    const current = this.getHighScore(mode);
    if (wave > current) {
      localStorage.setItem(key, String(wave));
    }
  }
}
