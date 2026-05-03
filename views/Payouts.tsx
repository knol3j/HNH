import React, { useState, useEffect } from 'react';
import { DollarSign, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { API_BASE_URL } from '../services/apiClient';
import { notifySuccess, notifyError } from '../services/notification';

interface Payout {
    id: string;
    amount: number;
    currency: string;
    type: string;
    status: string;
    createdAt: string;
    txId?: string;
    address?: string;
}

const Payouts: React.FC = () => {
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [balance, setBalance] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [withdrawCurrency, setWithdrawCurrency] = useState('USD');
    const currentUser = getCurrentUser();

    const fetchPayouts = async () => {
        if (!currentUser) return;
        try {
            const res = await fetch(`${API_BASE_URL}/user/payouts`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('hnh_token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPayouts(data.payouts);
                setBalance(data.balance);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchPayouts();
    }, [currentUser]);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount < 10) {
            notifyError('Minimum withdrawal is $10');
            return;
        }
        if (!withdrawAddress) {
            notifyError('Address required');
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/user/payouts/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('hnh_token')}`
                },
                body: JSON.stringify({ amount, currency: withdrawCurrency, address: withdrawAddress })
            });
            if (res.ok) {
                notifySuccess('Withdrawal request submitted');
                setShowForm(false);
                setWithdrawAmount('');
                setWithdrawAddress('');
                fetchPayouts();
            } else {
                const data = await res.json();
                notifyError(data.error || 'Failed');
            }
        } catch (err: any) {
            notifyError(err.message);
        }
    };

    if (!currentUser) return <div className="p-8 text-white">Please log in.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="text-primary" /> Payouts & Earnings
                    </h1>
                    <p className="text-muted text-sm">Track your mining earnings and request withdrawals.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-primary text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-hover"
                >
                    <Download size={18} /> Request Withdrawal
                </button>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-r from-primary/20 to-emerald-500/20 border border-primary/30 rounded-2xl p-6">
                <p className="text-xs uppercase text-muted font-bold">Total Earned</p>
                <h2 className="text-4xl font-bold text-white mt-1">${balance.toFixed(2)}</h2>
                <p className="text-xs text-muted mt-2">Available for withdrawal after confirmation.</p>
            </div>

            {showForm && (
                <div className="bg-surface border border-white/10 rounded-xl p-6 max-w-lg">
                    <h3 className="text-white font-bold mb-4">Request Withdrawal</h3>
                    <form onSubmit={handleWithdraw} className="space-y-4">
                        <div>
                            <label className="text-xs text-muted uppercase font-bold block mb-1">Amount (USD)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="10"
                                value={withdrawAmount}
                                onChange={e => setWithdrawAmount(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                                placeholder="Min $10"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted uppercase font-bold block mb-1">Currency</label>
                            <select value={withdrawCurrency} onChange={e => setWithdrawCurrency(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white">
                                <option value="USD">USD</option>
                                <option value="XMR">XMR</option>
                                <option value="RVN">RVN</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted uppercase font-bold block mb-1">Destination Address</label>
                            <input
                                type="text"
                                value={withdrawAddress}
                                onChange={e => setWithdrawAddress(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white font-mono"
                                placeholder="0x..."
                            />
                        </div>
                        <div className="flex gap-3">
                            <button type="submit" className="flex-1 bg-primary text-black py-2 rounded-lg font-bold">Request</button>
                            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white/5 text-white py-2 rounded-lg">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Payout History */}
            <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h3 className="text-lg font-bold text-white">Payout History</h3>
                </div>
                {payouts.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead className="bg-black/20 text-left text-muted text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">TxID / Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payouts.map(p => (
                                <tr key={p.id} className="border-t border-white/5">
                                    <td className="px-6 py-4 text-white">{new Date(p.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 capitalize text-muted">{p.type}</td>
                                    <td className="px-6 py-4 text-white font-mono">${p.amount.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1 text-xs font-bold ${p.status === 'completed' ? 'text-emerald-500' : p.status === 'pending' ? 'text-yellow-500' : 'text-red-500'}`}>
                                            {p.status === 'completed' ? <CheckCircle size={12} /> : p.status === 'pending' ? <Clock size={12} /> : <AlertCircle size={12} />}
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-muted font-mono text-xs truncate max-w-[150px]" title={p.txId || p.address || ''}>
                                        {p.txId ? `${p.txId.substring(0, 10)}...` : p.address?.substring(0, 10) || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-8 text-center text-muted">No payouts yet.</div>
                )}
            </div>
        </div>
    );
};

export default Payouts;
