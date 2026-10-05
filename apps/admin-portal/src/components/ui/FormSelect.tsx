import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Check } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * The app's own dropdown, for forms.
 *
 * A native <select> hands its list to the operating system: grey rows, a blue
 * selection bar, none of the app's typography and nothing that follows the dark
 * theme. Every form field that offers a choice should use this instead.
 *
 * Lifted out of MemberFormPage, where it was defined privately, so the project
 * form can use it too.
 */
export function FormSelect({
    label,
    value,
    onChange,
    options,
    disabled,
    icon,
    description,
}: any) {
    const [isOpen, setIsOpen] = useState(false);

    const ref = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    /** One row: py-3 either side of 13px text. */
    const ROW_H = 44;
    /** The panel's own p-2, top and bottom. */
    const PANEL_PAD = 16;
    /** The tallest the list is ever allowed to get, before it scrolls. */
    const PANEL_MAX = 260;
    /** Between the field and the list. */
    const GAP = 8;
    /** Kept clear of the window edge. */
    const MARGIN = 16;

    const [panelPos, setPanelPos] = useState({
        top: 0,
        left: 0,
        width: 0,
        maxHeight: PANEL_MAX,
    });

    /**
     * The list is rendered through a portal on the body, so it is not inside
     * anything that scrolls. Rendered in place it was part of the dialog's
     * scrolling content, and opening it grew a scrollbar the dialog did not
     * otherwise need — visible room on screen, but the content box had got
     * taller. Out here it takes part in no layout and simply overlays.
     */
    useLayoutEffect(() => {
        if (!isOpen) return;

        /** Where the list belongs, measured from the field. */
        const compute = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return null;

            // How tall the list actually is, rather than the cap. The portal
            // is committed in the same pass as this effect, so the panel is
            // already in the DOM and can be measured; scrollHeight reports the
            // full content height even once maxHeight is applied, and ignores
            // the open animation's transform. The row-count estimate is only a
            // fallback — relying on it would mean a padding or font change
            // silently reintroducing a scrollbar.
            const measured = panelRef.current?.scrollHeight ?? 0;
            const natural =
                measured > 0
                    ? measured
                    : options.length * ROW_H + PANEL_PAD;
            const wanted = Math.min(PANEL_MAX, natural);

            // Downward, always, and never over the field. Room is made for it
            // on open (see makeRoom) rather than the list flipping above the
            // field or sliding across it. The cap only bites when the page has
            // run out of scroll and the room could not be made.
            const spaceBelow = window.innerHeight - rect.bottom - GAP - MARGIN;

            return {
                rect,
                top: rect.bottom + GAP,
                left: rect.left,
                width: rect.width,
                maxHeight: Math.min(wanted, Math.max(0, spaceBelow)),
            };
        };

        const place = () => {
            const p = compute();
            if (!p) return;
            setPanelPos({
                top: p.top,
                left: p.left,
                width: p.width,
                maxHeight: p.maxHeight,
            });
        };

        /**
         * Make room below the field, instead of moving the list.
         *
         * A list that will not fit under its field has to give something up:
         * flip above it, shrink into a scrollbox, or slide across it. All
         * three were tried and all three were wrong. Scrolling the page by
         * the shortfall costs none of them — the field moves up, the room
         * appears, and the list opens downward at full height.
         *
         * Whatever actually scrolls is found by walking up from the field, so
         * this works inside a scrolling panel as well as on the page itself.
         */
        const makeRoom = () => {
            const p = compute();
            if (!p) return;

            const natural = Math.min(
                PANEL_MAX,
                panelRef.current?.scrollHeight ||
                    options.length * ROW_H + PANEL_PAD,
            );
            const deficit =
                natural + GAP + MARGIN - (window.innerHeight - p.rect.bottom);
            if (deficit <= 0) return;

            let box: HTMLElement | null =
                triggerRef.current?.parentElement ?? null;
            while (box) {
                const { overflowY } = getComputedStyle(box);
                if (
                    /(auto|scroll|overlay)/.test(overflowY) &&
                    box.scrollHeight > box.clientHeight
                ) {
                    break;
                }
                box = box.parentElement;
            }

            if (box) {
                box.scrollTop = Math.min(
                    box.scrollTop + deficit,
                    box.scrollHeight - box.clientHeight,
                );
            } else {
                window.scrollBy(0, deficit);
            }
        };

        makeRoom();
        place();

        /**
         * The list stays open while the page scrolls, and travels with its
         * field. Staying open and staying against the field means moving with
         * it — there is no arrangement where it does neither.
         *
         * The position is written straight to the node rather than through
         * React state, because a state update is committed after the browser
         * has already painted the field in its new place: the list would
         * arrive a frame late and lag behind. A direct style write lands in
         * the same frame, so the two move together.
         *
         * Capture, so scrolls in any container in between are caught too. The
         * list scrolls its own overflow when it is long, and that is not the
         * page moving, so events from inside it are ignored.
         */
        const onScroll = (e: Event) => {
            const el = panelRef.current;
            if (!el || el.contains(e.target as Node)) return;

            const p = compute();
            if (!p) return;

            el.style.top = `${p.top}px`;
            el.style.left = `${p.left}px`;
        };

        window.addEventListener('resize', place);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [isOpen, options.length]);

    const activeLabel =
        options.find((o: any) => o.value === value)?.label || value;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                ref.current &&
                !ref.current.contains(e.target as Node) &&
                !panelRef.current?.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handler);

        return () =>
            document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div
            ref={ref}
            className="space-y-2 group flex flex-col relative min-w-0"
        >
            <label className="text-[11px] font-bold text-text-muted tracking-[0.05em] ml-1">
                {label}
            </label>

            <div className="relative mt-auto" ref={triggerRef}>
                <div
                    onClick={() =>
                        !disabled && setIsOpen(!isOpen)
                    }
                    className={clsx(
                        'w-full h-[56px] bg-surface-solid border rounded-2xl text-[14px] font-bold text-text-primary outline-none transition-all flex items-center cursor-pointer select-none shadow-shell-sm',
                        icon ? 'pl-12 pr-12' : 'px-4 pr-12',
                        isOpen
                            ? 'border-primary ring-4 ring-primary/10'
                            : 'border-border hover:border-text-muted/30',
                        disabled &&
                        'opacity-50 cursor-not-allowed'
                    )}
                >
                    {icon && (
                        <div
                            className={clsx(
                                'absolute left-4 top-1/2 -translate-y-1/2 transition-colors',
                                isOpen
                                    ? 'text-primary'
                                    : 'text-text-muted'
                            )}
                        >
                            {icon}
                        </div>
                    )}

                    <span className="truncate">
                        {activeLabel}
                    </span>

                    <ChevronLeft
                        className={clsx(
                            'w-5 h-5 text-text-muted absolute right-4 top-1/2 -translate-y-1/2 transition-transform duration-300 pointer-events-none',
                            '-rotate-90',
                            isOpen && 'text-primary'
                        )}
                    />

                    <div
                        className={clsx(
                            'absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent pointer-events-none transition-all',
                            isOpen && 'ring-primary/20'
                        )}
                    />
                </div>

                {/* Portal, so the list is outside anything that scrolls.
                    AnimatePresence goes inside it — it animates the children it
                    is handed, and a portal is not one of those. */}
                {createPortal(
                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                ref={panelRef}
                            initial={{
                                opacity: 0,
                                y: -10,
                                scale: 0.95,
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1,
                            }}
                            exit={{
                                opacity: 0,
                                y: -10,
                                scale: 0.95,
                            }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    position: 'fixed',
                                    top: panelPos.top,
                                    left: panelPos.left,
                                    width: panelPos.width,
                                    maxHeight: panelPos.maxHeight,
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="bg-surface border border-border rounded-2xl shadow-premium z-[200] flex flex-col p-2 overflow-y-auto custom-scrollbar"
                            >
                            {options.map((opt: any) => (
                                <div
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={clsx(
                                        'flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all text-[13px] font-bold group/item',
                                        value === opt.value
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-text-primary hover:bg-surface-hover hover:text-primary'
                                    )}
                                >
                                    {opt.label}

                                    {value === opt.value && (
                                        <Check className="w-4 h-4 text-primary" />
                                    )}
                                </div>
                            ))}
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>

            {description && (
                <p className="text-[10px] font-semibold text-text-muted italic ml-1">
                    {description}
                </p>
            )}
        </div>
    );
}
