import { create } from 'zustand';
import { dataService } from '../services';
import type { ICardInstance, IGallery, IAchievementProgress, IMarketListing } from '../db';

export interface ActiveEvent {
  id: string;
  type: 'lucky' | 'double_drop' | 'synthesis_boost';
  remainingActions: number;
  multiplier: number;
}

export interface Mission {
  id: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: number; // soft currency
}

export interface PlayerState {
  softCurrency: number;
  hardCurrency: number;
  luckValue: number;
  drawsSinceLastLegendary: number;
  drawsSinceLastMythic: number;
  consecutiveSynthesisFailures: number;
  totalDraws: number;
  loginDays: number;
  lastLoginDate: string; // ISO date string YYYY-MM-DD
  actionCount: number; // total actions for event tracking
}

export interface GameState {
  // Player
  player: PlayerState;
  // Collections
  cards: ICardInstance[];
  gallery: IGallery | null;
  achievements: IAchievementProgress[];
  // Events
  activeEvents: ActiveEvent[];
  // Shop
  marketListings: IMarketListing[];
  lastShopRefreshDate: string; // YYYY-MM-DD
  // Season
  seasonDay: number;
  seasonMissions: Mission[];
  // UI state
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  loadFromDB: () => Promise<void>;
  syncPlayerToDB: () => Promise<void>;
  setPlayer: (update: Partial<PlayerState>) => void;
  addCards: (newCards: ICardInstance[]) => Promise<void>;
  removeCard: (id: number) => Promise<void>;
  setGallery: (gallery: IGallery) => Promise<void>;
  unlockAchievement: (id: string, progress?: number) => Promise<void>;
  setActiveEvents: (events: ActiveEvent[]) => void;
  setMarketListings: (listings: IMarketListing[]) => Promise<void>;
  setLastShopRefreshDate: (date: string) => void;
  incrementActionCount: () => void;
  seedTestData: () => Promise<void>;
}

const DEFAULT_PLAYER: PlayerState = {
  softCurrency: 500, // starting currency
  hardCurrency: 0,
  luckValue: 0,
  drawsSinceLastLegendary: 0,
  drawsSinceLastMythic: 0,
  consecutiveSynthesisFailures: 0,
  totalDraws: 0,
  loginDays: 0,
  lastLoginDate: '',
  actionCount: 0,
};

export const useGameStore = create<GameState>((set, get) => ({
  player: DEFAULT_PLAYER,
  cards: [],
  gallery: null,
  achievements: [],
  activeEvents: [],
  marketListings: [],
  lastShopRefreshDate: '',
  seasonDay: 1,
  seasonMissions: [],
  isLoading: false,
  isInitialized: false,

  loadFromDB: async () => {
    set({ isLoading: true });
    try {
      const [cards, gallery, achievements] = await Promise.all([
        dataService.getCards(),
        dataService.getGallery(),
        dataService.getAchievements(),
      ]);

      // Load player state from settings
      const playerJson = await dataService.getSetting('playerState');
      const player = playerJson ? { ...DEFAULT_PLAYER, ...JSON.parse(playerJson) } : DEFAULT_PLAYER;

      const lastShopRefreshDate = (await dataService.getSetting('lastShopRefreshDate')) ?? '';
      const marketListings = await dataService.getMarketListings();

      set({
        cards,
        gallery: gallery ?? null,
        achievements,
        player,
        marketListings,
        lastShopRefreshDate,
        isLoading: false,
        isInitialized: true,
      });
    } catch (err) {
      console.error('Failed to load from DB:', err);
      set({ isLoading: false, isInitialized: true });
    }
  },

  syncPlayerToDB: async () => {
    const { player } = get();
    await dataService.saveSetting('playerState', JSON.stringify(player));
  },

  setPlayer: (update) => {
    set((state) => ({ player: { ...state.player, ...update } }));
    // Async persist
    get().syncPlayerToDB();
  },

  addCards: async (newCards) => {
    const saved: ICardInstance[] = [];
    for (const card of newCards) {
      const id = await dataService.saveCard(card);
      saved.push({ ...card, id });
    }
    set((state) => ({ cards: [...state.cards, ...saved] }));
  },

  removeCard: async (id) => {
    await dataService.deleteCard(id);
    set((state) => ({ cards: state.cards.filter((c) => c.id !== id) }));
  },

  setGallery: async (gallery) => {
    await dataService.saveGallery(gallery);
    set({ gallery });
  },

  unlockAchievement: async (id, progress) => {
    const existing = get().achievements.find((a) => a.id === id);
    const updated = {
      id,
      unlocked: true,
      progress: progress ?? existing?.progress ?? 1,
      unlockedAt: existing?.unlockedAt ?? Date.now(),
    };
    await dataService.saveAchievement(updated);
    set((state) => ({
      achievements: state.achievements.map((a) => (a.id === id ? updated : a)),
    }));
  },

  setActiveEvents: (events) => set({ activeEvents: events }),

  setMarketListings: async (listings) => {
    await dataService.saveMarketListings(listings);
    await dataService.saveSetting('lastShopRefreshDate', get().lastShopRefreshDate);
    set({ marketListings: listings });
  },

  setLastShopRefreshDate: (date) => {
    set({ lastShopRefreshDate: date });
    dataService.saveSetting('lastShopRefreshDate', date);
  },

  incrementActionCount: () => {
    set((state) => ({
      player: { ...state.player, actionCount: state.player.actionCount + 1 },
    }));
    get().syncPlayerToDB();
  },

  seedTestData: async () => {
    // Set player to resource-rich state
    const richPlayer: PlayerState = {
      softCurrency: 999999,
      hardCurrency: 9999,
      luckValue: 200,
      drawsSinceLastLegendary: 0,
      drawsSinceLastMythic: 0,
      consecutiveSynthesisFailures: 0,
      totalDraws: 500,
      loginDays: 30,
      lastLoginDate: new Date().toISOString().slice(0, 10),
      actionCount: 500,
    };
    set({ player: richPlayer });
    await dataService.saveSetting('playerState', JSON.stringify(richPlayer));

    // Add cards covering all rarities
    const now = Date.now();
    const batch: ICardInstance[] = [
      // 5× each of commons 1–10
      ...[1,2,3,4,5,6,7,8,9,10].flatMap((id) =>
        Array.from({ length: 5 }, (_, i) => ({ cardId: id, obtainedAt: now + i, isNew: false } as ICardInstance))
      ),
      // 3× each of rares 121–130
      ...[121,122,123,124,125,126,127,128,129,130].flatMap((id) =>
        Array.from({ length: 3 }, (_, i) => ({ cardId: id, obtainedAt: now + i, isNew: false } as ICardInstance))
      ),
      // 2× each of epics 171–183
      ...[171,172,173,174,175,176,177,178,179,180,181,182,183].flatMap((id) =>
        Array.from({ length: 2 }, (_, i) => ({ cardId: id, obtainedAt: now + i, isNew: false } as ICardInstance))
      ),
      // 1× each legendary
      ...[196,197,198,199,200,201,202,203].map((id) =>
        ({ cardId: id, obtainedAt: now, isNew: false } as ICardInstance)
      ),
      // 1× each mythic
      ...[204,205,206].map((id) =>
        ({ cardId: id, obtainedAt: now, isNew: false } as ICardInstance)
      ),
    ];
    await get().addCards(batch);
  },
}));
