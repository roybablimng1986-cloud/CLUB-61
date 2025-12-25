
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, Smartphone, AlertCircle, ShieldCheck, Lock, ChevronDown, Plus } from 'lucide-react';
import { handleWithdraw, subscribeToBalance } from '../services/mockFirebase';
import { UserProfile } from '../types';

interface Props {
    onBack: () => void;
    userBalance: number;
}

const Withdraw: React.FC<Props> = ({ onBack, userBalance }) => {
    const [amount, setAmount] = useState('');
    const [password, setPassword] = useState('');
    const [method, setMethod] = useState<'BANK' | 'UPI'>('BANK');
    const [message, setMessage] = useState('');
    const [user, setUser] = useState<UserProfile | null>(null);
    const [useBound, setUseBound] = useState(true);

    const [newBank, setNewBank] = useState({ accountName: '', accountNo: '', ifsc: '' });
    const [newUpi, setNewUpi] = useState('');

    useEffect(() => {
        const unsub = subscribeToBalance(u => setUser(u));
        return unsub;
    }, []);

    const onSubmit = async () => {
        if (!user) return;

        if (user.totalDeposit <= 0) {
            setMessage('Account verification required: Minimum 1 deposit needed.');
            return;
        }
        
        const val = parseFloat(amount);
        if (isNaN(val) || val < 110) {
            setMessage('Minimum withdrawal is ₹110');
            return;
        }

        if (user.wagerRequired > 0) {
            setMessage(`Turnover incomplete! ₹${user.wagerRequired.toFixed(2)} remaining.`);
            return;
        }

        if (!password || password.length < 6) {
            setMessage('Please enter your 6-digit withdrawal PIN');
            return;
        }

        let withdrawDetails = {};
        if (useBound) {
            if (method === 'BANK' && user.isBankBound) withdrawDetails = user.bankDetails!;
            else if (method === 'UPI' && user.isUpiBound) withdrawDetails = user.upiDetails!;
            else {
                setMessage('No bound account found. Please enter manually.');
                setUseBound(false);
                return;
            }
        } else {
            if (method === 'BANK') {
                if (!newBank.accountNo) { setMessage('Enter bank details'); return; }
                withdrawDetails = newBank;
            } else {
                if (!newUpi) { setMessage('Enter UPI ID'); return; }
                withdrawDetails = { upiId: newUpi };
            }
        }

        const res = await handleWithdraw(val, method, password, withdrawDetails);
        if (res.success) {
            setMessage('Request Submitted! Assets arriving in 10-30 mins.');
            setAmount('');
            setPassword('');
        } else {
            setMessage(res.message || 'Withdrawal failed');
        }
    };

    return (
        <div className="bg-[#0a0f1d] min-h-screen text-white font-sans flex flex-col pb-10">
            <div className="p-4 bg-[#111827] flex items-center justify-between border-b border-slate-800 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-full"><ArrowLeft size={18}/></button>
                    <h1 className="font-black text-sm uppercase tracking-widest italic gold-text">CASH OUT ASSETS</h1>
                </div>
            </div>

            <div className="p-6 space-y-8 animate-in fade-in duration-500">
                <div className="bg-gradient-to-br from-indigo-600 to-blue-900 rounded-[2.5rem] p-8 relative overflow-hidden border border-white/10 shadow-2xl">
                    <p className="text-blue-100 text-[10px] mb-2 uppercase tracking-[0.3em] font-black">Available Capital</p>
                    <h2 className="text-5xl font-black italic tracking-tighter">₹{userBalance.toFixed(2)}</h2>
                    <div className="mt-8 grid grid-cols-2 gap-4">
                         <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                            <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Total Vested</p>
                            <p className="text-sm font-bold text-green-500">₹{user?.totalDeposit?.toFixed(2) || '0.00'}</p>
                         </div>
                         <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                            <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Turnover Goal</p>
                            <p className="text-sm font-bold text-orange-400">₹{user?.wagerRequired?.toFixed(2) || '0.00'}</p>
                         </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Select Method</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setMethod('BANK')}
                            className={`py-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${method === 'BANK' ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-xl' : 'border-slate-800 bg-[#111827] text-slate-500 opacity-60'}`}
                        >
                            <Building2 size={32}/>
                            <span className="text-[10px] font-black uppercase tracking-widest">Bank Card</span>
                        </button>
                        <button 
                            onClick={() => setMethod('UPI')}
                            className={`py-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${method === 'UPI' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-xl' : 'border-slate-800 bg-[#111827] text-slate-500 opacity-60'}`}
                        >
                            <Smartphone size={32}/>
                            <span className="text-[10px] font-black uppercase tracking-widest">UPI ID</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center ml-2">
                        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Account Source</h3>
                        <button onClick={() => setUseBound(!useBound)} className="text-[10px] text-blue-400 font-bold uppercase">{useBound ? "Use New Account" : "Use Bound Account"}</button>
                    </div>

                    {useBound ? (
                        <div className="bg-black/40 border-2 border-white/5 rounded-3xl p-6 shadow-inner">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Linked Channel</h4>
                                <ShieldCheck size={16} className="text-green-500" />
                            </div>
                            {method === 'BANK' ? (
                                user?.isBankBound ? (
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-white">{user.bankDetails?.accountName}</p>
                                        <p className="text-xs text-slate-500 font-mono">**** {user.bankDetails?.accountNo.slice(-4)} | {user.bankDetails?.ifsc}</p>
                                    </div>
                                ) : <p className="text-xs text-slate-600 italic">No bank bound. Enter details below.</p>
                            ) : (
                                user?.isUpiBound ? (
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-white">{user.upiDetails?.upiId}</p>
                                        <p className="text-xs text-slate-500 uppercase font-black">Elite UPI Channel</p>
                                    </div>
                                ) : <p className="text-xs text-slate-600 italic">No UPI bound. Enter details below.</p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-[#111827] border-2 border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                            <div className="flex items-center gap-2 mb-2 text-yellow-500/80">
                                <Plus size={14}/>
                                <span className="text-[10px] font-black uppercase tracking-widest">Entering One-Time Details</span>
                            </div>
                            {method === 'BANK' ? (
                                <div className="space-y-4">
                                    <input type="text" placeholder="Account Holder Name" value={newBank.accountName} onChange={e=>setNewBank({...newBank, accountName: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl p-3 text-xs outline-none focus:border-blue-500" />
                                    <input type="text" placeholder="Account Number" value={newBank.accountNo} onChange={e=>setNewBank({...newBank, accountNo: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl p-3 text-xs outline-none focus:border-blue-500" />
                                    <input type="text" placeholder="IFSC Code" value={newBank.ifsc} onChange={e=>setNewBank({...newBank, ifsc: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl p-3 text-xs outline-none focus:border-blue-500" />
                                </div>
                            ) : (
                                <input type="text" placeholder="Enter UPI ID (e.g. name@bank)" value={newUpi} onChange={e=>setNewUpi(e.target.value)} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl p-3 text-xs outline-none focus:border-blue-500" />
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Withdrawal Amount (Min ₹110)</label>
                            <div className="bg-[#111827] border-2 border-slate-800 rounded-3xl p-5 flex items-center gap-4 shadow-inner focus-within:border-blue-500 transition-colors">
                                <span className="text-yellow-500 font-black text-2xl">₹</span>
                                <input 
                                    type="number" 
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)} 
                                    placeholder="Min 110" 
                                    className="bg-transparent w-full outline-none font-black text-3xl text-white font-mono"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">6-Digit Security PIN</label>
                            <div className="bg-[#111827] border-2 border-slate-800 rounded-3xl p-5 flex items-center gap-4 shadow-inner focus-within:border-indigo-500 transition-colors">
                                <Lock size={24} className="text-slate-600" />
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value.replace(/\D/g,''))} 
                                    placeholder="000000" 
                                    maxLength={6}
                                    className="bg-transparent w-full outline-none font-black text-3xl tracking-[0.5em] text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 border ${message.includes('Submitted') ? 'bg-green-600/10 text-green-400 border-green-500/20' : 'bg-red-600/10 text-red-400 border-red-500/20'}`}>
                            <AlertCircle size={20} className="shrink-0" />
                            <p className="text-[10px] font-black uppercase tracking-widest">{message}</p>
                        </div>
                    )}

                    <button 
                        onClick={onSubmit}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] transition-all active:scale-95 shadow-2xl border-t-2 border-white/20"
                    >
                        Confirm Payout
                    </button>
                    
                    <div className="bg-red-950/20 p-4 rounded-2xl border border-red-500/10">
                        <p className="text-center text-[9px] text-slate-600 uppercase font-black tracking-widest leading-relaxed">
                            SECURITY ALERT: Bank accounts and UPI IDs are tracked platform-wide. Cross-account usage is strictly prohibited and results in automatic rejection.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Withdraw;
