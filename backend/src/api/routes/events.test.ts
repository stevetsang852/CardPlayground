import request from 'supertest';
import express from 'express';
import eventRoutes from './events';
import { errorHandler } from '../middleware/errorHandler';
import { collections } from '../../config/database';

// Mock the database
jest.mock('../../config/database', () => ({
  collections: {
    players: jest.fn(),
    cards: jest.fn(),
    activeEvents: jest.fn()
  },
  getDatabase: jest.fn().mockReturnValue({})
}));

// Mock AchievementService
jest.mock('../../services/achievementService', () => ({
  AchievementService: jest.fn().mockImplementation(() => ({
    checkAndUnlockAchievements: jest.fn().mockResolvedValue([])
  }))
}));

// Mock the EventTriggerSystem
jest.mock('@shared/events/EventTriggerSystem');
import { EventTriggerSystem } from '@shared/events/EventTriggerSystem';

const app = express();
app.use(express.json());
app.use('/api/v1/events', eventRoutes);
app.use(errorHandler);

describe('POST /api/v1/events/trigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if actionType is missing', async () => {
    const response = await request(app)
      .post('/api/v1/events/trigger')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ACTION_TYPE');
  });

  it('should return 404 if player not found', async () => {
    const mockPlayerDoc = {
      exists: false
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    const response = await request(app)
      .post('/api/v1/events/trigger')
      .set('x-player-id', 'test-player')
      .send({ actionType: 'draw_card' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PLAYER_NOT_FOUND');
  });

  it('should return eventTriggered: false when no event triggers', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      luckValue: 0,
      drawsSinceLastLegendary: 0,
      consecutiveSynthesisFailures: 0,
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc),
        update: jest.fn().mockResolvedValue({})
      })
    });

    // Mock EventTriggerSystem to return null (no event)
    (EventTriggerSystem as jest.Mock).mockImplementation(() => ({
      checkForEvent: jest.fn().mockReturnValue(null)
    }));

    const response = await request(app)
      .post('/api/v1/events/trigger')
      .set('x-player-id', 'test-player')
      .send({ actionType: 'draw_card' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      eventTriggered: false
    });
  });

  it('should return merchant event when triggered', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      luckValue: 0,
      drawsSinceLastLegendary: 0,
      consecutiveSynthesisFailures: 0,
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockMerchantEvent = {
      id: 'event-test-player-merchant-123',
      playerId: 'test-player',
      eventType: 'merchant',
      triggeredAt: new Date().toISOString(),
      claimed: false,
      merchantOffers: [
        {
          id: 'offer-1',
          itemType: 'pack',
          itemId: 'premium-pack',
          price: 350,
          currencyType: 'soft',
          discount: 30
        }
      ]
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc),
        update: jest.fn().mockResolvedValue({})
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue({})
      })
    });

    // Mock EventTriggerSystem to return merchant event
    (EventTriggerSystem as jest.Mock).mockImplementation(() => ({
      checkForEvent: jest.fn().mockReturnValue(mockMerchantEvent)
    }));

    const response = await request(app)
      .post('/api/v1/events/trigger')
      .set('x-player-id', 'test-player')
      .send({ actionType: 'draw_card' });

    expect(response.status).toBe(200);
    expect(response.body.eventTriggered).toBe(true);
    expect(response.body.event.type).toBe('merchant');
    expect(response.body.event.offers).toBeDefined();
    expect(response.body.event.offers.length).toBeGreaterThan(0);
  });

  it('should return storm event when triggered', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      luckValue: 0,
      drawsSinceLastLegendary: 0,
      consecutiveSynthesisFailures: 0,
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockStormEvent = {
      id: 'event-test-player-storm-123',
      playerId: 'test-player',
      eventType: 'storm',
      triggeredAt: new Date().toISOString(),
      claimed: false,
      stormDrawsRemaining: 3
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc),
        update: jest.fn().mockResolvedValue({})
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue({})
      })
    });

    // Mock EventTriggerSystem to return storm event
    (EventTriggerSystem as jest.Mock).mockImplementation(() => ({
      checkForEvent: jest.fn().mockReturnValue(mockStormEvent)
    }));

    const response = await request(app)
      .post('/api/v1/events/trigger')
      .set('x-player-id', 'test-player')
      .send({ actionType: 'synthesis' });

    expect(response.status).toBe(200);
    expect(response.body.eventTriggered).toBe(true);
    expect(response.body.event.type).toBe('storm');
    expect(response.body.event.rewards.freeDraws).toBe(3);
  });

  it('should return lucky event when triggered', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      luckValue: 0,
      drawsSinceLastLegendary: 0,
      consecutiveSynthesisFailures: 0,
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    const mockLuckyEvent = {
      id: 'event-test-player-lucky-123',
      playerId: 'test-player',
      eventType: 'lucky',
      triggeredAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      claimed: false,
      luckyMomentBonus: 0.20
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc),
        update: jest.fn().mockResolvedValue({})
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue({})
      })
    });

    // Mock EventTriggerSystem to return lucky event
    (EventTriggerSystem as jest.Mock).mockImplementation(() => ({
      checkForEvent: jest.fn().mockReturnValue(mockLuckyEvent)
    }));

    const response = await request(app)
      .post('/api/v1/events/trigger')
      .set('x-player-id', 'test-player')
      .send({ actionType: 'trade' });

    expect(response.status).toBe(200);
    expect(response.body.eventTriggered).toBe(true);
    expect(response.body.event.type).toBe('lucky');
    expect(response.body.event.duration).toBe(10);
    expect(response.body.event.bonus).toBe(0.20);
  });

  it('should return copy event when triggered', async () => {
    const mockCard = {
      id: 'card-123',
      templateId: 'template-1',
      name: 'Test Card',
      rarity: 'rare',
      score: 100
    };

    const mockPlayer = {
      id: 'test-player',
      cards: ['card-123'],
      luckValue: 0,
      drawsSinceLastLegendary: 0,
      consecutiveSynthesisFailures: 0,
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockCardDoc = {
      exists: true,
      data: () => mockCard
    };

    const mockCopyEvent = {
      id: 'event-test-player-copy-123',
      playerId: 'test-player',
      eventType: 'copy',
      triggeredAt: new Date().toISOString(),
      claimed: false,
      copiedCard: mockCard
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc),
        update: jest.fn().mockResolvedValue({})
      })
    });

    (collections.cards as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockCardDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue({})
      })
    });

    // Mock EventTriggerSystem to return copy event
    (EventTriggerSystem as jest.Mock).mockImplementation(() => ({
      checkForEvent: jest.fn().mockReturnValue(mockCopyEvent)
    }));

    const response = await request(app)
      .post('/api/v1/events/trigger')
      .set('x-player-id', 'test-player')
      .send({ actionType: 'gallery_update' });

    expect(response.status).toBe(200);
    expect(response.body.eventTriggered).toBe(true);
    expect(response.body.event.type).toBe('copy');
    expect(response.body.event.rewards.copiedCard).toBeDefined();
    expect(response.body.event.rewards.copiedCard.id).toBe('card-123');
  });

  it('should persist event to database when triggered', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      luckValue: 0,
      drawsSinceLastLegendary: 0,
      consecutiveSynthesisFailures: 0,
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockStormEvent = {
      id: 'event-test-player-storm-123',
      playerId: 'test-player',
      eventType: 'storm',
      triggeredAt: new Date().toISOString(),
      claimed: false,
      stormDrawsRemaining: 3
    };

    const mockSetFn = jest.fn().mockResolvedValue({});

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc),
        update: jest.fn().mockResolvedValue({})
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: mockSetFn
      })
    });

    // Mock EventTriggerSystem to return storm event
    (EventTriggerSystem as jest.Mock).mockImplementation(() => ({
      checkForEvent: jest.fn().mockReturnValue(mockStormEvent)
    }));

    await request(app)
      .post('/api/v1/events/trigger')
      .set('x-player-id', 'test-player')
      .send({ actionType: 'draw_card' });

    // Verify event was persisted
    expect(mockSetFn).toHaveBeenCalledWith(mockStormEvent);
  });
});

