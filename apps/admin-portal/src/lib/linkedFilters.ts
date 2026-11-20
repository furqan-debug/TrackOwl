import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/** "2026-11-19" stays, anything else (missing, malformed, impossible) is dropped. */
function toIsoDate(value: string | null): string | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split('-').map(Number);
    const probe = new Date(Date.UTC(y!, m! - 1, d!));
    return probe.getUTCFullYear() === y && probe.getUTCMonth() === m! - 1 && probe.getUTCDate() === d
        ? value
        : null;
}

/**
 * The person and day a link asked a page to open on, for example
 * /dashboard/activity/blocks?member=<id>&date=2026-11-19 from an Owl Lens card.
 *
 * Read once, on the first render: after that the page's own pickers are in
 * charge, and changing them must not be undone by the link.
 *
 * The member is only handed over once the page has loaded the list of people
 * it is allowed to show, and only if that person is on it. A link can never
 * open someone a manager could not have picked from the menu themselves.
 */
export function useLinkedFilters() {
    const [searchParams] = useSearchParams();
    const [initial] = useState(() => ({
        member: searchParams.get('member') || null,
        date: toIsoDate(searchParams.get('date')),
    }));
    const memberTaken = useRef(false);

    const takeMember = useCallback((available: ReadonlyArray<{ id: string }>): string | null => {
        if (memberTaken.current || !initial.member) return null;
        if (!available.some(m => m.id === initial.member)) return null;
        memberTaken.current = true;
        return initial.member;
    }, [initial.member]);

    return { date: initial.date, takeMember };
}
