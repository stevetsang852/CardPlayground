import { lazy, Suspense, useEffect, useState } from 'react';
import { useGameStore } from './store';
import { checkDailyLogin, generateDailyMissions } from './game/SeasonService';
import { checkAchievements } from './game/AchievementService';
import { Layout } from './components/Layout';
import { HomePage } from './components/HomePage';
import { hydrateCatalog } from './game/adminCatalog';
import { useI18n } from './i18n';

const DrawPage = lazy(() => import('./components/DrawPage').then((m) => ({ default: m.DrawPage })));
const SynthesisPage = lazy(() => import('./components/SynthesisPage').then((m) => ({ default: m.SynthesisPage })));
const InventoryPage = lazy(() => import('./components/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const ShopPage = lazy(() => import('./components/ShopPage').then((m) => ({ default: m.ShopPage })));
const AchievementsPage = lazy(() => import('./components/AchievementsPage').then((m) => ({ default: m.AchievementsPage })));
const SettingsPage = lazy(() => import('./components/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const BattlePage = lazy(() => import('./components/battle/BattlePage').then((m) => ({ default: m.BattlePage })));
const AdminPage = lazy(() => import('./components/AdminPage').then((m) => ({ default: m.AdminPage })));

hydrateCatalog();

export type Page = 'home' | 'draw' | 'synthesis' | 'inventory' | 'shop' | 'achievements' | 'settings' | 'battle' | 'admin';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const { loadFromDB, isInitialized, isLoading, player, cards, achievements, setPlayer, seasonMissions } = useGameStore();
  const { t } = useI18n();

  // Load data from IndexedDB on mount
  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  // Handle daily login check after data is loaded
  useEffect(() => {
    if (!isInitialized) return;

    const loginResult = checkDailyLogin(player);
    if (loginResult.isNewDay) {
      setPlayer(loginResult.updatedPlayer as typeof player);
      // Generate fresh daily missions if needed
      if (seasonMissions.length === 0) {
        useGameStore.setState({ seasonMissions: generateDailyMissions() });
      }
    }

    // Check achievements
    const { newlyUnlocked, currencyReward } = checkAchievements(player, cards, achievements);
    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(a => useGameStore.getState().unlockAchievement(a.id, a.progress));
      if (currencyReward > 0) {
        setPlayer({ softCurrency: player.softCurrency + currencyReward });
      }
    }
  }, [isInitialized]);

  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-game-bg flex items-center justify-center">
        <div className="display text-xl text-amber-100 animate-pulse">{t('app.loading')}</div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':        return <HomePage onNavigate={setCurrentPage} />;
      case 'draw':        return <DrawPage />;
      case 'synthesis':   return <SynthesisPage />;
      case 'inventory':   return <InventoryPage />;
      case 'shop':        return <ShopPage />;
      case 'achievements':return <AchievementsPage />;
      case 'settings':    return <SettingsPage />;
      case 'battle':      return <BattlePage onBack={() => setCurrentPage('home')} />;
      case 'admin':       return <AdminPage />;
      default:            return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      <Suspense fallback={<div className="py-16 text-center text-amber-100">{t('app.loading')}</div>}>
        {renderPage()}
      </Suspense>
    </Layout>
  );
}
