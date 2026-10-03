/**
 * Generic object pool for reusing objects and reducing GC pressure.
 *
 * Enemy pool capacity: max enemies per wave × 2
 * Bullet pool capacity: Guardian limit (20) × 3 = 60
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private readonly factory: () => T;
  private readonly resetFn: (obj: T) => void;
  private _totalCreated = 0;

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialCapacity = 0
  ) {
    this.factory = factory;
    this.resetFn = reset;

    for (let i = 0; i < initialCapacity; i++) {
      this.pool.push(this.factory());
      this._totalCreated++;
    }
  }

  /** Take an object from the pool, or create a new one if the pool is empty. */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    this._totalCreated++;
    return this.factory();
  }

  /** Reset and return an object to the pool. */
  release(obj: T): void {
    this.resetFn(obj);
    this.pool.push(obj);
  }

  /** Number of objects currently available in the pool. */
  size(): number {
    return this.pool.length;
  }

  /** Total number of objects ever created by this pool. */
  totalCreated(): number {
    return this._totalCreated;
  }
}
