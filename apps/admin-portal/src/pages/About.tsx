import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Shield, Cpu, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HeaderLogo from '../assets/branding/header-2.svg';
import { Footer } from '../components/Footer';
import { ContactModal } from './Landing';

export function About() {
    const navigate = useNavigate();
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [contactType, setContactType] = useState<'sales' | 'demo' | 'general'>('sales');

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans tracking-[0.03em] text-slate-900 overflow-x-hidden flex flex-col justify-between">
            <div>
                {/* Navigation */}
                <header className="bg-[#001338] py-5 shadow-md">
                    <nav className="mx-auto flex max-w-[1400px] h-14 items-center justify-between px-6">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                            <img src={HeaderLogo} alt="TrackOwl" className="h-10 object-contain drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                        </div>
                    </nav>
                </header>

                {/* Hero / Statement Section */}
                <section className="bg-[#001338] text-white py-24 relative overflow-hidden">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#002766] blur-[150px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
                    
                    <div className="mx-auto max-w-[1200px] px-6 lg:px-8 relative z-10">
                        <span className="text-[#F7BC00] text-sm font-bold uppercase tracking-widest block mb-4">Our Origin</span>
                        <h1 className="text-4xl md:text-6xl font-black mb-8 leading-[1.1] max-w-4xl tracking-tight">
                            Built by operators who were tired of <span className="underline decoration-[#F7BC00] decoration-wavy">spyware</span>.
                        </h1>
                        <p className="text-slate-300 text-lg md:text-xl font-medium max-w-3xl leading-relaxed">
                            We didn't set out to build another time tracker. We built TrackOwl because we couldn't find a tool that respected workforce privacy while delivering the operational precision we needed to run our own company.
                        </p>
                    </div>
                </section>

                {/* Asymmetric Narrative Section */}
                <main className="mx-auto max-w-[1200px] px-6 lg:px-8 py-20 relative z-20">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                        
                        {/* Sticky Left Sidebar */}
                        <div className="lg:col-span-4 lg:sticky lg:top-28 h-fit">
                            <h2 className="text-2xl font-black text-[#001338] uppercase tracking-wider mb-6 border-l-4 border-[#F7BC00] pl-4">
                                The TrackOwl Way
                            </h2>
                            <p className="text-slate-500 font-semibold leading-relaxed mb-8">
                                A product by DigiReps®. Designed to bring operational clarity without micromanagement.
                            </p>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-slate-100 border border-slate-200/60 text-xs font-bold text-slate-600">
                                    ESTABLISHED BY DIGIREPS®
                                </div>
                                <div className="p-4 rounded-xl bg-slate-100 border border-slate-200/60 text-xs font-bold text-slate-600">
                                    DESIGNED FOR ETHICAL WORKFORCES
                                </div>
                            </div>
                        </div>

                        {/* Right Content Stream */}
                        <div className="lg:col-span-8 space-y-16">
                            
                            {/* Chapter 1 */}
                            <div>
                                <span className="text-xs font-bold text-[#F7BC00] tracking-widest uppercase block mb-2">01. The Problem</span>
                                <h3 className="text-3xl font-bold text-[#001338] mb-6">Traditional tracking is broken.</h3>
                                <div className="text-slate-600 font-medium leading-relaxed space-y-6">
                                    <p>
                                        Most tracking tools on the market treat employees like liabilities. They capture keystrokes, track mouse micro-movements, and constantly take invasive screenshots. 
                                    </p>
                                    <p>
                                        This doesn't improve productivity; it creates anxiety, destroys trust, and encourages people to simulate activity rather than do actual work.
                                    </p>
                                </div>
                            </div>

                            <hr className="border-slate-200" />

                            {/* Chapter 2 */}
                            <div>
                                <span className="text-xs font-bold text-[#F7BC00] tracking-widest uppercase block mb-2">02. The Solution</span>
                                <h3 className="text-3xl font-bold text-[#001338] mb-6">Operational Clarity, Built Honestly.</h3>
                                <div className="text-slate-600 font-medium leading-relaxed space-y-6">
                                    <p>
                                        TrackOwl was designed as an anti-spyware tracking tool. We focus on high-fidelity time logs, screen samples only when active, and transparent dashboards that team members can audit at any time.
                                    </p>
                                    <p>
                                        By providing objective data on active workflows, application ecosystems, and daily durations, we give administrators the visibility they need without intruding on employees' personal workspace or privacy.
                                    </p>
                                </div>
                            </div>

                            <hr className="border-slate-200" />

                            {/* Chapter 3 */}
                            <div>
                                <span className="text-xs font-bold text-[#F7BC00] tracking-widest uppercase block mb-2">03. Our DNA</span>
                                <h3 className="text-3xl font-bold text-[#001338] mb-8">What drives our design.</h3>
                                
                                <div className="space-y-8">
                                    <div className="flex gap-6 items-start">
                                        <div className="p-3 rounded-xl bg-[#001338] text-white mt-1">
                                            <Eye className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-[#001338] mb-2">Workforce Autonomy</h4>
                                            <p className="text-slate-500 text-sm leading-relaxed font-semibold">
                                                We build tools that empower team members to manage their time, audit their own logs, and collaborate on equal terms.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-6 items-start">
                                        <div className="p-3 rounded-xl bg-[#001338] text-white mt-1">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-[#001338] mb-2">High-Fidelity Security</h4>
                                            <p className="text-slate-500 text-sm leading-relaxed font-semibold">
                                                Workforce data is sensitive. We encrypt screen captures, secure data pipelines, and host everything on enterprise infrastructure.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-6 items-start">
                                        <div className="p-3 rounded-xl bg-[#001338] text-white mt-1">
                                            <Cpu className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-[#001338] mb-2">Operational Context</h4>
                                            <p className="text-slate-500 text-sm leading-relaxed font-semibold">
                                                Instead of monitoring raw mouse movement, we analyze app usage, categories, and calendar metrics to give operators true performance context.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

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
                            className="w-full sm:w-auto px-12 py-5 bg-[#facc15] hover:bg-[#eab308] text-[#001338] text-lg font-bold rounded-full shadow-[0_4px_14px_rgba(250,204,21,0.25)] transition-all hover:scale-105 active:scale-95 cursor-pointer">
                            Start free trial
                        </button>
                        <button
                            onClick={() => { setContactType('demo'); setIsContactOpen(true); }}
                            className="w-full sm:w-auto px-12 py-5 bg-transparent border-2 border-white/20 hover:border-white/40 text-white text-lg font-bold rounded-full transition-all active:scale-95 cursor-pointer">
                            Schedule a demo
                        </button>
                    </div>
                    <p className="text-lg font-medium text-slate-400">Built for modern businesses managing remote teams at scale.</p>
                </div>
            </section>

            <Footer />

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
            <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} initialRequestType={contactType} />
        </div>
    );
}
