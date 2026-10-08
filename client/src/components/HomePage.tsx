import React from 'react';
import { useGameStore } from '../store';
import { getSeasonProgress } from '../game/SeasonService';
import { CurrencyDisplay } from './CurrencyDisplay';
import type { Page } from '../App';
import { useI18n } from '../i18n';

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { player, cards, activeEvents, seasonMissions } = useGameStore();
  const { t } = useI18n();
  const seasonProgress = getSeasonProgress(seasonMissions);

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: t('home.currency'), value: <CurrencyDisplay amount={player.softCurrency} /> },
          { label: t('home.luck'), value: <span className="font-semibold text-amber-300">🍀 {player.luckValue}</span> },
          { label: t('home.draws'), value: <span className="font-semibold text-white">{player.totalDraws}</span> },
          { label: t('home.collection'), value: <span className="font-semibold text-white">{t('home.collectionCount', { n: cards.length })}</span> },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="text-[11px] uppercase tracking-wide text-violet-200/70">{item.label}</div>
            <div className="mt-1 text-sm">{item.value}</div>
          </div>
        ))}
      </section>

      {activeEvents.length > 0 && (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-950/40 p-3">
          <div className="mb-2 text-sm font-semibold text-amber-200">{t('home.events')}</div>
          <div className="flex flex-wrap gap-2">
            {activeEvents.map(event => (
              <div key={event.id} className="rounded-full border border-amber-200/20 px-3 py-1 text-xs text-amber-100">
                {t(`home.event.${event.type}`)}
                <span className="ml-2 text-amber-200/70">{t('home.actionsLeft', { n: event.remainingActions })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 text-sm text-violet-100">{t('home.season')}</div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-violet-950">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-amber-300"
              style={{ width: `${Math.min((seasonProgress.completedMissions / Math.max(seasonProgress.nextMilestoneAt, 1)) * 100, 100)}%` }}
            />
          </div>
          <span className="whitespace-nowrap text-xs text-violet-200">
            {t('home.missions', { done: seasonProgress.completedMissions, total: seasonProgress.nextMilestoneAt })}
          </span>
        </div>
        <div className="mt-2 text-xs text-amber-200">
          {t('home.nextReward', { n: seasonProgress.nextMilestoneReward.toLocaleString() })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          { page: 'draw' as Page, label: t('home.draw') },
          { page: 'synthesis' as Page, label: t('home.synthesis') },
          { page: 'battle' as Page, label: t('home.battle') },
          { page: 'shop' as Page, label: t('home.shop') },
          { page: 'achievements' as Page, label: t('home.achievements') },
          { page: 'settings' as Page, label: t('home.settings') },
        ].map(({ page, label }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-900/80 to-violet-950/40 px-3 py-4 text-left text-sm font-medium text-amber-50"
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-violet-200/70">
        {t('home.legendPity', { n: player.drawsSinceLastLegendary })}
        <span className="mx-2">·</span>
        {t('home.mythicPity', { n: player.drawsSinceLastMythic })}
      </p>
    </div>
  );
}
