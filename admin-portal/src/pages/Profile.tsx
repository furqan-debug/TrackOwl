import { useState, useRef } from 'react';
import { 
    User, Mail, Phone, Shield, 
    Camera, Save, CheckCircle, 
    ShieldAlert, Loader2, Diamond,
    Smartphone, Hash
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
            title="Operator Identity"
            description="Manage legal designators, contact vectors, and visual identifiers."
            maxWidth="6xl"
            actions={
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={clsx(
                        "flex items-center gap-3 px-10 py-4 rounded-[24px] text-[11px] font-bold uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95 font-mono italic",
                        success ? "bg-emerald-600 text-white shadow-emerald-500/20" : "bg-primary text-white hover:shadow-primary/30 hover:scale-[1.02]"
                    )}
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                     (success ? <CheckCircle className="w-5 h-5 stroke-[3]" /> : <Save className="w-5 h-5 stroke-[3]" />)}
                    {success ? 'IDENTITY UPDATED' : (loading ? 'COMMITTING...' : 'SAVE CORE PROFILE')}
                </button>
            }
        >
            <div className="space-y-10 mb-20">
                {error && (
                    <div className="bg-rose-500/5 border border-rose-500/20 rounded-[32px] p-8 flex items-start gap-6 text-rose-600 animate-in fade-in slide-in-from-top-4 duration-500">
                        <ShieldAlert className="w-7 h-7 shrink-0" strokeWidth={2.5} />
                        <div className="space-y-2">
                            <p className="font-black uppercase tracking-widest text-[11px] font-mono italic">Protocol Conflict Detected</p>
                            <p className="text-[13px] font-bold opacity-80 font-mono">{error.toUpperCase()}</p>
                        </div>
                    </div>
                )}

                {/* Avatar Section */}
                <Card className="p-12 border-border bg-surface-solid shadow-2xl rounded-[56px] flex flex-col items-center text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-primary/[0.02] blur-3xl rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000" />
                    
                    <div className="relative mb-10">
                        <div className="w-44 h-44 rounded-[52px] bg-primary/10 p-1.5 shadow-2xl hover:scale-[1.05] transition-all duration-700 overflow-hidden group/avatar border-2 border-primary/20 bg-surface-subtle">
                           <div className="w-full h-full rounded-[48px] bg-surface-solid overflow-hidden relative border border-border">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover transition-all duration-700 group-hover/avatar:scale-110" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-primary text-5xl font-black font-mono uppercase italic">
                                        {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                                    </div>
                                ) || <User className="w-16 h-16 text-primary/20" />}
                                
                                {avatarLoading ? (
                                    <div className="absolute inset-0 bg-surface-solid/80 backdrop-blur-sm flex items-center justify-center">
                                        <Loader2 className="w-10 h-10 text-primary animate-spin" strokeWidth={3} />
                                    </div>
                                ) : (
                                     <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute inset-0 bg-primary/0 hover:bg-primary/40 backdrop-blur-[4px] opacity-0 hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center text-white font-mono"
                                    >
                                        <Camera className="w-10 h-10 mb-3 drop-shadow-2xl" strokeWidth={2.5} />
                                        <span className="text-[9px] font-black tracking-[0.3em] uppercase italic">Update Visual</span>
                                    </button>
                                )}
                           </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-surface-solid border-2 border-border rounded-2xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform">
                            <Diamond className="w-6 h-6 text-primary" strokeWidth={2.5} />
                        </div>
                    </div>

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleAvatarUpload} 
                        className="hidden" 
                        accept="image/*" 
                    />

                    <h2 className="text-4xl font-black text-text-primary tracking-tighter leading-none mb-3 uppercase italic font-mono">{profile?.full_name || 'NO_NAME_SET'}</h2>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse" />
                        <span className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] font-mono italic">Live Operator Status</span>
                    </div>

                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-40 max-w-sm leading-relaxed italic">
                        Visual metadata is globally synchronized across the Trackora mesh. Verification of identity markers complete and verified.
                    </p>
                </Card>

                {/* Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <Card className="p-12 border-border bg-surface-solid shadow-2xl rounded-[56px] space-y-12 group transition-all hover:border-primary/40 duration-500">
                        <div className="flex items-center gap-6 border-b border-border pb-8">
                            <div className="w-16 h-16 rounded-2xl bg-surface-subtle border border-border flex items-center justify-center text-primary group-hover:rotate-6 transition-transform shadow-sm">
                                <User className="w-7 h-7" strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter leading-none italic font-mono">Identity Registry</h3>
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono mt-2 opacity-50">Operator Legal Designator</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-60">Full Name Mapping</label>
                                <Hash className="w-4 h-4 text-primary opacity-40" />
                            </div>
                            <input
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="OPERATOR_NAME"
                                className="w-full bg-surface-subtle border border-border rounded-3xl px-8 py-5 text-[15px] font-black font-mono text-text-primary focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-surface-solid transition-all uppercase italic shadow-inner"
                            />
                        </div>
                    </Card>

                    <Card className="p-12 border-border bg-surface-solid shadow-2xl rounded-[56px] space-y-12 group transition-all hover:border-primary/40 duration-500">
                         <div className="flex items-center gap-6 border-b border-border pb-8">
                            <div className="w-16 h-16 rounded-2xl bg-surface-subtle border border-border flex items-center justify-center text-primary group-hover:rotate-6 transition-transform shadow-sm">
                                <Smartphone className="w-7 h-7" strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter leading-none italic font-mono">Comms Terminal</h3>
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono mt-2 opacity-50">Direct Verification Vector</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                             <div className="flex items-center justify-between px-2">
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-60">Handheld Unit ID</label>
                                <Phone className="w-4 h-4 text-primary opacity-40" />
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="+1 (000) 000-0000"
                                className="w-full bg-surface-subtle border border-border rounded-3xl px-8 py-5 text-[15px] font-black font-mono text-text-primary focus:outline-none focus:ring-4 focus:ring-primary/10 focus:bg-surface-solid transition-all uppercase italic shadow-inner"
                            />
                        </div>
                    </Card>

                    <Card className="p-12 border-border bg-surface-solid shadow-2xl rounded-[56px] space-y-10 opacity-70 group hover:opacity-100 transition-opacity">
                         <div className="flex items-center gap-6 border-b border-border pb-8">
                            <div className="w-16 h-16 rounded-2xl bg-surface-subtle border border-border flex items-center justify-center text-text-muted group-hover:text-primary transition-colors shadow-sm">
                                <Mail className="w-7 h-7" strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter leading-none italic font-mono">Registry Mail</h3>
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono mt-2 opacity-50 italic">Read-Only Directive</p>
                            </div>
                        </div>

                        <div className="bg-surface-subtle rounded-3xl px-8 py-5 flex items-center gap-4 border border-border shadow-inner">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <Shield className="w-3.5 h-3.5 text-emerald-600" strokeWidth={3} />
                            </div>
                            <span className="text-[14px] font-mono font-black text-text-primary tracking-tight truncate uppercase italic">{user?.email}</span>
                        </div>
                    </Card>

                    <Card className="p-12 border-border bg-surface-solid shadow-2xl rounded-[56px] space-y-10 opacity-70 group hover:opacity-100 transition-opacity">
                         <div className="flex items-center gap-6 border-b border-border pb-8">
                            <div className="w-16 h-16 rounded-2xl bg-surface-subtle border border-border flex items-center justify-center text-text-muted group-hover:text-primary transition-colors shadow-sm">
                                <Shield className="w-7 h-7" strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter leading-none italic font-mono">Authorization</h3>
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono mt-2 opacity-50 italic">Permissions Hierarchy</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <div className="px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em] font-mono italic shadow-sm">
                                TIER: {profile?.role?.toUpperCase()}
                            </div>
                            <div className="px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black uppercase tracking-[0.3em] font-mono italic shadow-sm">
                                STATUS: VERIFIED_OP
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </PageLayout>
    );
}
