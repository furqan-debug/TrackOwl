import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import Stripe from 'stripe';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
// ── CORS ─────────────────────────────────────────────────────────────────────
// In development, allow everything. In production, restrict to your actual domains.
const allowedOrigins = [
    'http://localhost:5173', // Electron renderer (dev)
    'http://localhost:5174', // Admin portal (dev)
    // ⬇ Add your production domains here once deployed:
    // 'https://admin.yourapp.com',
    // 'https://yourapp.com',
    process.env.ADMIN_PORTAL_URL,
    process.env.LANDING_URL,
].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (Electron, mobile apps, curl)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.some(o => origin.startsWith(o))) {
            callback(null, true);
        }
        else {
            console.warn(`CORS blocked: ${origin}`);
            callback(new Error(`CORS policy: origin ${origin} not allowed`)); // cors policies not allowed
        }
    },
    credentials: true,
}));
// Initialize Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' }) : null;
if (!stripe) {
    console.warn('⚠️  STRIPE_SECRET_KEY is not set. Billing endpoints will return 501 Not Implemented.');
}
// ── STRIPE WEBHOOK (Must be registered BEFORE express.json() to get raw request body) ──
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
        console.error('🚨 Webhook failed: Stripe or Webhook Secret is not configured.');
        return res.status(501).json({ error: 'Stripe integration is not configured' });
    }
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error(`🚨 Webhook Signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    console.log(`🔔 Stripe Webhook Received Event: ${event.type}`);
    try {
        const db = getDb();
        if (event.type === 'customer.subscription.created' ||
            event.type === 'customer.subscription.updated' ||
            event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const stripeCustomerId = subscription.customer;
            const status = subscription.status;
            // Get active quantity (seats count)
            const seats = subscription.items.data[0]?.quantity || 1;
            // Map plan type from Stripe Price ID
            const priceId = subscription.items.data[0]?.price.id;
            const isPremiumPrice = priceId === process.env.STRIPE_PRICE_PREMIUM_MONTHLY ||
                priceId === process.env.STRIPE_PRICE_PREMIUM_YEARLY;
            const planType = isPremiumPrice ? 'Premium' : 'Basic';
            // Map subscription status
            let subscriptionStatus = 'None';
            if (status === 'active') {
                subscriptionStatus = 'Active';
            }
            else if (status === 'trialing') {
                subscriptionStatus = 'Trial';
            }
            else if (status === 'past_due' || status === 'unpaid') {
                subscriptionStatus = 'Past Due';
            }
            else if (status === 'incomplete_expired' || status === 'canceled') {
                subscriptionStatus = 'None';
            }
            // Update database using stripeCustomerId to match organization
            const { data: updatedOrg, error: orgUpdateError } = await db
                .from('organizations')
                .update({
                plan_type: planType,
                subscription_status: subscriptionStatus,
                seats_purchased: seats,
                stripe_subscription_id: subscription.id,
            })
                .eq('stripe_customer_id', stripeCustomerId)
                .select();
            if (orgUpdateError) {
                console.error(`🚨 Webhook database update error for Customer ${stripeCustomerId}:`, orgUpdateError);
            }
            else {
                console.log(`` + '\u001b' + `[32m[Webhook] Subscription synchronized for Customer ${stripeCustomerId}: ${planType} plan, ${seats} seat(s) [Status: ${subscriptionStatus}]` + '\u001b' + `[0m`);
            }
        }
        res.json({ received: true });
    }
    catch (err) {
        console.error('🚨 Webhook handler execution error:', err);
        res.status(500).json({ error: 'Internal webhook processor error' });
    }
});
app.use(express.json({ limit: '50mb' })); // Large limit for base64 screenshot payloads
// Initialize Supabase client lazily (won't crash if env vars are missing at startup)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('⚠️  SUPABASE_URL or SUPABASE_SERVICE_KEY is not set. DB writes will be skipped.');
    console.warn('    → Copy supabase/.env.example to supabase/.env and fill in your credentials.');
}
// Service-role client: for DB writes (bypasses RLS)
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : null;
// Validate that the service key is actually a service_role key, not an anon key
if (SUPABASE_SERVICE_KEY) {
    try {
        const parts = SUPABASE_SERVICE_KEY.split('.');
        const tokenPayload = parts[1];
        if (tokenPayload) {
            const payload = JSON.parse(Buffer.from(tokenPayload, 'base64').toString());
            if (payload.role !== 'service_role') {
                console.error('🚨 CRITICAL CONFIG ERROR 🚨');
                console.error('   SUPABASE_SERVICE_KEY contains the wrong role: "' + payload.role + '"');
                console.error('   It MUST be a "service_role" key to bypass RLS for DB writes.');
                console.error('   Please copy the true "service_role" key from Supabase Dashboard -> Project Settings -> API.');
            }
        }
    }
    catch (e) {
        // ignore parsing errors
        console.warn('⚠️ Could not decode SUPABASE_SERVICE_KEY to verify its role.');
    }
}
// Anon client: for Supabase Auth operations (signInWithPassword, getUser)
const supabaseAuth = (SUPABASE_URL && SUPABASE_ANON_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : (supabase); // fall back to service client — still works for auth in dev
// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);
/** Helper: Send email via Resend */
async function sendEmail({ to, subject, html }) {
    try {
        const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const { data, error } = await resend.emails.send({ from, to, subject, html });
        if (error)
            throw error;
        return data;
    }
    catch (error) {
        console.error('📧 Resend error:', error);
        throw error;
    }
}
/** Helper — throws a readable error instead of crashing with 'null' */
function getDb() {
    if (!supabase)
        throw new Error('Supabase is not configured. Check your .env file.');
    return supabase;
}
/** Extract bearer token from Authorization header */
function extractToken(req) {
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer '))
        return null;
    return auth.slice(7);
}
/** Middleware: verify JWT and attach user + organization_id to req */
async function requireAuth(req, res, next) {
    const token = extractToken(req);
    if (!token)
        return res.status(401).json({ error: 'Missing authorization token' });
    try {
        const db = getDb();
        const { data: { user }, error } = await db.auth.getUser(token);
        if (error || !user)
            return res.status(401).json({ error: 'Invalid or expired token' });
        // Fetch the user's member record to get their organization_id
        const { data: member, error: memberErr } = await db
            .from('members')
            .select('organization_id, role')
            .eq('auth_user_id', user.id)
            .single();
        if (memberErr || !member) {
            // Fallback: try by email if auth_user_id isn't linked yet
            const { data: memberByEmail } = await db
                .from('members')
                .select('organization_id, role')
                .eq('email', user.email)
                .single();
            if (memberByEmail) {
                req.authUser = user;
                req.organizationId = memberByEmail.organization_id;
                req.memberRole = memberByEmail.role;
            }
            else {
                console.warn(`⚠️ Could not find member record for ${user.email}`);
                req.authUser = user;
            }
        }
        else {
            req.authUser = user;
            req.organizationId = member.organization_id;
            req.memberRole = member.role;
        }
        next();
    }
    catch (e) {
        res.status(401).json({ error: e.message });
    }
}
/** Helper: Get organization_id and user_id for a session */
async function getSessionContext(sessionId) {
    const db = getDb();
    const { data: session, error } = await db
        .from('sessions')
        .select('organization_id, user_id')
        .eq('id', sessionId)
        .single();
    if (error || !session)
        return null;
    return {
        organizationId: session.organization_id,
        userId: session.user_id
    };
}
/** Helper: Fetch per-project stats for a member */
async function getMemberProjectStats(memberId, projectIds) {
    if (projectIds.length === 0)
        return {};
    const db = getDb();
    const stats = {};
    const now = new Date();
    const nowMs = now.getTime();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    // Start of week (Monday)
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    const weekStartMs = weekStart.getTime();
    // 1. Fetch sessions for these projects in the last week
    const { data: sessions } = await db
        .from('sessions')
        .select('id, project_id, started_at, ended_at')
        .eq('user_id', memberId)
        .in('project_id', projectIds)
        .gte('started_at', weekStart.toISOString());
    // 2. Aggregate time
    const projectSessions = {};
    (sessions || []).forEach(s => {
        if (!s.project_id)
            return;
        if (!stats[s.project_id]) {
            stats[s.project_id] = { todaySeconds: 0, weeklySeconds: 0, activityPercent: 0, sampleCount: 0, totalActivity: 0 };
        }
        const sessStart = new Date(s.started_at).getTime();
        const sessEnd = s.ended_at ? new Date(s.ended_at).getTime() : nowMs;
        // Clip to current time (no future sessions)
        const cappedEnd = Math.min(sessEnd, nowMs);
        // Weekly duration: Intersection of [sessStart, cappedEnd] and [weekStartMs, nowMs]
        const weekDur = Math.max(0, cappedEnd - Math.max(sessStart, weekStartMs));
        stats[s.project_id].weeklySeconds += Math.round(weekDur / 1000);
        // Today's duration: Intersection of [sessStart, cappedEnd] and [todayStart, nowMs]
        const todayDur = Math.max(0, cappedEnd - Math.max(sessStart, todayStart));
        stats[s.project_id].todaySeconds += Math.round(todayDur / 1000);
    });
    // 3. Fetch activity samples for these sessions to get activity %
    const sessionIds = (sessions || []).map(s => s.id);
    if (sessionIds.length > 0) {
        const { data: activity } = await db
            .from('activity_samples')
            .select('session_id, idle, activity_percent')
            .in('session_id', sessionIds);
        (activity || []).forEach(a => {
            const sess = sessions?.find(s => s.id === a.session_id);
            if (!sess?.project_id)
                return;
            // Explicitly initialize if missing to appease TS
            if (!stats[sess.project_id]) {
                stats[sess.project_id] = { todaySeconds: 0, weeklySeconds: 0, activityPercent: 0, sampleCount: 0, totalActivity: 0 };
            }
            const pStats = stats[sess.project_id];
            pStats.sampleCount = (pStats.sampleCount || 0) + 1;
            pStats.totalActivity = (pStats.totalActivity || 0) + (a.activity_percent ?? (a.idle ? 0 : 100));
        });
    }
    // 4. Finalize averages
    Object.keys(stats).forEach(pid => {
        const p = stats[pid];
        p.activityPercent = p.sampleCount > 0 ? Math.round(p.totalActivity / p.sampleCount) : 0;
        delete p.sampleCount;
        delete p.totalActivity;
    });
    return stats;
}
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'DigiReps Ingestion API', version: '1.0.0', time: new Date().toISOString() });
});
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'DigiReps Ingestion API is running' });
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'DigiReps Ingestion API', version: '1.0.0', time: new Date().toISOString() });
});
// ─────────────────────────────────────────────────────────────────────────────
// AUTH ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, user: { id, email, full_name, role, ... }, projects[] }
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'email and password are required' });
        const db = getDb();
        // 1. Authenticate with Supabase Auth
        const { data: authData, error: authError } = await db.auth.signInWithPassword({ email, password });
        if (authError || !authData.session) {
            return res.status(401).json({ error: authError?.message || 'Invalid credentials' });
        }
        const token = authData.session.access_token;
        const authUserId = authData.user.id;
        // 2. Fetch member profile from our members table
        // We use the auth user's email to find the record since auth_user_id is not in schema anymore
        const { data: member, error: memberError } = await db
            .from('members')
            .select('*')
            .eq('email', email)
            .eq('status', 'Active')
            .single();
        if (memberError || !member) {
            return res.status(403).json({ error: 'Your account is not active or not found. Contact your admin.' });
        }
        if (!member.tracking_enabled) {
            return res.status(403).json({ error: 'Time tracking is disabled for your account.' });
        }
        // 3. Fetch projects assigned to this member
        const { data: assignments } = await db
            .from('project_members')
            .select('project_id, projects(id, name, description, color, status)')
            .eq('member_id', member.id);
        const projects = (assignments || [])
            .map((a) => a.projects)
            .filter((p) => p && p.status === 'Active');
        // 4. Fetch stats for these projects
        const projectIds = projects.map((p) => p.id);
        const projectStats = await getMemberProjectStats(member.id, projectIds);
        const projectsWithStats = projects.map((p) => ({
            ...p,
            stats: projectStats[p.id] || { todaySeconds: 0, weeklySeconds: 0, activityPercent: 0 }
        }));
        console.log(`✅ Login: ${email} — ${projects.length} project(s)`);
        res.json({
            token,
            user: {
                id: member.id,
                email: member.email,
                full_name: member.full_name,
                role: member.role,
                organization_id: member.organization_id,
                pay_rate: member.pay_rate,
                weekly_limit: member.weekly_limit,
                daily_limit: member.daily_limit,
            },
            projects: projectsWithStats,
        });
    }
    catch (e) {
        console.error('Login error:', e);
        res.status(500).json({ error: e.message || 'Internal server error' });
    }
});
/**
 * GET /api/auth/me
 * Returns current user's profile + projects (token in Authorization header)
 */
app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
        const authUser = req.authUser;
        const db = getDb();
        const { data: member } = await db.from('members').select('*').eq('email', authUser.email).single();
        if (!member)
            return res.status(404).json({ error: 'Member not found' });
        const { data: assignments } = await db
            .from('project_members')
            .select('project_id, projects(id, name, description, color, status)')
            .eq('member_id', member.id);
        const projects = (assignments || []).map((a) => a.projects).filter((p) => p?.status === 'Active');
        // Fetch stats
        const projectIds = projects.map((p) => p.id);
        const projectStats = await getMemberProjectStats(member.id, projectIds);
        const projectsWithStats = projects.map((p) => ({
            ...p,
            stats: projectStats[p.id] || { todaySeconds: 0, weeklySeconds: 0, activityPercent: 0 }
        }));
        res.json({ user: member, projects: projectsWithStats });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// MEMBERS ENDPOINTS (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/members — list all members with project counts and stats
 */
app.get('/api/members', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        // 1. Fetch members with project member counts
        const { data: membersData, error: memberError } = await db.from('members')
            .select('*, project_members(project_id)')
            .order('created_at', { ascending: false });
        if (memberError)
            throw memberError;
        // 2. Fetch session stats per user
        // Note: For large datasets, this should be a DB view or more optimized RPC
        const { data: sessionStats } = await db.rpc('get_member_stats');
        // If RPC doesn't exist yet, we'll do a fallback simple aggregation or keep it as is for now
        // but let's assume we want to solve it properly.
        // Since I can't easily create an RPC without sql tool, I'll do a slightly optimized fetch
        const { data: sessions } = await db.from('sessions').select('id, user_id, started_at, ended_at');
        const { data: activity } = await db.from('activity_samples').select('session_id, idle');
        const statsMap = {};
        const sessionToUser = {};
        (sessions || []).forEach(s => { sessionToUser[s.id] = s.user_id; });
        (sessions || []).forEach(s => {
            const uid = s.user_id;
            if (!statsMap[uid])
                statsMap[uid] = { min: 0, active: 0, total: 0, last: s.started_at, count: 0 };
            statsMap[uid].count++;
            const startMs = new Date(s.started_at).getTime();
            const endMs = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
            statsMap[uid].min += Math.max(0, Math.round((endMs - startMs) / 60000));
            if (s.started_at > (statsMap[uid].last || ''))
                statsMap[uid].last = s.started_at;
        });
        (activity || []).forEach(a => {
            const uid = sessionToUser[a.session_id];
            if (!uid || !statsMap[uid])
                return;
            statsMap[uid].total++;
            if (!a.idle)
                statsMap[uid].active++;
        });
        const members = (membersData || []).map((m) => {
            const stats = statsMap[m.id] || statsMap[m.email] || null;
            return {
                ...m,
                projectsCount: m.project_members?.length || 0,
                totalMinutes: stats?.min || 0,
                activityPercent: stats && stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0,
                lastSeen: stats?.last || null,
                sessionCount: stats?.count || 0,
                project_members: undefined
            };
        });
        res.json(members);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
/**
 * POST /api/members — admin invites a new member via Supabase email invite
 * Body: { email, role, pay_rate, bill_rate, weekly_limit, daily_limit }
 * Supabase sends an invite email; no temp password is generated.
 */
app.post('/api/members', requireAuth, async (req, res) => {
    try {
        const authUser = req.authUser;
        const orgId = req.organizationId;
        const { email, role = 'User', pay_rate, bill_rate, weekly_limit = 40, daily_limit = 8 } = req.body;
        if (!email)
            return res.status(400).json({ error: 'email is required' });
        if (!orgId)
            return res.status(403).json({ error: 'You must belong to an organization to invite members.' });
        const db = getDb();
        // 2. Check if a member row already exists for this email
        const { data: existingMember } = await db.from('members').select('id, status').eq('email', email).maybeSingle();
        if (existingMember && existingMember.status === 'Active') {
            return res.status(409).json({
                error: 'Member already exists',
                message: `This user is already ACTIVE. They should log in directly or use the "Forgot Password" link if they cannot access their account.`
            });
        }
        // 3. Generate invitation link and send via Resend
        const adminPortalUrl = process.env.ADMIN_PORTAL_URL || 'http://localhost:5174';
        const { data: inviteData, error: inviteError } = await db.auth.admin.generateLink({
            type: 'invite',
            email,
            options: {
                redirectTo: `${adminPortalUrl}/accept-invite`,
                data: { organization_id: orgId }
            }
        });
        if (inviteError) {
            console.warn(`⚠️ Supabase Auth Link Generation failed for ${email}: ${inviteError.message}`);
            return res.status(inviteError.status || 500).json({ error: inviteError.message });
        }
        const inviteLink = inviteData.properties.action_link;
        const authUserId = inviteData.user.id;
        // Send email via Resend
        try {
            await sendEmail({
                to: email,
                subject: 'You have been invited to join DigiReps',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 12px;">
                        <h2 style="color: #2563eb;">Welcome to DigiReps!</h2>
                        <p>You have been invited to join the platform as a <strong>${role}</strong>.</p>
                        <p>Please click the button below to set up your account and get started:</p>
                        <div style="margin: 30px 0;">
                            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                                Complete Setup
                            </a>
                        </div>
                        <p style="font-size: 12px; color: #666; margin-top: 30px;">
                            If the button doesn't work, copy and paste this link into your browser:<br>
                            <a href="${inviteLink}" style="color: #2563eb;">${inviteLink}</a>
                        </p>
                    </div>
                `
            });
        }
        catch (emailErr) {
            console.error('Failed to send Resend email:', emailErr);
            // We don't fail the whole request because the user IS created in Auth, 
            // but we should probably warn the user.
        }
        // 4. Create the member record in the DB
        const { data: newMember, error: insertError } = await db.from('members').insert([{
                id: uuidv4(),
                email,
                auth_user_id: authUserId,
                organization_id: orgId,
                role,
                pay_rate,
                bill_rate,
                weekly_limit,
                daily_limit,
                status: 'Pending'
            }]).select().single();
        if (insertError)
            throw insertError;
        console.log(`📧 Invite sent to: ${email}`);
        res.status(201).json({ member: newMember, invited: true });
    }
    catch (e) {
        console.error('Invite member error:', e);
        res.status(500).json({ error: e.message });
    }
});
/**
 * POST /api/members/complete-setup
 * Called by the AcceptInvite page after the user sets their password.
 * Body: { auth_user_id, full_name, phone? }
 * Activates the member account.
 */
