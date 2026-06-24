import React from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderLogo from '../assets/branding/header-2.svg';

export function Privacy() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 font-sans tracking-[0.03em] text-slate-900 overflow-x-hidden">
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
                    <h1 className="text-4xl font-black text-[#001b4d] mb-6">Privacy Policy</h1>
                    <div className="prose prose-lg text-slate-600 font-medium leading-relaxed">
                        <p className="text-sm text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
                        
                        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Information Collection</h2>
                        <p>TrackOwl is designed as an enterprise workforce management tool. We collect activity data, application usage, and tracking information solely based on the configurations set by your organization's administrators.</p>

                        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Data Usage</h2>
                        <p>All collected data is used exclusively to provide productivity insights, time tracking, and operational visibility to your organization. TrackOwl does not sell, share, or monetize your activity data with third parties.</p>

                        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Data Security</h2>
                        <p>We implement enterprise-grade security protocols, including HTTPS/TLS encryption and secure cloud infrastructure, to ensure that your workforce data remains protected and private.</p>

                        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Contact Us</h2>
                        <p>If you have any questions about this Privacy Policy, please contact us at <a href="https://www.trackowl.com/support" className="text-blue-600 hover:underline">https://www.trackowl.com/support</a>.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
