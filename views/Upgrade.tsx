import React, { useState } from 'react';
import { Crown, Check, Zap, Shield, Cpu, ArrowRight } from 'lucide-react';
import { getCurrentUser, updateUserTier } from '../services/authService';
import { UserTier } from '../types';

interface PlanFeature {
    name: string;
    free: boolean;
    pro: boolean;
    enterprise: boolean;
}

const FEATURES: PlanFeature[] = [
    { name: 'Basic Mining Dashboard', free: true, pro: true, enterprise: true },
    { name: 'Manual Coin Switching', free: true, pro: true, enterprise: true },
    { name: 'Auto-Profit Switching', free: false, pro: true, enterprise: true },
    { name: 'AI Optimization', free: false, pro: true, enterprise: true },
    { name: 'Reduced Platform Fee', free: false, pro: true, enterprise: true },
    { name: 'API Access', free: false, pro: true, enterprise: true },
    { name: 'Priority Support', free: false, pro: false, enterprise: true },
    { name: 'White-Label Rights', free: false, pro: false, enterprise: true },
];

// Stripe payment links - configure in production
const STRIPE_PRO_LINK = import.meta.env.VITE_STRIPE_PRO_LINK || '';
const STRIPE_ENTERPRISE_LINK = import.meta.env.VITE_STRIPE_ENTERPRISE_LINK || '';

const PLANS = [
    { tier: 'free' as UserTier, name: 'Free', price: 0, fee: '2%', color: 'gray', stripeLink: '' },
    { tier: 'pro' as UserTier, name: 'Pro', price: 20, fee: '1%', color: 'blue', popular: true, stripeLink: STRIPE_PRO_LINK },
    { tier: 'enterprise' as UserTier, name: 'Enterprise', price: 100, fee: '0.5%', color: 'purple', stripeLink: STRIPE_ENTERPRISE_LINK },
];

const Upgrade: React.FC = () => {
    const [currentUser] = useState(getCurrentUser());
    const [upgrading, setUpgrading] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleUpgrade = async (tier: UserTier) => {
        if (!currentUser || tier === currentUser.tier) return;

        const plan = PLANS.find(p => p.tier === tier);

        if (tier === 'free') {
            // Free tier downgrade
            if (confirm('Are you sure you want to downgrade to Free?')) {
                await updateUserTier(currentUser.id, tier);
                window.location.reload();
            }
            return;
        }

        if (!plan?.stripeLink) {
            alert('Payment integration not configured. Contact support for upgrade options.');
            return;
        }

        // Redirect to Stripe checkout
        window.open(plan.stripeLink, '_blank');
        setUpgrading(tier);

        // Note: In production, tier upgrade should be handled via Stripe webhook
        // This is a placeholder UI state only
        setTimeout(() => {
            setUpgrading(null);
            alert('Complete payment in the Stripe window. Your tier will update after payment confirmation.');
        }, 3000);
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
                    <Crown size={18} />
                    <span className="font-bold text-sm">Upgrade Your Plan</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Unlock Premium Features</h1>
                <p className="text-muted max-w-xl mx-auto">
                    Get lower fees, auto-profit switching, AI optimization, and more.
                </p>
            </div>

            {success && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-center text-green-400 font-bold">
                    ✅ Upgrade successful! Refreshing...
                </div>
            )}

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PLANS.map((plan) => (
                    <div
                        key={plan.tier}
                        className={`relative bg-surface border rounded-2xl p-6 transition-all ${plan.popular
                            ? 'border-blue-500 shadow-lg shadow-blue-500/20 scale-105'
                            : 'border-white/10 hover:border-white/20'
                            }`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                MOST POPULAR
                            </div>
                        )}

                        <div className="text-center mb-6">
                            <h3 className={`text-xl font-bold text-${plan.color}-400`}>{plan.name}</h3>
                            <div className="mt-2">
                                <span className="text-4xl font-bold text-white">${plan.price}</span>
                                <span className="text-muted">/month</span>
                            </div>
                            <p className="text-sm text-muted mt-1">Platform Fee: <span className="text-white font-bold">{plan.fee}</span></p>
                        </div>

                        <ul className="space-y-3 mb-6">
                            {FEATURES.map((feature, i) => {
                                const hasFeature = feature[plan.tier];
                                return (
                                    <li key={i} className={`flex items-center gap-2 text-sm ${hasFeature ? 'text-white' : 'text-muted line-through'}`}>
                                        {hasFeature ? (
                                            <Check size={16} className="text-green-500" />
                                        ) : (
                                            <div className="w-4 h-4" />
                                        )}
                                        {feature.name}
                                    </li>
                                );
                            })}
                        </ul>

                        <button
                            onClick={() => handleUpgrade(plan.tier)}
                            disabled={currentUser?.tier === plan.tier || upgrading !== null}
                            className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${currentUser?.tier === plan.tier
                                ? 'bg-white/5 text-muted cursor-not-allowed'
                                : plan.popular
                                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                        >
                            {upgrading === plan.tier ? (
                                'Processing...'
                            ) : currentUser?.tier === plan.tier ? (
                                'Current Plan'
                            ) : (
                                <>
                                    Upgrade <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* FAQ */}
            <div className="bg-surface border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Frequently Asked Questions</h2>
                <div className="space-y-4 text-sm">
                    <div>
                        <p className="font-bold text-white">How does billing work?</p>
                        <p className="text-muted">Subscriptions are billed monthly. Cancel anytime.</p>
                    </div>
                    <div>
                        <p className="font-bold text-white">What payment methods do you accept?</p>
                        <p className="text-muted">Credit card, PayPal, and cryptocurrency (BTC, ETH, XMR).</p>
                    </div>
                    <div>
                        <p className="font-bold text-white">Can I downgrade later?</p>
                        <p className="text-muted">Yes, you can change your plan at any time.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Upgrade;
