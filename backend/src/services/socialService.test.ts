import { SocialService } from './socialService';
import { Firestore } from 'firebase-admin/firestore';
import { GalleryInteraction } from '../../../shared/src/types/gallery';
import fc from 'fast-check';

/**
 * Test suite for SocialService
 * 
 * Tests like rate limiting, comment tracking, and social interaction functionality
 */

// Mock Firestore
class MockFirestore {
  private data: Map<string, any> = new Map();
  private currentCollection: string = '';
  private queryFilters: Array<{ field: string; op: string; value: any }> = [];
  private queryLimit: number = Infinity;
  private queryOrderBy: { field: string; direction: string } | null = null;

  collection(name: string) {
    // Create a new instance that shares the data store
    const newInstance = new MockFirestore();
    newInstance.data = this.data; // Share the same data store
    newInstance.currentCollection = name;
    return newInstance;
  }

  doc(id?: string) {
    const docId = id || this.generateId();
    const collectionName = this.currentCollection;
    const dataStore = this.data;
    
    return {
      id: docId,
      set: async (data: any) => {
        dataStore.set(`${collectionName}/${docId}`, data);
      },
      get: async () => {
        const data = dataStore.get(`${collectionName}/${docId}`);
        return {
          exists: !!data,
          data: () => data,
        };
      },
      update: async (updates: any) => {
        const key = `${collectionName}/${docId}`;
        const existingData = dataStore.get(key) || {};
        dataStore.set(key, { ...existingData, ...updates });
      },
    };
  }

  async runTransaction(updateFunction: (transaction: any) => Promise<void>) {
    const dataStore = this.data;
    const transaction = {
      get: async (docRef: any) => {
        // Extract collection from the docRef's parent path
        // The docRef should have been created with collection().doc()
        // We need to find the data using the full path
        let foundData = null;
        let foundKey = null;
        
        // Search for the document in the data store
        for (const [key, value] of dataStore.entries()) {
          if (key.endsWith(`/${docRef.id}`)) {
            foundData = value;
            foundKey = key;
            break;
          }
        }
        
        return {
          exists: !!foundData,
          data: () => foundData,
          id: docRef.id,
        };
      },
      update: (docRef: any, updates: any) => {
        // Find and update the document
        for (const [key, value] of dataStore.entries()) {
          if (key.endsWith(`/${docRef.id}`)) {
            dataStore.set(key, { ...value, ...updates });
            return;
          }
        }
      },
    };
    
    await updateFunction(transaction);
  }

  where(field: string, op: string, value: any) {
    this.queryFilters.push({ field, op, value });
    return this;
  }

  orderBy(field: string, direction: string) {
    this.queryOrderBy = { field, direction };
    return this;
  }

  limit(count: number) {
    this.queryLimit = count;
    return this;
  }

  async get() {
    // Filter data based on query
    const results: any[] = [];
    this.data.forEach((value, key) => {
      if (key.startsWith(this.currentCollection + '/')) {
        // Apply filters
        let matches = true;
        for (const filter of this.queryFilters) {
          const fieldValue = value[filter.field];
          
          switch (filter.op) {
            case '==':
              if (fieldValue !== filter.value) matches = false;
              break;
            case '>':
              if (!(fieldValue > filter.value)) matches = false;
              break;
            case '<':
              if (!(fieldValue < filter.value)) matches = false;
              break;
            case '>=':
              if (!(fieldValue >= filter.value)) matches = false;
              break;
            case '<=':
              if (!(fieldValue <= filter.value)) matches = false;
              break;
          }
          
          if (!matches) break;
        }
        
        if (matches) {
          results.push({
            data: () => value,
          });
        }
      }
    });

    // Apply ordering
    if (this.queryOrderBy) {
      const { field, direction } = this.queryOrderBy;
      results.sort((a, b) => {
        const aVal = a.data()[field];
        const bVal = b.data()[field];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === 'desc' ? -comparison : comparison;
      });
    }

    // Apply limit
    const limitedResults = results.slice(0, this.queryLimit);

    return {
      empty: limitedResults.length === 0,
      docs: limitedResults,
    };
  }

