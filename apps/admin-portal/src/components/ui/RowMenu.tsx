import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import clsx from 'clsx';

export interface RowMenuItem {
    label: string;
    icon: ReactNode;
    onClick: () => void;
    /** Red, and separated from what comes before it. */
    danger?: boolean;
    disabled?: boolean;
}

/** The panel's own width, needed before it is on screen to place it. */
const PANEL_W = 144;
/** Between the button and the panel. */
const GAP = 8;
/** Kept clear of the window edge. */
const MARGIN = 16;

/**
 * The three-dot menu on a table row.
 *
 * The panel is rendered through a portal on the body rather than beside the
 * button. Inside the row it belongs to the table's scroll box, and whatever
 * it left hanging below the last row counted as that box's overflow — which
 * is how a table with nothing to scroll grew a scrollbar. Flipping the panel
 * upward avoided the bar but put the menu above the button on short lists,
 * where there was obviously room below it. Out here it takes part in no
 * layout at all, so it opens downward wherever the row sits and only turns
 * up when the window itself has no room.
 */
export function RowMenu({ items, label = 'Row actions' }: { items: RowMenuItem[]; label?: string }) {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    useLayoutEffect(() => {
        if (!open) return;

        const place = () => {
            const rect = anchorRef.current?.getBoundingClientRect();
            if (!rect) return;

            // Measured, not guessed: the panel is committed in the same pass
            // as this effect, so its real height is already readable.
            const h = panelRef.current?.offsetHeight ?? 0;

            // To the left of the button, which is the side with room — these
            // buttons sit at the right edge of their table.
            let left = rect.left - PANEL_W - GAP;
            if (left < MARGIN) left = rect.right + GAP;

            // Downward from the button's top edge, turning up only when the
            // window genuinely cannot hold it.
            let top = rect.top;
            if (top + h > window.innerHeight - MARGIN) {
                top = Math.max(MARGIN, rect.bottom - h);
            }

            setPos({ top, left });
        };

        place();
        // Fixed coordinates go stale the moment anything underneath moves.
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open, items.length]);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!anchorRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    return (
        <div className="relative inline-block" ref={anchorRef}>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                title={label}
                aria-label={label}
                className="w-9 h-9 shrink-0 rounded-lg bg-surface-hover border border-border text-text-muted hover:text-text-main hover:border-[var(--border-hover)] transition-colors inline-flex items-center justify-center"
            >
                <MoreVertical className="w-4 h-4" strokeWidth={2} />
            </button>

            {open && createPortal(
                <div
                    ref={panelRef}
                    style={{ position: 'fixed', top: pos.top, left: pos.left, width: PANEL_W }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="bg-surface border border-border rounded-lg shadow-shell-md z-[200] overflow-hidden text-left"
                >
                    {items.map((item, i) => (
                        <button
                            key={item.label}
                            type="button"
                            disabled={item.disabled}
                            onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
                            className={clsx(
                                'w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-40 disabled:pointer-events-none',
                                i > 0 && 'border-t border-border/50',
                                item.danger
                                    ? 'text-red-500 hover:bg-red-500/10'
                                    : 'text-text-main hover:bg-surface-hover'
                            )}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}
