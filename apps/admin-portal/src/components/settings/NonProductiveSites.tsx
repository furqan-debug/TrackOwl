import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, Pencil, Plus, RotateCcw, Trash2, User, X } from 'lucide-react';
import clsx from 'clsx';
import { FilterSelect } from '../ui';
import { supabase } from '../../lib/supabase';
import {
    nonProductiveService,
    normalizeDomain,
    type DefaultSite,
    type SiteCategory,
    type SiteRule,
} from '../../services/nonProductive.service';

/**
 * Settings → Telemetry → Non-productive sites.
 *
 * Every change saves straight away to its own table. It is not part of the
 * page's "Save" button on purpose: that button writes organizations.settings,
 * which the desktop app reads, and this list must never change tracking.
 */

const EVERYONE = 'everyone';

const CATEGORY_LABEL: Record<SiteCategory, string> = {
    social: 'Social media',
    video: 'Streaming',
    music: 'Music',
    gaming: 'Gaming',
    entertainment: 'Entertainment',
};

interface Row {
    domain: string;
    /** Category when the site is on the built-in list. */
    category: SiteCategory | null;
    on: boolean;
    /** The rule this row would change or remove in the current scope. */
    rule: SiteRule | null;
    /** Member view: what the organisation list says, so a change can be undone. */
    orgOn: boolean;
    /** Added in this scope (not built in, and for a member not on the organisation list). */
    added: boolean;
}

function errorText(err: unknown, fallback: string): string {
    const e = err as { code?: string; message?: string } | null;
    if (e?.code === '23505') return 'That site is already on the list.';
    if (e?.code === '23514') return 'That is not a site name. Use something like youtube.com.';
    if (e?.code === '42501') return 'Only Owners and Admins can change this list.';
    return e?.message || fallback;
}

