import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    ChevronLeft, ChevronRight,
    Palmtree, AlertCircle, Info, RefreshCw,
    Plus, Trash2, StickyNote, X, Repeat
} from 'lucide-react';
import { PageLayout, LoadingState, Modal, Input, Button, DatePicker } from '../components/ui';
import clsx from 'clsx';

interface TimeOffRequest {
    id: string;
    member_id: string;
    member_name?: string;
    start_date: string;
    end_date: string;
    type: string;
    status: string;
}

interface Holiday {
    id: string;
    name: string;
    date: string; // YYYY-MM-DD
    is_recurring: boolean;
}

interface CalendarNote {
    id: string;
    date: string; // YYYY-MM-DD
    note: string;
    created_by: string | null;
    created_at: string;
    author_name?: string;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

/** Builds a YYYY-MM-DD string directly from calendar integers — never round-trips
 *  through a JS Date/UTC conversion, which is what caused month boundaries to
 *  drift a day in either direction depending on the viewer's local timezone. */
function dateStrOf(year: number, month: number /* 0-indexed */, day: number) {
    return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** "Today" as the organization sees it, not the viewer's browser clock. */
function todayInTz(tz: string): string {
    try {
        return new Date().toLocaleDateString('en-CA', { timeZone: tz });
    } catch {
        const n = new Date();
        return dateStrOf(n.getFullYear(), n.getMonth(), n.getDate());
    }
}

/** A recurring holiday (e.g. "Christmas Day") repeats every year on the same
 *  month/day — this matches it against any displayed month regardless of year. */
function holidayFallsOn(h: Holiday, dateStr: string): boolean {
    if (h.is_recurring) {
        return h.date.slice(5) === dateStr.slice(5); // compare MM-DD
    }
    return h.date === dateStr;
}

/** Next occurrence of a holiday on/after `fromStr`, for sorting the upcoming list. */
function nextOccurrence(h: Holiday, fromStr: string): string {
    if (!h.is_recurring) return h.date;
    const fromYear = Number(fromStr.slice(0, 4));
    const thisYear = `${fromYear}-${h.date.slice(5)}`;
    return thisYear >= fromStr ? thisYear : `${fromYear + 1}-${h.date.slice(5)}`;
}

export function Calendar() {
    const { profile, displayTimezone } = useAuth();
    const orgTz = displayTimezone || 'UTC';
    const canManage = profile?.role === 'Owner' || profile?.role === 'Admin' || profile?.role === 'Manager';

    const [currentDate, setCurrentDate] = useState(new Date());
    const [requests, setRequests] = useState<TimeOffRequest[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [notes, setNotes] = useState<CalendarNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Holiday CRUD
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [holidayForm, setHolidayForm] = useState({ name: '', date: '', is_recurring: false });
    const [savingHoliday, setSavingHoliday] = useState(false);
    const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);

    // Day notes
    const [notesModalDate, setNotesModalDate] = useState<string | null>(null);
    const [newNoteText, setNewNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);

    useEffect(() => {
        if (profile?.organization_id) fetchData();
    }, [currentDate, profile?.organization_id]);

    async function fetchData(isSilent = false) {
        const orgId = profile?.organization_id;
        if (!orgId) return;
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const lastDay = new Date(year, month + 1, 0).getDate();
            const monthStart = dateStrOf(year, month, 1);
            const monthEnd = dateStrOf(year, month, lastDay);

            const [
                { data: membersData },
                { data: holidaysData },
                { data: notesData },
            ] = await Promise.all([
                supabase.from('members').select('id, full_name').eq('organization_id', orgId),
                // Fetch the org's full holiday list (not month-scoped) so recurring
                // holidays can be matched against any displayed month by MM-DD.
                supabase.from('holidays').select('*').eq('organization_id', orgId),
                supabase.from('calendar_notes').select('*')
                    .eq('organization_id', orgId)
                    .gte('date', monthStart)
                    .lte('date', monthEnd)
                    .order('created_at', { ascending: true }),
            ]);

            const memberMap: Record<string, string> = {};
            (membersData || []).forEach(m => memberMap[m.id] = m.full_name);
            const orgMemberIds = new Set(Object.keys(memberMap));

            const { data: requestsData } = await supabase
                .from('time_off_requests')
                .select('*')
                .eq('status', 'Approved')
                .or(`start_date.gte.${monthStart},end_date.lte.${monthEnd}`);

            setRequests((requestsData || [])
                // Defensive org scoping: time_off_requests has no organization_id
                // column of its own, so only keep rows for members of this org.
                .filter(r => orgMemberIds.has(r.member_id))
                .map(r => ({ ...r, member_name: memberMap[r.member_id] || 'Unknown Member' })));

            if (holidaysData) setHolidays(holidaysData);
            setNotes((notesData || []).map(n => ({ ...n, author_name: (n.created_by && memberMap[n.created_by]) || 'Unknown' })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const todayStr = todayInTz(orgTz);

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= lastDayOfMonth; i++) days.push(i);

    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    const upcomingHolidays = [...holidays]
        .map(h => ({ h, next: nextOccurrence(h, todayStr) }))
        .filter(x => x.next >= todayStr)
        .sort((a, b) => a.next.localeCompare(b.next))
        .slice(0, 4)
        .map(x => x.h);

    // ── Holiday CRUD ──────────────────────────────────────────────────────
    function openAddHoliday() {
        setHolidayForm({ name: '', date: todayStr, is_recurring: false });
        setShowHolidayModal(true);
    }

    async function handleSaveHoliday(e: React.FormEvent) {
        e.preventDefault();
        if (!profile?.organization_id || !holidayForm.name || !holidayForm.date) return;
        setSavingHoliday(true);
        const { data, error } = await supabase.from('holidays').insert({
            name: holidayForm.name,
            date: holidayForm.date,
            is_recurring: holidayForm.is_recurring,
            organization_id: profile.organization_id,
        }).select().single();

        if (!error && data) {
            setHolidays(prev => [...prev, data]);
            setShowHolidayModal(false);
        } else {
            console.error('Failed to save holiday:', error);
        }
        setSavingHoliday(false);
    }

    async function handleDeleteHoliday() {
        if (!deletingHoliday) return;
        const { error } = await supabase.from('holidays').delete().eq('id', deletingHoliday.id);
        if (!error) {
            setHolidays(prev => prev.filter(h => h.id !== deletingHoliday.id));
        }
        setDeletingHoliday(null);
    }

    // ── Notes ─────────────────────────────────────────────────────────────
    async function handleAddNote() {
        if (!notesModalDate || !newNoteText.trim() || !profile?.organization_id) return;
        setSavingNote(true);
        const { data, error } = await supabase.from('calendar_notes').insert({
            organization_id: profile.organization_id,
            date: notesModalDate,
            note: newNoteText.trim(),
            created_by: profile.id,
        }).select().single();

        if (!error && data) {
            setNotes(prev => [...prev, { ...data, author_name: profile.full_name || 'You' }]);
            setNewNoteText('');
        } else {
            console.error('Failed to save note:', error);
        }
        setSavingNote(false);
    }

    async function handleDeleteNote(id: string) {
        const { error } = await supabase.from('calendar_notes').delete().eq('id', id);
        if (!error) setNotes(prev => prev.filter(n => n.id !== id));
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-[var(--bg-main)]"><LoadingState message="Syncing operational schedule..." /></div>;

    const notesForModalDate = notesModalDate ? notes.filter(n => n.date === notesModalDate) : [];

    return (
        <PageLayout
            maxWidth="full"
            title="Team Calendar"
            description="Operational schedule of approved leave, holidays, and corporate milestones."
            actions={
                <div className="flex items-center gap-4">
                    <div className="p-1 rounded-md flex items-center shadow-shell-sm border border-[var(--border-color)] overflow-hidden bg-[var(--bg-surface)]">
                        <button
                            onClick={prevMonth}
                            className="p-2.5 hover:bg-surface-hover text-text-muted hover:text-slate-900 transition-all rounded-md"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="px-6 min-w-[160px] text-center">
                            <span className="text-[12px] font-bold text-text-main whitespace-nowrap">
                                {monthName} {year}
                            </span>
                        </div>
                        <button
                            onClick={nextMonth}
                            className="p-2.5 hover:bg-surface-hover text-text-muted hover:text-slate-900 transition-all rounded-md"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {canManage && (
                        <Button onClick={openAddHoliday} variant="primary" size="md">
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add Holiday
                        </Button>
                    )}

                    <button
                        onClick={() => fetchData(true)}
                        className={clsx(
                            "w-10 h-10 flex items-center justify-center glass-panel rounded-md transition-all shadow-shell-sm",
                            refreshing ? "text-primary animate-spin" : "text-text-muted hover:text-slate-900"
                        )}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">

                {/* 📅 Compact Grid Shell (9/12) */}
                <div className="lg:col-span-9">
                    <div className="rounded-md shadow-premium overflow-hidden border border-[var(--border-color)] bg-[var(--bg-surface)]">
                        <div className="grid grid-cols-7 bg-primary/5 border-b border-[var(--border-color)]">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="py-4 text-center">
                                    <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-[0.2em]">{d}</span>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 auto-rows-[120px]">
                            {days.map((day, idx) => {
                                if (day === null) return (
                                    <div key={`empty-${idx}`} className="border-r border-b border-slate-50 bg-surface-hover/20 last:border-r-0" />
                                );

                                const dateStr = dateStrOf(year, month, day);
                                const dayHolidays = holidays.filter(h => holidayFallsOn(h, dateStr));
                                const dayRequests = requests.filter(r => dateStr >= r.start_date && dateStr <= r.end_date);
                                const dayNotes = notes.filter(n => n.date === dateStr);

                                const isToday = dateStr === todayStr;
                                const isWeekend = idx % 7 === 0 || idx % 7 === 6;

                                return (
                                    <div
                                        key={day}
                                        onClick={() => setNotesModalDate(dateStr)}
                                        className={clsx(
                                            "border-r border-b border-[var(--border-color)] p-3 hover:bg-primary/5 transition-all group relative overflow-hidden last:border-r-0 min-h-[120px] cursor-pointer",
                                            isWeekend && "bg-surface-hover/40",
                                            isToday && "ring-2 ring-primary/30 z-10 bg-primary/[0.02]"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={clsx(
                                                "text-[12px] font-bold tracking-tight transition-colors",
                                                isToday ? "text-primary bg-primary/10 w-6 h-6 flex items-center justify-center rounded-md" : "text-[var(--text-muted)] group-hover:text-[var(--text-main)]"
                                            )}>
                                                {day}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {dayNotes.length > 0 && (
                                                    <StickyNote className="w-3 h-3 text-amber-500" />
                                                )}
                                                {dayHolidays.length > 0 && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 overflow-y-auto max-h-[80px] no-scrollbar pr-1 mt-2">
                                            {dayHolidays.map(h => (
                                                <div key={h.id} className="bg-rose-50 text-rose-600 text-[9px] font-bold tracking-tight px-2 py-1 rounded shadow-sm border-l-2 border-rose-500 flex items-center gap-1.5">
                                                    {h.is_recurring && <Repeat className="w-2.5 h-2.5 shrink-0 opacity-70" />}
                                                    {h.name}
                                                </div>
                                            ))}
                                            {dayRequests.map(r => (
                                                <div key={r.id} className="bg-indigo-50 text-indigo-700 text-[9px] font-bold tracking-tight px-2 py-1 rounded shadow-sm border-l-2 border-indigo-500 truncate flex items-center gap-1">
                                                    <Palmtree className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                                    {r.member_name}
                                                </div>
                                            ))}
                                            {dayNotes.map(n => (
                                                <div key={n.id} className="bg-amber-50 text-amber-700 text-[9px] font-bold tracking-tight px-2 py-1 rounded shadow-sm border-l-2 border-amber-500 truncate flex items-center gap-1">
                                                    <StickyNote className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                                    {n.note}
                                                </div>
                                            ))}
                                        </div>

                                        {canManage && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setNotesModalDate(dateStr); }}
                                                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white"
                                                title="Add note"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 📋 Operational Sidebar (3/12) */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Holiday Roll */}
                    <div className="rounded-md shadow-premium p-6 border border-[var(--border-color)] bg-[#001B4D] text-white overflow-hidden relative group">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-surface/5 rounded-full blur-3xl" />
                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="w-8 h-8 rounded-md bg-[#D4AF37] flex items-center justify-center text-[#001B4D] shadow-lg shadow-[#D4AF37]/20">
                                <AlertCircle className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold tracking-[0.2em] text-white/80">Upcoming Holidays</span>
                        </div>

                        <div className="space-y-4 relative z-10">
                            {upcomingHolidays.length === 0 ? (
                                <div className="p-4 bg-white/5 rounded-md border border-white/10">
                                    <p className="text-[10px] text-white/60 font-bold text-center italic">No corporate milestones</p>
                                </div>
                            ) : (
                                upcomingHolidays.map(h => (
                                    <div key={h.id} className="group/item flex items-start justify-between gap-2 border-l-2 border-[#D4AF37] pl-4 py-1 hover:border-[#FDE047] transition-colors">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <span className="text-[9px] font-bold text-[#D4AF37]/80">
                                                {new Date(nextOccurrence(h, todayStr) + 'T12:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: orgTz })}
                                            </span>
                                            <p className="text-sm font-bold text-white tracking-tight leading-tight truncate">{h.name}</p>
                                        </div>
                                        {canManage && (
                                            <button
                                                onClick={() => setDeletingHoliday(h)}
                                                className="opacity-0 group-hover/item:opacity-100 transition-opacity text-white/50 hover:text-rose-400 shrink-0 mt-0.5"
                                                title="Delete holiday"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Schedule Legend */}
                    <div className="rounded-md shadow-premium p-6 border border-[var(--border-color)] bg-[var(--bg-surface)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                                <Info className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-[0.2em]">Operational Legend</span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-4 p-2.5 hover:bg-surface-hover rounded-md transition-all border border-transparent hover:border-slate-100 group">
                                <div className="w-10 h-10 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-105 transition-transform">
                                    <Palmtree className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-text-main leading-none mb-1">Approved Leave</p>
                                    <p className="text-[9px] text-text-muted font-bold tracking-tight">Time-off records</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-2.5 hover:bg-surface-hover rounded-md transition-all border border-transparent hover:border-slate-100 group">
                                <div className="w-10 h-10 rounded-md bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm group-hover:scale-105 transition-transform">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-text-main leading-none mb-1">Holiday Event</p>
                                    <p className="text-[9px] text-text-muted font-bold tracking-tight">Corporate non-working</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-2.5 hover:bg-surface-hover rounded-md transition-all border border-transparent hover:border-slate-100 group">
                                <div className="w-10 h-10 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm group-hover:scale-105 transition-transform">
                                    <StickyNote className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-text-main leading-none mb-1">Admin Note</p>
                                    <p className="text-[9px] text-text-muted font-bold tracking-tight">Click any day to view/add</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Insight */}
                    <div className="p-5 bg-surface-hover border border-border rounded-md text-center shadow-sm">
                        <p className="text-[10px] font-bold text-text-muted leading-relaxed">
                            Holidays and dates shown are aligned to <br /> the organization's timezone ({orgTz}).
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Add Holiday Modal ────────────────────────────────────────── */}
            <Modal
                isOpen={showHolidayModal}
                onClose={() => setShowHolidayModal(false)}
                title="Add Holiday"
                subtitle="Corporate non-working day for this organization"
                allowOverflow
            >
                <form onSubmit={handleSaveHoliday} className="space-y-6">
                    <Input
                        label="Holiday Name"
                        required
                        value={holidayForm.name}
                        onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })}
                        placeholder="e.g. Independence Day"
                    />
                    <DatePicker
                        label="Date"
                        value={holidayForm.date}
                        onChange={date => setHolidayForm({ ...holidayForm, date })}
                        displayTimezone={orgTz}
                    />
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={holidayForm.is_recurring}
                            onChange={e => setHolidayForm({ ...holidayForm, is_recurring: e.target.checked })}
                            className="w-4 h-4 accent-primary rounded"
                        />
                        <span className="text-[12px] font-bold text-text-main">Repeats every year on this date</span>
                    </label>

                    <div className="pt-2 flex gap-4">
                        <Button type="button" onClick={() => setShowHolidayModal(false)} variant="secondary" className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={savingHoliday || !holidayForm.name || !holidayForm.date} variant="primary" className="flex-[2]">
                            {savingHoliday ? 'Saving...' : 'Add Holiday'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ── Delete Holiday Confirmation ─────────────────────────────── */}
            {deletingHoliday && (
                <Modal
                    isOpen={!!deletingHoliday}
                    onClose={() => setDeletingHoliday(null)}
                    title="Delete Holiday"
                    maxWidth="max-w-[440px]"
                >
                    <div className="text-center space-y-6">
                        <p className="text-text-primary font-bold">
                            Remove <span className="text-rose-500">"{deletingHoliday.name}"</span>?
                        </p>
                        <div className="flex gap-4">
                            <Button onClick={() => setDeletingHoliday(null)} variant="secondary" className="flex-1">Cancel</Button>
                            <Button onClick={handleDeleteHoliday} variant="danger" className="flex-1">Delete</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── Day Notes Modal ──────────────────────────────────────────── */}
            <Modal
                isOpen={!!notesModalDate}
                onClose={() => { setNotesModalDate(null); setNewNoteText(''); }}
                title={notesModalDate ? new Date(notesModalDate + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: orgTz }) : 'Notes'}
                subtitle="Visible to everyone in your organization"
            >
                <div className="space-y-6">
                    <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                        {notesForModalDate.length === 0 ? (
                            <p className="text-[12px] text-text-muted font-bold italic text-center py-6">No notes for this day yet.</p>
                        ) : (
                            notesForModalDate.map(n => (
                                <div key={n.id} className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-amber-900 whitespace-pre-wrap break-words">{n.note}</p>
                                        <p className="text-[9px] font-bold text-amber-700/70 tracking-wide mt-2">
                                            {n.author_name} &middot; {new Date(n.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    {canManage && (
                                        <button
                                            onClick={() => handleDeleteNote(n.id)}
                                            className="text-amber-700/40 hover:text-rose-500 transition-colors shrink-0"
                                            title="Delete note"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {canManage && (
                        <div className="pt-4 border-t border-border space-y-3">
                            <textarea
                                value={newNoteText}
                                onChange={e => setNewNoteText(e.target.value)}
                                placeholder="Add a note for this day..."
                                rows={3}
                                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all resize-none"
                            />
                            <Button
                                onClick={handleAddNote}
                                disabled={savingNote || !newNoteText.trim()}
                                variant="primary"
                                className="w-full"
                            >
                                {savingNote ? 'Adding...' : 'Add Note'}
                            </Button>
                        </div>
                    )}
                </div>
            </Modal>
        </PageLayout>
    );
}
