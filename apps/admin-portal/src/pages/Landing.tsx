import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
    ChevronRight,
    Check,
    Zap,
    Monitor,
    Shield,
    Clock,
    Layout,
    Camera,
    Quote
} from 'lucide-react';
import LogoIcon from '../assets/branding/3.svg';
import DashboardPreview from '../assets/branding/dashboard-preview.png';
import JasonAvatar from '../assets/branding/jason.png';
import ElenaAvatar from '../assets/branding/elena.png';
import SarahAvatar from '../assets/branding/sarah.png';
import MarcusAvatar from '../assets/branding/marcus.png';
import DavidAvatar from '../assets/branding/david.png';


export function Landing() {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const plans = [
        {
            name: 'Starter',
            price: '$12',
            period: '/mo',
            description: 'Essential tracking for small teams.',
            features: [
                'Automatic time tracking',
                'Activity screenshots',
                'Basic reports',
                'Up to 5 members'
            ],
            buttonLabel: 'Select Starter',
            popular: false
        },
        {
            name: 'Professional',
            price: '$19',
            period: '/mo',
            description: 'Advanced insights for growing companies.',
            features: [
                'Everything in Starter',
                'App & URL tracking',
                'Priority support',
                'Unlimited members',
                'Customized reports'
            ],
            buttonLabel: 'Get Started',
            popular: true
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            description: 'Custom solutions for high-security orgs.',
            features: [
                'Everything in Professional',
                'Dedicated account manager',
                'SLA & dedicated hosting',
                'Advanced security (SAML)'
            ],
            buttonLabel: 'Talk to sales',
            popular: false
        }
    ];

    return (
        <div className="min-h-screen bg-background font-sans text-text-primary selection:bg-primary/10 selection:text-primary overflow-x-hidden relative">
            {/* Background Layers */}
            <div className="fixed inset-0 bg-grid-premium z-0 pointer-events-none opacity-[0.2]" />
            <div className="fixed inset-0 bg-gradient-mesh z-0 pointer-events-none opacity-40" />
            <div className="fixed inset-0 bg-noise z-0 pointer-events-none" />

            {/* Navigation */}
            <header className={clsx(
                "fixed top-0 left-0 right-0 z-[100] transition-all duration-500",
                isScrolled ? "bg-white/90 backdrop-blur-xl shadow-sm border-b border-black/5 py-3" : "bg-transparent py-6"
            )}>
                <nav className="mx-auto flex max-w-6xl items-center justify-between px-8">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="flex h-24 w-auto items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-110">
                            <img src={LogoIcon} alt="TrackOwl" className="w-full h-full object-contain" />
                        </div>
                        <div className="h-4 w-[1px] bg-black/10 mx-1 hidden sm:block" />
                        <span className="hidden sm:block text-[8px] font-black tracking-[0.2em] text-text-muted opacity-40 uppercase group-hover:opacity-60 transition-opacity">
                            By <a href="https://digireps.co/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>DigiReps</a>
                        </span>
                    </div>

                    <div className={clsx(
                        "hidden items-center gap-1.5 p-1.5 rounded-full border transition-all duration-500 md:flex",
                        isScrolled ? "bg-black/[0.03] border-black/[0.03]" : "bg-white/10 border-white/20 backdrop-blur-md"
                    )}>
                        <NavButton onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</NavButton>
                        <NavButton onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>How it works</NavButton>
                        <NavButton onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>Pricing</NavButton>
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate('/login')}
                            className="hidden sm:block text-[10px] font-bold tracking-[0.2em] text-text-secondary hover:text-primary transition-all active:scale-95"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-6 py-2.5 bg-primary text-white text-[10px] font-bold tracking-[0.2em] rounded-full shadow-glow-primary hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-surface/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <span className="relative z-10">Start Free</span>
                        </button>
                    </div>
                </nav>
            </header>

            <main className="relative z-10 pt-32">
                {/* Hero Section */}
                <section className="mx-auto max-w-6xl px-6 py-12 text-center md:py-20 lg:py-24">
                    <div className="flex flex-col items-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-1.5 mb-8 shadow-shell-sm backdrop-blur-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                            <span className="text-[9px] font-bold tracking-[0.15em] text-primary">Trusted by 200+ global teams</span>
                        </div>

                        <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight leading-[1.1] sm:text-6xl lg:text-7xl mb-8">
                            Know exactly what your <br />
                            <span className="text-gradient-premium italic">remote team</span> is doing.
                        </h1>

                        <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                            {[
                                { label: 'Time Tracking', icon: Clock },
                                { label: 'Screenshots', icon: Camera },
                                { label: 'Activity Analytics', icon: Layout }
                            ].map((pill, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                                        <pill.icon className="w-4 h-4 text-primary opacity-70" strokeWidth={2.5} />
                                    </div>
                                    <span className="text-[11px] font-bold tracking-[0.1em] text-text-primary uppercase">{pill.label}</span>
                                </div>
                            ))}
                        </div>

                        <p className="max-w-2xl text-xl font-medium text-text-secondary leading-relaxed mb-12 opacity-90 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                            See how your team <span className="text-text-main font-extrabold decoration-primary/30 decoration-4 underline-offset-4 underline">really works</span> without the stress of micromanagement.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <button
                                onClick={() => navigate('/signup')}
                                className="w-full sm:w-auto px-10 py-4 bg-primary text-white text-[12px] font-bold tracking-[0.1em] rounded-xl shadow-glow-primary hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                Start 14-Day Free Trial
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' })}
                                className="w-full sm:w-auto px-10 py-4 glass-panel bg-surface/40 backdrop-blur-md text-[12px] font-bold text-text-primary hover:bg-surface-hover transition-all active:scale-95 border border-black/5"
                            >
                                Download App
                            </button>
                        </div>

                        <div className="mt-10 text-[9px] font-bold text-text-muted tracking-[0.2em] opacity-40">
                            No credit card · Setup in 5 minutes · Cancel anytime
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-20">
                    <div className="mx-auto max-w-6xl px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-extrabold tracking-tight text-text-primary mb-4">Clear Insights</h2>
                            <p className="text-text-secondary font-medium max-w-xl mx-auto text-md opacity-70">Know exactly what's happening and keep your team moving forward.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                            <div className="md:col-span-8 glass-panel rounded-3xl p-8 flex flex-col justify-between min-h-[300px] group transition-all hover:border-primary/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[60px] rounded-full" />
                                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-glow-primary mb-8 relative z-10">
                                    <Zap size={20} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-extrabold text-text-primary mb-3">Instant <span className="text-primary italic">Updates</span></h3>
                                    <p className="text-text-secondary text-sm leading-relaxed max-w-sm">See work as it happens. Your dashboard updates instantly so you're always in the loop.</p>
                                </div>
                            </div>

                            <div className="md:col-span-4 glass-panel rounded-3xl p-8 flex flex-col justify-center gap-4 transition-all hover:bg-surface-hover">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                                    <Monitor size={20} />
                                </div>
                                <h3 className="text-lg font-extrabold text-text-primary">Smart Screenshots</h3>
                                <p className="text-text-secondary text-xs leading-relaxed">See what's being worked on without feeling like you're watching over their shoulder.</p>
                            </div>

                            <div className="md:col-span-4 glass-panel rounded-3xl p-8 flex flex-col justify-center gap-4 transition-all hover:bg-surface-hover">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                    <Shield size={20} />
                                </div>
                                <h3 className="text-lg font-extrabold text-text-primary">Privacy First</h3>
                                <p className="text-text-secondary text-xs leading-relaxed">Safe and private for everyone. You choose exactly what gets shared with the team.</p>
                            </div>

                            <div className="md:col-span-8 glass-panel rounded-3xl p-8 flex items-center justify-between transition-all hover:border-primary/20">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-extrabold text-text-primary">Work Insights</h3>
                                    <p className="text-text-secondary text-sm leading-relaxed max-w-xs">See which apps your team uses most to help them do their best work.</p>
                                </div>
                                <div className="hidden sm:flex gap-3">
                                    <div className="w-12 h-12 glass-panel rounded-xl flex items-center justify-center text-primary"><Clock size={20} /></div>
                                    <div className="w-12 h-12 glass-panel rounded-xl flex items-center justify-center text-violet-500"><Layout size={20} /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How it works section */}
                <section id="how-it-works" className="py-20 bg-surface/10">
                    <div className="mx-auto max-w-6xl px-6">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-3xl font-extrabold tracking-tight text-text-primary mb-8">Quick to Start. <span className="text-primary italic">Easy to Use.</span></h2>
                                <div className="space-y-8">
                                    <StepItem number="01" title="Create Workspace" desc="Set up your workspace in seconds. No complex forms." />
                                    <StepItem number="02" title="Get the App" desc="Our small app runs quietly in the background without slowing you down." />
                                    <StepItem number="03" title="See Progress" desc="Your dashboard updates instantly with real-time work and simple reports." />
                                </div>
                            </div>
                            <div className="glass-panel p-2 rounded-3xl shadow-elevated border-white/60 overflow-hidden group">
                                <div className="aspect-video bg-surface-hover rounded-2xl flex items-center justify-center overflow-hidden relative">
                                    <img
                                        src={DashboardPreview}
                                        alt="TrackOwl Dashboard"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                {/* Professional Moving Testimonials Section */}
                <section className="py-24 relative overflow-hidden bg-surface/5">
                    <div className="mx-auto max-w-6xl px-6 mb-16 text-center">
                        <h2 className="text-3xl font-extrabold tracking-tight text-text-primary mb-4">Driving Success for Modern Teams</h2>
                        <p className="text-text-secondary font-medium text-md opacity-70">Join hundreds of companies optimizing their remote operations.</p>
                    </div>

                    <div className="relative flex overflow-x-hidden">
                        <div className="animate-marquee flex gap-8 py-4">
                            {[
                                {
                                    savings: "Saved $15,200",
                                    period: "Annual Overhead",
                                    quote: "TrackOwl payed for itself in the first 48 hours. We identified massive resource leakage in our dev cycle.",
                                    author: "Jason Riva",
                                    role: "COO",
                                    company: "NexaSystems",
                                    avatar: JasonAvatar
                                },
                                {
                                    savings: "+22% Efficiency",
                                    period: "Creative Output",
                                    quote: "No more status meetings. We watch the flow and jump in when needed. Billable hours have never been more accurate.",
                                    author: "Elena Moretti",
                                    role: "Director",
                                    company: "PixelPerfect",
                                    avatar: ElenaAvatar
                                },
                                {
                                    savings: "100% Trust",
                                    period: "Built-in Accountability",
                                    quote: "Our employees feel safer knowing their hard work is recorded fairly. It's ended all micromanagement friction.",
                                    author: "Sarah Jenkins",
                                    role: "Head of HR",
                                    company: "GlobalLink",
                                    avatar: SarahAvatar
                                },
                                {
                                    savings: "Saved $8,500/mo",
                                    period: "Billable Leakage",
                                    quote: "We recovered hours that were previously uncaptured. Our monthly revenue increased immediately after deployment.",
                                    author: "Marcus Thorne",
                                    role: "CFO",
                                    company: "Titan Logistics",
                                    avatar: MarcusAvatar
                                },
                                {
                                    savings: "12 hrs/wk Saved",
                                    period: "Payroll Admin",
                                    quote: "Automating timesheet verification has freed up our HR team for higher-level strategic work. Simple and effective.",
                                    author: "David Chen",
                                    role: "CTO",
                                    company: "NexaFlow",
                                    avatar: DavidAvatar
                                }
                            ].concat([
                                {
                                    savings: "Saved $15,200",
                                    period: "Annual Overhead",
                                    quote: "TrackOwl payed for itself in the first 48 hours. We identified massive resource leakage in our dev cycle.",
                                    author: "Jason Riva",
                                    role: "COO",
                                    company: "NexaSystems",
                                    avatar: JasonAvatar
                                },
                                {
                                    savings: "+22% Efficiency",
                                    period: "Creative Output",
                                    quote: "No more status meetings. We watch the flow and jump in when needed. Billable hours have never been more accurate.",
                                    author: "Elena Moretti",
                                    role: "Director",
                                    company: "PixelPerfect",
                                    avatar: ElenaAvatar
                                },
                                {
                                    savings: "100% Trust",
                                    period: "Built-in Accountability",
                                    quote: "Our employees feel safer knowing their hard work is recorded fairly. It's ended all micromanagement friction.",
                                    author: "Sarah Jenkins",
                                    role: "Head of HR",
                                    company: "GlobalLink",
                                    avatar: SarahAvatar
                                },
                                {
                                    savings: "Saved $8,500/mo",
                                    period: "Billable Leakage",
                                    quote: "We recovered hours that were previously uncaptured. Our monthly revenue increased immediately after deployment.",
                                    author: "Marcus Thorne",
                                    role: "CFO",
                                    company: "Titan Logistics",
                                    avatar: MarcusAvatar
                                },
                                {
                                    savings: "12 hrs/wk Saved",
                                    period: "Payroll Admin",
                                    quote: "Automating timesheet verification has freed up our HR team for higher-level strategic work. Simple and effective.",
                                    author: "David Chen",
                                    role: "CTO",
                                    company: "NexaFlow",
                                    avatar: DavidAvatar
                                }
                            ]).map((t, i) => (
                                <div key={i} className="w-[380px] flex-shrink-0 bg-white p-10 rounded-[2.5rem] flex flex-col gap-6 relative group testimonial-card-pop border border-black/5 shadow-sm">

                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="text-xl font-black text-primary tracking-tight">{t.savings}</div>
                                            <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{t.period}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="relative">
                                        <Quote size={24} className="text-primary/5 absolute -top-4 -left-2" />
                                        <p className="text-xs text-text-primary font-medium leading-relaxed opacity-90 relative z-10 italic">
                                            "{t.quote}"
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-6 border-t border-black/[0.03] flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/10 shadow-sm flex-shrink-0">
                                            <img src={t.avatar} alt={t.author} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-extrabold text-text-primary tracking-tight">{t.author}</span>
                                            <span className="text-[8px] font-bold text-text-muted uppercase tracking-[0.1em]">{t.role} · {t.company}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Gradient Fades for Smooth Scroll Edge */}
                        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#FDFCFB] to-transparent z-20 pointer-events-none" />
                        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#FDFCFB] to-transparent z-20 pointer-events-none" />
                    </div>
                </section>


                {/* Pricing Section */}
                <section id="pricing" className="py-20">
                    <div className="mx-auto max-w-6xl px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-extrabold tracking-tight text-text-primary mb-4">Simple Pricing</h2>
                            <p className="text-text-secondary font-medium text-md opacity-70">Plans designed for teams of all sizes.</p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
                            {plans.map((plan, i) => (
                                <div
                                    key={i}
                                    className={`relative flex flex-col rounded-3xl p-8 transition-all hover:scale-[1.02] ${plan.popular
                                        ? 'bg-primary text-white shadow-glow-primary scale-105 z-20'
                                        : 'glass-panel text-text-primary shadow-glow hover:bg-surface-hover'
                                        }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white rounded-full text-[8px] font-bold tracking-[0.2em] shadow-lg">
                                            Most Popular
                                        </div>
                                    )}
                                    <h3 className="text-[10px] font-extrabold mb-4 opacity-80">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className="text-4xl font-extrabold tracking-tighter">{plan.price}</span>
                                        <span className={`text-xs font-bold opacity-60 ${plan.popular ? 'text-white' : 'text-text-muted'}`}>{plan.period}</span>
                                    </div>
                                    <p className={`text-xs font-medium mb-8 opacity-80 leading-relaxed ${plan.popular ? 'text-white' : 'text-text-secondary'}`}>{plan.description}</p>

                                    <ul className="space-y-4 mb-8 flex-1 text-xs">
                                        {plan.features.map(f => (
                                            <li key={f} className="flex items-center gap-3">
                                                <Check size={12} className={plan.popular ? 'text-white' : 'text-primary'} />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => navigate('/signup')}
                                        className={`w-full py-3.5 rounded-xl text-[10px] font-bold tracking-[0.1em] transition-all active:scale-95 ${plan.popular
                                            ? 'bg-surface text-primary shadow-xl'
                                            : 'bg-primary text-white shadow-glow-primary'
                                            }`}
                                    >
                                        {plan.buttonLabel}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Download Section */}
                <section id="download" className="py-24 bg-surface/40 border-y border-black/[0.03]">
                    <div className="mx-auto max-w-6xl px-6 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[8px] font-bold tracking-[0.2em] mb-8">
                            Native Performance
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-text-primary mb-4">Get the Agent</h2>
                        <p className="max-w-xl mx-auto text-text-secondary text-sm font-medium leading-relaxed opacity-70 mb-12">
                            The lightweight TrackOwl agent runs silently in your tray. Setup takes under 60 seconds.
                        </p>

                        <div className="max-w-3xl mx-auto">
                            <div className="glass-panel rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 text-left relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[50px] rounded-full pointer-events-none" />
                                <div className="flex-shrink-0 w-24 h-24 rounded-2xl bg-primary/5 flex items-center justify-center text-primary relative z-10 border border-primary/10">
                                    <Monitor size={48} />
                                </div>
                                <div className="flex-1 space-y-6 relative z-10">
                                    <div>
                                        <h3 className="text-xl font-extrabold text-text-primary tracking-tight">TrackOwl for Desktop</h3>
                                        <p className="text-sm text-text-secondary opacity-70">Version 2.4.0 · Stable Build</p>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <button className="px-6 py-3 bg-primary text-white text-[10px] font-bold tracking-[0.1em] rounded-xl shadow-glow-primary hover:scale-105 transition-all">Download for Windows</button>
                                        <button className="px-6 py-3 glass-panel border border-black/5 text-[10px] font-bold tracking-[0.1em] rounded-xl hover:bg-surface-hover transition-all">Other Platforms</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-12 bg-surface/40">
                    <div className="mx-auto max-w-6xl px-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-t border-black/[0.03] pt-8">
                            <div className="flex items-center gap-2">
                                <div className="flex h-20 w-20 items-center justify-center overflow-hidden">
                                    <img src={LogoIcon} alt="TrackOwl" className="w-full h-full object-contain" />
                                </div>
                                {/* Name removed as per request */}
                            </div>

                            <div className="flex gap-8 text-[9px] font-bold tracking-[0.15em] text-text-muted">
                                <a href="#" className="hover:text-primary transition-all">Privacy</a>
                                <a href="#" className="hover:text-primary transition-all">Terms</a>
                                <a href="#" className="hover:text-primary transition-all">Support</a>
                            </div>

                            <div className="text-right flex flex-col items-end gap-1">
                                <p className="text-[9px] font-bold tracking-[0.15em] text-text-muted opacity-40 uppercase">
                                    © 2024 TrackOwl
                                </p>
                                <p className="text-[9px] font-bold tracking-[0.15em] text-text-muted opacity-60">
                                    A product by <a href="https://digireps.co/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline transition-all">DigiReps</a>
                                </p>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}

function StepItem({ number, title, desc }: { number: string; title: string; desc: string }) {
    return (
        <div className="flex gap-6 group">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl glass-panel flex items-center justify-center text-lg font-extrabold text-primary group-hover:scale-110 transition-all duration-300">
                {number}
            </div>
            <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-text-primary tracking-tight">{title}</h3>
                <p className="text-text-secondary text-xs leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">{desc}</p>
            </div>
        </div>
    );
}

function NavButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="px-5 py-1.5 rounded-full text-[10px] font-bold tracking-[0.15em] text-text-secondary hover:text-primary hover:bg-surface-hover transition-all active:scale-95"
        >
            {children}
        </button>
    );
}
