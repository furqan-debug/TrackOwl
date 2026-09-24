import { formatDuration } from '../../lib/dataUtils';

interface PieShareTooltipProps {
    /** Supplied by Recharts. */
    active?: boolean;
    /** Supplied by Recharts. */
    payload?: any[];
    /**
     * Sum of the slices actually drawn, so the shares add to 100%. A full
     * circle whose parts summed to less than that is its own kind of wrong.
     */
    total: number;
    /** How to render the underlying figure. Defaults to a duration. */
    formatValue?: (value: number) => string;
}

/**
 * Tooltip for a donut, saying which slice you are on and how big it is.
 *
 * Both donuts used to hand their raw figure to a generic tooltip. On Reports
 * that produced "37322 % Activity" — minutes, labelled a percentage. On App
 * Usage it produced "Other Content : 5099", a bare number on a hard-coded
 * white card that stayed white in dark mode.
 *
 * A donut is a share of a whole, so that is what this leads with, keeping the
 * underlying figure alongside it.
 */
export function PieShareTooltip({
    active,
    payload,
    total,
    formatValue = formatDuration,
}: PieShareTooltipProps) {
    if (!active || !payload?.length) return null;

    const slice = payload[0];
    const value = Number(slice.value) || 0;
    const share = total > 0 ? (value / total) * 100 : 0;
    // The slice's own colour, so the dot matches what the pointer is on.
    const color = slice.payload?.fill || 'var(--chart-gold)';

    return (
        <div className="p-4 bg-surface/90 backdrop-blur-md rounded-2xl shadow-2xl border border-border min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
            <p className="text-[9px] font-black text-text-muted mb-3 pb-2 border-b border-border truncate">
                {slice.name}
            </p>
            <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-text-main tracking-tighter tabular-nums">
                        {/* Rounding a sliver to 0% would claim it takes no time at all. */}
                        {share > 0 && share < 1 ? '<1' : Math.round(share)}%
                    </span>
                    <span className="text-[10px] font-black text-text-muted">
                        {formatValue(value)}
                    </span>
                </div>
            </div>
        </div>
    );
}
