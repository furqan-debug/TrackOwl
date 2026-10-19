/**
 * Lightweight, memory-safe in-memory cache with TTL and LRU eviction.
 * Prevents redundant Supabase RPC and database hits when navigating dates or tabs.
 */
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export class MemoryCache<T = any> {
    private store = new Map<string, CacheEntry<T>>();
    private defaultTtlMs: number;
    private maxCapacity: number;

    constructor(defaultTtlMs = 3 * 60 * 1000, maxCapacity = 50) {
        this.defaultTtlMs = defaultTtlMs;
        this.maxCapacity = maxCapacity;
    }

    get(key: string, ttlMs = this.defaultTtlMs): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > ttlMs) {
            this.store.delete(key);
            return null;
        }

        // Re-insert to refresh LRU position
        this.store.delete(key);
        this.store.set(key, entry);
        return entry.data;
    }

    set(key: string, data: T): void {
        if (this.store.size >= this.maxCapacity && !this.store.has(key)) {
            // Evict the least recently used item (first key in insertion order)
            const oldestKey = this.store.keys().next().value;
            if (oldestKey) this.store.delete(oldestKey);
        }

        this.store.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    has(key: string, ttlMs = this.defaultTtlMs): boolean {
        return this.get(key, ttlMs) !== null;
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    deletePrefix(prefix: string): void {
        for (const key of Array.from(this.store.keys())) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }

    clear(): void {
        this.store.clear();
    }

    get size(): number {
        return this.store.size;
    }
}
