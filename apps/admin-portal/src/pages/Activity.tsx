import { useEffect, useState, useCallback, useRef } from 'react';
import { activityService } from '../services/activity.service';
import {
    Mouse, Keyboard, Activity as ActivityIcon,
    Zap, Users,
    Monitor, Clock,
    RefreshCw,
    ChevronLeft, ChevronRight,
    Camera, Download, CheckSquare, Square, X, Loader2
} from 'lucide-react';
import JSZip from 'jszip';
import { supabase } from '../lib/supabase';
import { getCachedUrl, setCachedUrl } from '../lib/urlCache';
import { PageLayout, StatMetric, FilterSelect, LoadingState, ScreenshotModal, DatePicker, RefreshButton } from '../components/ui';
import clsx from 'clsx';

const MAX_DOWNLOAD_COUNT = 50;
const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024; // 100 MB safe browser limit

import { AppUsageList } from '../components/activity/AppUsageList';
import { ScreenshotGallery } from '../components/activity/ScreenshotGallery';
import { TimelineGrid } from '../components/activity/TimelineGrid';
import { calculateActivityScore, orgLocalToUtc } from '../lib/dataUtils';
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



// Module-level cache
let activityCache: any = null;
let activityCacheKey: string | null = null;

/** Screenshots per page. 12 divides by the 4-, 2- and 1-column grids, so a
    full page always fills its last row. */
const SCREENSHOT_PAGE_SIZE = 12;

