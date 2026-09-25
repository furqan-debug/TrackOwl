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

    /** Roughly how tall the list gets, for deciding up or down. */
    const PANEL_MAX = 260;

    const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0 });

    /**
     * The list is rendered through a portal on the body, so it is not inside
     * anything that scrolls. Rendered in place it was part of the dialog's
     * scrolling content, and opening it grew a scrollbar the dialog did not
     * otherwise need — visible room on screen, but the content box had got
     * taller. Out here it takes part in no layout and simply overlays.
     */
    useLayoutEffect(() => {
        if (!isOpen) return;

        const place = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const below = rect.bottom + 8;
            const fitsBelow = below + PANEL_MAX <= window.innerHeight - 16;

            setPanelPos({
                top: fitsBelow ? below : Math.max(16, rect.top - PANEL_MAX - 8),
                left: rect.left,
                width: rect.width,
            });
        };

        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [isOpen]);

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
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="bg-surface border border-border rounded-2xl shadow-premium z-[200] flex flex-col p-2 max-h-[260px] overflow-y-auto custom-scrollbar"
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
