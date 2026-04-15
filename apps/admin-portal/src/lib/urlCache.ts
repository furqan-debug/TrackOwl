/**
 * Global cache for signed URLs to minimize Supabase Storage egress and 
 * redundant createSignedUrl calls.
 */

interface CachedUrl {
    url: string;
    expiresAt: number;
}

const cache = new Map<string, CachedUrl>();

/**
 * Gets a cached signed URL for a given bucket and path.
 * Returns null if not found or expired.
 */
export function getCachedUrl(bucket: string, path: string): string | null {
    const key = `${bucket}:${path}`;
    const cached = cache.get(key);
    
    if (cached && cached.expiresAt > Date.now()) {
        return cached.url;
    }
    
    if (cached) {
        cache.delete(key);
    }
    
    return null;
}

/**
 * Stores a signed URL in the cache.
 * @param bucket - The storage bucket
 * @param path - The file path in the bucket
 * @param url - The signed URL
 * @param expiresInSeconds - How long the URL is valid for
 */
export function setCachedUrl(bucket: string, path: string, url: string, expiresInSeconds: number): void {
    const key = `${bucket}:${path}`;
    // Buffer of 5 minutes to avoid race conditions near expiry
    const expiresAt = Date.now() + (expiresInSeconds - 300) * 1000;
    
    cache.set(key, { url, expiresAt });
}

/**
 * Clears the cache. Useful for logout or debugging.
 */
export function clearUrlCache(): void {
    cache.clear();
}
