import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface TimeFieldProps {
    /** 24-hour "HH:MM", the same shape <input type="time"> produces. */
    value: string;
    onChange: (value: string) => void;
    label?: string;
    /** Shown next to the label, e.g. the timezone the entry is written in. */
    hint?: string;
}

/** "13:05" -> "1:05 pm", for showing in the box. */
function toDisplay(value: string): string {
    const [rawH, rawM] = (value || '').split(':');
    const h24 = Number(rawH);
    if (!Number.isFinite(h24) || rawM === undefined) return '';
    const meridiem = h24 >= 12 ? 'pm' : 'am';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${rawM.padStart(2, '0')} ${meridiem}`;
}

/**
 * Whatever someone reasonably types -> "HH:MM", or null if it makes no sense.
 *
 * Accepts "9", "9:5", "9:05 pm", "9pm", "0905", "21:05". Without a meridiem the
 * number is read as it stands, so 21 is 9pm and 9 is 9am.
 */
export function parseTime(input: string): string | null {
    const text = input.trim().toLowerCase();
    if (!text) return null;

    const meridiem = /p\.?m\.?$/.test(text) ? 'pm' : /a\.?m\.?$/.test(text) ? 'am' : null;
    const digits = text.replace(/[^0-9:]/g, '');
    if (!digits) return null;

    let hour: number;
    let minute: number;

    if (digits.includes(':')) {
        const [h, m] = digits.split(':');
        hour = Number(h);
        minute = m === '' ? 0 : Number(m);
    } else if (digits.length <= 2) {
        hour = Number(digits);
        minute = 0;
    } else {
        // "0905" / "905" — the last two are the minutes.
        hour = Number(digits.slice(0, digits.length - 2));
        minute = Number(digits.slice(-2));
    }

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (minute < 0 || minute > 59) return null;

    if (meridiem) {
        if (hour < 1 || hour > 12) return null;
        hour = hour % 12;
        if (meridiem === 'pm') hour += 12;
    } else if (hour < 0 || hour > 23) {
        return null;
    }

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * A time field you type into.
 *
 * <input type="time"> hands its picker to the operating system — a list drawn
 * in another type face that no stylesheet can reach. A plain text box is the
 * app's own, and typing "9:30am" is quicker than three dropdowns anyway.
 *
 * The box holds what is being typed; the parsed value is only pushed up on blur
 * or Enter. Anything unreadable falls back to the last good value rather than
 * clearing the field or writing something nobody asked for.
 */
export function TimeField({ value, onChange, label, hint }: TimeFieldProps) {
    const [text, setText] = useState(() => toDisplay(value));
    const [invalid, setInvalid] = useState(false);

    // Follow the value when it changes from outside — opening the edit modal on
    // a different session, say — but not while it is being typed into.
    useEffect(() => {
        setText(toDisplay(value));
        setInvalid(false);
    }, [value]);

    const commit = () => {
        const parsed = parseTime(text);
        if (parsed === null) {
            setText(toDisplay(value));
            setInvalid(false);
            return;
        }
        setInvalid(false);
        setText(toDisplay(parsed));
        if (parsed !== value) onChange(parsed);
    };

    return (
        <div className="space-y-2 min-w-0">
            {label && (
                <label className="text-[10px] font-bold text-text-muted">
                    {label}
                    {hint && <span className="text-text-muted/60"> ({hint})</span>}
                </label>
            )}
            <div className="relative">
                <Clock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                    type="text"
                    inputMode="numeric"
                    value={text}
                    onChange={e => {
                        setText(e.target.value);
                        setInvalid(e.target.value.trim() !== '' && parseTime(e.target.value) === null);
                    }}
                    onBlur={commit}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            commit();
                        }
                    }}
                    placeholder="9:00 am"
                    className={`w-full h-11 bg-surface-hover border rounded-md pl-11 pr-4 text-[12px] font-bold text-text-main outline-none transition-all ${
                        invalid ? 'border-error focus:border-error' : 'border-border focus:border-primary'
                    }`}
                />
            </div>
        </div>
    );
}
