import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check,
    Monitor,
    Clock,
    TrendingUp,
    BarChart3,
    Globe,
    Briefcase,
    MessageSquare,
    Users,
    Shield,
    Lock,
    Eye,
    ChevronDown,
    ArrowRight,
    FileText,
    Download
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import HeaderLogo from '../assets/branding/header-2.svg';
import HeroDashboard from '../assets/branding/hero-dashboard.png';
import ShowcaseDashboard from '../assets/branding/showcase-dashboard.png';

export function Landing() {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const headlineSlides = ["modern teams", "remote work", "agencies", "enterprises"];
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % headlineSlides.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [headlineSlides.length]);

    const metrics = [
        { title: '99.9%', subtitle: 'Platform uptime', icon: TrendingUp, color: 'text-green-500' },
        { title: 'Real-time', subtitle: 'Workforce insights', icon: Eye, color: 'text-blue-500' },
        { title: 'Enterprise-grade', subtitle: 'Security', icon: Shield, color: 'text-blue-600' },
        { title: 'Ethical &', subtitle: 'Transparent tracking', icon: Users, color: 'text-blue-500' }
    ];

    const features = [
        {
            title: 'Smart time tracking',
            desc: 'Automatically track work hours, productivity trends, and active sessions with precision.',
            icon: Clock,
            color: 'text-green-500',
            bg: 'bg-green-50'
        },
        {
            title: 'Workforce visibility',
            desc: 'Gain real-time operational visibility across remote and distributed teams.',
            icon: Users,
            color: 'text-blue-500',
            bg: 'bg-blue-50'
        },
        {
            title: 'Productivity analytics',
            desc: 'Transform workforce data into actionable insights with detailed reports and dashboards.',
            icon: BarChart3,
            color: 'text-purple-500',
            bg: 'bg-purple-50'
        },
        {
            title: 'Team activity reports',
            desc: 'Review productivity patterns, attendance, and operational performance in one place.',
            icon: FileText,
            color: 'text-yellow-500',
            bg: 'bg-yellow-50'
        },
        {
            title: 'Enterprise security',
            desc: 'Built with enterprise-grade infrastructure, encryption, and secure access controls.',
            icon: Lock,
            color: 'text-green-600',
            bg: 'bg-green-50'
        },
        {
            title: 'Ethical monitoring',
            desc: 'Transparent, consent-based tracking built around trust and accountability.',
            icon: Shield,
            color: 'text-orange-500',
            bg: 'bg-orange-50'
        }
    ];

    const industries = [
        { name: 'Remote teams', icon: Globe, color: 'text-yellow-500' },
        { name: 'Staffing agencies', icon: Users, color: 'text-blue-400' },
        { name: 'Software houses', icon: Monitor, color: 'text-blue-600' },
        { name: 'Customer support teams', icon: MessageSquare, color: 'text-blue-500' },
        { name: 'Virtual assistants', icon: Users, color: 'text-blue-400' },
        { name: 'Enterprise operations', icon: Briefcase, color: 'text-blue-600' },
        { name: 'Distributed workforces', icon: Globe, color: 'text-blue-500' }
    ];

    const steps = [
        { num: 1, title: 'Create your admin account', desc: 'Set up your TrackOwl™ workspace with secure, free admin account creation and enterprise-ready onboarding.', color: 'bg-green-500', text: 'text-green-500' },
        { num: 2, title: 'Create your organization', desc: 'Configure your organization structure, workforce settings, operational policies, and tracking preferences.', color: 'bg-blue-600', text: 'text-blue-600' },
        { num: 3, title: 'Invite your team members', desc: 'Easily invite employees, contractors, and remote staff to join your organization\'s workspace.', color: 'bg-orange-500', text: 'text-orange-500' },
        { num: 4, title: 'Install TrackOwl™', desc: 'Deploy the TrackOwl™ desktop application with secure, consent-based workforce tracking.', color: 'bg-green-500', text: 'text-green-500' },
        { num: 5, title: 'Monitor operations', desc: 'Track productivity, attendance, app usage, screenshots, and workforce activity in real time through a centralized dashboard.', color: 'bg-blue-600', text: 'text-blue-600' },
        { num: 6, title: 'Optimize performance', desc: 'Use analytics, reports, and operational insights to improve accountability, efficiency, and team performance.', color: 'bg-orange-500', text: 'text-orange-500' }
    ];

    const testimonials = [
        {
            quote: "TrackOwl™ gave us complete operational visibility across our remote workforce without creating a culture of micromanagement.",
            author: "Operations Director",
            role: "Remote BPO"
        },
        {
            quote: "The analytics and reporting capabilities helped us identify inefficiencies we never noticed before.",
            author: "Founder",
            role: "Digital Agency"
        },
        {
            quote: "Clean interface, powerful insights, and enterprise-level reliability.",
            author: "Workforce Manager",
            role: "Distributed Team"
        }
    ];

    const faqs = [
        {
            q: "Does TrackOwl™ monitor employees secretly?",
            a: "No. TrackOwl™ is designed around ethical and transparent workforce visibility with consent-based tracking."
        },
        {
            q: "Is TrackOwl™ suitable for enterprise organizations?",
            a: "Yes. TrackOwl™ is built for scalability, operational reliability, and enterprise workforce management."
        },
        {
            q: "Is workforce data secure?",
            a: "Yes. We implement enterprise-grade security measures, encryption, and role-based access controls."
        },
        {
            q: "Does TrackOwl™ support remote teams?",
            a: "Absolutely. TrackOwl™ was specifically built for remote, hybrid, and distributed workforces."
        },
        {
            q: "Can employees access their own activity data?",
            a: "Yes. Users can access information associated with their own accounts."
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans tracking-[0.03em] text-slate-900 selection:bg-blue-500/20 selection:text-blue-900 overflow-x-hidden relative">

            {/* Navigation */}
            <header className={twMerge(
                "fixed top-0 left-0 right-0 z-[100] transition-all duration-500",
                isScrolled
                    ? "bg-[#001338]/95 backdrop-blur-xl border-b border-white/10 py-2 sm:py-3 shadow-2xl"
                    : "bg-[#001338] border-transparent py-3 sm:py-5"
            )}>
                <nav className="mx-auto flex max-w-[1400px] h-14 sm:h-20 items-center justify-between px-4 sm:px-6 lg:px-8 relative">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <img src={HeaderLogo} alt="TrackOwl" className="h-8 sm:h-12 object-contain drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] group-hover:scale-105 transition-transform" />
                    </motion.div>

                    <div className="hidden xl:flex items-center gap-8">
                        <a href="#features" className="text-base font-semibold text-slate-300 hover:text-white transition-colors">Features</a>
                        <a href="#showcase" className="text-base font-semibold text-slate-300 hover:text-white transition-colors">Solutions</a>
                        <a href="#industries" className="text-base font-semibold text-slate-300 hover:text-white transition-colors">Industries</a>
                        <a href="#how-it-works" className="text-base font-semibold text-slate-300 hover:text-white transition-colors">How it works</a>
                        <a href="#pricing" className="text-base font-semibold text-slate-300 hover:text-white transition-colors">Pricing</a>
                        <a href="#faq" className="text-base font-semibold text-slate-300 hover:text-white transition-colors">FAQ</a>
                    </div>

                    <div className="flex items-center gap-6">
                        <a
                            href="#download"
                            className="hidden lg:flex items-center gap-2 text-base font-bold text-white hover:text-blue-400 transition-colors"
                        >
                            <Download className="w-4 h-4" /> Download
                        </a>
                        <button
                            onClick={() => navigate('/login')}
                            className="hidden sm:block text-base font-bold text-white hover:text-[#facc15] transition-colors"
                        >
                            Log in
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-5 sm:px-6 py-2 sm:py-2.5 bg-[#facc15] hover:bg-[#eab308] text-[#001338] text-sm sm:text-base font-black rounded-full shadow-[0_4px_14px_rgba(250,204,21,0.4)] transition-all hover:scale-105 active:scale-95"
                        >
                            Start free trial
                        </button>
                    </div>
                </nav>
            </header>

            <main className="relative z-10">
                {/* HERO SECTION - DARK NAVY */}
                <section className="bg-[#001338] relative pt-36 lg:pt-48 pb-32 lg:pb-56 overflow-hidden">
                    {/* Background glowing effects */}
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#002766] blur-[150px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none" />

                    <div className="mx-auto max-w-[1400px] px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">

                        {/* Hero Text Content */}
                        <div className="col-span-12 lg:col-span-5 flex flex-col items-start text-left">
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-sm font-bold text-blue-300 mb-6"
                            >
                                #1 workforce analytics platform
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl sm:text-5xl lg:text-[64px] font-black tracking-normal leading-[1.05] text-white mb-6"
                            >
                                Time tracking<br />built for<br />
                                <span className="text-[#facc15] block mt-2">
                                    <AnimatePresence mode="popLayout">
                                        <motion.span
                                            key={currentSlide}
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -20, opacity: 0 }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            className="block"
                                        >
                                            {headlineSlides[currentSlide]}
                                        </motion.span>
                                    </AnimatePresence>
                                </span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 max-w-lg font-medium"
                            >
                                TrackOwl™ helps businesses monitor productivity, track work hours, and gain real-time workforce visibility — without micromanagement.<br /><br />
                                Built for remote, hybrid, and distributed teams that need operational clarity at scale.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-8"
                            >
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-[#facc15] hover:bg-[#eab308] text-[#001338] text-base font-black rounded-full shadow-[0_4px_20px_rgba(250,204,21,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group"
                                >
                                    Start free trial
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button
                                    onClick={() => window.location.href = 'mailto:hello@trackowl.io'}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-transparent border-2 border-white/20 hover:border-white/40 text-white text-base font-bold rounded-full transition-all active:scale-95 flex items-center justify-center">
                                    Book a demo
                                </button>
                            </motion.div>

                            {/* Trust Line */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="flex items-start sm:items-center gap-3 text-slate-300 text-sm font-medium"
                            >
                                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                    <Check className="w-4 h-4 text-green-400" />
                                </div>
                                Trusted by remote teams, agencies, and modern enterprises worldwide.
                            </motion.div>
                        </div>

                        {/* Hero Dashboard Mockup Container */}
                        <div className="col-span-12 lg:col-span-7 relative lg:-mr-32 xl:-mr-48 z-20 mt-12 lg:mt-0">
                            <motion.div
                                initial={{ opacity: 0, y: 40, rotateY: 10 }}
                                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="relative rounded-[1.5rem] border-[6px] border-[#001b4d] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] bg-white overflow-hidden"
                            >
                                {/* Browser-like Header */}
                                <div className="h-10 bg-[#001b4d] flex items-center px-4 gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                    </div>
                                </div>

                                {/* Mockup Content (Simulated Dashboard) */}
                                <img src={HeroDashboard} alt="Dashboard Preview" className="w-full h-auto object-cover border-t border-white/10" />
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* HERO METRICS OVERLAP */}
                <div className="relative z-30 mx-auto max-w-[1200px] px-4 -mt-20 lg:-mt-24 mb-16">
                    <div className="bg-white rounded-[2rem] md:rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-4 px-6 md:px-8 flex flex-col md:flex-row items-center justify-between border border-slate-100">
                        {metrics.map((m, i) => {
                            const Icon = m.icon;
                            return (
                                <div key={i} className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start py-3 md:py-0 border-b md:border-b-0 md:border-r border-slate-100 last:border-0 px-4">
                                    <div className={`p-2 rounded-lg bg-slate-50 ${m.color}`}>
                                        <Icon className="w-6 h-6" strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-base font-black text-slate-900 leading-tight">{m.title}</span>
                                        <span className="text-xs font-semibold text-slate-500 leading-tight">{m.subtitle}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* FEATURES SECTION */}
                <section id="features" className="py-16 bg-slate-50">
                    <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-[#facc15] text-base font-black mb-3">Powerful features</h2>
                            <h3 className="text-3xl md:text-5xl font-black text-[#001b4d] mb-4">Powerful workforce intelligence</h3>
                            <p className="text-lg font-medium text-slate-500">Everything you need to track, monitor, and optimize your team performance.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {features.map((f, i) => {
                                const Icon = f.icon;
                                return (
                                    <div key={i} className="p-6 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex gap-5 items-start">
                                        <div className={twMerge("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", f.bg, f.color)}>
                                            <Icon className="w-6 h-6" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-slate-900 mb-2">{f.title}</h4>
                                            <p className="text-base font-medium text-slate-500 leading-relaxed">{f.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* PLATFORM SHOWCASE SECTION */}
                <section id="showcase" className="py-24 bg-white overflow-hidden">
                    <div className="mx-auto max-w-[1200px] px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="relative">
                            <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden flex">
                                <img src={ShowcaseDashboard} alt="Platform Showcase" className="w-full h-auto object-cover" />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-3xl md:text-5xl font-black text-[#001b4d] mb-6 leading-tight">One platform.<br />Complete operational visibility.</h2>
                            <p className="text-lg font-medium text-slate-500 mb-8 leading-relaxed max-w-md">
                                TrackOwl™ centralizes time tracking, team monitoring, analytics, screenshots, attendance, app usage, and reporting into a unified operational dashboard.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-2">
                                {[
                                    'Real-time team monitoring',
                                    'Team attendance management',
                                    'Smart productivity analytics',
                                    'Detailed operational reporting',
                                    'App & website usage tracking',
                                    'Secure workforce analytics',
                                    'Screenshot visibility system'
                                ].map((hl, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                            <Check className="w-4 h-4 text-white" strokeWidth={3} />
                                        </div>
                                        <span className="text-base font-bold text-slate-800">{hl}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* INDUSTRIES SECTION */}
                <section id="industries" className="py-16 bg-slate-50">
                    <div className="mx-auto max-w-[1200px] px-6 lg:px-8 text-center">
                        <h2 className="text-2xl font-black text-[#001b4d] mb-10">Built for modern businesses</h2>
                        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                            {industries.map((ind, i) => {
                                const Icon = ind.icon;
                                return (
                                    <div key={i} className="flex flex-col items-center gap-3">
                                        <Icon className={`w-10 h-10 ${ind.color}`} strokeWidth={1.5} />
                                        <span className="text-sm font-bold text-slate-600">{ind.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS */}
                <section id="how-it-works" className="py-24 bg-white">
                    <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-black text-[#001b4d]">Simple setup. Powerful insights.</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                            {steps.map((s, i) => (
                                <div key={i} className="relative flex flex-col items-center text-center">
                                    {/* Arrow connector for desktop */}
                                    {i < steps.length - 1 && (i + 1) % 3 !== 0 && (
                                        <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-[2px] bg-yellow-400/30 z-0">
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 border-t-2 border-r-2 border-yellow-400 rotate-45" />
                                        </div>
                                    )}
                                    <div className="flex flex-col items-start text-left bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 shadow-sm w-full relative z-10 h-full">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`w-12 h-12 rounded-full ${s.color} text-white flex items-center justify-center text-xl font-black`}>
                                                {s.num}
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900">{s.title}</h3>
                                        </div>
                                        <p className="text-base font-medium text-slate-500 leading-relaxed mb-6">{s.desc}</p>

                                        {/* Little illustrations inside the card */}
                                        <div className="mt-auto w-full h-24 bg-white rounded-xl border border-slate-100 flex items-center justify-center p-3">
                                            {i === 0 && (
                                                <div className="w-full h-full bg-green-50 rounded border border-green-100 flex items-center justify-center relative">
                                                    <div className="w-12 h-14 bg-white border border-green-200 rounded shadow-sm flex flex-col items-center justify-center gap-2">
                                                        <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600"><Shield className="w-3 h-3" /></div>
                                                        <div className="w-6 h-1 bg-green-200 rounded-full" />
                                                    </div>
                                                </div>
                                            )}
                                            {i === 1 && (
                                                <div className="w-full h-full bg-blue-50 rounded border border-blue-100 flex flex-col items-center justify-center gap-1.5">
                                                    <div className="w-8 h-4 bg-blue-500 rounded-sm shadow-sm" />
                                                    <div className="w-12 h-px bg-blue-300" />
                                                    <div className="flex gap-2">
                                                        <div className="w-6 h-4 bg-blue-400 rounded-sm shadow-sm" />
                                                        <div className="w-6 h-4 bg-blue-400 rounded-sm shadow-sm" />
                                                    </div>
                                                </div>
                                            )}
                                            {i === 2 && (
                                                <div className="w-full h-full bg-orange-50 rounded border border-orange-100 flex items-center justify-center relative">
                                                    <div className="w-14 h-10 bg-white border border-orange-200 rounded shadow-sm flex flex-col justify-center px-2 gap-1.5 relative z-10">
                                                        <div className="w-full h-1 bg-orange-100 rounded-full" />
                                                        <div className="w-2/3 h-1 bg-orange-100 rounded-full" />
                                                        <div className="absolute -right-2 -bottom-2 w-6 h-6 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-white font-black text-sm leading-none">+</div>
                                                    </div>
                                                </div>
                                            )}
                                            {i === 3 && (
                                                <div className="w-full h-full bg-green-50 rounded border border-green-100 flex items-center justify-center">
                                                    <div className="relative">
                                                        <Monitor className="w-10 h-10 text-green-500" strokeWidth={1.5} />
                                                        <div className="absolute inset-0 flex items-center justify-center mb-1">
                                                            <Download className="w-4 h-4 text-green-600" strokeWidth={3} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {i === 4 && (
                                                <div className="w-full h-full bg-blue-50 rounded border border-blue-100 flex flex-col p-2 gap-1.5">
                                                    <div className="w-full flex gap-1.5 h-1/2">
                                                        <div className="flex-1 bg-blue-200 rounded-sm" />
                                                        <div className="flex-[2] bg-blue-400 rounded-sm shadow-sm" />
                                                    </div>
                                                    <div className="w-full flex gap-1.5 h-1/2">
                                                        <div className="flex-1 bg-blue-300 rounded-sm shadow-sm" />
                                                        <div className="flex-1 bg-blue-500 rounded-sm shadow-sm" />
                                                        <div className="flex-1 bg-blue-400 rounded-sm shadow-sm" />
                                                    </div>
                                                </div>
                                            )}
                                            {i === 5 && (
                                                <div className="w-full h-full bg-orange-50 rounded border border-orange-100 flex flex-col justify-end p-2 relative overflow-hidden">
                                                    <TrendingUp className="w-10 h-10 text-orange-500 absolute top-2 right-2 opacity-20" />
                                                    <div className="flex items-end justify-between gap-1 w-full h-full z-10 pt-4">
                                                        {[30, 45, 40, 60, 55, 80, 95].map((h, j) => (
                                                            <div key={j} className="w-full bg-gradient-to-t from-orange-400 to-orange-300 rounded-t-sm shadow-sm" style={{ height: `${h}%` }} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* TESTIMONIALS */}
                <section className="py-16 bg-slate-50">
                    <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-black text-[#001b4d]">What teams are saying</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {testimonials.map((t, i) => (
                                <div key={i} className="p-8 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between relative">
                                    <div className="absolute top-6 left-6 text-blue-100 text-6xl font-serif leading-none">"</div>
                                    <p className="text-lg text-slate-700 font-medium mb-8 leading-relaxed relative z-10 pt-4">{t.quote}</p>
                                    <div className="flex items-center gap-3">
                                        <img src={`https://i.pravatar.cc/100?img=${i + 10}`} className="w-14 h-14 rounded-full" alt="" />
                                        <div>
                                            <div className="text-base font-bold text-slate-900">{t.author}</div>
                                            <div className="text-sm font-semibold text-slate-500">{t.role}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECURITY & PRIVACY SECTION */}
                <section id="security" className="py-24 bg-white">
                    <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                            {/* Security Card - Dark */}
                            <div className="col-span-3 rounded-[2rem] bg-[#001338] p-6 md:p-10 flex flex-col justify-center relative overflow-hidden text-white shadow-xl">
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-20 pointer-events-none">
                                    <Shield className="w-64 h-64 text-blue-400" strokeWidth={1} />
                                </div>

                                <h2 className="text-3xl font-black mb-4 relative z-10">Enterprise-grade security & privacy</h2>
                                <p className="text-lg text-slate-300 mb-8 max-w-md relative z-10">
                                    TrackOwl™ is built with security, transparency, and ethical monitoring at its core.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 relative z-10">
                                    {[
                                        'HTTPS/TLS encryption', 'Consent-based tracking',
                                        'Secure cloud infrastructure', 'Secure data storage',
                                        'Role-based access control', 'Continuous security monitoring'
                                    ].map((s, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <Check className="w-6 h-6 text-blue-400 shrink-0" strokeWidth={3} />
                                            <span className="text-base font-bold text-slate-200">{s}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Privacy Card - Light */}
                            <div className="col-span-2 rounded-[2rem] bg-blue-50 border border-blue-100 p-6 md:p-10 flex flex-col justify-center relative">
                                <div className="absolute top-10 right-10 w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                                    <Users className="w-10 h-10 text-blue-600" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" strokeWidth={4} />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-[#001b4d] mb-4 mt-16 lg:mt-0 max-w-[200px]">Privacy commitment</h3>
                                <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-[300px]">
                                    Tracking-related information is visible only to authorized administrators and the associated user account owner.
                                </p>
                            </div>

                        </div>
                    </div>
                </section>

                {/* PRICING SECTION */}
                <section id="pricing" className="py-16 bg-slate-50">
                    <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-black text-[#001b4d]">Flexible plans for every team</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">

                            {/* Basic */}
                            <div className="p-8 rounded-[1.5rem] bg-white border border-slate-200 flex flex-col h-full">
                                <div className="flex-1 mb-8">
                                    <h3 className="text-2xl font-black text-slate-900 mb-3">Basic</h3>
                                    <p className="text-base font-medium text-slate-500 leading-relaxed">For small teams getting started with time tracking.</p>
                                </div>
                                <div className="mb-6">
                                    <span className="text-4xl font-black text-slate-900">$2.99</span>
                                    <span className="text-base font-bold text-slate-500"> /user</span>
                                </div>
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="w-full py-4 rounded-lg bg-green-500 hover:bg-green-600 text-white text-lg font-bold transition-colors shadow-md mt-auto">
                                    Get started
                                </button>
                            </div>

                            {/* Premium (Most Popular) */}
                            <div className="p-8 rounded-[1.5rem] bg-white border-2 border-blue-600 flex flex-col relative shadow-[0_10px_30px_rgba(37,99,235,0.15)] transform md:-translate-y-2 h-full mt-8 md:mt-0">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-[#facc15] text-[#001b4d] text-sm font-black rounded-full tracking-wider shadow-sm border-2 border-white">
                                    Most popular
                                </div>
                                <div className="flex-1 mb-8 pt-2">
                                    <h3 className="text-2xl font-black text-slate-900 mb-3">Premium</h3>
                                    <p className="text-base font-medium text-slate-500 leading-relaxed pr-4">Advanced analytics and operational reporting for scaling businesses.</p>
                                </div>
                                <div className="mb-6">
                                    <span className="text-4xl font-black text-slate-900">$4.99</span>
                                    <span className="text-base font-bold text-slate-500"> /user</span>
                                </div>
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="w-full py-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold transition-colors shadow-md mt-auto">
                                    Start free trial
                                </button>
                            </div>

                            {/* Enterprise */}
                            <div className="p-8 rounded-[1.5rem] bg-white border border-slate-200 flex flex-col h-full">
                                <div className="flex-1 mb-8">
                                    <h3 className="text-2xl font-black text-slate-900 mb-3">Enterprise</h3>
                                    <p className="text-base font-medium text-slate-500 leading-relaxed">Custom infrastructure, enterprise onboarding, and large-scale workforce management solutions.</p>
                                </div>
                                <div className="mb-6 flex items-center h-[48px]">
                                    <span className="text-3xl font-black text-slate-900">Custom</span>
                                </div>
                                <button
                                    onClick={() => window.location.href = 'mailto:hello@trackowl.io'}
                                    className="w-full py-4 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-[#001b4d] text-lg font-bold transition-colors shadow-md mt-auto">
                                    Talk to sales
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ SECTION */}
                <section id="faq" className="py-24 bg-white">
                    <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl font-black text-[#001b4d]">Frequently asked questions</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {/* Left Column */}
                            <div className="space-y-4">
                                {[0, 2, 4].map((i) => (
                                    <div key={i} className="border-b border-slate-100">
                                        <button
                                            onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                                            className="w-full py-5 flex items-center justify-between text-left text-lg font-bold text-slate-800 focus:outline-none"
                                        >
                                            {faqs[i].q}
                                            <ChevronDown className={twMerge("w-5 h-5 text-blue-600 transition-transform", activeFaq === i && "rotate-180")} />
                                        </button>
                                        <AnimatePresence>
                                            {activeFaq === i && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: 'auto' }}
                                                    exit={{ height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pb-5 text-slate-500 text-base font-medium leading-relaxed">
                                                        {faqs[i].a}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4">
                                {[1, 3].map((i) => (
                                    <div key={i} className="border-b border-slate-100">
                                        <button
                                            onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                                            className="w-full py-5 flex items-center justify-between text-left text-lg font-bold text-slate-800 focus:outline-none"
                                        >
                                            {faqs[i].q}
                                            <ChevronDown className={twMerge("w-5 h-5 text-blue-600 transition-transform", activeFaq === i && "rotate-180")} />
                                        </button>
                                        <AnimatePresence>
                                            {activeFaq === i && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: 'auto' }}
                                                    exit={{ height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pb-5 text-slate-500 text-base font-medium leading-relaxed">
                                                        {faqs[i].a}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* DOWNLOAD SECTION */}
                <section id="download" className="py-24 bg-blue-600 relative overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-50 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-700 rounded-full blur-3xl opacity-50 -translate-x-1/3 translate-y-1/3 pointer-events-none" />

                    <div className="mx-auto max-w-[1200px] px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-black text-white mb-6">Download the TrackOwl™ desktop app</h2>
                            <p className="text-xl text-blue-100 font-medium max-w-2xl mx-auto">
                                The lightweight, secure desktop client your team needs to log time, capture activity, and stay productive.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Windows */}
                            <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center shadow-xl hover:-translate-y-2 transition-transform duration-300">
                                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                                    <Monitor className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Windows</h3>
                                <p className="text-slate-500 font-medium mb-6">Windows 10 and 11 (64-bit)</p>
                                <div className="w-full flex flex-col gap-3 mt-auto">
                                    <a
                                        href="https://github.com/furqan-debug/TrackOwl/releases/download/v1.4.6/TrackOwl_1.4.6_x64-setup.exe"
                                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                        <Download className="w-4 h-4" /> Download .exe
                                    </a>
                                    <a
                                        href="https://github.com/furqan-debug/TrackOwl/releases/download/v1.4.6/TrackOwl_1.4.6_x64_en-US.msi"
                                        className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                        <Download className="w-4 h-4" /> Download .msi
                                    </a>
                                </div>
                            </div>

                            {/* Mac */}
                            <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center shadow-xl hover:-translate-y-2 transition-transform duration-300">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-800 mb-6">
                                    <Monitor className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">macOS</h3>
                                <p className="text-slate-500 font-medium mb-6">macOS 11.0 (Big Sur) or later</p>
                                <div className="w-full flex flex-col gap-3 mt-auto">
                                    <a
                                        href="https://github.com/furqan-debug/TrackOwl/releases/download/v1.4.6/TrackOwl_1.4.6_aarch64.dmg"
                                        className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                        <Download className="w-4 h-4" /> Apple Silicon (M1/M2/M3)
                                    </a>
                                    <a
                                        href="https://github.com/furqan-debug/TrackOwl/releases/download/v1.4.6/TrackOwl_1.4.6_x64.dmg"
                                        className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                        <Download className="w-4 h-4" /> Intel Processor
                                    </a>
                                </div>
                            </div>

                            {/* Linux */}
                            <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center shadow-xl hover:-translate-y-2 transition-transform duration-300">
                                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-6">
                                    <Monitor className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Linux</h3>
                                <p className="text-slate-500 font-medium mb-8">Ubuntu, Debian, Fedora (.deb / .rpm)</p>
                                <button
                                    disabled
                                    className="w-full py-4 px-6 bg-orange-100 text-orange-500 text-lg font-bold rounded-lg flex items-center justify-center gap-2 mt-auto cursor-not-allowed border border-orange-200">
                                    Coming Soon
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            {/* FINAL CTA SECTION */}
            <section className="bg-[#001338] py-16 md:py-24 relative z-10 border-b border-white/10">
                <div className="mx-auto max-w-[1200px] px-6 lg:px-8 text-center flex flex-col items-center">
                    <img src={HeaderLogo} className="h-16 object-contain drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] mb-6" alt="TrackOwl" />
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6">Gain complete workforce visibility</h2>
                    <p className="text-2xl text-slate-300 font-medium mb-10 max-w-3xl leading-relaxed">
                        Track productivity, improve accountability, and operate with confidence using TrackOwl™.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate('/signup')}
                            className="w-full sm:w-auto px-12 py-5 bg-[#facc15] hover:bg-[#eab308] text-[#001338] text-lg font-black rounded-full shadow-[0_4px_20px_rgba(250,204,21,0.4)] transition-all hover:scale-105 active:scale-95">
                            Start free trial
                        </button>
                        <button
                            onClick={() => window.location.href = 'mailto:hello@trackowl.io'}
                            className="w-full sm:w-auto px-12 py-5 bg-transparent border-2 border-white/20 hover:border-white/40 text-white text-lg font-bold rounded-full transition-all active:scale-95">
                            Schedule a demo
                        </button>
                    </div>
                    <p className="text-lg font-medium text-slate-400">Built for modern businesses managing remote teams at scale.</p>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-[#001338] pt-20 pb-10 relative z-10">
                <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                        <div>
                            <h4 className="text-white font-bold mb-6 tracking-wide">Product</h4>
                            <ul className="space-y-4 text-sm text-slate-400">
                                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                                <li><a href="#security" className="hover:text-white transition-colors">Security</a></li>
                                <li><a href="#showcase" className="hover:text-white transition-colors">Integrations</a></li>
                                <li><a href="/help" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Help Center</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-bold mb-6 tracking-wide">Company</h4>
                            <ul className="space-y-4 text-sm text-slate-400">
                                <li><a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors">About us</a></li>
                                <li><a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors">Careers</a></li>
                                <li><a href="mailto:hello@trackowl.io" className="hover:text-white transition-colors">Contact</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-bold mb-6 tracking-wide">Legal</h4>
                            <ul className="space-y-4 text-sm text-slate-400">
                                <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Privacy policy</a></li>
                                <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Terms of service</a></li>
                                <li><a href="#security" className="hover:text-white transition-colors">Security</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-bold mb-6 tracking-wide">Contact</h4>
                            <ul className="space-y-4 text-sm text-slate-400">
                                <li>
                                    <a href="mailto:hello@trackowl.io" className="hover:text-[#facc15] font-medium transition-colors flex items-center gap-2">
                                        hello@trackowl.io
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
                        <img src={HeaderLogo} className="h-6 object-contain opacity-50 hover:opacity-100 transition-opacity" alt="TrackOwl" />
                        <p>TrackOwl™ , a product by DigiReps™</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

