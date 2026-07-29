import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Save, User, Shield, DollarSign, Clock, 
    Info, AlertCircle, Calendar,
    Briefcase, Smartphone, Mail,
    MapPin, CreditCard, Phone, Globe2,
    Check, FolderOpen, X, Search, Plus,
    ChevronLeft, ArrowLeft, Settings2
} from 'lucide-react';
import { LoadingState, DatePicker } from '../components/ui';
import { SecureImage } from '../components/ui/SecureImage';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

type Role = 'Owner' | 'Admin' | 'Manager' | 'User' | 'Viewer';

const TAB_CONFIG = [
    { id: 'General',      label: 'General',      icon: User,        color: 'text-primary',    bg: 'bg-primary/10' },
    { id: 'Compensation', label: 'Compensation',  icon: DollarSign,  color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { id: 'Limits',       label: 'Limits',        icon: Clock,       color: 'text-amber-400',  bg: 'bg-amber-400/10' },
    { id: 'Dates',        label: 'Dates',         icon: Calendar,    color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    { id: 'Contact',      label: 'Contact',       icon: Phone,       color: 'text-blue-400',   bg: 'bg-blue-400/10' },
    { id: 'Additional',   label: 'Additional',    icon: Shield,      color: 'text-rose-400',   bg: 'bg-rose-400/10' },
    { id: 'Projects',     label: 'Projects',      icon: FolderOpen,  color: 'text-violet-400', bg: 'bg-violet-400/10' },
] as const;

type TabId = typeof TAB_CONFIG[number]['id'];

const ROLE_COLORS: Record<string, string> = {
    Owner:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    Admin:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Manager: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    User:    'bg-slate-500/15 text-slate-400 border-slate-500/30',
    Viewer:  'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

export function MemberFormPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [searchParams] = useSearchParams();
    const requestedTab = searchParams.get('tab');
    const initialTab = (TAB_CONFIG.find(t => t.id.toLowerCase() === requestedTab?.toLowerCase())?.id || 'General') as TabId;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>(initialTab);

    // Form State
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<Role>('User');
    const [payRate, setPayRate] = useState('');
    const [billRate, setBillRate] = useState('');
    const [weeklyLimit, setWeeklyLimit] = useState('40');
    const [dailyLimit, setDailyLimit] = useState('8');
    const [department, setDepartment] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [employeeType, setEmployeeType] = useState('Full-time');
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    const [email, setEmail] = useState('');
    const [osUsername, setOsUsername] = useState('');
    const [birthday, setBirthday] = useState('');
    const [hireDate, setHireDate] = useState('');
    const [terminationDate, setTerminationDate] = useState('');
    const [workAddress, setWorkAddress] = useState('');
    const [homeAddress, setHomeAddress] = useState('');
    const [personalEmail, setPersonalEmail] = useState('');
    const [workPhone, setWorkPhone] = useState('');
    const [personalPhone, setPersonalPhone] = useState('');
    const [ssn, setSsn] = useState('');
    const [emergencyContact, setEmergencyContact] = useState('');
    const [skillsNotes, setSkillsNotes] = useState('');
    const [nickname, setNickname] = useState('');
    const [idleEnabled, setIdleEnabled] = useState(true);
    const [idleLimit, setIdleLimit] = useState('10');
    const [keepIdleMode, setKeepIdleMode] = useState<'prompt' | 'always' | 'never'>('prompt');
    const [trackingEnabled, setTrackingEnabled] = useState(true);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [location, setLocation] = useState('');

    // Project assignment state
    const [allProjects, setAllProjects] = useState<{ id: string; name: string }[]>([]);
    const [assignedProjectIds, setAssignedProjectIds] = useState<Set<string>>(new Set());
    const [memberOrgId, setMemberOrgId] = useState<string | null>(null);
    const [projectSearch, setProjectSearch] = useState('');
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);

    useEffect(() => {
        if (id) {
            loadMember();
            loadProjects();
        }
    }, [id]);

    async function loadMember() {
        try {
            const { data, error: mError } = await supabase
                .from('members')
                .select('*')
                .eq('id', id)
                .single();
            if (mError) throw mError;
            if (data) {
                setFullName(data.full_name || '');
                setRole(data.role || 'User');
                setPayRate(data.pay_rate?.toString() || '');
                setBillRate(data.bill_rate?.toString() || '');
                setWeeklyLimit(data.weekly_limit?.toString() || '40');
                setDailyLimit(data.daily_limit?.toString() || '8');
                setDepartment(data.department || '');
                setEmployeeId(data.employee_id || '');
                setEmployeeType(data.employee_type || 'Full-time');
                setTimezone(data.timezone || 'UTC');
                setEmail(data.email || '');
                setOsUsername(data.os_username || '');
                setBirthday(data.birthday || '');
                setHireDate(data.hire_date || '');
                setTerminationDate(data.termination_date || '');
                setWorkAddress(data.work_address || '');
                setHomeAddress(data.home_address || '');
                setPersonalEmail(data.personal_email || '');
                setWorkPhone(data.work_phone || '');
                setPersonalPhone(data.personal_phone || '');
                setSsn(data.ssn || '');
                setEmergencyContact(data.emergency_contact || '');
                setSkillsNotes(data.skills_notes || '');
                setNickname(data.nickname || '');
                setIdleEnabled(data.idle_enabled ?? true);
                setIdleLimit(data.idle_limit?.toString() || '10');
                setKeepIdleMode(data.keep_idle_mode || 'prompt');
                setTrackingEnabled(data.tracking_enabled ?? true);
                setAvatarUrl(data.avatar_url || null);
                setLocation(data.location || '');
            }
        } catch (err: any) {
            setError('Failed to load member profile.');
        } finally {
            setLoading(false);
        }
    }

    async function loadProjects() {
        if (!id) return;
        const { data: member } = await supabase
            .from('members')
            .select('organization_id')
            .eq('id', id)
            .single();
        if (!member?.organization_id) return;
        setMemberOrgId(member.organization_id);

        const [{ data: projects }, { data: assigned }] = await Promise.all([
            supabase.from('projects').select('id, name').eq('organization_id', member.organization_id).eq('status', 'Active').order('name'),
            supabase.from('project_members').select('project_id').eq('member_id', id)
        ]);

        setAllProjects(projects || []);
        setAssignedProjectIds(new Set((assigned || []).map((r: any) => r.project_id)));
    }

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const patch = {
                full_name: fullName, role,
                pay_rate: parseFloat(payRate) || 0,
                bill_rate: parseFloat(billRate) || 0,
                weekly_limit: parseInt(weeklyLimit) || 0,
                daily_limit: parseInt(dailyLimit) || 0,
                department, employee_id: employeeId, employee_type: employeeType, timezone,
                os_username: osUsername,
                birthday: birthday || null, hire_date: hireDate || null, termination_date: terminationDate || null,
                work_address: workAddress, home_address: homeAddress, personal_email: personalEmail,
                work_phone: workPhone, personal_phone: personalPhone, ssn,
                emergency_contact: emergencyContact, skills_notes: skillsNotes, nickname,
                idle_enabled: idleEnabled, idle_limit: parseInt(idleLimit) || 10,
                keep_idle_mode: keepIdleMode, tracking_enabled: trackingEnabled, location,
            };

            const { error: sError } = await supabase.from('members').update(patch).eq('id', id);
            if (sError) throw sError;

            const currentAssigned = await supabase.from('project_members').select('project_id').eq('member_id', id);
            const currentIds = new Set((currentAssigned.data || []).map((r: any) => r.project_id));
            const toAdd = [...assignedProjectIds].filter(pid => !currentIds.has(pid));
            const toRemove = [...currentIds].filter(pid => !assignedProjectIds.has(pid));
            if (toRemove.length > 0) await supabase.from('project_members').delete().eq('member_id', id).in('project_id', toRemove);
            if (toAdd.length > 0) await supabase.from('project_members').insert(toAdd.map(pid => ({ member_id: id, project_id: pid, organization_id: memberOrgId })));

            setSaveSuccess(true);
            setTimeout(() => { setSaveSuccess(false); navigate('/dashboard/people'); }, 800);
        } catch (err: any) {
            setError('Could not save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><LoadingState message="Loading member profile..." /></div>;

    const initials = (fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const assignedProjects = allProjects.filter(p => assignedProjectIds.has(p.id));
    const unassignedProjects = allProjects.filter(p => !assignedProjectIds.has(p.id) && p.name.toLowerCase().includes(projectSearch.toLowerCase()));

    return (
        <div className="min-h-screen bg-main flex flex-col">
            {/* Top bar */}
            <div className="h-16 border-b border-border/60 flex items-center px-6 shrink-0 bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
                <button
                    onClick={() => navigate('/dashboard/people')}
                    className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mr-6 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span className="text-[12px] font-bold">Back to Members</span>
                </button>
                <div className="h-5 w-px bg-border mr-6" />
                <div className="flex items-center gap-3 flex-1">
                    <Settings2 className="w-4 h-4 text-text-muted" />
                    <span className="text-[13px] font-bold text-text-primary">Edit Member</span>
                    {fullName && <span className="text-[12px] text-text-muted">— {fullName}</span>}
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={clsx(
                        "flex items-center gap-2.5 px-6 h-10 rounded-xl text-[12px] font-bold transition-all shadow-lg text-white",
                        saveSuccess
                            ? "bg-emerald-500 shadow-emerald-500/30"
                            : "bg-primary shadow-primary/25 hover:brightness-110 active:scale-95"
                    )}
                >
                    {saving ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : saveSuccess ? (
                        <Check className="w-4 h-4" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden bg-main relative">
                {/* Subtle background glow */}
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] pointer-events-none rounded-full" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[100px] pointer-events-none rounded-full" />
                
                <div className="max-w-[1400px] w-full mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row gap-8 relative z-10 overflow-hidden">
                    {/* Floating Profile Sidebar */}
                    <aside className="w-full md:w-80 shrink-0 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {/* Member card */}
                        <div className="p-6 bg-surface/60 backdrop-blur-md border border-border/60 rounded-3xl shadow-shell-md">
                            <div className="flex flex-col items-center text-center gap-5">
                                <div className="relative group cursor-pointer">
                                    {/* Animated completeness ring */}
                                    <motion.div 
                                        className="absolute -inset-2 rounded-[1.4rem] border-2 border-dashed border-primary/30"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                    />
                                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-3xl font-black border border-primary/30 shadow-shell-md overflow-hidden relative z-10 transition-transform group-hover:scale-105">
                                        {avatarUrl ? (
                                            <SecureImage path={avatarUrl} bucket="avatars" className="w-full h-full object-cover" />
                                        ) : initials}
                                    </div>
                                    <div className={clsx("absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-lg text-[10px] font-black border tracking-[0.1em] shadow-shell-sm z-20", ROLE_COLORS[role] || ROLE_COLORS['User'])}>
                                        {role.toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[16px] font-black text-text-primary tracking-tight">{fullName || 'Unknown'}</p>
                                    <p className="text-[12px] text-text-muted font-mono mt-1 break-all opacity-80">{email}</p>
                                    {department && <p className="text-[11px] text-primary font-bold mt-2 uppercase tracking-wider">{department}</p>}
                                </div>
                                {/* Quick stats */}
                                <div className="w-full grid grid-cols-2 gap-3 mt-2">
                                    <div className="bg-surface-solid rounded-2xl px-3 py-3 text-center border border-border shadow-shell-sm">
                                        <p className="text-[18px] font-black text-text-primary">{assignedProjectIds.size}</p>
                                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Projects</p>
                                    </div>
                                    <div className="bg-surface-solid rounded-2xl px-3 py-3 text-center border border-border shadow-shell-sm">
                                        <p className="text-[18px] font-black text-text-primary">{weeklyLimit}h</p>
                                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Weekly</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tab nav */}
                        <nav className="flex-1 flex flex-col gap-1.5 bg-surface/60 backdrop-blur-md border border-border/60 rounded-3xl p-3 shadow-shell-sm">
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] px-4 py-2">Settings Configuration</p>
                            {TAB_CONFIG.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={clsx(
                                            "w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all relative group overflow-hidden",
                                            isActive
                                                ? "text-primary"
                                                : "text-text-primary/70 hover:text-text-primary hover:bg-surface-hover"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div 
                                                layoutId="activeTabBg"
                                                className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-2xl"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <div className={clsx(
                                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all relative z-10 shadow-sm",
                                            isActive ? `${tab.bg} ${tab.color} shadow-primary/20` : "bg-surface-solid border border-border text-text-muted group-hover:border-text-muted/30"
                                        )}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="relative z-10">{tab.label}</span>
                                        {isActive && (
                                            <motion.div 
                                                layoutId="activeTabIndicator"
                                                className="absolute right-4 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)] z-10" 
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Main content */}
                    <main className="flex-1 flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 pr-2">
                            <div className="max-w-3xl w-full">

                                {/* Error banner */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                            className="mb-6 flex items-center gap-3 px-5 py-4 bg-rose-500/8 border border-rose-500/20 rounded-2xl shadow-sm"
                                        >
                                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                            <p className="text-[13px] font-bold text-rose-400">{error}</p>
                                            <button onClick={() => setError(null)} className="ml-auto text-rose-400/60 hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded-md transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -15, scale: 0.98 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                        className="bg-surface/80 backdrop-blur-sm border border-border/60 rounded-[32px] p-6 md:p-10 shadow-premium relative"
                                    >
                                        {/* Decorative ambient light inside card */}
                                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[80px] pointer-events-none rounded-full" />
                                        
                                        {/* Tab header */}
                        {(() => {
                            const tab = TAB_CONFIG.find(t => t.id === activeTab)!;
                            const Icon = tab.icon;
                            return (
                                <div className="flex items-center gap-4 mb-8">
                                    <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center", tab.bg, tab.color)}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-[20px] font-black text-text-primary tracking-tight">{tab.label}</h2>
                                        <p className="text-[11px] text-text-muted font-mono">
                                            {tab.id === 'General' && 'Identity, role and employment details'}
                                            {tab.id === 'Compensation' && 'Pay rate, bill rate and financial settings'}
                                            {tab.id === 'Limits' && 'Working hours, idle detection and tracking'}
                                            {tab.id === 'Dates' && 'Hire date, birthday and important milestones'}
                                            {tab.id === 'Contact' && 'Phone, email and address information'}
                                            {tab.id === 'Additional' && 'Sensitive data and supplemental notes'}
                                            {tab.id === 'Projects' && 'Manage project associations for this member'}
                                        </p>
                                    </div>
                                </div>
                                            );
                                        })()}

                                        <div className="relative z-10">
                                            {/* ── GENERAL ── */}
                                            {activeTab === 'General' && (
                                                <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-5">
                                    <FormField label="Full Name" value={fullName} onChange={setFullName} icon={<User className="w-4 h-4" />} placeholder="Enter full name..." />
                                    <FormSelect label="Role" value={role} onChange={(v: Role) => setRole(v)} disabled={role === 'Owner'} icon={<Shield className="w-4 h-4" />}
                                        options={role === 'Owner'
                                            ? [{ label: 'Owner', value: 'Owner' }]
                                            : [{ label: 'User', value: 'User' }, { label: 'Viewer', value: 'Viewer' }, { label: 'Manager', value: 'Manager' }, { label: 'Admin', value: 'Admin' }]
                                        }
                                        description={role === 'Owner' ? "Transfer ownership from Organization Settings." : undefined}
                                    />
                                    <FormField label="Location (City/Country)" value={location} onChange={setLocation} icon={<MapPin className="w-4 h-4" />} placeholder="e.g. New York, USA" />
                                    <FormField label="Department" value={department} onChange={setDepartment} icon={<Briefcase className="w-4 h-4" />} placeholder="e.g. Engineering, Sales" />
                                    <FormField label="Employee ID" value={employeeId} onChange={setEmployeeId} icon={<Shield className="w-4 h-4" />} placeholder="e.g. EMP-101" />
                                    <FormSelect label="Employment Type" value={employeeType} onChange={setEmployeeType} icon={<Briefcase className="w-4 h-4" />}
                                        options={[{ label: 'Full-time', value: 'Full-time' }, { label: 'Part-time', value: 'Part-time' }, { label: 'Contract', value: 'Contract' }, { label: 'Intern', value: 'Intern' }]}
                                    />
                                    <FormSelect label="Timezone" value={timezone} onChange={setTimezone} icon={<Globe2 className="w-4 h-4" />}
                                        options={[
                                            { label: 'UTC', value: 'UTC' },
                                            { label: 'US Pacific (PT)', value: 'America/Los_Angeles' },
                                            { label: 'US Mountain (MT)', value: 'America/Denver' },
                                            { label: 'US Central (CT)', value: 'America/Chicago' },
                                            { label: 'US Eastern (ET)', value: 'America/New_York' },
                                            { label: 'Canada (Toronto)', value: 'America/Toronto' },
                                            { label: 'UK (London)', value: 'Europe/London' },
                                            { label: 'Europe (Paris)', value: 'Europe/Paris' },
                                            { label: 'Pakistan (PKT)', value: 'Asia/Karachi' },
                                            { label: 'India (IST)', value: 'Asia/Kolkata' },
                                            { label: 'Bangladesh (BST)', value: 'Asia/Dhaka' },
                                            { label: 'Philippines (PHT)', value: 'Asia/Manila' },
                                            { label: 'Singapore (SGT)', value: 'Asia/Singapore' },
                                            { label: 'Australia (Sydney)', value: 'Australia/Sydney' },
                                        ]}
                                    />
                                    <FormField label="Nickname / Alias" value={nickname} onChange={setNickname} icon={<User className="w-4 h-4" />} placeholder="e.g. Furq" />
                                </div>
                            </div>
                        )}

                        {/* ── COMPENSATION ── */}
                                            {activeTab === 'Compensation' && (
                                                <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-5">
                                    <FormField label="Pay Rate ($/hr)" value={payRate} onChange={setPayRate} type="number" icon={<DollarSign className="w-4 h-4" />} placeholder="0.00" />
                                    <FormField label="Bill Rate ($/hr)" value={billRate} onChange={setBillRate} type="number" icon={<DollarSign className="w-4 h-4" />} placeholder="0.00" />
                                </div>
                                <InfoBox color="emerald" icon={<Info className="w-4 h-4" />}>
                                    Pay rate is the cost to the organization. Bill rate is what is charged to the client. Used for margin analysis and financial forecasting.
                                </InfoBox>
                                                </div>
                                            )}

                                            {/* ── LIMITS ── */}
                                            {activeTab === 'Limits' && (
                                                <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-5">
                                    <FormField label="Weekly Hours Limit" value={weeklyLimit} onChange={setWeeklyLimit} type="number" icon={<Calendar className="w-4 h-4" />} placeholder="40" />
                                    <FormField label="Daily Hours Limit" value={dailyLimit} onChange={setDailyLimit} type="number" icon={<Clock className="w-4 h-4" />} placeholder="8" />
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Tracking Behavior</p>
                                    <ToggleRow
                                        label="Enable Resource Tracking"
                                        description="Desktop activity monitoring for this member"
                                        checked={trackingEnabled}
                                        onChange={setTrackingEnabled}
                                    />
                                    <ToggleRow
                                        label="Enable Idle Detection"
                                        description="Automatically pause timer on inactivity"
                                        checked={idleEnabled}
                                        onChange={setIdleEnabled}
                                    />
                                </div>

                                {idleEnabled && (
                                    <div className="grid grid-cols-2 gap-5 animate-in slide-in-from-top-2 duration-200">
                                        <FormField label="Idle Threshold (Minutes)" value={idleLimit} onChange={setIdleLimit} type="number" icon={<Clock className="w-4 h-4" />} placeholder="10" />
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-text-muted">Idle Time Handling</label>
                                            <div className="relative">
                                                <select
                                                    value={keepIdleMode}
                                                    onChange={e => setKeepIdleMode(e.target.value as any)}
                                                    className="w-full h-[52px] pl-5 pr-10 bg-surface border border-border rounded-xl text-[13px] font-bold text-text-primary outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="prompt">Prompt user each time</option>
                                                    <option value="always">Always keep idle time</option>
                                                    <option value="never">Always discard idle time</option>
                                                </select>
                                                <ChevronLeft className="w-4 h-4 text-text-muted absolute right-4 top-1/2 -translate-y-1/2 -rotate-90 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                                                            </div>
                                            )}

                                            {/* ── DATES ── */}
                                            {activeTab === 'Dates' && (
                                                <div className="grid grid-cols-2 gap-6">
                                <FormField label="Hire Date" value={hireDate} onChange={setHireDate} type="date" icon={<Calendar className="w-4 h-4" />} />
                                <FormField label="Termination Date" value={terminationDate} onChange={setTerminationDate} type="date" icon={<Calendar className="w-4 h-4" />} />
                                <FormField label="Date of Birth" value={birthday} onChange={setBirthday} type="date" icon={<Calendar className="w-4 h-4" />} />
                                <FormField label="OS Username" value={osUsername} onChange={setOsUsername} icon={<User className="w-4 h-4" />} placeholder="e.g. furqan_s" />
                                                </div>
                                            )}

                                            {/* ── CONTACT ── */}
                                            {activeTab === 'Contact' && (
                                                <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-5">
                                    <FormField label="Work Phone" value={workPhone} onChange={setWorkPhone} icon={<Smartphone className="w-4 h-4" />} placeholder="+1 (000) 000-0000" />
                                    <FormField label="Personal Phone" value={personalPhone} onChange={setPersonalPhone} icon={<Phone className="w-4 h-4" />} placeholder="+1 (000) 000-0000" />
                                    <FormField label="Personal Email" value={personalEmail} onChange={setPersonalEmail} icon={<Mail className="w-4 h-4" />} placeholder="personal@example.com" />
                                </div>
                                <FormField label="Work Address" value={workAddress} onChange={setWorkAddress} icon={<MapPin className="w-4 h-4" />} placeholder="Enter work address..." />
                                <FormField label="Home Address" value={homeAddress} onChange={setHomeAddress} icon={<MapPin className="w-4 h-4" />} placeholder="Enter home address..." />
                                                </div>
                                            )}

                                            {/* ── ADDITIONAL ── */}
                                            {activeTab === 'Additional' && (
                                                <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-5">
                                    <FormField label="SSN" value={ssn} onChange={setSsn} type="password" icon={<CreditCard className="w-4 h-4" />} placeholder="XXX-XX-XXXX" />
                                    <FormField label="Emergency Contact" value={emergencyContact} onChange={setEmergencyContact} icon={<Phone className="w-4 h-4" />} placeholder="Name and number..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-text-muted">Skills &amp; Notes</label>
                                    <textarea
                                        value={skillsNotes}
                                        onChange={e => setSkillsNotes(e.target.value)}
                                        placeholder="Skills, performance notes, observations..."
                                        className="w-full px-5 py-4 bg-surface border border-border rounded-xl text-[13px] font-bold text-text-primary outline-none focus:border-primary focus:ring-4 focus:ring-primary/8 transition-all min-h-[140px] resize-none placeholder:text-slate-400"
                                    />
                                </div>
                                                </div>
                                            )}

                                            {/* ── PROJECTS ── */}
                                            {activeTab === 'Projects' && (
                                                <div className="space-y-8">
                                {/* Assigned chips */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Assigned Projects</label>
                                        <span className="text-[11px] font-bold text-text-muted">{assignedProjectIds.size} assigned</span>
                                    </div>
                                    {assignedProjects.length === 0 ? (
                                        <div className="flex items-center gap-3 px-5 py-5 rounded-2xl border border-dashed border-border/60 text-text-muted">
                                            <FolderOpen className="w-4 h-4 opacity-30" />
                                            <span className="text-[12px] font-bold opacity-40">No projects assigned yet — search below to add one</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 p-4 bg-surface-hover/50 border border-border/40 rounded-2xl min-h-[60px]">
                                            {assignedProjects.map(p => (
                                                <div key={p.id} className="flex items-center gap-2 pl-3.5 pr-2 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-xl text-[12px] font-bold group">
                                                    <FolderOpen className="w-3 h-3 shrink-0" />
                                                    <span>{p.name}</span>
                                                    <button
                                                        onClick={() => { const next = new Set(assignedProjectIds); next.delete(p.id); setAssignedProjectIds(next); }}
                                                        className="w-4 h-4 rounded-full hover:bg-primary/30 flex items-center justify-center transition-all"
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Search to add */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Add Project</label>
                                    <div className="relative">
                                        <div className="flex items-center gap-3 px-4 h-[52px] bg-surface border border-border rounded-xl focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/8 transition-all">
                                            <Search className="w-4 h-4 text-text-muted shrink-0" />
                                            <input
                                                type="text"
                                                placeholder={allProjects.length === assignedProjects.length ? "All projects assigned" : "Type to search projects..."}
                                                value={projectSearch}
                                                disabled={allProjects.length === assignedProjects.length}
                                                onChange={e => { setProjectSearch(e.target.value); setShowProjectDropdown(true); }}
                                                onFocus={() => setShowProjectDropdown(true)}
                                                onBlur={() => setTimeout(() => setShowProjectDropdown(false), 150)}
                                                className="flex-1 bg-transparent text-[13px] font-bold text-text-primary placeholder:text-text-muted outline-none disabled:opacity-40"
                                            />
                                            {projectSearch && <button onClick={() => setProjectSearch('')}><X className="w-3.5 h-3.5 text-text-muted hover:text-text-primary" /></button>}
                                        </div>
                                        {showProjectDropdown && unassignedProjects.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                                                {unassignedProjects.map(p => (
                                                    <button
                                                        key={p.id}
                                                        onMouseDown={() => { const next = new Set(assignedProjectIds); next.add(p.id); setAssignedProjectIds(next); setProjectSearch(''); setShowProjectDropdown(false); }}
                                                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover transition-all text-left group"
                                                    >
                                                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                            <FolderOpen className="w-3.5 h-3.5 text-primary" />
                                                        </div>
                                                        <span className="text-[12px] font-bold text-text-primary flex-1">{p.name}</span>
                                                        <Plus className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {showProjectDropdown && projectSearch && unassignedProjects.length === 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-2xl shadow-xl z-50 px-4 py-4">
                                                <p className="text-[12px] font-bold text-text-muted">No matching unassigned projects</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}

function FormField({ label, value, onChange, type = 'text', icon, placeholder }: any) {
    return (
        <div className="space-y-2 group flex flex-col relative">
            <label className="text-[11px] font-bold text-text-muted transition-colors group-focus-within:text-primary tracking-[0.05em] ml-1">{label}</label>
            <div className="relative mt-auto">
                {type === 'date' ? (
                    <DatePicker value={value} onChange={onChange} className="w-full h-[56px] shadow-shell-sm" />
                ) : (
                    <>
                        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors pointer-events-none z-10">{icon}</div>}
                        <input
                            type={type}
                            value={value || ''}
                            onChange={e => onChange(e.target.value)}
                            placeholder={placeholder}
                            className={clsx(
                                "w-full h-[56px] bg-surface-solid border border-border rounded-2xl text-[14px] font-bold text-text-primary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-shell-sm placeholder:text-text-muted/40",
                                icon ? "pl-12 pr-4" : "px-4"
                            )}
                        />
                        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent group-focus-within:ring-primary/20 pointer-events-none transition-all" />
                    </>
                )}
            </div>
        </div>
    );
}

function FormSelect({ label, value, onChange, options, disabled, icon, description }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const activeLabel = options.find((o: any) => o.value === value)?.label || value;

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="space-y-2 group flex flex-col relative">
            <label className="text-[11px] font-bold text-text-muted tracking-[0.05em] ml-1">{label}</label>
            <div className="relative mt-auto">
                <div
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={clsx(
                        "w-full h-[56px] bg-surface-solid border rounded-2xl text-[14px] font-bold text-text-primary outline-none transition-all flex items-center cursor-pointer select-none shadow-shell-sm",
                        icon ? "pl-12 pr-12" : "px-4 pr-12",
                        isOpen ? "border-primary ring-4 ring-primary/10" : "border-border hover:border-text-muted/30",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {icon && <div className={clsx("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", isOpen ? "text-primary" : "text-text-muted")}>{icon}</div>}
                    <span className="truncate">{activeLabel}</span>
                    <ChevronLeft className={clsx("w-5 h-5 text-text-muted absolute right-4 top-1/2 -translate-y-1/2 transition-transform duration-300 pointer-events-none", isOpen ? "-rotate-90 text-primary" : "-rotate-90")} />
                    <div className={clsx("absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent pointer-events-none transition-all", isOpen && "ring-primary/20")} />
                </div>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-[calc(100%+8px)] left-0 w-full bg-surface border border-border rounded-2xl shadow-premium z-[100] flex flex-col p-2 max-h-[260px] overflow-y-auto custom-scrollbar"
                        >
                            {options.map((opt: any) => (
                                <div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                    className={clsx("flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all text-[13px] font-bold group/item",
                                        value === opt.value ? "bg-primary/10 text-primary" : "text-text-primary hover:bg-surface-hover hover:text-primary"
                                    )}>
                                    {opt.label}
                                    {value === opt.value && <Check className="w-4 h-4 text-primary" />}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {description && <p className="text-[10px] font-semibold text-text-muted italic ml-1">{description}</p>}
        </div>
    );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div 
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between px-6 py-5 bg-surface-solid border border-border/80 rounded-2xl hover:border-text-muted/30 transition-all cursor-pointer shadow-shell-sm group"
        >
            <div>
                <p className="text-[14px] font-bold text-text-primary transition-colors group-hover:text-primary">{label}</p>
                <p className="text-[12px] font-medium text-text-muted mt-1">{description}</p>
            </div>
            <div className={clsx("relative w-12 h-7 rounded-full transition-colors duration-300 shrink-0 ml-4 shadow-inner", checked ? 'bg-primary' : 'bg-surface-hover border border-border')}>
                <motion.div 
                    layout
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                    className={clsx("absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-md", checked ? 'left-[23px]' : 'left-[3px]')} 
                />
            </div>
        </div>
    );
}

function InfoBox({ children, color, icon }: { children: React.ReactNode; color: string; icon: React.ReactNode }) {
    const styles: Record<string, string> = {
        emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
        amber:   'bg-amber-500/10 border-amber-500/20 text-amber-500',
        blue:    'bg-blue-500/10 border-blue-500/20 text-blue-500',
    };
    return (
        <div className={clsx("flex items-start gap-4 p-5 rounded-2xl border shadow-sm", styles[color] || styles.blue)}>
            <div className="shrink-0 mt-0.5 bg-white/10 p-2 rounded-xl backdrop-blur-sm shadow-sm">{icon}</div>
            <p className="text-[13px] leading-relaxed font-semibold">{children}</p>
        </div>
    );
}
