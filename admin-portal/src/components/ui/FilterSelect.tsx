import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface FilterOption {
    id: string;
    name: string;
}

export interface FilterSelectProps {
    icon: React.ReactNode;
    value: string;
    onChange: (val: string) => void;
    options: FilterOption[];
}

export function FilterSelect({ icon, value, onChange, options }: FilterSelectProps) {
    const activeLabel = options.find((o) => o.id === value)?.name || value;
    
    return (
        <div className="relative group/select">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm hover:border-primary/50 cursor-pointer transition-colors">
                <div className="text-primary">{icon}</div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[120px]">{activeLabel}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover/select:text-slate-600 transition-colors" strokeWidth={2.5} />
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
