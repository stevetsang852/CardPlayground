import { ObjectPool } from './ObjectPool';

interface TestObj {
  value: number;
  active: boolean;
}

function makeFactory() {
  let id = 0;
  return () => ({ value: ++id, active: true });
}

function makeReset() {
  return (obj: TestObj) => {
    obj.active = false;
  };
}

// Req 11.1 & 11.2: Pre-allocated capacity
describe('pre-allocated capacity', () => {
  it('pool starts with the specified initial size', () => {
    const pool = new ObjectPool<TestObj>(makeFactory(), makeReset(), 10);
    expect(pool.size()).toBe(10);
    expect(pool.totalCreated()).toBe(10);
  });

  it('enemy pool capacity: max enemies per wave × 2', () => {
    const maxEnemiesPerWave = 15;
    const capacity = maxEnemiesPerWave * 2; // 30
    const pool = new ObjectPool<TestObj>(makeFactory(), makeReset(), capacity);
    expect(pool.size()).toBe(30);
  });

  it('bullet pool capacity: guardian limit × 3', () => {
    const guardianLimit = 20;
    const capacity = guardianLimit * 3; // 60
    const pool = new ObjectPool<TestObj>(makeFactory(), makeReset(), capacity);
    expect(pool.size()).toBe(60);
  });

  it('pool with zero initial capacity starts empty', () => {
    const pool = new ObjectPool<TestObj>(makeFactory(), makeReset());
    expect(pool.size()).toBe(0);
    expect(pool.totalCreated()).toBe(0);
  });
});

// Req 11.3: Dynamic expansion
describe('dynamic expansion', () => {
  it('acquire() returns a valid object when pool is empty', () => {
    const pool = new ObjectPool<TestObj>(makeFactory(), makeReset());
    const obj = pool.acquire();
    expect(obj).not.toBeNull();
    expect(obj).not.toBeUndefined();
  });

  it('acquire() does not throw when pool is exhausted', () => {
    const pool = new ObjectPool<TestObj>(makeFactory(), makeReset(), 2);
    pool.acquire();
    pool.acquire();
    // pool is now empty
    expect(() => pool.acquire()).not.toThrow();
  });

  it('acquire() beyond initial capacity creates new objects', () => {
    const pool = new ObjectPool<TestObj>(makeFactory(), makeReset(), 3);
    // drain the pool
    pool.acquire();
    pool.acquire();
    pool.acquire();
    // one more — must dynamically expand
    const extra = pool.acquire();
    expect(extra).toBeDefined();
    expect(pool.totalCreated()).toBe(4);
  });
});

// acquire/release round-trip
describe('acquire/release round-trip', () => {
  it('released objects are reused on next acquire', () => {
    const pool = new ObjectPool<TestObj>(makeFactory(), makeReset(), 1);
    const first = pool.acquire();
    pool.release(first);
    const second = pool.acquire();
    expect(second).toBe(first); // same reference
  });

  it('release calls the reset function on the object', () => {
    const pool = new ObjectPool<TestObj>(makeFactory(), makeReset(), 1);
    const obj = pool.acquire();
    obj.active = true;
    pool.release(obj);
    expect(obj.active).toBe(false); // reset was called
  });

  it('released object is returned to pool (size increases)', () => {
    const pool = new ObjectPool<TestObj>(makeFactory(), makeReset(), 0);
    const obj = pool.acquire();
    expect(pool.size()).toBe(0);
    pool.release(obj);
    expect(pool.size()).toBe(1);
  });

  it('multiple acquire/release cycles reuse the same objects', () => {
    const pool = new ObjectPool<TestObj>(makeFactory(), makeReset(), 2);
    const a = pool.acquire();
    const b = pool.acquire();
    pool.release(a);
    pool.release(b);
    const c = pool.acquire();
    const d = pool.acquire();
    // c and d should be the previously released objects
    expect([a, b]).toContain(c);
    expect([a, b]).toContain(d);
    expect(pool.totalCreated()).toBe(2); // no new objects created
  });
});
