// Mock the database BEFORE importing anything else
jest.mock('../../config/database', () => ({
  initializeDatabase: jest.fn(),
  collections: {
    players: jest.fn(),
    activeEvents: jest.fn(),
    cards: jest.fn()
  }
}));

// Mock Redis
jest.mock('../../config/redis', () => ({
  initializeRedis: jest.fn().mockResolvedValue(undefined)
}));

import { collections } from '../../config/database';
import { getEventCleanupService } from '../../services/eventCleanupService';
import { ActiveEvent } from '@shared/types/event';

describe('Event Cleanup Integration', () => {
  let mockBatch: any;
  let mockFirestore: any;
  let cleanupService: any;

  beforeEach(() => {
    // Setup mock batch
    mockBatch = {
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    };

    // Setup mock firestore
    mockFirestore = {
      batch: jest.fn().mockReturnValue(mockBatch)
    };

    // Stop cleanup service if running
    cleanupService = getEventCleanupService();
    if (cleanupService.getIsRunning()) {
      cleanupService.stop();
    }

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Stop cleanup service after each test
    if (cleanupService.getIsRunning()) {
      cleanupService.stop();
    }
  });

  describe('Event expiration workflow', () => {
    it('should cleanup expired Lucky Moment event after 10 minutes', async () => {
      const now = new Date();
      const playerId = 'test-player';

      // Create an expired Lucky Moment event (expired 1 minute ago)
      const expiredEvent: ActiveEvent = {
        id: 'event-1',
        playerId: playerId,
        eventType: 'lucky',
        triggeredAt: new Date(now.getTime() - 11 * 60 * 1000).toISOString(), // Triggered 11 minutes ago
        expiresAt: new Date(now.getTime() - 1 * 60 * 1000).toISOString(), // Expired 1 minute ago (10 minutes after trigger)
        luckyMomentBonus: 0.20,
        claimed: false
      };

      // Mock document reference
      const mockDocRef = { ref: 'doc-ref-1' };

      // Mock snapshot
      const mockSnapshot = {
        forEach: (callback: (doc: any) => void) => {
          callback({
            data: () => expiredEvent,
            ref: mockDocRef.ref
          });
        }
      };

      // Mock collections
      (collections.activeEvents as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockSnapshot),
        firestore: mockFirestore
      });

      // Run cleanup
      const cleanedCount = await cleanupService.cleanupExpiredEvents();

      // Verify cleanup removed the expired event
      expect(cleanedCount).toBe(1);
      expect(mockBatch.delete).toHaveBeenCalledWith('doc-ref-1');
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should not cleanup Lucky Moment events that have not expired', async () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

      // Create active Lucky Moment event
      const activeEvent: ActiveEvent = {
        id: 'event-1',
        playerId: 'player-1',
        eventType: 'lucky',
        triggeredAt: now.toISOString(),
        expiresAt: futureTime.toISOString(),
        luckyMomentBonus: 0.20,
        claimed: false
      };

      // Mock the cleanup query
      const mockSnapshot = {
        forEach: (callback: (doc: any) => void) => {
          callback({
            data: () => activeEvent,
            ref: 'doc-ref-1'
          });
        }
      };

      (collections.activeEvents as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockSnapshot),
        firestore: mockFirestore
      });

      // Run cleanup
      const cleanedCount = await cleanupService.cleanupExpiredEvents();

      // Verify no cleanup occurred
      expect(cleanedCount).toBe(0);
      expect(mockBatch.delete).not.toHaveBeenCalled();
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });

    it('should cleanup multiple expired Lucky Moment events', async () => {
      const now = new Date();

      // Create multiple expired events
      const expiredEvents: ActiveEvent[] = [
        {
          id: 'event-1',
          playerId: 'player-1',
          eventType: 'lucky',
          triggeredAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
          expiresAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
          luckyMomentBonus: 0.20,
          claimed: false
        },
        {
          id: 'event-2',
          playerId: 'player-2',
          eventType: 'lucky',
          triggeredAt: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
          expiresAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
          luckyMomentBonus: 0.20,
          claimed: false
        },
        {
          id: 'event-3',
          playerId: 'player-3',
          eventType: 'lucky',
          triggeredAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
          expiresAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
          luckyMomentBonus: 0.20,
          claimed: false
        }
      ];

      // Mock the cleanup query
      const mockSnapshot = {
        forEach: (callback: (doc: any) => void) => {
          expiredEvents.forEach((event, index) => {
            callback({
              data: () => event,
              ref: `doc-ref-${index + 1}`
            });
          });
        }
      };

      (collections.activeEvents as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockSnapshot),
        firestore: mockFirestore
      });

      // Run cleanup
      const cleanedCount = await cleanupService.cleanupExpiredEvents();

      // Verify all expired events were cleaned up
      expect(cleanedCount).toBe(3);
      expect(mockBatch.delete).toHaveBeenCalledTimes(3);
      expect(mockBatch.delete).toHaveBeenCalledWith('doc-ref-1');
      expect(mockBatch.delete).toHaveBeenCalledWith('doc-ref-2');
      expect(mockBatch.delete).toHaveBeenCalledWith('doc-ref-3');
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});
