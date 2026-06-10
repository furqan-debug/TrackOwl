import { useState, useEffect, useRef } from 'react';
import {
    Shield, ShieldCheck, ShieldOff, Loader2, Lock,
    ArrowLeft, CheckCircle2, Smartphone, AlertTriangle, Key, Copy, Check,
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
    const { refreshAal } = useAuth();

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
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-shell-sm">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                        <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-colors
                                ${isMfaEnabled
                                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                                    : 'bg-surface border-border text-text-muted'
                                }`}>
                                {isMfaEnabled ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="text-[14px] font-bold text-text-main leading-tight">Two-Factor Authentication</p>
                                <p className="text-[12px] text-text-muted mt-0.5">TOTP · RFC 6238 · Authenticator App</p>
                            </div>
                        </div>
                        {isMfaEnabled ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                            bg-emerald-500/10 border border-emerald-500/25
                                            text-emerald-400 text-[10px] font-bold uppercase tracking-widest shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                            bg-white/5 border border-white/10
                                            text-text-muted text-[10px] font-bold uppercase tracking-widest shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                Disabled
                            </span>
                        )}
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5 space-y-4">
                        <p className="text-[13px] text-text-muted leading-relaxed">
                            Adds a time-based one-time code from your phone as a second step during sign-in,
                            so even a stolen password can't unlock your account.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { icon: Shield, label: 'Phishing resistant' },
                                { icon: Smartphone, label: 'Works offline' },
                                { icon: Key, label: 'Industry standard' },
                            ].map(({ icon: Icon, label }) => (
                                <span key={label}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                               bg-white/[0.04] border border-white/8
                                               text-text-muted text-[12px] font-semibold">
                                    <Icon className="w-3.5 h-3.5 text-primary/60" />
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-4 bg-white/[0.015]">
                        <p className="text-[12px] text-text-muted">
                            {isMfaEnabled
                                ? '🔒 Your account has an extra layer of protection.'
                                : 'Your account currently has no secondary authentication.'}
                        </p>
                        {isMfaEnabled ? (
                            <button
                                onClick={() => setDisableConfirmOpen(true)}
                                disabled={mfaActionLoading}
                                className="shrink-0 h-9 px-5 rounded-xl bg-rose-500/10 border border-rose-500/20
                                           text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500
                                           transition-all text-[12px] font-bold flex items-center gap-2 disabled:opacity-50"
                            >
                                <ShieldOff className="w-4 h-4" />
                                Disable 2FA
                            </button>
                        ) : (
                            <button
                                onClick={handleOpenMfaSetup}
                                disabled={mfaActionLoading}
                                className="shrink-0 h-9 px-5 rounded-xl bg-primary text-white
                                           hover:brightness-110 transition-all text-[12px] font-bold
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
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-shell-sm">

                    {/* Header */}
                    <div className="flex items-center gap-3.5 px-6 py-5 border-b border-border">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-surface border-border text-text-muted shrink-0">
                            <KeyRound className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[14px] font-bold text-text-main leading-tight">Change Password</p>
                            <p className="text-[12px] text-text-muted mt-0.5">Update your account login credentials</p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleChangePassword} className="px-6 py-6 space-y-4">

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
                                className="h-10 px-6 rounded-xl bg-primary text-white text-[12px] font-bold
                                           hover:brightness-110 active:scale-[0.98] transition-all
                                           disabled:opacity-40 disabled:cursor-not-allowed
                                           flex items-center gap-2 shadow-glow-primary"
                            >
                                {pwLoading
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Lock className="w-4 h-4" />}
                                Update Password
                            </button>
                        </div>
                    </form>
                </div>

            </div>

            {/* ══════════════════════════════════════════════════
                MODAL — Set up 2FA
            ══════════════════════════════════════════════════ */}
            <Modal
                isOpen={mfaModalOpen}
                onClose={() => !mfaActionLoading && setMfaModalOpen(false)}
                title="Set Up 2FA"
                maxWidth="max-w-sm"
            >
                <form onSubmit={handleVerifyEnrollment}>
                    <div className="space-y-6">
                        {mfaError && (
                            <div className="flex items-center gap-3 p-3.5 rounded-xl
                                            bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px] font-medium">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                {mfaError}
                            </div>
                        )}

                        {enrollData ? (
                            <div className="flex flex-col items-center gap-4">
                                <p className="text-[13px] text-text-muted text-center leading-relaxed">
                                    Scan with <strong className="text-text-main font-semibold">Google Authenticator</strong>,
                                    Authy, or any TOTP app.
                                </p>
                                <div className="p-3 bg-white rounded-2xl shadow-md border border-border">
                                    <img src={enrollData.totp.qr_code} alt="2FA QR Code" className="w-40 h-40 block" />
                                </div>
                                <div className="w-full rounded-xl border border-border bg-white/[0.03] overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                                            Manual key
                                        </span>
                                        <CopyButton text={enrollData.totp.secret} />
                                    </div>
                                    <code className="block px-3 py-2.5 text-[11px] font-mono text-text-muted
                                                     tracking-widest break-all text-center select-all">
                                        {enrollData.totp.secret}
                                    </code>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 py-10">
                                <Loader2 className="w-7 h-7 text-primary animate-spin" />
                                <span className="text-[11px] font-bold tracking-widest text-text-muted uppercase">
                                    Generating QR code…
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <span className="flex-1 h-px bg-border" />
                            <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase">
                                Then enter the code
                            </span>
                            <span className="flex-1 h-px bg-border" />
                        </div>

                        <div className="space-y-2">
                            <OtpInput value={mfaCode} onChange={setMfaCode} />
                            <p className="text-[11px] text-text-muted text-center">
                                Enter the 6-digit code shown in your authenticator app
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 pt-1">
                            <button
                                type="submit"
                                disabled={mfaActionLoading || mfaCode.length !== 6 || !enrollData}
                                className="h-11 rounded-xl bg-primary text-white font-bold text-[13px]
                                           shadow-glow-primary hover:brightness-110 active:scale-[0.98]
                                           transition-all disabled:opacity-40 disabled:cursor-not-allowed
                                           flex items-center justify-center gap-2"
                            >
                                {mfaActionLoading
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <ShieldCheck className="w-4 h-4" />}
                                Verify & Enable 2FA
                            </button>
                            <button
                                type="button"
                                disabled={mfaActionLoading}
                                onClick={() => setMfaModalOpen(false)}
                                className="h-9 rounded-xl text-text-muted font-semibold text-[12px]
                                           hover:text-text-main transition-colors flex items-center justify-center gap-1.5"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Cancel
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
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleDisableMfa}
                            disabled={mfaActionLoading}
                            className="h-11 rounded-xl bg-rose-600 text-white font-bold text-[13px]
                                       hover:bg-rose-500 active:scale-[0.98] transition-all
                                       disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {mfaActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                            Yes, Disable 2FA
                        </button>
                        <button
                            disabled={mfaActionLoading}
                            onClick={() => setDisableConfirmOpen(false)}
                            className="h-9 rounded-xl text-text-muted font-semibold text-[12px] hover:text-text-main transition-colors"
                        >
                            Keep 2FA Enabled
                        </button>
                    </div>
                </div>
            </Modal>
        </PageLayout>
    );
}
