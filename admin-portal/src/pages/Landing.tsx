import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronRight,
    Check,
    Zap,
    Download,
    Monitor,
    Shield,
    Clock,
    Layout,
    ArrowDown
} from 'lucide-react';

export function Landing() {
    const navigate = useNavigate();

    const plans = [
        {
            name: 'Starter',
            price: '$12',
            period: '/member/mo',
            description: 'Essential tracking for small teams.',
            features: [
                'Automatic time tracking',
                'Activity screenshots',
                'Basic reports',
                'Up to 5 members',
                'Email support'
            ],
            buttonLabel: 'Select Starter',
            popular: false
        },
        {
            name: 'Professional',
            price: '$19',
            period: '/member/mo',
            description: 'Advanced insights for growing companies.',
            features: [
                'Everything in Starter',
                'App & URL tracking',
                'Priority support',
                'Unlimited members',
                'Customized reports',
                'Payroll management'
            ],
            buttonLabel: 'Select Professional',
            popular: true
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            description: 'Custom solutions for large organizations.',
            features: [
                'Everything in Professional',
                'Dedicated account manager',
                'SLA & dedicated hosting',
                'Advanced security (SAML)',
                'Custom integrations',
                'On-premise options'
            ],
            buttonLabel: 'Talk to sales',
            popular: false
        }
    ];

    return (
        <div className="min-h-screen bg-background font-sans text-text-primary selection:bg-primary/10 selection:text-primary overflow-x-hidden relative">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 bg-grid-premium z-0 pointer-events-none opacity-[0.4]" />
            <div className="fixed inset-0 bg-gradient-mesh z-0 pointer-events-none" />
            <div className="fixed inset-0 bg-noise z-0 pointer-events-none" />
            
            {/* Dynamic Glow Blobs - Matching Reference Spread */}
            <div className="fixed top-[-10%] left-[-10%] w-[70%] h-[70%] bg-primary/15 blur-[140px] rounded-full z-0 pointer-events-none animate-pulse duration-[10s]" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-violet-500/12 blur-[140px] rounded-full z-0 pointer-events-none animate-pulse duration-[12s]" />
            <div className="fixed top-[15%] right-[5%] w-[40%] h-[40%] bg-blue-400/8 blur-[110px] rounded-full z-0 pointer-events-none animate-pulse duration-[8s]" />
            <div className="fixed bottom-[20%] left-[0%] w-[35%] h-[35%] bg-emerald-400/6 blur-[100px] rounded-full z-0 pointer-events-none animate-pulse duration-[15s]" />

            {/* Top navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/30 backdrop-blur-3xl border-b border-black/[0.02]">
                <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
                    <div className="flex items-center gap-3 animate-in">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-glow-primary">
                            <div className="w-5.5 h-5.5 border-4 border-white rounded-[3px] rotate-45" />
                        </div>
                        <span className="text-2xl font-extrabold tracking-tighter text-text-primary">Trackora</span>
                    </div>

                    <div className="hidden items-center gap-10 text-[11px] font-bold text-text-secondary md:flex font-mono stagger-1 animate-in">
                        <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-all uppercase tracking-[0.2em] hover:scale-105 active:scale-95">Features</button>
                        <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-all uppercase tracking-[0.2em] hover:scale-105 active:scale-95">How it works</button>
                        <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-all uppercase tracking-[0.2em] hover:scale-105 active:scale-95">Pricing</button>
                        <button onClick={() => document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-all uppercase tracking-[0.2em] hover:scale-105 active:scale-95">Download</button>
                    </div>

                    <div className="flex items-center gap-8 animate-in stagger-2">
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="text-[12px] font-bold uppercase tracking-[0.2em] text-text-secondary hover:text-text-primary transition-colors"
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/signup')}
                            className="bg-primary hover:bg-primary-hover text-white px-8 py-3.5 rounded-2xl text-[12px] font-bold uppercase tracking-[0.2em] shadow-glow-primary transition-all hover:scale-105 active:scale-95"
                        >
                            Get Started
                        </button>
                    </div>
                </nav>
            </header>

            {/* Hero Section - Centered 1:1 Layout */}
            <main className="relative z-10">
                <section className="flex flex-col items-center justify-center px-8 pt-56 pb-40 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none" />
                    
                    <div className="inline-flex items-center gap-2.5 rounded-full border border-black/[0.08] bg-white/60 px-5 py-2 mb-14 shadow-sm backdrop-blur-md animate-in">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-muted">Trusted by 100+ remote teams</span>
                    </div>

                    <h1 className="max-w-6xl text-5xl font-extrabold tracking-tight text-gradient-premium leading-[1.15] sm:text-7xl lg:text-[100px] mb-14 animate-in stagger-1 pb-4">
                        Know exactly what <br />
                        your <span className="text-primary italic font-bold">remote team</span> is doing
                    </h1>

                    <p className="max-w-3xl text-xl font-medium text-text-secondary leading-relaxed mb-20 animate-in stagger-2 opacity-70">
                        Trackora automatically tracks time, captures screenshots, and measures activity — <br className="hidden md:block" /> giving you complete visibility without the micromanagement.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-10 animate-in stagger-3">
                        <button
                            type="button"
                            onClick={() => navigate('/signup')}
                            className="flex items-center justify-center gap-4 rounded-3xl bg-primary px-14 py-7 text-[16px] font-bold uppercase tracking-[0.2em] text-white shadow-glow-primary hover:scale-105 active:scale-95 transition-all group"
                        >
                            Start 14-Day Free Trial
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </button>
                        <button
                            type="button"
                            onClick={() => document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' })}
                            className="flex items-center justify-center gap-3 px-12 py-6 rounded-full border border-black/[0.08] bg-white/40 backdrop-blur-md text-[15px] font-bold uppercase tracking-widest text-text-primary hover:bg-white/60 hover:border-black/[0.15] transition-all active:scale-95 shadow-lg shadow-black/5"
                        >
                            <Download className="w-5 h-5" />
                            Download App
                        </button>
                    </div>

                    <div className="mt-14 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] opacity-40 animate-in stagger-4">
                        Zero credit card · Cancel anytime · Setup in 5 minutes
                    </div>
                </section>

                {/* Bento Grid Features Section */}
                <section id="features" className="py-40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[130px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-400/5 blur-[120px] rounded-full pointer-events-none" />
                    <div className="mx-auto max-w-7xl px-8 relative z-10">
                        <div className="text-center mb-32 animate-in stagger-1">
                            <h2 className="text-6xl font-extrabold tracking-tighter text-text-primary mb-8">Precision-Engineered Visibility</h2>
                            <p className="text-text-secondary font-medium max-w-2xl mx-auto text-lg leading-relaxed opacity-60">Everything you need to maintain absolute clarity without compromising your team's flow.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-8 auto-rows-[240px]">
                            {/* Large Feature 1 */}
                            <div className="md:col-span-3 md:row-span-2 glass rounded-[48px] p-12 flex flex-col justify-between group hover:border-primary/20 transition-all duration-700 animate-in stagger-1 hover:shadow-glow">
                                <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center shadow-glow-primary group-hover:scale-110 transition-transform">
                                    <Zap className="w-8 h-8" />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-3xl font-extrabold text-text-primary leading-tight">Instant Pulse <br/><span className="text-primary italic font-bold">Live Syncing</span></h3>
                                    <p className="text-text-secondary font-medium leading-relaxed opacity-70">Watch your team's progress as it unfolds in real-time. Our proprietary sync engine ensures zero latency between action and insight.</p>
                                </div>
                            </div>

                            {/* Standard Feature 1 */}
                            <div className="md:col-span-3 md:row-span-1 glass rounded-[48px] p-10 flex flex-col justify-center gap-6 group hover:bg-white/60 transition-all duration-700 animate-in stagger-2 hover:shadow-glow">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all duration-700">
                                        <Monitor className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-text-primary tracking-tight">Smart Screenshots</h3>
                                </div>
                                <p className="text-sm text-text-secondary font-medium leading-relaxed opacity-70">Automated, high-fidelity captures that provide an immutable record of focus areas.</p>
                            </div>

                            {/* Standard Feature 2 */}
                            <div className="md:col-span-3 md:row-span-1 glass rounded-[48px] p-10 flex flex-col justify-center gap-6 group hover:bg-white/60 transition-all duration-700 animate-in stagger-3 hover:shadow-glow">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-700">
                                        <Shield className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-text-primary tracking-tight">Privacy Lockdown</h3>
                                </div>
                                <p className="text-sm text-text-secondary font-medium leading-relaxed opacity-70">Enterprise-grade encryption with granular privacy controls for every member.</p>
                            </div>

                            {/* Feature with Icon Grid */}
                            <div className="md:col-span-2 md:row-span-1 glass rounded-[40px] p-8 flex flex-col items-center justify-center text-center gap-4 group hover:scale-[1.02] transition-all animate-in stagger-4 hover:shadow-glow">
                                <Clock className="w-8 h-8 text-primary group-hover:rotate-12 transition-transform" />
                                <h3 className="text-md font-extrabold text-text-primary tracking-tight">Atomic Logs</h3>
                                <p className="text-[12px] text-text-secondary font-medium px-4 opacity-60">Second-by-second activity tracking.</p>
                            </div>

                            <div className="md:col-span-2 md:row-span-1 glass rounded-[40px] p-8 flex flex-col items-center justify-center text-center gap-4 group hover:scale-[1.02] transition-all animate-in stagger-4 hover:shadow-glow">
                                <Layout className="w-8 h-8 text-violet-500 group-hover:scale-110 transition-transform" />
                                <h3 className="text-md font-extrabold text-text-primary tracking-tight">App Depth</h3>
                                <p className="text-[12px] text-text-secondary font-medium px-4 opacity-60">Deep analysis of URLs and Apps.</p>
                            </div>

                            <div className="md:col-span-2 md:row-span-1 glass rounded-[40px] p-8 flex flex-col items-center justify-center text-center gap-4 group hover:scale-[1.02] transition-all animate-in stagger-4 hover:shadow-glow">
                                <ArrowDown className="w-8 h-8 text-amber-500 group-hover:-translate-y-1 transition-transform" />
                                <h3 className="text-md font-extrabold text-text-primary tracking-tight">One-Click Exports</h3>
                                <p className="text-[12px] text-text-secondary font-medium px-4 opacity-60">Production-ready CSV & PDF reports.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Enhanced How it Works Section */}
                <section id="how-it-works" className="py-40 relative">
                    <div className="mx-auto max-w-7xl px-8">
                        <div className="grid lg:grid-cols-2 gap-32 items-center">
                            <div>
                                <h2 className="text-7xl font-extrabold tracking-tighter text-text-primary mb-12 leading-[0.85]">
                                    Simple Setup. <br/>
                                    <span className="text-primary italic font-bold">Instant Pulse.</span>
                                </h2>
                                <div className="space-y-16">
                                    <StepItem 
                                        number="01" 
                                        title="Create your workspace" 
                                        desc="Sign up in seconds and invite your team members. No complex migrations needed."
                                    />
                                    <StepItem 
                                        number="02" 
                                        title="Install the Trackora agent" 
                                        desc="Lightweight, non-intrusive apps windowed specifically for focus."
                                    />
                                    <StepItem 
                                        number="03" 
                                        title="Watch the stream LIVE" 
                                        desc="Activity flow starts sync immediately. Zero configurations, absolute visibility."
                                    />
                                </div>
                            </div>
                            <div className="relative">
                                <div className="aspect-[4/5] md:aspect-square bg-primary/5 rounded-[100px] border border-primary/5 flex items-center justify-center p-8 md:p-20 relative">
                                    {/* Ambient Glow behind mockup */}
                                    <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full animate-pulse" />
                                    
                                    <div className="w-full h-full glass rounded-[70px] shadow-glow flex flex-col p-12 overflow-hidden group relative z-10 border-white/60">
                                        <div className="flex items-center justify-between mb-12">
                                            <div className="flex gap-2.5">
                                                <div className="w-3.5 h-3.5 rounded-full bg-rose-400 shadow-[0_0_10px_#fb7185]" />
                                                <div className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24]" />
                                                <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                                            </div>
                                            <div className="px-5 py-2 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.25em] shadow-glow-sm">Live Sync</div>
                                        </div>
                                        
                                        <div className="space-y-8 flex-1">
                                            <div className="space-y-3">
                                                <div className="h-4 w-1/4 bg-primary/20 rounded-full animate-pulse" />
                                                <div className="h-3 w-full bg-black/5 rounded-full" />
                                                <div className="h-3 w-4/5 bg-black/5 rounded-full" />
                                            </div>

                                            <div className="grid grid-cols-2 gap-6 pt-6">
                                                {[1,2,3,4].map(i => (
                                                    <div key={i} className="aspect-video bg-black/[0.03] rounded-3xl border border-black/[0.05] overflow-hidden relative">
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent" />
                                                        <div className="absolute bottom-3 left-3 h-1.5 w-1/3 bg-white/50 rounded-full" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Decorative badge */}
                                <div className="absolute -bottom-10 -right-10 w-56 h-56 glass rounded-[48px] shadow-2xl flex flex-col items-center justify-center p-8 border border-white hover:scale-110 transition-transform duration-500 cursor-default group">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                                        <Zap className="w-8 h-8" />
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-primary">Sync Active</span>
                                    <div className="mt-2 flex gap-1">
                                        {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-40 relative">
                    <div className="mx-auto max-w-7xl px-8">
                        <div className="text-center mb-24 animate-in">
                            <h2 className="text-6xl font-extrabold tracking-tighter text-text-primary mb-6">Simple, Transparent Pricing</h2>
                            <p className="text-text-secondary font-medium text-lg opacity-60">Choose the perfect plan for your team's growth.</p>
                        </div>

                        <div className="grid gap-10 md:grid-cols-3 max-w-6xl mx-auto">
                            {plans.map((plan, i) => (
                                <div
                                    key={plan.name}
                                    className={`flex h-full flex-col rounded-[48px] p-12 transition-all duration-700 hover:scale-[1.02] animate-in stagger-${i+1} hover:shadow-glow ${
                                        plan.popular 
                                            ? 'bg-primary text-white shadow-glow-primary' 
                                            : 'bg-white/30 backdrop-blur-3xl border border-black/[0.02] text-text-primary shadow-glow'
                                    }`}
                                >
                                    {plan.popular && (
                                        <span className="mb-6 inline-flex self-start rounded-full bg-white/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                                            Most Popular
                                        </span>
                                    )}
                                    <div className="mb-10">
                                        <h3 className="text-xl font-extrabold uppercase tracking-tight">{plan.name}</h3>
                                        <div className="mt-4 flex items-baseline gap-1">
                                            <span className="text-5xl font-extrabold tracking-tighter">{plan.price}</span>
                                            <span className={`text-xs font-bold opacity-60 ${plan.popular ? 'text-white' : 'text-text-muted'}`}>{plan.period}</span>
                                        </div>
                                        <p className={`mt-4 text-sm font-medium opacity-70 ${plan.popular ? 'text-white' : 'text-text-secondary'}`}>{plan.description}</p>
                                    </div>
                                    <div className="mt-auto space-y-5">
                                        {plan.features.map((feature) => (
                                            <div key={feature} className="flex items-center gap-4">
                                                <div className={`flex h-5 w-5 items-center justify-center rounded-full ${plan.popular ? 'bg-white/20' : 'bg-primary/10'}`}>
                                                    <Check className={`h-3 w-3 ${plan.popular ? 'text-white' : 'text-primary'}`} />
                                                </div>
                                                <span className={`text-sm font-medium ${plan.popular ? 'text-white/90' : 'text-text-secondary'}`}>
                                                    {feature}
                                                </span>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => navigate('/signup', { state: { plan: plan.name } })}
                                            className={`mt-10 w-full rounded-[20px] py-4.5 text-[13px] font-bold uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 ${
                                                plan.popular
                                                    ? 'bg-white text-primary shadow-xl hover:bg-slate-50'
                                                    : 'bg-primary text-white shadow-glow-primary'
                                            }`}
                                        >
                                            Get Started
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* High-Fidelity Download Section */}
                <section id="download" className="py-48 bg-white/40 relative overflow-hidden">
                    <div className="mx-auto max-w-7xl px-8 relative z-10 text-center">
                        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.3em] mb-12 animate-in shadow-glow-sm">
                            Deployment
                        </div>
                        <h2 className="text-7xl font-extrabold tracking-tighter text-text-primary mb-10 animate-in stagger-1">Get the Trackora App</h2>
                        <p className="text-text-secondary text-xl font-medium mb-24 max-w-3xl mx-auto leading-relaxed opacity-60 animate-in stagger-2">
                            The lightweight agent your team installs to start tracking. Runs silently in the <br className="hidden md:block" />
                            system tray — no attention needed after setup.
                        </p>
                        
                        <div className="animate-in stagger-3">
                            <DownloadTabs />
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-24 border-t border-black/[0.02] bg-white/40 backdrop-blur-3xl">
                    <div className="mx-auto max-w-7xl px-8 flex flex-col md:flex-row justify-between items-center gap-12">
                        <div className="flex items-center gap-4">
                             <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-glow-primary">
                                <div className="w-5.5 h-5.5 border-4 border-white rounded-[3px] rotate-45" />
                            </div>
                            <span className="text-2xl font-extrabold tracking-tighter text-text-primary">Trackora</span>
                        </div>
                        <div className="flex gap-12 text-[10px] font-bold uppercase tracking-[0.3em] text-text-secondary">
                            <a href="#" className="hover:text-primary transition-all hover:scale-105 active:scale-95">Privacy</a>
                            <a href="#" className="hover:text-primary transition-all hover:scale-105 active:scale-95">Terms</a>
                            <a href="#" className="hover:text-primary transition-all hover:scale-105 active:scale-95">Support</a>
                        </div>
                        <p className="text-[11px] font-medium text-text-muted opacity-50 font-mono">
                            © {new Date().getFullYear()} Trackora. All rights reserved.
                        </p>
                    </div>
                </footer>
            </main>
        </div>
    );
}


function StepItem({ number, title, desc }: { number: string; title: string; desc: string }) {
    return (
        <div className="flex gap-10 group animate-in stagger-2">
            <span className="text-6xl font-extrabold text-primary/5 group-hover:text-primary/15 transition-all font-mono italic leading-tight">{number}</span>
            <div className="space-y-3">
                <h4 className="text-2xl font-extrabold text-text-primary tracking-tight">{title}</h4>
                <p className="text-text-secondary font-medium leading-relaxed max-w-md opacity-70">{desc}</p>
            </div>
        </div>
    );
}

function DownloadTabs() {
    const [activeTab, setActiveTab] = useState<'windows' | 'macos' | 'linux'>('windows');

    const platforms = {
        windows: {
            title: 'Trackora for Windows',
            desc: 'Available as .exe (universal installer) for Windows 10/11. Supports both x64 and ARM64 systems.',
            v: 'v1.0.0',
            os: 'Windows 10/11',
            arch: 'x64 / ARM64',
            primary: 'Download .exe',
            primaryLink: 'https://github.com/furqan-debug/Trackora/releases/download/v1.0.0/Trackora_1.0.0_x64-setup.exe',
            secondary: 'Download .msi (Enterprise)',
            secondaryLink: 'https://github.com/furqan-debug/Trackora/releases/download/v1.0.0/Trackora_1.0.0_x64_en-US.msi'
        },
        macos: {
            title: 'Trackora for macOS',
            desc: 'Universal build for Intel and Apple Silicon Macs. Requires macOS 11.0 or later. Optimized for battery life.',
            v: 'Coming Soon',
            os: 'macOS 11.0+',
            arch: 'Universal',
            primary: 'Notify Me',
            primaryLink: '#',
            secondary: 'View Changelog',
            secondaryLink: 'https://github.com/furqan-debug/Trackora/releases'
        },
        linux: {
            title: 'Trackora for Linux',
            desc: 'AppImage and .deb packages for major distributions. Supports hardware acceleration.',
            v: 'Coming Soon',
            os: 'Linux (any)',
            arch: 'x86_64',
            primary: 'Notify Me',
            primaryLink: '#',
            secondary: 'View Source',
            secondaryLink: 'https://github.com/furqan-debug/Trackora'
        }
    };

    const current = platforms[activeTab];

    return (
        <div className="max-w-5xl mx-auto animate-in stagger-3">
            {/* Tab Switcher - Premium Pill Style */}
            <div className="flex justify-center mb-24 relative">
                <div className="flex p-2 bg-white/40 backdrop-blur-3xl rounded-[32px] border border-white/60 shadow-glow relative z-10 overflow-hidden">
                    {(['windows', 'macos', 'linux'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setActiveTab(p)}
                            className={`relative z-20 px-12 py-4 rounded-[24px] text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-500 min-w-[160px] ${
                                activeTab === p 
                                    ? 'text-white' 
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            {activeTab === p && (
                                <div className="absolute inset-0 bg-primary rounded-[24px] z-[-1] shadow-glow-primary animate-in fade-in scale-100" />
                            )}
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Platform Content - Minimalist & Rich Card */}
            <div className="glass rounded-[64px] p-12 md:p-20 flex flex-col md:flex-row items-center gap-12 md:gap-24 relative overflow-hidden group shadow-glow border-white/60 bg-white/50">
                {/* Refined Ambient Glow */}
                <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/20 transition-all duration-1000" />
                <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-violet-400/5 blur-[100px] rounded-full pointer-events-none" />
                
                <div className="flex-shrink-0 relative">
                    <div className="w-40 h-40 md:w-56 md:h-56 rounded-[56px] glass flex items-center justify-center text-primary relative z-10 shadow-glow group-hover:scale-105 transition-transform duration-700 bg-white/80 border-white/80">
                        {activeTab === 'windows' && <Monitor className="w-16 h-16 md:w-24 md:h-24 stroke-[1.5]" />}
                        {activeTab === 'macos' && <Layout className="w-16 h-16 md:w-24 md:h-24 stroke-[1.5]" />}
                        {activeTab === 'linux' && <Zap className="w-16 h-16 md:w-24 md:h-24 stroke-[1.5]" />}
                        
                        {/* Decorative internal glow */}
                        <div className="absolute inset-4 rounded-[40px] bg-primary/5 blur-xl pointer-events-none" />
                    </div>
                </div>

                <div className="flex-1 text-left space-y-12 relative z-10">
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center gap-6">
                            <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-primary">{current.title}</h3>
                            <span className="px-5 py-2 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm border border-primary/10">{current.v}</span>
                        </div>
                        <p className="text-lg md:text-xl text-text-secondary font-medium leading-relaxed opacity-60 max-w-xl">
                            {current.desc}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="px-6 py-3 rounded-2xl bg-white/60 border border-black/[0.03] text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] shadow-sm">
                            {current.os}
                        </div>
                        <div className="px-6 py-3 rounded-2xl bg-white/60 border border-black/[0.03] text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] shadow-sm">
                            {current.arch}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 pt-4">
                        <a 
                            href={current.primaryLink}
                            className="bg-primary hover:bg-primary-hover text-white px-14 py-6 rounded-3xl text-[14px] font-bold uppercase tracking-[0.2em] shadow-glow-primary transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-4 group/btn"
                        >
                            <ArrowDown className="w-5 h-5 group-hover/btn:translate-y-1 transition-transform" />
                            {current.primary}
                        </a>
                        <a 
                            href={current.secondaryLink}
                            className="px-14 py-6 rounded-3xl text-[14px] font-bold uppercase tracking-[0.2em] text-text-secondary border border-black/[0.06] hover:bg-white transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg shadow-black/5"
                        >
                            {current.secondary}
                        </a>
                    </div>
                </div>
            </div>

            <p className="mt-16 text-[11px] font-medium text-text-muted opacity-40 flex items-center justify-center gap-2 tracking-wide">
                Auto-updates are delivered silently in the background. <a href="#" className="text-primary hover:underline font-bold">View all releases on GitHub →</a>
            </p>
        </div>
    );
}


