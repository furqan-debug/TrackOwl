import { useNavigate } from 'react-router-dom';
import HeaderLogo from '../assets/branding/header-2.svg';

export function SecurityPolicy() {
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
                    <h1 className="text-4xl font-black text-[#001b4d] mb-6">Security</h1>

                    <div className="prose prose-lg text-slate-600 font-medium leading-relaxed space-y-6">
                        <p>At TrackOwl, security is not treated as a secondary feature — it is a core architectural principle embedded throughout our infrastructure, application design, operational workflows, and development lifecycle.</p>
                        <p>Because workforce analytics platforms handle operationally sensitive business information, we prioritize enterprise-grade security practices designed to protect customer environments, workforce data, and organizational integrity.</p>
                        
                        <hr className="border-slate-200 my-8" />
                        
                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">1. Infrastructure Security</h2>
                        <p>TrackOwl is hosted within secure, enterprise-grade cloud environments designed for high availability, scalability, and resilience.</p>
                        <p>Our infrastructure security practices include:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Secure cloud-hosted architecture</li>
                            <li>Network segmentation and isolation</li>
                            <li>Continuous infrastructure monitoring</li>
                            <li>Threat detection and anomaly monitoring</li>
                            <li>Automated security patching processes</li>
                            <li>Redundant systems and failover protections</li>
                            <li>Backup and disaster recovery systems</li>
                        </ul>
                        <p>We continuously review infrastructure configurations to minimize exposure risks and improve resilience.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">2. Data Protection</h2>
                        <p>Protecting customer and workforce data is a foundational priority.</p>
                        <p>TrackOwl implements multiple layers of data protection, including:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>HTTPS/TLS encrypted communications</li>
                            <li>Encryption of sensitive data at rest</li>
                            <li>Secure credential management</li>
                            <li>Protected backup systems</li>
                            <li>Access auditing and monitoring</li>
                            <li>Controlled data retention policies</li>
                        </ul>
                        <p>We are committed to minimizing unnecessary data exposure while maintaining operational functionality and reporting accuracy.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">3. Access Control & Authentication</h2>
                        <p>TrackOwl uses role-based access control systems to ensure information is accessible only to authorized users.</p>
                        <p>Security measures include:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Role-based permissions</li>
                            <li>Multi-level administrative controls</li>
                            <li>Session management protections</li>
                            <li>Authentication enforcement policies</li>
                            <li>Restricted internal employee access</li>
                            <li>Principle-of-least-privilege access management</li>
                        </ul>
                        <p>Administrative visibility is intentionally restricted to organizationally authorized personnel.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">4. Ethical Workforce Monitoring</h2>
                        <p>TrackOwl is designed around ethical transparency principles.</p>
                        <p>Activity monitoring features, including screenshots and operational tracking, are intended solely for organizational visibility and accountability within professional work environments.</p>
                        <p>Tracking-related functionality operates based on organizational configuration and user consent processes.</p>
                        <p>Collected activity information is accessible only to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Authorized organization administrators</li>
                            <li>The associated user account owner</li>
                        </ul>
                        <p>TrackOwl does not support covert surveillance or unauthorized monitoring practices.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">5. Application Security</h2>
                        <p>Our platform undergoes continuous security-focused development and maintenance processes.</p>
                        <p>Security-focused practices include:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Secure software development standards</li>
                            <li>Input validation and sanitization</li>
                            <li>Protection against common attack vectors</li>
                            <li>API security protections</li>
                            <li>Session security controls</li>
                            <li>Vulnerability testing and remediation</li>
                            <li>Dependency and package monitoring</li>
                        </ul>
                        <p>We regularly review our systems for security weaknesses and operational risks.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">6. Security Monitoring & Incident Response</h2>
                        <p>TrackOwl maintains active monitoring systems to identify unusual activity, potential threats, and infrastructure anomalies.</p>
                        <p>In the event of a security incident, we may:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Investigate and contain affected systems</li>
                            <li>Temporarily restrict platform functionality if necessary</li>
                            <li>Notify impacted organizations where appropriate</li>
                            <li>Conduct internal audits and remediation processes</li>
                            <li>Implement preventive improvements</li>
                        </ul>
                        <p>Our response procedures are designed to minimize operational disruption while protecting customer environments.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">7. Compliance & Security Standards</h2>
                        <p>While TrackOwl continues evolving its enterprise compliance framework, our operational practices align with modern industry standards and security best practices relating to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Data protection</li>
                            <li>Secure software development</li>
                            <li>Infrastructure hardening</li>
                            <li>Access management</li>
                            <li>Operational transparency</li>
                            <li>Privacy-conscious workforce analytics</li>
                        </ul>
                        <p>We continuously improve our security posture as the platform scales.</p>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">8. Shared Responsibility</h2>
                        <p>Security is a shared responsibility between TrackOwl and our customers.</p>
                        <p>Organizations using TrackOwl are responsible for:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Maintaining secure account credentials</li>
                            <li>Managing internal user permissions responsibly</li>
                            <li>Using workforce monitoring features ethically and lawfully</li>
                            <li>Ensuring compliance with local employment and privacy regulations</li>
                            <li>Securing devices and endpoints connected to the platform</li>
                        </ul>

                        <hr className="border-slate-200 my-8" />

                        <h2 className="text-2xl font-bold text-[#001b4d] mt-8 mb-4">9. Contact Security Team</h2>
                        <p>For security concerns, vulnerability reports, or incident-related communication:</p>
                        <p className="font-bold">TrackOwl Security Team</p>
                        <p>📧 <a href="mailto:security@trackowl.io" className="text-blue-600 hover:underline">security@trackowl.io</a></p>
                        <p className="text-sm text-slate-400 mt-4">Developed by DigiReps™, a brand of Digify Global LLC</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
