import React, { useState, useEffect } from 'react';
import { Users, Copy, Gift, TrendingUp, Check as CheckIcon } from 'lucide-react';
import { getCurrentUser, getReferrals } from '../services/authService';
import { User } from '../types';

const Referrals: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [referrals, setReferrals] = useState<User[]>([]);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const loadUserData = async () => {
            const currentUser = getCurrentUser();
            setUser(currentUser);
            if (currentUser) {
                const referralData = await getReferrals();
                setReferrals(referralData);
            }
        };
        loadUserData();
    }, []);

    const copyReferralLink = () => {
        if (!user) return;
        const link = `${window.location.origin}?ref=${user.referralCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!user) return <div className="text-muted">Please login to view referrals.</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Users className="text-primary" size={28} />
                <h1 className="text-2xl font-bold text-white">Referral Program</h1>
            </div>

            {/* Referral Link Card */}
            <div className="bg-surface border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-2">Your Referral Link</h2>
                <p className="text-muted text-sm mb-4">
                    Share this link to earn <span className="text-primary font-bold">0.5%</span> of every share mined by users you refer!
                </p>

                <div className="flex items-center gap-2">
                    <input
                        readOnly
                        value={`${window.location.origin}?ref=${user.referralCode}`}
                        aria-label="Referral link"
                        title="Your referral link"
                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm"
                    />
                    <button
                        onClick={copyReferralLink}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-black font-bold rounded-lg flex items-center gap-2 transition-all"
                    >
                        {copied ? <CheckIcon size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>

                <div className="mt-4 text-xs text-muted">
                    Your Code: <span className="font-mono text-white">{user.referralCode}</span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted mb-1">
                        <Users size={16} />
                        <span className="text-xs font-bold uppercase">Total Referrals</span>
                    </div>
                    <span className="text-3xl font-bold text-white">{referrals.length}</span>
                </div>

                <div className="bg-surface border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted mb-1">
                        <Gift size={16} />
                        <span className="text-xs font-bold uppercase">Bonus Earned</span>
                    </div>
                    <span className="text-3xl font-bold text-green-400">{user.referralBonus.toFixed(4)}</span>
                    <span className="text-sm text-muted ml-1">shares</span>
                </div>

                <div className="bg-surface border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted mb-1">
                        <TrendingUp size={16} />
                        <span className="text-xs font-bold uppercase">Your Tier</span>
                    </div>
                    <span className={`text-xl font-bold capitalize ${user.tier === 'enterprise' ? 'text-purple-400' :
                        user.tier === 'pro' ? 'text-blue-400' : 'text-gray-400'
                        }`}>
                        {user.tier}
                    </span>
                </div>
            </div>

            {/* Referred Users Table */}
            <div className="bg-surface border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Referred Users</h2>
                {referrals.length === 0 ? (
                    <p className="text-muted text-sm">No referrals yet. Share your link to start earning!</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-muted border-b border-white/10">
                                    <th className="pb-2">Username</th>
                                    <th className="pb-2">Joined</th>
                                    <th className="pb-2">Tier</th>
                                </tr>
                            </thead>
                            <tbody>
                                {referrals.map((r) => (
                                    <tr key={r.id} className="border-b border-white/5">
                                        <td className="py-2 text-white">{r.username}</td>
                                        <td className="py-2 text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                                        <td className="py-2 capitalize text-muted">{r.tier}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Referrals;
