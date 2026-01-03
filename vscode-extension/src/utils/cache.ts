/**
 * Analysis caching utilities
 */

export interface CacheEntry<T> {
  hash: number;
  result: T;
  timestamp: number;
}

/**
 * Simple LRU cache for analysis results
 */
export class AnalysisCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private maxAge: number;

  /**
   * Create a new analysis cache
   *
   * @param maxSize - Maximum number of entries to cache
   * @param maxAge - Maximum age of entries in milliseconds (default: 5 minutes)
   */
  constructor(maxSize: number = 100, maxAge: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  /**
   * Get a cached result
   */
  get(key: string, hash: number): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if hash matches
    if (entry.hash !== hash) {
      this.cache.delete(key);
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.result;
  }

  /**
   * Set a cached result
   */
  set(key: string, hash: number, result: T): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      hash,
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Delete a cached entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Evict the oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

/**
 * Simple hash function for strings
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}
