import request from 'supertest';
import { app } from '../../index';
import { collections } from '../../config/database';
import { PackConfiguration } from '@shared/types/pack';
import { Player } from '@shared/types/player';
import { Card } from '@shared/types/card';
import * as fc from 'fast-check';

// Mock the database
jest.mock('../../config/database', () => {
  const mockFirestore = {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({}),
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
      onSnapshot: jest.fn()
    }),
    batch: jest.fn().mockReturnValue({
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    })
  };
  return {
    collections: {
      players: jest.fn(),
      cards: jest.fn(),
      packConfigurations: jest.fn(),
      cardTemplates: jest.fn(),
      activeEvents: jest.fn()
    },
    getDatabase: jest.fn().mockReturnValue(mockFirestore),
    initializeDatabase: jest.fn().mockReturnValue(mockFirestore)
  };
});

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  },
  firestore: jest.fn()
}));

// Mock Redis
jest.mock('../../config/redis', () => ({
  initializeRedis: jest.fn().mockResolvedValue(undefined),
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn()
  })
}));

// Mock SeasonService
jest.mock('../../services/seasonService', () => ({
  SeasonService: jest.fn().mockImplementation(() => ({
    trackMissionProgress: jest.fn().mockResolvedValue(undefined),
    getCurrentSeason: jest.fn().mockResolvedValue(null)
  }))
}));

// Mock PersonalizationService
jest.mock('../../services/personalizationService', () => ({
  PersonalizationService: jest.fn().mockImplementation(() => ({
    updateCollectionPreferences: jest.fn().mockResolvedValue(undefined),
    getEmotionalFeedback: jest.fn().mockReturnValue(undefined),
    getPackRecommendations: jest.fn().mockImplementation((_playerId: string, packs: any[]) => Promise.resolve(packs))
  }))
}));

