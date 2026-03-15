import { useEffect, useState } from 'react';
import { useGameStore } from './store';
import { checkDailyLogin, generateDailyMissions } from './game/SeasonService';
import { checkAchievements } from './game/AchievementService';
import { Layout } from './components/Layout';
import { HomePage } from './components/HomePage';
import { DrawPage } from './components/DrawPage';
import { SynthesisPage } from './components/SynthesisPage';
import { InventoryPage } from './components/InventoryPage';
import { ShopPage } from './components/ShopPage';
import { AchievementsPage } from './components/AchievementsPage';
import { SettingsPage } from './components/SettingsPage';

export type Page = 'home' | 'draw' | 'synthesis' | 'inventory' | 'shop' | 'achievements' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const { loadFromDB, isInitialized, isLoading, player, cards, achievements, setPlayer, seasonMissions } = useGameStore();

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
        <div className="text-game-accent text-xl animate-pulse">Loading Card Mystery Realm...</div>
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
      default:            return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}
