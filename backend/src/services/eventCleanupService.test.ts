import { EventCleanupService } from './eventCleanupService';
import { collections } from '../config/database';
import { ActiveEvent } from '@shared/types/event';

// Mock the database
jest.mock('../config/database', () => ({
  collections: {
    activeEvents: jest.fn()
  }
}));

describe('EventCleanupService', () => {
  let service: EventCleanupService;
  let mockBatch: any;
  let mockFirestore: any;

  beforeEach(() => {
    service = new EventCleanupService();
    
    // Setup mock batch
    mockBatch = {
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    };

    // Setup mock firestore
    mockFirestore = {
      batch: jest.fn().mockReturnValue(mockBatch)
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Stop the service if it's running
    if (service.getIsRunning()) {
      service.stop();
    }
  });

  describe('start and stop', () => {
    it('should start the cleanup service', () => {
      expect(service.getIsRunning()).toBe(false);
      
      service.start(100); // Use short interval for testing
      
      expect(service.getIsRunning()).toBe(true);
    });

    it('should stop the cleanup service', () => {
      service.start(100);
      expect(service.getIsRunning()).toBe(true);
      
      service.stop();
      
      expect(service.getIsRunning()).toBe(false);
    });

    it('should not start if already running', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      service.start(100);
      service.start(100); // Try to start again
      
      expect(consoleSpy).toHaveBeenCalledWith('Event cleanup service is already running');
      
      consoleSpy.mockRestore();
    });

    it('should not stop if not running', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      service.stop(); // Try to stop when not running
      
      expect(consoleSpy).toHaveBeenCalledWith('Event cleanup service is not running');
      
      consoleSpy.mockRestore();
    });
  });

  describe('cleanupExpiredEvents', () => {
    it('should remove expired events from database', async () => {
      const now = new Date();
      const expiredTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
      
      // Create mock expired event
      const expiredEvent: ActiveEvent = {
        id: 'event-1',
        playerId: 'player-1',
        eventType: 'lucky',
        triggeredAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        expiresAt: expiredTime.toISOString(),
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

      const cleanedCount = await service.cleanupExpiredEvents();

      expect(cleanedCount).toBe(1);
      expect(mockBatch.delete).toHaveBeenCalledWith('doc-ref-1');
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should not remove events that have not expired', async () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
      
      // Create mock active event
      const activeEvent: ActiveEvent = {
        id: 'event-2',
        playerId: 'player-2',
        eventType: 'lucky',
        triggeredAt: now.toISOString(),
        expiresAt: futureTime.toISOString(),
        luckyMomentBonus: 0.20,
        claimed: false
      };

      // Mock snapshot
      const mockSnapshot = {
        forEach: (callback: (doc: any) => void) => {
          callback({
            data: () => activeEvent,
            ref: 'doc-ref-2'
          });
        }
      };

      // Mock collections
      (collections.activeEvents as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockSnapshot),
        firestore: mockFirestore
      });

      const cleanedCount = await service.cleanupExpiredEvents();

      expect(cleanedCount).toBe(0);
      expect(mockBatch.delete).not.toHaveBeenCalled();
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });

    it('should not remove events without expiration time', async () => {
      // Create mock event without expiration (like merchant or storm)
      const noExpirationEvent: ActiveEvent = {
        id: 'event-3',
        playerId: 'player-3',
        eventType: 'merchant',
        triggeredAt: new Date().toISOString(),
        merchantOffers: [],
        claimed: false
      };

      // Mock snapshot
      const mockSnapshot = {
        forEach: (callback: (doc: any) => void) => {
          callback({
            data: () => noExpirationEvent,
            ref: 'doc-ref-3'
          });
        }
      };

      // Mock collections
      (collections.activeEvents as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockSnapshot),
        firestore: mockFirestore
      });

      const cleanedCount = await service.cleanupExpiredEvents();

      expect(cleanedCount).toBe(0);
      expect(mockBatch.delete).not.toHaveBeenCalled();
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });

    it('should handle multiple expired events', async () => {
      const now = new Date();
      const expiredTime1 = new Date(now.getTime() - 5 * 60 * 1000);
      const expiredTime2 = new Date(now.getTime() - 10 * 60 * 1000);
      const futureTime = new Date(now.getTime() + 5 * 60 * 1000);
      
      const events: ActiveEvent[] = [
        {
          id: 'event-1',
          playerId: 'player-1',
          eventType: 'lucky',
          triggeredAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
          expiresAt: expiredTime1.toISOString(),
          luckyMomentBonus: 0.20,
          claimed: false
        },
        {
          id: 'event-2',
          playerId: 'player-2',
          eventType: 'lucky',
          triggeredAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
          expiresAt: expiredTime2.toISOString(),
          luckyMomentBonus: 0.20,
          claimed: false
        },
        {
          id: 'event-3',
          playerId: 'player-3',
          eventType: 'lucky',
          triggeredAt: now.toISOString(),
          expiresAt: futureTime.toISOString(),
          luckyMomentBonus: 0.20,
          claimed: false
        }
      ];

      // Mock snapshot
      const mockSnapshot = {
        forEach: (callback: (doc: any) => void) => {
          events.forEach((event, index) => {
            callback({
              data: () => event,
              ref: `doc-ref-${index + 1}`
            });
          });
        }
      };

      // Mock collections
      (collections.activeEvents as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockSnapshot),
        firestore: mockFirestore
      });

      const cleanedCount = await service.cleanupExpiredEvents();

      expect(cleanedCount).toBe(2);
      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.delete).toHaveBeenCalledWith('doc-ref-1');
      expect(mockBatch.delete).toHaveBeenCalledWith('doc-ref-2');
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should handle empty event collection', async () => {
      // Mock empty snapshot
      const mockSnapshot = {
        forEach: (callback: (doc: any) => void) => {
          // No events
        }
      };

      // Mock collections
      (collections.activeEvents as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockSnapshot),
        firestore: mockFirestore
      });

      const cleanedCount = await service.cleanupExpiredEvents();

      expect(cleanedCount).toBe(0);
      expect(mockBatch.delete).not.toHaveBeenCalled();
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      
      // Mock collections to throw error
      (collections.activeEvents as jest.Mock).mockReturnValue({
        get: jest.fn().mockRejectedValue(error)
      });

      await expect(service.cleanupExpiredEvents()).rejects.toThrow('Database connection failed');
    });

    it('should clean up Lucky Moment events after exactly 10 minutes', async () => {
      const now = new Date();
      const exactly10MinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      
      // Create event that expired exactly 10 minutes ago
      const event: ActiveEvent = {
        id: 'event-1',
        playerId: 'player-1',
        eventType: 'lucky',
        triggeredAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
        expiresAt: exactly10MinutesAgo.toISOString(),
        luckyMomentBonus: 0.20,
        claimed: false
      };

      // Mock snapshot
      const mockSnapshot = {
        forEach: (callback: (doc: any) => void) => {
          callback({
            data: () => event,
            ref: 'doc-ref-1'
          });
        }
      };

      // Mock collections
      (collections.activeEvents as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockSnapshot),
        firestore: mockFirestore
      });

      const cleanedCount = await service.cleanupExpiredEvents();

      expect(cleanedCount).toBe(1);
      expect(mockBatch.delete).toHaveBeenCalledWith('doc-ref-1');
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('periodic cleanup', () => {
    it('should run cleanup periodically', async () => {
      jest.useFakeTimers();
      
      // Mock empty snapshot
      const mockSnapshot = {
        forEach: jest.fn()
      };

      // Mock collections
      (collections.activeEvents as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockSnapshot),
        firestore: mockFirestore
      });

      const cleanupSpy = jest.spyOn(service, 'cleanupExpiredEvents');

      // Start service with 100ms interval
      service.start(100);

      // Wait for initial cleanup
      await Promise.resolve();

      // Fast-forward time by 100ms
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Fast-forward time by another 100ms
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Should have been called at least 3 times (initial + 2 intervals)
      expect(cleanupSpy).toHaveBeenCalledTimes(3);

      service.stop();
      jest.useRealTimers();
    });
  });
});
