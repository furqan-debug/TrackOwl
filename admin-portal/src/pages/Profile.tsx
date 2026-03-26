import { useState, useRef } from 'react';
import { 
    User, Mail, Shield,
    Camera, Save, CheckCircle, 
    ShieldAlert, Loader2, Diamond,
    Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLayout, Card } from '../components/ui';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';

export function ProfilePage() {
    const { profile, user, refreshProfile } = useAuth();
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            const fileName = `${profile.id}_${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('members')
                .update({ avatar_url: publicUrl })
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
            title="Profile"
            description="Manage your personal information, contact details, and account settings."
            maxWidth="6xl"
            actions={
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95",
                        success ? "bg-emerald-600 text-white" : "bg-primary text-white hover:bg-primary/90"
                    )}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                     (success ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />)}
                    {success ? 'Profile Updated' : (loading ? 'Saving...' : 'Save Changes')}
                </button>
            }
        >
            <div className="space-y-10 mb-20">
                {error && (
                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4 flex items-start gap-3 text-rose-600">
                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-bold text-xs">Error</p>
                            <p className="text-xs font-medium opacity-90">{error}</p>
                        </div>
                    </div>
                )}

                {/* Avatar Section */}
                <Card className="p-10 border-border bg-surface-solid shadow-sm rounded-xl flex flex-col items-center text-center relative overflow-hidden group">
                    <div className="relative mb-6">
                        <div className="w-32 h-32 rounded-xl bg-surface-subtle p-1 shadow-sm overflow-hidden group/avatar border border-border">
                            <div className="w-full h-full rounded-lg bg-surface-solid overflow-hidden relative">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-105" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-primary text-4xl font-bold bg-primary/5">
                                        {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                                    </div>
                                )}
                                
                                {avatarLoading ? (
                                    <div className="absolute inset-0 bg-surface-solid/80 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                    </div>
                                ) : (
                                     <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white"
                                    >
                                        <Camera className="w-8 h-8 mb-2" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Update Photo</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-surface-solid border border-border rounded-lg flex items-center justify-center shadow-sm">
                            <Diamond className="w-4 h-4 text-primary" />
                        </div>
                    </div>

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleAvatarUpload} 
                        className="hidden" 
                        accept="image/*" 
                    />

                    <h2 className="text-2xl font-bold text-text-primary tracking-tight mb-2">{profile?.full_name || 'No Name Set'}</h2>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Active Profile</span>
                    </div>

                    <p className="text-xs font-medium text-text-muted max-w-sm leading-relaxed opacity-80">
                        Your profile is visible to other team members and administrators.
                    </p>
                </Card>

                {/* Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <Card className="p-8 border-border bg-surface-solid shadow-sm rounded-xl space-y-8 group">
                        <div className="flex items-center gap-4 border-b border-border pb-6">
                            <div className="w-12 h-12 rounded-xl bg-surface-subtle border border-border flex items-center justify-center text-primary shadow-sm">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-lg font-bold text-text-primary">Personal Details</h3>
                                <p className="text-xs font-medium text-text-muted mt-1 opacity-70">Information used across the team workspace</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Full Name</label>
                            </div>
                            <input
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Enter your full name"
                                className="w-full bg-surface-subtle border border-border rounded-lg px-4 py-3 text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-solid transition-all shadow-sm"
                            />
                        </div>
                    </Card>

                    <Card className="p-8 border-border bg-surface-solid shadow-sm rounded-xl space-y-8 group">
                         <div className="flex items-center gap-4 border-b border-border pb-6">
                            <div className="w-12 h-12 rounded-xl bg-surface-subtle border border-border flex items-center justify-center text-primary shadow-sm">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Contact Details</h3>
                                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-1 opacity-60">How we can reach you</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                             <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Phone Number</label>
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="+1 (000) 000-0000"
                                className="w-full bg-surface-subtle border border-border rounded-lg px-4 py-3 text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-solid transition-all shadow-sm"
                            />
                        </div>
                    </Card>

                    <Card className="p-8 border-border bg-surface-solid shadow-sm rounded-xl space-y-6">
                         <div className="flex items-center gap-4 border-b border-border pb-6">
                            <div className="w-12 h-12 rounded-xl bg-surface-subtle border border-border flex items-center justify-center text-text-muted shadow-sm">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Email Address</h3>
                                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-1 opacity-60">Primary login email</p>
                            </div>
                        </div>

                        <div className="bg-surface-subtle rounded-lg px-4 py-3 flex items-center gap-3 border border-border shadow-sm">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <Shield className="w-3 h-3 text-emerald-600" />
                            </div>
                            <span className="text-sm font-semibold text-text-primary truncate">{user?.email}</span>
                        </div>
                    </Card>

                    <Card className="p-8 border-border bg-surface-solid shadow-sm rounded-xl space-y-6">
                         <div className="flex items-center gap-4 border-b border-border pb-6">
                            <div className="w-12 h-12 rounded-xl bg-surface-subtle border border-border flex items-center justify-center text-text-muted shadow-sm">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Account Role</h3>
                                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-1 opacity-60">System permissions level</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <div className="px-4 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest leading-none">
                                Role: {profile?.role}
                            </div>
                            <div className="px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold uppercase tracking-widest leading-none">
                                Status: Verified
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </PageLayout>
    );
}
