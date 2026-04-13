import { useMemo } from 'react';
import { getHubstaffBlocks, type HubstaffBlock } from '../../lib/dataUtils';
import clsx from 'clsx';

interface TimelineGridProps {
    samples: any[];
    targetTz?: string | null;
}

export function TimelineGrid({ samples, targetTz }: TimelineGridProps) {
    const blocks = useMemo(() => getHubstaffBlocks(samples, targetTz), [samples, targetTz]);

    const hourGroups = useMemo(() => {
        const groups: Map<number, HubstaffBlock[]> = new Map();
        blocks.forEach(block => {
            const hour = parseInt(block.startTime.split(':')[0]);
            if (!groups.has(hour)) groups.set(hour, []);
            groups.get(hour)!.push(block);
        });
        return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
    }, [blocks]);

    if (samples.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                <p className="text-sm font-bold uppercase tracking-widest italic opacity-40">Operational silence detected.</p>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 gap-10">
                {hourGroups.map(([hour, hourBlocks]) => (
                    <div key={hour} className="group relative">
                        <div className="flex items-start gap-8">
                            {/* Time Pillar */}
                            <div className="w-20 pt-1 border-r border-slate-100 flex flex-col items-end pr-8 shrink-0">
                                <span className="text-[14px] font-black text-slate-900 tabular-nums leading-none">
                                    {hour.toString().padStart(2, '0')}:00
                                </span>
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter mt-1">
                                    {hour < 12 ? 'AM' : 'PM'}
                                </span>
                            </div>
                            
                            {/* Activity Blocks */}
                            <div className="flex-1 grid grid-cols-6 gap-3 min-h-[56px]">
                                {[0, 1, 2, 3, 4, 5].map(index => {
                                    const blockStartMin = index * 10;
                                    const block = hourBlocks.find(b => parseInt(b.startTime.split(':')[1]) === blockStartMin);
                                    
                                    const hasData = !!block;
                                    const intensity = block?.activityPercent ?? 0;

                                    return (
                                        <div 
                                            key={index}
                                            className={clsx(
                                                "relative rounded-xl transition-all duration-300 flex flex-col items-center justify-center group/block overflow-hidden shadow-sm",
                                                !hasData ? "bg-slate-50 border border-slate-100 border-dashed" : getBlockStyle(intensity)
                                            )}
                                        >
                                            {hasData && (
                                                <>
                                                    <span className="text-[12px] font-black text-white leading-none z-10 transition-transform group-hover/block:scale-110">
                                                        {intensity}%
                                                    </span>
                                                    <span className="text-[8px] font-bold text-white/60 uppercase tracking-tighter mt-1 z-10 opacity-0 group-hover/block:opacity-100 transition-opacity">
                                                        {block.minutesTracked}m
                                                    </span>
                                                    {/* Background Glow */}
                                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                                                </>
                                            )}
                                            
                                            {/* Tooltip HUD */}
                                            {hasData && (
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover/block:opacity-100 transition-all pointer-events-none whitespace-nowrap z-20 shadow-xl border border-white/10 uppercase tracking-widest">
                                                    {block.startTime} – {block.endTime}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function getBlockStyle(percent: number): string {
    if (percent === 0) return 'bg-slate-300 text-slate-500';
    if (percent < 30) return 'bg-slate-900 text-white ring-1 ring-slate-800'; 
    if (percent < 70) return 'bg-primary text-white shadow-[0_8px_20px_-8px_rgba(99,102,241,0.5)]';
    return 'bg-indigo-600 text-white shadow-[0_8px_30px_-10px_rgba(79,70,229,0.7)]';
}
