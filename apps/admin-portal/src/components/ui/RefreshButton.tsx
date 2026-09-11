import { RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface RefreshButtonProps {
    onClick: () => void;
    /** True while the fetch is in flight. Drives the spin and the pulse. */
    refreshing?: boolean;
    /** What is being refreshed, for screen readers: "Refresh calendar". */
    label?: string;
    className?: string;
}

/**
 * The one refresh button.
 *
 * Four pages used to carry four hand-written variants that drifted apart —
 * different fills, borders, radii and hover behaviour. They are all this now,
 * so changing it changes every page at once.
 *
 * No hover colour change and no tooltip, by request: only the pulse says
 * something is happening.
 */
export function RefreshButton({ onClick, refreshing = false, label = 'Refresh', className }: RefreshButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label={refreshing ? `${label} in progress` : label}
            className={clsx('refresh-btn', refreshing && 'is-refreshing', className)}
        >
            {/* The ICON spins, not the button — spinning the button rotates its
                background and border with it. */}
            <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
        </button>
    );
}