  count() {
    return {
      get: async () => {
        const result = await this.get();
        return { data: () => ({ count: result.docs.length }) };
      },
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Helper to clear data between tests
  clear() {
    this.data.clear();
  }

  // Helper to add test data
  addData(collection: string, id: string, data: any) {
    this.data.set(`${collection}/${id}`, data);
  }

  // Helper to get test data
  getData(collection: string, id: string): any {
    return this.data.get(`${collection}/${id}`);
  }

  // Helper to get all data entries
  getAllEntries(): Array<[string, any]> {
    return Array.from(this.data.entries());
  }
}

describe('SocialService', () => {
  let mockDb: MockFirestore;
  let socialService: SocialService;

  beforeEach(() => {
    mockDb = new MockFirestore();
    socialService = new SocialService(mockDb as any as Firestore);
    
    // Add default test players for all tests
    mockDb.addData('players', 'player1', {
      id: 'player1',
      username: 'Player 1',
      softCurrency: 100,
    });
    mockDb.addData('players', 'player2', {
      id: 'player2',
      username: 'Player 2',
      softCurrency: 50,
    });
    mockDb.addData('players', 'player3', {
      id: 'player3',
      username: 'Player 3',
      softCurrency: 75,
    });
  });

  afterEach(() => {
    mockDb.clear();
  });

  describe('canLikeGallery', () => {
    it('should return false if player tries to like their own gallery', async () => {
      const playerId = 'player1';
      const canLike = await socialService.canLikeGallery(playerId, playerId);
      expect(canLike).toBe(false);
    });

    it('should return true if player has never liked the gallery', async () => {
      const canLike = await socialService.canLikeGallery('player1', 'player2');
      expect(canLike).toBe(true);
    });

    it('should return false if player liked the gallery within 24 hours', async () => {
      // Add a recent like
      const recentLike: GalleryInteraction = {
        id: 'like1',
        galleryPlayerId: 'player2',
        interactingPlayerId: 'player1',
        type: 'like',
        createdAt: new Date().toISOString(),
      };
      mockDb.addData('gallery_interactions', 'like1', recentLike);

      const canLike = await socialService.canLikeGallery('player1', 'player2');
      expect(canLike).toBe(false);
    });

    it('should return true if player liked the gallery more than 24 hours ago', async () => {
      // Add an old like (25 hours ago)
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25);
      
      const oldLike: GalleryInteraction = {
        id: 'like1',
        galleryPlayerId: 'player2',
        interactingPlayerId: 'player1',
        type: 'like',
        createdAt: oldDate.toISOString(),
      };
      mockDb.addData('gallery_interactions', 'like1', oldLike);

      const canLike = await socialService.canLikeGallery('player1', 'player2');
      expect(canLike).toBe(true);
    });
  });

  describe('recordLike', () => {
    it('should throw error if player tries to like their own gallery', async () => {
      await expect(
        socialService.recordLike('player1', 'player1')
      ).rejects.toThrow('Cannot like your own gallery');
    });

    it('should throw error if player tries to like within 24 hours', async () => {
      // First like should succeed
      await socialService.recordLike('player1', 'player2');

      // Second like within 24 hours should fail
      await expect(
        socialService.recordLike('player1', 'player2')
      ).rejects.toThrow('Like rate limit exceeded');
    });

    it('should create a like interaction with correct data', async () => {
      const interaction = await socialService.recordLike('player1', 'player2');

      expect(interaction.galleryPlayerId).toBe('player2');
      expect(interaction.interactingPlayerId).toBe('player1');
      expect(interaction.type).toBe('like');
      expect(interaction.id).toBeDefined();
      expect(interaction.createdAt).toBeDefined();
    });
  });

  describe('recordComment', () => {
    it('should create a comment interaction with correct data', async () => {
      const commentText = 'Great collection!';
      const interaction = await socialService.recordComment('player1', 'player2', commentText);

      expect(interaction.galleryPlayerId).toBe('player2');
      expect(interaction.interactingPlayerId).toBe('player1');
      expect(interaction.type).toBe('comment');
      expect(interaction.text).toBe(commentText);
      expect(interaction.id).toBeDefined();
      expect(interaction.createdAt).toBeDefined();
    });
  });

  describe('getLastLikeTimestamp', () => {
    it('should return null if player has never liked the gallery', async () => {
      const timestamp = await socialService.getLastLikeTimestamp('player1', 'player2');
      expect(timestamp).toBeNull();
    });

    it('should return the timestamp of the most recent like', async () => {
      const now = new Date().toISOString();
      const like: GalleryInteraction = {
        id: 'like1',
        galleryPlayerId: 'player2',
        interactingPlayerId: 'player1',
        type: 'like',
        createdAt: now,
      };
      mockDb.addData('gallery_interactions', 'like1', like);

      const timestamp = await socialService.getLastLikeTimestamp('player1', 'player2');
      expect(timestamp).toBe(now);
    });
  });

  describe('getTimeUntilNextLike', () => {
    it('should return 0 if player has never liked the gallery', async () => {
      const timeRemaining = await socialService.getTimeUntilNextLike('player1', 'player2');
      expect(timeRemaining).toBe(0);
    });

    it('should return positive time if within 24 hour window', async () => {
      // Like 1 hour ago
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const like: GalleryInteraction = {
        id: 'like1',
        galleryPlayerId: 'player2',
        interactingPlayerId: 'player1',
        type: 'like',
        createdAt: oneHourAgo.toISOString(),
      };
      mockDb.addData('gallery_interactions', 'like1', like);

      const timeRemaining = await socialService.getTimeUntilNextLike('player1', 'player2');
      
      // Should be approximately 23 hours (in milliseconds)
      const expectedTime = 23 * 60 * 60 * 1000;
      expect(timeRemaining).toBeGreaterThan(expectedTime - 60000); // Within 1 minute tolerance
      expect(timeRemaining).toBeLessThan(expectedTime + 60000);
    });

    it('should return 0 if more than 24 hours have passed', async () => {
      // Like 25 hours ago
      const twentyFiveHoursAgo = new Date();
      twentyFiveHoursAgo.setHours(twentyFiveHoursAgo.getHours() - 25);
      
      const like: GalleryInteraction = {
        id: 'like1',
        galleryPlayerId: 'player2',
        interactingPlayerId: 'player1',
        type: 'like',
        createdAt: twentyFiveHoursAgo.toISOString(),
      };
      mockDb.addData('gallery_interactions', 'like1', like);

      const timeRemaining = await socialService.getTimeUntilNextLike('player1', 'player2');
      expect(timeRemaining).toBe(0);
    });
  });

  describe('getLikeCount', () => {
    it('should return 0 if gallery has no likes', async () => {
      const count = await socialService.getLikeCount('player1');
      expect(count).toBe(0);
    });

    it('should return correct count of likes', async () => {
      // Add multiple likes
      const like1: GalleryInteraction = {
        id: 'like1',
        galleryPlayerId: 'player1',
        interactingPlayerId: 'player2',
        type: 'like',
        createdAt: new Date().toISOString(),
      };
      const like2: GalleryInteraction = {
        id: 'like2',
        galleryPlayerId: 'player1',
        interactingPlayerId: 'player3',
        type: 'like',
        createdAt: new Date().toISOString(),
      };
      
      mockDb.addData('gallery_interactions', 'like1', like1);
      mockDb.addData('gallery_interactions', 'like2', like2);

      const count = await socialService.getLikeCount('player1');
      expect(count).toBe(2);
    });
  });

  describe('getCommentCount', () => {
    it('should return 0 if gallery has no comments', async () => {
      const count = await socialService.getCommentCount('player1');
      expect(count).toBe(0);
    });

    it('should return correct count of comments', async () => {
      // Add multiple comments
      const comment1: GalleryInteraction = {
        id: 'comment1',
        galleryPlayerId: 'player1',
        interactingPlayerId: 'player2',
        type: 'comment',
        text: 'Nice!',
        createdAt: new Date().toISOString(),
      };
      const comment2: GalleryInteraction = {
        id: 'comment2',
        galleryPlayerId: 'player1',
        interactingPlayerId: 'player3',
        type: 'comment',
        text: 'Great collection!',
        createdAt: new Date().toISOString(),
      };
      
      mockDb.addData('gallery_interactions', 'comment1', comment1);
      mockDb.addData('gallery_interactions', 'comment2', comment2);

      const count = await socialService.getCommentCount('player1');
      expect(count).toBe(2);
    });
  });

  describe('Rate limiting edge cases', () => {
    it('should track likes independently per gallery-player pair', async () => {
      // Player1 likes Player2's gallery
      const like1 = await socialService.recordLike('player1', 'player2');
      expect(like1.interactingPlayerId).toBe('player1');
      expect(like1.galleryPlayerId).toBe('player2');
      
      // Player2 should still be able to like Player1's gallery (different pair)
      const canLike = await socialService.canLikeGallery('player2', 'player1');
      expect(canLike).toBe(true);

      // And the like should succeed
      const like2 = await socialService.recordLike('player2', 'player1');
      expect(like2.interactingPlayerId).toBe('player2');
      expect(like2.galleryPlayerId).toBe('player1');
    });
  });

  describe('Social interaction rewards', () => {
    it('should grant 10 soft currency to gallery owner when receiving a like', async () => {
      // Player1 likes Player2's gallery
      await socialService.recordLike('player1', 'player2');

      // Check that Player2 received the reward
      const player2Data = mockDb.getData('players', 'player2');
      expect(player2Data.softCurrency).toBe(60); // 50 + 10
    });

    it('should grant 5 soft currency to gallery owner when receiving a comment', async () => {
      // Player1 comments on Player2's gallery
      await socialService.recordComment('player1', 'player2', 'Nice collection!');

      // Check that Player2 received the reward
      const player2Data = mockDb.getData('players', 'player2');
      expect(player2Data.softCurrency).toBe(55); // 50 + 5
    });

    it('should accumulate rewards from multiple likes', async () => {
      // Player1 likes Player2's gallery
      await socialService.recordLike('player1', 'player2');

      // Wait 25 hours (simulate time passing)
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25);
      const entries = mockDb.getAllEntries();
      const likeEntry = entries.find(([key, value]) => 
        key.startsWith('gallery_interactions/') && 
        value.type === 'like' &&
        value.galleryPlayerId === 'player2' &&
        value.interactingPlayerId === 'player1'
      );
      
      if (likeEntry) {
        const [likeKey, like1] = likeEntry;
        const collection = likeKey.split('/')[0];
        const id = likeKey.split('/')[1];
        mockDb.addData(collection, id, { ...like1, createdAt: oldDate.toISOString() });
      }

      // Player1 likes again (after 24 hours)
      await socialService.recordLike('player1', 'player2');

      // Check that Player2 received both rewards
      const player2Data = mockDb.getData('players', 'player2');
      expect(player2Data.softCurrency).toBe(70); // 50 + 10 + 10
    });

    it('should accumulate rewards from multiple comments', async () => {
      // Player1 comments twice on Player2's gallery
      await socialService.recordComment('player1', 'player2', 'Great!');
      await socialService.recordComment('player1', 'player2', 'Amazing!');

      // Check that Player2 received both rewards
      const player2Data = mockDb.getData('players', 'player2');
      expect(player2Data.softCurrency).toBe(60); // 50 + 5 + 5
    });

    it('should accumulate rewards from both likes and comments', async () => {
      // Player1 likes Player2's gallery
      await socialService.recordLike('player1', 'player2');
      
      // Player1 comments on Player2's gallery
      await socialService.recordComment('player1', 'player2', 'Nice!');

      // Check that Player2 received both rewards
      const player2Data = mockDb.getData('players', 'player2');
      expect(player2Data.softCurrency).toBe(65); // 50 + 10 + 5
    });

    it('should throw error if gallery owner player does not exist', async () => {
      // Try to like a non-existent player's gallery
      await expect(
        socialService.recordLike('player1', 'nonexistent')
      ).rejects.toThrow('Player nonexistent not found');
    });

    it('should return correct reward amounts', () => {
      expect(socialService.getLikeRewardAmount()).toBe(10);
      expect(socialService.getCommentRewardAmount()).toBe(5);
    });
  });

  // Feature: card-mystery-realm, Property 18: Gallery like rate limit
  // **Validates: Requirements 4.3**
  describe('Property 18: Gallery like rate limit', () => {
    it('should enforce 24-hour rate limit for gallery likes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            playerId: fc.string({ minLength: 1, maxLength: 20 }),
            galleryPlayerId: fc.string({ minLength: 1, maxLength: 20 }),
            // Time offset in hours from now (0.1 to 48 hours, avoiding very small values)
            firstLikeHoursAgo: fc.double({ min: 0.1, max: 48, noNaN: true }),
          }),
          async ({ playerId, galleryPlayerId, firstLikeHoursAgo }) => {
            // Skip if player tries to like their own gallery
            if (playerId === galleryPlayerId) {
              return true;
            }

            // Skip edge cases very close to the 24-hour boundary to avoid floating point issues
            if (Math.abs(firstLikeHoursAgo - 24) < 0.1) {
              return true;
            }

            // Create a fresh mock database for this test
            const testDb = new MockFirestore();
            const testService = new SocialService(testDb as any as Firestore);

            // Add player data
            testDb.addData('players', playerId, {
              id: playerId,
              username: `Player ${playerId}`,
              softCurrency: 100,
            });
            testDb.addData('players', galleryPlayerId, {
              id: galleryPlayerId,
              username: `Player ${galleryPlayerId}`,
              softCurrency: 100,
            });

            // Record the first like at a specific time in the past
            const firstLikeDate = new Date();
            firstLikeDate.setHours(firstLikeDate.getHours() - firstLikeHoursAgo);
            
            const firstLike: GalleryInteraction = {
              id: 'like1',
              galleryPlayerId,
              interactingPlayerId: playerId,
              type: 'like',
              createdAt: firstLikeDate.toISOString(),
            };
            testDb.addData('gallery_interactions', 'like1', firstLike);

            // Check if player can like again (from "now")
            const canLike = await testService.canLikeGallery(playerId, galleryPlayerId);

            // Property: The service checks if the first like was within the last 24 hours from now.
            // If firstLikeHoursAgo < 24: the like is within the window → canLike should be false
            // If firstLikeHoursAgo >= 24: the like is outside the window → canLike should be true
            if (firstLikeHoursAgo < 24) {
              return canLike === false;
            } else {
              return canLike === true;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow first like and reject second like within 24 hours', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            playerId: fc.string({ minLength: 1, maxLength: 20 }),
            galleryPlayerId: fc.string({ minLength: 1, maxLength: 20 }),
            // Hours between first and second like (0 to 48)
            hoursBetweenLikes: fc.double({ min: 0, max: 48, noNaN: true }),
          }),
          async ({ playerId, galleryPlayerId, hoursBetweenLikes }) => {
            // Skip if player tries to like their own gallery
            if (playerId === galleryPlayerId) {
              return true;
            }

            // Create a fresh mock database for this test
            const testDb = new MockFirestore();
            const testService = new SocialService(testDb as any as Firestore);

            // Add player data
            testDb.addData('players', playerId, {
              id: playerId,
              username: `Player ${playerId}`,
              softCurrency: 100,
            });
            testDb.addData('players', galleryPlayerId, {
              id: galleryPlayerId,
              username: `Player ${galleryPlayerId}`,
              softCurrency: 100,
            });

            // First like should always succeed
            const firstLike = await testService.recordLike(playerId, galleryPlayerId);
            expect(firstLike.galleryPlayerId).toBe(galleryPlayerId);
            expect(firstLike.interactingPlayerId).toBe(playerId);

            // Simulate time passing by modifying the first like's timestamp
            const firstLikeDate = new Date();
            firstLikeDate.setHours(firstLikeDate.getHours() - hoursBetweenLikes);
            
            // Update the first like's timestamp in the database
            testDb.addData('gallery_interactions', firstLike.id, {
              ...firstLike,
              createdAt: firstLikeDate.toISOString(),
            });

            // Try to like again
            if (hoursBetweenLikes < 24) {
              // Within 24 hours - should throw error
              try {
                await testService.recordLike(playerId, galleryPlayerId);
                // If we get here, the test failed (should have thrown)
                return false;
              } catch (error: any) {
                // Should throw rate limit error
                return error.message.includes('Like rate limit exceeded');
              }
            } else {
              // 24+ hours passed - should succeed
              try {
                const secondLike = await testService.recordLike(playerId, galleryPlayerId);
                return secondLike.galleryPlayerId === galleryPlayerId &&
                       secondLike.interactingPlayerId === playerId;
              } catch (error) {
                // Should not throw error
                return false;
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
