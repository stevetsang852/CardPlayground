import { PerformanceManager } from './PerformanceManager';
import { ObjectPool } from './ObjectPool';

describe('PerformanceManager', () => {
  let manager: PerformanceManager;

  beforeEach(() => {
    manager = new PerformanceManager();
  });

  // --- isMobile ---

  describe('isMobile()', () => {
    it('returns false in jsdom (default window.innerWidth=1024)', () => {
      // jsdom sets innerWidth to 1024 by default
      expect(manager.isMobile()).toBe(false);
    });

    it('returns true when window.innerWidth < 768', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      expect(manager.isMobile()).toBe(true);
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    });

    it('returns true when userAgent contains Mobi', () => {
      const original = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (Linux; Android 10) Mobile Safari/537.36',
      });
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
      expect(manager.isMobile()).toBe(true);
      Object.defineProperty(navigator, 'userAgent', { writable: true, configurable: true, value: original });
    });
  });

  // --- getParticleLimit ---

  describe('getParticleLimit()', () => {
    it('returns 100 on desktop', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
      expect(manager.getParticleLimit()).toBe(100);
    });

    it('returns 50 on mobile (narrow screen)', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      expect(manager.getParticleLimit()).toBe(50);
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    });
  });

  // --- getGuardianLimit ---

  describe('getGuardianLimit()', () => {
    it('always returns 20', () => {
      expect(manager.getGuardianLimit()).toBe(20);
    });
  });

  // --- validateEnemyPoolCapacity (Requirement 11.1) ---

  describe('validateEnemyPoolCapacity()', () => {
    it('returns true when pool capacity >= maxEnemiesPerWave × 2', () => {
      const pool = new ObjectPool<object>(() => ({}), () => {}, 20);
      expect(manager.validateEnemyPoolCapacity(pool, 10)).toBe(true);
    });

    it('returns true when pool capacity equals exactly maxEnemiesPerWave × 2', () => {
      const pool = new ObjectPool<object>(() => ({}), () => {}, 10);
      expect(manager.validateEnemyPoolCapacity(pool, 5)).toBe(true);
    });

    it('returns false when pool capacity < maxEnemiesPerWave × 2', () => {
      const pool = new ObjectPool<object>(() => ({}), () => {}, 5);
      expect(manager.validateEnemyPoolCapacity(pool, 10)).toBe(false);
    });

    it('returns false for empty pool with non-zero maxEnemiesPerWave', () => {
      const pool = new ObjectPool<object>(() => ({}), () => {}, 0);
      expect(manager.validateEnemyPoolCapacity(pool, 1)).toBe(false);
    });

    it('returns true for empty pool with maxEnemiesPerWave=0', () => {
      const pool = new ObjectPool<object>(() => ({}), () => {}, 0);
      expect(manager.validateEnemyPoolCapacity(pool, 0)).toBe(true);
    });
  });

  // --- validateBulletPoolCapacity (Requirement 11.2) ---

  describe('validateBulletPoolCapacity()', () => {
    it('returns true when pool capacity >= guardianLimit × 3', () => {
      const pool = new ObjectPool<object>(() => ({}), () => {}, 60);
      expect(manager.validateBulletPoolCapacity(pool, 20)).toBe(true);
    });

    it('returns true when pool capacity equals exactly guardianLimit × 3', () => {
      const pool = new ObjectPool<object>(() => ({}), () => {}, 60);
      expect(manager.validateBulletPoolCapacity(pool, 20)).toBe(true);
    });

    it('returns false when pool capacity < guardianLimit × 3', () => {
      const pool = new ObjectPool<object>(() => ({}), () => {}, 59);
      expect(manager.validateBulletPoolCapacity(pool, 20)).toBe(false);
    });

    it('validates default guardian limit of 20 requires bullet pool >= 60', () => {
      const guardianLimit = manager.getGuardianLimit(); // 20
      const validPool = new ObjectPool<object>(() => ({}), () => {}, guardianLimit * 3);
      const invalidPool = new ObjectPool<object>(() => ({}), () => {}, guardianLimit * 3 - 1);
      expect(manager.validateBulletPoolCapacity(validPool, guardianLimit)).toBe(true);
      expect(manager.validateBulletPoolCapacity(invalidPool, guardianLimit)).toBe(false);
    });
  });
});