export function Activity() {
    const { profile, managedMemberIds, displayTimezone, isRep } = useAuth();
    const organizationId = profile?.organization_id;
    const [samples, setSamples] = useState<ActivitySample[]>([]);
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [loading, setLoading] = useState(true);
    // The fetch below is gated on members arriving, so without knowing the
    // query has resolved an org with no active members would spin forever.
    const [membersLoaded, setMembersLoaded] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const requestSeqRef = useRef(0);
    
    // Default to the current day in the displayTimezone
    const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: displayTimezone || 'UTC' }));
    
    const [enlargedIndex, setEnlargedIndex] = useState<number | null>(null);
    const [members, setMembers] = useState<MemberInfo[]>([]);
    // Reps are locked to their own member id; admins start on 'all'
    const [selectedMemberId, setSelectedMemberId] = useState<string>(() =>
        isRep ? (profile?.id ?? 'all') : 'all'
    );
    const [sessionMinutes, setSessionMinutes] = useState(0);

    // Pagination for screenshots
    // A ref, not state: as state this sat in fetchData's dependency list, so
    // "Load More" re-created fetchData, which re-fired the page-level fetch
    // effect with loading:true — the whole page went to the loader, and a
    // second redundant request went out alongside the one Load More asked for.
    // A multiple of the widest grid (4 columns), so the last row is never
    // part-filled. Ten left two gaps. Load More already stepped by 12 for
    // exactly this reason; only the first page had been left behind.
    const screenshotLimitRef = useRef(SCREENSHOT_PAGE_SIZE);
    const [hasMoreScreenshots, setHasMoreScreenshots] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Download and selection state
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedScreenshotIds, setSelectedScreenshotIds] = useState<Set<number>>(new Set());
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<{
        current: number;
        total: number;
        percent: number;
        message: string;
    } | null>(null);
    const [downloadToast, setDownloadToast] = useState<string | null>(null);

    // Reset selection mode when changing member or date
    useEffect(() => {
        setIsSelectionMode(false);
        setSelectedScreenshotIds(new Set());
        setDownloadProgress(null);
    }, [selectedMemberId, selectedDate]);

    useEffect(() => {
        if (!organizationId) {
            setMembersLoaded(true);
            return;
        }
        let query = supabase.from('members')
            .select('id, auth_user_id, full_name, timezone, keep_idle, email, avatar_url, idle_limit')
            .eq('organization_id', organizationId)
            .eq('status', 'Active')
            .order('full_name', { ascending: true });
            
        // Reps only load themselves; Managers and Clients see their managed subset
        const isScoped = profile?.role === 'Manager' || profile?.role === 'Client' || isRep;
        if (isScoped && managedMemberIds) {
            const memberIdsFilter = managedMemberIds.length > 0 ? managedMemberIds : ['00000000-0000-0000-0000-000000000000'];
            query = query.in('id', memberIdsFilter);
        }
        
        query.then(({ data }) => {
            if (data) setMembers(data);
            setMembersLoaded(true);
        });
    }, [organizationId, isRep, managedMemberIds, profile?.role]);

    const fetchData = useCallback(async (isSilent = false, forceRefresh = false, overrideLimit?: number, quiet = false) => {
        const mySeq = ++requestSeqRef.current;
        const currentLimit = overrideLimit ?? screenshotLimitRef.current;
        const cacheKey = `${profile?.id}_${selectedDate}_${selectedMemberId}_${currentLimit}`;

        if (!forceRefresh && activityCache && activityCacheKey === cacheKey) {
            setSamples(activityCache.samples);
            setScreenshots(activityCache.screenshots);
            setSessionMinutes(activityCache.sessionMinutes);
            setHasMoreScreenshots(activityCache.hasMoreScreenshots);
            // Clear BOTH spinners. Leaving `refreshing` alone here is how the
            // button got stuck pulsing with nothing running: a superseded request
            // cannot clear it (the sequence guard stops it), and the newer one
            // that supersedes it returns from this cache path without clearing
            // it either.
            if (mySeq === requestSeqRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
            return;
        }

        // quiet drives neither spinner: the caller is showing its own.
        if (quiet) { /* no-op */ }
        else if (!isSilent) setLoading(true);
        else setRefreshing(true);
        // forceRefresh means the button was pressed, so it also drives the
        // button's own state. Keyed off `loading` instead, the pulse fired on
        // the initial load and on every filter change - claiming a press that
        // never happened.
        if (forceRefresh) setRefreshing(true);

        try {
            if (!organizationId) return;

            const start = orgLocalToUtc(selectedDate, 'start', displayTimezone);
            const end = orgLocalToUtc(selectedDate, 'end', displayTimezone);

            const data = await activityService.fetchActivity(
                organizationId,
                start.toISOString(),
                end.toISOString(),
                members,
                selectedMemberId,
                currentLimit
            );

            // Superseded while this was in flight: a newer date or member is
            // authoritative. Dropping it also keeps the wrong rows out of the
            // cache, where they would look right on the next visit.
            if (mySeq !== requestSeqRef.current) return;

            setSamples(data.samples);
            setScreenshots(data.screenshots);
            setSessionMinutes(data.sessionMinutes);
            setHasMoreScreenshots(data.hasMoreScreenshots);

            // Update cache
            activityCache = {
                samples: data.samples,
                screenshots: data.screenshots,
                sessionMinutes: data.sessionMinutes,
                hasMoreScreenshots: data.hasMoreScreenshots
            };
            activityCacheKey = cacheKey;
        } catch (error) {
            console.error('Activity fetch error:', error);
        } finally {
            // Only the newest request may clear the spinners; a superseded one
            // finishing first would report "done" while the real fetch runs on.
            if (mySeq === requestSeqRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [selectedDate, selectedMemberId, members]);

    // Reset pagination when filters change. Declared above the fetch effect so
    // it runs first in the same commit, and the refetch below already sees 10.
    useEffect(() => {
        screenshotLimitRef.current = SCREENSHOT_PAGE_SIZE;
    }, [selectedMemberId, selectedDate]);

    // Re-fetch data whenever any dependency changes
        useEffect(() => {
        if (!membersLoaded) return;
        // Resolved and genuinely empty: there is nothing to fetch, so stop the
        // loader rather than leave it running against a request that never goes.
        if (members.length === 0) {
            setLoading(false);
            return;
        }
        fetchData(false);
    }, [fetchData, members, membersLoaded]);

    const loadMoreScreenshots = async () => {
        if (loadingMore || refreshing || !hasMoreScreenshots) return;

        setLoadingMore(true);
        const newLimit = screenshotLimitRef.current + SCREENSHOT_PAGE_SIZE;
        screenshotLimitRef.current = newLimit;

        // quiet: loadingMore is the only thing that should show. Left to the
        // silent path this set `refreshing`, which pulses the header's refresh
        // button — claiming a press the user never made.
        await fetchData(true, false, newLimit, true);
        setLoadingMore(false);
    };

    // Data Processing
    const uniqueMinMap = new Map<string, ActivitySample>();
    samples.forEach((s: ActivitySample) => {
        const minKey = `${s.session_id}_${s.recorded_at.substring(0, 16)}`;
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
    const samplesBySession = new Map<string, ActivitySample[]>();
    uniqueSamples.forEach(s => {
        if (!samplesBySession.has(s.session_id)) samplesBySession.set(s.session_id, []);
        samplesBySession.get(s.session_id)!.push(s);
    });

    const effectiveIdleLimit = idleLimit <= 1 ? 10 : idleLimit;

    samplesBySession.forEach((sessionSamples) => {
        const sorted = sessionSamples.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
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
                if (currentBlock.length < effectiveIdleLimit) productiveSamples.push(...currentBlock);
                currentBlock = [s];
            } else {
                productiveSamples.push(s);
                if (currentBlock.length < effectiveIdleLimit) productiveSamples.push(...currentBlock);
                currentBlock = [];
            }
        }
        if (currentBlock.length < effectiveIdleLimit) productiveSamples.push(...currentBlock);
    });

    const avgActivity = calculateActivityScore(productiveSamples);
    const displayMinutes = Math.max(0, Math.round(sessionMinutes));

    const formatDuration = (mins: number) => {
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const isToday = selectedDate === new Date().toLocaleDateString('en-CA', { timeZone: displayTimezone || 'UTC' });

    const handleToggleSelectScreenshot = useCallback((ss: Screenshot) => {
        setSelectedScreenshotIds(prev => {
            const next = new Set(prev);
            if (next.has(ss.id)) {
                next.delete(ss.id);
            } else {
                if (next.size >= MAX_DOWNLOAD_COUNT) {
                    setDownloadToast(`Selection limit of ${MAX_DOWNLOAD_COUNT} captures reached`);
                    setTimeout(() => setDownloadToast(null), 3500);
                    return prev;
                }
                next.add(ss.id);
            }
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        const selectableCount = Math.min(screenshots.length, MAX_DOWNLOAD_COUNT);
        if (selectedScreenshotIds.size === selectableCount) {
            setSelectedScreenshotIds(new Set());
        } else {
            const next = new Set<number>();
            for (let i = 0; i < selectableCount; i++) {
                next.add(screenshots[i].id);
            }
            setSelectedScreenshotIds(next);
            if (screenshots.length > MAX_DOWNLOAD_COUNT) {
                setDownloadToast(`Selected the first ${MAX_DOWNLOAD_COUNT} captures (batch download limit)`);
                setTimeout(() => setDownloadToast(null), 3500);
            }
        }
    }, [screenshots, selectedScreenshotIds]);

    const handleCancelSelection = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedScreenshotIds(new Set());
        setDownloadProgress(null);
    }, []);

    const handleDownloadZip = useCallback(async () => {
        if (selectedScreenshotIds.size === 0 || isDownloading) return;

        const selectedList = screenshots.filter(s => selectedScreenshotIds.has(s.id));
        if (selectedList.length === 0) return;

        setIsDownloading(true);
        setDownloadProgress({
            current: 0,
            total: selectedList.length,
            percent: 0,
            message: `Preparing download of ${selectedList.length} captures...`,
        });

        const zip = new JSZip();
        let totalBytes = 0;
        let successCount = 0;

        const memberName = selectedMember?.full_name ? selectedMember.full_name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Member';

        try {
            for (let i = 0; i < selectedList.length; i++) {
                const ss = selectedList[i];
                setDownloadProgress({
                    current: i + 1,
                    total: selectedList.length,
                    percent: Math.round(((i) / selectedList.length) * 85),
                    message: `Downloading capture ${i + 1} of ${selectedList.length}...`,
                });

                let imgUrl: string | null = null;
                if (ss.file_url.startsWith('http') && !ss.file_url.includes('.supabase.co/storage/v1/object/')) {
                    imgUrl = ss.file_url;
                } else {
                    const cached = getCachedUrl('screenshots', ss.file_url);
                    if (cached) {
                        imgUrl = cached;
                    } else {
                        let finalPath = ss.file_url;
                        if (ss.file_url.includes('.supabase.co/storage/v1/object/')) {
                            const parts = ss.file_url.split('/screenshots/');
                            if (parts.length > 1) {
                                finalPath = parts[1];
                            }
                        }
                        const { data } = await supabase.storage
                            .from('screenshots')
                            .createSignedUrl(finalPath, 3600);
                        if (data?.signedUrl) {
                            setCachedUrl('screenshots', ss.file_url, data.signedUrl, 3600);
                            imgUrl = data.signedUrl;
                        }
                    }
                }

                if (!imgUrl) continue;

                try {
                    const response = await fetch(imgUrl);
                    if (!response.ok) continue;
                    const blob = await response.blob();
                    totalBytes += blob.size;

                    const dt = new Date(ss.recorded_at);
                    const timeStr = dt.toTimeString().split(' ')[0].replace(/:/g, '-');
                    const dateStr = dt.toLocaleDateString('en-CA');
                    const fileIndex = String(i + 1).padStart(2, '0');
                    const filename = `${fileIndex}_${dateStr}_${timeStr}.png`;

                    zip.file(filename, blob);
                    successCount++;

                    if (totalBytes >= MAX_DOWNLOAD_BYTES) {
                        setDownloadToast(`Reached 100 MB download limit (${successCount} captures packaged)`);
                        break;
                    }
                } catch (fetchErr) {
                    console.error(`Failed to download capture ${ss.id}:`, fetchErr);
                }
            }

            if (successCount === 0) {
                throw new Error('Could not retrieve any captures. Please check your connection.');
            }

            setDownloadProgress({
                current: selectedList.length,
                total: selectedList.length,
                percent: 90,
                message: 'Compressing ZIP archive...',
            });

            const zipBlob = await zip.generateAsync(
                { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
                (metadata) => {
                    const genPercent = 90 + Math.round((metadata.percent / 100) * 10);
                    setDownloadProgress(prev => prev ? {
                        ...prev,
                        percent: Math.min(genPercent, 99),
                        message: `Packing archive (${Math.round(metadata.percent)}%)...`
                    } : null);
                }
            );

            const zipFileName = `TrackOwl_${memberName}_${selectedDate}_Captures.zip`;
            const downloadUrl = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = zipFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);

            setDownloadToast(`Successfully downloaded ${successCount} captures as ZIP!`);
            setTimeout(() => setDownloadToast(null), 4000);
            setIsSelectionMode(false);
            setSelectedScreenshotIds(new Set());
        } catch (err: any) {
            console.error('ZIP generation error:', err);
            setDownloadToast(err.message || 'Failed to generate ZIP download');
            setTimeout(() => setDownloadToast(null), 4000);
        } finally {
            setIsDownloading(false);
            setDownloadProgress(null);
        }
    }, [selectedScreenshotIds, isDownloading, screenshots, selectedMember, selectedDate]);

    return (
        <PageLayout
            maxWidth="full"
            title="Screenshots"
            description="Visual audit and activity timeline for workspace members."
            actions={
                <div className="flex items-center gap-4">
                    {/* Member filter — hidden for reps who see only their own data */}
                    {!isRep && (
                    <FilterSelect
                        icon={<Users className="w-3.5 h-3.5 text-text-muted" />}
                        value={selectedMemberId}
                        onChange={setSelectedMemberId}
                        options={[{ id: 'all', name: 'All Members' }, ...members.map(m => ({ id: m.id, name: m.full_name }))]}
                        // Wider than its content needs. The dropdown is w-full, so the
                        // trigger's width is also the list's, and at content width the
                        // longer member names were truncating.
                        className="h-10 min-w-[240px]"
                    />
                    )}

                    <div className="flex items-center h-10 bg-surface border border-border p-1 rounded-xl shadow-shell-sm">
                        <button
                            onClick={() => {
                                const [y, m, d] = selectedDate.split('-').map(Number);
                                const dateObj = new Date(y, m - 1, d);
                                dateObj.setDate(dateObj.getDate() - 1);
                                setSelectedDate(dateObj.toLocaleDateString('en-CA'));
                            }}
                            className="p-2.5 hover:bg-surface-hover text-text-muted hover:text-text-main transition-all rounded-lg"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {/* No label: it was conditional on the date being today,
                            so the pill grew a second line on some dates and not
                            others, and the whole row changed height as you paged
                            through them. Single line now, matching the member
                            filter beside it and the Timesheets control. */}
                        <DatePicker 
                            value={selectedDate}
                            onChange={(val) => setSelectedDate(val)}
                            className="min-w-[180px]"
                        />
                        <button
                            onClick={() => {
                                const [y, m, d] = selectedDate.split('-').map(Number);
                                const dateObj = new Date(y, m - 1, d);
                                dateObj.setDate(dateObj.getDate() + 1);
                                setSelectedDate(dateObj.toLocaleDateString('en-CA'));
                            }}
                            className="p-2.5 hover:bg-surface-hover text-text-muted hover:text-text-main transition-all rounded-lg disabled:opacity-20"
                            disabled={isToday}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <RefreshButton
                        onClick={() => fetchData(false, true)}
                        refreshing={refreshing}
                        label="Refresh screenshots"
                    />
                </div>
            }
        >
            {/* The loader sits inside the layout rather than replacing it, so the
                title, the member filter, the date picker and the refresh button
                all stay put - and the button that started the reload is still on
                screen to show it running. */}
            {loading ? (
                <div className="min-h-[60vh] flex items-center justify-center">
                    <LoadingState />
                </div>
            ) : (
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
                        value={formatDuration(displayMinutes)}
                        sub="Total tracked time"
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
                                <TimelineGrid samples={productiveSamples} targetTz={displayTimezone} />
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
                            <div className="px-8 py-6 border-b border-border flex items-center justify-between gap-4 bg-surface shrink-0 flex-wrap">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-shell-md">
                                        <Camera className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-[18px] font-bold text-text-main">Captures</h3>
                                        <p className="text-[13px] font-medium text-text-muted mt-0.5 tracking-[0.1em]">{screenshots.length} automated work captures</p>
                                    </div>
                                </div>

                                {/* Download & Bulk Selection Controls */}
                                {selectedMemberId !== 'all' && screenshots.length > 0 && (
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {!isSelectionMode ? (
                                            <button
                                                onClick={() => setIsSelectionMode(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl hover:bg-surface-hover text-text-main hover:text-primary transition-all duration-200 shadow-shell-sm group cursor-pointer"
                                                title="Select and download captures as ZIP"
                                            >
                                                <Download className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                                                <span className="text-[12px] font-bold tracking-tight">Download</span>
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-3 flex-wrap animate-in fade-in duration-200">
                                                {/* Select All Toggle */}
                                                <button
                                                    onClick={handleSelectAll}
                                                    disabled={isDownloading}
                                                    className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-xl hover:bg-surface-hover text-text-main text-[12px] font-semibold transition-all shadow-shell-sm cursor-pointer disabled:opacity-50"
                                                >
                                                    {selectedScreenshotIds.size === Math.min(screenshots.length, MAX_DOWNLOAD_COUNT) ? (
                                                        <>
                                                            <CheckSquare className="w-3.5 h-3.5 text-primary" />
                                                            <span>Deselect All</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Square className="w-3.5 h-3.5 text-text-muted" />
                                                            <span>Select All ({Math.min(screenshots.length, MAX_DOWNLOAD_COUNT)})</span>
                                                        </>
                                                    )}
                                                </button>

                                                {/* Selected Counter Badge */}
                                                <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold tracking-wide">
                                                    {selectedScreenshotIds.size} / {MAX_DOWNLOAD_COUNT} selected
                                                </div>

                                                {/* Download ZIP Button */}
                                                <button
                                                    onClick={handleDownloadZip}
                                                    disabled={selectedScreenshotIds.size === 0 || isDownloading}
                                                    className={clsx(
                                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all shadow-shell-sm cursor-pointer",
                                                        selectedScreenshotIds.size > 0 && !isDownloading
                                                            ? "bg-primary text-white hover:bg-primary/90 shadow-primary/20 shadow-md"
                                                            : "bg-surface-hover text-text-muted border border-border opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    {isDownloading ? (
                                                        <>
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                                            <span>Downloading...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download className="w-3.5 h-3.5" />
                                                            <span>Download ZIP ({selectedScreenshotIds.size})</span>
                                                        </>
                                                    )}
                                                </button>

                                                {/* Cancel Button */}
                                                <button
                                                    onClick={handleCancelSelection}
                                                    disabled={isDownloading}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-surface-hover border border-border rounded-xl text-text-muted hover:text-rose-500 text-[12px] font-semibold transition-all shadow-shell-sm cursor-pointer disabled:opacity-50"
                                                    title="Cancel selection"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    <span>Cancel</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Download Progress Bar */}
                            {downloadProgress && (
                                <div className="w-full bg-surface-hover/80 border-b border-border px-8 py-3 flex items-center justify-between gap-4 animate-in fade-in duration-300">
                                    <div className="flex items-center gap-2.5 text-[12px] font-semibold text-text-main">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        <span>{downloadProgress.message}</span>
                                    </div>
                                    <div className="flex items-center gap-3 flex-1 max-w-xs">
                                        <div className="flex-1 bg-main border border-border h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-primary h-full transition-all duration-300 rounded-full"
                                                style={{ width: `${downloadProgress.percent}%` }}
                                            />
                                        </div>
                                        <span className="text-[11px] font-bold text-text-muted tabular-nums">{downloadProgress.percent}%</span>
                                    </div>
                                </div>
                            )}

                            {/* Feedback Toast Banner */}
                            {downloadToast && (
                                <div className="w-full bg-primary/10 border-b border-primary/20 px-8 py-2.5 flex items-center justify-between text-[12px] font-bold text-primary animate-in fade-in duration-200">
                                    <span>{downloadToast}</span>
                                    <button onClick={() => setDownloadToast(null)} className="cursor-pointer text-primary/70 hover:text-primary">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            <div className="p-8">
                                <ScreenshotGallery
                                    screenshots={screenshots}
                                    onSelectImage={(ss) => {
                                        const idx = screenshots.findIndex(s => s.id === ss.id);
                                        setEnlargedIndex(idx >= 0 ? idx : 0);
                                    }}
                                    selectionMode={isSelectionMode}
                                    selectedIds={selectedScreenshotIds}
                                    onToggleSelect={handleToggleSelectScreenshot}
                                    maxLimit={MAX_DOWNLOAD_COUNT}
                                />

                                {hasMoreScreenshots && (
                                    <div className="mt-12 flex justify-center">
                                        <button
                                            onClick={loadMoreScreenshots}
                                            disabled={loadingMore}
                                            className={clsx(
                                                "flex items-center gap-3 px-6 py-3 bg-surface border border-border rounded-xl hover:bg-surface-hover transition-all shadow-shell-sm",
                                                // Same accent pulse as the refresh button. The spinner alone
                                                // used text-primary, which is bright gold in dark mode but
                                                // navy on a white button in light mode — visible, but flat,
                                                // with nothing that reads as "working". --accent is gold in
                                                // both themes.
                                                loadingMore && "is-refreshing"
                                            )}
                                        >
                                            {loadingMore ? (
                                                <RefreshCw className="w-4 h-4 animate-spin text-accent" />
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
            )}

            {enlargedIndex !== null && (
                <ScreenshotModal
                    screenshots={screenshots.map(ss => ({
                        path: ss.file_url,
                        recordedAt: ss.recorded_at,
                        activityPercent: samples.find(samp => samp.recorded_at.substring(0, 16) === ss.recorded_at.substring(0, 16))?.activity_percent ?? 50
                    }))}
                    currentIndex={enlargedIndex}
                    onClose={() => setEnlargedIndex(null)}
                    onNavigate={setEnlargedIndex}
                />
            )}
        </PageLayout>
    );
}
