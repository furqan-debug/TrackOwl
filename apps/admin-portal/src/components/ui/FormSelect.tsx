import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, Check, Search } from 'lucide-react';
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
    // Type to narrow the list. Off by default: a handful of options is quicker
    // to read than to filter, and a search box on three of them is noise.
    enableSearch = false,
}: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);

    const filteredOptions = useMemo(() => {
        if (!enableSearch || !searchTerm) return options;
        const needle = searchTerm.toLowerCase();
        return options.filter((o: any) => String(o.label).toLowerCase().includes(needle));
    }, [options, searchTerm, enableSearch]);

    // Focus the box on open, and clear whatever was typed on close, so the next
    // open starts from the full list.
    useEffect(() => {
        if (isOpen && enableSearch) {
            const id = setTimeout(() => searchRef.current?.focus(), 60);
            return () => clearTimeout(id);
        }
        setSearchTerm('');
    }, [isOpen, enableSearch]);

    const ref = useRef<HTMLDivElement>(null);

    const activeLabel =
        options.find((o: any) => o.value === value)?.label || value;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                ref.current &&
                !ref.current.contains(e.target as Node)
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

            <div className="relative mt-auto">
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

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
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
                            className="absolute top-[calc(100%+8px)] left-0 w-full bg-surface border border-border rounded-2xl shadow-premium z-[100] flex flex-col p-2 max-h-[260px] overflow-y-auto custom-scrollbar"
                        >
                            {enableSearch && (
                                <div className="relative mb-1.5 shrink-0">
                                    <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input
                                        ref={searchRef}
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        placeholder="Type to filter…"
                                        className="w-full bg-surface-hover border border-border rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-medium text-text-main outline-none focus:border-primary/40 transition-all"
                                    />
                                </div>
                            )}
                            {filteredOptions.length === 0 && (
                                <div className="px-3 py-4 text-center text-[11px] font-bold text-text-muted">
                                    No match
                                </div>
                            )}
                            {filteredOptions.map((opt: any) => (
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
                </AnimatePresence>
            </div>

            {description && (
                <p className="text-[10px] font-semibold text-text-muted italic ml-1">
                    {description}
                </p>
            )}
        </div>
    );
}
