import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import clsx from 'clsx';

export interface FilterOption {
    id: string;
    name: string;
}

export interface FilterSelectProps {
    icon: React.ReactNode;
    value: string;
    onChange: (val: string) => void;
    options: FilterOption[];
    className?: string;
    label?: string;
    enableSearch?: boolean;
    sortOptions?: boolean;
}

export function FilterSelect({ 
    icon, 
    value, 
    onChange, 
    options, 
    className, 
    label,
    enableSearch = true,
    sortOptions = true
}: FilterSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const activeLabel = options.find((o) => o.id === value)?.name || value;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && enableSearch) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setSearchTerm('');
        }
    }, [isOpen, enableSearch]);

    const allOption = useMemo(() => options.find(o => o.id.toLowerCase() === 'all'), [options]);
    const otherOptions = useMemo(() => options.filter(o => o.id.toLowerCase() !== 'all'), [options]);

    const filteredOptions = useMemo(() => {
        let result = [...otherOptions];
        
        // 1. Sort alphabetically
        if (sortOptions) {
            result.sort((a, b) => a.name.localeCompare(b.name));
        }

        // 2. Filter by search term
        if (searchTerm) {
            const lowSearch = searchTerm.toLowerCase();
            result = result.filter(o => o.name.toLowerCase().includes(lowSearch));
        }

        return result;
    }, [otherOptions, searchTerm, sortOptions]);

    return (
        <div ref={containerRef} className={clsx("relative", className)}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-3 px-4 py-2 cursor-pointer transition-all h-full rounded-xl select-none",
                    isOpen 
                        ? "bg-surface-hover border-[var(--border-hover)] shadow-inner" 
                        : "bg-surface hover:bg-surface-hover hover:border-[var(--border-hover)] border border-border"
                )}
            >
                <div className={clsx("shrink-0 transition-colors", isOpen ? "text-primary" : "text-text-muted")}>
                    {icon}
                </div>
                <div className="flex items-center gap-2 flex-1">
                    {label && (
                        <>
                            <span className="text-[10px] font-bold text-text-muted shrink-0">{label}</span>
                            <span className="text-border">|</span>
                        </>
                    )}
                    <span className="text-[12px] font-bold text-text-main min-w-[80px] truncate">{activeLabel}</span>
                </div>
                <ChevronDown 
                    className={clsx("w-3.5 h-3.5 transition-transform duration-300", isOpen ? "text-primary rotate-180" : "text-text-muted")} 
                    strokeWidth={2.5} 
                />
            </div>
            
            {isOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 min-w-[220px] w-full max-h-[400px] bg-main border border-border rounded-xl shadow-premium z-[100] flex flex-col p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    {enableSearch && (
                        <div className="relative mb-1.5 px-1">
                            <Search className="w-3 h-3 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-medium text-text-main focus:outline-none focus:border-primary/40 transition-all"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}

                    {/* Fixed 'All' Option */}
                    {allOption && (!searchTerm || allOption.name.toLowerCase().includes(searchTerm.toLowerCase())) && (
                        <div className="border-b border-border/50 mb-1 pb-1">
                            <div
                                onClick={() => { onChange(allOption.id); setIsOpen(false); }}
                                className={clsx(
                                    "flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all text-[12px] font-bold",
                                    value === allOption.id 
                                        ? "bg-primary/5 text-primary" 
                                        : "text-text-main hover:bg-surface hover:text-text-main"
                                )}
                            >
                                <span className="truncate pr-4">{allOption.name}</span>
                                {value === allOption.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                            </div>
                        </div>
                    )}
                    
                    <div className="overflow-y-auto max-h-[250px] no-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((o) => (
                                <div
                                    key={o.id}
                                    onClick={() => { onChange(o.id); setIsOpen(false); }}
                                    className={clsx(
                                        "flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all text-[12px] font-bold mb-0.5 last:mb-0",
                                        value === o.id 
                                            ? "bg-primary/5 text-primary" 
                                            : "text-text-main hover:bg-surface hover:text-text-main"
                                    )}
                                >
                                    <span className="truncate pr-4">{o.name}</span>
                                    {value === o.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                                </div>
                            ))
                        ) : (
                            !allOption || (searchTerm && !allOption.name.toLowerCase().includes(searchTerm.toLowerCase())) ? (
                                <div className="px-3 py-4 text-center">
                                    <span className="text-[10px] font-bold text-text-muted">No matches found</span>
                                </div>
                            ) : null
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
