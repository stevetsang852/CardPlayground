import { useGameStore } from '../store';
import { getSeasonProgress } from '../game/SeasonService';
import type { Page } from '../App';

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { player, cards, activeEvents, seasonMissions } = useGameStore();
  const seasonProgress = getSeasonProgress(seasonMissions);
  const seasonWidth = Math.min((seasonProgress.completedMissions / Math.max(seasonProgress.nextMilestoneAt, 1)) * 100, 100);

  return (
    <div className="space-y-5">
      <section className="glass relative overflow-hidden rounded-[20px] px-5 py-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.32em] text-atelier-muted">Tonight's table</p>
        <div className="pack-float mx-auto mt-6 h-40 w-28 rounded-2xl border border-amber-200/30 bg-gradient-to-b from-amber-300/80 to-amber-700 shadow-[0_20px_50px_rgba(245,166,35,0.35)]" aria-hidden="true" />
        <h2 className="mt-6 text-2xl font-semibold text-white">Open a five-card pack</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-atelier-muted">3 commons, one uncommon or rare, then the hit slot.</p>
        <button type="button" onClick={() => onNavigate('draw')} className="glow-press mt-6 min-h-12 rounded-full bg-atelier-warm px-8 text-sm font-semibold text-black">
          Step up to the counter
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Coins', player.softCurrency.toLocaleString()],
          ['Luck', String(player.luckValue)],
          ['Pulls', String(player.totalDraws)],
          ['Binder', `${cards.length}`],
        ].map(([label, value]) => (
          <div key={label} className="glass rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-atelier-muted">{label}</div>
            <div className="mt-1 text-lg font-semibold text-white">{value}</div>
          </div>
        ))}
      </section>

      {activeEvents.length > 0 && (
        <section className="glass rounded-2xl p-4">
          <div className="text-sm font-semibold text-atelier-warm">On the table now</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {activeEvents.map((event) => (
              <span key={event.id} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                {event.type.replace('_', ' ')} · {event.remainingActions} left
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="glass rounded-2xl p-4">
        <div className="mb-2 flex justify-between text-xs text-atelier-muted">
          <span>Season</span>
          <span>{seasonProgress.completedMissions} / {seasonProgress.nextMilestoneAt}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/40">
          <div className="h-full bg-atelier-warm" style={{ width: `${seasonWidth}%` }} />
        </div>
        <p className="mt-2 text-xs text-atelier-warm">Next purse {seasonProgress.nextMilestoneReward.toLocaleString()}</p>
      </section>

      <p className="text-xs text-atelier-muted">
        SAR/UR gap {player.drawsSinceLastLegendary} · special gap {player.drawsSinceLastMythic}
      </p>
    </div>
  );
}
