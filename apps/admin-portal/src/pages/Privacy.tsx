import { useNavigate } from 'react-router-dom';
import HeaderLogo from '../assets/branding/header-2.svg';
import { Footer } from '../components/Footer';

export function Privacy() {
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
                    <h1 className="text-4xl font-black text-[#001b4d] mb-2">Privacy Policy</h1>
                    <div className="text-xs font-bold text-slate-400 mb-8 space-y-1">
                        <p>Effective Date: 20th May 20, 2026</p>
                        <p>Last Updated: 20th May 20, 2026</p>
                    </div>

                    <div className="prose prose-lg text-slate-600 font-medium leading-relaxed space-y-6">
                        <p>At TrackOwl, privacy, transparency, and ethical workforce monitoring are fundamental principles of our platform. We understand that workforce analytics and activity tracking involve sensitive operational data, which is why privacy protection is built directly into our infrastructure, product architecture, and internal policies.</p>
                        <p>TrackOwl is designed for modern businesses and enterprise organizations that require operational visibility, accountability, and productivity insights across distributed teams — without compromising user trust or data security.</p>
                        <p>This Privacy Policy explains how TrackOwl collects, uses, stores, protects, and processes information when you use our services.</p>
                        
                        <hr className="border-slate-200 my-8" />
                        
                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">1. About TrackOwl</h2>
                        <p>TrackOwl is a workforce analytics and time tracking platform developed by DigiReps™ to help organizations:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Monitor productivity and operational performance</li>
                            <li>Track work hours and attendance</li>
                            <li>Improve accountability across remote teams</li>
                            <li>Generate activity reports and business insights</li>
                            <li>Optimize workforce efficiency</li>
                        </ul>
                        <p>The purpose of TrackOwl is to provide organizations with ethical operational visibility and transparent workforce management tools for remote and distributed environments.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">2. Information We Collect</h2>
                        <p>We collect only the information necessary to operate, improve, and secure our platform.</p>
                        <p>The types of information we may collect include:</p>
                        
                        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">A. Account Information</h3>
                        <p>When creating or managing an account, we may collect:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Full name</li>
                            <li>Email address</li>
                            <li>Company or organization details</li>
                            <li>Role or permission level within the organization</li>
                            <li>Login credentials and authentication data</li>
                        </ul>

                        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">B. Workforce Activity Data</h3>
                        <p>Depending on organizational settings and user consent, TrackOwl may collect:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Time logs and attendance records</li>
                            <li>Activity tracking metadata</li>
                            <li>Productivity metrics</li>
                            <li>Screenshot captures</li>
                            <li>Application and website usage data</li>
                            <li>Session duration and operational statistics</li>
                        </ul>

                        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">C. Device & Technical Information</h3>
                        <p>We may automatically collect:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Device type and operating system</li>
                            <li>Browser information</li>
                            <li>IP address and approximate location</li>
                            <li>System diagnostics and crash reports</li>
                            <li>API and server interaction logs</li>
                        </ul>

                        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">D. Billing & Subscription Information</h3>
                        <p>For paid services, we may collect:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Billing address</li>
                            <li>Payment transaction details</li>
                            <li>Subscription plan information</li>
                        </ul>
                        <p>Payment information is processed securely through trusted third-party payment providers and is not stored directly on TrackOwl servers unless necessary for billing operations.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">3. User Consent & Workforce Transparency</h2>
                        <p>TrackOwl is designed to support visibility, accountability, and operational transparency for remote and distributed teams.</p>
                        <p>Because workforce monitoring may involve sensitive operational information, TrackOwl requires user awareness and consent before any tracking-related features are activated.</p>
                        
                        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">Consent-Based Tracking</h3>
                        <p>Any screenshots, activity data, or workforce tracking information are collected and stored only after the user has provided consent during the installation, onboarding, or activation process of the application.</p>
                        <p>Organizations using TrackOwl are responsible for ensuring compliance with local labor laws, workplace disclosure requirements, and employee consent regulations applicable within their jurisdiction.</p>
                        
                        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">Data Visibility Restrictions</h3>
                        <p>Collected tracking information is accessible only to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Authorized administrators within the organization</li>
                            <li>The individual user associated with the tracked account</li>
                        </ul>
                        <p>TrackOwl does not provide employee monitoring data to unauthorized third parties.</p>
                        <p>We are committed to ethical monitoring practices and do not support covert surveillance or unlawful employee monitoring activities.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">4. How We Use Information</h2>
                        <p>We use collected information strictly for legitimate business and operational purposes, including:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Delivering and maintaining TrackOwl services</li>
                            <li>Generating workforce analytics and productivity reports</li>
                            <li>Improving platform functionality and user experience</li>
                            <li>Providing customer support and technical assistance</li>
                            <li>Detecting suspicious activity, fraud, or security threats</li>
                            <li>Maintaining service reliability and operational integrity</li>
                            <li>Processing subscriptions and billing transactions</li>
                            <li>Conducting internal analytics and performance optimization</li>
                        </ul>
                        <p>We do not use customer workforce data for advertising purposes.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">5. Data Sharing & Disclosure</h2>
                        <p>TrackOwl does not sell, rent, or trade user data.</p>
                        <p>We may share limited information only in the following situations:</p>
                        
                        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">A. Service Providers</h3>
                        <p>We may share data with trusted third-party providers that assist with:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Cloud hosting infrastructure</li>
                            <li>Payment processing</li>
                            <li>Analytics services</li>
                            <li>Customer support operations</li>
                            <li>Security monitoring</li>
                        </ul>
                        <p>These providers are contractually obligated to maintain confidentiality and security standards.</p>
                        
                        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">B. Legal & Regulatory Compliance</h3>
                        <p>We may disclose information when required to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Comply with applicable laws or legal obligations</li>
                            <li>Respond to lawful government requests</li>
                            <li>Protect the rights, safety, or security of TrackOwl, our customers, or users</li>
                            <li>Investigate fraud, abuse, or security incidents</li>
                        </ul>

                        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-2">C. Business Transfers</h3>
                        <p>In the event of a merger, acquisition, restructuring, or sale of assets, user information may be transferred as part of the transaction, subject to applicable privacy protections.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">6. Data Security</h2>
                        <p>TrackOwl implements enterprise-grade security practices designed to protect customer and workforce data from unauthorized access, misuse, or disclosure.</p>
                        <p>Our safeguards include:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>End-to-end encrypted communications (HTTPS/TLS)</li>
                            <li>Encryption of sensitive data at rest</li>
                            <li>Secure cloud infrastructure environments</li>
                            <li>Role-based access control systems</li>
                            <li>Authentication and permission management</li>
                            <li>Continuous monitoring and threat detection</li>
                            <li>Secure backups and redundancy systems</li>
                            <li>Regular vulnerability assessments and patch management</li>
                        </ul>
                        <p>While we maintain strong security measures, no system can guarantee absolute security. Users are encouraged to maintain strong passwords and secure access credentials.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">7. Data Retention</h2>
                        <p>We retain data only for as long as necessary to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Provide services to customers</li>
                            <li>Meet contractual obligations</li>
                            <li>Comply with legal or regulatory requirements</li>
                            <li>Resolve disputes or enforce agreements</li>
                        </ul>
                        <p>Organizations may request deletion of their data subject to applicable retention obligations.</p>
                        <p>Certain system logs or security records may be retained temporarily for operational or compliance purposes.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">8. International Data Processing</h2>
                        <p>TrackOwl may process and store information in secure cloud environments located in different jurisdictions.</p>
                        <p>By using TrackOwl, you acknowledge that your information may be transferred to and processed in countries where data protection laws may differ from those in your jurisdiction.</p>
                        <p>We take reasonable steps to ensure appropriate safeguards are in place for international data transfers.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">9. User Rights & Data Control</h2>
                        <p>Depending on your location and applicable privacy laws, you may have the right to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Access your personal information</li>
                            <li>Request correction of inaccurate data</li>
                            <li>Request deletion of certain information</li>
                            <li>Restrict or object to data processing</li>
                            <li>Request export of your data</li>
                            <li>Withdraw consent where applicable</li>
                        </ul>
                        <p>Requests may be submitted to: <a href="mailto:privacy@trackowl.io" className="text-blue-600 hover:underline">privacy@trackowl.io</a></p>
                        <p>We may require identity verification before processing certain requests.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">10. Enterprise Responsibilities</h2>
                        <p>Organizations using TrackOwl are responsible for:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Informing employees or contractors about tracking practices</li>
                            <li>Obtaining required consents under local laws</li>
                            <li>Configuring monitoring settings responsibly</li>
                            <li>Using collected data ethically and lawfully</li>
                        </ul>
                        <p>TrackOwl provides the tools for operational transparency but does not control how organizations internally manage workforce policies.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">11. Children's Privacy</h2>
                        <p>TrackOwl is intended strictly for business and professional use.</p>
                        <p>Our services are not directed toward individuals under the age of 18, and we do not knowingly collect information from minors.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">12. Changes to This Privacy Policy</h2>
                        <p>We may update this Privacy Policy periodically to reflect changes in:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Legal requirements</li>
                            <li>Security practices</li>
                            <li>Product functionality</li>
                            <li>Operational processes</li>
                        </ul>
                        <p>Updated versions will be posted within the platform or on our website with a revised “Last Updated” date.</p>
                        <p>Continued use of TrackOwl after updates constitutes acceptance of the revised policy.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">13. Contact Information</h2>
                        <p>For privacy-related questions, concerns, or requests, please contact:</p>
                        <p className="font-bold">TrackOwl Privacy Team</p>
                        <p>📧 <a href="mailto:privacy@trackowl.io" className="text-blue-600 hover:underline">privacy@trackowl.io</a></p>
                        <p className="text-sm text-slate-400 mt-4">Developed by DigiReps™, a brand of Digify Global LLC</p>
                    </div>
                </div>
            </main>
            </div>
            <Footer />
        </div>
    );
}
