import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { FormSelect } from './FormSelect';

interface TimeFieldProps {
    /** 24-hour "HH:MM", the same shape <input type="time"> produces. */
    value: string;
    onChange: (value: string) => void;
    label?: string;
    /** Shown next to the label, e.g. the timezone the entry is written in. */
    hint?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

/** "13:05" -> { hour: "1", minute: "05", meridiem: "pm" } */
function split(value: string) {
    const [rawH, rawM] = (value || '09:00').split(':');
    const h24 = Number(rawH);
    const meridiem = h24 >= 12 ? 'pm' : 'am';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return { hour: String(h12), minute: (rawM ?? '00').padStart(2, '0'), meridiem };
}

/** The inverse, back to the 24-hour string the form and the database use. */
function join(hour: string, minute: string, meridiem: string) {
    let h = Number(hour) % 12;
    if (meridiem === 'pm') h += 12;
    return `${String(h).padStart(2, '0')}:${minute}`;
}

/**
 * A time field the app can style.
 *
 * <input type="time"> hands its picker to the operating system — the blue
 * column list with its own type face, which no stylesheet can reach. This is
 * three of the app's own dropdowns instead, and it reads and writes the same
 * 24-hour "HH:MM" string, so nothing around it has to change.
 *
 * Minutes are every minute rather than a coarser step: manual entries are
 * corrections of real sessions, which do not end on neat boundaries — which is
 * also why the hour and minute lists can be typed into rather than only
 * scrolled. Sixty rows is a long way to the one you want.
 */
export function TimeField({ value, onChange, label, hint }: TimeFieldProps) {
    const { hour, minute, meridiem } = useMemo(() => split(value), [value]);

    return (
        <div className="space-y-2 min-w-0">
            {label && (
                <label className="text-[10px] font-bold text-text-muted">
                    {label}
                    {hint && <span className="text-text-muted/60"> ({hint})</span>}
                </label>
            )}
            <div className="flex items-center gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                    <FormSelect
                        value={hour}
                        onChange={(h: string) => onChange(join(h, minute, meridiem))}
                        icon={<Clock className="w-4 h-4" />}
                        enableSearch
                        options={HOURS.map(h => ({ label: h, value: h }))}
                    />
                </div>
                <span className="text-text-muted font-bold shrink-0">:</span>
                <div className="flex-1 min-w-0">
                    <FormSelect
                        value={minute}
                        onChange={(m: string) => onChange(join(hour, m, meridiem))}
                        enableSearch
                        options={MINUTES.map(m => ({ label: m, value: m }))}
                    />
                </div>
                <div className="w-[92px] shrink-0">
                    <FormSelect
                        value={meridiem}
                        onChange={(mer: string) => onChange(join(hour, minute, mer))}
                        options={[
                            { label: 'am', value: 'am' },
                            { label: 'pm', value: 'pm' },
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}
