import { useState, useMemo } from 'react';
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
}

export function DatePicker({ 
    value, 
    onChange, 
    label, 
    placeholder = "Select date",
    className,
    displayValue
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());

    const selectedDate = useMemo(() => value ? new Date(value) : null, [value]);

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

        const nextDays = [];
        const remaining = 42 - (prevDays.length + currentDays.length);
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
        const d = new Date(year, month, day);
        const iso = d.toISOString().split('T')[0];
        onChange(iso);
        setIsOpen(false);
    };

    const isToday = (day: number, month: number, year: number) => {
        const today = new Date();
        return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
    };

    const isSelected = (day: number, month: number, year: number) => {
        return selectedDate?.getDate() === day && selectedDate?.getMonth() === month && selectedDate?.getFullYear() === year;
    };

    const formatDisplayDate = (val: string) => {
        if (displayValue) return displayValue;
        if (!val) return placeholder;
        const d = new Date(val);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className={clsx("relative", className)}>
            {/* Input Trigger */}
            <div 
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
                        className="absolute top-[calc(100%+8px)] left-0 w-[320px] bg-surface border border-border rounded-2xl shadow-premium z-[110] p-5 overflow-hidden"
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

                        {/* Footer Actions */}
                        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onChange(''); setIsOpen(false); }}
                                className="text-[11px] font-black text-error hover:opacity-80 transition-opacity uppercase tracking-widest"
                            >
                                Clear
                            </button>
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const d = new Date();
                                    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                    onChange(today);
                                    setIsOpen(false);
                                }}
                                className="text-[11px] font-black text-accent hover:opacity-80 transition-opacity uppercase tracking-widest"
                            >
                                Today
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
