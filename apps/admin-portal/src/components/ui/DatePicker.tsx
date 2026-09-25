import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { 
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
    ChevronDown 
} from 'lucide-react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface DatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
    /**
     * Pin the panel to one edge of the trigger instead of working it out from
     * the window.
     *
     * The automatic choice only knows about the window, so inside a dialog it
     * stays centred and overhangs the dialog's edge, where the scroll box
     * clips it — on the objective form that cut the Sunday column off the
     * left of the calendar.
     */
    panelAlign?: 'auto' | 'left' | 'right';
    /**
     * Extra classes for the trigger, so a date field can be given the same
     * height as the select beside it. `className` lands on the wrapper, which
     * cannot do that.
     */
    triggerClassName?: string;
    displayValue?: string;
    displayTimezone?: string;
}

/**
 * The calendar takes its width from the control it hangs off, so it lines up
 * with it instead of overhanging on both sides — the Screenshots date pill is
 * ~254px against a panel hard-coded to 320px, and no amount of re-centring
 * hides a panel wider than its trigger.
 *
 * The floor stops a short trigger squashing the day grid: seven columns plus
 * the panel's own padding need roughly this much to stay square and legible.
 */
const MIN_PANEL_WIDTH = 288;

/**
 * Roughly how tall the panel is, used only to decide up or down. Measuring the
 * real thing would mean rendering it first and moving it after, which shows as
 * a jump.
 */
const PANEL_HEIGHT = 320;