describe('GET /api/v1/events/active', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 404 if player not found', async () => {
    const mockPlayerDoc = {
      exists: false
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    const response = await request(app)
      .get('/api/v1/events/active')
      .set('x-player-id', 'test-player');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PLAYER_NOT_FOUND');
  });

  it('should return empty array when player has no active events', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      luckValue: 0,
      drawsSinceLastLegendary: 0,
      consecutiveSynthesisFailures: 0,
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockActiveEventsSnapshot = {
      forEach: jest.fn()
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockActiveEventsSnapshot)
      })
    });

    const response = await request(app)
      .get('/api/v1/events/active')
      .set('x-player-id', 'test-player');

    expect(response.status).toBe(200);
    expect(response.body.activeEvents).toEqual([]);
  });

  it('should return all active events for player', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      luckValue: 0,
      drawsSinceLastLegendary: 0,
      consecutiveSynthesisFailures: 0,
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const now = new Date();
    const futureExpiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

    const mockEvents = [
      {
        id: 'event-1',
        playerId: 'test-player',
        eventType: 'merchant',
        triggeredAt: now.toISOString(),
        claimed: false,
        merchantOffers: [
          {
            id: 'offer-1',
            itemType: 'pack',
            itemId: 'premium-pack',
            price: 350,
            currencyType: 'soft',
            discount: 30
          }
        ]
      },
      {
        id: 'event-2',
        playerId: 'test-player',
        eventType: 'lucky',
        triggeredAt: now.toISOString(),
        expiresAt: futureExpiry.toISOString(),
        claimed: false,
        luckyMomentBonus: 0.20
      },
      {
        id: 'event-3',
        playerId: 'test-player',
        eventType: 'storm',
        triggeredAt: now.toISOString(),
        claimed: false,
        stormDrawsRemaining: 3
      }
    ];

    const mockActiveEventsSnapshot = {
      forEach: jest.fn((callback) => {
        mockEvents.forEach(event => {
          callback({
            data: () => event
          });
        });
      })
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockActiveEventsSnapshot)
      })
    });

    const response = await request(app)
      .get('/api/v1/events/active')
      .set('x-player-id', 'test-player');

    expect(response.status).toBe(200);
    expect(response.body.activeEvents).toHaveLength(3);
    expect(response.body.activeEvents[0].eventType).toBe('merchant');
    expect(response.body.activeEvents[1].eventType).toBe('lucky');
    expect(response.body.activeEvents[2].eventType).toBe('storm');
  });

  it('should filter out expired events', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      luckValue: 0,
      drawsSinceLastLegendary: 0,
      consecutiveSynthesisFailures: 0,
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const now = new Date();
    const pastExpiry = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    const futureExpiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

    const mockEvents = [
      {
        id: 'event-1',
        playerId: 'test-player',
        eventType: 'lucky',
        triggeredAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        expiresAt: pastExpiry.toISOString(), // Expired
        claimed: false,
        luckyMomentBonus: 0.20
      },
      {
        id: 'event-2',
        playerId: 'test-player',
        eventType: 'lucky',
        triggeredAt: now.toISOString(),
        expiresAt: futureExpiry.toISOString(), // Still active
        claimed: false,
        luckyMomentBonus: 0.20
      },
      {
        id: 'event-3',
        playerId: 'test-player',
        eventType: 'merchant',
        triggeredAt: now.toISOString(),
        claimed: false,
        merchantOffers: []
      }
    ];

    const mockActiveEventsSnapshot = {
      forEach: jest.fn((callback) => {
        mockEvents.forEach(event => {
          callback({
            data: () => event
          });
        });
      })
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockActiveEventsSnapshot)
      })
    });

    const response = await request(app)
      .get('/api/v1/events/active')
      .set('x-player-id', 'test-player');

    expect(response.status).toBe(200);
    expect(response.body.activeEvents).toHaveLength(2);
    // Should only include the non-expired lucky event and the merchant event
    expect(response.body.activeEvents.find((e: any) => e.id === 'event-1')).toBeUndefined();
    expect(response.body.activeEvents.find((e: any) => e.id === 'event-2')).toBeDefined();
    expect(response.body.activeEvents.find((e: any) => e.id === 'event-3')).toBeDefined();
  });

  it('should only return events for the specified player', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      luckValue: 0,
      drawsSinceLastLegendary: 0,
      consecutiveSynthesisFailures: 0,
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const now = new Date();

    const mockEvents = [
      {
        id: 'event-1',
        playerId: 'test-player',
        eventType: 'merchant',
        triggeredAt: now.toISOString(),
        claimed: false,
        merchantOffers: []
      }
    ];

    const mockActiveEventsSnapshot = {
      forEach: jest.fn((callback) => {
        mockEvents.forEach(event => {
          callback({
            data: () => event
          });
        });
      })
    };

    const mockWhereFn = jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue(mockActiveEventsSnapshot)
    });

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      where: mockWhereFn
    });

    await request(app)
      .get('/api/v1/events/active')
      .set('x-player-id', 'test-player');

    // Verify the where clause filters by playerId
    expect(mockWhereFn).toHaveBeenCalledWith('playerId', '==', 'test-player');
  });
});