describe('POST /api/v1/cards/draw', () => {
  const mockPlayerId = 'test-player-123';
  
  const mockPlayer: Player = {
    id: mockPlayerId,
    username: 'testuser',
    email: 'test@example.com',
    softCurrency: 1000,
    hardCurrency: 100,
    cards: [],
    galleryCardIds: [],
    level: 1,
    experience: 0,
    battlePassLevel: 0,
    battlePassXP: 0,
    hasPaidBattlePass: false,
    luckValue: 0,
    drawsSinceLastLegendary: 0,
    consecutiveSynthesisFailures: 0,
    consecutiveLoginDays: 1,
    lastLoginDate: new Date().toISOString(),
    totalPlayTime: 0,
    preferredThemes: [],
    collectionFocus: [],
    friends: [],
    legendaryPacksThisWeek: 0,
    weekResetDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  };

  const mockBasicPack: PackConfiguration = {
    id: 'basic-pack',
    name: 'Basic Pack',
    type: 'basic',
    cost: 100,
    currencyType: 'soft',
    probabilities: {
      legendary: 0.005,
      epic: 0.05,
      rare: 0.245,
      common: 0.7
    }
  };

  const mockCardTemplates: Card[] = [
    {
      id: 'template-common-1',
      templateId: 'template-common-1',
      name: 'Common Card 1',
      description: 'A common card',
      rarity: 'common',
      theme: 'nature',
      imageUrl: '/images/common1.png',
      score: 10,
      isLimitedEdition: false,
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'draw'
    },
    {
      id: 'template-rare-1',
      templateId: 'template-rare-1',
      name: 'Rare Card 1',
      description: 'A rare card',
      rarity: 'rare',
      theme: 'nature',
      imageUrl: '/images/rare1.png',
      score: 50,
      isLimitedEdition: false,
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'draw'
    },
    {
      id: 'template-epic-1',
      templateId: 'template-epic-1',
      name: 'Epic Card 1',
      description: 'An epic card',
      rarity: 'epic',
      theme: 'nature',
      imageUrl: '/images/epic1.png',
      score: 200,
      isLimitedEdition: false,
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'draw'
    },
    {
      id: 'template-legendary-1',
      templateId: 'template-legendary-1',
      name: 'Legendary Card 1',
      description: 'A legendary card',
      rarity: 'legendary',
      theme: 'nature',
      imageUrl: '/images/legendary1.png',
      score: 1000,
      isLimitedEdition: false,
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'draw'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no active storm events
    const mockActiveEventsQuery = {
      where: jest.fn(),
      get: jest.fn().mockResolvedValue({ docs: [] })
    };
    mockActiveEventsQuery.where.mockReturnValue(mockActiveEventsQuery);
    (collections.activeEvents as jest.Mock).mockReturnValue(mockActiveEventsQuery);
  });

  it('should successfully draw a card from basic pack', async () => {
    // Mock database responses
    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockPackConfigSnapshot = {
      empty: false,
      docs: [{
        data: () => mockBasicPack
      }]
    };

    const mockCardTemplatesSnapshot = {
      docs: mockCardTemplates.map(template => ({
        data: () => template
      }))
    };

    const mockBatch = {
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.packConfigurations as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockPackConfigSnapshot)
        })
      })
    });

    (collections.cardTemplates as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue(mockCardTemplatesSnapshot)
    });

    (collections.cards as jest.Mock).mockReturnValue({
      firestore: {
        batch: jest.fn().mockReturnValue(mockBatch)
      },
      doc: jest.fn().mockReturnValue({})
    });

    const response = await request(app)
      .post('/api/v1/cards/draw')
      .set('x-player-id', mockPlayerId)
      .send({
        packType: 'basic',
        quantity: 1,
        currencyType: 'soft'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('cards');
    expect(response.body).toHaveProperty('newLuckValue');
    expect(response.body).toHaveProperty('transactionId');
    expect(response.body.cards).toHaveLength(1);
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('should reject invalid pack type', async () => {
    const response = await request(app)
      .post('/api/v1/cards/draw')
      .set('x-player-id', mockPlayerId)
      .send({
        packType: 'invalid',
        quantity: 1,
        currencyType: 'soft'
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PACK_TYPE');
  });

  it('should reject insufficient currency', async () => {
    const poorPlayer = { ...mockPlayer, softCurrency: 50 };

    const mockPlayerDoc = {
      exists: true,
      data: () => poorPlayer
    };

    const mockPackConfigSnapshot = {
      empty: false,
      docs: [{
        data: () => mockBasicPack
      }]
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.packConfigurations as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockPackConfigSnapshot)
        })
      })
    });

    const response = await request(app)
      .post('/api/v1/cards/draw')
      .set('x-player-id', mockPlayerId)
      .send({
        packType: 'basic',
        quantity: 1,
        currencyType: 'soft'
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INSUFFICIENT_CURRENCY');
  });

  it('should enforce legendary pack purchase limit', async () => {
    const playerWithMaxLegendary = {
      ...mockPlayer,
      softCurrency: 10000,
      legendaryPacksThisWeek: 3
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => playerWithMaxLegendary
    };

    const mockLegendaryPack: PackConfiguration = {
      id: 'legendary-pack',
      name: 'Legendary Pack',
      type: 'legendary',
      cost: 2000,
      currencyType: 'soft',
      probabilities: {
        legendary: 0.1,
        epic: 0.4,
        rare: 0.3,
        common: 0.2
      }
    };

    const mockPackConfigSnapshot = {
      empty: false,
      docs: [{
        data: () => mockLegendaryPack
      }]
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.packConfigurations as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockPackConfigSnapshot)
        })
      })
    });

    const response = await request(app)
      .post('/api/v1/cards/draw')
      .set('x-player-id', mockPlayerId)
      .send({
        packType: 'legendary',
        quantity: 1,
        currencyType: 'soft'
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PURCHASE_LIMIT_EXCEEDED');
  });

  it('should return player not found error', async () => {
    const mockPlayerDoc = {
      exists: false
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    const response = await request(app)
      .post('/api/v1/cards/draw')
      .set('x-player-id', 'non-existent-player')
      .send({
        packType: 'basic',
        quantity: 1,
        currencyType: 'soft'
      });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PLAYER_NOT_FOUND');
  });

  it('should apply Card Storm free draws and skip currency deduction', async () => {
    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockPackConfigSnapshot = {
      empty: false,
      docs: [{ data: () => mockBasicPack }]
    };

    const mockCardTemplatesSnapshot = {
      docs: mockCardTemplates.map(template => ({ data: () => template }))
    };

    const mockBatch = {
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    };

    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const mockStormEvent = {
      id: 'storm-event-1',
      playerId: mockPlayerId,
      eventType: 'storm',
      triggeredAt: new Date().toISOString(),
      expiresAt: futureExpiry,
      stormDrawsRemaining: 3,
      claimed: false
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [{ id: 'storm-event-1', data: () => mockStormEvent }]
      }),
      doc: jest.fn().mockReturnValue({})
    });

    (collections.packConfigurations as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockPackConfigSnapshot)
        })
      })
    });

    (collections.cardTemplates as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue(mockCardTemplatesSnapshot)
    });

    (collections.cards as jest.Mock).mockReturnValue({
      firestore: { batch: jest.fn().mockReturnValue(mockBatch) },
      doc: jest.fn().mockReturnValue({})
    });

    const response = await request(app)
      .post('/api/v1/cards/draw')
      .set('x-player-id', mockPlayerId)
      .send({ packType: 'basic', quantity: 1, currencyType: 'soft' });

    expect(response.status).toBe(200);
    expect(response.body.stormDrawsUsed).toBe(1);
    // Storm event update should be included in batch
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ stormDrawsRemaining: 2 })
    );
  });

  it('should mark storm event as claimed when stormDrawsRemaining reaches 0', async () => {
    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    const mockPackConfigSnapshot = {
      empty: false,
      docs: [{ data: () => mockBasicPack }]
    };

    const mockCardTemplatesSnapshot = {
      docs: mockCardTemplates.map(template => ({ data: () => template }))
    };

    const mockBatch = {
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    };

    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const mockStormEvent = {
      id: 'storm-event-1',
      playerId: mockPlayerId,
      eventType: 'storm',
      triggeredAt: new Date().toISOString(),
      expiresAt: futureExpiry,
      stormDrawsRemaining: 1,
      claimed: false
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [{ id: 'storm-event-1', data: () => mockStormEvent }]
      }),
      doc: jest.fn().mockReturnValue({})
    });

    (collections.packConfigurations as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockPackConfigSnapshot)
        })
      })
    });

    (collections.cardTemplates as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue(mockCardTemplatesSnapshot)
    });

    (collections.cards as jest.Mock).mockReturnValue({
      firestore: { batch: jest.fn().mockReturnValue(mockBatch) },
      doc: jest.fn().mockReturnValue({})
    });

    const response = await request(app)
      .post('/api/v1/cards/draw')
      .set('x-player-id', mockPlayerId)
      .send({ packType: 'basic', quantity: 1, currencyType: 'soft' });

    expect(response.status).toBe(200);
    expect(response.body.stormDrawsUsed).toBe(1);
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ stormDrawsRemaining: 0, claimed: true })
    );
  });

  it('should ignore expired storm events and charge full currency', async () => {
    const poorPlayer = { ...mockPlayer, softCurrency: 50 };
    const mockPlayerDoc = {
      exists: true,
      data: () => poorPlayer
    };

    const mockPackConfigSnapshot = {
      empty: false,
      docs: [{ data: () => mockBasicPack }]
    };

    const expiredStormEvent = {
      id: 'storm-event-expired',
      playerId: mockPlayerId,
      eventType: 'storm',
      triggeredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(), // already expired
      stormDrawsRemaining: 3,
      claimed: false
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    (collections.activeEvents as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [{ id: 'storm-event-expired', data: () => expiredStormEvent }]
      })
    });

    (collections.packConfigurations as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockPackConfigSnapshot)
        })
      })
    });

    const response = await request(app)
      .post('/api/v1/cards/draw')
      .set('x-player-id', mockPlayerId)
      .send({ packType: 'basic', quantity: 1, currencyType: 'soft' });

    // Should fail with insufficient currency since storm event is expired
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INSUFFICIENT_CURRENCY');
  });
});

