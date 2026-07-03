import { useNavigate } from 'react-router-dom';
import HeaderLogo from '../assets/branding/header-2.svg';
import { Footer } from '../components/Footer';

export function About() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 font-sans tracking-[0.03em] text-slate-900 overflow-x-hidden flex flex-col justify-between">
            <div>
                {/* Navigation */}
                <header className="bg-[#001338] py-5 shadow-md">
                    <nav className="mx-auto flex max-w-[1400px] h-14 items-center justify-between px-6">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                            <img src={HeaderLogo} alt="TrackOwl" className="h-10 object-contain drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                        </div>
                    </nav>
                </header>

                <main className="mx-auto max-w-4xl px-6 py-16">
                    <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-sm border border-slate-200">
                        <h1 className="text-4xl font-black text-[#001b4d] mb-6">About TrackOwl</h1>

                        <div className="prose prose-lg text-slate-600 font-medium leading-relaxed space-y-6">
                            <p>TrackOwl is a precision-driven workforce intelligence and time tracking platform designed for modern businesses managing remote, hybrid, and distributed teams.</p>
                            <p>Developed by DigiReps™, TrackOwl was created to solve one of the most critical operational challenges facing modern organizations: maintaining visibility, accountability, and productivity across teams without relying on intrusive micromanagement.</p>
                            <p>Our platform combines intelligent time tracking, operational analytics, workforce transparency, and actionable reporting into a single enterprise-ready ecosystem that empowers businesses to operate with clarity and confidence.</p>
                            
                            <p>TrackOwl helps organizations:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Track work hours accurately and transparently</li>
                                <li>Improve operational efficiency</li>
                                <li>Increase team accountability</li>
                                <li>Monitor productivity trends in real time</li>
                                <li>Generate data-driven workforce insights</li>
                                <li>Optimize remote workforce performance</li>
                                <li>Create structured operational reporting systems</li>
                            </ul>
                            
                            <p>Unlike traditional monitoring software, TrackOwl is designed around ethical workforce visibility. We believe accountability and trust can coexist when organizations use technology responsibly and transparently.</p>
                            <p>Our experience comes from years of building and managing remote workforce operations through DigiReps™, where we identified the need for a cleaner, smarter, and more operationally focused workforce analytics platform.</p>
                            <p>Today, TrackOwl is built for startups, agencies, enterprise teams, BPOs, staffing firms, and globally distributed organizations that require operational precision at scale.</p>

                            <hr className="border-slate-200 my-8" />
                            
                            <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">Our Mission</h2>
                            <p>To empower businesses with intelligent workforce visibility, operational transparency, and real-time productivity insights, without compromising employee trust, flexibility, or user experience.</p>

                            <hr className="border-slate-200 my-8" />

                            <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">Our Vision</h2>
                            <p>To become the global standard for ethical workforce analytics and intelligent time tracking in the modern remote work era.</p>

                            <hr className="border-slate-200 my-8" />

                            <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">Our Core Principles</h2>
                            
                            <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">Transparency First</h3>
                            <p>We believe workforce visibility should always be transparent, consent-based, and professionally managed.</p>

                            <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">Operational Intelligence</h3>
                            <p>TrackOwl is designed to deliver actionable insights, not just raw activity data.</p>

                            <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">Ethical Monitoring</h3>
                            <p>We prioritize responsible monitoring practices that support accountability while respecting privacy and workplace trust.</p>

                            <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">Enterprise Reliability</h3>
                            <p>Security, scalability, uptime, and infrastructure stability are foundational priorities within our platform.</p>

                            <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">User-Centered Design</h3>
                            <p>We focus on creating a clean, intuitive, and high-performance experience for both administrators and workforce members.</p>
                        </div>
                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
}
