import { MemoryCache } from './cacheUtils';

/**
 * The projects list cache with 3-minute TTL and subscriber notification.
 * Clears automatically when a project is modified so stale colours/names are never shown.
 */
const projectsDataCache = new MemoryCache<any>(3 * 60 * 1000, 10);

/** The cached rows for this key, or null if nothing matches. */
export function readProjectsCache(key: string): any | null {
    return projectsDataCache.get(key);
}

export function writeProjectsCache(key: string, data: any): void {
    projectsDataCache.set(key, data);
}

/**
 * Other caches holding project-derived data, to be emptied alongside this one.
 */
const listeners = new Set<() => void>();

/**
 * Register a cache to be cleared whenever a project changes.
 * Returns an unsubscribe.
 */
export function onProjectsChanged(clear: () => void): () => void {
    listeners.add(clear);
    return () => {
        listeners.delete(clear);
    };
}

/** Call after anything that changes a project, so all relevant caches refetch. */
export function invalidateProjectsCache(): void {
    projectsDataCache.clear();
    for (const clear of listeners) clear();
}
