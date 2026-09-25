import { createClient } from 'redis';

const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

describe('Redis card cache', () => {
  it('stores and reads catalog JSON when Redis is up', async () => {
    const client = createClient({ url, socket: { connectTimeout: 1500 } });
    try {
      await client.connect();
    } catch {
      console.warn('Redis not running — skip live cache test');
      return;
    }

    const key = 'kado:catalog:test';
    const payload = { packs: 2, cards: 10, source: 'fixture' };
    await client.set(key, JSON.stringify(payload), { EX: 30 });
    const raw = await client.get(key);
    expect(JSON.parse(raw || '{}')).toEqual(payload);
    await client.del(key);
    await client.quit();
  });
});