describe('POST /api/v1/events/accept', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if eventId is missing', async () => {
    const response = await request(app)
      .post('/api/v1/events/accept')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_EVENT_ID');
  });

  it('should return 404 if player not found', async () => {
    const mockPlayerDoc = {
      exists: false
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PLAYER_NOT_FOUND');
  });

  it('should return 404 if event not found', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockEventDoc = {
      exists: false
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockEventDoc)
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('should return 403 if event does not belong to player', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockEvent = {
      id: 'event-123',
      playerId: 'other-player',
      eventType: 'merchant',
      triggeredAt: new Date().toISOString(),
      claimed: false,
      merchantOffers: []
    };

    const mockEventDoc = {
      exists: true,
      data: () => mockEvent
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockEventDoc)
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('EVENT_NOT_OWNED');
  });

  it('should return 400 if event is already claimed', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockEvent = {
      id: 'event-123',
      playerId: 'test-player',
      eventType: 'storm',
      triggeredAt: new Date().toISOString(),
      claimed: true,
      stormDrawsRemaining: 3
    };

    const mockEventDoc = {
      exists: true,
      data: () => mockEvent
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockEventDoc)
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('EVENT_ALREADY_CLAIMED');
  });

  it('should return 400 if event has expired', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const now = new Date();
    const pastExpiry = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

    const mockEvent = {
      id: 'event-123',
      playerId: 'test-player',
      eventType: 'lucky',
      triggeredAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      expiresAt: pastExpiry.toISOString(),
      claimed: false,
      luckyMomentBonus: 0.20
    };

    const mockEventDoc = {
      exists: true,
      data: () => mockEvent
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockEventDoc)
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('EVENT_EXPIRED');
  });

  it('should accept merchant offer and deduct currency', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockEvent = {
      id: 'event-123',
      playerId: 'test-player',
      eventType: 'merchant',
      triggeredAt: new Date().toISOString(),
      claimed: false,
      merchantOffers: [
        {
          id: 'offer-1',
          itemType: 'pack',
          itemId: 'premium-pack',
          price: 350,
          currencyType: 'soft',
          discount: 30
        }
      ]
    };

    const mockEventDoc = {
      exists: true,
      data: () => mockEvent
    };

    const mockPlayerUpdate = jest.fn().mockResolvedValue({});
    const mockEventUpdate = jest.fn().mockResolvedValue({});

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc),
        update: mockPlayerUpdate
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockEventDoc),
        update: mockEventUpdate
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123', offerId: 'offer-1' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.rewards.purchasedOffer).toBeDefined();
    expect(response.body.rewards.purchasedOffer.id).toBe('offer-1');
    expect(response.body.rewards.remainingCurrency).toBe(650);

    // Verify currency was deducted
    expect(mockPlayerUpdate).toHaveBeenCalledWith({
      softCurrency: 650
    });

    // Verify event was marked as claimed
    expect(mockEventUpdate).toHaveBeenCalledWith({
      claimed: true
    });
  });

  it('should return 400 if offerId is missing for merchant event', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockEvent = {
      id: 'event-123',
      playerId: 'test-player',
      eventType: 'merchant',
      triggeredAt: new Date().toISOString(),
      claimed: false,
      merchantOffers: []
    };

    const mockEventDoc = {
      exists: true,
      data: () => mockEvent
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockEventDoc)
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_OFFER_ID');
  });

  it('should return 404 if offer not found in merchant event', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockEvent = {
      id: 'event-123',
      playerId: 'test-player',
      eventType: 'merchant',
      triggeredAt: new Date().toISOString(),
      claimed: false,
      merchantOffers: [
        {
          id: 'offer-1',
          itemType: 'pack',
          itemId: 'premium-pack',
          price: 350,
          currencyType: 'soft',
          discount: 30
        }
      ]
    };

    const mockEventDoc = {
      exists: true,
      data: () => mockEvent
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockEventDoc)
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123', offerId: 'offer-999' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('OFFER_NOT_FOUND');
  });

  it('should return 400 if player has insufficient currency for merchant offer', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      softCurrency: 100, // Not enough for the offer
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockEvent = {
      id: 'event-123',
      playerId: 'test-player',
      eventType: 'merchant',
      triggeredAt: new Date().toISOString(),
      claimed: false,
      merchantOffers: [
        {
          id: 'offer-1',
          itemType: 'pack',
          itemId: 'premium-pack',
          price: 350,
          currencyType: 'soft',
          discount: 30
        }
      ]
    };

    const mockEventDoc = {
      exists: true,
      data: () => mockEvent
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockEventDoc)
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123', offerId: 'offer-1' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INSUFFICIENT_CURRENCY');
  });

  it('should accept storm event and return free draws', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockEvent = {
      id: 'event-123',
      playerId: 'test-player',
      eventType: 'storm',
      triggeredAt: new Date().toISOString(),
      claimed: false,
      stormDrawsRemaining: 3
    };

    const mockEventDoc = {
      exists: true,
      data: () => mockEvent
    };

    const mockEventUpdate = jest.fn().mockResolvedValue({});

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockEventDoc),
        update: mockEventUpdate
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.rewards.freeDraws).toBe(3);

    // Verify event was marked as claimed
    expect(mockEventUpdate).toHaveBeenCalledWith({
      claimed: true
    });
  });

  it('should return 400 if storm event has no draws remaining', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockEvent = {
      id: 'event-123',
      playerId: 'test-player',
      eventType: 'storm',
      triggeredAt: new Date().toISOString(),
      claimed: false,
      stormDrawsRemaining: 0
    };

    const mockEventDoc = {
      exists: true,
      data: () => mockEvent
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockEventDoc)
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('NO_DRAWS_REMAINING');
  });

  it('should accept copy event and duplicate card', async () => {
    const mockCard = {
      id: 'card-123',
      templateId: 'template-1',
      name: 'Test Card',
      rarity: 'rare',
      score: 100,
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'draw'
    };

    const mockPlayer = {
      id: 'test-player',
      cards: ['card-123'],
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockEvent = {
      id: 'event-123',
      playerId: 'test-player',
      eventType: 'copy',
      triggeredAt: new Date().toISOString(),
      claimed: false,
      copiedCard: mockCard
    };

    const mockEventDoc = {
      exists: true,
      data: () => mockEvent
    };

    const mockCardSet = jest.fn().mockResolvedValue({});
    const mockPlayerUpdate = jest.fn().mockResolvedValue({});
    const mockEventUpdate = jest.fn().mockResolvedValue({});

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc),
        update: mockPlayerUpdate
      })
    });

    (collections.cards as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: mockCardSet
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockEventDoc),
        update: mockEventUpdate
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.rewards.duplicatedCard).toBeDefined();
    expect(response.body.rewards.duplicatedCard.templateId).toBe('template-1');
    expect(response.body.rewards.duplicatedCard.name).toBe('Test Card');
    expect(response.body.rewards.duplicatedCard.obtainedFrom).toBe('event');

    // Verify new card was created
    expect(mockCardSet).toHaveBeenCalled();

    // Verify card was added to player's collection
    expect(mockPlayerUpdate).toHaveBeenCalledWith({
      cards: expect.arrayContaining(['card-123'])
    });

    // Verify event was marked as claimed
    expect(mockEventUpdate).toHaveBeenCalledWith({
      claimed: true
    });
  });

  it('should return 400 if copy event has no card to copy', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockEvent = {
      id: 'event-123',
      playerId: 'test-player',
      eventType: 'copy',
      triggeredAt: new Date().toISOString(),
      claimed: false
      // No copiedCard field
    };

    const mockEventDoc = {
      exists: true,
      data: () => mockEvent
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockEventDoc)
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('NO_CARD_TO_COPY');
  });

  it('should return 400 if trying to accept lucky event', async () => {
    const mockPlayer = {
      id: 'test-player',
      cards: [],
      softCurrency: 1000,
      hardCurrency: 100
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const now = new Date();
    const futureExpiry = new Date(now.getTime() + 5 * 60 * 1000);

    const mockEvent = {
      id: 'event-123',
      playerId: 'test-player',
      eventType: 'lucky',
      triggeredAt: now.toISOString(),
      expiresAt: futureExpiry.toISOString(),
      claimed: false,
      luckyMomentBonus: 0.20
    };

    const mockEventDoc = {
      exists: true,
      data: () => mockEvent
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockEventDoc)
      })
    });

    const response = await request(app)
      .post('/api/v1/events/accept')
      .set('x-player-id', 'test-player')
      .send({ eventId: 'event-123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_EVENT_TYPE');
  });
});