app.post('/api/members/complete-setup', async (req, res) => {
    try {
        const { auth_user_id, full_name, phone } = req.body;
        // In this updated setup, the frontend should actually pass auth_user_id containing the UUID of the
        // Supabase Auth record, but we map to the member record via email or id if the UI passes it. 
        // For backwards compatibility, the UI currently passes `id` (or `authUserId`). We will assume the UI
        // continues to pass the auth_user_id, but the backend looks up by ID if possible.
        // Let's modify the frontend to send member_id shortly.
        if (!auth_user_id || !full_name) {
            return res.status(400).json({ error: 'auth_user_id and full_name are required' });
        }
        const db = getDb();
        // 1. Get the user's email from Supabase Auth to ensure we find the correct record
        const { data: { user }, error: authError } = await db.auth.admin.getUserById(auth_user_id);
        if (authError || !user) {
            console.error('Supabase Auth user not found:', authError);
            return res.status(404).json({ error: 'Auth user not found.' });
        }
        // 2. Update the member record using the email we just retrieved
        // We use maybeSingle() to avoid the "Cannot coerce" error if it doesn't exist yet
        const { data: existingMember, error: fetchErr } = await db
            .from('members')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();
        if (fetchErr)
            throw fetchErr;
        let member;
        if (!existingMember) {
            console.log(`⚠️ Member record missing for ${user.email}. Creating it now...`);
            // This might happen if the invite row failed to insert but the auth invite succeeded.
            // Recovering by creating a member record linked to the first organization found.
            const { data: orgs } = await db.from('organizations').select('id').limit(1);
            const fallbackOrgId = orgs?.[0]?.id;
            const { data: newMember, error: createErr } = await db
                .from('members')
                .insert([{
                    id: uuidv4(),
                    email: user.email,
                    full_name,
                    phone: phone || null,
                    auth_user_id: user.id,
                    organization_id: fallbackOrgId,
                    role: 'User',
                    status: 'Active'
                }])
                .select()
                .maybeSingle();
            if (createErr)
                throw createErr;
            member = newMember;
        }
        else {
            const { data: updatedMember, error: updateErr } = await db
                .from('members')
                .update({
                full_name,
                phone: phone || null,
                status: 'Active',
                auth_user_id: user.id
            })
                .eq('id', existingMember.id)
                .select()
                .maybeSingle();
            if (updateErr)
                throw updateErr;
            member = updatedMember;
        }
        if (!member)
            return res.status(404).json({ error: 'Failed to create or update member record.' });
        console.log(`✅ Member setup complete: ${full_name} (${member.email})`);
        res.json({ member });
    }
    catch (e) {
        console.error('Complete-setup error:', e);
        res.status(500).json({ error: e.message });
    }
});
/**
 * PUT /api/members/:id — update member profile
 */
