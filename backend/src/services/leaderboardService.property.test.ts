import { LeaderboardService } from './leaderboardService';
import { Gallery } from '../../../shared/src/types/gallery';
import { LeaderboardType, LeaderboardQuery } from '../../../shared/src/types/leaderboard';
import fc from 'fast-check';

// Mock Firestore
const mockGet = jest.fn();
const mockCount = jest.fn();
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

// Feature: card-mystery-realm, Property 20: Leaderboard ranking correctness
// **Validates: Requirements 4.8, 4.9, 4.10**
describe('Property 20: Leaderboard ranking correctness', () => {
  let service: LeaderboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeaderboardService(mockDb);

    mockOrderBy.mockReturnThis();
    mockLimit.mockReturnThis();
    mockOffset.mockReturnThis();
    mockWhere.mockReturnThis();
  });

  /**
   * For any set of galleries and leaderboard type, the returned rankings should be
   * sorted in descending order by the appropriate score field, and ranks should be
   * consecutive integers starting from 1 (or offset + 1).
   *
   * Validates: Requirements 4.8, 4.9, 4.10
   */
  it('should return rankings sorted in descending order with consecutive ranks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            playerId: fc.string({ minLength: 1, maxLength: 20 }),
            totalScore: fc.integer({ min: 0, max: 100000 }),
            rarityScore: fc.integer({ min: 0, max: 100000 }),
            creativityScore: fc.integer({ min: 0, max: 100000 }),
            totalLikes: fc.integer({ min: 0, max: 10000 }),
            totalComments: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        fc.constantFrom<LeaderboardType>('total_score', 'rarity_score', 'creativity'),
        fc.record({
          limit: fc.integer({ min: 1, max: 50 }),
          offset: fc.integer({ min: 0, max: 10 }),
        }),
        async (galleries, leaderboardType, pagination) => {
          const getScore = (g: Gallery): number => {
            switch (leaderboardType) {
              case 'total_score': return g.totalScore;
              case 'rarity_score': return g.rarityScore;
              case 'creativity': return g.creativityScore;
              default: return 0;
            }
          };

          // Build gallery objects
          const galleryObjects: Gallery[] = galleries.map((g, i) => ({
            playerId: g.playerId || `player${i}`,
            cardIds: [],
            totalLikes: g.totalLikes,
            totalComments: g.totalComments,
            totalScore: g.totalScore,
            rarityScore: g.rarityScore,
            creativityScore: g.creativityScore,
            updatedAt: '2024-01-01T00:00:00Z',
          }));

          // Sort descending by score (simulating what DB returns)
          const sorted = [...galleryObjects].sort((a, b) => getScore(b) - getScore(a));
          const slice = sorted.slice(pagination.offset, pagination.offset + pagination.limit);
          const hasMore = sorted.length > pagination.offset + pagination.limit;

          // Build mock docs (add extra if hasMore)
          const mockDocs = [...slice.map(g => ({ data: () => g }))];
          if (hasMore) {
            mockDocs.push({ data: () => sorted[pagination.offset + pagination.limit] });
          }

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
              docs: slice.map(g => ({ data: () => ({ id: g.playerId, username: `User_${g.playerId}` }) })),
            }),
          });
          mockCount.mockReturnValue({
            get: jest.fn().mockResolvedValue({ data: () => ({ count: galleryObjects.length }) }),
          });

          const query: LeaderboardQuery = { type: leaderboardType, limit: pagination.limit, offset: pagination.offset };
          const result = await service.getLeaderboard(query);

          // Property: ranks are consecutive starting from offset + 1
          result.entries.forEach((entry, index) => {
            expect(entry.rank).toBe(pagination.offset + index + 1);
          });

          // Property: scores are in descending order
          for (let i = 0; i < result.entries.length - 1; i++) {
            expect(result.entries[i].score).toBeGreaterThanOrEqual(result.entries[i + 1].score);
          }

          // Property: entry count does not exceed limit
          expect(result.entries.length).toBeLessThanOrEqual(pagination.limit);

          // Property: leaderboard type matches query
          expect(result.type).toBe(leaderboardType);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return correct score field for each leaderboard type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: fc.string({ minLength: 1, maxLength: 20 }),
          totalScore: fc.integer({ min: 0, max: 100000 }),
          rarityScore: fc.integer({ min: 0, max: 100000 }),
          creativityScore: fc.integer({ min: 0, max: 100000 }),
        }),
        async (galleryData) => {
          const gallery: Gallery = {
            playerId: galleryData.playerId || 'player1',
            cardIds: [],
            totalLikes: 0,
            totalComments: 0,
            totalScore: galleryData.totalScore,
            rarityScore: galleryData.rarityScore,
            creativityScore: galleryData.creativityScore,
            updatedAt: '2024-01-01T00:00:00Z',
          };

          const mockDocs = [{ data: () => gallery }];
          mockGet.mockResolvedValue({ docs: mockDocs });
          mockOrderBy.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit, offset: mockOffset });
          mockLimit.mockReturnValue({ offset: mockOffset });
          mockOffset.mockReturnValue({ get: mockGet });
          mockWhere.mockReturnValue({
            get: jest.fn().mockResolvedValue({
              docs: [{ data: () => ({ id: gallery.playerId, username: 'TestUser' }) }],
            }),
          });
          mockCount.mockReturnValue({
            get: jest.fn().mockResolvedValue({ data: () => ({ count: 1 }) }),
          });

          const types: LeaderboardType[] = ['total_score', 'rarity_score', 'creativity'];
          for (const type of types) {
            const result = await service.getLeaderboard({ type, limit: 10, offset: 0 });
            const expectedScore =
              type === 'total_score' ? gallery.totalScore :
              type === 'rarity_score' ? gallery.rarityScore :
              gallery.creativityScore;

            expect(result.entries[0].score).toBe(expectedScore);
            expect(result.type).toBe(type);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
