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
    Download,
    ArrowUp,
    Palette,
    Laptop,
    ShoppingCart,
    X,
    Send,
    Loader2
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import HeaderLogo from '../assets/branding/header-2.svg';
import HeroDashboard from '../assets/branding/hero-dashboard.png';
import ShowcaseDashboard from '../assets/branding/showcase-dashboard.png';
import { Footer } from '../components/Footer';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialRequestType: 'sales' | 'demo' | 'general';
}

export function ContactModal({ isOpen, onClose, initialRequestType }: ContactModalProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [teamSize, setTeamSize] = useState('1-5');
    const [message, setMessage] = useState('');
    const [requestType, setRequestType] = useState(initialRequestType);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requestTypeOpen, setRequestTypeOpen] = useState(false);
    const [teamSizeOpen, setTeamSizeOpen] = useState(false);

    const requestTypeOptions = [
        { value: 'sales', label: 'Talk to Sales' },
        { value: 'demo', label: 'Book / Schedule a Demo' },
        { value: 'general', label: 'General Inquiry' }
    ];

    const teamSizeOptions = [
        { value: '1-5', label: '1-5 members' },
        { value: '6-15', label: '6-15 members' },
        { value: '16-50', label: '16-50 members' },
        { value: '51-200', label: '51-200 members' },
        { value: '200+', label: '200+ members' }
    ];

    useEffect(() => {
        setRequestType(initialRequestType);
    }, [initialRequestType]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const rawKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
            const cleanKey = (rawKey || '').trim();
            
            if (!cleanKey || cleanKey === "YOUR_KEY_HERE" || cleanKey === "") {
                throw new Error("Web3Forms Access Key is not configured. Please add the VITE_WEB3FORMS_ACCESS_KEY environment variable in your Vercel settings to enable email notifications.");
            }

            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(cleanKey)) {
                throw new Error("The VITE_WEB3FORMS_ACCESS_KEY you entered in Vercel is not in the correct format. It must be a 36-character UUID (e.g., 12345678-abcd-1234-abcd-123456789abc). Please make sure you copied the Access Key sent to your email (furqan@digireps.co) and not a form name or other ID.");
            }
            
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    access_key: cleanKey,
                    name: name,
                    email: email,
                    subject: `TrackOwl Lead - ${requestType === 'sales' ? 'Talk to Sales' : 'Schedule a Demo'}: ${name} (${company})`,
                    to: "nash@digireps.co",
                    from_name: "TrackOwl Contact System",
                    message: `You have received a new contact submission from TrackOwl Landing Page.
                    
Request Type: ${requestType === 'sales' ? 'Talk to Sales' : 'Schedule a Demo'}
Name: ${name}
Email: ${email}
Company: ${company}
Team Size: ${teamSize}

Message:
${message}`
                })
            });

            const web3Data = await response.json();
            console.log("Web3Forms Submission status:", web3Data);

            if (!response.ok || !web3Data.success) {
                throw new Error(web3Data.message || "Failed to submit request. Please verify VITE_WEB3FORMS_ACCESS_KEY is set.");
            }

            setSuccess(true);
        } catch (err: any) {
            console.error("Submission failed:", err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] text-left">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#001338] text-white">
                    <div>
                        <h3 className="text-xl font-bold">Contact TrackOwl</h3>
                        <p className="text-xs text-slate-300">We'll get back to you shortly</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {success ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-2">
                            <Check className="w-8 h-8" strokeWidth={3} />
                        </div>
                        <h4 className="text-2xl font-bold text-slate-900">Thank you!</h4>
                        <p className="text-sm text-slate-500 max-w-sm">
                            Your details have been submitted. A TrackOwl sales representative will email you at <span className="font-bold">{email}</span> shortly.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setSuccess(false);
                                setName('');
                                setEmail('');
                                setCompany('');
                                setTeamSize('1-5');
                                setMessage('');
                                onClose();
                            }}
                            className="mt-6 px-6 py-2.5 bg-[#001338] hover:bg-[#002766] text-white text-sm font-bold rounded-xl transition-all"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-700">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 font-bold">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Request Type</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setRequestTypeOpen(!requestTypeOpen)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 bg-slate-50 focus:border-blue-600 outline-none flex items-center justify-between cursor-pointer"
                                >
                                    <span>{requestTypeOptions.find(o => o.value === requestType)?.label || 'Select request type'}</span>
                                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${requestTypeOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {requestTypeOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setRequestTypeOpen(false)} />
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                                            {requestTypeOptions.map((opt) => (
                                                <div
                                                    key={opt.value}
                                                    onClick={() => {
                                                        setRequestType(opt.value as any);
                                                        setRequestTypeOpen(false);
                                                    }}
                                                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                                                        requestType === opt.value
                                                            ? 'bg-blue-600 text-white font-bold'
                                                            : 'text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Full Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:border-blue-600 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Business Email</label>
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="john@company.com"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:border-blue-600 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Company Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    placeholder="Acme Corp"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:border-blue-600 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Team Size</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setTeamSizeOpen(!teamSizeOpen)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 bg-white focus:border-blue-600 outline-none flex items-center justify-between cursor-pointer"
                                >
                                    <span>{teamSizeOptions.find(o => o.value === teamSize)?.label || 'Select team size'}</span>
                                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${teamSizeOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {teamSizeOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setTeamSizeOpen(false)} />
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                                            {teamSizeOptions.map((opt) => (
                                                <div
                                                    key={opt.value}
                                                    onClick={() => {
                                                        setTeamSize(opt.value);
                                                        setTeamSizeOpen(false);
                                                    }}
                                                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                                                        teamSize === opt.value
                                                            ? 'bg-blue-600 text-white font-bold'
                                                            : 'text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Your Message</label>
                            <textarea 
                                required
                                rows={3}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Describe what you're looking for..."
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:border-blue-600 outline-none resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-[#001338] hover:bg-[#002766] text-white text-base font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-4 disabled:opacity-75"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Submit Request
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export function Landing() {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const [recommendedOS, setRecommendedOS] = useState<'windows' | 'mac-silicon' | 'mac-intel' | 'linux' | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [contactType, setContactType] = useState<'sales' | 'demo' | 'general'>('sales');

    useEffect(() => {
        const detectOS = async () => {
            try {
                const ua = navigator.userAgent.toLowerCase();
                if (ua.includes('win')) {
                    setRecommendedOS('windows');
                } else if (ua.includes('linux') && !ua.includes('android')) {
                    setRecommendedOS('linux');
                } else if (ua.includes('mac')) {
                    if ('userAgentData' in navigator && typeof (navigator as any).userAgentData.getHighEntropyValues === 'function') {
                        const values = await (navigator as any).userAgentData.getHighEntropyValues(['architecture']);
                        if (values.architecture === 'arm') {
                            setRecommendedOS('mac-silicon');
                            return;
                        } else if (values.architecture === 'x86') {
                            setRecommendedOS('mac-intel');
                            return;
                        }
                    } 
                    
                    // Fallback for Safari/Firefox using WebGL Texture Compression support
                    // Apple Silicon GPUs (M1/M2/M3) share iOS architecture and support ASTC/ETC/PVRTC.
                    // Intel/AMD desktop GPUs on Macs do NOT support these mobile compression formats.
                    try {
                        const canvas = document.createElement('canvas');
                        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                        if (gl) {
                            const extensions = (gl as WebGLRenderingContext).getSupportedExtensions();
                            if (extensions) {
                                const isAppleSilicon = extensions.includes('WEBGL_compressed_texture_astc') || 
                                                       extensions.includes('WEBGL_compressed_texture_etc') || 
                                                       extensions.includes('WEBKIT_WEBGL_compressed_texture_pvrtc');
                                
                                if (isAppleSilicon) {
                                    setRecommendedOS('mac-silicon');
                                    return;
                                } else {
                                    setRecommendedOS('mac-intel');
                                    return;
                                }
                            }
                        }
                    } catch (webglErr) {
                        console.warn('WebGL detection failed', webglErr);
                    }

                    // Ultimate fallback: Just recommend Mac broadly, but don't explicitly recommend Silicon on Intel
                    // We'll leave it empty to avoid false positives, or just suggest Intel since Rosetta runs Intel apps on Silicon, but Silicon apps won't run on Intel.
                    // Actually, let's just not show the badge if we are totally unsure.
                    setRecommendedOS(null);
                }
            } catch (e) {
                console.warn('OS detection failed', e);
            }
        };
        detectOS();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
            setShowScrollTop(window.scrollY > 400);
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
        { name: 'Distributed workforces', icon: Globe, color: 'text-blue-500' },
        { name: 'Consulting firms', icon: FileText, color: 'text-yellow-600' },
        { name: 'Marketing agencies', icon: TrendingUp, color: 'text-emerald-500' },
        { name: 'Design studios', icon: Palette, color: 'text-pink-500' },
        { name: 'Freelancers & Contractors', icon: Laptop, color: 'text-indigo-500' },
        { name: 'E-commerce teams', icon: ShoppingCart, color: 'text-cyan-500' }
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
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-500/20 selection:text-blue-900 overflow-x-hidden relative">

            {/* Navigation */}
            <header className={twMerge(
                "fixed top-0 left-0 right-0 z-[100] transition-all duration-500",
                isScrolled
                    ? "bg-[#001338]/95 backdrop-blur-xl border-b border-white/10 py-2 sm:py-3 shadow-2xl"
                    : "bg-transparent border-transparent py-3 sm:py-5"
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
                        <a href="#features" className="text-sm font-medium text-slate-300 hover:text-white hover:scale-102 tracking-wide transition-all">Features</a>
                        <a href="#showcase" className="text-sm font-medium text-slate-300 hover:text-white hover:scale-102 tracking-wide transition-all">Solutions</a>
                        <a href="#industries" className="text-sm font-medium text-slate-300 hover:text-white hover:scale-102 tracking-wide transition-all">Industries</a>
                        <a href="#how-it-works" className="text-sm font-medium text-slate-300 hover:text-white hover:scale-102 tracking-wide transition-all">How it works</a>
                        <a href="#pricing" className="text-sm font-medium text-slate-300 hover:text-white hover:scale-102 tracking-wide transition-all">Pricing</a>
                        <a href="#faq" className="text-sm font-medium text-slate-300 hover:text-white hover:scale-102 tracking-wide transition-all">FAQs</a>
                    </div>

                    <div className="flex items-center gap-6">
                        <a
                            href="#download"
                            className="hidden lg:flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                        >
                            <Download className="w-4 h-4" /> Download
                        </a>
                        <button
                            onClick={() => navigate('/login')}
                            className="text-sm font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors"
                        >
                            Log in
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-5 sm:px-6 py-2 sm:py-2.5 bg-[#facc15] hover:bg-[#eab308] text-[#001338] text-sm sm:text-base font-bold rounded-full shadow-[0_4px_14px_rgba(250,204,21,0.4)] cursor-pointer transition-all hover:scale-105 active:scale-95"
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

                    <div className="mx-auto max-w-[1400px] px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10 w-full">

                        {/* Hero Text Content */}
                        <div className="col-span-1 lg:col-span-5 flex flex-col items-start text-left w-full min-w-0">
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#facc15]/10 border border-[#facc15]/20 text-sm font-bold text-[#facc15] mb-6"
                            >
                                #1 workforce analytics platform
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl sm:text-5xl lg:text-[64px] font-extrabold tracking-normal leading-[1.15] text-white mb-6"
                            >
                                Time tracking<br />built for<br />
                                <span className="text-[#facc15] block mt-2 min-h-[75px] sm:min-h-[85px] lg:min-h-[110px]">
                                    <AnimatePresence mode="wait">
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
                                className="text-base sm:text-lg text-slate-300/90 leading-relaxed mb-8 max-w-lg font-normal tracking-wide"
                            >
                                TrackOwl™ helps businesses monitor productivity, track work hours, and gain real-time workforce visibility, without micromanagement.<br /><br />
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
                                    className="w-full sm:w-auto px-8 py-3.5 bg-[#facc15] hover:bg-[#eab308] text-[#001338] text-base font-bold rounded-full shadow-[0_4px_14px_rgba(250,204,21,0.25)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group"
                                 >
                                    Start free trial
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button
                                    onClick={() => { setContactType('demo'); setIsContactOpen(true); }}
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
                        <div className="col-span-1 lg:col-span-7 relative lg:-mr-32 xl:-mr-48 z-20 mt-12 lg:mt-0 w-full min-w-0">
                            <motion.div
                                initial={{ opacity: 0, y: 40, rotateY: 10 }}
                                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="relative rounded-[1.5rem] border-[6px] border-slate-800/80 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] bg-white overflow-hidden"
                            >
                                {/* Browser-like Header */}
                                <div className="h-10 bg-slate-800/80 flex items-center px-4 gap-2 border-b border-white/5">
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
                            <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#001b4d] mb-4">Powerful workforce intelligence</h3>
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
                                            <p className="text-base font-medium text-slate-500 leading-relaxed text-justify">{f.desc}</p>
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
                            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#001b4d] mb-6 leading-tight">One platform.<br />Complete operational visibility.</h2>
                            <p className="text-lg text-slate-500 mb-8 leading-relaxed max-w-md text-left font-normal">
                                TrackOwl™ centralizes time tracking, team monitoring, analytics, screenshots, attendance, app usage, and reporting into a unified operational dashboard.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
                                {[
                                    'Real-time team monitoring',
                                    'Productivity analytics',
                                    'Operational reporting',
                                    'App & website usage',
                                    'Workforce analytics',
                                    'Screenshot visibility system'
                                ].map((hl, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-blue-600/15 flex items-center justify-center shrink-0 mt-0.5">
                                            <Check className="w-3.5 h-3.5 text-blue-600" strokeWidth={3.5} />
                                        </div>
                                        <span className="text-sm sm:text-base font-semibold text-slate-700 leading-tight">{hl}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* INDUSTRIES SECTION */}
                <section id="industries" className="py-16 bg-slate-50">
                    <div className="mx-auto max-w-[1200px] px-6 lg:px-8 text-center">
                        <h2 className="text-3xl font-extrabold tracking-tight text-[#001b4d] mb-20">Built for modern businesses</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-12 max-w-5xl mx-auto justify-items-center">
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
                            <h2 className="text-3xl font-extrabold tracking-tight text-[#001b4d]">Simple setup. Powerful insights.</h2>
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
                                         <p className="text-base font-medium text-slate-500 leading-relaxed mb-6 text-justify">{s.desc}</p>

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
                            <h2 className="text-3xl font-extrabold tracking-tight text-[#001b4d]">What teams are saying</h2>
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

                                <h2 className="text-3xl font-extrabold tracking-tight mb-4 relative z-10">Enterprise-grade security & privacy</h2>
                                <p className="text-lg text-slate-300 mb-8 max-w-md relative z-10 text-justify">
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
                                <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-[300px] text-justify">
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
                            <h2 className="text-3xl font-extrabold tracking-tight text-[#001b4d]">Flexible plans for every team</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">

                            {/* Basic */}
                            <div className="p-8 rounded-[1.5rem] bg-white border border-slate-200 flex flex-col h-full">
                                <div className="flex-1 mb-8">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Basic</h3>
                                    <p className="text-base font-medium text-slate-500 leading-relaxed">For small teams getting started with time tracking.</p>
                                </div>
                                <div className="mb-6">
                                    <span className="text-4xl font-extrabold text-slate-900">$2.99</span>
                                    <span className="text-base font-bold text-slate-500"> /user</span>
                                </div>
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="w-full py-4 rounded-lg bg-green-500 hover:bg-green-600 text-white text-lg font-bold cursor-pointer transition-colors shadow-md mt-auto">
                                    Get started
                                </button>
                            </div>

                            {/* Premium (Most Popular) */}
                            <div className="p-8 rounded-[1.5rem] bg-white border-2 border-blue-600 flex flex-col relative shadow-[0_10px_30px_rgba(37,99,235,0.15)] transform md:-translate-y-2 h-full mt-8 md:mt-0">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-[#facc15] text-[#001b4d] text-sm font-bold rounded-full tracking-wider shadow-sm border-2 border-white">
                                    Most popular
                                </div>
                                <div className="flex-1 mb-8 pt-2">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Premium</h3>
                                    <p className="text-base font-medium text-slate-500 leading-relaxed pr-4">Advanced analytics and operational reporting for scaling businesses.</p>
                                </div>
                                <div className="mb-6">
                                    <span className="text-4xl font-extrabold text-slate-900">$4.99</span>
                                    <span className="text-base font-bold text-slate-500"> /user</span>
                                </div>
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="w-full py-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold cursor-pointer transition-colors shadow-md mt-auto">
                                    Start free trial
                                </button>
                            </div>

                            {/* Enterprise */}
                            <div className="p-8 rounded-[1.5rem] bg-white border border-slate-200 flex flex-col h-full">
                                <div className="flex-1 mb-8">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Enterprise</h3>
                                    <p className="text-base font-medium text-slate-500 leading-relaxed">Custom infrastructure, enterprise onboarding, and large-scale workforce management solutions.</p>
                                </div>
                                <div className="mb-6 flex items-center h-[48px]">
                                    <span className="text-3xl font-extrabold text-slate-900">Custom</span>
                                </div>
                                <button
                                    onClick={() => { setContactType('sales'); setIsContactOpen(true); }}
                                    className="w-full py-4 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-[#001b4d] text-lg font-bold cursor-pointer transition-colors shadow-md mt-auto">
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
                                                    <div className="pb-5 text-slate-500 text-base font-medium leading-relaxed text-justify">
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
                                                    <div className="pb-5 text-slate-500 text-base font-medium leading-relaxed text-justify">
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
                <section id="download" className="py-24 bg-[#eab308] relative overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl opacity-30 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl opacity-20 -translate-x-1/3 translate-y-1/3 pointer-events-none" />

                    <div className="mx-auto max-w-[1200px] px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-black text-[#001B4D] mb-6">Download the TrackOwl™ desktop app</h2>
                            <p className="text-xl text-[#001B4D]/80 font-medium max-w-2xl mx-auto">
                                The lightweight, secure desktop client your team needs to log time, capture activity, and stay productive.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Windows */}
                            <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center shadow-xl hover:-translate-y-2 transition-transform duration-300">
                                <div className="w-16 h-16 bg-[#F5E6CA] rounded-2xl flex items-center justify-center text-[#B8860B] mb-6">
                                    <Monitor className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Windows</h3>
                                <p className="text-slate-500 font-medium mb-6">Windows 10 and 11 (64-bit)</p>
                                <div className="w-full flex flex-col gap-3 mt-auto">
                                    <a
                                        href="https://github.com/furqan-debug/TrackOwl/releases/download/v2.0.51/TrackOwl_2.0.51_x64-setup.exe"
                                        className="relative w-full py-3 px-4 bg-[#B8860B] hover:bg-[#A67809] text-white text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                        <Download className="w-4 h-4" /> Download .exe
                                        {recommendedOS === 'windows' && <span className="absolute -top-3 -right-2 bg-amber-400 text-amber-900 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full shadow-md">⭐ Recommended</span>}
                                    </a>
                                    <a
                                        href="https://github.com/furqan-debug/TrackOwl/releases/download/v2.0.51/TrackOwl_2.0.51_x64_en-US.msi"
                                        className="w-full py-3 px-4 bg-[#F5E6CA] hover:bg-[#EADCBF] text-[#B8860B] border border-[#EADCBF] text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
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
                                        href="https://github.com/furqan-debug/TrackOwl/releases/download/v2.0.51/TrackOwl_2.0.51_aarch64.dmg"
                                        className="relative w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                        <Download className="w-4 h-4" /> Apple Silicon (M1/M2/M3)
                                        {recommendedOS === 'mac-silicon' && <span className="absolute -top-3 -right-2 bg-amber-400 text-amber-900 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full shadow-md">⭐ Recommended</span>}
                                    </a>
                                    <a
                                        href="https://github.com/furqan-debug/TrackOwl/releases/download/v2.0.51/TrackOwl_2.0.51_x64.dmg"
                                        className="relative w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                        <Download className="w-4 h-4" /> Intel Processor
                                        {recommendedOS === 'mac-intel' && <span className="absolute -top-3 -right-2 bg-amber-400 text-amber-900 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full shadow-md">⭐ Recommended</span>}
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
                    <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">Gain complete workforce visibility</h2>
                    <p className="text-2xl text-slate-300 font-medium mb-10 max-w-3xl leading-relaxed">
                        Track productivity, improve accountability, and operate with confidence using TrackOwl™.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate('/signup')}
                            className="w-full sm:w-auto px-12 py-5 bg-[#facc15] hover:bg-[#eab308] text-[#001338] text-lg font-bold rounded-full shadow-[0_4px_14px_rgba(250,204,21,0.25)] cursor-pointer transition-all hover:scale-105 active:scale-95">
                            Start free trial
                        </button>
                        <button
                            onClick={() => { setContactType('demo'); setIsContactOpen(true); }}
                            className="w-full sm:w-auto px-12 py-5 bg-transparent border-2 border-white/20 hover:border-white/40 text-white text-lg font-bold cursor-pointer rounded-full transition-all active:scale-95">
                            Schedule a demo
                        </button>
                    </div>
                    <p className="text-lg font-medium text-slate-400">Built for modern businesses managing remote teams at scale.</p>
                </div>
            </section>

            {/* FOOTER */}
            <Footer />

            <ContactModal 
                isOpen={isContactOpen} 
                onClose={() => setIsContactOpen(false)} 
                initialRequestType={contactType} 
            />

            {/* Scroll to Top Button */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-6 right-6 z-[120] p-3.5 rounded-full bg-[#001338] text-[#F7BC00] shadow-2xl hover:bg-[#002766] transition-all hover:scale-110 active:scale-95 border border-white/10 cursor-pointer flex items-center justify-center"
                        title="Scroll to Top"
                    >
                        <ArrowUp className="w-5 h-5" strokeWidth={3} />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}

