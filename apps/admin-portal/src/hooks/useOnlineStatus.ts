import { useEffect, useState } from 'react';

/**
 * Whether the browser currently has a connection.
 *
 * The portal is a single-page app, so once it has loaded, moving around in it
 * fetches nothing — the browser redraws from what it already holds. Losing the
 * connection therefore changes nothing on screen: forms still look usable and
 * figures still look live, right up until something is submitted and fails.
 * This is the one signal that says otherwise.
 *
 * navigator.onLine is honest about being disconnected and optimistic about
 * being connected: false reliably means there is no network, while true means
 * there is an interface up, not that anything is reachable. That is the right
 * trade for a warning — it will not cry wolf.
 */
export function useOnlineStatus(): boolean {
    const [online, setOnline] = useState(() =>
        typeof navigator === 'undefined' ? true : navigator.onLine,
    );

    useEffect(() => {
        const up = () => setOnline(true);
        const down = () => setOnline(false);

        window.addEventListener('online', up);
        window.addEventListener('offline', down);

        // The connection can drop between first render and this effect.
        setOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', up);
            window.removeEventListener('offline', down);
        };
    }, []);

    return online;
}