app.put('/api/members/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, role, status, pay_rate, bill_rate, weekly_limit, daily_limit, tracking_enabled } = req.body;
        const { data, error } = await getDb().from('members').update({
            full_name, role, status, pay_rate, bill_rate, weekly_limit, daily_limit, tracking_enabled
        }).eq('id', id).select().single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
/**
 * DELETE /api/members/:id — remove a member
 */
app.delete('/api/members/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await getDb().from('members').delete().eq('id', id);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/projects — list all projects (admin view)
 */
app.get('/api/projects', requireAuth, async (req, res) => {
    try {
        const { status } = req.query;
        const db = getDb();
        let query = db.from('projects').select(`
            *,
            clients(id, name),
            project_members(member_id),
            project_teams(team_id),
            todos(id)
        `);
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw error;
        // Map data to include counts and flat client info
        const projects = (data || []).map((p) => ({
            ...p,
            client_name: p.clients?.name,
            memberCount: p.project_members?.length || 0,
            teamCount: p.project_teams?.length || 0,
            todoCount: p.todos?.length || 0,
            // Keep the raw arrays for detail views if needed
            memberIds: p.project_members?.map((pm) => pm.member_id) || [],
            teamIds: p.project_teams?.map((pt) => pt.team_id) || []
        }));
        res.json(projects);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
/**
 * POST /api/projects — admin creates a project
 * Body: { name, description, color, client_id, billable, budget_type, budget_limit, budget_notifications, member_ids, team_ids }
 */
app.post('/api/projects', requireAuth, async (req, res) => {
    try {
        const { name, description, color = '#3b82f6', client_id, billable = true, disable_activity = false, allow_tracking = true, disable_idle_time = false, budget_type = 'No budget', budget_limit, budget_notifications = true, member_limit, member_ids = [], team_ids = [] } = req.body;
        if (!name)
            return res.status(400).json({ error: 'name is required' });
        const db = getDb();
        const projectNames = name.split('\n').map((n) => n.trim()).filter((n) => n.length > 0);
        const createdProjects = [];
        for (const pName of projectNames) {
            // 1. Insert Project
            const { data: project, error: projectError } = await db.from('projects').insert([{
                    name: pName,
                    description,
                    color,
                    client_id,
                    organization_id: req.body.organization_id || null,
                    billable,
                    disable_activity,
                    allow_tracking,
                    disable_idle_time,
                    budget_type,
                    budget_limit,
                    budget_notifications,
                    member_limit
                }]).select().single();
            if (projectError)
                throw projectError;
            // 2. Insert Member Assignments
            if (member_ids.length > 0) {
                const memberRows = member_ids.map((mid) => ({ project_id: project.id, member_id: mid }));
                const { error: mErr } = await db.from('project_members').insert(memberRows);
                if (mErr)
                    throw mErr;
            }
            // 3. Insert Team Assignments
            if (team_ids.length > 0) {
                const teamRows = team_ids.map((tid) => ({ project_id: project.id, team_id: tid }));
                const { error: tErr } = await db.from('project_teams').insert(teamRows);
                if (tErr)
                    throw tErr;
            }
            createdProjects.push(project);
        }
        res.status(201).json(projectNames.length > 1 ? createdProjects : createdProjects[0]);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
/**
 * PUT /api/projects/:id — update project
 */
app.put('/api/projects/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const authUser = req.authUser;
        const { name, description, color, status, client_id, billable, disable_activity, allow_tracking, disable_idle_time, budget_type, budget_limit, budget_notifications, member_limit, member_ids, team_ids } = req.body;
        const db = getDb();
        // 1. Fetch the admin's profile to get their organization_id
        const { data: adminProfile, error: adminErr } = await db
            .from('members')
            .select('organization_id')
            .eq('email', authUser.email)
            .single();
        if (adminErr || !adminProfile?.organization_id) {
            return res.status(403).json({ error: 'You do not have permission to update projects.' });
        }
        const orgId = adminProfile.organization_id;
        const updateData = {
            name, description, color, status, client_id,
            billable, disable_activity, allow_tracking, disable_idle_time,
            budget_type, budget_limit, budget_notifications,
            member_limit // Fix: added to scope
        };
        // Remove undefined keys so they don't overwrite with nulls
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
        // 2. Update Project (ensure it belongs to the same org)
        const { data, error } = await db
            .from('projects')
            .update(updateData)
            .eq('id', id)
            .eq('organization_id', orgId)
            .select()
            .single();
        if (error)
            throw error;
        // 3. Update Member Assignments (if provided)
        if (member_ids !== undefined) {
            await db.from('project_members').delete().eq('project_id', id);
            if (member_ids.length > 0) {
                const rows = member_ids.map((mid) => ({ project_id: id, member_id: mid }));
                const { error: mErr } = await db.from('project_members').insert(rows);
                if (mErr)
                    throw mErr;
            }
        }
        // 3. Update Team Assignments (if provided)
        if (team_ids !== undefined) {
            await db.from('project_teams').delete().eq('project_id', id);
            if (team_ids.length > 0) {
                const rows = team_ids.map((tid) => ({ project_id: id, team_id: tid }));
                const { error: tErr } = await db.from('project_teams').insert(rows);
                if (tErr)
                    throw tErr;
            }
        }
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
/**
 * PUT /api/projects/:id/members — set member assignments for a project
 * Body: { member_ids: string[] }
 */
app.put('/api/projects/:id/members', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { member_ids = [] } = req.body;
        const db = getDb();
        // Replace all assignments for this project
        await db.from('project_members').delete().eq('project_id', id);
        if (member_ids.length > 0) {
            const rows = member_ids.map((mid) => ({ project_id: id, member_id: mid }));
            const { error } = await db.from('project_members').insert(rows);
            if (error)
                throw error;
        }
        res.json({ project_id: id, member_ids });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// SESSION ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/sessions', async (req, res) => {
    try {
        const { user_id, project_id } = req.body;
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }
        // Capture the real client IP for location tracking
        const ip_address = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.socket.remoteAddress
            || null;
        // We now use rpc_start_session which handles session_id and started_at generation
        // Fetch the member's organization_id so admins can see their activity
        const { data: member, error: memberErr } = await getDb()
            .from('members')
            .select('organization_id')
            .eq('id', user_id)
            .single();
        if (memberErr) {
            console.warn(`⚠️ Could not find organization for user ${user_id} during session creation: ${memberErr.message}`);
        }
        const organization_id = member?.organization_id || null;
        const { data, error } = await getDb().rpc('rpc_start_session', {
            p_user_id: user_id,
            p_project_id: project_id,
            p_organization_id: organization_id,
            p_ip_address: ip_address
        });
        if (error)
            throw error;
        const session_id = data.id;
        const started_at = data.started_at;
        console.log(`✅ Created session ${session_id} for user ${user_id} from IP ${ip_address}`);
        res.status(201).json({ session_id, started_at });
    }
    catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// ─────────────────────────────────────────
// End a tracking session
// POST /api/sessions/:id/end
// ─────────────────────────────────────────
app.post('/api/sessions/:id/end', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await getDb().rpc('rpc_stop_session', {
            p_session_id: id
        });
        if (error)
            throw error;
        console.log(`🏁 Session ${id} ended at ${data.ended_at}`);
        res.json({ session_id: id, ended_at: data.ended_at });
    }
    catch (error) {
        console.error('Error ending session:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// ─────────────────────────────────────────
// Upload a single screenshot
// POST /api/screenshot
// Body: { session_id, timestamp, base64 }
// ─────────────────────────────────────────
app.post('/api/screenshot', async (req, res) => {
    try {
        const { session_id, timestamp, base64 } = req.body;
        if (!session_id || !base64) {
            return res.status(400).json({ error: 'session_id and base64 are required' });
        }
        const context = await getSessionContext(session_id);
        if (!context) {
            console.warn(`⚠️ Could not find session context for ${session_id}`);
            return res.status(404).json({ error: 'Session not found' });
        }
        const { organizationId, userId } = context;
        const db = getDb();
        // Strip data URL prefix if present (e.g. "data:image/png;base64,...")
        const raw = base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(raw, 'base64');
        // New hierarchical path: org_id/user_id/screenshots/session_id/timestamp.png
        const filename = `${organizationId}/${userId}/screenshots/${session_id}/${Date.now()}.png`;
        // Upload to Supabase Storage bucket named 'screenshots'
        const { error: uploadError } = await db.storage
            .from('screenshots')
            .upload(filename, buffer, { contentType: 'image/png', upsert: false });
        if (uploadError) {
            console.error('📸 Screenshot storage upload error:', uploadError.message);
            return res.status(500).json({ error: uploadError.message });
        }
        // Get the public URL
        const { data: urlData } = db.storage
            .from('screenshots')
            .getPublicUrl(filename);
        // Save metadata row to screenshots table with full scoping
        const { error: dbError } = await db.from('screenshots').insert([{
                session_id,
                organization_id: organizationId,
                user_id: userId,
                recorded_at: timestamp || new Date().toISOString(),
                file_url: urlData.publicUrl,
            }]);
        if (dbError) {
            console.error('📸 Screenshot DB insert error:', dbError.message);
            return res.status(500).json({ error: 'Failed to save screenshot metadata: ' + dbError.message });
        }
        console.log(`📸 Screenshot saved: ${filename} → ${urlData.publicUrl}`);
        res.status(201).json({ success: true, file_url: urlData.publicUrl });
    }
    catch (error) {
        console.error('Screenshot endpoint error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Body: Array<{ session_id, timestamp, mouse_count, keyboard_count, app_name, window_title, idle_flag, file_url? }>
// ─────────────────────────────────────────
app.post('/api/heartbeats', async (req, res) => {
    try {
        const heartbeats = req.body;
        if (!Array.isArray(heartbeats) || heartbeats.length === 0) {
            return res.status(400).json({ error: 'Expected a non-empty array of heartbeats' });
        }
        // Separate activity samples from screenshot-only entries
        const activitySamples = heartbeats.filter(h => h.session_id && h.timestamp && !h.type);
        const screenshotSamples = heartbeats.filter(h => h.type === 'screenshot');
        // Look up session context once for the whole batch (assuming same session per batch)
        const context = await getSessionContext(heartbeats[0].session_id);
        if (!context) {
            console.warn(`⚠️ Could not find session context for heartbeat batch`);
            return res.status(404).json({ error: 'Session not found' });
        }
        const { organizationId, userId } = context;
        // ── Insert activity samples ──
        if (activitySamples.length > 0) {
            const rows = activitySamples.map(h => ({
                session_id: h.session_id,
                organization_id: organizationId,
                user_id: userId,
                recorded_at: h.timestamp,
                mouse_clicks: h.mouse_count ?? 0,
                key_presses: h.keyboard_count ?? 0,
                app_name: h.app_name ?? '',
                window_title: h.window_title ?? '',
                domain: h.domain ?? '',
                idle: h.idle_flag ?? false,
                activity_percent: calculateActivity(h.mouse_count, h.keyboard_count),
            }));
            const { error } = await getDb().from('activity_samples').insert(rows);
            if (error) {
                console.error('Error inserting activity samples:', error);
                // Don't throw — keep processing screenshots
            }
            else {
                console.log(`✅ Inserted ${rows.length} activity samples`);
            }
        }
        // ── Handle inline screenshots (base64 data URLs) ──
        const screenshotResults = [];
        for (const snap of screenshotSamples) {
            if (!snap.file_url || !snap.session_id)
                continue;
            try {
                const base64Data = snap.file_url.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                // New hierarchical path: org_id/user_id/screenshots/session_id/timestamp.png
                const filename = `${organizationId}/${userId}/screenshots/${snap.session_id}/${Date.now()}.png`;
                const { error: uploadError } = await getDb().storage
                    .from('screenshots')
                    .upload(filename, buffer, { contentType: 'image/png', upsert: false });
                if (uploadError) {
                    console.error('Screenshot upload error:', uploadError.message);
                    continue;
                }
                const { data: urlData } = getDb().storage
                    .from('screenshots')
                    .getPublicUrl(filename);
                // Save screenshot metadata to DB with full scoping
                const { error: dbError } = await getDb().from('screenshots').insert([{
                        session_id: snap.session_id,
                        organization_id: organizationId,
                        user_id: userId,
                        recorded_at: snap.timestamp || new Date().toISOString(),
                        file_url: urlData.publicUrl,
                    }]);
                if (dbError) {
                    console.error('Failed to process screenshot db sync:', dbError.message);
                    throw new Error('Screenshot DB sync failed: ' + dbError.message);
                }
                screenshotResults.push({ session_id: snap.session_id, url: urlData.publicUrl });
                console.log(`📸 Screenshot uploaded: ${filename}`);
            }
            catch (err) {
                console.error('Failed to process screenshot:', err);
            }
        }
        res.status(200).json({
            success: true,
            processed_activity: activitySamples.length,
            processed_screenshots: screenshotResults.length,
        });
    }
    catch (error) {
        console.error('Error processing heartbeats:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// The duplicate /api/screenshot block has been removed to avoid conflicting implementations.
// ─────────────────────────────────────────
// Get presigned upload URL for screenshot
// POST /api/screenshots/presign
// Body: { session_id, filename }
// ─────────────────────────────────────────
app.post('/api/screenshots/presign', async (req, res) => {
    try {
        const { session_id, filename } = req.body;
        if (!session_id || !filename) {
            return res.status(400).json({ error: 'session_id and filename are required' });
        }
        const context = await getSessionContext(session_id);
        if (!context) {
            return res.status(404).json({ error: 'Session not found' });
        }
        const { organizationId, userId } = context;
        // New hierarchical path: org_id/user_id/screenshots/session_id/filename
        const filePath = `${organizationId}/${userId}/screenshots/${session_id}/${filename}`;
        const { data, error } = await getDb().storage
            .from('screenshots')
            .createSignedUploadUrl(filePath);
        if (error)
            throw error;
        res.json({ upload_url: data.signedUrl, path: filePath });
    }
    catch (error) {
        console.error('Error creating presigned URL:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// ─────────────────────────────────────────
// Helper: Calculate activity percentage
// ─────────────────────────────────────────
function calculateActivity(mouseCount = 0, keyboardCount = 0) {
    const total = mouseCount + keyboardCount;
    // Cap at 100 — 50 total events (mouse + keyboard) per minute = 100% active
    // This is more realistic for mixed browsing/coding work
    return Math.min(100, Math.round((total / 50) * 100));
}
// ─────────────────────────────────────────
// Financials Module Endpoints
// ─────────────────────────────────────────
// --- Payments ---
app.post('/api/payments', async (req, res) => {
    try {
        const { member_id, amount, method, reference } = req.body;
        if (!member_id || !amount || !method)
            return res.status(400).json({ error: 'Missing required fields' });
        const { data, error } = await getDb().from('payments').insert([{
                member_id, amount, method, reference, status: 'Completed', paid_at: new Date().toISOString()
            }]).select().single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/payments', async (req, res) => {
    try {
        const { data, error } = await getDb().from('payments')
            .select('*, members(full_name)')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// --- Invoices ---
app.post('/api/invoices', async (req, res) => {
    try {
        const { client_id, amount, status, issue_date, due_date } = req.body;
        if (!client_id || !amount || !due_date)
            return res.status(400).json({ error: 'Missing required fields' });
        const { data, error } = await getDb().from('invoices').insert([{
                client_id, amount, status: status || 'Draft', issue_date, due_date, organization_id: req.body.organization_id || null
            }]).select().single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/invoices', async (req, res) => {
    try {
        // Assume clients table exists, or we drop the join for now. We will join clients(name) assuming it exists.
        const { data, error } = await getDb().from('invoices')
            .select('*, clients(name)')
            .order('created_at', { ascending: false });
        if (error) {
            // Fallback if clients join fails
            const { data: d2, error: e2 } = await getDb().from('invoices').select('*').order('created_at', { ascending: false });
            if (e2)
                throw e2;
            return res.json(d2);
        }
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.put('/api/invoices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { data, error } = await getDb().from('invoices').update(updates).eq('id', id).select().single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.delete('/api/invoices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await getDb().from('invoices').delete().eq('id', id);
        if (error)
            throw error;
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// --- Expenses ---
app.post('/api/expenses', async (req, res) => {
    try {
        const { member_id, project_id, amount, category, description, date } = req.body;
        if (!member_id || !amount || !category)
            return res.status(400).json({ error: 'Missing required fields' });
        const { data, error } = await getDb().from('expenses').insert([{
                member_id, project_id, amount, category, description, date, status: 'Pending'
            }]).select().single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/expenses', async (req, res) => {
    try {
        const { data, error } = await getDb().from('expenses')
            .select('*, members(full_name), projects(name)')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.put('/api/expenses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { data, error } = await getDb().from('expenses').update(updates).eq('id', id).select().single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await getDb().from('expenses').delete().eq('id', id);
        if (error)
            throw error;
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// TEAMS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/teams — list all teams with counts
 */
app.get('/api/teams', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        const { data, error } = await db.from('teams').select(`
            *,
            members:team_members(member_id)
        `).order('created_at', { ascending: false });
        if (error)
            throw error;
        const teams = (data || []).map((t) => ({
            ...t,
            member_count: t.members?.length || 0,
            memberIds: t.members?.map((m) => m.member_id) || []
        }));
        res.json(teams);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
/**
 * POST /api/teams — create a team
 */
app.post('/api/teams', requireAuth, async (req, res) => {
    try {
        const { name, description, manager_id, member_ids = [] } = req.body;
        if (!name)
            return res.status(400).json({ error: 'name is required' });
        const db = getDb();
        const { data: team, error } = await db.from('teams').insert([{
                name, description, manager_id, organization_id: req.body.organization_id || null
            }]).select().single();
        if (error)
            throw error;
        if (member_ids.length > 0) {
            const rows = member_ids.map((mid) => ({ team_id: team.id, member_id: mid }));
            await db.from('team_members').insert(rows);
        }
        res.status(201).json(team);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
/**
 * PUT /api/teams/:id — update team
 */
app.put('/api/teams/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, manager_id, member_ids } = req.body;
        const db = getDb();
        const { data, error } = await db.from('teams').update({
            name, description, manager_id
        }).eq('id', id).select().single();
        if (error)
            throw error;
        if (member_ids !== undefined) {
            await db.from('team_members').delete().eq('team_id', id);
            if (member_ids.length > 0) {
                const rows = member_ids.map((mid) => ({ team_id: id, member_id: mid }));
                await db.from('team_members').insert(rows);
            }
        }
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
/**
 * DELETE /api/teams/:id — delete team
 */
app.delete('/api/teams/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await getDb().from('teams').delete().eq('id', id);
        if (error)
            throw error;
        res.status(204).send();
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
/**
 * PUT /api/teams/:id/members — manage team members
 */
app.put('/api/teams/:id/members', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { member_ids = [] } = req.body;
        const db = getDb();
        await db.from('team_members').delete().eq('team_id', id);
        if (member_ids.length > 0) {
            const rows = member_ids.map((mid) => ({ team_id: id, member_id: mid }));
            const { error } = await db.from('team_members').insert(rows);
            if (error)
                throw error;
        }
        res.json({ success: true, member_ids });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
/**
 * POST /api/billing/create-checkout-session
 * Body: { planType, billingCycle, seatsCount }
 * Returns: { url }
 */
app.post('/api/billing/create-checkout-session', requireAuth, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(501).json({ error: 'Stripe integration is not configured' });
        }
        const orgId = req.organizationId;
        const authUser = req.authUser;
        const role = req.memberRole;
        if (!orgId) {
            return res.status(400).json({ error: 'User does not belong to an organization' });
        }
        if (role !== 'Admin') {
            return res.status(403).json({ error: 'Only administrators can manage billing.' });
        }
        const { billingCycle = 'Monthly', seatsCount = 5 } = req.body;
        const db = getDb();
        // 1. Fetch organization details
        const { data: org, error: orgError } = await db
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();
        if (orgError || !org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        let stripeCustomerId = org.stripe_customer_id;
        // 2. Create customer if not exists
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: authUser.email,
                name: org.name,
                metadata: {
                    organization_id: orgId
                }
            });
            stripeCustomerId = customer.id;
            // Save stripe_customer_id in organization
            await db
                .from('organizations')
                .update({ stripe_customer_id: stripeCustomerId })
                .eq('id', orgId);
        }
        // 3. Determine Price ID
        const priceId = billingCycle === 'Yearly'
            ? process.env.STRIPE_PRICE_PREMIUM_YEARLY
            : process.env.STRIPE_PRICE_PREMIUM_MONTHLY;
        if (!priceId) {
            return res.status(500).json({ error: 'Stripe Price ID is not configured in backend environment.' });
        }
        // 4. Create Checkout Session
        const adminPortalUrl = process.env.ADMIN_PORTAL_URL || 'http://localhost:5174';
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: seatsCount,
                },
            ],
            mode: 'subscription',
            success_url: `${adminPortalUrl}/dashboard/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${adminPortalUrl}/dashboard/settings/billing?success=false`,
            subscription_data: {
                metadata: {
                    organization_id: orgId,
                },
            },
        });
        res.json({ url: session.url });
    }
    catch (e) {
        console.error('🚨 Error creating checkout session:', e);
        res.status(500).json({ error: e.message });
    }
});
/**
 * POST /api/billing/create-portal-session
 * Returns: { url }
 */
app.post('/api/billing/create-portal-session', requireAuth, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(501).json({ error: 'Stripe integration is not configured' });
        }
        const orgId = req.organizationId;
        const role = req.memberRole;
        if (!orgId) {
            return res.status(400).json({ error: 'User does not belong to an organization' });
        }
        if (role !== 'Admin') {
            return res.status(403).json({ error: 'Only administrators can manage billing.' });
        }
        const db = getDb();
        const { data: org, error: orgError } = await db
            .from('organizations')
            .select('stripe_customer_id')
            .eq('id', orgId)
            .single();
        if (orgError || !org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        if (!org.stripe_customer_id) {
            return res.status(400).json({ error: 'This organization does not have an active Stripe customer profile.' });
        }
        const adminPortalUrl = process.env.ADMIN_PORTAL_URL || 'http://localhost:5174';
        const session = await stripe.billingPortal.sessions.create({
            customer: org.stripe_customer_id,
            return_url: `${adminPortalUrl}/dashboard/settings/billing`,
        });
        res.json({ url: session.url });
    }
    catch (e) {
        console.error('🚨 Error creating billing portal session:', e);
        res.status(500).json({ error: e.message });
    }
});
// Only listen locally. Vercel will use the exported app automatically.
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 DigiReps Ingestion API running on http://localhost:${PORT}`);
    });
}
export default app;
//# sourceMappingURL=index.js.map