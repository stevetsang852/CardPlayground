import { ObjectPool } from './ObjectPool';

/**
 * Manages performance settings based on device capabilities.
 *
 * Requirements: 11.1, 11.2, 11.4, 11.5
 */
export class PerformanceManager {
  /**
   * Returns true if the current device is mobile.
   * Mobile: screen width < 768px OR /Mobi/i.test(navigator.userAgent)
   */
  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || /Mobi/i.test(navigator.userAgent);
  }

  /**
   * Returns the particle effect limit based on device type.
   * Mobile: 50, Desktop: 100
   */
  getParticleLimit(): number {
    return this.isMobile() ? 50 : 100;
  }

  /**
   * Returns the fixed guardian limit (always 20).
   */
  getGuardianLimit(): number {
    return 20;
  }

  /**
   * Validates that the enemy pool has sufficient capacity.
   * Valid when pool.totalCreated() >= maxEnemiesPerWave × 2
   */
  validateEnemyPoolCapacity<T>(
    pool: ObjectPool<T>,
    maxEnemiesPerWave: number
  ): boolean {
    return pool.totalCreated() >= maxEnemiesPerWave * 2;
  }

  /**
   * Validates that the bullet pool has sufficient capacity.
   * Valid when pool.totalCreated() >= guardianLimit × 3
   */
  validateBulletPoolCapacity<T>(
    pool: ObjectPool<T>,
    guardianLimit: number
  ): boolean {
    return pool.totalCreated() >= guardianLimit * 3;
  }
}
