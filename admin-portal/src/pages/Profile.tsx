import { useState, useRef } from 'react';
import { 
    User, Mail, Phone, Shield, 
    Camera, Save, CheckCircle, 
    ShieldAlert, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLayout } from '../components/ui';
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
            // 1. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}_${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update Member record
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
            title="Account Profile"
            description="Manage your identity, contact details, and platform credentials."
            maxWidth="6xl"
            actions={
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={clsx(
                        "flex items-center gap-3 px-10 py-4 rounded-[24px] text-[11px] font-bold uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95 font-mono",
                        success ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-primary text-white hover:shadow-primary/30 hover:scale-[1.02]"
                    )}
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                     (success ? <CheckCircle className="w-5 h-5 stroke-[3]" /> : <Save className="w-5 h-5 stroke-[3]" />)}
                    {success ? 'UPDATED' : (loading ? 'SAVING...' : 'SAVE PROFILE')}
                </button>
            }
        >
            <div className="space-y-10 mb-20">
                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-[28px] p-6 flex items-start gap-5 text-rose-600 animate-in fade-in slide-in-from-top-4 duration-500">
                        <ShieldAlert className="w-6 h-6 shrink-0" strokeWidth={2.5} />
                        <div className="space-y-1">
                            <p className="font-bold uppercase tracking-widest text-[11px] font-mono">System Protocol Error</p>
                            <p className="text-[13px] font-semibold opacity-80">{error}</p>
                        </div>
                    </div>
                )}

                {/* Avatar Section */}
                <div className="bg-white rounded-[48px] border border-black/[0.05] shadow-2xl p-10 flex flex-col items-center text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.03] blur-3xl rounded-full -mr-32 -mt-32 group-hover:bg-primary/[0.06] transition-colors duration-1000" />
                    
                    <div className="relative mb-8">
                        <div className="w-36 h-36 rounded-[42px] bg-gradient-to-br from-primary to-[#3d59e0] p-1 shadow-2xl shadow-primary/20 hover:scale-[1.03] transition-transform duration-700 overflow-hidden group/avatar">
                           <div className="w-full h-full rounded-[40px] bg-white overflow-hidden relative border border-transparent">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover transition-all duration-700 group-hover/avatar:scale-110" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-primary text-4xl font-bold font-head uppercase">
                                        {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                                    </div>
                                )}
                                
                                {avatarLoading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                    </div>
                                ) || (
                                     <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute inset-0 bg-primary/0 hover:bg-primary/20 backdrop-blur-[2px] opacity-0 hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center text-white"
                                    >
                                        <Camera className="w-8 h-8 mb-2 drop-shadow-lg" />
                                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Change Image</span>
                                    </button>
                                )}
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

                    <h2 className="text-3xl font-bold text-text-primary tracking-tighter leading-none mb-2 uppercase">{profile?.full_name || 'No Name Set'}</h2>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest font-mono">Active Operator</span>
                    </div>

                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-60 max-w-sm leading-relaxed">
                        Identity metrics are validated across all system nodes. Changes to profile imagery will sync globally across admin and tracker interfaces.
                    </p>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="bg-white rounded-[48px] border border-black/[0.05] shadow-2xl p-10 space-y-10 group transition-all hover:border-primary/20 duration-500">
                        <div className="flex items-center gap-5 border-b border-black/[0.05] pb-6">
                            <div className="w-12 h-12 rounded-[22px] bg-primary/5 flex items-center justify-center text-primary group-hover:rotate-6 transition-transform">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tighter leading-none">Identity Core</h3>
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono mt-1">Full Legal Designator</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono ml-2">Operator Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Enter full name"
                                className="w-full bg-black/[0.02] border border-black/[0.04] rounded-3xl px-8 py-5 text-[15px] font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all shadow-inner shadow-black/[0.02] placeholder:opacity-30"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-[48px] border border-black/[0.05] shadow-2xl p-10 space-y-10 group transition-all hover:border-primary/20 duration-500">
                         <div className="flex items-center gap-5 border-b border-black/[0.05] pb-6">
                            <div className="w-12 h-12 rounded-[22px] bg-primary/5 flex items-center justify-center text-primary group-hover:rotate-6 transition-transform">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tighter leading-none">Communications</h3>
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono mt-1">Direct Contact Vector</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono ml-2">Direct Phone</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                                className="w-full bg-black/[0.02] border border-black/[0.04] rounded-3xl px-8 py-5 text-[15px] font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all shadow-inner shadow-black/[0.02] placeholder:opacity-30"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-[48px] border border-black/[0.05] shadow-2xl p-10 space-y-8 opacity-60">
                         <div className="flex items-center gap-5 border-b border-black/[0.05] pb-6">
                            <div className="w-12 h-12 rounded-[22px] bg-black/5 flex items-center justify-center text-text-muted">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tighter leading-none italic">Email Protocol</h3>
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono mt-1">Read-only Metric</p>
                            </div>
                        </div>

                        <div className="bg-black/[0.02] rounded-3xl px-8 py-5 flex items-center gap-4">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                            </div>
                            <span className="text-[14px] font-mono font-bold text-text-secondary tracking-tight truncate">{user?.email}</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-[48px] border border-black/[0.05] shadow-2xl p-10 space-y-8 opacity-60">
                         <div className="flex items-center gap-5 border-b border-black/[0.05] pb-6">
                            <div className="w-12 h-12 rounded-[22px] bg-black/5 flex items-center justify-center text-text-muted">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tighter leading-none italic">Access Tier</h3>
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono mt-1">System Authorization</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="px-5 py-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.2em] font-mono">
                                Level: {profile?.role}
                            </div>
                            <div className="px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold uppercase tracking-[0.2em] font-mono">
                                Status: VERIFIED
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
