import React from 'react';
import { ChevronDown } from 'lucide-react';
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
    const activeLabel = options.find((o) => o.id === value)?.name || value;
    
    return (
        <div className={clsx("relative group/select", className)}>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 shadow-sm hover:border-primary/50 cursor-pointer transition-colors h-full">
                <div className="text-primary shrink-0">{icon}</div>
                <div className="flex items-center gap-2">
                    {label && (
                        <>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
                            <span className="text-slate-200 dark:text-slate-700">|</span>
                        </>
                    )}
                    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 min-w-[100px] truncate">{activeLabel}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover/select:text-slate-600 transition-colors" strokeWidth={2.5} />
            </div>
            
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            >
                {options.map((o) => (
                    <option key={o.id} value={o.id} className="bg-white text-slate-900">{o.name}</option>
                ))}
            </select>
        </div>
    );
}
