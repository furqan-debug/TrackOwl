/**
 * The projects list's cache, kept here rather than inside the page so the
 * things that change projects can invalidate it.
 *
 * It used to be two module-level variables inside Projects.tsx with nothing
 * able to clear them. Editing a project and saving navigates back to the list,
 * which found a matching key and served what it had fetched before the edit —
 * so a changed name, status or colour did not appear until the refresh button
 * was pressed or the page was reloaded.
 */
let cachedData: any = null;
let cachedKey: string | null = null;

/** The cached rows for this key, or null if nothing matches. */
export function readProjectsCache(key: string): any | null {
    return cachedKey === key ? cachedData : null;
}

export function writeProjectsCache(key: string, data: any): void {
    cachedKey = key;
    cachedData = data;
}

/**
 * Other caches holding project-derived data, to be emptied alongside this one.
 *
 * The projects list is not the only screen that remembers a project's colour.
 * The dashboard caches the donut, colours and all, under a key of date and
 * user — neither of which changes when someone edits a project — so it went on
 * serving the previous colour until the page was reloaded outright.
 */
const listeners = new Set<() => void>();

/**
 * Register a cache to be cleared whenever a project changes.
 * Returns an unsubscribe, though a module-level cache never needs it.
 */
export function onProjectsChanged(clear: () => void): () => void {
    listeners.add(clear);
    return () => {
        listeners.delete(clear);
    };
}

/** Call after anything that changes a project, so the list refetches. */
export function invalidateProjectsCache(): void {
    cachedData = null;
    cachedKey = null;
    for (const clear of listeners) clear();
}