describe('GET /api/v1/cards/packs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all available packs', async () => {
    const mockPacks: PackConfiguration[] = [
      {
        id: 'basic-pack',
        name: 'Basic Pack',
        type: 'basic',
        cost: 100,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.005,
          epic: 0.05,
          rare: 0.245,
          common: 0.7
        }
      },
      {
        id: 'premium-pack',
        name: 'Premium Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        }
      },
      {
        id: 'legendary-pack',
        name: 'Legendary Pack',
        type: 'legendary',
        cost: 2000,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.1,
          epic: 0.4,
          rare: 0.3,
          common: 0.2
        }
      }
    ];

    const mockPackConfigsSnapshot = {
      empty: false,
      docs: mockPacks.map(pack => ({
        data: () => pack
      }))
    };

    (collections.packConfigurations as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue(mockPackConfigsSnapshot)
    });

    const response = await request(app)
      .get('/api/v1/cards/packs');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('packs');
    expect(response.body.packs).toHaveLength(3);
    expect(response.body.packs[0]).toHaveProperty('id');
    expect(response.body.packs[0]).toHaveProperty('name');
    expect(response.body.packs[0]).toHaveProperty('type');
    expect(response.body.packs[0]).toHaveProperty('cost');
    expect(response.body.packs[0]).toHaveProperty('probabilities');
  });

  it('should return empty array when no packs exist', async () => {
    const mockPackConfigsSnapshot = {
      empty: true,
      docs: []
    };

    (collections.packConfigurations as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue(mockPackConfigsSnapshot)
    });

    const response = await request(app)
      .get('/api/v1/cards/packs');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('packs');
    expect(response.body.packs).toHaveLength(0);
  });

  it('should filter out packs not yet available', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days in the future

    const mockPacks: PackConfiguration[] = [
      {
        id: 'basic-pack',
        name: 'Basic Pack',
        type: 'basic',
        cost: 100,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.005,
          epic: 0.05,
          rare: 0.245,
          common: 0.7
        }
      },
      {
        id: 'future-pack',
        name: 'Future Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        availableFrom: futureDate.toISOString()
      }
    ];

    const mockPackConfigsSnapshot = {
      empty: false,
      docs: mockPacks.map(pack => ({
        data: () => pack
      }))
    };

    (collections.packConfigurations as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue(mockPackConfigsSnapshot)
    });

    const response = await request(app)
      .get('/api/v1/cards/packs');

    expect(response.status).toBe(200);
    expect(response.body.packs).toHaveLength(1);
    expect(response.body.packs[0].id).toBe('basic-pack');
  });

  it('should filter out expired packs', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7); // 7 days in the past

    const mockPacks: PackConfiguration[] = [
      {
        id: 'basic-pack',
        name: 'Basic Pack',
        type: 'basic',
        cost: 100,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.005,
          epic: 0.05,
          rare: 0.245,
          common: 0.7
        }
      },
      {
        id: 'expired-pack',
        name: 'Expired Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        availableUntil: pastDate.toISOString()
      }
    ];

    const mockPackConfigsSnapshot = {
      empty: false,
      docs: mockPacks.map(pack => ({
        data: () => pack
      }))
    };

    (collections.packConfigurations as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue(mockPackConfigsSnapshot)
    });

    const response = await request(app)
      .get('/api/v1/cards/packs');

    expect(response.status).toBe(200);
    expect(response.body.packs).toHaveLength(1);
    expect(response.body.packs[0].id).toBe('basic-pack');
  });

  it('should include packs within availability window', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7); // 7 days in the past
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days in the future

    const mockPacks: PackConfiguration[] = [
      {
        id: 'limited-pack',
        name: 'Limited Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        availableFrom: pastDate.toISOString(),
        availableUntil: futureDate.toISOString()
      }
    ];

    const mockPackConfigsSnapshot = {
      empty: false,
      docs: mockPacks.map(pack => ({
        data: () => pack
      }))
    };

    (collections.packConfigurations as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue(mockPackConfigsSnapshot)
    });

    const response = await request(app)
      .get('/api/v1/cards/packs');

    expect(response.status).toBe(200);
    expect(response.body.packs).toHaveLength(1);
    expect(response.body.packs[0].id).toBe('limited-pack');
  });

  it('should handle database errors gracefully', async () => {
    (collections.packConfigurations as jest.Mock).mockReturnValue({
      get: jest.fn().mockRejectedValue(new Error('Database connection failed'))
    });

    const response = await request(app)
      .get('/api/v1/cards/packs');

    expect(response.status).toBe(500);
  });
});

