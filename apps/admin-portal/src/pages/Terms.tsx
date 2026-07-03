import { useNavigate } from 'react-router-dom';
import HeaderLogo from '../assets/branding/header-2.svg';
import { Footer } from '../components/Footer';

export function Terms() {
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
                    <h1 className="text-4xl font-black text-[#001b4d] mb-2">Terms of Service</h1>
                    <div className="text-xs font-bold text-slate-400 mb-8 space-y-1">
                        <p>Effective Date: 20th May 20, 2026</p>
                        <p>Last Updated: 20th May 20, 2026</p>
                    </div>

                    <div className="prose prose-lg text-slate-600 font-medium leading-relaxed space-y-6">
                        <p>These Terms of Service (“Terms”) govern access to and use of TrackOwl, including all associated software, applications, dashboards, APIs, websites, and services provided by Digify Global LLC d/b/a DigiReps™ (“TrackOwl,” “we,” “our,” or “us”).</p>
                        <p>By accessing or using TrackOwl, you agree to be bound by these Terms.</p>
                        <p>If you do not agree to these Terms, you may not use the platform.</p>
                        
                        <hr className="border-slate-200 my-8" />
                        
                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">1. Eligibility</h2>
                        <p>TrackOwl is intended for business and professional use only.</p>
                        <p>By using TrackOwl, you confirm that:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You are authorized to enter into binding agreements</li>
                            <li>You are using the platform on behalf of a business, organization, or authorized entity</li>
                            <li>Your use complies with applicable laws and workplace regulations</li>
                        </ul>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">2. Use of Services</h2>
                        <p>TrackOwl provides workforce analytics, time tracking, operational reporting, and productivity monitoring tools for organizations managing remote or distributed teams.</p>
                        <p>You agree to use the platform responsibly, ethically, and lawfully.</p>
                        <p>You may not use TrackOwl for:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Illegal or unauthorized activities</li>
                            <li>Harassment, discrimination, or abusive monitoring practices</li>
                            <li>Violating labor or employment laws</li>
                            <li>Unauthorized surveillance activities</li>
                            <li>Activities that compromise platform security or integrity</li>
                        </ul>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">3. Account Responsibility</h2>
                        <p>Users and organizations are responsible for:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Maintaining confidentiality of account credentials</li>
                            <li>Restricting unauthorized access to accounts</li>
                            <li>Ensuring all account information remains accurate</li>
                            <li>Managing user permissions within their organization</li>
                            <li>All activities conducted under their accounts</li>
                        </ul>
                        <p>TrackOwl is not responsible for losses resulting from compromised credentials caused by user negligence.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">4. Organizational Responsibility & Compliance</h2>
                        <p>Organizations using TrackOwl are solely responsible for:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Informing users and employees about monitoring practices</li>
                            <li>Obtaining legally required consent where applicable</li>
                            <li>Ensuring compliance with local employment, privacy, and labor laws</li>
                            <li>Configuring monitoring settings appropriately and ethically</li>
                        </ul>
                        <p>TrackOwl provides operational tools but does not provide legal compliance guarantees for customer-specific implementations.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">5. Subscription & Billing</h2>
                        <p>TrackOwl services may be provided through subscription-based pricing models.</p>
                        <p>By subscribing to paid services, you agree that:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Fees are billed according to your selected plan</li>
                            <li>Billing cycles may be monthly, annual, or contract-based</li>
                            <li>Payments must be made on time</li>
                            <li>Failure to pay may result in account limitation or suspension</li>
                        </ul>
                        <p>Unless otherwise stated in writing:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Payments are non-refundable</li>
                            <li>Subscription fees exclude applicable taxes</li>
                            <li>Pricing may change with prior notice</li>
                        </ul>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">6. Acceptable Use Policy</h2>
                        <p>You agree not to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Attempt unauthorized access to systems or accounts</li>
                            <li>Reverse engineer or exploit the platform</li>
                            <li>Interfere with platform performance or infrastructure</li>
                            <li>Upload malicious code, malware, or harmful scripts</li>
                            <li>Circumvent security controls or authentication systems</li>
                            <li>Abuse APIs or automated systems excessively</li>
                        </ul>
                        <p>Violation of these policies may result in immediate suspension or termination.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">7. Intellectual Property</h2>
                        <p>All software, branding, interfaces, content, infrastructure, designs, codebases, analytics systems, and proprietary technologies associated with TrackOwl remain the exclusive property of DigiReps™ / Digify Global LLC.</p>
                        <p>Using the platform does not grant ownership rights to customers beyond the limited license necessary to access the services.</p>
                        <p>Users may not copy, reproduce, distribute, modify, or commercially exploit TrackOwl intellectual property without written authorization.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">8. Data Ownership</h2>
                        <p>Organizations retain ownership of their operational and workforce data submitted to TrackOwl.</p>
                        <p>However, by using the platform, you grant TrackOwl a limited license to process, store, and analyze data solely for:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Delivering platform functionality</li>
                            <li>Providing analytics and reporting</li>
                            <li>Maintaining security and reliability</li>
                            <li>Improving service performance</li>
                        </ul>
                        <p>TrackOwl does not sell customer operational data.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">9. Service Availability</h2>
                        <p>We strive to maintain high uptime, platform stability, and operational reliability.</p>
                        <p>However, TrackOwl services are provided on an “as available” basis.</p>
                        <p>We do not guarantee:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Continuous uninterrupted service</li>
                            <li>Error-free operation</li>
                            <li>Permanent availability of specific features</li>
                        </ul>
                        <p>Temporary downtime may occur due to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Maintenance</li>
                            <li>Security updates</li>
                            <li>Infrastructure issues</li>
                            <li>Third-party service disruptions</li>
                        </ul>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">10. Limitation of Liability</h2>
                        <p>To the maximum extent permitted by law, TrackOwl and DigiReps™ shall not be liable for:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Indirect or consequential damages</li>
                            <li>Loss of profits or revenue</li>
                            <li>Business interruption</li>
                            <li>Data loss beyond reasonable control</li>
                            <li>Third-party service failures</li>
                            <li>User misuse of the platform</li>
                        </ul>
                        <p>Total liability shall not exceed the amount paid by the customer for services during the preceding billing period.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">11. Termination</h2>
                        <p>We reserve the right to suspend, restrict, or terminate access to TrackOwl if:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>These Terms are violated</li>
                            <li>Payments remain overdue</li>
                            <li>Platform misuse is detected</li>
                            <li>Security risks arise</li>
                            <li>Fraudulent or unlawful activity occurs</li>
                        </ul>
                        <p>Organizations may discontinue use of the platform at any time subject to contractual obligations.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">12. Changes to Terms</h2>
                        <p>We may update these Terms periodically to reflect:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Product updates</li>
                            <li>Legal requirements</li>
                            <li>Operational changes</li>
                            <li>Security improvements</li>
                        </ul>
                        <p>Updated Terms become effective upon publication.</p>
                        <p>Continued use of TrackOwl after updates constitutes acceptance of the revised Terms.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">13. Contact Information</h2>
                        <p>For legal or service-related inquiries:</p>
                        <p className="font-bold">TrackOwl Legal Team</p>
                        <p>📧 <a href="mailto:legal@trackowl.io" className="text-blue-600 hover:underline">legal@trackowl.io</a></p>
                        <p className="text-sm text-slate-400 mt-4">Developed by DigiReps™, a brand of Digify Global LLC</p>
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
                            className="w-full sm:w-auto px-12 py-5 bg-[#facc15] hover:bg-[#eab308] text-[#001338] text-lg font-black rounded-full shadow-[0_4px_20px_rgba(250,204,21,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer">
                            Start free trial
                        </button>
                        <button
                            onClick={() => window.location.href = 'mailto:hello@trackowl.io'}
                            className="w-full sm:w-auto px-12 py-5 bg-transparent border-2 border-white/20 hover:border-white/40 text-white text-lg font-bold rounded-full transition-all active:scale-95 cursor-pointer">
                            Schedule a demo
                        </button>
                    </div>
                    <p className="text-lg font-medium text-slate-400">Built for modern businesses managing remote teams at scale.</p>
                </div>
            </section>

            <Footer />
        </div>
    );
}
