import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient = null;
let redisMode = 'in_memory'; // 'redis' | 'in_memory'

// In-memory cache fallback store
class InMemoryCache {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();

    // Cleanup expired keys periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, expireTime] of this.ttls.entries()) {
        if (expireTime <= now) {
          this.store.delete(key);
          this.ttls.delete(key);
        }
      }
    }, 5000);
  }

  async get(key) {
    const expireTime = this.ttls.get(key);
    if (expireTime && expireTime <= Date.now()) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    const val = this.store.get(key);
    return val !== undefined ? val : null;
  }

  async set(key, value) {
    this.store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    this.ttls.delete(key);
    return 'OK';
  }

  async setex(key, seconds, value) {
    this.store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    this.ttls.set(key, Date.now() + seconds * 1000);
    return 'OK';
  }

  async del(key) {
    const existed = this.store.delete(key);
    this.ttls.delete(key);
    return existed ? 1 : 0;
  }

  async keys(pattern = '*') {
    const now = Date.now();
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matched = [];
    for (const [key, expireTime] of this.ttls.entries()) {
      if (expireTime && expireTime <= now) {
        this.store.delete(key);
        this.ttls.delete(key);
      }
    }
    for (const key of this.store.keys()) {
      if (regex.test(key)) matched.push(key);
    }
    return matched;
  }

  async flushall() {
    this.store.clear();
    this.ttls.clear();
    return 'OK';
  }

  async ttl(key) {
    const expireTime = this.ttls.get(key);
    if (!expireTime) return -1;
    const remaining = Math.ceil((expireTime - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }
}

const inMemoryStore = new InMemoryCache();

export async function initRedis() {
  const redisUrl = process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null);

  if (redisUrl || process.env.USE_REDIS === 'true') {
    try {
      const client = new Redis(redisUrl || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
      });

      await client.connect();
      const ping = await client.ping();
      if (ping === 'PONG') {
        redisClient = client;
        redisMode = 'redis';
        console.log(`\x1b[32m✔ [REDIS] Connected to Redis successfully at ${redisUrl || 'localhost:6379'}\x1b[0m`);
        return redisClient;
      }
    } catch (err) {
      console.warn(`\x1b[33m⚠ [REDIS] Redis connection skipped (${err.message}). Using In-Memory Cache layer.\x1b[0m`);
    }
  }

  redisClient = inMemoryStore;
  redisMode = 'in_memory';
  console.log(`\x1b[36m✔ [REDIS] High-Performance In-Memory Cache active (TTL and key-pattern support enabled)\x1b[0m`);
  return redisClient;
}

export function getRedis() {
  return redisClient || inMemoryStore;
}

export function getRedisMode() {
  return redisMode;
}
