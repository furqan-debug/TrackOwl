import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Sparkles, CreditCard, Lock, ArrowLeft, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function MockCheckout() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { session, refreshOrganization } = useAuth();
    
    const billingCycle = searchParams.get('billingCycle') || 'Monthly';
    const seatsCount = parseInt(searchParams.get('seatsCount') || '5', 10);

    const pricePerSeat = billingCycle === 'Yearly' ? 12 : 15;
    const periodMultiplier = billingCycle === 'Yearly' ? 12 : 1;
    const subtotal = pricePerSeat * seatsCount * periodMultiplier;

    const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
    const [cardExpiry, setCardExpiry] = useState('12/28');
    const [cardCvc, setCardCvc] = useState('•••');
    const [cardName, setCardName] = useState('Furqan Habib Siddiqui');
    const [isPaying, setIsPaying] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleMockPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPaying(true);
        setError(null);

        // Simulate network latency for high fidelity premium checkout feel
        await new Promise((resolve) => setTimeout(resolve, 2000));

        try {
            const res = await fetch(`${API}/api/billing/mock-success`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    planType: 'Premium',
                    billingCycle,
                    seatsCount
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to authorize mock payment');
            }

            // Sync auth state
            await refreshOrganization();

            setIsSuccess(true);
            
            // Short success delay before redirecting
            setTimeout(() => {
                navigate('/dashboard/settings/billing?success=true');
            }, 1500);

        } catch (err: any) {
            console.error('Mock Checkout error:', err);
            setError(err.message || 'Payment simulation failed.');
            setIsPaying(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] py-12 px-4 sm:px-6 lg:px-8 text-[var(--foreground)] flex flex-col items-center justify-center font-sans">
            {/* Header / Brand */}
            <div className="flex items-center gap-2.5 mb-8">
                <Sparkles className="w-7 h-7 text-accent" />
                <span className="text-2xl font-black tracking-wider text-white">
                    Track<span className="text-accent">Owl</span> <span className="text-xs bg-accent/20 text-accent font-semibold px-2 py-0.5 rounded-full uppercase tracking-widest border border-accent/20">Developer Sandbox</span>
                </span>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 backdrop-blur-md"
            >
                {/* Left Side: Order Summary */}
                <div className="md:col-span-5 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 md:pr-8">
                    <div>
                        <button 
                            onClick={() => navigate('/dashboard/pricing')}
                            className="flex items-center gap-1 text-sm text-[var(--sidebar-text)] hover:text-white transition-colors mb-6 font-semibold"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to plans
                        </button>

                        <span className="text-xs font-bold text-accent uppercase tracking-widest bg-accent/10 px-2.5 py-1 rounded-md border border-accent/15">
                            Subscribe to Premium
                        </span>
                        
                        <h2 className="text-2xl font-bold mt-4 text-white">TrackOwl Premium</h2>
                        <p className="text-sm text-[var(--sidebar-text)] mt-1.5 leading-relaxed">
                            Simulated developer portal. Enjoy all core premium capabilities without incurring real Stripe transactions.
                        </p>

                        {/* Order breakdown */}
                        <div className="mt-8 space-y-4">
                            <div className="flex justify-between items-center text-sm text-[var(--sidebar-text)]">
                                <span>Premium Seat Pricing</span>
                                <span className="font-semibold text-white">${pricePerSeat}/seat / mo</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-[var(--sidebar-text)]">
                                <span>Seats Purchased</span>
                                <span className="font-semibold text-white">{seatsCount} seats</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-[var(--sidebar-text)]">
                                <span>Billing Interval</span>
                                <span className="font-semibold text-white">{billingCycle}</span>
                            </div>
                            
                            <hr className="border-white/10 my-4" />

                            <div className="flex justify-between items-end">
                                <div>
                                    <span className="text-sm font-bold text-white uppercase tracking-wider">Total Due Now</span>
                                    <p className="text-xs text-[var(--sidebar-text)]">Simulated billing</p>
                                </div>
                                <span className="text-3xl font-black text-accent">${subtotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-blue-300">
                        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold block mb-0.5">Developer Environment Active</span>
                            Since Stripe secret keys are not configured in your backend `.env` file, TrackOwl automatically routes to this Sandbox Simulator. Set your credentials later to transition to production Stripe.
                        </div>
                    </div>
                </div>

                {/* Right Side: Mock Payment Form */}
                <div className="md:col-span-7 flex flex-col justify-center md:pl-4">
                    {isSuccess ? (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center justify-center py-12 text-center"
                        >
                            <CheckCircle className="w-16 h-16 text-emerald-400 mb-4 animate-bounce" />
                            <h3 className="text-xl font-bold text-white">Payment Authorized Successfully!</h3>
                            <p className="text-sm text-[var(--sidebar-text)] mt-1.5">
                                Subscribed successfully. Redirecting you to your billing configurations...
                            </p>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleMockPayment} className="space-y-5">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-accent" /> Payment Method
                                </h3>
                                <p className="text-xs text-[var(--sidebar-text)]">
                                    Simulating a secure card payment window.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-3 text-xs font-semibold">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--sidebar-text)] uppercase tracking-wider mb-1.5">
                                        Cardholder Name
                                    </label>
                                    <input 
                                        type="text" 
                                        required
                                        value={cardName} 
                                        onChange={(e) => setCardName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-accent transition-colors"
                                    />
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Credit Card Simulator</span>
                                        <Shield className="w-4 h-4 text-accent/80" />
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-[var(--sidebar-text)] uppercase tracking-widest mb-1">
                                                Card Number
                                            </label>
                                            <input 
                                                type="text" 
                                                required
                                                value={cardNumber} 
                                                onChange={(e) => setCardNumber(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono tracking-widest text-white focus:outline-none focus:border-accent"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-semibold text-[var(--sidebar-text)] uppercase tracking-widest mb-1">
                                                    Expiration
                                                </label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={cardExpiry} 
                                                    onChange={(e) => setCardExpiry(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-accent text-center"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-[var(--sidebar-text)] uppercase tracking-widest mb-1">
                                                    CVC
                                                </label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={cardCvc} 
                                                    onChange={(e) => setCardCvc(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-accent text-center"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isPaying}
                                className="w-full bg-accent hover:bg-accent-hover text-[var(--primary)] font-bold py-3 rounded-xl shadow-lg hover:shadow-accent/20 transition-all flex items-center justify-center gap-2 tracking-wide disabled:opacity-50 text-sm mt-6"
                            >
                                {isPaying ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Authorizing Simulated Upgrades...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-4 h-4 fill-current" /> Pay & Authorize Simulated Upgrade
                                    </>
                                )}
                            </button>

                            <div className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--sidebar-text)] font-semibold mt-4">
                                <Shield className="w-3.5 h-3.5" /> Fully secured developer transaction • Sandbox mode
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
