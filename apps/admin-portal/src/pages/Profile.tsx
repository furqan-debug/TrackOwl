import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    User, Mail, Shield,
    Camera, Save, CheckCircle, 
    ShieldAlert, Loader2, Diamond,
    Smartphone, MapPin, Clock,
    Building2, Globe, ExternalLink, KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLayout } from '../components/ui';
import { supabase } from '../lib/supabase';
import { SecureImage } from '../components/ui/SecureImage';
import clsx from 'clsx';

const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
};

export function ProfilePage() {
    const { profile, user, organization, displayTimezone, refreshProfile } = useAuth();
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [location, setLocation] = useState(profile?.location || '');
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    // A picked picture is held here, unsent, until Save Changes. Nothing reaches
    // storage or the database before that, so picking one and navigating away
    // leaves no trace behind.
    const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
    const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isFullNameValid = fullName.trim().length > 0;

    // Sync state when profile loads or updates
    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setPhone(profile.phone || '');
            if (profile.location) setLocation(profile.location);
        }
    }, [profile?.id, profile?.full_name, profile?.phone, profile?.location]);

    // Detect location via IP helper
    const detectLocation = async () => {
        setDetectingLocation(true);
        try {
            // Try ipwho.is first (supports browser CORS natively)
            const response = await fetch('https://ipwho.is/');
            if (response.ok) {
                const data = await response.json();
                if (data.success !== false && data.city && data.country) {
                    const locString = `${data.city}, ${data.country}`;
                    setLocation(capitalizeWords(locString));
                    return;
                }
            }
        } catch {
            // Ignore network/CORS fallback silently
        }

        try {
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                const data = await response.json();
                if (data.city && data.country_name) {
                    const locString = `${data.city}, ${data.country_name}`;
                    setLocation(capitalizeWords(locString));
                }
            }
        } catch {
            // Fail gracefully
        } finally {
            setDetectingLocation(false);
        }
    };

    // Auto-detect on mount only if user doesn't already have a location saved
    useEffect(() => {
        if (!profile?.location && !location) {
            detectLocation();
        }
    }, [profile?.location]);
    


    async function handleSave() {
        if (!profile) return;

        const trimmedName = fullName.trim();

        if (!trimmedName) return;

        setLoading(true);
        setError(null);
        setSuccess(false);

        const previousAvatar = profile.avatar_url || null;
        let uploadedPath: string | null = null;

        try {
            // The picture is uploaded here, as part of Save — not when it was
            // picked. avatar_url is only included when one was actually chosen,
            // so an ordinary save never touches an existing picture.
            const patch: Record<string, any> = {
                full_name: trimmedName,
                phone: phone,
                location: location,
                updated_at: new Date().toISOString()
            };

            if (pendingAvatarFile) {
                setAvatarLoading(true);
                const fileExt = pendingAvatarFile.name.split('.').pop();
                const filePath = `${profile.organization_id}/${profile.id}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, pendingAvatarFile);
                if (uploadError) throw uploadError;
                uploadedPath = filePath;
                patch.avatar_url = filePath;
            }

            // count: an UPDATE blocked by RLS matches zero rows and returns NO
            // error, so without this a rejected write looks like a success.
            const { error, count } = await supabase
                .from('members')
                .update(patch, { count: 'exact' })
                .eq('id', profile.id);

            if (error) throw error;
            if (count === 0) throw new Error('Profile update was not permitted.');

            if (uploadedPath) {
                setPendingAvatarFile(null);
                setPendingAvatarPreview(prev => {
                    if (prev) URL.revokeObjectURL(prev);
                    return null;
                });
                // Replace means replace: remove the file this one supersedes,
                // but only now that the new path is safely recorded. A failed
                // cleanup is logged, never surfaced — a leftover file is not
                // worth failing a save over.
                if (previousAvatar && previousAvatar !== uploadedPath) {
                    // remove() RESOLVES with an error rather than throwing, so a
                    // try/catch around it sees nothing and a blocked delete
                    // passes silently. Read the returned error instead.
                    const { error: removeErr } = await supabase.storage
                        .from('avatars')
                        .remove([previousAvatar]);
                    if (removeErr) {
                        // Not surfaced: the new picture is saved and correct, and
                        // a leftover file is not worth failing the save over.
                        console.warn('Could not remove the previous avatar:', removeErr.message, previousAvatar);
                    }
                }
            }
            
            await refreshProfile();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message);
            // Nothing points at the file we just uploaded, so take it back out
            // rather than leaving it orphaned in the bucket.
            if (uploadedPath) {
                const { error: rollbackErr } = await supabase.storage
                    .from('avatars')
                    .remove([uploadedPath]);
                if (rollbackErr) {
                    console.warn('Could not remove the unsaved upload:', rollbackErr.message, uploadedPath);
                }
            }
        } finally {
            setAvatarLoading(false);
            setLoading(false);
        }
    }

    function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        // Allow the same file to be chosen again after a cancel.
        e.target.value = '';
        if (!file || !profile) return;

        setError(null);
        setPendingAvatarPreview(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });
        setPendingAvatarFile(file);
    }

    // The preview is a blob URL owned by this page; release it on unmount so the
    // picked image is not held in memory.
    useEffect(() => {
        return () => {
            if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
        };
    }, [pendingAvatarPreview]);

    return (
        <PageLayout
            maxWidth="7xl"
            eyebrow="ACCOUNT & IDENTITY"
            title="Profile Settings"
            description="Manage your global workspace identity and track your personal productivity."
        >
            <div className="flex flex-col gap-8 pb-24">
                {error && (
                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 flex items-start gap-4 text-rose-500 animate-in fade-in slide-in-from-top-4">
                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-bold text-sm tracking-tight">System Error</p>
                            <p className="text-[13px] font-medium opacity-90 leading-relaxed">{error}</p>
                        </div>
                    </div>
                )}

                {/* 🎭 Hero Identity & Settings Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Identity Summary & Security */}
                    <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
                        <div className="bg-surface border border-border shadow-shell-sm p-8 rounded-[24px] flex flex-col items-center text-center relative overflow-hidden group">
                            {/* Decorative Glow */}
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
                            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/5 blur-[60px] rounded-full pointer-events-none" />

                            <div className="relative mb-6 z-10">
                                <div className="w-32 h-32 rounded-[2rem] bg-surface-hover p-1.5 overflow-hidden group/avatar border border-border transition-all duration-500">
                                    <div className="w-full h-full rounded-[1.5rem] bg-surface overflow-hidden relative">
                                        {pendingAvatarPreview ? (
                                            <img
                                                src={pendingAvatarPreview}
                                                alt="Selected profile picture"
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover/avatar:scale-110"
                                            />
                                        ) : profile?.avatar_url ? (
                                            <SecureImage 
                                                path={profile.avatar_url} 
                                                bucket="avatars"
                                                alt="" 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover/avatar:scale-110" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-primary text-5xl font-black bg-primary/5">
                                                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        
                                        {avatarLoading ? (
                                            <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                            </div>
                                        ) : (
                                             <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white backdrop-blur-sm cursor-pointer"
                                            >
                                                <Camera className="w-8 h-8 mb-2" />
                                                <span className="text-[11px] font-black tracking-widest uppercase">Update Photo</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-surface border border-border rounded-xl flex items-center justify-center shadow-shell-sm transition-transform duration-500">
                                    <Diamond className="w-4 h-4 text-primary" />
                                </div>
                            </div>

                            <div className="relative z-10 w-full">
                                <h2 className="text-2xl font-black text-text-main tracking-tight mb-2 truncate px-2">{profile?.full_name || 'Anonymous User'}</h2>
                                <div className="flex items-center justify-center gap-3 mb-5">
                                    <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Verified Identity</span>
                                    </div>
                                </div>
                                <p className="text-[13px] font-medium text-text-muted leading-relaxed opacity-80 px-4">
                                    Member since {new Date(profile?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {/* Security Card */}
                        <div className="bg-surface border border-border shadow-shell-sm p-6 rounded-[24px] space-y-5">
                            <div className="flex items-center gap-4 border-b border-border pb-5">
                                <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-primary shadow-shell-sm">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-bold text-text-main">Security & Access</h3>
                                    <p className="text-[11px] font-bold text-text-muted opacity-60">Authentication credentials</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3.5 bg-surface rounded-xl border border-border">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Mail className="w-4 h-4 text-text-muted shrink-0" />
                                        <span className="text-[12px] font-bold text-text-main truncate">{user?.email}</span>
                                    </div>
                                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                                </div>
                                <div className="flex items-center justify-between p-3.5 bg-surface rounded-xl border border-border">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-4 h-4 text-text-muted shrink-0" />
                                        <span className="text-[12px] font-bold text-text-main uppercase tracking-widest">{profile?.role || 'User'}</span>
                                    </div>
                                    <Diamond className="w-4 h-4 text-primary opacity-50 shrink-0" />
                                </div>
                                <Link
                                    to="/dashboard/settings/security"
                                    className="flex items-center justify-between p-3.5 bg-surface-hover/40 hover:bg-surface-hover rounded-xl border border-border text-[12px] font-bold text-text-muted hover:text-text-main transition-all group mt-2"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <KeyRound className="w-4 h-4 text-primary" />
                                        <span>Manage 2FA & Password</span>
                                    </div>
                                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Balanced Form Sections */}
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
                        {/* 📝 Card 1: Identity & Contact Details */}
                        <div className="bg-surface border border-border shadow-shell-sm p-6 sm:p-8 rounded-[24px] space-y-6">
                            <div className="flex items-center gap-4 border-b border-border pb-5">
                                <div className="w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-primary shadow-shell-sm">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-black text-text-main tracking-tight">Personal Information</h3>
                                    <p className="text-[12px] font-medium text-text-muted mt-0.5">Primary identity details visible across your workspace.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Legal Full Name</label>
                                    <div className="relative group/field">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within/field:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={e => setFullName(capitalizeWords(e.target.value))}
                                            placeholder="Enter your full name"
                                            className="w-full bg-surface border border-border rounded-xl pl-11 pr-4 h-11 text-[12px] font-bold text-text-main focus:outline-none focus:border-primary transition-all shadow-shell-sm"
                                        />
                                    </div>
                                    {!isFullNameValid && (
                                        <p className="text-[10px] font-bold text-rose-500 ml-1">
                                            Full name is required
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Contact Number</label>
                                    <div className="relative group/field">
                                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within/field:text-primary transition-colors" />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="+1 (000) 000-0000"
                                            className="w-full bg-surface border border-border rounded-xl pl-11 pr-4 h-11 text-[12px] font-bold text-text-main focus:outline-none focus:border-primary transition-all shadow-shell-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🌍 Card 2: Regional & Location Settings */}
                        <div className="bg-surface border border-border shadow-shell-sm p-6 sm:p-8 rounded-[24px] space-y-6">
                            <div className="flex items-center gap-4 border-b border-border pb-5">
                                <div className="w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-primary shadow-shell-sm">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-black text-text-main tracking-tight">Regional & Work Location</h3>
                                    <p className="text-[12px] font-medium text-text-muted mt-0.5">Helps team members coordinate meetings and aligns attendance reports.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Base Location</label>
                                        <button
                                            type="button"
                                            onClick={detectLocation}
                                            disabled={detectingLocation}
                                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                        >
                                            {detectingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                            <span>{detectingLocation ? 'Detecting...' : 'Auto-detect'}</span>
                                        </button>
                                    </div>
                                    <div className="relative group/field">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within/field:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={e => setLocation(e.target.value)}
                                            placeholder="City, Country"
                                            className="w-full bg-surface border border-border rounded-xl pl-11 pr-4 h-11 text-[12px] font-bold text-text-main focus:outline-none focus:border-primary transition-all shadow-shell-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Workspace Timezone</label>
                                    <div className="relative">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                        <input
                                            type="text"
                                            value={displayTimezone || 'UTC'}
                                            readOnly
                                            className="w-full bg-surface-hover/50 border border-border rounded-xl pl-11 pr-24 h-11 text-[12px] font-bold text-text-muted cursor-default shadow-shell-sm"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Org Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🏢 Card 3: Workspace Membership & Save Action */}
                        <div className="bg-surface border border-border shadow-shell-sm p-6 sm:p-8 rounded-[24px] space-y-6">
                            <div className="flex items-center gap-4 border-b border-border pb-5">
                                <div className="w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-primary shadow-shell-sm">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-black text-text-main tracking-tight">Organization Workspace</h3>
                                    <p className="text-[12px] font-medium text-text-muted mt-0.5">Your organization affiliation and workspace membership tier.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-surface rounded-2xl border border-border flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Workspace</span>
                                    <span className="text-[13px] font-bold text-text-main truncate">{organization?.name || profile?.organization_name || 'DigiReps'}</span>
                                </div>
                                <div className="p-4 bg-surface rounded-2xl border border-border flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Membership</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[12px] font-black text-emerald-500 uppercase tracking-wider">Active</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-surface rounded-2xl border border-border flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Workspace Plan</span>
                                    <span className="text-[13px] font-bold text-primary">{organization?.plan_type || 'Premium'} Plan</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-border">
                                <p className="text-[11px] font-medium text-text-muted text-center sm:text-left">Ensure your identity and regional details are kept accurate.</p>
                                <button
                                    onClick={handleSave}
                                    disabled={loading || !isFullNameValid}
                                    className={clsx(
                                        "w-full sm:w-auto h-11 px-8 rounded-xl text-[12px] font-bold transition-all shadow-shell-sm flex items-center justify-center gap-2.5",
                                        !isFullNameValid
                                            ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                                            : success
                                                ? "bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg" 
                                                : "bg-primary text-white hover:brightness-110 active:scale-95 cursor-pointer shadow-primary/20 shadow-md"
                                    )}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                                    (success ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />)}
                                    <span>{success ? 'Update Successful' : (loading ? 'Saving Changes...' : 'Save Changes')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleAvatarUpload} 
                    className="hidden" 
                    accept="image/*" 
                />
            </div>
        </PageLayout>
    );
}

