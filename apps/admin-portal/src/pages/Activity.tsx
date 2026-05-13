import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    Mouse, Keyboard, Activity as ActivityIcon,
    Zap, Users,
    Monitor, Clock,
    RefreshCw,
    ChevronLeft, ChevronRight,
    Search, Camera
} from 'lucide-react';
import { PageLayout, StatMetric, FilterSelect, LoadingState, ScreenshotModal, DatePicker } from '../components/ui';
import clsx from 'clsx';

import { AppUsageList } from '../components/activity/AppUsageList';
import { ScreenshotGallery } from '../components/activity/ScreenshotGallery';
import { TimelineGrid } from '../components/activity/TimelineGrid';
import { calculateActivityScore } from '../lib/dataUtils';
import { useAuth } from '../context/AuthContext';

interface ActivitySample {
    id: number;
    session_id: string;
    recorded_at: string;
    mouse_clicks: number;
    key_presses: number;
    app_name: string;
    window_title: string;
    idle: boolean;
    activity_percent: number;
}

interface Screenshot {
    id: number;
    session_id: string;
    recorded_at: string;
    file_url: string;
}

interface MemberInfo {
    id: string;
    auth_user_id?: string | null;
    full_name: string;
    timezone?: string;
    keep_idle?: boolean;
    email?: string;
    avatar_url?: string;
    idle_limit?: number | null;
}

function formatLocalDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Module-level cache
let activityCache: any = null;
let activityCacheKey: string | null = null;

