import { useState, useRef, useEffect } from 'react';
import { 
    User, Mail, Shield,
    Camera, Save, CheckCircle, 
    ShieldAlert, Loader2, Diamond,
    Smartphone, MapPin, Lock, Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLayout, Modal } from '../components/ui';
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
    
    // Password change state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    async function handlePasswordChange() {
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }

        setPasswordLoading(true);
        setPasswordError(null);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordSuccess(true);
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordSuccess(false);
                setNewPassword('');
                setConfirmPassword('');
            }, 2000);
        } catch (err: any) {
            setPasswordError(err.message);
        } finally {
            setPasswordLoading(false);
        }
    }

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
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const { error } = await supabase
                .from('members')
                .update({
                    full_name: fullName,
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
                    <div className="lg:col-span-4 flex flex-col gap-8">
                        <div className="glass-panel p-10 rounded-[2.5rem] flex flex-col items-center text-center relative overflow-hidden group">
                            {/* Decorative Glow */}
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
                            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/5 blur-[60px] rounded-full pointer-events-none" />

                            <div className="relative mb-8 z-10">
                                <div className="w-40 h-40 rounded-[2.5rem] bg-surface-hover p-1.5 shadow-premium overflow-hidden group/avatar border border-border rotate-3 group-hover:rotate-0 transition-all duration-500">
                                    <div className="w-full h-full rounded-[2rem] bg-surface overflow-hidden relative">
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
                                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white border border-border rounded-2xl flex items-center justify-center shadow-premium transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                    <Diamond className="w-5 h-5 text-primary" />
                                </div>
                            </div>

                            <div className="relative z-10">
                                <h2 className="text-3xl font-black text-text-main tracking-tight mb-3">{profile?.full_name || 'Anonymous User'}</h2>
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
                        <div className="glass-panel p-8 rounded-[2rem] space-y-6">
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

                    <div className="lg:col-span-8 flex flex-col gap-10">


                        {/* 📝 Identity Forms */}
                        <div className="glass-panel p-10 rounded-[2.5rem] space-y-10">
                            <div className="flex items-center gap-5 border-b border-border pb-8">
                                <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-primary shadow-shell-sm">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-[22px] font-black text-text-main tracking-tight">Identity Information</h3>
                                    <p className="text-[13px] font-medium text-text-muted mt-1 opacity-70">These details are visible to your administrators and team members.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Legal Full Name</label>
                                    <div className="relative group/field">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within/field:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={e => setFullName(capitalizeWords(e.target.value))}
                                            placeholder="Enter your full name"
                                            className="w-full bg-surface-hover/50 border border-border rounded-2xl pl-14 pr-6 py-4 text-[15px] font-bold text-text-main focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-surface transition-all shadow-inner"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Contact Number</label>
                                    <div className="relative group/field">
                                        <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within/field:text-primary transition-colors" />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="+1 (000) 000-0000"
                                            className="w-full bg-surface-hover/50 border border-border rounded-2xl pl-14 pr-6 py-4 text-[15px] font-bold text-text-main focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-surface transition-all shadow-inner"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 md:col-span-2">
                                    <label className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Current Base Location</label>
                                    <div className="relative group/field">
                                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within/field:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            value={location}
                                            readOnly
                                            placeholder="Detecting location..."
                                            className="w-full bg-surface-hover/30 border border-border rounded-2xl pl-14 pr-6 py-4 text-[15px] font-bold text-text-muted cursor-not-allowed transition-all shadow-inner"
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
                                    disabled={loading}
                                    className={clsx(
                                        "h-12 px-10 rounded-2xl text-[13px] font-black transition-all shadow-premium active:scale-95 flex items-center gap-3",
                                        success 
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

                        {/* 🔒 Security CTA */}
                        <div className="p-8 rounded-[2rem] bg-slate-900 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between group shadow-premium gap-6">
                             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/20 blur-[60px] rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
                             <div className="relative z-10 flex flex-col gap-1 text-center md:text-left">
                                <h4 className="text-xl font-black tracking-tight italic">Protect your workspace access</h4>
                                <p className="text-[12px] font-bold text-white/50">Regularly updating your password ensures your account remains secure.</p>
                             </div>
                             <div className="relative z-10 w-full md:w-auto">
                                <button 
                                    onClick={() => setShowPasswordModal(true)}
                                    className="w-full md:w-auto px-8 py-4 rounded-xl bg-white text-slate-900 text-[11px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-glow-white flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <Lock className="w-4 h-4" />
                                    Change Password
                                </button>
                             </div>
                        </div>

                        {/* Password Modal */}
                        <Modal
                            isOpen={showPasswordModal}
                            onClose={() => setShowPasswordModal(false)}
                            title="Update Security Key"
                            maxWidth="md"
                        >
                            <div className="space-y-6">
                                <div className="flex flex-col items-center text-center mb-2">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20">
                                        <Key className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-black tracking-tight text-text-main">Set New Password</h3>
                                    <p className="text-[13px] font-medium text-text-muted mt-1 px-4">Ensure your password is at least 6 characters with a mix of symbols.</p>
                                </div>

                                {passwordError && (
                                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-3">
                                        <ShieldAlert className="w-4 h-4" />
                                        {passwordError}
                                    </div>
                                )}

                                {passwordSuccess && (
                                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-3">
                                        <CheckCircle className="w-4 h-4" />
                                        Password successfully updated!
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">New Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full bg-surface-hover/50 border border-border rounded-xl px-5 py-3.5 text-[14px] font-bold text-text-main focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-surface transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className="w-full bg-surface-hover/50 border border-border rounded-xl px-5 py-3.5 text-[14px] font-bold text-text-main focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-surface transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-4">
                                    <button
                                        onClick={handlePasswordChange}
                                        disabled={passwordLoading || passwordSuccess}
                                        className="h-14 rounded-xl bg-primary text-white font-black text-[12px] uppercase tracking-widest shadow-glow-primary hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                        Update Password
                                    </button>
                                    <button
                                        onClick={() => setShowPasswordModal(false)}
                                        className="h-12 rounded-xl text-text-muted font-bold text-[11px] hover:text-primary transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </Modal>
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

