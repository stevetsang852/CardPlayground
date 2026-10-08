import type { ReactNode } from 'react';
import type { Page } from '../App';
import { useGameStore } from '../store';
import { useI18n } from '../i18n';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

const NAV_ITEMS: { page: Page; key: string; icon: string }[] = [
  { page: 'home', key: 'nav.home', icon: '⌂' },
  { page: 'draw', key: 'nav.draw', icon: '✦' },
  { page: 'synthesis', key: 'nav.synthesis', icon: '⚗' },
  { page: 'inventory', key: 'nav.inventory', icon: '▤' },
  { page: 'battle', key: 'nav.battle', icon: '⚔' },
  { page: 'shop', key: 'nav.shop', icon: '◈' },
  { page: 'achievements', key: 'nav.achievements', icon: '★' },
  { page: 'settings', key: 'nav.settings', icon: '⚙' },
  { page: 'admin', key: 'nav.admin', icon: '✎' },
];

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { player } = useGameStore();
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#10081f]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 py-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-300 to-amber-200 text-lg text-violet-950 shadow-lg shadow-violet-950/50">✦</div>
          <div className="min-w-0 flex-1">
            <h1 className="display truncate text-lg leading-tight text-amber-50">{t('app.title')}</h1>
            <p className="truncate text-[11px] tracking-wide text-violet-200/70">{t('app.tagline')}</p>
          </div>
          <div className="text-right text-xs leading-4">
            <div className="font-semibold text-amber-300">{player.softCurrency.toLocaleString()}</div>
            <div className="text-violet-200/80">🍀 {player.luckValue}</div>
          </div>
          <div className="flex rounded-full border border-white/15 bg-black/30 p-0.5 text-[11px] font-semibold">
            <button type="button" onClick={() => setLocale('zh-Hant')} className={`rounded-full px-2 py-1 ${locale === 'zh-Hant' ? 'bg-amber-100 text-violet-950' : 'text-violet-200'}`}>繁</button>
            <button type="button" onClick={() => setLocale('en')} className={`rounded-full px-2 py-1 ${locale === 'en' ? 'bg-amber-100 text-violet-950' : 'text-violet-200'}`}>EN</button>
          </div>
        </div>
        <nav className="mx-auto grid max-w-5xl grid-cols-5 gap-1 px-2 pb-2 sm:grid-cols-9">
          {NAV_ITEMS.map(({ page, key, icon }) => {
            const active = currentPage === page;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onNavigate(page)}
                className={`flex min-h-11 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-[11px] leading-tight ${
                  active ? 'bg-white/10 text-amber-100 ring-1 ring-amber-200/40' : 'text-violet-200/80'
                }`}
              >
                <span className="text-sm">{icon}</span>
                {t(key)}
              </button>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-4">
        {children}
      </main>
    </div>
  );
}
