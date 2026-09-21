import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import clsx from 'clsx';

interface TimeFieldProps {
    /** 24-hour "HH:MM", the same shape <input type="time"> produces. */
    value: string;
    onChange: (value: string) => void;
    label?: string;
    /** Shown next to the label, e.g. the timezone the entry is written in. */
    hint?: string;
}

/** "13:05" -> { hour: "1", minute: "05", meridiem: "pm" } */
function split(value: string) {
    const [rawH, rawM] = (value || '09:00').split(':');
    const h24 = Number(rawH);
    const meridiem = h24 >= 12 ? 'pm' : 'am';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return { hour: String(h12), minute: (rawM ?? '00').padStart(2, '0'), meridiem };
}

/** The inverse, back to the 24-hour string the form and the database use. */
function join(hour: number, minute: number, meridiem: string) {
    let h = hour % 12;
    if (meridiem === 'pm') h += 12;
    return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * The same box FormSelect draws, so a typed field and a chosen one sit level
 * with each other. No chevron: nothing drops down from these.
 */
const BOX =
    'w-full h-[56px] bg-surface-solid border rounded-2xl text-[14px] font-bold text-text-primary outline-none transition-all shadow-shell-sm';

/**
 * A time field you type into.
 *
 * <input type="time"> hands its picker to the operating system — a list in
 * another type face that no stylesheet can reach — and a dropdown of sixty
 * minutes is a lot of scrolling for a number you already know. Three small
 * boxes: hour, minute, and am or pm.
 *
 * Each box holds what is being typed and only commits on blur or Enter, so a
 * half-typed "1" on the way to "12" is not read as one o'clock. Anything out of
 * range falls back to the last good value rather than clearing the field.
 */
export function TimeField({ value, onChange, label, hint }: TimeFieldProps) {
    const { hour, minute, meridiem } = split(value);

    const [hourText, setHourText] = useState(hour);
    const [minuteText, setMinuteText] = useState(minute);
    const [meridiemText, setMeridiemText] = useState(meridiem);

    // Follow the value when it changes from outside — opening the edit modal on
    // another session — without fighting what is being typed.
    useEffect(() => {
        setHourText(hour);
        setMinuteText(minute);
        setMeridiemText(meridiem);
    }, [hour, minute, meridiem]);

    const commitHour = () => {
        const n = Number(hourText.trim());
        if (!Number.isInteger(n) || n < 1 || n > 12) {
            setHourText(hour);
            return;
        }
        setHourText(String(n));
        onChange(join(n, Number(minute), meridiem));
    };

    const commitMinute = () => {
        const n = Number(minuteText.trim());
        if (!Number.isInteger(n) || n < 0 || n > 59) {
            setMinuteText(minute);
            return;
        }
        setMinuteText(String(n).padStart(2, '0'));
        onChange(join(Number(hour), n, meridiem));
    };

    const commitMeridiem = () => {
        const t = meridiemText.trim().toLowerCase();
        const next = t.startsWith('a') ? 'am' : t.startsWith('p') ? 'pm' : null;
        if (!next) {
            setMeridiemText(meridiem);
            return;
        }
        setMeridiemText(next);
        onChange(join(Number(hour), Number(minute), next));
    };

    const onEnter = (commit: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commit();
        }
    };

    return (
        <div className="space-y-2 min-w-0">
            {label && (
                <label className="text-[10px] font-bold text-text-muted">
                    {label}
                    {hint && <span className="text-text-muted/60"> ({hint})</span>}
                </label>
            )}
            <div className="flex items-center gap-2 min-w-0">
                <div className="relative flex-1 min-w-0">
                    <Clock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input
                        type="text"
                        inputMode="numeric"
                        value={hourText}
                        onChange={e => setHourText(e.target.value)}
                        onBlur={commitHour}
                        onKeyDown={onEnter(commitHour)}
                        onFocus={e => e.target.select()}
                        aria-label="Hour"
                        className={clsx(BOX, 'pl-12 pr-4 border-border focus:border-primary')}
                    />
                </div>
                <span className="text-text-muted font-bold shrink-0">:</span>
                <div className="flex-1 min-w-0">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={minuteText}
                        onChange={e => setMinuteText(e.target.value)}
                        onBlur={commitMinute}
                        onKeyDown={onEnter(commitMinute)}
                        onFocus={e => e.target.select()}
                        aria-label="Minute"
                        className={clsx(BOX, 'px-4 border-border focus:border-primary')}
                    />
                </div>
                <div className="w-[92px] shrink-0">
                    <input
                        type="text"
                        value={meridiemText}
                        onChange={e => setMeridiemText(e.target.value)}
                        onBlur={commitMeridiem}
                        onKeyDown={onEnter(commitMeridiem)}
                        onFocus={e => e.target.select()}
                        aria-label="AM or PM"
                        className={clsx(BOX, 'px-4 border-border focus:border-primary')}
                    />
                </div>
            </div>
        </div>
    );
}
