import { useState, useEffect, useRef } from 'react';
import {
    Shield, ShieldCheck, ShieldOff, Loader2, Lock,
    CheckCircle2, Smartphone, AlertTriangle, Key, Copy, Check,
    Eye, EyeOff, KeyRound
} from 'lucide-react';
import { PageLayout, Modal } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

/* ─────────────────────────────────────────
   Tiny copy button helper
───────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            onClick={() => {
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg
                       bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted
                       hover:text-text-main transition-all"
        >
            {copied ? (
                <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</>
            ) : (
                <><Copy className="w-3.5 h-3.5" /> Copy key</>
            )}
        </button>
    );
}

/* ─────────────────────────────────────────
   Password field with show/hide toggle
───────────────────────────────────────── */
function PasswordField({
    id, label, value, onChange, placeholder, autoComplete
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoComplete?: string;
}) {
    const [show, setShow] = useState(false);
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block text-[12px] font-bold text-text-muted uppercase tracking-widest">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder ?? '••••••••'}
                    autoComplete={autoComplete}
                    required
                    className="w-full pr-10 px-4 py-2.5 rounded-xl bg-surface/50 border border-border
                               text-[13px] text-text-main placeholder:text-text-muted/40
                               focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10
                               transition-all"
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   Individual digit box for OTP input
───────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

    return (
        <div
            className="flex items-center justify-center gap-2 cursor-text"
            onClick={() => inputRef.current?.focus()}
        >
            <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={value}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
                className="absolute opacity-0 w-0 h-0"
                autoComplete="one-time-code"
            />
            {digits.map((d, i) => (
                <div
                    key={i}
                    className={`w-11 h-14 rounded-xl border-2 flex items-center justify-center
                                text-2xl font-bold font-mono transition-all
                                ${value.length === i
                                    ? 'border-primary bg-primary/5 shadow-[0_0_0_3px] shadow-primary/20'
                                    : d
                                        ? 'border-border bg-surface text-text-main'
                                        : 'border-border/60 bg-surface/40 text-transparent'
                                }`}
                >
                    {d || (value.length === i ? <span className="w-0.5 h-6 bg-primary animate-pulse rounded-full" /> : '')}
                </div>
            ))}
        </div>
    );
}