export function NonProductiveSites({ organizationId }: { organizationId: string }) {
    const [defaults, setDefaults] = useState<DefaultSite[]>([]);
    const [rules, setRules] = useState<SiteRule[]>([]);
    const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
    const [scope, setScope] = useState<string>(EVERYONE);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [newSite, setNewSite] = useState('');
    const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [d, r, m] = await Promise.all([
                nonProductiveService.fetchDefaults(),
                nonProductiveService.fetchRules(organizationId),
                supabase
                    .from('members')
                    .select('id, full_name')
                    .eq('organization_id', organizationId)
                    .neq('status', 'Deleted')
                    .order('full_name'),
            ]);
            if (m.error) throw m.error;
            setDefaults(d);
            setRules(r);
            setMembers((m.data || []).map(x => ({ id: x.id as string, name: (x.full_name as string) || 'Unnamed member' })));
        } catch (err) {
            setError(errorText(err, 'Could not load the list of non-productive sites.'));
        } finally {
            setLoading(false);
        }
    }, [organizationId]);

    useEffect(() => { load(); }, [load]);

    const memberId = scope === EVERYONE ? null : scope;
    const memberName = members.find(m => m.id === memberId)?.name ?? '';

    const rows = useMemo<Row[]>(() => {
        const category = new Map(defaults.map(d => [d.domain, d.category]));
        const orgRule = new Map(rules.filter(r => r.member_id === null).map(r => [r.domain, r]));
        const orgOn = (domain: string) => orgRule.get(domain)?.is_nonproductive ?? category.has(domain);
        const orgDomains = new Set([...category.keys(), ...orgRule.keys()]);

        if (memberId === null) {
            return [...orgDomains].sort().map(domain => ({
                domain,
                category: category.get(domain) ?? null,
                on: orgOn(domain),
                rule: orgRule.get(domain) ?? null,
                orgOn: orgOn(domain),
                added: !category.has(domain),
            }));
        }

        const mine = new Map(rules.filter(r => r.member_id === memberId).map(r => [r.domain, r]));
        const domains = new Set([...orgDomains, ...mine.keys()]);
        return [...domains].sort().map(domain => ({
            domain,
            category: category.get(domain) ?? null,
            on: mine.get(domain)?.is_nonproductive ?? orgOn(domain),
            rule: mine.get(domain) ?? null,
            orgOn: orgOn(domain),
            added: !orgDomains.has(domain),
        }));
    }, [defaults, rules, memberId]);

    async function run(key: string, action: () => Promise<void>) {
        setBusy(key);
        setError(null);
        try {
            await action();
        } catch (err) {
            setError(errorText(err, 'That change could not be saved.'));
        } finally {
            setBusy(null);
        }
    }

    const replaceRule = (rule: SiteRule) => setRules(prev => [...prev.filter(r => r.id !== rule.id), rule]);
    const dropRule = (id: string) => setRules(prev => prev.filter(r => r.id !== id));

    function toggle(row: Row) {
        const want = !row.on;
        run(`toggle:${row.domain}`, async () => {
            // Back to what the level above says: the rule is no longer needed.
            const inherited = memberId === null ? row.category !== null : row.orgOn;
            if (!row.added && want === inherited) {
                if (row.rule) {
                    await nonProductiveService.deleteRule(row.rule.id);
                    dropRule(row.rule.id);
                }
                return;
            }
            if (row.rule) {
                replaceRule(await nonProductiveService.updateRule(row.rule.id, { is_nonproductive: want }));
            } else {
                replaceRule(await nonProductiveService.addRule(organizationId, memberId, row.domain, want));
            }
        });
    }

    function add() {
        const domain = normalizeDomain(newSite);
        if (!domain) {
            setError('That is not a site name. Use something like youtube.com.');
            return;
        }
        const existing = rows.find(r => r.domain === domain);
        if (existing?.on) {
            setError(`${domain} is already on the list.`);
            return;
        }
        if (existing) {
            // On the list but switched off here: switch it back on.
            toggle(existing);
            setNewSite('');
            return;
        }
        run('add', async () => {
            replaceRule(await nonProductiveService.addRule(organizationId, memberId, domain, true));
            setNewSite('');
        });
    }

    function saveEdit(row: Row) {
        if (!editing || !row.rule) return;
        const domain = normalizeDomain(editing.value);
        if (!domain) {
            setError('That is not a site name. Use something like youtube.com.');
            return;
        }
        if (domain === row.domain) {
            setEditing(null);
            return;
        }
        if (rows.some(r => r.domain === domain)) {
            setError(`${domain} is already on the list.`);
            return;
        }
        const ruleId = row.rule.id;
        run(`edit:${row.domain}`, async () => {
            replaceRule(await nonProductiveService.updateRule(ruleId, { domain }));
            setEditing(null);
        });
    }

    function remove(row: Row) {
        if (!row.rule) return;
        const ruleId = row.rule.id;
        run(`remove:${row.domain}`, async () => {
            await nonProductiveService.deleteRule(ruleId);
            dropRule(ruleId);
        });
    }

    const scopeOptions = useMemo(
        () => [{ id: EVERYONE, name: 'Everyone (organisation list)' }, ...members],
        [members],
    );
    const changedCount = memberId === null
        ? rules.filter(r => r.member_id === null).length
        : rules.filter(r => r.member_id === memberId).length;

    return (
        <div className="space-y-5 pt-8 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                    <p className="text-[14px] font-bold text-text-main">Non-productive sites</p>
                    <p className="text-[13px] text-text-muted opacity-60 leading-relaxed">
                        Minutes on these sites count as non-productive, and Owl Lens flags anyone whose
                        non-productive minutes reach a quarter of their tracked day. A site also covers its
                        subdomains. Changes show in Owl Lens within 10 minutes. Tracked time and the desktop
                        app are not affected.
                    </p>
                </div>
                <FilterSelect
                    icon={<User className="w-4 h-4" />}
                    value={scope}
                    onChange={v => { setScope(v); setEditing(null); setError(null); }}
                    options={scopeOptions}
                    sortOptions={false}
                    className="w-full sm:w-64 shrink-0"
                />
            </div>

            {memberId !== null && (
                <p className="text-[13px] text-text-muted leading-relaxed">
                    Changes here apply to <span className="font-semibold text-text-main">{memberName}</span> only.
                    Everything else follows the organisation list.
                </p>
            )}

            <form
                className="flex gap-2"
                onSubmit={e => { e.preventDefault(); add(); }}
            >
                <input
                    type="text"
                    value={newSite}
                    onChange={e => setNewSite(e.target.value)}
                    placeholder="Add a site, e.g. example.com"
                    aria-label="Site to add"
                    className="flex-1 min-w-0 h-9 px-3 rounded-md bg-surface border border-border text-[13px] text-text-main placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                />
                <button
                    type="submit"
                    disabled={busy !== null || newSite.trim() === ''}
                    className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md bg-primary text-white text-[12px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                    <Plus className="w-3.5 h-3.5" /> Add
                </button>
            </form>

            {error && <p role="alert" className="text-[13px] text-rose-600 dark:text-rose-400">{error}</p>}

            {loading ? (
                <p className="text-[13px] text-text-muted">Loading the list…</p>
            ) : (
                <>
                    <p className="text-[12px] text-text-muted">
                        {rows.filter(r => r.on).length} of {rows.length} sites counted
                        {changedCount > 0 && <> · {changedCount} {changedCount === 1 ? 'change' : 'changes'} {memberId === null ? 'from the built-in list' : `for ${memberName}`}</>}
                    </p>
                    <ul className="grid sm:grid-cols-2 gap-x-6">
                        {rows.map(row => {
                            const isEditing = editing !== null && row.rule !== null && editing.id === row.rule.id;
                            const rowBusy = busy !== null && busy.endsWith(`:${row.domain}`);
                            const changed = memberId !== null && row.rule !== null && !row.added;
                            return (
                                <li key={row.domain} className="flex items-center gap-2 py-1.5 border-b border-border/60 min-w-0">
                                    {isEditing ? (
                                        <form
                                            className="flex-1 flex items-center gap-1 min-w-0"
                                            onSubmit={e => { e.preventDefault(); saveEdit(row); }}
                                        >
                                            <input
                                                autoFocus
                                                value={editing.value}
                                                onChange={e => setEditing({ id: editing.id, value: e.target.value })}
                                                onKeyDown={e => { if (e.key === 'Escape') setEditing(null); }}
                                                aria-label={`New name for ${row.domain}`}
                                                className="flex-1 min-w-0 h-7 px-2 rounded bg-surface border border-border text-[13px] text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                                            />
                                            <IconButton label="Save" type="submit" disabled={rowBusy}><Check className="w-3.5 h-3.5" /></IconButton>
                                            <IconButton label="Cancel" onClick={() => setEditing(null)}><X className="w-3.5 h-3.5" /></IconButton>
                                        </form>
                                    ) : (
                                        <>
                                            <div className="flex-1 min-w-0">
                                                <p className={clsx('text-[13px] truncate', row.on ? 'text-text-main' : 'text-text-muted line-through')}>
                                                    {row.domain}
                                                </p>
                                                <p className="text-[11px] text-text-muted truncate">
                                                    {row.category ? CATEGORY_LABEL[row.category] : memberId !== null && !row.added ? 'Added for everyone' : 'Added'}
                                                    {changed && <> · changed for {memberName}</>}
                                                </p>
                                            </div>
                                            {row.added && row.rule && (
                                                <>
                                                    <IconButton label={`Edit ${row.domain}`} disabled={busy !== null} onClick={() => { setError(null); setEditing({ id: row.rule!.id, value: row.domain }); }}>
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </IconButton>
                                                    <IconButton label={`Remove ${row.domain}`} disabled={busy !== null} onClick={() => remove(row)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </IconButton>
                                                </>
                                            )}
                                            {changed && (
                                                <IconButton label={`Use the organisation setting for ${row.domain}`} disabled={busy !== null} onClick={() => remove(row)}>
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                </IconButton>
                                            )}
                                            <Switch
                                                on={row.on}
                                                disabled={busy !== null}
                                                label={`Count ${row.domain} as non-productive`}
                                                onChange={() => toggle(row)}
                                            />
                                        </>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </div>
    );
}

function IconButton({ label, children, onClick, disabled, type = 'button' }: {
    label: string; children: ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit';
}) {
    return (
        <button
            type={type}
            title={label}
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors disabled:opacity-40"
        >
            {children}
        </button>
    );
}

/** Same look as the Telemetry toggles above it, one size smaller. */
function Switch({ on, onChange, disabled, label }: { on: boolean; onChange: () => void; disabled?: boolean; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            title={label}
            onClick={onChange}
            disabled={disabled}
            className={clsx(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:cursor-wait disabled:opacity-60',
                on ? 'bg-primary' : 'bg-slate-500 dark:bg-white/20',
            )}
        >
            <span
                className={clsx(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out transform',
                    on ? 'translate-x-4' : 'translate-x-0',
                )}
            />
        </button>
    );
}
