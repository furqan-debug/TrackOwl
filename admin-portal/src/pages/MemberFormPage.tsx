import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    ChevronLeft, Save, 
    User, Shield, DollarSign, Clock, 
    Info, AlertCircle, Calendar,
    Briefcase, Smartphone, Mail,
    MapPin, CreditCard, Phone
} from 'lucide-react';
import { 
    Button, 
    Card, 
    PageLayout, 
    LoadingState,
    StatusBadge
} from '../components/ui';
import clsx from 'clsx';

type Role = 'Admin' | 'Manager' | 'User' | 'Viewer';

export function MemberFormPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'General' | 'Compensation' | 'Limits' | 'Dates' | 'Contact' | 'Additional'>('General');

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
    const [timezone, setTimezone] = useState('UTC');
    const [email, setEmail] = useState('');
    
    // Missing Fields State
    const [computerUsername, setComputerUsername] = useState('');
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
    const [idleDetection, setIdleDetection] = useState(false);
    const [idleTimeout, setIdleTimeout] = useState('5');
    const [enableTracking, setEnableTracking] = useState(true);

    useEffect(() => {
        if (id) loadMember();
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
                
                // Load Restored Fields
                setComputerUsername(data.computer_username || '');
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
                setIdleDetection(data.idle_detection ?? false);
                setIdleTimeout(data.idle_timeout?.toString() || '5');
                setEnableTracking(data.enable_tracking ?? true);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const patch = {
                full_name: fullName,
                role,
                pay_rate: parseFloat(payRate) || 0,
                bill_rate: parseFloat(billRate) || 0,
                weekly_limit: parseInt(weeklyLimit) || 0,
                daily_limit: parseInt(dailyLimit) || 0,
                department,
                employee_id: employeeId,
                employee_type: employeeType,
                timezone,
                
                // Save Restored Fields
                computer_username: computerUsername,
                birthday: birthday || null,
                hire_date: hireDate || null,
                termination_date: terminationDate || null,
                work_address: workAddress,
                home_address: homeAddress,
                personal_email: personalEmail,
                work_phone: workPhone,
                personal_phone: personalPhone,
                ssn: ssn,
                emergency_contact: emergencyContact,
                skills_notes: skillsNotes,
                nickname: nickname,
                idle_detection: idleDetection,
                idle_timeout: parseInt(idleTimeout) || 5,
                enable_tracking: enableTracking,
            };

            const { error: sError } = await supabase
                .from('members')
                .update(patch)
                .eq('id', id);

            if (sError) throw sError;
            navigate('/dashboard/people');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><LoadingState message="Retrieving member profile..." /></div>;

    const tabs = ['General', 'Compensation', 'Limits', 'Dates', 'Contact', 'Additional'] as const;

    return (
        <PageLayout
            title="Edit Member"
            description="Manage identity, access control, and workspace parameters"
            backButton={{ onClick: () => navigate('/dashboard/people'), label: 'Back to Members' }}
            actions={
                <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={saving}
                    leftIcon={<Save className="w-5 h-5" />}
                    className="px-10 shadow-lg shadow-primary/20"
                >
                    Save Changes
                </Button>
            }
        >
            <div className="max-w-4xl mx-auto pb-20">
                <div className="flex bg-surface-subtle p-1.5 rounded-2xl border border-border w-fit mb-10 shadow-sm overflow-x-auto custom-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={clsx(
                                "px-6 py-2.5 text-[10px] font-bold rounded-xl transition-all uppercase tracking-widest whitespace-nowrap",
                                activeTab === tab ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'General' && (
                        <Card className="p-10 border-border/60 shadow-sm overflow-visible">
                            <div className="flex items-center gap-6 mb-10 pb-10 border-b border-border/40">
                                <div className="w-20 h-20 rounded-[28px] bg-primary/5 flex items-center justify-center text-primary text-2xl font-bold border border-primary/10 shadow-inner">
                                    {(fullName || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-text-primary tracking-tight mb-1">{fullName || 'Unknown Member'}</h3>
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono">{email}</p>
                                </div>
                                <StatusBadge variant={role === 'Admin' ? 'success' : 'default'}>{role.toUpperCase()}</StatusBadge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                                <FormField
                                    label="Full Identity"
                                    value={fullName}
                                    onChange={setFullName}
                                    icon={<User className="w-4 h-4" />}
                                    placeholder="Enter full name..."
                                />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Access Protocol (Role)</label>
                                    <div className="relative group">
                                        <select
                                            value={role}
                                            onChange={e => setRole(e.target.value as Role)}
                                            className="w-full px-6 py-4 bg-surface-subtle border border-border rounded-xl text-sm font-bold text-text-primary outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                                        >
                                            {['User', 'Viewer', 'Manager', 'Admin'].map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        <ChevronLeft className="w-4 h-4 text-primary absolute right-6 top-1/2 -translate-y-1/2 -rotate-90 pointer-events-none group-hover:scale-110 transition-transform" />
                                    </div>
                                </div>
                                <FormField
                                    label="Department / Sector"
                                    value={department}
                                    onChange={setDepartment}
                                    icon={<Briefcase className="w-4 h-4" />}
                                    placeholder="e.g. Engineering, Sales..."
                                />
                                <FormField
                                    label="Employment ID"
                                    value={employeeId}
                                    onChange={setEmployeeId}
                                    icon={<Shield className="w-4 h-4" />}
                                    placeholder="e.g. EMP-101..."
                                />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Employment Type</label>
                                    <select
                                        value={employeeType}
                                        onChange={e => setEmployeeType(e.target.value)}
                                        className="w-full px-6 py-4 bg-surface-subtle border border-border rounded-xl text-sm font-bold text-text-primary outline-none focus:border-primary transition-all appearance-none"
                                    >
                                        {['Full-time', 'Part-time', 'Contract', 'Intern'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Timezone Context</label>
                                    <select
                                        value={timezone}
                                        onChange={e => setTimezone(e.target.value)}
                                        className="w-full px-6 py-4 bg-surface-subtle border border-border rounded-xl text-sm font-bold text-text-primary outline-none focus:border-primary transition-all appearance-none"
                                    >
                                        <option value="UTC">Universal Time (UTC)</option>
                                        <option value="Asia/Kolkata">India (GMT+5:30)</option>
                                        <option value="America/New_York">New York (EST)</option>
                                        <option value="Europe/London">London (GMT)</option>
                                    </select>
                                </div>
                                <FormField
                                    label="Nickname / Alias"
                                    value={nickname}
                                    onChange={setNickname}
                                    icon={<User className="w-4 h-4" />}
                                    placeholder="e.g. Furq..."
                                />
                            </div>
                        </Card>
                    )}

                    {activeTab === 'Compensation' && (
                        <Card className="p-10 border-border/60 shadow-sm">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-text-primary tracking-tight">Compensation Model</h3>
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest font-mono">Hourly rates and resource valuation</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <FormField
                                        label="Pay Rate ($/hr)"
                                        value={payRate}
                                        onChange={setPayRate}
                                        type="number"
                                        icon={<DollarSign className="w-4 h-4" />}
                                        placeholder="0.00"
                                    />
                                    <FormField
                                        label="Bill Rate ($/hr)"
                                        value={billRate}
                                        onChange={setBillRate}
                                        type="number"
                                        icon={<DollarSign className="w-4 h-4" />}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-8 flex items-start gap-5">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
                                        <Info className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs text-text-muted leading-relaxed font-medium">
                                        The pay rate reflects the cost of the resource to the organization, while the bill rate is what is charged to the client. These values are used for margin analysis and financial forecasting.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'Limits' && (
                        <div className="space-y-8">
                            <Card className="p-10 border-border/60 shadow-sm">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary tracking-tight">Working Boundaries</h3>
                                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest font-mono">Time thresholds and activity limits</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <FormField
                                            label="Weekly Boundary (Hrs)"
                                            value={weeklyLimit}
                                            onChange={setWeeklyLimit}
                                            type="number"
                                            icon={<Calendar className="w-4 h-4" />}
                                            placeholder="40"
                                        />
                                        <FormField
                                            label="Daily Boundary (Hrs)"
                                            value={dailyLimit}
                                            onChange={setDailyLimit}
                                            type="number"
                                            icon={<Clock className="w-4 h-4" />}
                                            placeholder="8"
                                        />
                                    </div>
                                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-8 flex items-start gap-5">
                                        <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <p className="text-xs text-text-muted leading-relaxed font-medium">
                                            System thresholds ensure resources do not exceed their allocated capacity. Managers will be notified if a resource approaches their boundary limits.
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-10 border-border/60 shadow-sm">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Smartphone className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary tracking-tight">Tracking Control</h3>
                                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest font-mono">Behavioral monitoring and idle detection</p>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="flex items-center justify-between p-6 bg-surface-subtle border border-border rounded-2xl">
                                        <div>
                                            <label className="text-sm font-bold text-text-primary block">Resource Tracking</label>
                                            <p className="text-[11px] text-text-muted font-medium mt-1">Enable desktop activity monitoring for this resource</p>
                                        </div>
                                        <button
                                            onClick={() => setEnableTracking(!enableTracking)}
                                            className={clsx(
                                                "relative w-12 h-6 rounded-full transition-all duration-300",
                                                enableTracking ? 'bg-primary' : 'bg-border'
                                            )}
                                        >
                                            <div className={clsx(
                                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                                enableTracking ? 'left-7' : 'left-1'
                                            )} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-6 bg-surface-subtle border border-border rounded-2xl">
                                        <div>
                                            <label className="text-sm font-bold text-text-primary block">Idle Detection</label>
                                            <p className="text-[11px] text-text-muted font-medium mt-1">Automatically stop timer when inactivity is detected</p>
                                        </div>
                                        <button
                                            onClick={() => setIdleDetection(!idleDetection)}
                                            className={clsx(
                                                "relative w-12 h-6 rounded-full transition-all duration-300",
                                                idleDetection ? 'bg-primary' : 'bg-border'
                                            )}
                                        >
                                            <div className={clsx(
                                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                                idleDetection ? 'left-7' : 'left-1'
                                            )} />
                                        </button>
                                    </div>

                                    {idleDetection && (
                                        <div className="animate-in slide-in-from-top-4 duration-300">
                                            <FormField
                                                label="Idle Threshold (Minutes)"
                                                value={idleTimeout}
                                                onChange={setIdleTimeout}
                                                type="number"
                                                icon={<Clock className="w-4 h-4" />}
                                                placeholder="5"
                                            />
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'Dates' && (
                        <Card className="p-10 border-border/60 shadow-sm">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-text-primary tracking-tight">Temporal Milestones</h3>
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest font-mono">Employment lifecycle and personal dates</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                                <FormField
                                    label="Hire Date"
                                    value={hireDate}
                                    onChange={setHireDate}
                                    type="date"
                                    icon={<Calendar className="w-4 h-4" />}
                                />
                                <FormField
                                    label="Termination Date"
                                    value={terminationDate}
                                    onChange={setTerminationDate}
                                    type="date"
                                    icon={<Calendar className="w-4 h-4" />}
                                />
                                <FormField
                                    label="Date of Birth"
                                    value={birthday}
                                    onChange={setBirthday}
                                    type="date"
                                    icon={<Calendar className="w-4 h-4" />}
                                />
                                <FormField
                                    label="Workstation OS Username"
                                    value={computerUsername}
                                    onChange={setComputerUsername}
                                    icon={<User className="w-4 h-4" />}
                                    placeholder="e.g. furqan_s..."
                                />
                            </div>
                        </Card>
                    )}

                    {activeTab === 'Contact' && (
                        <Card className="p-10 border-border/60 shadow-sm">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-text-primary tracking-tight">Contact Matrix</h3>
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest font-mono">Communication channels and physical locations</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                                <FormField
                                    label="Work Phone"
                                    value={workPhone}
                                    onChange={setWorkPhone}
                                    icon={<Smartphone className="w-4 h-4" />}
                                    placeholder="+1 (000) 000-0000"
                                />
                                <FormField
                                    label="Personal Phone"
                                    value={personalPhone}
                                    onChange={setPersonalPhone}
                                    icon={<Smartphone className="w-4 h-4" />}
                                    placeholder="+1 (000) 000-0000"
                                />
                                <FormField
                                    label="Personal / Alternative Email"
                                    value={personalEmail}
                                    onChange={setPersonalEmail}
                                    icon={<Mail className="w-4 h-4" />}
                                    placeholder="personal@example.com"
                                />
                                <div className="md:col-span-2 space-y-6">
                                    <FormField
                                        label="Professional Work Address"
                                        value={workAddress}
                                        onChange={setWorkAddress}
                                        icon={<MapPin className="w-4 h-4" />}
                                        placeholder="Enter work location..."
                                    />
                                    <FormField
                                        label="Primary Residential Address"
                                        value={homeAddress}
                                        onChange={setHomeAddress}
                                        icon={<MapPin className="w-4 h-4" />}
                                        placeholder="Enter home address..."
                                    />
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'Additional' && (
                        <Card className="p-10 border-border/60 shadow-sm">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-text-primary tracking-tight">Legacy & Metadata</h3>
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest font-mono">Sensitive identification and supplemental data</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                                <FormField
                                    label="Social Security Number (SSN)"
                                    value={ssn}
                                    onChange={setSsn}
                                    type="password"
                                    icon={<CreditCard className="w-4 h-4" />}
                                    placeholder="XXX-XX-XXXX"
                                />
                                <FormField
                                    label="Emergency Contact Info"
                                    value={emergencyContact}
                                    onChange={setEmergencyContact}
                                    icon={<Phone className="w-4 h-4" />}
                                    placeholder="Name and Phone Number..."
                                />
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Professional Skills & Observations</label>
                                    <textarea
                                        value={skillsNotes}
                                        onChange={e => setSkillsNotes(e.target.value)}
                                        placeholder="Enter notes, skill sets, or performance observations..."
                                        className="w-full px-6 py-4 bg-surface-subtle border border-border rounded-xl text-sm font-bold text-text-primary outline-none focus:border-primary transition-all min-h-[150px] resize-none"
                                    />
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {error && (
                    <div className="mt-8 bg-rose-500/5 border border-rose-500/10 p-6 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-4">
                        <AlertCircle className="w-6 h-6 text-rose-500" />
                        <p className="text-xs font-bold text-rose-600 uppercase tracking-widest font-mono">{error}</p>
                    </div>
                )}
            </div>
        </PageLayout>
    );
}

function FormField({ label, value, onChange, type = 'text', icon, placeholder }: any) {
    return (
        <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1 transition-colors group-focus-within:text-primary">{label}</label>
            <div className="relative">
                {icon && (
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={clsx(
                        "w-full py-4 bg-surface-subtle border border-border rounded-2xl text-sm font-bold text-text-primary outline-none focus:border-primary transition-all placeholder:opacity-40",
                        icon ? "pl-14 pr-6" : "px-6"
                    )}
                />
            </div>
        </div>
    );
}
