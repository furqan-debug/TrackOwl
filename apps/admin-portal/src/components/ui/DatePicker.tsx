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
    endDate?: string; // YYYY-MM-DD for range selection
    onChange: (date: string) => void;
    onRangeChange?: (startDate: string, endDate: string) => void;
    enableRange?: boolean;
    label?: string;
    placeholder?: string;
    className?: string;
    panelAlign?: 'auto' | 'left' | 'right';
    triggerClassName?: string;
    displayValue?: string;
    displayTimezone?: string;
    maxDate?: string; // YYYY-MM-DD
    direction?: 'auto' | 'up' | 'down';
    panelClassName?: string;
}

const MIN_PANEL_WIDTH = 288;
const RANGE_PANEL_WIDTH = 320;
const PANEL_HEIGHT = 320;

export function DatePicker({
    value, 
    endDate,
    onChange, 
    onRangeChange,
    enableRange = false,
    label, 
    placeholder = "Select date",
    className,
    panelAlign = 'auto',
    triggerClassName,
    displayValue,
    displayTimezone,
    maxDate,
    direction = 'auto',
    panelClassName,
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const [pickerMode, setPickerMode] = useState<'single' | 'range'>(() => {
        return (enableRange && endDate && endDate !== value) ? 'range' : 'single';
    });

    const [rangeStart, setRangeStart] = useState<string | null>(value || null);
    const [rangeEnd, setRangeEnd] = useState<string | null>(endDate || null);

    const triggerRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const minWidth = enableRange ? RANGE_PANEL_WIDTH : MIN_PANEL_WIDTH;
    const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: minWidth });
    const [aboveHeader, setAboveHeader] = useState(false);

    // Sync state when popup opens or props change
    useEffect(() => {
        if (isOpen) {
            setRangeStart(value || null);
            setRangeEnd(endDate || null);
            if (enableRange && endDate && endDate !== value) {
                setPickerMode('range');
            }
        }
    }, [isOpen, value, endDate, enableRange]);

    useLayoutEffect(() => {
        if (!isOpen) return;

        const place = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const inDialog = Boolean(triggerRef.current?.closest('[role="dialog"]'));
            setAboveHeader(inDialog);

            const width = Math.max(minWidth, rect.width);
            const margin = 8;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            let left = rect.left;
            if (panelAlign === 'right') {
                left = rect.right - width;
            } else if (panelAlign === 'auto') {
                if (left + width > vw - margin) {
                    left = Math.max(margin, vw - margin - width);
                }
            }
            left = Math.max(margin, left);

            let top = rect.bottom + margin;
            if (direction === 'up' || (direction === 'auto' && top + PANEL_HEIGHT > vh && rect.top > PANEL_HEIGHT)) {
                top = Math.max(margin, rect.top - PANEL_HEIGHT - margin);
            }

            setPanelPos({ top, left, width });
        };

        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [isOpen, panelAlign, direction, minWidth]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
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

    const daysInMonth = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const days = new Date(year, month + 1, 0).getDate();
        
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

    const canGoNext = useMemo(() => {
        if (!maxDate) return true;
        const nextMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
        const firstOfNext = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
        return firstOfNext <= maxDate;
    }, [viewDate, maxDate]);

    const handleMonthNav = (dir: 'prev' | 'next') => {
        if (dir === 'next' && !canGoNext) return;
        const d = new Date(viewDate);
        d.setMonth(d.getMonth() + (dir === 'prev' ? -1 : 1));
        setViewDate(d);
    };

    const handleDateClick = (iso: string) => {
        if (maxDate && iso > maxDate) return;

        if (!enableRange || pickerMode === 'single') {
            onChange(iso);
            onRangeChange?.(iso, iso);
            setIsOpen(false);
            return;
        }

        // Date Range selection mode
        if (!rangeStart || (rangeStart && rangeEnd)) {
            setRangeStart(iso);
            setRangeEnd(null);
        } else {
            if (iso < rangeStart) {
                setRangeEnd(rangeStart);
                setRangeStart(iso);
            } else {
                setRangeEnd(iso);
            }
        }
    };

    const isFuture = (day: number, month: number, year: number) => {
        if (!maxDate) return false;
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return iso > maxDate;
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

    const isSelected = (iso: string) => {
        if (enableRange && pickerMode === 'range') {
            return rangeStart === iso || rangeEnd === iso;
        }
        return value === iso;
    };

    const isInRange = (iso: string) => {
        if (!enableRange || pickerMode !== 'range' || !rangeStart || !rangeEnd) return false;
        return iso > rangeStart && iso < rangeEnd;
    };

    const formatDisplayDate = (val: string) => {
        if (!val) return placeholder;
        const [year, month, day] = val.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatDisplay = () => {
        if (displayValue) return displayValue;
        if (enableRange && endDate && endDate !== value) {
            const [y1, m1, d1] = value.split('-').map(Number);
            const [y2, m2, d2] = endDate.split('-').map(Number);
            const date1 = new Date(y1, m1 - 1, d1);
            const date2 = new Date(y2, m2 - 1, d2);
            const f1 = date1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const f2 = date2.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return `${f1} – ${f2}`;
        }
        return formatDisplayDate(value);
    };

    const presets = useMemo(() => {
        if (!enableRange) return [];
        const today = displayTimezone
            ? new Date().toLocaleDateString('en-CA', { timeZone: displayTimezone })
            : new Date().toISOString().split('T')[0];

        const [ty, tm, td] = today.split('-').map(Number);
        const dToday = new Date(Date.UTC(ty, tm - 1, td, 12, 0, 0));

        const getIso = (daysAgo: number) => {
            const d = new Date(dToday.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            return d.toLocaleDateString('en-CA', { timeZone: 'UTC' });
        };

        const firstOfMonth = `${ty}-${String(tm).padStart(2, '0')}-01`;

        return [
            {
                label: 'Today',
                apply: () => {
                    setPickerMode('single');
                    onChange(today);
                    onRangeChange?.(today, today);
                    setIsOpen(false);
                }
            },
            {
                label: 'Yesterday',
                apply: () => {
                    const yest = getIso(1);
                    setPickerMode('single');
                    onChange(yest);
                    onRangeChange?.(yest, yest);
                    setIsOpen(false);
                }
            },
            {
                label: 'Last 7 Days',
                apply: () => {
                    const s = getIso(6);
                    setPickerMode('range');
                    onRangeChange?.(s, today);
                    setIsOpen(false);
                }
            },
            {
                label: 'This Month',
                apply: () => {
                    setPickerMode('range');
                    onRangeChange?.(firstOfMonth, today);
                    setIsOpen(false);
                }
            }
        ];
    }, [enableRange, displayTimezone, onChange, onRangeChange]);

    return (
        <div ref={rootRef} className={clsx("relative", className)}>
            {/* Input Trigger */}
            <div 
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all rounded-xl select-none border min-w-0",
                    triggerClassName,
                    isOpen 
                        ? "bg-surface-hover border-primary/30 shadow-inner" 
                        : "bg-surface hover:bg-surface-hover hover:border-primary/20 border-border shadow-shell-sm"
                )}
            >
                <CalendarIcon className={clsx("w-4 h-4 shrink-0 transition-colors", isOpen ? "text-primary" : "text-text-muted")} />
                <div className="flex flex-col min-w-[110px] truncate">
                    {label && <span className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">{label}</span>}
                    <span className={clsx("text-[12px] font-bold leading-none truncate", (!value && !displayValue) ? "text-text-muted" : "text-text-main")}>
                        {formatDisplay()}
                    </span>
                </div>
                <ChevronDown className={clsx("w-3.5 h-3.5 shrink-0 transition-transform duration-300 ml-auto", isOpen ? "text-primary rotate-180" : "text-text-muted")} />
            </div>

            {/* Calendar Dropdown */}
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
                            className={clsx(
                                "bg-surface border border-border rounded-xl shadow-premium p-3 overflow-hidden",
                                aboveHeader ? "z-[200]" : "z-[50] md:z-[200]",
                                panelClassName
                            )}
                        >
                        {/* Range Mode Switcher */}
                        {enableRange && (
                            <div className="flex bg-surface-hover/80 p-0.5 rounded-lg mb-2 border border-border/50 text-[11px] font-bold">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setPickerMode('single'); }}
                                    className={clsx(
                                        "flex-1 py-1 rounded-md transition-all text-center",
                                        pickerMode === 'single' ? "bg-surface text-primary shadow-shell-sm" : "text-text-muted hover:text-text-main"
                                    )}
                                >
                                    Single Date
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setPickerMode('range'); }}
                                    className={clsx(
                                        "flex-1 py-1 rounded-md transition-all text-center",
                                        pickerMode === 'range' ? "bg-surface text-primary shadow-shell-sm" : "text-text-muted hover:text-text-main"
                                    )}
                                >
                                    Date Range
                                </button>
                            </div>
                        )}

                        {/* Presets */}
                        {enableRange && presets.length > 0 && (
                            <div className="flex items-center gap-1 mb-2.5 overflow-x-auto no-scrollbar">
                                {presets.map(p => (
                                    <button
                                        key={p.label}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            p.apply();
                                        }}
                                        className="text-[10px] font-bold px-2 py-1 rounded-md bg-surface-hover hover:bg-primary/10 hover:text-primary text-text-muted transition-colors whitespace-nowrap"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Month Header */}
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[13px] font-black text-text-main tracking-tight">
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
                                    onClick={(e) => { e.stopPropagation(); if (canGoNext) handleMonthNav('next'); }}
                                    disabled={!canGoNext}
                                    className={clsx(
                                        "p-1.5 rounded-lg transition-colors",
                                        canGoNext ? "hover:bg-surface-hover text-text-muted" : "opacity-20 cursor-not-allowed text-text-muted"
                                    )}
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
                            {daysInMonth.map((d, i) => {
                                const iso = `${d.year}-${String(d.month + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                                const future = isFuture(d.day, d.month, d.year);
                                const selected = isSelected(iso);
                                const inRange = isInRange(iso);
                                const isStart = rangeStart === iso;
                                const isEnd = rangeEnd === iso;

                                return (
                                    <div 
                                        key={i}
                                        onClick={future ? undefined : (e) => { e.stopPropagation(); handleDateClick(iso); }}
                                        className={clsx(
                                            "h-8 flex items-center justify-center text-[12px] font-bold transition-all relative group",
                                            future 
                                                ? "opacity-20 cursor-not-allowed pointer-events-none text-text-muted" 
                                                : "cursor-pointer",
                                            !d.current && !future && "opacity-20",
                                            selected
                                                ? clsx(
                                                    "bg-primary text-white shadow-glow-primary z-10",
                                                    enableRange && pickerMode === 'range' && isStart && rangeEnd && rangeEnd !== rangeStart ? "rounded-l-lg rounded-r-none" : "",
                                                    enableRange && pickerMode === 'range' && isEnd && rangeStart && rangeEnd !== rangeStart ? "rounded-r-lg rounded-l-none" : "",
                                                    (!rangeEnd || isStart === isEnd || pickerMode === 'single') ? "rounded-lg" : ""
                                                  )
                                                : inRange
                                                    ? "bg-primary/15 text-primary rounded-none hover:bg-primary/25"
                                                    : future
                                                        ? ""
                                                        : d.current 
                                                            ? "text-text-main hover:bg-primary hover:text-[var(--bg-surface)] rounded-lg" 
                                                            : "text-text-muted hover:bg-surface-hover rounded-lg",
                                        )}
                                    >
                                        {d.day}
                                        {isToday(d.day, d.month, d.year) && !selected && !inRange && (
                                            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Range Mode Action Buttons */}
                        {enableRange && pickerMode === 'range' && (
                            <div className="mt-3 pt-2.5 border-t border-border flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={!rangeStart || !rangeEnd}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (rangeStart && rangeEnd) {
                                            onRangeChange?.(rangeStart, rangeEnd);
                                            setIsOpen(false);
                                        }
                                    }}
                                    className="flex-1 py-1.5 text-center text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
                                >
                                    Apply Range
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsOpen(false);
                                    }}
                                    className="px-3 py-1.5 text-center text-xs font-bold rounded-lg border border-border text-text-muted hover:bg-surface-hover transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
