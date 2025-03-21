/**
 * Cache utility for API responses
 * 
 * This utility provides a simple caching mechanism to reduce redundant API calls
 * and help prevent rate limiting issues in admin components.
 */

import { api } from './api';

// Default cache expiration time (5 minutes)
export const DEFAULT_CACHE_EXPIRY = 5 * 60 * 1000;

// Cache type definitions
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface Cache<T> {
  [key: string]: CacheEntry<T>;
}

/**
 * Creates a new cache instance
 * @returns A new empty cache object
 */
export function createCache<T>(): Cache<T> {
  return {};
}

/**
 * Checks if a cache entry is valid (not expired)
 * @param cache The cache object
 * @param key The cache key to check
 * @param expiryMs The expiry time in milliseconds (default: 5 minutes)
 * @returns True if the entry exists and is not expired
 */
export function isValidCacheEntry<T>(
  cache: Cache<T>, 
  key: string, 
  expiryMs: number = DEFAULT_CACHE_EXPIRY
): boolean {
  const entry = cache[key];
  if (!entry) return false;
  
  const now = Date.now();
  return now - entry.timestamp < expiryMs;
}

/**
 * Gets data from cache or fetches it from API if not cached or expired
 * @param cache The cache object to use
 * @param key The cache key
 * @param fetchFn The function to call if cache miss
 * @param expiryMs The expiry time in milliseconds (default: 5 minutes)
 * @returns The cached or freshly fetched data
 */
export async function getOrFetch<T>(
  cache: Cache<T>,
  key: string,
  fetchFn: () => Promise<T>,
  expiryMs: number = DEFAULT_CACHE_EXPIRY
): Promise<T> {
  // Check if we have a valid cache entry
  if (isValidCacheEntry(cache, key, expiryMs)) {
    return cache[key].data;
  }
  
  // Otherwise fetch and cache the data
  const data = await fetchFn();
  cache[key] = {
    data,
    timestamp: Date.now()
  };
  
  return data;
}

/**
 * Wrapper for common API get requests with caching
 * @param cache The cache object to use
 * @param endpoint The API endpoint to fetch
 * @param token Auth token
 * @param expiryMs Cache expiry time
 * @returns The response data
 */
export async function cachedApiGet<T>(
  cache: Cache<T>,
  endpoint: string,
  token?: string | null,
  expiryMs: number = DEFAULT_CACHE_EXPIRY
): Promise<T> {
  return getOrFetch(
    cache,
    endpoint,
    () => api.get(endpoint, token) as Promise<T>,
    expiryMs
  );
}

/**
 * Invalidates (removes) a cache entry
 * @param cache The cache object
 * @param key The cache key to invalidate
 */
export function invalidateCache<T>(cache: Cache<T>, key: string): void {
  if (cache[key]) {
    delete cache[key];
  }
}

/**
 * Invalidates all cache entries that match a prefix
 * @param cache The cache object
 * @param prefix The prefix to match against cache keys
 */
export function invalidateCacheByPrefix<T>(cache: Cache<T>, prefix: string): void {
  for (const key in cache) {
    if (key.startsWith(prefix)) {
      delete cache[key];
    }
  }
}

/**
 * Clears all entries from a cache
 * @param cache The cache object to clear
 */
export function clearCache<T>(cache: Cache<T>): void {
  for (const key in cache) {
    delete cache[key];
  }
} 