import { useNavigate } from 'react-router-dom';
import { 
    ChevronRight, 
    Check, 
    Zap, 
    Shield, 
    BarChart3, 
    Users2, 
    Clock, 
    Smartphone,
    Globe
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
            color: 'bg-slate-100',
            buttonLabel: 'Get Started',
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
            color: 'bg-blue-600',
            buttonLabel: 'Start Free Trial',
            popular: true
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            description: 'Custom solutions for large organizations.',
            features: [
                'Everything in Professional',
                'dedicated account manager',
                'SLA & dedicated hosting',
                'Advanced security (SAML)',
                'Custom integrations',
                'On-premise options'
            ],
            color: 'bg-slate-900',
            buttonLabel: 'Contact Sales',
            popular: false
        }
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900">
            {/* Navigation */}
            <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold">D</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight">DigiReps</span>
                </div>
                <div className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</a>
                    <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Pricing</a>
                    <a href="#about" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">About</a>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/login')}
                        className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-4 py-2"
                    >
                        Sign in
                    </button>
                    <button 
                        onClick={() => navigate('/signup')}
                        className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                    >
                        Get Started
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 border border-blue-100 animate-fade-in">
                    <Zap className="w-4 h-4 fill-blue-700" />
                    <span>The next generation of time tracking</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-slate-900 to-slate-600 bg-clip-text text-transparent">
                    Focus on work,<br />not tracking it.
                </h1>
                <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
                    DigiReps helps remote teams stay productive with automatic activity tracking, smart insights, and detailed financial reports.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button 
                        onClick={() => navigate('/signup')}
                        className="w-full sm:w-auto bg-blue-600 text-white font-bold px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 group"
                    >
                        Start your 14-day free trial
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="w-full sm:w-auto text-slate-600 font-bold px-8 py-4 rounded-2xl hover:bg-slate-50 transition-all border border-slate-200">
                        View Demo
                    </button>
                </div>
                
                {/* Dashboard Preview Mockup */}
                <div className="mt-20 relative px-4">
                    <div className="absolute inset-0 bg-blue-600/5 blur-[120px] -z-10 rounded-full" />
                    <div className="bg-slate-900 rounded-3xl p-2 shadow-2xl overflow-hidden border border-slate-800">
                        <div className="bg-slate-800/50 rounded-2xl aspect-[16/9] flex items-center justify-center border border-white/5">
                            <span className="text-slate-500 font-medium">Dashboard Preview Illustration</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Everything you need to manage remote teams</h2>
                        <p className="text-slate-500">Built for modern startups, agencies, and distributed organizations.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: Clock, title: 'Pulse Tracking', description: 'Automatic time tracking that stops when you do. No manual entries required.' },
                            { icon: Shield, title: 'Screen Insights', description: 'Optional screenshots and activity levels to maintain transparency and trust.' },
                            { icon: BarChart3, title: 'Rich Analytics', description: 'Interactive dashboards and exports for productivity and payroll.' },
                            { icon: Users2, title: 'Team Management', description: 'Manage members, teams, and projects with granular role-based access.' },
                            { icon: Smartphone, title: 'Mobile Companion', description: 'Track progress and stay updated on the go with our mobile-friendly dashboard.' },
                            { icon: Globe, title: 'Global Payroll', description: 'Consolidated financial reports with multi-currency support for distributed teams.' }
                        ].map((feature, i) => (
                            <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 hover:shadow-xl transition-all group">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                                    <feature.icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
                    <p className="text-slate-500">Choose the plan that fits your team's needs. No hidden fees.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {plans.map((plan, i) => (
                        <div 
                            key={i} 
                            className={clsx(
                                "relative flex flex-col p-8 rounded-3xl border transition-all",
                                plan.popular ? "border-blue-600 shadow-2xl scale-105 z-10 bg-white" : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                            )}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Most Popular
                                </div>
                            )}
                            <div className="mb-8">
                                <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold">{plan.price}</span>
                                    <span className="text-slate-500 font-medium">{plan.period}</span>
                                </div>
                                <p className="text-sm text-slate-500 mt-2">{plan.description}</p>
                            </div>
                            <ul className="space-y-4 mb-10 flex-1">
                                {plan.features.map((feature, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm text-slate-600">
                                        <div className="w-5 h-5 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                                            <Check className="w-3 h-3 text-blue-600" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <button 
                                onClick={() => navigate('/signup', { state: { plan: plan.name } })}
                                className={clsx(
                                    "w-full py-4 rounded-xl font-bold transition-all shadow-lg",
                                    plan.popular 
                                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/25" 
                                        : "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-slate-200/50"
                                )}
                            >
                                {plan.buttonLabel}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 max-w-5xl mx-auto">
                <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/30 blur-[100px] -z-0" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-600/20 blur-[100px] -z-0" />
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 relative z-10">
                        Ready to transform how<br />your team works?
                    </h2>
                    <p className="text-slate-400 mb-10 text-lg relative z-10">Join 1,000+ companies using DigiReps to scale with confidence.</p>
                    <button 
                        onClick={() => navigate('/signup')}
                        className="bg-white text-slate-900 font-bold px-10 py-5 rounded-2xl hover:scale-105 transition-all shadow-2xl relative z-10"
                    >
                        Get Started Now
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-slate-100 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                            <span className="text-white font-bold text-xs">D</span>
                        </div>
                        <span className="font-bold tracking-tight">DigiReps</span>
                    </div>
                    <div className="flex gap-8 text-sm text-slate-500">
                        <a href="#" className="hover:text-slate-900">Terms</a>
                        <a href="#" className="hover:text-slate-900">Privacy</a>
                        <a href="#" className="hover:text-slate-900">Support</a>
                    </div>
                    <p className="text-sm text-slate-400">© 2026 DigiReps Tracker. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

function clsx(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
