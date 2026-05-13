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
            <div className="flex flex-col items-center justify-center py-24 text-text-muted">
                <p className="text-sm font-bold italic opacity-40">Operational silence detected.</p>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 gap-12">
                {hourGroups.map(([hour, hourBlocks]) => (
                    <div key={hour} className="group relative">
                        <div className="flex items-start gap-10">
                            {/* Time Pillar */}
                            <div className="w-24 pt-2 border-r border-border flex flex-col items-end pr-10 shrink-0">
                                <span className="text-[18px] font-bold tabular-nums leading-none tracking-tight" style={{ color: 'var(--chart-gold)' }}>
                                    {hour.toString().padStart(2, '0')}:00
                                </span>
                                <span className="text-[10px] font-black text-text-muted tracking-[0.2em] mt-2">
                                    {hour < 12 ? 'AM' : 'PM'}
                                </span>
                            </div>

                            {/* Activity Blocks */}
                            <div className="flex-1 grid grid-cols-6 gap-4 min-h-[72px]">
                                {[0, 1, 2, 3, 4, 5].map(index => {
                                    const blockStartMin = index * 10;
                                    const block = hourBlocks.find(b => parseInt(b.startTime.split(':')[1]) === blockStartMin);

                                    const hasData = !!block;
                                    const intensity = block?.activityPercent ?? 0;

                                    return (
                                        <div
                                            key={index}
                                            className={clsx(
                                                "relative rounded-[20px] transition-all duration-500 flex flex-col items-center justify-center group/block overflow-hidden shadow-shell-sm border",
                                                !hasData ? "bg-black/20 border-border border-dashed" : getBlockStyle(intensity)
                                            )}
                                        >
                                            {hasData && (
                                                <>
                                                    <span className="text-[13px] font-bold text-white leading-none z-10 transition-transform group-hover/block:scale-125 duration-500">
                                                        {intensity}%
                                                    </span>
                                                    <span className="text-[8px] font-black text-white/50 tracking-[0.1em] mt-1.5 z-10 opacity-0 group-hover/block:opacity-100 translate-y-1 group-hover/block:translate-y-0 transition-all duration-500">
                                                        {block.minutesTracked}m trace
                                                    </span>
                                                    {/* Background Glow */}
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none opacity-50" />
                                                </>
                                            )}

                                            {/* Tooltip HUD */}
                                            {hasData && (
                                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-surface text-text-main text-[10px] font-bold px-3 py-1.5 rounded-xl opacity-0 group-hover/block:opacity-100 translate-y-2 group-hover/block:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap z-20 shadow-2xl border border-border ">
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
    if (percent <= 20) return 'bg-error border-error/20 text-white shadow-sm';
    if (percent <= 50) return 'bg-blue-400 border-blue-400/20 text-white shadow-md';
    return 'bg-blue-600 border-blue-600/20 text-white shadow-lg';
}
