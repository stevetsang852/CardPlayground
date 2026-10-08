import { useGameStore } from '../store';
import { getSeasonProgress } from '../game/SeasonService';
import { PACK_CONFIGS } from '../game/DrawService';
import type { Page } from '../App';

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { player, cards, activeEvents, seasonMissions } = useGameStore();
  const seasonProgress = getSeasonProgress(seasonMissions);
  const seasonWidth = Math.min((seasonProgress.completedMissions / Math.max(seasonProgress.nextMilestoneAt, 1)) * 100, 100);
  const pack = PACK_CONFIGS[0]!;
  const pityLeft = Math.max(pack.pityLegendaryAt - player.drawsSinceLastLegendary, 0);

  const openCounter = (auto: boolean) => {
    if (auto) sessionStorage.setItem('cardplayground.autoOpen', '1');
    onNavigate('draw');
  };

  return (
    <div className="space-y-5">
      <section className="glass relative overflow-hidden rounded-[28px] px-5 py-7">
        <p className="text-[11px] uppercase tracking-[0.32em] text-atelier-muted">M6a 30th Celebration</p>
        <h2 className="display mt-2 text-4xl text-white">五張一包。<br />最後一張是追逐。</h2>
        <p className="mt-3 max-w-sm text-sm text-atelier-muted">3 張普通，1 張 U/R，再加命中格。SAR / UR 保底還差 {pityLeft} 包。</p>
        <div className="pack-float booster mx-auto mt-6 w-36" aria-hidden="true">
          <span className="booster-seal">30th</span>
          <span className="booster-sheen" />
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => openCounter(true)} className="glow-press min-h-12 flex-1 rounded-full bg-atelier-warm px-6 text-sm font-semibold text-black">
            而家拆 1 包 · {pack.cost}
          </button>
          <button type="button" onClick={() => openCounter(false)} className="glow-press min-h-12 flex-1 rounded-full bg-white/10 px-6 text-sm font-semibold text-white">
            先揀包
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['錢包', player.softCurrency.toLocaleString()],
          ['運氣', String(player.luckValue)],
          ['已抽', String(player.totalDraws)],
          ['卡冊', `${cards.length}`],
        ].map(([label, value]) => (
          <div key={label} className="glass rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-atelier-muted">{label}</div>
            <div className="mt-1 text-lg font-semibold text-white">{value}</div>
          </div>
        ))}
      </section>

      {activeEvents.length > 0 && (
        <section className="glass rounded-2xl p-4">
          <div className="text-sm font-semibold text-atelier-warm">而家限時</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {activeEvents.map((event) => (
              <span key={event.id} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                {event.type.replace('_', ' ')} · 仲餘 {event.remainingActions}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="glass rounded-2xl p-4">
        <div className="mb-2 flex justify-between text-xs text-atelier-muted">
          <span>賽季</span>
          <span>{seasonProgress.completedMissions} / {seasonProgress.nextMilestoneAt}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/40">
          <div className="h-full bg-atelier-warm" style={{ width: `${seasonWidth}%` }} />
        </div>
        <p className="mt-2 text-xs text-atelier-warm">下一檔錢包 {seasonProgress.nextMilestoneReward.toLocaleString()}</p>
      </section>
    </div>
  );
}
