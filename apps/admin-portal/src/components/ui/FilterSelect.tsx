import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
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
}

export function FilterSelect({ icon, value, onChange, options, className, label }: FilterSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
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
                <div className="absolute top-[calc(100%+8px)] left-0 min-w-[200px] w-full max-h-[300px] overflow-y-auto bg-main border border-border rounded-xl shadow-premium z-[100] p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    {options.map((o) => (
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
                    ))}
                </div>
            )}
        </div>
    );
}
