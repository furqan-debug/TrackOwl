import { useState, useRef, useEffect } from 'react';
import { 
    User, Mail, Shield,
    Camera, Save, CheckCircle, 
    ShieldAlert, Loader2, Diamond,
    Smartphone, MapPin
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
    const { profile, user, refreshProfile } = useAuth();
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [location, setLocation] = useState(profile?.location || '');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isFullNameValid = fullName.trim().length > 0;

    

    // 📍 Auto-detect location via IP (Enforced & Exact)
    useEffect(() => {
        const detectLocation = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                if (data.city && data.country_name) {
                    const locString = `${data.city}, ${data.country_name}`;
                    setLocation(capitalizeWords(locString));
                }
            } catch (err) {
                console.error('Failed to auto-detect location:', err);
            }
        };
        detectLocation();
    }, []); // Refresh on mount to keep it exact
    


    async function handleSave() {
        if (!profile) return;

        const trimmedName = fullName.trim();

        if (!trimmedName) return;

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const { error } = await supabase
                .from('members')
                .update({
                    full_name: trimmedName,
                    phone: phone,
                    location: location,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.id);

            if (error) throw error;
            
            await refreshProfile();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        setAvatarLoading(true);
        setError(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${profile.organization_id}/${profile.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { error: updateError } = await supabase
                .from('members')
                .update({ avatar_url: filePath })
                .eq('id', profile.id);

            if (updateError) throw updateError;
            
            await refreshProfile();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setAvatarLoading(false);
        }
    }

    return (
        <PageLayout
            maxWidth="full"
            eyebrow="ACCOUNT & IDENTITY"
            title="Profile Settings"
            description="Manage your global workspace identity and track your personal productivity."

        >
            <div className="flex flex-col gap-10 pb-32">
                {error && (
                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 flex items-start gap-4 text-rose-500 animate-in fade-in slide-in-from-top-4">
                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-bold text-sm tracking-tight">System Error</p>
                            <p className="text-[13px] font-medium opacity-90 leading-relaxed">{error}</p>
                        </div>
                    </div>
                )}

                {/* 🎭 Hero Identity Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-surface border border-border shadow-shell-sm p-8 rounded-[24px] flex flex-col items-center text-center relative overflow-hidden group">
                            {/* Decorative Glow */}
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
                            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/5 blur-[60px] rounded-full pointer-events-none" />

                            <div className="relative mb-6 z-10">
                                <div className="w-32 h-32 rounded-[2rem] bg-surface-hover p-1.5 overflow-hidden group/avatar border border-border transition-all duration-500">
                                    <div className="w-full h-full rounded-[1.5rem] bg-surface overflow-hidden relative">
                                        {profile?.avatar_url ? (
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
                                                className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white backdrop-blur-sm"
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

                            <div className="relative z-10">
                                <h2 className="text-2xl font-black text-text-main tracking-tight mb-2">{profile?.full_name || 'Anonymous User'}</h2>
                                <div className="flex items-center justify-center gap-3 mb-6">
                                    <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Verified Identity</span>
                                    </div>
                                </div>
                                <p className="text-[14px] font-medium text-text-muted leading-relaxed opacity-80 px-4">
                                    Member since {new Date(profile?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {/* Security Card */}
                        <div className="bg-surface border border-border shadow-shell-sm p-6 rounded-[24px] space-y-5">
                            <div className="flex items-center gap-4 border-b border-border pb-6">
                                <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-primary shadow-shell-sm">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[17px] font-bold text-text-main">Security Status</h3>
                                    <p className="text-[11px] font-bold text-text-muted opacity-60">Authentication & Access</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border">
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-4 h-4 text-text-muted" />
                                        <span className="text-[13px] font-bold text-text-main truncate max-w-[180px]">{user?.email}</span>
                                    </div>
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-4 h-4 text-text-muted" />
                                        <span className="text-[13px] font-bold text-text-main uppercase tracking-widest">{profile?.role}</span>
                                    </div>
                                    <Diamond className="w-4 h-4 text-primary opacity-50" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8 flex flex-col gap-6">


                        {/* 📝 Identity Forms */}
                        <div className="bg-surface border border-border shadow-shell-sm p-8 rounded-[24px] space-y-8">
                            <div className="flex items-center gap-4 border-b border-border pb-6">
                                <div className="w-12 h-12 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-primary shadow-shell-sm">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[18px] font-black text-text-main tracking-tight">Identity Information</h3>
                                    <p className="text-[13px] font-medium text-text-muted mt-1 opacity-70">These details are visible to your administrators and team members.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
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
                                        <p className="text-[10px] font-bold text-rose-500 ml-1 mt-1">
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

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Current Base Location</label>
                                    <div className="relative group/field">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within/field:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            value={location}
                                            readOnly
                                            placeholder="Detecting location..."
                                            className="w-full bg-surface-hover/50 border border-border rounded-xl pl-11 pr-32 h-11 text-[12px] font-bold text-text-muted cursor-not-allowed transition-all shadow-shell-sm"
                                        />
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
                                            <Shield className="w-3 h-3 text-primary" />
                                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Verified IP</span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] font-bold text-text-muted/60 ml-1">Your location helps team members coordinate meetings across timezones.</p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-border">
                                <button
                                    onClick={handleSave}
                                    disabled={loading || !isFullNameValid}
                                    className={clsx(
                                        "h-10 px-8 rounded-xl text-[12px] font-bold transition-all shadow-shell-sm flex items-center gap-2",
                                        !isFullNameValid
                                            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                            : success
                                                ? "bg-emerald-500 text-white" 
                                                : "bg-primary text-white hover:brightness-110"
                                    )}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                                    (success ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />)}
                                    {success ? 'Update Successful' : (loading ? 'Processing...' : 'Save Changes')}
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

