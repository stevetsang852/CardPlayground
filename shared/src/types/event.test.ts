import {
  EventConfiguration,
  validateEventConfiguration,
  isValidEventConfiguration,
  EventConfigurationValidationError,
  ActiveEvent,
  MerchantOffer,
  EventType
} from './event';
import { Card } from './card';

describe('EventConfiguration Validation', () => {
  describe('validateEventConfiguration', () => {
    describe('probability validation', () => {
      it('should accept valid probability at 0%', () => {
        const config: EventConfiguration = {
          eventType: 'merchant',
          probability: 0
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toEqual([]);
      });

      it('should accept valid probability at 100%', () => {
        const config: EventConfiguration = {
          eventType: 'storm',
          probability: 100
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toEqual([]);
      });

      it('should accept valid probability in middle range', () => {
        const config: EventConfiguration = {
          eventType: 'lucky',
          probability: 50.5
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toEqual([]);
      });

      it('should reject probability below 0%', () => {
        const config: EventConfiguration = {
          eventType: 'copy',
          probability: -0.1
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toContainEqual({
          field: 'probability',
          message: 'Probability must be between 0 and 100 (inclusive)'
        });
      });

      it('should reject probability above 100%', () => {
        const config: EventConfiguration = {
          eventType: 'merchant',
          probability: 100.1
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toContainEqual({
          field: 'probability',
          message: 'Probability must be between 0 and 100 (inclusive)'
        });
      });

      it('should reject non-numeric probability', () => {
        const config: any = {
          eventType: 'storm',
          probability: '50'
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toContainEqual({
          field: 'probability',
          message: 'Probability must be a number'
        });
      });

      it('should reject infinite probability', () => {
        const config: EventConfiguration = {
          eventType: 'lucky',
          probability: Infinity
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toContainEqual({
          field: 'probability',
          message: 'Probability must be a finite number'
        });
      });

      it('should reject NaN probability', () => {
        const config: EventConfiguration = {
          eventType: 'copy',
          probability: NaN
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toContainEqual({
          field: 'probability',
          message: 'Probability must be a finite number'
        });
      });
    });

    describe('duration validation', () => {
      it('should accept valid positive integer duration', () => {
        const config: EventConfiguration = {
          eventType: 'lucky',
          probability: 15,
          duration: 10
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toEqual([]);
      });

      it('should accept configuration without duration', () => {
        const config: EventConfiguration = {
          eventType: 'merchant',
          probability: 10
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toEqual([]);
      });

      it('should reject zero duration', () => {
        const config: EventConfiguration = {
          eventType: 'lucky',
          probability: 15,
          duration: 0
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toContainEqual({
          field: 'duration',
          message: 'Duration must be a positive integer'
        });
      });

      it('should reject negative duration', () => {
        const config: EventConfiguration = {
          eventType: 'lucky',
          probability: 15,
          duration: -5
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toContainEqual({
          field: 'duration',
          message: 'Duration must be a positive integer'
        });
      });

      it('should reject non-integer duration', () => {
        const config: EventConfiguration = {
          eventType: 'lucky',
          probability: 15,
          duration: 10.5
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toContainEqual({
          field: 'duration',
          message: 'Duration must be an integer'
        });
      });

      it('should reject non-numeric duration', () => {
        const config: any = {
          eventType: 'lucky',
          probability: 15,
          duration: '10'
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toContainEqual({
          field: 'duration',
          message: 'Duration must be a number'
        });
      });

      it('should reject infinite duration', () => {
        const config: EventConfiguration = {
          eventType: 'lucky',
          probability: 15,
          duration: Infinity
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toContainEqual({
          field: 'duration',
          message: 'Duration must be a finite number'
        });
      });
    });

    describe('multiple validation errors', () => {
      it('should return multiple errors when both fields are invalid', () => {
        const config: EventConfiguration = {
          eventType: 'lucky',
          probability: 150,
          duration: -10
        };
        const errors = validateEventConfiguration(config);
        expect(errors).toHaveLength(2);
        expect(errors).toContainEqual({
          field: 'probability',
          message: 'Probability must be between 0 and 100 (inclusive)'
        });
        expect(errors).toContainEqual({
          field: 'duration',
          message: 'Duration must be a positive integer'
        });
      });
    });
  });

  describe('isValidEventConfiguration', () => {
    it('should return true for valid configuration', () => {
      const config: EventConfiguration = {
        eventType: 'lucky',
        probability: 15,
        duration: 10
      };
      expect(isValidEventConfiguration(config)).toBe(true);
    });

    it('should return false for invalid probability', () => {
      const config: EventConfiguration = {
        eventType: 'merchant',
        probability: 150
      };
      expect(isValidEventConfiguration(config)).toBe(false);
    });

    it('should return false for invalid duration', () => {
      const config: EventConfiguration = {
        eventType: 'lucky',
        probability: 15,
        duration: -5
      };
      expect(isValidEventConfiguration(config)).toBe(false);
    });
  });

  describe('real-world event configurations', () => {
    it('should validate Mysterious Merchant event (10% probability)', () => {
      const config: EventConfiguration = {
        eventType: 'merchant',
        probability: 10
      };
      expect(isValidEventConfiguration(config)).toBe(true);
    });

    it('should validate Card Storm event (5% probability)', () => {
      const config: EventConfiguration = {
        eventType: 'storm',
        probability: 5
      };
      expect(isValidEventConfiguration(config)).toBe(true);
    });

    it('should validate Lucky Moment event (15% probability, 10 minute duration)', () => {
      const config: EventConfiguration = {
        eventType: 'lucky',
        probability: 15,
        duration: 10
      };
      expect(isValidEventConfiguration(config)).toBe(true);
    });

    it('should validate Copy Miracle event (10% probability)', () => {
      const config: EventConfiguration = {
        eventType: 'copy',
        probability: 10
      };
      expect(isValidEventConfiguration(config)).toBe(true);
    });
  });
});

describe('ActiveEvent Data Model', () => {
  describe('Merchant Event', () => {
    it('should create a valid merchant event with offers', () => {
      const merchantOffer: MerchantOffer = {
        id: 'offer-1',
        itemType: 'pack',
        itemId: 'premium-pack',
        price: 400,
        currencyType: 'soft',
        discount: 20
      };

      const event: ActiveEvent = {
        id: 'event-1',
        playerId: 'player-123',
        eventType: 'merchant',
        triggeredAt: '2024-01-01T00:00:00Z',
        merchantOffers: [merchantOffer],
        claimed: false
      };

      expect(event.eventType).toBe('merchant');
      expect(event.merchantOffers).toHaveLength(1);
      expect(event.merchantOffers![0].discount).toBe(20);
    });

    it('should support multiple merchant offers', () => {
      const offers: MerchantOffer[] = [
        {
          id: 'offer-1',
          itemType: 'pack',
          itemId: 'premium-pack',
          price: 400,
          currencyType: 'soft',
          discount: 20
        },
        {
          id: 'offer-2',
          itemType: 'material',
          itemId: 'rare-material',
          price: 100,
          currencyType: 'hard',
          discount: 50
        }
      ];

      const event: ActiveEvent = {
        id: 'event-1',
        playerId: 'player-123',
        eventType: 'merchant',
        triggeredAt: '2024-01-01T00:00:00Z',
        merchantOffers: offers,
        claimed: false
      };

      expect(event.merchantOffers).toHaveLength(2);
    });
  });

  describe('Storm Event', () => {
    it('should create a valid storm event with remaining draws', () => {
      const event: ActiveEvent = {
        id: 'event-2',
        playerId: 'player-456',
        eventType: 'storm',
        triggeredAt: '2024-01-01T00:00:00Z',
        stormDrawsRemaining: 3,
        claimed: false
      };

      expect(event.eventType).toBe('storm');
      expect(event.stormDrawsRemaining).toBe(3);
    });

    it('should track storm draws as they are consumed', () => {
      const event: ActiveEvent = {
        id: 'event-2',
        playerId: 'player-456',
        eventType: 'storm',
        triggeredAt: '2024-01-01T00:00:00Z',
        stormDrawsRemaining: 1,
        claimed: false
      };

      expect(event.stormDrawsRemaining).toBe(1);
    });
  });

  describe('Lucky Moment Event', () => {
    it('should create a valid lucky moment event with bonus and expiration', () => {
      const event: ActiveEvent = {
        id: 'event-3',
        playerId: 'player-789',
        eventType: 'lucky',
        triggeredAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-01-01T00:10:00Z',
        luckyMomentBonus: 0.20,
        claimed: false
      };

      expect(event.eventType).toBe('lucky');
      expect(event.luckyMomentBonus).toBe(0.20);
      expect(event.expiresAt).toBeDefined();
    });

    it('should support 20% synthesis success rate bonus', () => {
      const event: ActiveEvent = {
        id: 'event-3',
        playerId: 'player-789',
        eventType: 'lucky',
        triggeredAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-01-01T00:10:00Z',
        luckyMomentBonus: 0.20,
        claimed: false
      };

      const baseRate = 0.70;
      const modifiedRate = baseRate + event.luckyMomentBonus!;
      expect(modifiedRate).toBeCloseTo(0.90, 10);
    });
  });

  describe('Copy Miracle Event', () => {
    it('should create a valid copy miracle event with copied card', () => {
      const copiedCard: Card = {
        id: 'card-copy-1',
        templateId: 'template-1',
        name: 'Dragon Card',
        description: 'A powerful dragon',
        rarity: 'epic',
        theme: 'fantasy',
        imageUrl: 'https://example.com/dragon.png',
        score: 100,
        isLimitedEdition: false,
        obtainedAt: '2024-01-01T00:00:00Z',
        obtainedFrom: 'event'
      };

      const event: ActiveEvent = {
        id: 'event-4',
        playerId: 'player-101',
        eventType: 'copy',
        triggeredAt: '2024-01-01T00:00:00Z',
        copiedCard: copiedCard,
        claimed: false
      };

      expect(event.eventType).toBe('copy');
      expect(event.copiedCard).toBeDefined();
      expect(event.copiedCard!.name).toBe('Dragon Card');
      expect(event.copiedCard!.rarity).toBe('epic');
    });
  });

  describe('Event State Management', () => {
    it('should track claimed status', () => {
      const event: ActiveEvent = {
        id: 'event-5',
        playerId: 'player-202',
        eventType: 'storm',
        triggeredAt: '2024-01-01T00:00:00Z',
        stormDrawsRemaining: 3,
        claimed: false
      };

      expect(event.claimed).toBe(false);

      // Simulate claiming
      event.claimed = true;
      expect(event.claimed).toBe(true);
    });

    it('should include triggeredAt timestamp for all events', () => {
      const events: ActiveEvent[] = [
        {
          id: 'event-1',
          playerId: 'player-1',
          eventType: 'merchant',
          triggeredAt: '2024-01-01T00:00:00Z',
          claimed: false
        },
        {
          id: 'event-2',
          playerId: 'player-1',
          eventType: 'storm',
          triggeredAt: '2024-01-01T00:01:00Z',
          stormDrawsRemaining: 3,
          claimed: false
        },
        {
          id: 'event-3',
          playerId: 'player-1',
          eventType: 'lucky',
          triggeredAt: '2024-01-01T00:02:00Z',
          expiresAt: '2024-01-01T00:12:00Z',
          luckyMomentBonus: 0.20,
          claimed: false
        },
        {
          id: 'event-4',
          playerId: 'player-1',
          eventType: 'copy',
          triggeredAt: '2024-01-01T00:03:00Z',
          claimed: false
        }
      ];

      events.forEach(event => {
        expect(event.triggeredAt).toBeDefined();
        expect(typeof event.triggeredAt).toBe('string');
      });
    });
  });

  describe('Event Type Definitions', () => {
    it('should support all four event types', () => {
      const eventTypes: EventType[] = ['merchant', 'storm', 'lucky', 'copy'];
      
      eventTypes.forEach(type => {
        const event: ActiveEvent = {
          id: `event-${type}`,
          playerId: 'player-test',
          eventType: type,
          triggeredAt: '2024-01-01T00:00:00Z',
          claimed: false
        };
        
        expect(event.eventType).toBe(type);
      });
    });
  });

  describe('MerchantOffer Data Model', () => {
    it('should support pack offers', () => {
      const offer: MerchantOffer = {
        id: 'offer-pack',
        itemType: 'pack',
        itemId: 'legendary-pack',
        price: 1600,
        currencyType: 'soft',
        discount: 20
      };

      expect(offer.itemType).toBe('pack');
    });

    it('should support material offers', () => {
      const offer: MerchantOffer = {
        id: 'offer-material',
        itemType: 'material',
        itemId: 'epic-material',
        price: 50,
        currencyType: 'hard',
        discount: 30
      };

      expect(offer.itemType).toBe('material');
    });

    it('should support card offers', () => {
      const offer: MerchantOffer = {
        id: 'offer-card',
        itemType: 'card',
        itemId: 'special-card-1',
        price: 1000,
        currencyType: 'soft',
        discount: 10
      };

      expect(offer.itemType).toBe('card');
    });

    it('should support both currency types', () => {
      const softOffer: MerchantOffer = {
        id: 'offer-1',
        itemType: 'pack',
        itemId: 'pack-1',
        price: 500,
        currencyType: 'soft',
        discount: 20
      };

      const hardOffer: MerchantOffer = {
        id: 'offer-2',
        itemType: 'pack',
        itemId: 'pack-2',
        price: 100,
        currencyType: 'hard',
        discount: 15
      };

      expect(softOffer.currencyType).toBe('soft');
      expect(hardOffer.currencyType).toBe('hard');
    });
  });
});