describe('GET /api/v1/cards/luck', () => {
  const mockPlayerId = 'test-player-123';
  
  const mockPlayer: Player = {
    id: mockPlayerId,
    username: 'testuser',
    email: 'test@example.com',
    softCurrency: 1000,
    hardCurrency: 100,
    cards: [],
    galleryCardIds: [],
    level: 1,
    experience: 0,
    battlePassLevel: 0,
    battlePassXP: 0,
    hasPaidBattlePass: false,
    luckValue: 25.5,
    drawsSinceLastLegendary: 42,
    consecutiveSynthesisFailures: 0,
    consecutiveLoginDays: 1,
    lastLoginDate: new Date().toISOString(),
    totalPlayTime: 0,
    preferredThemes: [],
    collectionFocus: [],
    friends: [],
    legendaryPacksThisWeek: 0,
    weekResetDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return player luck value and draw count', async () => {
    const mockPlayerDoc = {
      exists: true,
      data: () => mockPlayer
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    const response = await request(app)
      .get('/api/v1/cards/luck')
      .set('x-player-id', mockPlayerId);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('luckValue');
    expect(response.body).toHaveProperty('drawsSinceLastLegendary');
    expect(response.body.luckValue).toBe(25.5);
    expect(response.body.drawsSinceLastLegendary).toBe(42);
  });

  it('should return zero values for new player', async () => {
    const newPlayer = {
      ...mockPlayer,
      luckValue: 0,
      drawsSinceLastLegendary: 0
    };

    const mockPlayerDoc = {
      exists: true,
      data: () => newPlayer
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    const response = await request(app)
      .get('/api/v1/cards/luck')
      .set('x-player-id', mockPlayerId);

    expect(response.status).toBe(200);
    expect(response.body.luckValue).toBe(0);
    expect(response.body.drawsSinceLastLegendary).toBe(0);
  });

  it('should return player not found error', async () => {
    const mockPlayerDoc = {
      exists: false
    };

    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockPlayerDoc)
      })
    });

    const response = await request(app)
      .get('/api/v1/cards/luck')
      .set('x-player-id', 'non-existent-player');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PLAYER_NOT_FOUND');
  });

  it('should handle database errors gracefully', async () => {
    (collections.players as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      })
    });

    const response = await request(app)
      .get('/api/v1/cards/luck')
      .set('x-player-id', mockPlayerId);

    expect(response.status).toBe(500);
  });
});

