import { createClient, RedisClientType } from 'redis';
import * as dotenv from 'dotenv';

dotenv.config();

let redisClient: RedisClientType;

export async function initializeRedis(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis connection failed after 10 retries');
          return new Error('Redis connection failed');
        }
        // Exponential backoff: 50ms, 100ms, 200ms, etc.
        return Math.min(retries * 50, 3000);
      }
    }
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis client connected');
  });

  redisClient.on('ready', () => {
    console.log('Redis client ready');
  });

  try {
    await redisClient.connect();
  } catch (err) {
    console.warn('⚠️  Redis unavailable — caching disabled (demo mode)');
  }

  return redisClient;
}

export function getRedisClient(): RedisClientType | null {
  return redisClient || null;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
  }
}

// Cache utility functions
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client?.isReady) return null;
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const client = getRedisClient();
    if (!client?.isReady) return;
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
  },

  async del(key: string): Promise<void> {
    const client = getRedisClient();
    if (!client?.isReady) return;
    await client.del(key);
  },

  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client?.isReady) return false;
    const result = await client.exists(key);
    return result === 1;
  }
};
