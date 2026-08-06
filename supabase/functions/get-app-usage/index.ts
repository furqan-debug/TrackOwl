import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { organizationId, start, end, members, selectedMemberId } = await req.json();

    if (!organizationId || !start || !end) {
      throw new Error("Missing required parameters");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const selectedMember = members.find((m: any) => m.id === selectedMemberId);
    const scopedUserIds = selectedMemberId.toLowerCase() !== 'all'
        ? Array.from(new Set([selectedMember?.id, selectedMember?.auth_user_id].filter(Boolean)))
        : Array.from(new Set(members.flatMap((m: any) => [m.id, m.auth_user_id].filter(Boolean))));

    const { data: userSessions, error: sessionErr } = await supabase.from('sessions')
        .select('id, user_id')
        .in('user_id', scopedUserIds)
        .gte('started_at', start)
        .lte('started_at', end);

    if (sessionErr) throw sessionErr;

    const sessionIds = userSessions?.map(s => s.id) || [];
    if (sessionIds.length === 0) {
        return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch all samples for these sessions in batches
    const PAGE_SIZE = 1000;
    const allSamples: any[] = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from('activity_samples')
            .select('session_id, app_name, domain, window_title, recorded_at, idle')
            .in('session_id', sessionIds)
            .gte('recorded_at', start)
            .lte('recorded_at', end)
            .order('recorded_at', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allSamples.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }

    const membersMap = new Map(members.map((m: any) => [m.id, m]));
    const samplesByUser = new Map<string, any[]>();
    allSamples.forEach((s: any) => {
        const uid = userSessions?.find(sess => sess.id === s.session_id)?.user_id;
        if (!uid) return;
        if (!samplesByUser.has(uid)) samplesByUser.set(uid, []);
        samplesByUser.get(uid)!.push(s);
    });

    const productiveSamples: any[] = [];
    samplesByUser.forEach((userSamps, uid) => {
        const limit = membersMap.get(uid)?.idle_limit ?? 0;

        const minuteMap = new Map<string, any>();
        userSamps.forEach(s => {
            const minute = new Date(s.recorded_at).toISOString().substring(0, 16);
            if (!minuteMap.has(minute) || (minuteMap.get(minute).idle && !s.idle)) {
                minuteMap.set(minute, s);
            }
        });
        const uniqueSamps = Array.from(minuteMap.values());

        if (limit <= 1) {
            productiveSamples.push(...uniqueSamps);
        } else {
            const sorted = uniqueSamps.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
            let currentBlock: any[] = [];
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
                    if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
                    currentBlock = [s];
                } else {
                    productiveSamples.push(s);
                    if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
                    currentBlock = [];
                }
            }
            if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
        }
    });

    const appCounts = new Map<string, { app: string, domain: string, window_title: string, count: number }>();

    productiveSamples.forEach(s => {
        const app = (s.app_name || '').trim();
        if (!app || app.toLowerCase() === 'program manager') return;

        const domain = (s.domain || '').trim();
        const window_title = (s.window_title || '').trim();
        const key = `${app}|${domain}|${window_title}`;

        if (!appCounts.has(key)) {
            appCounts.set(key, { app, domain, window_title, count: 0 });
        }
        appCounts.get(key)!.count++;
    });

    const results = Array.from(appCounts.values()).map(({ app, domain, window_title, count }) => {
        let primaryName = app;
        const isBrowser = ['google chrome', 'chrome', 'microsoft edge', 'edge', 'safari', 'firefox', 'brave', 'brave browser'].includes(app.toLowerCase());
        if (isBrowser) {
            if (domain && domain.toUpperCase() !== 'EMPTY') {
                primaryName = domain;
            } else if (window_title) {
                primaryName = window_title;
            }
        }

        return {
            app: primaryName,
            raw_app: app,
            domain: domain === 'EMPTY' ? '' : domain,
            window_title,
            count
        };
    });

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Error processing app usage:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