/* ─────────────────────────────────────────
   Password strength meter
───────────────────────────────────────── */
function PasswordStrength({ password }: { password: string }) {
    const checks = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password),
    ];
    const score = checks.filter(Boolean).length;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', 'bg-rose-500', 'bg-amber-400', 'bg-sky-400', 'bg-emerald-400'];
    const textColors = ['', 'text-rose-400', 'text-amber-400', 'text-sky-400', 'text-emerald-400'];

    if (!password) return null;

    return (
        <div className="space-y-1.5 pt-1">
            <div className="flex gap-1">
                {[1, 2, 3, 4].map(n => (
                    <div
                        key={n}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${n <= score ? colors[score] : 'bg-border'}`}
                    />
                ))}
            </div>
            <p className={`text-[11px] font-bold ${textColors[score]}`}>{labels[score]}</p>
        </div>
    );
}

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
export function SecurityPage() {
    const { refreshAal, session } = useAuth();

    // ── 2FA state ──
    const [factors, setFactors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mfaModalOpen, setMfaModalOpen] = useState(false);
    const [enrollData, setEnrollData] = useState<any>(null);
    const [mfaCode, setMfaCode] = useState('');
    const [mfaError, setMfaError] = useState('');
    const [mfaActionLoading, setMfaActionLoading] = useState(false);
    const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);

    // ── Password state ──
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwSuccess, setPwSuccess] = useState('');

    // ── Global toasts ──
    const [successMsg, setSuccessMsg] = useState('');

    const fetchFactors = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) throw error;
            setFactors(data.all || []);
        } catch (err) {
            console.error('Failed to load MFA factors:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => { fetchFactors(); }, []);

    const isMfaEnabled = factors.some(f => f.factor_type === 'totp' && f.status === 'verified');
    
    // Determine if the user is using ONLY an OAuth provider (like Google) and no email/password
    const providers = session?.user?.app_metadata?.providers || [];
    const isOAuthOnly = providers.includes('google') && !providers.includes('email');

    /* ── 2FA handlers ── */
    const handleOpenMfaSetup = async () => {
        setMfaModalOpen(true);
        setMfaActionLoading(true);
        setMfaError('');
        setEnrollData(null);
        setMfaCode('');
        try {
            const { data: factorList, error: listError } = await supabase.auth.mfa.listFactors();
            if (listError) throw listError;
            for (const factor of factorList?.all ?? []) {
                if (factor.status === 'unverified') {
                    await supabase.auth.mfa.unenroll({ factorId: factor.id });
                }
            }
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                issuer: 'TrackOwl',
                friendlyName: 'Admin Portal User',
            });
            if (error) throw error;
            setEnrollData(data);
        } catch (err: any) {
            setMfaError(err.message || 'Failed to start 2FA enrollment.');
        } finally {
            setMfaActionLoading(false);
        }
    };

    const handleVerifyEnrollment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mfaCode.length !== 6) { setMfaError('Enter all 6 digits.'); return; }
        setMfaActionLoading(true);
        setMfaError('');
        try {
            const { data: ch, error: ce } = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
            if (ce) throw ce;
            const { error: ve } = await supabase.auth.mfa.verify({
                factorId: enrollData.id, challengeId: ch.id, code: mfaCode,
            });
            if (ve) throw ve;
            await refreshAal();
            await fetchFactors(true);
            setMfaModalOpen(false);
            setSuccessMsg('Two-factor authentication is now active on your account.');
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (err: any) {
            setMfaError(err.message || 'Incorrect code. Please try again.');
        } finally {
            setMfaActionLoading(false);
        }
    };

    const handleDisableMfa = async () => {
        setMfaActionLoading(true);
        setMfaError('');
        try {
            const f = factors.find(f => f.factor_type === 'totp' && f.status === 'verified');
            if (!f) throw new Error('No verified 2FA factor found.');
            const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
            if (error) throw error;
            await refreshAal();
            await fetchFactors(true);
            setDisableConfirmOpen(false);
            setSuccessMsg('Two-factor authentication has been disabled.');
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (err: any) {
            setMfaError(err.message || 'Failed to disable 2FA.');
        } finally {
            setMfaActionLoading(false);
        }
    };

    /* ── Password change handler ── */
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwError('');
        setPwSuccess('');

        if (newPw.length < 8) {
            setPwError('New password must be at least 8 characters.');
            return;
        }
        if (newPw !== confirmPw) {
            setPwError('New passwords do not match.');
            return;
        }

        setPwLoading(true);
        try {
            // Get current user to know their email
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user?.email) throw new Error('Unable to verify current session.');

            // Re-authenticate with current password using a temporary client 
            // so we don't overwrite the global session and trigger an MFA downgrade redirect
            const tempClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false } }
            );

            const { error: signInError } = await tempClient.auth.signInWithPassword({
                email: user.email,
                password: currentPw,
            });
            if (signInError) throw new Error('Current password is incorrect.');

            // Now update the password
            const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
            if (updateError) throw updateError;

            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
            setPwSuccess('Password updated successfully.');
            setTimeout(() => setPwSuccess(''), 5000);
        } catch (err: any) {
            setPwError(err.message || 'Failed to update password.');
        } finally {
            setPwLoading(false);
        }
    };

    /* ── Loading state ── */
    if (loading) {
        return (
            <PageLayout title="Security Settings" description="Manage your account protection." maxWidth="full">
                <div className="h-[40vh] flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-7 h-7 text-primary animate-spin" />
                    <p className="text-[11px] font-bold tracking-widest text-text-muted uppercase">Loading…</p>
                </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout
            maxWidth="full"
            eyebrow="ACCOUNT SECURITY"
            title="Security Settings"
            description="Manage your account protection and sign-in credentials."
        >
            <div className="max-w-2xl space-y-5 pb-20">

                {/* ── Global success toast ── */}
                {successMsg && (
                    <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{successMsg}</p>
                    </div>
                )}

                {/* ════════════════════════
                    2FA Card
                ════════════════════════ */}
                <div className="glass-panel border border-border rounded-[2rem] overflow-hidden shadow-premium">

                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 border-b border-border/50 bg-surface-solid/30">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 transition-colors shadow-sm
                                ${isMfaEnabled
                                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                                    : 'bg-surface border-border text-text-muted'
                                }`}>
                                {isMfaEnabled ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="text-[15px] font-bold text-text-main leading-tight">Two-Factor Authentication</p>
                                <p className="text-[13px] text-text-muted mt-1">TOTP · RFC 6238 · Authenticator App</p>
                            </div>
                        </div>
                        {isMfaEnabled ? (
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full
                                            bg-emerald-500/10 border border-emerald-500/25
                                            text-emerald-400 text-[11px] font-bold uppercase tracking-widest shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full
                                            bg-white/5 border border-white/10
                                            text-text-muted text-[11px] font-bold uppercase tracking-widest shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                Disabled
                            </span>
                        )}
                    </div>

                    {/* Body */}
                    <div className="px-8 py-6 space-y-5 relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                        <p className="text-[14px] text-text-muted leading-relaxed relative">
                            Adds a time-based one-time code from your phone as a second step during sign-in,
                            so even a stolen password can't unlock your account.
                        </p>
                        <div className="flex flex-wrap gap-2.5 relative">
                            {[
                                { icon: Shield, label: 'Phishing resistant' },
                                { icon: Smartphone, label: 'Works offline' },
                                { icon: Key, label: 'Industry standard' },
                            ].map(({ icon: Icon, label }) => (
                                <span key={label}
                                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                                               bg-surface border border-border shadow-sm
                                               text-text-main text-[12px] font-semibold">
                                    <Icon className="w-4 h-4 text-primary" />
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 border-t border-border/50 flex items-center justify-between gap-4 bg-surface-solid/50">
                        <p className="text-[13px] text-text-muted font-medium">
                            {isMfaEnabled
                                ? '🔒 Your account has an extra layer of protection.'
                                : 'Your account currently has no secondary authentication.'}
                        </p>
                        {isMfaEnabled ? (
                            <button
                                onClick={() => setDisableConfirmOpen(true)}
                                disabled={mfaActionLoading}
                                className="shrink-0 h-10 px-6 rounded-xl bg-rose-500/10 border border-rose-500/20
                                           text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500
                                           transition-all text-[13px] font-bold flex items-center gap-2 disabled:opacity-50"
                            >
                                <ShieldOff className="w-4 h-4" />
                                Disable 2FA
                            </button>
                        ) : (
                            <button
                                onClick={handleOpenMfaSetup}
                                disabled={mfaActionLoading}
                                className="shrink-0 h-10 px-6 rounded-xl bg-primary text-white
                                           hover:brightness-110 active:scale-[0.98] transition-all text-[13px] font-bold
                                           flex items-center gap-2 disabled:opacity-50 shadow-glow-primary"
                            >
                                {mfaActionLoading
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Lock className="w-4 h-4" />}
                                Set Up 2FA
                            </button>
                        )}
                    </div>
                </div>

                {/* ════════════════════════
                    Change Password Card
                ════════════════════════ */}
                <div className="glass-panel border border-border rounded-[2rem] overflow-hidden shadow-premium">

                    {/* Header */}
                    <div className="flex items-center gap-4 px-8 py-6 border-b border-border/50 bg-surface-solid/30">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-surface border-border text-text-muted shrink-0 shadow-sm">
                            <KeyRound className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[15px] font-bold text-text-main leading-tight">Change Password</p>
                            <p className="text-[13px] text-text-muted mt-1">Update your account login credentials</p>
                        </div>
                    </div>

                    {/* Form or OAuth Message */}
                    {isOAuthOnly ? (
                        <div className="px-8 py-12 flex flex-col items-center justify-center text-center space-y-5">
                            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2 shadow-glow-primary">
                                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[16px] font-bold text-text-main">Connected with Google</p>
                                <p className="text-[14px] text-text-muted leading-relaxed max-w-sm mx-auto">
                                    Your account uses Google for authentication. You do not have a separate password for TrackOwl. Please manage your login credentials through your Google Account.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleChangePassword} className="px-8 py-8 space-y-6">

                            {/* Success */}
                            {pwSuccess && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl
                                                bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[13px] font-medium">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    {pwSuccess}
                                </div>
                            )}

                            {/* Error */}
                            {pwError && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl
                                                bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[13px] font-medium">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    {pwError}
                                </div>
                            )}

                            <PasswordField
                                id="current-password"
                                label="Current Password"
                                value={currentPw}
                                onChange={setCurrentPw}
                                placeholder="Enter your current password"
                                autoComplete="current-password"
                            />

                            <div className="space-y-1.5">
                                <PasswordField
                                    id="new-password"
                                    label="New Password"
                                    value={newPw}
                                    onChange={setNewPw}
                                    placeholder="At least 8 characters"
                                    autoComplete="new-password"
                                />
                                <PasswordStrength password={newPw} />
                            </div>

                            <PasswordField
                                id="confirm-password"
                                label="Confirm New Password"
                                value={confirmPw}
                                onChange={setConfirmPw}
                                placeholder="Re-enter new password"
                                autoComplete="new-password"
                            />

                            {/* Hint: mismatch */}
                            {confirmPw && newPw !== confirmPw && (
                                <p className="text-[11px] text-rose-400 font-medium">Passwords don't match</p>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                                    className="h-11 px-8 rounded-xl bg-primary text-white text-[13px] font-bold
                                               hover:brightness-110 active:scale-[0.98] transition-all
                                               disabled:opacity-40 disabled:cursor-not-allowed
                                               flex items-center gap-2.5 shadow-glow-primary ml-auto"
                                >
                                    {pwLoading
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Lock className="w-4 h-4" />}
                                    Update Password
                                </button>
                            </div>
                        </form>
                    )}
                </div>

            </div>

            {/* ══════════════════════════════════════════════════
                MODAL — Set up 2FA
            ══════════════════════════════════════════════════ */}
            <Modal
                isOpen={mfaModalOpen}
                onClose={() => !mfaActionLoading && setMfaModalOpen(false)}
                title="Secure Your Account"
                maxWidth="max-w-md"
            >
                <form onSubmit={handleVerifyEnrollment}>
                    <div className="space-y-8">
                        {mfaError && (
                            <div className="flex items-center gap-3 p-4 rounded-xl
                                            bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px] font-medium shadow-sm">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                {mfaError}
                            </div>
                        )}

                        {enrollData ? (
                            <div className="flex flex-col items-center gap-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-bold text-text-main">Set Up 2FA</h3>
                                    <p className="text-[13px] text-text-muted leading-relaxed max-w-sm">
                                        Scan this QR code with <strong className="text-text-main font-semibold">Google Authenticator</strong>, Authy, or any TOTP app to generate secure codes.
                                    </p>
                                </div>
                                
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity" />
                                    <div className="relative p-4 bg-white rounded-[2rem] shadow-premium border-[6px] border-white/50 backdrop-blur-xl">
                                        <img src={enrollData.totp.qr_code} alt="2FA QR Code" className="w-44 h-44 block rounded-xl" />
                                    </div>
                                </div>
                                
                                <div className="w-full rounded-2xl border border-border glass-panel overflow-hidden shadow-shell-sm mt-2">
                                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-solid/50">
                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            Manual Setup Key
                                        </span>
                                        <CopyButton text={enrollData.totp.secret} />
                                    </div>
                                    <div className="px-4 py-3 bg-surface/30">
                                        <code className="block text-[12px] font-mono text-text-main font-medium
                                                         tracking-[0.2em] break-all text-center select-all cursor-text">
                                            {enrollData.totp.secret}
                                        </code>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-4 py-16 h-[400px]">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                                    <Loader2 className="w-10 h-10 text-primary animate-spin relative" />
                                </div>
                                <span className="text-[11px] font-bold tracking-widest text-text-muted uppercase">
                                    Generating Secure Key…
                                </span>
                            </div>
                        )}

                        <div className="relative flex items-center justify-center">
                            <span className="absolute w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                            <span className="relative bg-surface px-4 text-[10px] font-black tracking-widest text-text-muted uppercase rounded-full border border-border shadow-sm py-1">
                                Verification
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <OtpInput value={mfaCode} onChange={setMfaCode} />
                            </div>
                            <p className="text-[12px] text-text-muted text-center max-w-xs mx-auto">
                                Enter the 6-digit verification code generated by your authenticator app
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                disabled={mfaActionLoading}
                                onClick={() => setMfaModalOpen(false)}
                                className="flex-1 h-12 rounded-2xl border border-border bg-surface-hover text-text-main font-bold text-[13px] hover:bg-surface-solid active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={mfaActionLoading || mfaCode.length !== 6 || !enrollData}
                                className="flex-[2] h-12 rounded-2xl bg-primary text-white font-bold text-[13px] shadow-glow-primary hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {mfaActionLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ShieldCheck className="w-4 h-4" />
                                )}
                                Verify & Enable 2FA
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* ══════════════════════════════════════════════════
                MODAL — Confirm disable 2FA
            ══════════════════════════════════════════════════ */}
            <Modal
                isOpen={disableConfirmOpen}
                onClose={() => !mfaActionLoading && setDisableConfirmOpen(false)}
                title="Disable 2FA?"
                maxWidth="max-w-sm"
            >
                <div className="space-y-5">
                    <div className="flex gap-3.5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-amber-300">This reduces your account security</p>
                            <p className="text-[12px] text-amber-300/70 leading-relaxed">
                                Anyone with your password will be able to access your account without a second check.
                            </p>
                        </div>
                    </div>
                    {mfaError && (
                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px]">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {mfaError}
                        </div>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setDisableConfirmOpen(false)}
                            disabled={mfaActionLoading}
                            className="flex-1 h-12 rounded-2xl border border-border bg-surface-hover text-text-main font-bold text-[13px] hover:bg-surface-solid active:scale-[0.98] transition-all flex items-center justify-center"
                        >
                            Keep 2FA
                        </button>
                        <button
                            type="button"
                            onClick={handleDisableMfa}
                            disabled={mfaActionLoading}
                            className="flex-[2] h-12 rounded-2xl bg-rose-600/90 text-white font-bold text-[13px] hover:bg-rose-500 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_4px_20px_-4px_rgba(225,29,72,0.4)] hover:shadow-[0_4px_25px_-2px_rgba(225,29,72,0.5)]"
                        >
                            {mfaActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                            Disable 2FA
                        </button>
                    </div>
                </div>
            </Modal>
        </PageLayout>
    );
}