export function DatePicker({
    value, 
    onChange, 
    label, 
    placeholder = "Select date",
    className,
    panelAlign = 'auto',
    triggerClassName,
    displayValue,
    displayTimezone
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Measured from the trigger on open: the panel takes its width, and only
    // shifts off centre when that would carry it past a window edge. The old
    // fixed 320px anchored to the trigger's LEFT edge pushed the panel off
    // screen on every page whose date control sits in the top-right corner.
    const triggerRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: MIN_PANEL_WIDTH });

    /**
     * Where to put the panel, in viewport coordinates.
     *
     * It is rendered through a portal on the body rather than inside the
     * field. Inside, it is part of whatever is scrolling: on the objective
     * dialog its height counted toward the content the dialog thought it had
     * to scroll, so opening the calendar grew a scrollbar even with room on
     * screen to show it. Out of the dialog it takes part in no layout at all
     * and simply overlays.
     */
    useLayoutEffect(() => {
        if (!isOpen) return;

        const place = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const width = Math.max(rect.width, MIN_PANEL_WIDTH);

            // Which edge to hang from. 'auto' keeps it under the trigger.
            let left =
                panelAlign === 'right'
                    ? rect.right - width
                    : panelAlign === 'left'
                        ? rect.left
                        : rect.left + rect.width / 2 - width / 2;

            // Never off the edge of the window.
            if (left + width > window.innerWidth - 16) left = window.innerWidth - width - 16;
            if (left < 16) left = 16;

            // Downward, unless the window itself has no room for it there.
            const below = rect.bottom + 8;
            const fitsBelow = below + PANEL_HEIGHT <= window.innerHeight - 16;
            const top = fitsBelow ? below : Math.max(16, rect.top - PANEL_HEIGHT - 8);

            setPanelPos({ top, left, width });
        };

        place();
        // Fixed coordinates go stale as soon as anything moves underneath.
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [isOpen, panelAlign]);

    // Dismiss on a click anywhere else. Without this the calendar only closed
    // by picking a date or clicking the trigger again, so clicking elsewhere on
    // the page left it hanging open over the content. FilterSelect has always
    // done this; this component never did.
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            // The panel is outside this component's DOM now, so a click in it
            // is not inside rootRef — without the second check, using a month
            // arrow would count as clicking away and close the calendar.
            if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
                setIsOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const [viewDate, setViewDate] = useState(() => {
        if (value) {
            const [year, month, day] = value.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        return new Date();
    });

    // viewDate was set once at mount and moved only by the arrows, so it never
    // followed the selection. Picking 31 August from the grey leading row of a
    // September grid set the value but left the grid on September — reopening
    // showed the wrong month with the selected day sitting outside it.
    //
    // Keyed on isOpen too, so opening after paging around without choosing
    // anything returns to the month the value is actually in.
    useEffect(() => {
        if (!value) return;
        const [y, m, d] = value.split('-').map(Number);
        if (!Number.isFinite(y) || !Number.isFinite(m)) return;
        setViewDate(prev =>
            prev.getFullYear() === y && prev.getMonth() === m - 1
                ? prev
                : new Date(y, m - 1, d)
        );
    }, [value, isOpen]);

    const selectedDate = useMemo(() => {
        if (!value) return null;
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day);
    }, [value]);

    const daysInMonth = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const days = new Date(year, month + 1, 0).getDate();
        
        // The neighbouring months carry their own year. month - 1 and month + 1
        // with this year attached gave "2026-00-28" for December 2025 and
        // "2026-13-01" for January 2027, and the click handler wrote them
        // straight out. Let Date normalise the rollover instead.
        const prevMonth = new Date(year, month - 1, 1);
        const nextMonth = new Date(year, month + 1, 1);

        const prevMonthDays = new Date(year, month, 0).getDate();
        const prevDays = [];
        for (let i = firstDay - 1; i >= 0; i--) {
            prevDays.push({
                day: prevMonthDays - i,
                month: prevMonth.getMonth(),
                year: prevMonth.getFullYear(),
                current: false,
            });
        }

        const currentDays = [];
        for (let i = 1; i <= days; i++) {
            currentDays.push({ day: i, month, year, current: true });
        }

        // Pad to whole weeks, not to a fixed six rows. 42 cells always produced
        // six, so a month that fits in five — September 2026 starts on a Tuesday
        // and ends on the 30th — got a trailing row made up entirely of the next
        // month, adding height that showed nothing belonging to the month on
        // screen.
        const nextDays = [];
        const filled = prevDays.length + currentDays.length;
        const remaining = Math.ceil(filled / 7) * 7 - filled;
        for (let i = 1; i <= remaining; i++) {
            nextDays.push({
                day: i,
                month: nextMonth.getMonth(),
                year: nextMonth.getFullYear(),
                current: false,
            });
        }

        return [...prevDays, ...currentDays, ...nextDays];
    }, [viewDate]);

    const handleMonthNav = (dir: 'prev' | 'next') => {
        const d = new Date(viewDate);
        d.setMonth(d.getMonth() + (dir === 'prev' ? -1 : 1));
        setViewDate(d);
    };

    const handleDateSelect = (day: number, month: number, year: number) => {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
    setIsOpen(false);
};

    const isToday = (day: number, month: number, year: number) => {
        if (displayTimezone) {
            const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: displayTimezone });
            const [ty, tm, td] = todayStr.split('-').map(Number);
            return td === day && (tm - 1) === month && ty === year;
        }
        const today = new Date();
        return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
    };

    const isSelected = (day: number, month: number, year: number) => {
        return selectedDate?.getDate() === day && selectedDate?.getMonth() === month && selectedDate?.getFullYear() === year;
    };

    const formatDisplayDate = (val: string) => {
        if (displayValue) return displayValue;
        if (!val) return placeholder;
        const [year, month, day] = val.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div ref={rootRef} className={clsx("relative", className)}>
            {/* Input Trigger */}
            <div 
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all rounded-xl select-none border",
                    triggerClassName,
                    isOpen 
                        ? "bg-surface-hover border-primary/30 shadow-inner" 
                        : "bg-surface hover:bg-surface-hover hover:border-primary/20 border-border shadow-shell-sm"
                )}
            >
                <CalendarIcon className={clsx("w-4 h-4 transition-colors", isOpen ? "text-primary" : "text-text-muted")} />
                <div className="flex flex-col min-w-[120px]">
                    {label && <span className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">{label}</span>}
                    <span className={clsx("text-[12px] font-bold leading-none", (!value && !displayValue) ? "text-text-muted" : "text-text-main")}>
                        {formatDisplayDate(value)}
                    </span>
                </div>
                <ChevronDown className={clsx("w-3.5 h-3.5 transition-transform duration-300 ml-auto", isOpen ? "text-primary rotate-180" : "text-text-muted")} />
            </div>

            {/* Calendar Dropdown */}
            {/* Portal, so the panel is not part of anything that scrolls.
                AnimatePresence goes INSIDE it: it animates the children it is
                handed, and a portal is not one of those — wrapping the portal
                in it means it tracks nothing and renders nothing. */}
            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            ref={panelRef}
                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.97 }}
                            style={{
                                position: 'fixed',
                                top: panelPos.top,
                                left: panelPos.left,
                                width: panelPos.width,
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="bg-surface border border-border rounded-2xl shadow-premium z-[200] p-3 overflow-hidden"
                        >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[14px] font-black text-text-main tracking-tight">
                                {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h4>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleMonthNav('prev'); }}
                                    className="p-1.5 hover:bg-surface-hover rounded-lg text-text-muted transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleMonthNav('next'); }}
                                    className="p-1.5 hover:bg-surface-hover rounded-lg text-text-muted transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Week Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                                <div key={d} className="text-[10px] font-black text-text-muted text-center uppercase tracking-widest py-1">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Day Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {daysInMonth.map((d, i) => (
                                <div 
                                    key={i}
                                    onClick={(e) => { e.stopPropagation(); handleDateSelect(d.day, d.month, d.year); }}
                                    className={clsx(
                                        "h-8 flex items-center justify-center text-[12px] font-bold rounded-lg cursor-pointer transition-all relative group",
                                        !d.current && "opacity-20",
                                        isSelected(d.day, d.month, d.year)
                                            ? "bg-primary text-white shadow-glow-primary scale-110 z-10"
                                            : d.current 
                                                ? "text-text-main hover:bg-primary hover:text-[var(--bg-surface)]" 
                                                : "text-text-muted hover:bg-surface-hover",
                                    )}
                                >
                                    {d.day}
                                    {isToday(d.day, d.month, d.year) && !isSelected(d.day, d.month, d.year) && (
                                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                                    )}
                                </div>
                            ))}
                        </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
