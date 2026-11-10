import { useEffect } from 'react';

/**
 * Lets a quiet page ask for the offline banner back, for as long as part of
 * that page actually needs the network.
 *
 * The help centre is the case this exists for. It saves nothing and shows no
 * live figures, so "nothing will be saved, and the figures on screen may be
 * out of date" is wrong at the top of the page — the articles are all there
 * and all current. The one thing on it that does need a connection is the
 * contact form, and the warning is worth having the moment that form is in
 * front of someone, before they type a message that cannot be sent.
 *
 * A plain module-level counter rather than a context, because the banner is
 * mounted at the very root of the app and the forms that claim it sit deep
 * inside lazily loaded pages; there is no sensible place to put a provider
 * that covers both. A counter also handles two claimants at once — the
 * in-page form and the contact dialog over it — without either one switching
 * the banner off while the other still wants it.
 */
let claims = 0;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((listener) => listener());
}

export function subscribeToOfflineBannerClaims(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function hasOfflineBannerClaim(): boolean {
    return claims > 0;
}

/**
 * Claims the banner while `active` is true, and gives it up on false or on
 * unmount — including when the page is torn down mid-interaction, which is
 * why the release lives in the effect's cleanup rather than in an event.
 */
export function useOfflineBannerClaim(active: boolean): void {
    useEffect(() => {
        if (!active) return;
        claims += 1;
        emit();
        return () => {
            claims -= 1;
            emit();
        };
    }, [active]);
}
