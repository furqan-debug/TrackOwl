import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { 
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
    ChevronDown 
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface DatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
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

export function DatePicker({
    value, 
    onChange, 
    label, 
    placeholder = "Select date",
    className,
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
    const [align, setAlign] = useState<'centre' | 'left' | 'right'>('centre');
    const [panelWidth, setPanelWidth] = useState(MIN_PANEL_WIDTH);

    useLayoutEffect(() => {
        if (!isOpen) return;

        const decide = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            // Match the trigger, never go below the floor.
            const width = Math.max(rect.width, MIN_PANEL_WIDTH);
            setPanelWidth(width);

            // Only a trigger narrower than the floor can still overhang, and
            // then by a few pixels, so the edge checks stay as a safety net.
            const centre = rect.left + rect.width / 2;
            const overflowsRight = centre + width / 2 > window.innerWidth - 16;
            const overflowsLeft = centre - width / 2 < 16;

            setAlign(overflowsRight ? 'right' : overflowsLeft ? 'left' : 'centre');
        };

        decide();
        window.addEventListener('resize', decide);
        return () => window.removeEventListener('resize', decide);
    }, [isOpen]);

    // Dismiss on a click anywhere else. Without this the calendar only closed
    // by picking a date or clicking the trigger again, so clicking elsewhere on
    // the page left it hanging open over the content. FilterSelect has always
    // done this; this component never did.
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
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
        
        const prevMonthDays = new Date(year, month, 0).getDate();
        const prevDays = [];
        for (let i = firstDay - 1; i >= 0; i--) {
            prevDays.push({ day: prevMonthDays - i, month: month - 1, year, current: false });
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
            nextDays.push({ day: i, month: month + 1, year, current: false });
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
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        style={{ width: panelWidth }}
                        className={clsx(
                            "absolute top-[calc(100%+8px)] bg-surface border border-border rounded-2xl shadow-premium z-[110] p-5 overflow-hidden",
                            align === 'centre' && "left-1/2 -translate-x-1/2",
                            align === 'left' && "left-0",
                            align === 'right' && "right-0"
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[14px] font-black text-text-main tracking-tight">
                                {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h4>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleMonthNav('prev'); }}
                                    className="p-2 hover:bg-surface-hover rounded-lg text-text-muted transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleMonthNav('next'); }}
                                    className="p-2 hover:bg-surface-hover rounded-lg text-text-muted transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Week Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                                <div key={d} className="text-[10px] font-black text-text-muted text-center uppercase tracking-widest py-2">
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
                                        "aspect-square flex items-center justify-center text-[12px] font-bold rounded-xl cursor-pointer transition-all relative group",
                                        !d.current && "opacity-20",
                                        isSelected(d.day, d.month, d.year)
                                            ? "bg-primary text-white shadow-glow-primary scale-110 z-10"
                                            : d.current 
                                                ? "text-text-main hover:bg-accent/10 hover:text-accent" 
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
            </AnimatePresence>
        </div>
    );
}
