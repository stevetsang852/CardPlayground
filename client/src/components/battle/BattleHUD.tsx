// BattleHUD.tsx — game-style HUD overlay with animated bars
import type { SeriesBonus, Guardian, Talent } from '../../game/battle/BattleTypes';

const SERIES_ICON: Record<string, string> = {
  'Volcanic Origins': '🔥', 'Frozen Age': '❄️', 'Mystic Forest': '🌿',
  'Sacred Light': '✨', 'Shadow Abyss': '🌑', 'Beyond': '🌌',
};
function seriesIcon(s: string) {
  for (const [k, v] of Object.entries(SERIES_ICON)) if (s.includes(k)) return v;
  return '⭐';
}

export interface BattleHUDProps {
  playerHp: number; maxHp: number; sp: number; coins: number; wave: number;
  countdown: number; activeBonuses: SeriesBonus[];
  mythicGuardian?: Guardian | null; onMythicUltimate?: () => void;
  activeTalent?: Talent | null;
}

export function BattleHUD({ playerHp, maxHp, sp, coins, wave, countdown, activeBonuses, mythicGuardian, onMythicUltimate, activeTalent }: BattleHUDProps) {
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (playerHp / maxHp) * 100)) : 0;
  const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#eab308' : '#ef4444';
  const mythicUsed = mythicGuardian?.mythicUsed ?? false;
  const urgent = countdown > 0 && countdown <= 3;

  return (
    <div className="select-none pointer-events-none w-full flex flex-col gap-1.5">
      {/* Main HUD bar */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl pointer-events-auto"
        style={{ background: 'linear-gradient(135deg, rgba(10,15,30,0.95) 0%, rgba(20,25,50,0.95) 100%)', border: '1px solid rgba(80,120,200,0.3)', boxShadow: '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

        {/* HP section */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <span className="text-lg">❤️</span>
          <div className="flex flex-col gap-0.5 flex-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-300 font-bold">{playerHp}<span className="text-gray-500">/{maxHp}</span></span>
              <span className="text-gray-500 text-[10px]">HP</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden w-24" style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${hpPct}%`, background: `linear-gradient(90deg, ${hpColor}aa, ${hpColor})`, boxShadow: `0 0 6px ${hpColor}88` }} />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-700/60" />

        {/* SP */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">SP</span>
          <span className="text-yellow-300 font-bold text-lg leading-none" style={{ textShadow: '0 0 8px #fbbf24' }}>⚡{sp}</span>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-700/60" />

        {/* Coins */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Coins</span>
          <span className="text-amber-400 font-bold text-lg leading-none" style={{ textShadow: '0 0 8px #f59e0b' }}>💰{coins}</span>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-700/60" />

        {/* Wave */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Wave</span>
          <span className="text-blue-300 font-bold text-lg leading-none" style={{ textShadow: '0 0 8px #60a5fa' }}>🌊{wave}</span>
        </div>

        {/* Countdown */}
        {countdown > 0 && (
          <>
            <div className="h-8 w-px bg-gray-700/60" />
            <div className={`flex flex-col items-center ml-auto ${urgent ? 'animate-pulse' : ''}`}>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Next</span>
              <span className={`font-bold text-lg leading-none ${urgent ? 'text-red-400' : 'text-gray-300'}`}
                style={{ textShadow: urgent ? '0 0 8px #f87171' : 'none' }}>⏱{countdown}s</span>
            </div>
          </>
        )}

        {/* Mythic button */}
        {mythicGuardian && (
          <button onClick={!mythicUsed ? onMythicUltimate : undefined} disabled={mythicUsed}
            className={`ml-auto pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${mythicUsed ? 'bg-gray-800/60 border-gray-600 text-gray-500 cursor-not-allowed opacity-50' : 'border-pink-500/60 text-pink-300 hover:border-pink-400 active:scale-95'}`}
            style={!mythicUsed ? { background: 'linear-gradient(135deg, rgba(190,24,93,0.3), rgba(219,39,119,0.2))', boxShadow: '0 0 12px rgba(236,72,153,0.3)' } : {}}>
            💫 {mythicUsed ? '已使用' : '神話大招'}
          </button>
        )}
      </div>

      {/* Series bonus tags + active talent */}
      {(activeBonuses.length > 0 || activeTalent) && (
        <div className="flex flex-wrap gap-1.5 px-1 pointer-events-none">
          {activeTalent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(96,165,250,0.4)', color: '#93c5fd' }}>
              🎯 {activeTalent.name}: {activeTalent.description}
            </span>
          )}
          {activeBonuses.map((b) => (
            <span key={b.series} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(194,120,0,0.2)', border: '1px solid rgba(251,146,60,0.4)', color: '#fb923c' }}>
              {seriesIcon(b.series)} {b.series} <span className="text-green-400">+{Math.round(b.attackBonus * 100)}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
