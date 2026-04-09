import NodeCache from 'node-cache';

const TTL = parseInt(process.env.CACHE_TTL_SECONDS || '300', 10);

const cache = new NodeCache({ stdTTL: TTL, checkperiod: 60 });

export function getCache<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setCache<T>(key: string, value: T, ttl?: number): void {
  cache.set(key, value, ttl ?? TTL);
}

export function deleteCache(key: string): void {
  cache.del(key);
}

export function flushCache(): void {
  cache.flushAll();
}

export default cache;