export function Activity() {
    const { profile } = useAuth();
    const organizationId = profile?.organization_id;
    const [samples, setSamples] = useState<ActivitySample[]>([]);
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
    const [enlarged, setEnlarged] = useState<any | null>(null);
    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
    const [sessionMinutes, setSessionMinutes] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination for screenshots
    const [screenshotLimit, setScreenshotLimit] = useState(10);
    const [hasMoreScreenshots, setHasMoreScreenshots] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);


    useEffect(() => {
        if (!organizationId) return;
        supabase.from('members')
            .select('id, auth_user_id, full_name, timezone, keep_idle, email, avatar_url, idle_limit')
            .eq('organization_id', organizationId)
            .eq('status', 'Active')
            .order('full_name', { ascending: true })
            .then(({ data }) => {
                if (data) setMembers(data);
            });
    }, [organizationId]);

    const fetchData = useCallback(async (isSilent = false, forceRefresh = false, overrideLimit?: number) => {
        const currentLimit = overrideLimit ?? screenshotLimit;
        const cacheKey = `${selectedDate}_${selectedMemberId}_${currentLimit}`;

        if (!forceRefresh && activityCache && activityCacheKey === cacheKey) {
            setSamples(activityCache.samples);
            setScreenshots(activityCache.screenshots);
            setSessionMinutes(activityCache.sessionMinutes);
            setHasMoreScreenshots(activityCache.hasMoreScreenshots);
            setLoading(false);
            return;
        }

        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const selectedMember = members.find(m => m.id === selectedMemberId);
            const start = new Date(`${selectedDate}T00:00:00`).toISOString();
            const end = new Date(`${selectedDate}T23:59:59.999`).toISOString();

            const memberUserIds = selectedMemberId.toLowerCase() !== 'all'
                ? Array.from(new Set([selectedMember?.id, selectedMember?.auth_user_id].filter(Boolean) as string[]))
                : [];

            if (selectedMemberId.toLowerCase() !== 'all' && memberUserIds.length === 0) {
                setSamples([]);
                setScreenshots([]);
                setSessionMinutes(0);
                return;
            }

            let sessionsQuery = supabase
                .from('sessions')
                .select('id, user_id, started_at, ended_at')
                .eq('organization_id', organizationId)
                .lt('started_at', end)
                .or(`ended_at.is.null,ended_at.gt.${start}`);

            if (memberUserIds.length > 0) {
                sessionsQuery = sessionsQuery.in('user_id', memberUserIds);
            }

            const { data: sessionRows } = await sessionsQuery;
            const sessions = sessionRows || [];
            const sessionIds = sessions.map(s => s.id);

            if (sessionIds.length === 0) {
                setSamples([]);
                setScreenshots([]);
                setSessionMinutes(0);
                return;
            }

            const [{ data: actData }, { data: ssData, count: totalSS }] = await Promise.all([
                supabase.from('activity_samples')
                    .select('id, session_id, recorded_at, mouse_clicks, key_presses, app_name, window_title, idle, activity_percent')
                    .eq('organization_id', organizationId)
                    .in('session_id', sessionIds)
                    .gte('recorded_at', start)
                    .lte('recorded_at', end)
                    .order('recorded_at', { ascending: true }),
                supabase.from('screenshots')
                    .select('id, session_id, recorded_at, file_url', { count: 'exact' })
                    .eq('organization_id', organizationId)
                    .in('session_id', sessionIds)
                    .gte('recorded_at', start)
                    .lte('recorded_at', end)
                    .order('recorded_at', { ascending: false })
                    .limit(currentLimit)
            ]);

            setHasMoreScreenshots((totalSS || 0) > currentLimit);

            const startMs = new Date(start).getTime();
            const endMs = new Date(end).getTime();
            const mins = sessions.reduce((acc, s) => {
                const sStart = new Date(s.started_at).getTime();
                const sEnd = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
                const overlap = Math.max(0, Math.min(sEnd, endMs) - Math.max(sStart, startMs));
                return acc + overlap / 60000;
            }, 0);

            setSamples(actData || []);
            setScreenshots(ssData || []);
            setSessionMinutes(mins);

            // Update cache
            activityCache = {
                samples: actData || [],
                screenshots: ssData || [],
                sessionMinutes: mins,
                hasMoreScreenshots: (totalSS || 0) > currentLimit
            };
            activityCacheKey = cacheKey;
        } catch (error) {
            console.error('Activity fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedDate, selectedMemberId, members, screenshotLimit]);

    // Reset pagination when filters change
    useEffect(() => {
        setScreenshotLimit(10);
    }, [selectedMemberId, selectedDate]);

    // Re-fetch data whenever any dependency changes
    useEffect(() => {
        if (selectedMemberId !== 'all' && members.length === 0) return;
        fetchData(false);
    }, [fetchData, members]);

    const loadMoreScreenshots = async () => {
        if (loadingMore || refreshing || !hasMoreScreenshots) return;

        setLoadingMore(true);
        const newLimit = screenshotLimit + 12; // Load in batches of 12 for better grid alignment
        setScreenshotLimit(newLimit);

        // Trigger a silent fetch immediately with the new limit
        await fetchData(true, false, newLimit);
        setLoadingMore(false);
    };

    // Data Processing
    const uniqueMinMap = new Map<string, ActivitySample>();
    samples.forEach((s: ActivitySample) => {
        const minKey = s.recorded_at.substring(0, 16);
        if (!uniqueMinMap.has(minKey)) {
            uniqueMinMap.set(minKey, s);
        } else {
            const existing = uniqueMinMap.get(minKey)!;
            if ((s.mouse_clicks + s.key_presses) > (existing.mouse_clicks + existing.key_presses)) {
                uniqueMinMap.set(minKey, s);
            }
        }
    });

    const uniqueSamples = Array.from(uniqueMinMap.values());
    const selectedMember = members.find(m => m.id === selectedMemberId);
    const idleLimit = selectedMember?.idle_limit ?? 0;

    const totalClicks = uniqueSamples.reduce((a, b) => a + b.mouse_clicks, 0);
    const totalKeys = uniqueSamples.reduce((a, b) => a + b.key_presses, 0);

    // Use block-based logic for productive time and activity score
    const productiveSamples: ActivitySample[] = [];
    if (idleLimit <= 1) {
        productiveSamples.push(...uniqueSamples);
    } else {
        const sorted = uniqueSamples.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
        let currentBlock: ActivitySample[] = [];
        for (let i = 0; i < sorted.length; i++) {
            const s = sorted[i];
            const prev = i > 0 ? sorted[i - 1] : null;
            const gapMs = prev ? (new Date(s.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) : 0;
            const isContiguous = prev && gapMs <= 125000;

            if (s.idle && isContiguous) {
                currentBlock.push(s);
            } else if (s.idle && !prev) {
                currentBlock = [s];
            } else if (s.idle && !isContiguous) {
                if (currentBlock.length < idleLimit) productiveSamples.push(...currentBlock);
                currentBlock = [s];
            } else {
                productiveSamples.push(s);
                if (currentBlock.length < idleLimit) productiveSamples.push(...currentBlock);
                currentBlock = [];
            }
        }
        if (currentBlock.length < idleLimit) productiveSamples.push(...currentBlock);
    }

    const avgActivity = calculateActivityScore(productiveSamples);
    const productiveMinutes = uniqueSamples.length > 0 ? productiveSamples.length : Math.max(0, Math.round(sessionMinutes));

    const isToday = selectedDate === formatLocalDate(new Date());

    const navigateDate = (dir: 'prev' | 'next') => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + (dir === 'prev' ? -1 : 1));
        setSelectedDate(formatLocalDate(d));
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-surface"><LoadingState /></div>;

    return (
        <PageLayout
            maxWidth="full"
            title="Screenshots"
            description="Visual audit and activity timeline for workspace members."
            actions={
                <div className="flex items-center gap-4">
                    <div className="bg-surface border border-border p-1 rounded-xl flex items-center shadow-shell-sm">
                        <FilterSelect
                            icon={<Users className="w-3.5 h-3.5 text-text-muted" />}
                            value={selectedMemberId}
                            onChange={setSelectedMemberId}
                            options={[{ id: 'all', name: 'All Members' }, ...members.map(m => ({ id: m.id, name: m.full_name }))]}
                            className="border-none bg-transparent hover:bg-surface-hover transition-all rounded-lg"
                        />
                    </div>

                    <div className="flex items-center bg-surface border border-border p-0.5 rounded-xl shadow-shell-sm">
                        <button
                            onClick={() => navigateDate('prev')}
                            className="p-2.5 hover:bg-surface-hover text-text-muted hover:text-text-main transition-all rounded-lg"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <DatePicker 
                            value={selectedDate}
                            onChange={(val) => setSelectedDate(val)}
                            className="min-w-[180px]"
                            label={isToday ? 'Today' : undefined}
                        />
                        <button
                            onClick={() => navigateDate('next')}
                            className="p-2.5 hover:bg-surface-hover text-text-muted hover:text-text-main transition-all rounded-lg disabled:opacity-20"
                            disabled={isToday}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => fetchData(false, true)}
                        className={clsx(
                            "w-10 h-10 flex items-center justify-center border border-border rounded-xl transition-all",
                            refreshing ? "text-primary bg-primary/5" : "text-text-muted hover:text-text-main hover:bg-surface-hover"
                        )}
                    >
                        <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
                    </button>
                </div>
            }
        >
            <div className="flex flex-col gap-8 pb-20">

                {/* 📊 Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatMetric
                        icon={<Mouse className="w-4 h-4" />}
                        label="Clicks"
                        value={totalClicks.toLocaleString()}
                        sub="Mouse interactions"
                        accent="brand-gradient"
                    />
                    <StatMetric
                        icon={<Keyboard className="w-4 h-4" />}
                        label="Keys"
                        value={totalKeys.toLocaleString()}
                        sub="Keyboard events"
                        accent="brand-gradient"
                    />
                    <StatMetric
                        icon={<Clock className="w-4 h-4" />}
                        label="Duration"
                        value={`${productiveMinutes}m`}
                        sub="Total active time"
                        accent="brand-gradient"
                    />
                    <StatMetric
                        icon={<Zap className="w-4 h-4" />}
                        label="Activity"
                        value={`${avgActivity}%`}
                        sub="Average score"
                        accent="brand-gradient"
                    />
                </div>

                {/* 🏗️ Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Heatmap */}
                    <div className="lg:col-span-8">
                        <div className="bg-surface rounded-[24px] shadow-shell-sm border border-border h-full flex flex-col overflow-hidden">
                            <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-surface shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-main border border-border flex items-center justify-center text-accent shadow-shell-sm">
                                        <ActivityIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-[18px] font-bold text-text-main">Heatmap</h3>
                                        <p className="text-[13px] font-medium text-text-muted mt-0.5 tracking-[0.1em]">10-minute resolution</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-[12px] font-medium text-text-muted ">Active</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-border" />
                                        <span className="text-[12px] font-medium text-text-muted ">Idle</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 flex-1">
                                <TimelineGrid samples={productiveSamples} targetTz={selectedMember?.timezone} />
                            </div>
                        </div>
                    </div>

                    {/* App Usage */}
                    <div className="lg:col-span-4">
                        <div className="bg-surface rounded-[24px] shadow-shell-sm border border-border h-full flex flex-col overflow-hidden">
                            <div className="px-8 py-6 border-b border-border flex items-center gap-4 bg-surface shrink-0">
                                <div className="w-10 h-10 rounded-xl bg-main border border-border flex items-center justify-center text-text-muted shadow-shell-sm">
                                    <Monitor className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-[18px] font-bold text-text-main">App Usage</h3>
                                    <p className="text-[13px] font-medium text-text-muted mt-0.5 tracking-[0.1em]">Top utilized software</p>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar">
                                <AppUsageList samples={productiveSamples} />
                            </div>
                        </div>
                    </div>

                    {/* Screenshots */}
                    <div className="lg:col-span-12">
                        <div className="bg-surface rounded-[24px] shadow-shell-sm border border-border overflow-hidden flex flex-col">
                            <div className="px-8 py-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface shrink-0">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-shell-md">
                                        <Camera className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-[18px] font-bold text-text-main">Captures</h3>
                                        <p className="text-[13px] font-medium text-text-muted mt-0.5 tracking-[0.1em]">{screenshots.length} automated work captures</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative group/search w-[240px]">
                                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                        <input
                                            type="text"
                                            placeholder="Search titles..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="w-full bg-main/50 border border-border rounded-xl pl-10 pr-4 py-2 text-[12px] font-medium text-text-main focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-inner"
                                        />
                                    </div>
                                    <button
                                        onClick={() => fetchData(true)}
                                        className={clsx(
                                            "w-10 h-10 flex items-center justify-center border border-border rounded-xl transition-all",
                                            refreshing ? "text-primary bg-primary/5" : "text-text-muted hover:text-text-main hover:bg-surface-hover"
                                        )}
                                    >
                                        <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-8">
                                <ScreenshotGallery
                                    screenshots={screenshots}
                                    onSelectImage={(ss) => setEnlarged({
                                        id: ss.id,
                                        path: ss.file_url,
                                        recordedAt: ss.recorded_at,
                                        activityPercent: samples.find(samp => samp.recorded_at.substring(0, 16) === ss.recorded_at.substring(0, 16))?.activity_percent ?? 50
                                    })}
                                />

                                {hasMoreScreenshots && (
                                    <div className="mt-12 flex justify-center">
                                        <button
                                            onClick={loadMoreScreenshots}
                                            disabled={loadingMore || refreshing}
                                            className="flex items-center gap-3 px-6 py-3 bg-surface border border-border rounded-xl hover:bg-surface-hover transition-all shadow-shell-sm"
                                        >
                                            {loadingMore || refreshing ? (
                                                <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                                            ) : (
                                                <Camera className="w-4 h-4 text-text-muted" />
                                            )}
                                            <span className="text-[11px] font-bold text-text-main ">
                                                Load More Captures
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <ScreenshotModal
                screenshot={enlarged}
                onClose={() => setEnlarged(null)}
            />
        </PageLayout>
    );
}