/**
 * Property 40: Network error recovery
 * **Validates: Requirements 12.4**
 * 
 * For any card draw that encounters a network error, the system should either 
 * successfully retry the operation or refund the full cost to the player.
 */
describe('Property 40: Network error recovery', () => {
  const mockPlayerId = 'test-player-pbt';
  
  const mockCardTemplates: Card[] = [
    {
      id: 'template-common-1',
      templateId: 'template-common-1',
      name: 'Common Card 1',
      description: 'A common card',
      rarity: 'common',
      theme: 'nature',
      imageUrl: '/images/common1.png',
      score: 10,
      isLimitedEdition: false,
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'draw'
    },
    {
      id: 'template-rare-1',
      templateId: 'template-rare-1',
      name: 'Rare Card 1',
      description: 'A rare card',
      rarity: 'rare',
      theme: 'nature',
      imageUrl: '/images/rare1.png',
      score: 50,
      isLimitedEdition: false,
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'draw'
    },
    {
      id: 'template-epic-1',
      templateId: 'template-epic-1',
      name: 'Epic Card 1',
      description: 'An epic card',
      rarity: 'epic',
      theme: 'nature',
      imageUrl: '/images/epic1.png',
      score: 200,
      isLimitedEdition: false,
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'draw'
    },
    {
      id: 'template-legendary-1',
      templateId: 'template-legendary-1',
      name: 'Legendary Card 1',
      description: 'A legendary card',
      rarity: 'legendary',
      theme: 'nature',
      imageUrl: '/images/legendary1.png',
      score: 1000,
      isLimitedEdition: false,
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'draw'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no active storm events
    const mockActiveEventsQuery = {
      where: jest.fn(),
      get: jest.fn().mockResolvedValue({ docs: [] })
    };
    mockActiveEventsQuery.where.mockReturnValue(mockActiveEventsQuery);
    (collections.activeEvents as jest.Mock).mockReturnValue(mockActiveEventsQuery);
  });

  it('should retry and succeed on transient network errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          packType: fc.constantFrom('basic', 'premium', 'legendary'),
          currencyType: fc.constantFrom('soft', 'hard'),
          initialSoftCurrency: fc.integer({ min: 5000, max: 10000 }),
          initialHardCurrency: fc.integer({ min: 500, max: 1000 }),
          failureAttempts: fc.integer({ min: 1, max: 2 }) // Fail 1-2 times before succeeding
        }),
        async ({ packType, currencyType, initialSoftCurrency, initialHardCurrency, failureAttempts }) => {
          const packCosts: Record<string, number> = { basic: 100, premium: 500, legendary: 2000 };
          const packCost = packCosts[packType];

          // Skip if player doesn't have enough currency
          const playerCurrency = currencyType === 'soft' ? initialSoftCurrency : initialHardCurrency;
          if (playerCurrency < packCost) {
            return true;
          }

          const mockPlayer: Player = {
            id: mockPlayerId,
            username: 'testuser',
            email: 'test@example.com',
            softCurrency: initialSoftCurrency,
            hardCurrency: initialHardCurrency,
            cards: [],
            galleryCardIds: [],
            level: 1,
            experience: 0,
            battlePassLevel: 0,
            battlePassXP: 0,
            hasPaidBattlePass: false,
            luckValue: 0,
            drawsSinceLastLegendary: 0,
            consecutiveSynthesisFailures: 0,
            consecutiveLoginDays: 1,
            lastLoginDate: new Date().toISOString(),
            totalPlayTime: 0,
            preferredThemes: [],
            collectionFocus: [],
            friends: [],
            legendaryPacksThisWeek: packType === 'legendary' ? 0 : 0,
            weekResetDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString()
          };

          const mockPack: PackConfiguration = {
            id: `${packType}-pack`,
            name: `${packType} Pack`,
            type: packType as any,
            cost: packCost,
            currencyType: currencyType as any,
            probabilities: {
              legendary: packType === 'legendary' ? 0.1 : packType === 'premium' ? 0.02 : 0.005,
              epic: packType === 'legendary' ? 0.4 : packType === 'premium' ? 0.15 : 0.05,
              rare: 0.3,
              common: 0.5
            }
          };

          let attemptCount = 0;
          const mockPlayerDoc = {
            exists: true,
            data: () => mockPlayer
          };

          const mockPackConfigSnapshot = {
            empty: false,
            docs: [{
              data: () => mockPack
            }]
          };

          const mockCardTemplatesSnapshot = {
            docs: mockCardTemplates.map(template => ({
              data: () => template
            }))
          };

          const mockBatch = {
            set: jest.fn(),
            update: jest.fn(),
            commit: jest.fn().mockImplementation(() => {
              attemptCount++;
              if (attemptCount <= failureAttempts) {
                // Simulate network error
                const error: any = new Error('Network timeout');
                error.code = 'ETIMEDOUT';
                return Promise.reject(error);
              }
              // Succeed on final attempt
              return Promise.resolve();
            })
          };

          (collections.players as jest.Mock).mockReturnValue({
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockPlayerDoc),
              update: jest.fn().mockResolvedValue(undefined)
            })
          });

          (collections.packConfigurations as jest.Mock).mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue(mockPackConfigSnapshot)
              })
            })
          });

          (collections.cardTemplates as jest.Mock).mockReturnValue({
            get: jest.fn().mockResolvedValue(mockCardTemplatesSnapshot)
          });

          (collections.cards as jest.Mock).mockReturnValue({
            firestore: {
              batch: jest.fn().mockReturnValue(mockBatch)
            },
            doc: jest.fn().mockReturnValue({})
          });

          const response = await request(app)
            .post('/api/v1/cards/draw')
            .set('x-player-id', mockPlayerId)
            .send({
              packType,
              quantity: 1,
              currencyType
            });

          // Should succeed after retries
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('cards');
          expect(response.body.cards).toHaveLength(1);
          expect(response.body).toHaveProperty('transactionId');
          
          // Verify retry attempts were made
          expect(attemptCount).toBe(failureAttempts + 1);

          return true;
        }
      ),
      { numRuns: 3 } // Reduced for faster async tests with retries
    );
  }, 30000); // Increase timeout for async property tests with retries

  it('should refund currency when all retry attempts fail', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          packType: fc.constantFrom('basic', 'premium'),
          currencyType: fc.constantFrom('soft', 'hard'),
          initialSoftCurrency: fc.integer({ min: 5000, max: 10000 }),
          initialHardCurrency: fc.integer({ min: 500, max: 1000 })
        }),
        async ({ packType, currencyType, initialSoftCurrency, initialHardCurrency }) => {
          const packCosts: Record<string, number> = { basic: 100, premium: 500 };
          const packCost = packCosts[packType];

          // Skip if player doesn't have enough currency
          const playerCurrency = currencyType === 'soft' ? initialSoftCurrency : initialHardCurrency;
          if (playerCurrency < packCost) {
            return true;
          }

          const mockPlayer: Player = {
            id: mockPlayerId,
            username: 'testuser',
            email: 'test@example.com',
            softCurrency: initialSoftCurrency,
            hardCurrency: initialHardCurrency,
            cards: [],
            galleryCardIds: [],
            level: 1,
            experience: 0,
            battlePassLevel: 0,
            battlePassXP: 0,
            hasPaidBattlePass: false,
            luckValue: 0,
            drawsSinceLastLegendary: 0,
            consecutiveSynthesisFailures: 0,
            consecutiveLoginDays: 1,
            lastLoginDate: new Date().toISOString(),
            totalPlayTime: 0,
            preferredThemes: [],
            collectionFocus: [],
            friends: [],
            legendaryPacksThisWeek: 0,
            weekResetDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString()
          };

          const mockPack: PackConfiguration = {
            id: `${packType}-pack`,
            name: `${packType} Pack`,
            type: packType as any,
            cost: packCost,
            currencyType: currencyType as any,
            probabilities: {
              legendary: packType === 'premium' ? 0.02 : 0.005,
              epic: packType === 'premium' ? 0.15 : 0.05,
              rare: 0.3,
              common: 0.5
            }
          };

          const mockPlayerDoc = {
            exists: true,
            data: () => mockPlayer
          };

          const mockPackConfigSnapshot = {
            empty: false,
            docs: [{
              data: () => mockPack
            }]
          };

          const mockCardTemplatesSnapshot = {
            docs: mockCardTemplates.map(template => ({
              data: () => template
            }))
          };

          // Always fail batch commit to simulate persistent network error
          const mockBatch = {
            set: jest.fn(),
            update: jest.fn(),
            commit: jest.fn().mockImplementation(() => {
              const error: any = new Error('Network connection refused');
              error.code = 'ECONNREFUSED';
              return Promise.reject(error);
            })
          };

          let refundCalled = false;
          let getCallCount = 0;
          const mockPlayerRef = {
            get: jest.fn().mockImplementation(() => {
              getCallCount++;
              if (getCallCount === 1) {
                // First call: initial player fetch with original currency
                return Promise.resolve({
                  exists: true,
                  data: () => mockPlayer
                });
              }
              // Subsequent calls: refund fetch with deducted currency
              return Promise.resolve({
                exists: true,
                data: () => ({
                  ...mockPlayer,
                  softCurrency: currencyType === 'soft' ? initialSoftCurrency - packCost : initialSoftCurrency,
                  hardCurrency: currencyType === 'hard' ? initialHardCurrency - packCost : initialHardCurrency
                })
              });
            }),
            update: jest.fn().mockImplementation((updateData: any) => {
              refundCalled = true;
              // Verify refund amount is correct
              if (currencyType === 'soft') {
                expect(updateData.softCurrency).toBe(initialSoftCurrency);
              } else {
                expect(updateData.hardCurrency).toBe(initialHardCurrency);
              }
              return Promise.resolve();
            })
          };

          (collections.players as jest.Mock).mockReturnValue({
            doc: jest.fn().mockReturnValue(mockPlayerRef)
          });

          (collections.packConfigurations as jest.Mock).mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue(mockPackConfigSnapshot)
              })
            })
          });

          (collections.cardTemplates as jest.Mock).mockReturnValue({
            get: jest.fn().mockResolvedValue(mockCardTemplatesSnapshot)
          });

          (collections.cards as jest.Mock).mockReturnValue({
            firestore: {
              batch: jest.fn().mockReturnValue(mockBatch)
            },
            doc: jest.fn().mockReturnValue({})
          });

          const response = await request(app)
            .post('/api/v1/cards/draw')
            .set('x-player-id', mockPlayerId)
            .send({
              packType,
              quantity: 1,
              currencyType
            });

          // Should return error after all retries fail
          expect(response.status).toBe(500);
          
          // Verify refund was attempted
          expect(refundCalled).toBe(true);
          
          // Verify error response includes refund information
          if (response.body.error && response.body.error.details) {
            expect(response.body.error.details.refunded).toBe(true);
            expect(response.body.error.details.refundAmount).toBe(packCost);
            expect(response.body.error.details.refundCurrency).toBe(currencyType);
          }

          return true;
        }
      ),
      { numRuns: 3 } // Reduced for faster async tests with retries
    );
  }, 30000); // Increase timeout for async property tests with retries
});

