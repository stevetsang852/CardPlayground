// Core type definitions for Battle Defense Mode

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type Element = 'fire' | 'ice' | 'nature' | 'light' | 'shadow';
export type SkillType = 'single' | 'aoe' | 'slow' | 'summon' | 'sp_regen' | 'special' | 'ultimate';
export type BattleMode = 'daily_challenge' | 'endless' | 'boss_rush';
export type TalentType = 'sp_bonus' | 'attack_speed' | 'first_wave_reduction' | 'synthesis_luck' | 'coin_harvest';

export interface Talent {
  id: string;
  name: string;
  description: string;
  type: TalentType;
  value: number;
}

export interface Guardian {
  id: string;
  cardId: string;
  level: number; // 1–5
  rarity: Rarity;
  element: Element;
  attack: number;
  hp: number;
  maxHp: number;
  range: number; // 格子數
  attackSpeed: number; // 攻擊間隔（ms）
  skillType: SkillType;
  mythicUsed?: boolean; // 神話大招是否已使用
  gridX: number;
  gridY: number;
}

export interface Enemy {
  id: string;
  hp: number;
  maxHp: number;
  speed: number; // 格/秒
  reward: number; // 擊殺 SP
  gridX: number;
  gridY: number;
  isBoss: boolean;
  pathProgress: number; // 0..1 along the U-shaped path
}

export interface BossEnemy extends Enemy {
  bossType: string;
  specialAbility: string;
}

export interface GridCell {
  x: number;
  y: number;
  guardian: Guardian | null;
}

export interface Deck {
  cards: string[]; // 卡牌 ID 陣列，5–8 張
}

export interface SeriesBonus {
  series: string;
  attackBonus: number; // 0.1 = +10%
}

export interface BattleReward {
  type: 'coin' | 'ticket' | 'material';
  amount: number;
  reason: string;
}

export interface BattleState {
  mode: BattleMode;
  wave: number;
  playerHp: number;
  sp: number;
  grid: GridCell[][];
  enemies: Enemy[];
  deck: Deck;
  activeBonuses: SeriesBonus[];
  rewards: BattleReward[];
  activeTalent?: Talent;
  coins: number;
  synthesisLuckChance?: number;
  coinHarvestBonus?: number;
  firstWaveReduction?: number;
}

export interface Wave {
  waveNumber: number;
  enemies: Enemy[];
  isBossWave: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
