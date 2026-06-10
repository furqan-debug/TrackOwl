import { useState, useEffect, useRef } from 'react';
import {
    Shield, ShieldCheck, ShieldOff, Loader2, Lock,
    CheckCircle2, Smartphone, AlertTriangle, Key, Copy, Check,
    Eye, EyeOff, KeyRound
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Modal } from '../../components/Layout/Modal';

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
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                       bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600
                       hover:text-slate-900 transition-all"
        >
            {copied ? (
                <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copied</>
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
            <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
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
                    className="w-full pr-10 px-4 py-2.5 rounded-xl bg-white border border-slate-300
                               text-sm text-slate-900 placeholder:text-slate-400
                               focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                               transition-all shadow-sm"
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
                    className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center
                                text-2xl font-bold font-mono transition-all
                                ${value.length === i
                                    ? 'border-primary bg-primary/5 shadow-[0_0_0_3px] shadow-primary/20'
                                    : d
                                        ? 'border-slate-300 bg-white text-slate-900'
                                        : 'border-slate-200 bg-slate-50 text-transparent'
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
    const colors = ['', 'bg-red-500', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'];
    const textColors = ['', 'text-red-600', 'text-amber-600', 'text-blue-600', 'text-emerald-600'];

    if (!password) return null;

    return (
        <div className="space-y-1.5 pt-1">
            <div className="flex gap-1">
                {[1, 2, 3, 4].map(n => (
                    <div
                        key={n}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${n <= score ? colors[score] : 'bg-slate-200'}`}
                    />
                ))}
            </div>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${textColors[score]}`}>{labels[score]}</p>
        </div>
    );
}

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
export function Settings() {
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
    const [disableCode, setDisableCode] = useState('');

    // ── Password state ──
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwSuccess, setPwSuccess] = useState('');
    const [pwConfirmOpen, setPwConfirmOpen] = useState(false);
    const [pwCode, setPwCode] = useState('');
    const [pwMfaError, setPwMfaError] = useState('');
    const [pwActionLoading, setPwActionLoading] = useState(false);

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
                issuer: 'TrackOwl Management',
                friendlyName: 'Super Admin',
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

    const handleDisableMfa = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (disableCode.length !== 6) {
            setMfaError('Please enter the 6-digit code to disable 2FA.');
            return;
        }

        setMfaActionLoading(true);
        setMfaError('');
        try {
            const f = factors.find(f => f.factor_type === 'totp' && f.status === 'verified');
            if (!f) throw new Error('No verified 2FA factor found.');

            // Verify code before disabling
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: f.id });
            if (challengeError) throw challengeError;

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: f.id,
                challengeId: challengeData.id,
                code: disableCode,
            });
            if (verifyError) throw verifyError;

            // Once verified, proceed to unenroll
            const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
            if (error) throw error;

            await refreshAal();
            await fetchFactors(true);
            setDisableConfirmOpen(false);
            setDisableCode('');
            setSuccessMsg('Two-factor authentication has been disabled.');
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (err: any) {
            setMfaError(err.message || 'Incorrect code or failed to disable 2FA.');
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

            // Now update the password using the main authenticated client
            if (!isMfaEnabled) {
                const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
                if (updateError) throw updateError;
                
                setCurrentPw('');
                setNewPw('');
                setConfirmPw('');
                setPwSuccess('Password updated successfully.');
                setTimeout(() => setPwSuccess(''), 5000);
            } else {
                // If MFA enabled, open confirmation modal to ask for 2FA code
                setPwConfirmOpen(true);
            }
        } catch (err: any) {
            setPwError(err.message || 'Failed to update password.');
        } finally {
            setPwLoading(false);
        }
    };

    const handleConfirmUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pwCode.length !== 6) {
            setPwMfaError('Please enter the 6-digit code.');
            return;
        }

        setPwActionLoading(true);
        setPwMfaError('');
        try {
            const f = factors.find(f => f.factor_type === 'totp' && f.status === 'verified');
            if (!f) throw new Error('No verified 2FA factor found.');

            // Verify code before allowing password update
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: f.id });
            if (challengeError) throw challengeError;

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: f.id,
                challengeId: challengeData.id,
                code: pwCode,
            });
            if (verifyError) throw verifyError;

            // Once verified, proceed to update password
            const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
            if (updateError) throw updateError;

            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
            setPwCode('');
            setPwConfirmOpen(false);
            setPwSuccess('Password updated successfully.');
            setTimeout(() => setPwSuccess(''), 5000);
        } catch (err: any) {
            setPwMfaError(err.message || 'Incorrect code or failed to update password.');
        } finally {
            setPwActionLoading(false);
        }
    };

    /* ── Loading state ── */
    if (loading) {
        return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center h-[50vh] gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-semibold text-slate-500">Loading security settings...</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Security Settings</h1>
                <p className="text-slate-500 mt-1">Manage your account protection and sign-in credentials.</p>
            </div>

            {/* ── Global success toast ── */}
            {successMsg && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 animate-in fade-in zoom-in-95 duration-200">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{successMsg}</p>
                </div>
            )}

            {/* ════════════════════════
                2FA Card
            ════════════════════════ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors
                            ${isMfaEnabled
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                            {isMfaEnabled ? <ShieldCheck className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                        </div>
                        <div>
                            <p className="text-base font-bold text-slate-900">Two-Factor Authentication</p>
                            <p className="text-sm text-slate-500 mt-0.5">TOTP · Authenticator App</p>
                        </div>
                    </div>
                    {isMfaEnabled ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                        bg-emerald-50 border border-emerald-200
                                        text-emerald-700 text-xs font-bold uppercase tracking-wider shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                        bg-slate-50 border border-slate-200
                                        text-slate-500 text-xs font-bold uppercase tracking-wider shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            Disabled
                        </span>
                    )}
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-5">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Adds a time-based one-time code from your phone as a second step during sign-in,
                        so even a stolen password can't unlock your account.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {[
                            { icon: Shield, label: 'Phishing resistant' },
                            { icon: Smartphone, label: 'Works offline' },
                            { icon: Key, label: 'Industry standard' },
                        ].map(({ icon: Icon, label }) => (
                            <span key={label}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
                                           bg-slate-50 border border-slate-200
                                           text-slate-600 text-xs font-semibold">
                                <Icon className="w-3.5 h-3.5 text-primary" />
                                {label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-500 font-medium">
                        {isMfaEnabled
                            ? '🔒 Your account is secured.'
                            : 'We highly recommend enabling 2FA.'}
                    </p>
                    {isMfaEnabled ? (
                        <button
                            onClick={() => setDisableConfirmOpen(true)}
                            disabled={mfaActionLoading}
                            className="h-10 px-5 rounded-xl bg-white border border-red-200
                                       text-red-600 hover:bg-red-50 active:bg-red-100
                                       transition-colors text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                        >
                            <ShieldOff className="w-4 h-4" />
                            Disable 2FA
                        </button>
                    ) : (
                        <button
                            onClick={handleOpenMfaSetup}
                            disabled={mfaActionLoading}
                            className="h-10 px-5 rounded-xl bg-primary text-white
                                       hover:bg-primary-hover active:bg-primary/90 transition-colors text-sm font-bold
                                       flex items-center gap-2 disabled:opacity-50 shadow-sm"
                        >
                            {mfaActionLoading
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Lock className="w-4 h-4" />}
                            Enable 2FA
                        </button>
                    )}
                </div>
            </div>

            {/* ════════════════════════
                Change Password Card
            ════════════════════════ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 shrink-0">
                        <KeyRound className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-base font-bold text-slate-900">Change Password</p>
                        <p className="text-sm text-slate-500 mt-0.5">Update your cryptographic key</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleChangePassword} className="px-6 py-6 space-y-5">
                    {/* Success */}
                    {pwSuccess && (
                        <div className="flex items-center gap-3 p-4 rounded-xl
                                        bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            {pwSuccess}
                        </div>
                    )}

                    {/* Error */}
                    {pwError && (
                        <div className="flex items-center gap-3 p-4 rounded-xl
                                        bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
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
                        <p className="text-xs text-red-500 font-medium pt-1">Passwords don't match</p>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                            className="h-11 px-6 rounded-xl bg-primary text-white text-sm font-bold
                                       hover:bg-primary-hover active:bg-primary/90 transition-colors
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       flex items-center gap-2 shadow-sm"
                        >
                            {pwLoading
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <SaveIcon />}
                            Update Password
                        </button>
                    </div>
                </form>
            </div>

            {/* ══════════════════════════════════════════════════
                MODAL — Set up 2FA
            ══════════════════════════════════════════════════ */}
            <Modal
                isOpen={mfaModalOpen}
                onClose={() => !mfaActionLoading && setMfaModalOpen(false)}
                title="Set Up Two-Factor Authentication"
                maxWidth="max-w-md"
            >
                <form onSubmit={handleVerifyEnrollment}>
                    <div className="space-y-6">
                        {mfaError && (
                            <div className="flex items-center gap-3 p-4 rounded-xl
                                            bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                {mfaError}
                            </div>
                        )}

                        {enrollData ? (
                            <div className="flex flex-col items-center gap-5">
                                <p className="text-sm text-slate-600 text-center leading-relaxed">
                                    Scan with <strong className="text-slate-900">Google Authenticator</strong>,
                                    Authy, or any TOTP app.
                                </p>
                                <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
                                    <img src={enrollData.totp.qr_code} alt="2FA QR Code" className="w-48 h-48 block" />
                                </div>
                                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Manual Setup Key
                                        </span>
                                        <CopyButton text={enrollData.totp.secret} />
                                    </div>
                                    <code className="block px-4 py-3 text-sm font-mono text-slate-700
                                                     tracking-widest break-all text-center select-all bg-white">
                                        {enrollData.totp.secret}
                                    </code>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 py-12">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                                    Generating QR code...
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-3 py-2">
                            <span className="flex-1 h-px bg-slate-200" />
                            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                                Then enter the code
                            </span>
                            <span className="flex-1 h-px bg-slate-200" />
                        </div>

                        <div className="space-y-3">
                            <OtpInput value={mfaCode} onChange={setMfaCode} />
                            <p className="text-xs text-slate-500 text-center">
                                Enter the 6-digit code shown in your authenticator app
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={mfaActionLoading || mfaCode.length !== 6 || !enrollData}
                                className="h-12 w-full rounded-xl bg-primary text-white font-bold text-sm
                                           shadow-sm hover:bg-primary-hover active:bg-primary/90
                                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                           flex items-center justify-center gap-2"
                            >
                                {mfaActionLoading
                                    ? <Loader2 className="w-5 h-5 animate-spin" />
                                    : <ShieldCheck className="w-5 h-5" />}
                                Verify & Enable 2FA
                            </button>
                            <button
                                type="button"
                                disabled={mfaActionLoading}
                                onClick={() => setMfaModalOpen(false)}
                                className="h-11 w-full rounded-xl text-slate-600 font-semibold text-sm
                                           hover:bg-slate-100 transition-colors flex items-center justify-center"
                            >
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
                onClose={() => {
                    if (!mfaActionLoading) {
                        setDisableConfirmOpen(false);
                        setDisableCode('');
                        setMfaError('');
                    }
                }}
                title="Disable Two-Factor Authentication?"
                maxWidth="max-w-sm"
            >
                <form onSubmit={handleDisableMfa} className="space-y-6">
                    <div className="flex gap-4 p-5 rounded-xl bg-amber-50 border border-amber-200">
                        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                        <div className="space-y-1.5">
                            <p className="text-sm font-bold text-amber-800">This reduces your account security</p>
                            <p className="text-sm text-amber-700/80 leading-relaxed">
                                Anyone with your password will be able to access the Management Portal without a second verification step.
                            </p>
                        </div>
                    </div>
                    
                    {mfaError && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            {mfaError}
                        </div>
                    )}

                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-700 text-center">
                            Enter your current 2FA code to confirm
                        </p>
                        <OtpInput value={disableCode} onChange={setDisableCode} />
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={mfaActionLoading || disableCode.length !== 6}
                            className="h-12 rounded-xl bg-red-600 text-white font-bold text-sm
                                       hover:bg-red-700 active:bg-red-800 transition-colors
                                       disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                        >
                            {mfaActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldOff className="w-5 h-5" />}
                            Yes, Disable 2FA
                        </button>
                        <button
                            type="button"
                            disabled={mfaActionLoading}
                            onClick={() => {
                                setDisableConfirmOpen(false);
                                setDisableCode('');
                                setMfaError('');
                            }}
                            className="h-11 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors"
                        >
                            Keep 2FA Enabled
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ══════════════════════════════════════════════════
                MODAL — Confirm Update Password
            ══════════════════════════════════════════════════ */}
            <Modal
                isOpen={pwConfirmOpen}
                onClose={() => {
                    if (!pwActionLoading) {
                        setPwConfirmOpen(false);
                        setPwCode('');
                        setPwMfaError('');
                    }
                }}
                title="Verify Two-Factor Authentication"
                maxWidth="max-w-sm"
            >
                <form onSubmit={handleConfirmUpdatePassword} className="space-y-6">
                    <div className="flex gap-4 p-5 rounded-xl bg-blue-50 border border-blue-200">
                        <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                        <div className="space-y-1.5">
                            <p className="text-sm font-bold text-blue-800">Security Verification</p>
                            <p className="text-sm text-blue-700/80 leading-relaxed">
                                Please enter your 2FA code to confirm your password update.
                            </p>
                        </div>
                    </div>
                    
                    {pwMfaError && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            {pwMfaError}
                        </div>
                    )}

                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-700 text-center">
                            Enter your 6-digit authenticator code
                        </p>
                        <OtpInput value={pwCode} onChange={setPwCode} />
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={pwActionLoading || pwCode.length !== 6}
                            className="h-12 rounded-xl bg-primary text-white font-bold text-sm
                                       hover:bg-primary-hover active:bg-primary/90 transition-colors
                                       disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                        >
                            {pwActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            Verify & Update
                        </button>
                        <button
                            type="button"
                            disabled={pwActionLoading}
                            onClick={() => {
                                setPwConfirmOpen(false);
                                setPwCode('');
                                setPwMfaError('');
                            }}
                            className="h-11 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function SaveIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
    )
}
