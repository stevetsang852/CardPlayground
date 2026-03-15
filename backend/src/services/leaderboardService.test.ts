import { LeaderboardService } from './leaderboardService';
import { Gallery } from '../../../shared/src/types/gallery';
import { LeaderboardType, LeaderboardQuery } from '../../../shared/src/types/leaderboard';

// Mock Firestore
const mockGet = jest.fn();
const mockCount = jest.fn();
const mockOnSnapshot = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockOffset = jest.fn();
const mockDoc = jest.fn();

const mockCollection = jest.fn(() => ({
  orderBy: mockOrderBy,
  where: mockWhere,
  doc: mockDoc,
  count: mockCount,
}));

const mockDb = {
  collection: mockCollection,
} as any;

describe('LeaderboardService', () => {
  let service: LeaderboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeaderboardService(mockDb);

    // Setup default mock chain
    mockOrderBy.mockReturnThis();
    mockLimit.mockReturnThis();
    mockOffset.mockReturnThis();
    mockWhere.mockReturnThis();
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard entries sorted by total score', async () => {
      const galleries: Gallery[] = [
        {
          playerId: 'player1',
          cardIds: ['card1', 'card2'],
          totalLikes: 10,
          totalComments: 5,
          totalScore: 1000,
          rarityScore: 500,
          creativityScore: 200,
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          playerId: 'player2',
          cardIds: ['card3'],
          totalLikes: 5,
          totalComments: 2,
          totalScore: 800,
          rarityScore: 400,
          creativityScore: 90,
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const mockDocs = galleries.map((gallery, index) => ({
        data: () => gallery,
        id: `gallery${index + 1}`,
      }));

      mockGet.mockResolvedValue({
        docs: mockDocs,
      });

      mockOrderBy.mockReturnValue({
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      });

      mockLimit.mockReturnValue({
        offset: mockOffset,
      });

      mockOffset.mockReturnValue({
        get: mockGet,
      });

      // Mock player names
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            { data: () => ({ id: 'player1', username: 'Alice' }) },
            { data: () => ({ id: 'player2', username: 'Bob' }) },
          ],
        }),
      });

      // Mock count
      mockCount.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          data: () => ({ count: 2 }),
        }),
      });

      const query: LeaderboardQuery = {
        type: 'total_score',
        limit: 10,
        offset: 0,
      };

      const result = await service.getLeaderboard(query);

      expect(result.type).toBe('total_score');
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].playerId).toBe('player1');
      expect(result.entries[0].playerName).toBe('Alice');
      expect(result.entries[0].score).toBe(1000);
      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[1].playerId).toBe('player2');
      expect(result.entries[1].score).toBe(800);
      expect(result.entries[1].rank).toBe(2);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should return leaderboard entries sorted by rarity score', async () => {
      const galleries: Gallery[] = [
        {
          playerId: 'player1',
          cardIds: ['card1'],
          totalLikes: 5,
          totalComments: 2,
          totalScore: 500,
          rarityScore: 2000,
          creativityScore: 90,
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const mockDocs = galleries.map((gallery) => ({
        data: () => gallery,
      }));

      mockGet.mockResolvedValue({
        docs: mockDocs,
      });

      mockOrderBy.mockReturnValue({
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      });

      mockLimit.mockReturnValue({
        offset: mockOffset,
      });

      mockOffset.mockReturnValue({
        get: mockGet,
      });

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [{ data: () => ({ id: 'player1', username: 'Alice' }) }],
        }),
      });

      mockCount.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          data: () => ({ count: 1 }),
        }),
      });

      const query: LeaderboardQuery = {
        type: 'rarity_score',
        limit: 10,
        offset: 0,
      };

      const result = await service.getLeaderboard(query);

      expect(result.type).toBe('rarity_score');
      expect(result.entries[0].score).toBe(2000);
      expect(mockOrderBy).toHaveBeenCalledWith('rarityScore', 'desc');
    });

    it('should return leaderboard entries sorted by creativity score', async () => {
      const galleries: Gallery[] = [
        {
          playerId: 'player1',
          cardIds: ['card1'],
          totalLikes: 50,
          totalComments: 25,
          totalScore: 500,
          rarityScore: 1000,
          creativityScore: 1000,
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const mockDocs = galleries.map((gallery) => ({
        data: () => gallery,
      }));

      mockGet.mockResolvedValue({
        docs: mockDocs,
      });

      mockOrderBy.mockReturnValue({
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      });

      mockLimit.mockReturnValue({
        offset: mockOffset,
      });

      mockOffset.mockReturnValue({
        get: mockGet,
      });

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [{ data: () => ({ id: 'player1', username: 'Alice' }) }],
        }),
      });

      mockCount.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          data: () => ({ count: 1 }),
        }),
      });

      const query: LeaderboardQuery = {
        type: 'creativity',
        limit: 10,
        offset: 0,
      };

      const result = await service.getLeaderboard(query);

      expect(result.type).toBe('creativity');
      expect(result.entries[0].score).toBe(1000);
      expect(result.entries[0].totalLikes).toBe(50);
      expect(result.entries[0].totalComments).toBe(25);
      expect(mockOrderBy).toHaveBeenCalledWith('creativityScore', 'desc');
    });

    it('should handle pagination with offset', async () => {
      const galleries: Gallery[] = [
        {
          playerId: 'player3',
          cardIds: ['card5'],
          totalLikes: 3,
          totalComments: 1,
          totalScore: 600,
          rarityScore: 300,
          creativityScore: 50,
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const mockDocs = galleries.map((gallery) => ({
        data: () => gallery,
      }));

      mockGet.mockResolvedValue({
        docs: mockDocs,
      });

      mockOrderBy.mockReturnValue({
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      });

      mockLimit.mockReturnValue({
        offset: mockOffset,
      });

      mockOffset.mockReturnValue({
        get: mockGet,
      });

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [{ data: () => ({ id: 'player3', username: 'Charlie' }) }],
        }),
      });

      mockCount.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          data: () => ({ count: 10 }),
        }),
      });

      const query: LeaderboardQuery = {
        type: 'total_score',
        limit: 5,
        offset: 5,
      };

      const result = await service.getLeaderboard(query);

      expect(result.entries[0].rank).toBe(6); // Rank should be offset + 1
      expect(mockOffset).toHaveBeenCalledWith(5);
    });

    it('should detect when there are more results', async () => {
      // Return limit + 1 docs to indicate more results
      const galleries: Gallery[] = Array.from({ length: 6 }, (_, i) => ({
        playerId: `player${i + 1}`,
        cardIds: [`card${i + 1}`],
        totalLikes: 10 - i,
        totalComments: 5 - i,
        totalScore: 1000 - i * 100,
        rarityScore: 500 - i * 50,
        creativityScore: 200 - i * 20,
        updatedAt: '2024-01-01T00:00:00Z',
      }));

      const mockDocs = galleries.map((gallery) => ({
        data: () => gallery,
      }));

      mockGet.mockResolvedValue({
        docs: mockDocs,
      });

      mockOrderBy.mockReturnValue({
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      });

      mockLimit.mockReturnValue({
        offset: mockOffset,
      });

      mockOffset.mockReturnValue({
        get: mockGet,
      });

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: galleries.map((g) => ({
            data: () => ({ id: g.playerId, username: g.playerId }),
          })),
        }),
      });

      mockCount.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          data: () => ({ count: 10 }),
        }),
      });

      const query: LeaderboardQuery = {
        type: 'total_score',
        limit: 5,
        offset: 0,
      };

      const result = await service.getLeaderboard(query);

      expect(result.hasMore).toBe(true);
      expect(result.entries).toHaveLength(5); // Should only return limit, not limit + 1
    });

    it('should handle empty leaderboard', async () => {
      mockGet.mockResolvedValue({
        docs: [],
      });

      mockOrderBy.mockReturnValue({
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      });

      mockLimit.mockReturnValue({
        offset: mockOffset,
      });

      mockOffset.mockReturnValue({
        get: mockGet,
      });

      mockCount.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          data: () => ({ count: 0 }),
        }),
      });

      const query: LeaderboardQuery = {
        type: 'total_score',
        limit: 10,
        offset: 0,
      };

      const result = await service.getLeaderboard(query);

      expect(result.entries).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getPlayerRank', () => {
    it('should return player rank on leaderboard', async () => {
      const gallery: Gallery = {
        playerId: 'player1',
        cardIds: ['card1'],
        totalLikes: 10,
        totalComments: 5,
        totalScore: 800,
        rarityScore: 400,
        creativityScore: 200,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => gallery,
        }),
      });

      // Mock 2 galleries with higher scores
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          size: 2,
        }),
      });

      const rank = await service.getPlayerRank('player1', 'total_score');

      expect(rank).toBe(3); // 2 higher scores + 1 = rank 3
      expect(mockWhere).toHaveBeenCalledWith('totalScore', '>', 800);
    });

    it('should return null if player gallery does not exist', async () => {
      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: false,
        }),
      });

      const rank = await service.getPlayerRank('nonexistent', 'total_score');

      expect(rank).toBeNull();
    });

    it('should return rank 1 if player has highest score', async () => {
      const gallery: Gallery = {
        playerId: 'player1',
        cardIds: ['card1'],
        totalLikes: 10,
        totalComments: 5,
        totalScore: 10000,
        rarityScore: 5000,
        creativityScore: 200,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => gallery,
        }),
      });

      // No galleries with higher scores
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          size: 0,
        }),
      });

      const rank = await service.getPlayerRank('player1', 'total_score');

      expect(rank).toBe(1);
    });

    it('should calculate rank for different leaderboard types', async () => {
      const gallery: Gallery = {
        playerId: 'player1',
        cardIds: ['card1'],
        totalLikes: 10,
        totalComments: 5,
        totalScore: 800,
        rarityScore: 1500,
        creativityScore: 200,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockDoc.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => gallery,
        }),
      });

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          size: 5,
        }),
      });

      const rank = await service.getPlayerRank('player1', 'rarity_score');

      expect(rank).toBe(6);
      expect(mockWhere).toHaveBeenCalledWith('rarityScore', '>', 1500);
    });
  });

  describe('subscribeToLeaderboard', () => {
    it('should set up real-time subscription to leaderboard', () => {
      const callback = jest.fn();
      const mockUnsubscribe = jest.fn();

      const galleries: Gallery[] = [
        {
          playerId: 'player1',
          cardIds: ['card1'],
          totalLikes: 10,
          totalComments: 5,
          totalScore: 1000,
          rarityScore: 500,
          creativityScore: 200,
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockOnSnapshot.mockImplementation((snapshotCallback) => {
        // Simulate snapshot callback
        setTimeout(() => {
          snapshotCallback({
            docs: galleries.map((gallery) => ({
              data: () => gallery,
            })),
          });
        }, 0);
        return mockUnsubscribe;
      });

      mockOrderBy.mockReturnValue({
        orderBy: mockOrderBy,
        limit: mockLimit,
        onSnapshot: mockOnSnapshot,
      });

      mockLimit.mockReturnValue({
        onSnapshot: mockOnSnapshot,
      });

      // Mock player names
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [{ data: () => ({ id: 'player1', username: 'Alice' }) }],
        }),
      });

      const unsubscribe = service.subscribeToLeaderboard('total_score', 10, callback);

      expect(mockOrderBy).toHaveBeenCalledWith('totalScore', 'desc');
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 20: Leaderboard ranking correctness', () => {
      /**
       * **Validates: Requirements 4.8, 4.9, 4.10**
       * 
       * For any set of galleries and leaderboard type, the returned rankings should be
       * sorted in descending order by the appropriate score field, and ranks should be
       * consecutive integers starting from 1.
       */
      it('should return rankings sorted in descending order by score with consecutive ranks', async () => {
        const fc = require('fast-check');

        await fc.assert(
          fc.asyncProperty(
            // Generate array of galleries with random scores
            fc.array(
              fc.record({
                playerId: fc.string({ minLength: 1, maxLength: 20 }),
                totalScore: fc.integer({ min: 0, max: 100000 }),
                rarityScore: fc.integer({ min: 0, max: 100000 }),
                creativityScore: fc.integer({ min: 0, max: 100000 }),
                cardCount: fc.integer({ min: 0, max: 50 }),
                totalLikes: fc.integer({ min: 0, max: 10000 }),
                totalComments: fc.integer({ min: 0, max: 10000 }),
              }),
              { minLength: 0, maxLength: 50 }
            ),
            // Generate leaderboard type
            fc.constantFrom('total_score', 'rarity_score', 'creativity'),
            // Generate pagination parameters
            fc.record({
              limit: fc.integer({ min: 1, max: 100 }),
              offset: fc.integer({ min: 0, max: 20 }),
            }),
            async (
              galleries: Array<{
                playerId: string;
                totalScore: number;
                rarityScore: number;
                creativityScore: number;
                cardCount: number;
                totalLikes: number;
                totalComments: number;
              }>,
              leaderboardType: LeaderboardType,
              pagination: { limit: number; offset: number }
            ) => {
              // Build gallery objects
              const galleryObjects: Gallery[] = galleries.map((g, index) => ({
                playerId: g.playerId || `player${index}`,
                cardIds: Array.from({ length: g.cardCount }, (_, i) => `card${index}_${i}`),
                totalLikes: g.totalLikes,
                totalComments: g.totalComments,
                totalScore: g.totalScore,
                rarityScore: g.rarityScore,
                creativityScore: g.creativityScore,
                updatedAt: '2024-01-01T00:00:00Z',
              }));

              // Determine which score field to use
              const getScore = (gallery: Gallery): number => {
                switch (leaderboardType) {
                  case 'total_score':
                    return gallery.totalScore;
                  case 'rarity_score':
                    return gallery.rarityScore;
                  case 'creativity':
                    return gallery.creativityScore;
                  default:
                    return 0;
                }
              };

              // Sort galleries by score (descending) and playerId (ascending) for consistent ordering
              const sortedGalleries = [...galleryObjects].sort((a, b) => {
                const scoreA = getScore(a);
                const scoreB = getScore(b);
                if (scoreB !== scoreA) {
                  return scoreB - scoreA; // Descending by score
                }
                return a.playerId.localeCompare(b.playerId); // Ascending by playerId for ties
              });

              // Get the expected slice based on pagination
              const expectedSlice = sortedGalleries.slice(
                pagination.offset,
                pagination.offset + pagination.limit
              );

              // Mock the database query to return our test data
              const mockDocs = expectedSlice.map((gallery) => ({
                data: () => gallery,
              }));

              // Check if there are more results
              const hasMore = sortedGalleries.length > pagination.offset + pagination.limit;
              
              // Add one extra doc if hasMore to simulate the service's behavior
              if (hasMore && pagination.offset + pagination.limit < sortedGalleries.length) {
                mockDocs.push({
                  data: () => sortedGalleries[pagination.offset + pagination.limit],
                });
              }

              mockGet.mockResolvedValue({
                docs: mockDocs,
              });

              mockOrderBy.mockReturnValue({
                orderBy: mockOrderBy,
                limit: mockLimit,
                offset: mockOffset,
              });

              mockLimit.mockReturnValue({
                offset: mockOffset,
              });

              mockOffset.mockReturnValue({
                get: mockGet,
              });

              // Mock player names
              const playerNames: Record<string, string> = {};
              expectedSlice.forEach((g) => {
                playerNames[g.playerId] = `User_${g.playerId}`;
              });

              mockWhere.mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  docs: Object.entries(playerNames).map(([id, name]) => ({
                    data: () => ({ id, username: name }),
                  })),
                }),
              });

              mockCount.mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  data: () => ({ count: galleryObjects.length }),
                }),
              });

              // Execute the query
              const query: LeaderboardQuery = {
                type: leaderboardType,
                limit: pagination.limit,
                offset: pagination.offset,
              };

              const result = await service.getLeaderboard(query);

              // Property 1: Rankings should be sorted in descending order by score
              for (let i = 0; i < result.entries.length - 1; i++) {
                const currentScore = result.entries[i].score;
                const nextScore = result.entries[i + 1].score;
                
                // Current score should be >= next score (descending order)
                expect(currentScore).toBeGreaterThanOrEqual(nextScore);
              }

              // Property 2: Ranks should be consecutive integers starting from offset + 1
              result.entries.forEach((entry, index) => {
                const expectedRank = pagination.offset + index + 1;
                expect(entry.rank).toBe(expectedRank);
              });

              // Property 3: Each entry should have the correct score for the leaderboard type
              result.entries.forEach((entry, index) => {
                const expectedScore = getScore(expectedSlice[index]);
                expect(entry.score).toBe(expectedScore);
              });

              // Property 4: Leaderboard type should match the query
              expect(result.type).toBe(leaderboardType);

              // Property 5: Entry count should not exceed limit
              expect(result.entries.length).toBeLessThanOrEqual(pagination.limit);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle all three leaderboard types correctly', async () => {
        const fc = require('fast-check');

        await fc.assert(
          fc.asyncProperty(
            // Generate a single gallery with different scores
            fc.record({
              playerId: fc.string({ minLength: 1, maxLength: 20 }),
              totalScore: fc.integer({ min: 0, max: 100000 }),
              rarityScore: fc.integer({ min: 0, max: 100000 }),
              creativityScore: fc.integer({ min: 0, max: 100000 }),
            }),
            async (galleryData: {
              playerId: string;
              totalScore: number;
              rarityScore: number;
              creativityScore: number;
            }) => {
              const gallery: Gallery = {
                playerId: galleryData.playerId || 'player1',
                cardIds: ['card1'],
                totalLikes: 10,
                totalComments: 5,
                totalScore: galleryData.totalScore,
                rarityScore: galleryData.rarityScore,
                creativityScore: galleryData.creativityScore,
                updatedAt: '2024-01-01T00:00:00Z',
              };

              const mockDocs = [{ data: () => gallery }];

              mockGet.mockResolvedValue({ docs: mockDocs });
              mockOrderBy.mockReturnValue({
                orderBy: mockOrderBy,
                limit: mockLimit,
                offset: mockOffset,
              });
              mockLimit.mockReturnValue({ offset: mockOffset });
              mockOffset.mockReturnValue({ get: mockGet });
              mockWhere.mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  docs: [{ data: () => ({ id: gallery.playerId, username: 'TestUser' }) }],
                }),
              });
              mockCount.mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  data: () => ({ count: 1 }),
                }),
              });

              // Test each leaderboard type
              const types: LeaderboardType[] = ['total_score', 'rarity_score', 'creativity'];
              
              for (const type of types) {
                const query: LeaderboardQuery = { type, limit: 10, offset: 0 };
                const result = await service.getLeaderboard(query);

                // Verify the correct score is returned for each type
                const expectedScore = 
                  type === 'total_score' ? gallery.totalScore :
                  type === 'rarity_score' ? gallery.rarityScore :
                  gallery.creativityScore;

                expect(result.entries[0].score).toBe(expectedScore);
                expect(result.type).toBe(type);
              }
            }
          ),
          { numRuns: 50 }
        );
      });

      it('should maintain ranking correctness with tied scores', async () => {
        const fc = require('fast-check');

        await fc.assert(
          fc.asyncProperty(
            // Generate galleries with potentially tied scores
            fc.integer({ min: 0, max: 1000 }), // Common score value
            fc.array(
              fc.string({ minLength: 1, maxLength: 20 }),
              { minLength: 2, maxLength: 20 }
            ), // Player IDs
            async (commonScore: number, playerIds: string[]) => {
              // Create galleries with the same score but different player IDs
              const uniquePlayerIds = [...new Set(playerIds)];
              const galleries: Gallery[] = uniquePlayerIds.map((playerId: string) => ({
                playerId,
                cardIds: ['card1'],
                totalLikes: 10,
                totalComments: 5,
                totalScore: commonScore,
                rarityScore: commonScore,
                creativityScore: commonScore,
                updatedAt: '2024-01-01T00:00:00Z',
              }));

              // Sort by playerId for consistent ordering (secondary sort)
              const sortedGalleries = [...galleries].sort((a, b) =>
                a.playerId.localeCompare(b.playerId)
              );

              const mockDocs = sortedGalleries.map((gallery) => ({
                data: () => gallery,
              }));

              mockGet.mockResolvedValue({ docs: mockDocs });
              mockOrderBy.mockReturnValue({
                orderBy: mockOrderBy,
                limit: mockLimit,
                offset: mockOffset,
              });
              mockLimit.mockReturnValue({ offset: mockOffset });
              mockOffset.mockReturnValue({ get: mockGet });
              
              const playerNames: Record<string, string> = {};
              sortedGalleries.forEach((g) => {
                playerNames[g.playerId] = `User_${g.playerId}`;
              });

              mockWhere.mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  docs: Object.entries(playerNames).map(([id, name]) => ({
                    data: () => ({ id, username: name }),
                  })),
                }),
              });
              mockCount.mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  data: () => ({ count: galleries.length }),
                }),
              });

              const query: LeaderboardQuery = {
                type: 'total_score',
                limit: 100,
                offset: 0,
              };

              const result = await service.getLeaderboard(query);

              // All entries should have the same score
              result.entries.forEach((entry) => {
                expect(entry.score).toBe(commonScore);
              });

              // Ranks should still be consecutive
              result.entries.forEach((entry, index) => {
                expect(entry.rank).toBe(index + 1);
              });

              // Order should be consistent (alphabetically by playerId)
              for (let i = 0; i < result.entries.length - 1; i++) {
                expect(
                  result.entries[i].playerId.localeCompare(result.entries[i + 1].playerId)
                ).toBeLessThanOrEqual(0);
              }
            }
          ),
          { numRuns: 50 }
        );
      });
    });
  });
});
