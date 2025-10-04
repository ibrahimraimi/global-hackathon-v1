interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttlSeconds = 300): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired items
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Global cache instance
export const cache = new MemoryCache(1000);

// Cache key generators
export const cacheKeys = {
  monitorStats: (monitorId: string, hours = 24) =>
    `monitor:stats:${monitorId}:${hours}h`,
  userDashboard: (userId: string) => `user:dashboard:${userId}`,
  monitorChecks: (monitorId: string, limit = 50) =>
    `monitor:checks:${monitorId}:${limit}`,
  recentActivity: (userId: string) => `user:activity:${userId}`,
  chartData: (userId: string, hours = 24) => `user:charts:${userId}:${hours}h`,
};

// Cached function wrapper
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  ttlSeconds = 300
) {
  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args);
    const cached = cache.get<R>(key);

    if (cached !== null) {
      return cached;
    }

    const result = await fn(...args);
    cache.set(key, result, ttlSeconds);
    return result;
  };
}

// Background cleanup task
if (typeof window === "undefined") {
  setInterval(() => {
    const cleaned = cache.cleanup();
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired items`);
    }
  }, 60000); // Run every minute
}
