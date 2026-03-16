import { useNavigate } from 'react-router-dom';
import {
    ChevronRight,
    Check,
    Zap,
    Shield,
    BarChart3,
    Users2,
    Clock
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
                'dedicated account manager',
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
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Top navigation */}
            <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
                <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2.5"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-900 text-xs font-semibold tracking-tight text-white">
                            DR
                        </div>
                        <div className="hidden flex-col text-left sm:flex">
                            <span className="text-sm font-semibold tracking-tight">Trackora</span>
                            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                                Rep Operations OS
                            </span>
                        </div>
                    </button>

                    <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
                        <a href="#features" className="hover:text-slate-900">
                            Product
                        </a>
                        <a href="#how-it-works" className="hover:text-slate-900">
                            How it works
                        </a>
                        <a href="#pricing" className="hover:text-slate-900">
                            Pricing
                        </a>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="rounded-full px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                            Sign in
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/signup')}
                            className="rounded-full bg-slate-900 px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-slate-800"
                        >
                            Start trial
                        </button>
                    </div>
                </nav>
            </header>

            {/* Hero */}
            <main>
                <section className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-16 pt-16 md:flex-row md:items-center md:gap-16 md:px-6 lg:pt-20">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                            <Zap className="h-3 w-3 text-amber-500" />
                            <span>Made for modern sales teams</span>
                        </div>
                        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.1rem]">
                            See how every rep<br />
                            actually works.
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                            Trackora combines activity, time, and outcomes into a single, honest view of your team&apos;s
                            workday—so you can coach better, forecast with confidence, and pay teams fairly.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <button
                                type="button"
                                onClick={() => navigate('/signup')}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 sm:w-auto"
                            >
                                Start 14‑day free trial
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 sm:w-auto"
                            >
                                Book a live walkthrough
                            </button>
                        </div>

                        <p className="mt-4 text-xs text-slate-500">
                            No credit card required. Get your first workspace set up in under 5 minutes.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-6">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                                        NL
                                    </span>
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-white ring-2 ring-slate-50">
                                        BA
                                    </span>
                                </div>
                                <span>Trusted by distributed teams across SaaS, agencies, and support.</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="relative mx-auto max-w-md">
                            <div className="absolute inset-x-6 -top-8 h-40 rounded-3xl bg-gradient-to-b from-slate-200/80 to-slate-50 blur-2xl" />
                            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.16)]">
                                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
                                    <span className="font-medium text-slate-700">Team overview</span>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                        Sample workspace
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 border-b border-slate-100 px-4 py-3 text-xs">
                                    <Metric label="Tracked today" value="132h" />
                                    <Metric label="Active reps" value="18" />
                                    <Metric label="At risk" value="3" tone="warning" />
                                </div>
                                <div className="grid grid-cols-1 gap-0 divide-y divide-slate-100 text-xs">
                                    {[
                                        { name: 'Outbound pod', status: 'Focus time', activity: 'High', color: 'bg-emerald-500' },
                                        { name: 'Expansion pod', status: 'Coaching', activity: 'Medium', color: 'bg-sky-500' },
                                        { name: 'Support pod', status: 'Idle', activity: 'Low', color: 'bg-amber-500' }
                                    ].map((team) => (
                                        <div key={team.name} className="flex items-center gap-3 px-4 py-3">
                                            <div className={`h-7 w-7 rounded-lg ${team.color} text-[11px] font-semibold text-white flex items-center justify-center`}>
                                                {team.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="truncate text-[13px] font-medium text-slate-800">
                                                        {team.name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500">{team.status}</span>
                                                </div>
                                                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                                                    <div className="h-1.5 rounded-full bg-slate-900/80" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Product pillars */}
                <section id="features" className="border-t border-slate-200 bg-white">
                    <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
                        <div className="mb-10 max-w-2xl">
                            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                                One admin portal for reps, managers, and finance.
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-slate-600">
                                Trackora connects time, activity, and outcomes across your organization so every team can work
                                from the same source of truth.
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            <FeatureCard
                                icon={Clock}
                                title="Activity & time"
                                body="Automatic tracking across apps, URLs, and devices—no manual timesheets, no guesswork."
                            />
                            <FeatureCard
                                icon={Users2}
                                title="Reps & teams"
                                body="Model pods, territories, and roles so coaching and reporting match how you actually work."
                            />
                            <FeatureCard
                                icon={BarChart3}
                                title="Analytics & reports"
                                body="Instant overviews of focus time, output, and utilization with export-ready reports."
                            />
                            <FeatureCard
                                icon={Shield}
                                title="Controls & governance"
                                body="Granular privacy controls, activity policies, and billing guardrails baked into the admin portal."
                            />
                        </div>
                    </div>
                </section>

                {/* How it works strip */}
                <section
                    id="how-it-works"
                    className="border-t border-slate-200 bg-slate-50"
                >
                    <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
                        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
                            <div className="max-w-sm">
                                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    How Trackora fits in
                                </h3>
                                <p className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
                                    From sign‑up to real coaching in four steps.
                                </p>
                            </div>
                            <ol className="grid flex-1 gap-4 text-sm text-slate-700 sm:grid-cols-2 md:grid-cols-4">
                                <Step label="Connect your team" description="Invite managers and reps, or import from your HR/identity provider." index={1} />
                                <Step label="Map your work" description="Create teams, clients, and projects that mirror how you sell and support." index={2} />
                                <Step label="Track the day" description="Capture time and activity with our desktop tracker and admin policies." index={3} />
                                <Step label="Coach with clarity" description="Use dashboards and timelines to run reviews, 1:1s, and planning sessions." index={4} />
                            </ol>
                        </div>
                    </div>
                </section>

                {/* Pricing */}
                <section
                    id="pricing"
                    className="border-t border-slate-200 bg-white"
                >
                    <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
                        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                                    Simple pricing, predictable value.
                                </h2>
                                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                                    Start on any plan with a 14‑day free trial. Upgrade or downgrade as your team grows—no
                                    long‑term contracts.
                                </p>
                            </div>
                            <p className="text-xs text-slate-500">
                                Billed monthly per active member. Cancel anytime from the admin portal.
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            {plans.map((plan) => (
                                <div
                                    key={plan.name}
                                    className={`flex h-full flex-col rounded-2xl border bg-slate-50/60 p-6 text-sm shadow-sm ${
                                        plan.popular ? 'border-slate-900 bg-slate-900 text-slate-50 shadow-lg' : 'border-slate-200'
                                    }`}
                                >
                                    {plan.popular && (
                                        <span className="mb-3 inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                                            Most popular
                                        </span>
                                    )}
                                    <div className="mb-6">
                                        <h3 className="text-base font-semibold tracking-tight">
                                            {plan.name}
                                        </h3>
                                        <div className="mt-2 flex items-baseline gap-1">
                                            <span className="text-3xl font-semibold">
                                                {plan.price}
                                            </span>
                                            <span className={plan.popular ? 'text-slate-300' : 'text-slate-500'}>
                                                {plan.period}
                                            </span>
                                        </div>
                                        <p className={`mt-2 text-xs ${plan.popular ? 'text-slate-200/80' : 'text-slate-600'}`}>
                                            {plan.description}
                                        </p>
                                    </div>

                                    <ul className="mb-6 flex-1 space-y-2.5">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-start gap-2 text-xs">
                                                <span
                                                    className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full ${
                                                        plan.popular ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    <Check className="h-2.5 w-2.5" />
                                                </span>
                                                <span className={plan.popular ? 'text-slate-100/90' : 'text-slate-700'}>
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        type="button"
                                        onClick={() => navigate('/signup', { state: { plan: plan.name } })}
                                        className={`mt-auto w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${
                                            plan.popular
                                                ? 'bg-white text-slate-900 hover:bg-slate-100'
                                                : 'bg-slate-900 text-white hover:bg-slate-800'
                                        }`}
                                    >
                                        {plan.buttonLabel}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                                Have 50+ reps or specific compliance requirements?{' '}
                                <button
                                    type="button"
                                    className="font-semibold text-slate-900 underline-offset-2 hover:underline"
                                >
                                    Talk to sales
                                </button>
                            </p>
                            <p>Admin portal includes centralized billing, permissions, and workspace controls on all plans.</p>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-slate-200 bg-slate-50">
                    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:px-6">
                        <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-slate-900 text-[10px] font-semibold text-white">
                                DR
                            </div>
                            <span className="font-medium text-slate-700">Trackora</span>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <a href="#" className="hover:text-slate-800">
                                Privacy
                            </a>
                            <a href="#" className="hover:text-slate-800">
                                Terms
                            </a>
                            <a href="#" className="hover:text-slate-800">
                                Support
                            </a>
                        </div>
                        <p>© {new Date().getFullYear()} Trackora (by DigiReps). All rights reserved.</p>
                    </div>
                </footer>
            </main>
        </div>
    );
}

interface MetricProps {
    label: string;
    value: string;
    tone?: 'default' | 'warning';
}

function Metric({ label, value, tone = 'default' }: MetricProps) {
    const valueClass =
        tone === 'warning' ? 'text-amber-600' : 'text-slate-900';
    return (
        <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                {label}
            </p>
            <p className={`mt-1 text-sm font-semibold ${valueClass}`}>
                {value}
            </p>
        </div>
    );
}

interface FeatureCardProps {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    title: string;
    body: string;
}

function FeatureCard({ icon: Icon, title, body }: FeatureCardProps) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-700">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/90 text-slate-50">
                <Icon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                {title}
            </h3>
            <p className="text-xs leading-relaxed text-slate-600">{body}</p>
        </div>
    );
}

interface StepProps {
    index: number;
    label: string;
    description: string;
}

function Step({ index, label, description }: StepProps) {
    return (
        <li className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-[11px] font-semibold text-slate-700">
                {index}
            </div>
            <p className="text-xs font-semibold text-slate-900">
                {label}
            </p>
            <p className="text-xs leading-relaxed text-slate-600">
                {description}
            </p>
        </li>
    );
}
