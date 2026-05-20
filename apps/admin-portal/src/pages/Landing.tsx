import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ChevronRight,
    Check,
    Monitor,
    Clock,
    Camera,
    Quote,
    TrendingUp,
    Users,
    BarChart3,
    Download,
    Globe,
    Briefcase,
    Plus,
    Minus,
    Heart,
    ShoppingCart,
    CreditCard,
    GraduationCap,
    Palette,
    MessageSquare
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import LogoIcon from '../assets/branding/3.svg';
import DashboardPreview from '../assets/branding/dashboard-preview.png';
import DesktopPreview from '../assets/branding/desktop-preview.png';
import JasonAvatar from '../assets/branding/jason.png';
import ElenaAvatar from '../assets/branding/elena.png';
import SarahAvatar from '../assets/branding/sarah.png';
import MarcusAvatar from '../assets/branding/marcus.png';
import DavidAvatar from '../assets/branding/david.png';
import VisualProofImg from '../assets/branding/visual-proof.png';

export function Landing() {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMonthly, setIsMonthly] = useState(false);
    const [activeOS, setActiveOS] = useState<'win' | 'mac'>('win');

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('mac os')) {
            setActiveOS('mac');
        } else {
            setActiveOS('win');
        }
    }, []);

    const testimonials = [
        {
            savings: "Saved $15,200",
            quote: "TrackOwl paid for itself within the first 48 hours. We identified massive resource leaks in our development cycle.",
            author: "Jason Riva",
            role: "COO",
            company: "NexaSystems",
            avatar: JasonAvatar
        },
        {
            savings: "+22% efficiency",
            quote: "No more status meetings. We monitor the workflow and jump in only when needed. Billable hours have never been tracked more accurately.",
            author: "Elena Moretti",
            role: "Director",
            company: "PixelPerfect",
            avatar: ElenaAvatar
        },
        {
            savings: "100% trust",
            quote: "Our team members feel secure knowing their hard work is recorded fairly. It has eliminated all friction related to micromanagement.",
            author: "Sarah Jenkins",
            role: "Head of HR",
            company: "GlobalLink",
            avatar: SarahAvatar
        },
        {
            savings: "Saved $8,500/mo",
            quote: "We recovered billable hours that previously went uncaptured. Our monthly revenue increased immediately.",
            author: "Marcus Thorne",
            role: "CFO",
            company: "Titan Logistics",
            avatar: MarcusAvatar
        },
        {
            savings: "12 hrs/wk saved",
            quote: "Automating timesheet verification has freed our HR team to focus on high-level strategic work.",
            author: "David Chen",
            role: "CTO",
            company: "NexaFlow",
            avatar: DavidAvatar
        }
    ];

    const plans = [
        {
            name: 'Basic',
            price: isMonthly ? '$3.99' : '$2.99',
            period: '/seat/mo',
            description: 'Essential tracking tools for small teams and solo founders.',
            features: [
                'Manual time tracking',
                'Timesheet reporting',
                'Unlimited projects',
                'Unlimited teams'
            ],
            buttonLabel: 'Get started',
            popular: false
        },
        {
            name: 'Premium',
            price: isMonthly ? '$6.99' : '$4.99',
            period: '/seat/mo',
            description: 'The complete toolkit for modern teams seeking absolute transparency.',
            features: [
                'Everything in Basic',
                'Automatic time tracking',
                'Activity screenshots',
                'App & URL tracking',
                'Unlimited storage',
                'Smart idle detection',
                'Advanced reporting access'
            ],
            buttonLabel: 'Get started free',
            popular: true
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            description: 'Tailored solutions for large-scale operations and high-security needs.',
            features: [
                'Everything in Premium',
                'Dedicated account manager',
                'SLAs & dedicated hosting',
                'Advanced security (SAML)',
                'White-label options'
            ],
            buttonLabel: 'Talk to sales',
            popular: false
        }
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-main)] font-sans text-[var(--text-main)] selection:bg-primary/20 selection:text-primary overflow-x-hidden relative">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay" />
            </div>

            {/* Navigation */}
            <header className={twMerge(
                "fixed top-0 left-0 right-0 z-[100] transition-all duration-500 border-b",
                isScrolled
                    ? "bg-[var(--bg-main)]/80 backdrop-blur-xl border-[var(--border-color)] py-3 shadow-premium"
                    : "bg-transparent border-transparent py-6"
            )}>
                <nav className="mx-auto flex max-w-7xl h-20 items-center justify-between px-6 md:px-10 relative">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative w-48 h-full flex items-center cursor-pointer group"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <div className="absolute top-1/2 -translate-y-1/2 flex h-40 w-40 items-center justify-center transition-all duration-300 group-hover:scale-[1.05]">
                            <img src={LogoIcon} alt="TrackOwl" className="w-full h-full object-contain" />
                        </div>
                    </motion.div>

                    <div className="hidden lg:flex items-center gap-1 p-1 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-full shadow-shell-sm">
                        <NavButton href="#how-it-works">Features</NavButton>
                        <NavButton href="#pricing">Pricing</NavButton>
                        <NavButton href="#faq">FAQ</NavButton>
                        <NavButton href="#download">Download</NavButton>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="hidden sm:block text-[11px] font-bold tracking-widest text-[var(--text-secondary)] hover:text-primary transition-all px-4"
                        >
                            Log in
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-6 py-2.5 bg-primary text-white text-[11px] font-bold tracking-widest rounded-full shadow-glow-primary hover:brightness-110 active:scale-95 transition-all"
                        >
                            Build your workspace
                        </button>
                    </div>
                </nav>
            </header>
 
            <main className="relative z-10">
                {/* Hero Section */}
                <section className="relative min-h-[90vh] flex items-center justify-center pt-48 pb-20 overflow-hidden">
                    <div className="mx-auto max-w-7xl px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                        {/* Left Column: Content */}
                        <div className="col-span-12 lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left pr-0 lg:pr-6">
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                                className="text-[#D4AF37] text-[10px] font-bold tracking-[0.25em] mb-4"
                            >
                                Workforce analytics & insights
                            </motion.div>
 
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                                className="text-4xl sm:text-5xl lg:text-[46px] xl:text-[54px] font-black tracking-tight leading-[1.08] mb-6 text-[var(--text-main)]"
                            >
                                Stop losing <br className="hidden lg:block" />
                                <span className="text-[#D4AF37]">billable</span> hours with <br className="hidden lg:block" />
                                TrackOwl.
                            </motion.h1>
 
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="text-base md:text-lg font-medium text-[var(--text-secondary)] leading-relaxed mb-8 max-w-md"
                            >
                                The smart time tracking solution for modern teams, enabling <span className="text-primary font-bold border-b border-primary/20 pb-0.5">transparent processes</span> and <span className="text-primary font-bold border-b border-primary/20 pb-0.5">better project outcomes</span>.
                            </motion.p>
 
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
                            >
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="w-full sm:w-auto px-7 py-3.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#001B4D] text-[11px] font-black tracking-widest rounded-full shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group"
                                >
                                    Start your free trial
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button
                                    onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="w-full sm:w-auto px-7 py-3.5 bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-main)] text-[11px] font-black tracking-widest rounded-full hover:bg-[var(--bg-surface-hover)] hover:border-primary/20 transition-all active:scale-95 shadow-shell-sm flex items-center justify-center gap-2 group"
                                >
                                    Take a tour
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </motion.div>
 
                            {/* Trusted by industries */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.8, delay: 0.5 }}
                                className="mt-12 w-full pt-8 border-t border-[var(--border-color)]/60 text-center lg:text-left"
                            >
                                <span className="text-[9px] md:text-[10px] font-bold tracking-[0.25em] text-[var(--text-muted)] block mb-6">
                                    Trusted by teams across industries
                                </span>
                                <div className="grid grid-cols-5 gap-y-6 gap-x-2 md:gap-x-4">
                                    {[
                                        { name: 'SaaS/tech', icon: Monitor },
                                        { name: 'Healthcare', icon: Heart },
                                        { name: 'eCommerce', icon: ShoppingCart },
                                        { name: 'FinTech', icon: CreditCard },
                                        { name: 'Education', icon: GraduationCap },
                                        { name: 'Marketing', icon: TrendingUp },
                                        { name: 'Design', icon: Palette },
                                        { name: 'Agency', icon: Briefcase },
                                        { name: 'Consulting', icon: MessageSquare },
                                        { name: 'Nonprofit', icon: Globe }
                                    ].map((ind, i) => {
                                        const Icon = ind.icon;
                                        return (
                                            <div key={i} className="flex flex-col items-center justify-center gap-2 group/ind">
                                                <Icon className="w-5 h-5 text-[var(--text-muted)] group-hover/ind:text-primary transition-all duration-300" strokeWidth={1.7} />
                                                <span className="text-[10px] font-medium text-[var(--text-secondary)] whitespace-nowrap tracking-wide">{ind.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </div>

                        {/* Right Column: Image */}
                        <div className="col-span-12 lg:col-span-6 w-full flex justify-center items-center mt-12 lg:mt-0">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="relative w-full max-w-2xl lg:max-w-none px-4 mockup-3d-container"
                            >
                                {/* Main Admin Dashboard Image */}
                                <div className="relative rounded-[2.5rem] border-[8px] border-[var(--bg-surface)] shadow-premium overflow-hidden mockup-3d-card group">
                                    <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none z-10" />
                                    <img
                                        src={DashboardPreview}
                                        alt="TrackOwl Interface"
                                        className="w-full h-auto block transition-transform duration-1000 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 border border-white/10 rounded-[2rem] pointer-events-none z-20" />
                                </div>

                                {/* Floating Desktop App Image */}
                                <div className="absolute -left-4 md:-left-8 -bottom-10 w-[38%] max-w-[200px] rounded-[1.8rem] border-[6px] border-[var(--bg-surface)] shadow-premium overflow-hidden mockup-desktop-float z-30 group/desktop">
                                    <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none z-10" />
                                    <img
                                        src={DesktopPreview}
                                        alt="TrackOwl Desktop App"
                                        className="w-full h-auto block transition-transform duration-1000 group-hover/desktop:scale-105"
                                    />
                                    <div className="absolute inset-0 border border-white/15 rounded-[1.4rem] pointer-events-none z-20" />
                                </div>

                                {/* Floating decorative elements */}
                                <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/20 blur-[60px] rounded-full animate-pulse pointer-events-none" />
                                <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-primary/10 blur-[80px] rounded-full animate-pulse pointer-events-none" style={{ animationDelay: '1.5s' }} />
                            </motion.div>
                        </div>
                    </div>
                </section>


                {/* Features Bento Grid */}
                <section id="how-it-works" className="py-32 bg-[var(--bg-main)]">
                    <div className="mx-auto max-w-7xl px-6 md:px-10">
                        <div className="text-center max-w-3xl mx-auto mb-20">
                            <h2 className="text-[var(--text-muted)] text-[11px] font-bold tracking-[0.3em] mb-4">Precision engineering</h2>
                            <h3 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Everything you need, <br /> <span className="text-primary italic">nothing you don't.</span></h3>
                            <p className="text-[var(--text-secondary)] text-lg font-medium">We built TrackOwl to solve the visibility problem without the Big Brother baggage.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            {/* Main Feature - Bento Large */}
                            <div className="md:col-span-8 group relative overflow-hidden rounded-[2.5rem] bg-[var(--bg-surface)] border border-[var(--border-color)] p-10 md:p-14 shadow-soft hover:border-primary/30 transition-all duration-500">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/10 transition-colors" />
                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <div className="space-y-6">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-primary flex items-center justify-center text-white shadow-glow-primary">
                                            <Clock size={32} />
                                        </div>
                                        <div>
                                            <h4 className="text-3xl font-black tracking-tight mb-4">Automated <span className="text-primary italic">time flow</span></h4>
                                            <p className="text-[var(--text-secondary)] text-lg font-medium max-w-md leading-relaxed">
                                                Our desktop application intelligently maps work hours to projects. No start buttons, no timers to forget—just pure, unadulterated accuracy.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {['0.1s precision', 'Offline sync', 'Smart idle detection', 'App integration'].map((tag) => (
                                            <div key={tag} className="px-4 py-2 rounded-full bg-[var(--bg-main)] border border-[var(--border-color)] text-[10px] font-bold text-primary tracking-widest text-center">
                                                {tag}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Activity - Bento Small */}
                            <div className="md:col-span-4 group relative overflow-hidden rounded-[2.5rem] bg-[var(--bg-surface)] border border-[var(--border-color)] p-10 shadow-soft hover:border-primary/30 transition-all duration-500">
                                <div className="flex flex-col h-full items-center text-center justify-center space-y-6">
                                    <div className="w-14 h-14 rounded-2xl bg-[#001B4D] text-[#D4AF37] flex items-center justify-center">
                                        <TrendingUp size={28} />
                                    </div>
                                    <h4 className="text-2xl font-black tracking-tight">Active pulse</h4>
                                    <p className="text-[var(--text-secondary)] text-sm font-medium leading-relaxed">
                                        Visualize team engagement with our unique activity pulse indicator.
                                    </p>
                                    <div className="w-full flex items-end justify-center gap-1 h-12 px-4">
                                        {[40, 70, 45, 90, 65, 80, 55, 30].map((h, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ height: 0 }}
                                                whileInView={{ height: `${h}%` }}
                                                className="w-full bg-[#D4AF37]/40 rounded-t-sm"
                                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Screenshots - Bento Small */}
                            <div className="md:col-span-4 group relative overflow-hidden rounded-[2.5rem] bg-[var(--bg-surface)] border border-[var(--border-color)] p-10 shadow-soft hover:border-primary/30 transition-all duration-500">
                                <div className="flex flex-col h-full justify-between">
                                    <div className="space-y-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                            <Camera size={24} />
                                        </div>
                                        <h4 className="text-xl font-black tracking-tight">Visual proof</h4>
                                        <p className="text-[var(--text-secondary)] text-sm font-medium leading-relaxed">
                                            Transparent screenshots provide verifiable context for every hour tracked.
                                        </p>
                                    </div>
                                    <div className="mt-8 relative aspect-video rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] overflow-hidden">
                                        <img
                                            src={VisualProofImg}
                                            alt="Visual Proof"
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] to-transparent pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Reports - Bento Large */}
                            <div className="md:col-span-8 group relative overflow-hidden rounded-[2.5rem] bg-primary text-white p-10 md:p-14 shadow-glow-primary border border-primary/20 transition-all duration-500">
                                <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 blur-[80px] rounded-full" />
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                                    <div className="flex-1 space-y-6">
                                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                            <BarChart3 size={28} />
                                        </div>
                                        <h4 className="text-3xl font-black tracking-tight italic">Instant audits</h4>
                                        <p className="text-white/80 text-lg font-medium leading-relaxed">
                                            Generate export-ready reports for payroll, clients, or internal audits in seconds.
                                        </p>
                                        <ul className="space-y-3">
                                            {['CSV/PDF exporting', 'Client report sharing', 'Custom branding options', 'Developer API access'].map(item => (
                                                <li key={item} className="flex items-center gap-2 text-xs font-bold tracking-widest">
                                                    <Check size={14} className="text-[#D4AF37]" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="flex-1 w-full flex items-center justify-center">
                                        <div className="w-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 space-y-4">
                                            <div className="h-2 w-1/2 bg-white/30 rounded-full" />
                                            <div className="h-2 w-full bg-white/20 rounded-full" />
                                            <div className="h-2 w-3/4 bg-white/20 rounded-full" />
                                            <div className="flex justify-between items-end pt-4">
                                                <div className="h-16 w-4 bg-white/40 rounded-t-sm" />
                                                <div className="h-24 w-4 bg-[#D4AF37] rounded-t-sm shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
                                                <div className="h-12 w-4 bg-white/40 rounded-t-sm" />
                                                <div className="h-20 w-4 bg-white/40 rounded-t-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Interactive ROI Section */}
                <section className="py-32 bg-[var(--bg-surface)] relative overflow-hidden">
                    <div className="mx-auto max-w-7xl px-6 md:px-10">
                        <div className="glass-panel rounded-[3rem] p-10 md:p-20 relative overflow-hidden border-primary/10">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                            <div className="grid md:grid-cols-2 gap-16 items-center">
                                <div className="space-y-8">
                                    <h3 className="text-4xl font-black tracking-tight">The <span className="text-primary italic">ROI</span> of transparency</h3>
                                    <p className="text-[var(--text-secondary)] text-lg leading-relaxed font-medium">
                                        Companies using TrackOwl report an average increase of 18% in billable utilization within the first 30 days.
                                    </p>
                                    <div className="space-y-6">
                                        <div className="p-6 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] flex items-center gap-6">
                                            <div className="text-4xl font-black text-primary">15%</div>
                                            <div className="text-sm font-bold text-[var(--text-secondary)] tracking-widest">Efficiency increase</div>
                                        </div>
                                        <div className="p-6 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] flex items-center gap-6">
                                            <div className="text-4xl font-black text-[#D4AF37]">$12k</div>
                                            <div className="text-sm font-bold text-[var(--text-secondary)] tracking-widest">Average annual savings</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="aspect-square rounded-[2rem] bg-primary/5 border border-primary/10 flex items-center justify-center overflow-hidden">
                                        <div className="relative w-48 h-48">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                                className="absolute inset-0 border-4 border-dashed border-primary/20 rounded-full"
                                            />
                                            <div className="absolute inset-4 bg-primary rounded-full flex items-center justify-center shadow-glow-primary">
                                                <TrendingUp size={48} className="text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Abstract background blobs */}
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#D4AF37]/10 blur-[60px] rounded-full" />
                                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 blur-[60px] rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Testimonials Marquee */}
                <section className="py-32 overflow-hidden bg-[var(--bg-main)]">
                    <div className="mx-auto max-w-7xl px-6 text-center mb-16">
                        <h2 className="text-4xl font-black tracking-tight mb-4">Loved by <span className="text-primary italic">teams from SMBs to large global enterprises</span></h2>
                        <p className="text-[var(--text-secondary)] font-medium text-lg">Real results from teams who swapped micromanagement for trust.</p>
                    </div>

                    <div className="relative flex overflow-x-hidden group">
                        <div className="animate-marquee flex gap-8 py-10">
                            {[...testimonials, ...testimonials, ...testimonials].map((t, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ y: -10 }}
                                    className="w-[400px] flex-shrink-0 bg-[var(--bg-surface)] p-10 rounded-[2.5rem] flex flex-col gap-8 border border-[var(--border-color)] shadow-soft relative group"
                                >
                                    <div className="absolute top-6 right-8 text-primary/10">
                                        <Quote size={60} />
                                    </div>
                                    <div className="inline-flex px-4 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black tracking-[0.2em] w-fit">
                                        {t.savings}
                                    </div>
                                    <p className="text-lg text-[var(--text-main)] font-medium leading-relaxed italic relative z-10">
                                        "{t.quote}"
                                    </p>
                                    <div className="flex items-center gap-4 mt-auto">
                                        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-primary/10 shadow-sm">
                                            <img src={t.avatar} alt={t.author} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-black text-[var(--text-main)]">{t.author}</span>
                                            <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest">{t.role} · {t.company}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-32 relative">
                    <div className="mx-auto max-w-7xl px-6 md:px-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-10"
                        >
                            <h2 className="text-[11px] font-bold tracking-[0.3em] text-[var(--text-muted)] mb-4">Transparent pricing</h2>
                            <h3 className="text-4xl md:text-5xl font-black tracking-tight">Invest in <span className="text-primary italic">better results</span></h3>
                        </motion.div>

                        {/* Pricing Toggle */}
                        <div className="flex justify-center items-center gap-6 mb-20">
                            <div className="flex items-center gap-3">
                                <span className={twMerge("text-sm font-bold tracking-tight transition-colors", !isMonthly ? "text-[var(--text-main)]" : "text-[var(--text-muted)]")}>Yearly</span>
                                {!isMonthly && (
                                    <div className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest border bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20 transition-all duration-300">
                                        Save 25%
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setIsMonthly(!isMonthly)}
                                className="group relative w-16 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] p-1.5 transition-all hover:border-primary/30"
                            >
                                <motion.div
                                    animate={{ x: isMonthly ? 32 : 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    className="w-5 h-5 rounded-full bg-primary shadow-glow-primary"
                                />
                            </button>

                            <span className={twMerge("text-sm font-bold tracking-tight transition-colors", isMonthly ? "text-[var(--text-main)]" : "text-[var(--text-muted)]")}>Monthly</span>
                        </div>                        <div className="grid gap-8 md:grid-cols-3 max-w-7xl mx-auto">
                            {plans.map((plan, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: i * 0.2 }}
                                    whileHover={{ y: -5 }}
                                    className={twMerge(
                                        "relative flex flex-col rounded-[2.5rem] p-10 md:p-14 transition-all duration-500",
                                        "bg-[var(--bg-surface)]/40 backdrop-blur-2xl border border-[var(--border-color)]",
                                        plan.popular && "shadow-shell-lg border-primary/30"
                                    )}
                                >
                                    {plan.popular && (
                                        <div className="absolute top-8 right-8 flex items-center gap-2 text-primary font-black text-[10px] tracking-[0.2em]">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                            Most popular
                                        </div>
                                    )}

                                    <div className="mb-12">
                                        <h4 className="text-[10px] font-black tracking-[0.4em] text-[var(--text-muted)] mb-4">
                                            {plan.name}
                                        </h4>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-6xl font-black tracking-tighter text-[var(--text-main)]">{plan.price}</span>
                                            <span className="text-sm font-bold text-[var(--text-muted)] tracking-tight">{plan.period}</span>
                                        </div>
                                    </div>

                                    <p className="text-sm font-medium text-[var(--text-secondary)] leading-relaxed mb-12 min-h-[48px]">
                                        {plan.description}
                                    </p>

                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent mb-12" />

                                    <ul className="space-y-6 mb-16 flex-1">
                                        {plan.features.map(f => (
                                            <li key={f} className="flex items-center gap-4 text-[13px] font-semibold text-[var(--text-main)]">
                                                <div className="flex items-center justify-center shrink-0 text-primary">
                                                    <Check size={16} strokeWidth={3} />
                                                </div>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => navigate('/signup')}
                                        className={twMerge(
                                            "w-full py-6 rounded-2xl text-[11px] font-black tracking-[0.2em] transition-all duration-300",
                                            plan.popular
                                                ? "bg-primary text-white shadow-glow-primary hover:brightness-110"
                                                : "bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)] hover:bg-[var(--bg-surface)]"
                                        )}
                                    >
                                        {plan.buttonLabel}
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Download Section */}
                <section id="download" className="py-24 relative bg-[var(--bg-main)]">
                    <div className="mx-auto max-w-2xl px-6 md:px-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="space-y-6"
                        >
                            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Download TrackOwl</h2>
                            <p className="text-[var(--text-secondary)] text-base font-medium leading-relaxed max-w-md mx-auto">
                                Setup takes under 60 seconds. Runs silently in your system tray.
                            </p>

                            {/* OS Tabs */}
                            <div className="flex items-center gap-2 p-1 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl w-fit mx-auto">
                                {(['win', 'mac'] as const).map((os) => (
                                    <button
                                        key={os}
                                        onClick={() => setActiveOS(os)}
                                        className={twMerge(
                                            "px-5 py-2 rounded-lg text-[11px] font-bold tracking-widest transition-all duration-300",
                                            activeOS === os
                                                ? "bg-primary text-white shadow-sm"
                                                : "text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                                        )}
                                    >
                                        {os === 'win' && 'Windows'}
                                        {os === 'mac' && 'macOS'}
                                    </button>
                                ))}
                            </div>

                            {/* Download Buttons */}
                            {activeOS === 'win' && (
                                <div className="space-y-3">
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <a
                                            href="https://github.com/furqan-debug/TrackOwl/releases/download/v1.3.2/TrackOwl_1.3.2_x64-setup.exe"
                                            className="px-8 py-3.5 bg-primary text-white text-[11px] font-black tracking-widest rounded-xl shadow-glow-primary hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 justify-center"
                                        >
                                            <Download size={16} />
                                            Download .exe
                                        </a>
                                        <a
                                            href="https://github.com/furqan-debug/TrackOwl/releases/download/v1.3.2/TrackOwl_1.3.2_x64_en-US.msi"
                                            className="px-8 py-3.5 bg-[var(--bg-surface)] border border-[var(--border-color)] text-[11px] font-bold tracking-widest rounded-xl hover:border-primary/30 transition-all flex items-center gap-2 justify-center text-[var(--text-main)]"
                                        >
                                            <Download size={16} />
                                            Download .msi
                                        </a>
                                    </div>
                                    <p className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">v1.3.2 · 64-bit · ~5 MB</p>
                                </div>
                            )}
                            {activeOS === 'mac' && (
                                <div className="space-y-3">
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <a
                                            href="https://github.com/furqan-debug/TrackOwl/releases/download/v1.3.2/TrackOwl_1.3.2_aarch64.dmg"
                                            className="px-8 py-3.5 bg-primary text-white text-[11px] font-black tracking-widest rounded-xl shadow-glow-primary hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 justify-center"
                                        >
                                            <Download size={16} />
                                            Apple Silicon (M1–M5)
                                        </a>
                                        <a
                                            href="https://github.com/furqan-debug/TrackOwl/releases/download/v1.0.6/TrackOwl_1.0.6_x64.dmg"
                                            className="px-8 py-3.5 bg-[var(--bg-surface)] border border-[var(--border-color)] text-[11px] font-bold tracking-widest rounded-xl hover:border-primary/30 transition-all flex items-center gap-2 justify-center text-[var(--text-main)]"
                                        >
                                            Intel Macs (v1.0.6)
                                        </a>
                                    </div>
                                    <p className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">v1.3.2 (Apple Silicon) · v1.0.6 (Intel) · DMG · ~9 MB</p>
                                </div>
                            )}

                            <p className="text-[10px] text-[var(--text-muted)]/60 pt-2">
                                Windows may show a SmartScreen warning — click "More info" → "Run anyway" to proceed.
                            </p>
                        </motion.div>
                    </div>
                </section>

                <section id="faq" className="py-32 bg-[var(--bg-main)] relative">
                    <div className="mx-auto max-w-3xl px-6 md:px-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-20"
                        >
                            <h4 className="text-[10px] font-black tracking-[0.4em] text-primary mb-6">Support</h4>
                            <h3 className="text-4xl md:text-5xl font-black tracking-tight mb-8">Frequently asked <span className="text-primary italic">questions</span></h3>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="space-y-4"
                        >
                            {[
                                {
                                    q: "How does automatic tracking work?",
                                    a: "Our desktop application runs silently in the background, detecting active window titles and mapping them to projects based on your configuration. It intelligently filters out idle time and private browsing."
                                },
                                {
                                    q: "Is my team's data secure?",
                                    a: "Absolutely. All data is encrypted both in transit and at rest. Screenshots are processed using privacy-first algorithms, and you have full control over who can view specific team metrics."
                                },
                                {
                                    q: "Can I use it offline?",
                                    a: "Yes, the TrackOwl desktop application tracks time even without an active internet connection. Once you are back online, it automatically syncs all recorded data to the cloud."
                                },
                                {
                                    q: "Can I explore the platform for free?",
                                    a: "Yes! You can create an account and set up your workspace completely free of charge. You can explore all features and configure your projects, and you only need to choose a plan when you are ready to invite team members."
                                },
                                {
                                    q: "Does it support multiple organizations?",
                                    a: "Yes! You can manage multiple organizations under a single account, making it perfect for agencies and freelancers managing diverse client portfolios."
                                }
                            ].map((faq, i) => (
                                <FaqItem key={i} question={faq.q} answer={faq.a} delay={i * 0.1} />
                            ))}
                        </motion.div>

                        <div className="mt-20 p-10 rounded-[2.5rem] bg-primary/5 border border-primary/10 text-center">
                            <p className="text-lg font-medium text-[var(--text-secondary)] mb-6">Still have questions?</p>
                            <button className="px-8 py-4 bg-primary text-white text-[12px] font-black tracking-widest rounded-2xl hover:scale-105 transition-all shadow-glow-primary">
                                Contact support
                            </button>
                        </div>
                    </div>
                </section>

                {/* Final Footer */}
                <footer className="py-20 bg-[var(--bg-main)] border-t border-[var(--border-color)]">
                    <div className="mx-auto max-w-7xl px-6 md:px-10">
                        <div className="grid md:grid-cols-4 gap-12 mb-20">
                            <div className="col-span-1 md:col-span-1 space-y-6">
                                <div className="relative h-20 mb-8 -ml-7">
                                    <div className="absolute -top-12 left-0 w-64 h-48">
                                        <img src={LogoIcon} alt="TrackOwl" className="w-full h-full object-contain object-left" />
                                    </div>
                                </div>
                                <p className="text-[var(--text-muted)] text-sm font-medium leading-relaxed">
                                    Built for transparency. <br /> Designed for high-performing teams.
                                </p>
                                <div className="flex gap-4">
                                    {[Globe, Briefcase, Users].map((Icon, i) => (
                                        <a key={i} href="#" className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-primary hover:border-primary/30 transition-all">
                                            <Icon size={18} />
                                        </a>
                                    ))}
                                </div>
                            </div>

                            <div className="col-span-1">
                                <h4 className="text-[10px] font-black tracking-[0.3em] text-[var(--text-main)] mb-6">Product</h4>
                                <ul className="space-y-4">
                                    {['Features', 'Time tracking', 'Activity monitoring', 'Reporting'].map(item => (
                                        <li key={item}><a href="#" className="text-sm font-medium text-[var(--text-muted)] hover:text-primary transition-all">{item}</a></li>
                                    ))}
                                </ul>
                            </div>

                            <div className="col-span-1">
                                <h4 className="text-[10px] font-black tracking-[0.3em] text-[var(--text-main)] mb-6">Company</h4>
                                <ul className="space-y-4">
                                    {['About us', 'Privacy policy', 'Terms of service', 'Security'].map(item => (
                                        <li key={item}><a href="#" className="text-sm font-medium text-[var(--text-muted)] hover:text-primary transition-all">{item}</a></li>
                                    ))}
                                </ul>
                            </div>

                            <div className="col-span-1">
                                <h4 className="text-[10px] font-black tracking-[0.3em] text-[var(--text-main)] mb-6">Support</h4>
                                <ul className="space-y-4">
                                    {['Documentation', 'Help center', 'API reference', 'Status'].map(item => (
                                        <li key={item}><a href="#" className="text-sm font-medium text-[var(--text-muted)] hover:text-primary transition-all">{item}</a></li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 border-t border-[var(--border-color)]">
                            <p className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest">
                                © 2026 TrackOwl · A product by <a href="https://digireps.co/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">DigiReps</a>
                            </p>
                            <div className="flex gap-8 text-[10px] font-bold text-[var(--text-muted)] tracking-widest">
                                <a href="#" className="hover:text-primary transition-all">Twitter</a>
                                <a href="#" className="hover:text-primary transition-all">LinkedIn</a>
                                <a href="#" className="hover:text-primary transition-all">GitHub</a>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}

function NavButton({ children, href }: { children: React.ReactNode; href: string }) {
    return (
        <a
            href={href}
            className="px-6 py-2 rounded-full text-[11px] font-bold tracking-widest text-[var(--text-secondary)] hover:text-primary hover:bg-[var(--bg-main)] transition-all"
        >
            {children}
        </a>
    );
}

function FaqItem({ question, answer, delay }: { question: string; answer: string; delay: number }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            className={twMerge(
                "group rounded-[2rem] border transition-all duration-500 overflow-hidden",
                isOpen
                    ? "bg-[var(--bg-surface)] border-primary/20 shadow-premium"
                    : "bg-[var(--bg-surface)]/50 border-[var(--border-color)] hover:border-primary/10"
            )}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-8 py-6 flex items-center justify-between text-left"
            >
                <span className="text-lg font-black tracking-tight">{question}</span>
                <div className={twMerge(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                    isOpen ? "bg-primary text-white rotate-180" : "bg-[var(--bg-main)] text-[var(--text-muted)] group-hover:text-primary"
                )}>
                    {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                </div>
            </button>
            <div
                className={twMerge(
                    "grid transition-all duration-500 ease-in-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="overflow-hidden">
                    <div className="px-8 pb-8 pt-2">
                        <p className="text-[var(--text-secondary)] font-medium leading-relaxed max-w-3xl">
                            {answer}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
