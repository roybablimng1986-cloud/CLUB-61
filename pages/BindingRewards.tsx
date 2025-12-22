
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Gift, ShieldCheck, CreditCard, Smartphone, Send, CheckCircle2, AlertCircle, X, ChevronRight, MessageCircle } from 'lucide-react';
import { bindBank, bindUpi, joinTelegramReward, subscribeToBalance } from '../services/mockFirebase';
import { UserProfile } from '../types';

const BindingRewards: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [showBankModal, setShowBankModal] = useState(false);
    const [showUpiModal, setShowUpiModal] = useState(false);
    
    // Form States
    const [bankForm, setBankForm] = useState({ accountName: '', accountNo: '', ifsc: '' });
    const [upiId, setUpiId] = useState('');
    const [msg, setMsg] = useState<{ type: 'S'|'E', text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsub = subscribeToBalance(u => setUser(u));
        return unsub;
    }, []);

    const showMsg = (text: string, type: 'S'|'E' = 'S') => {
        setMsg({ text, type });
        setTimeout(() => setMsg(null), 3000);
    };

    const handleBankBind = async () => {
        if (!bankForm.accountName || !bankForm.accountNo || !bankForm.ifsc) return showMsg('Please fill all fields', 'E');
        setLoading(true);
        const res = await bindBank(bankForm);
        setLoading(false);
        if (res.success) {
            showMsg('Bank Bound! ₹10 Reward Added.');
            setShowBankModal(false);
        } else {
            showMsg(res.message || 'Error', 'E');
        }
    };

    const handleUpiBind = async () => {
        if (!upiId) return showMsg('Please enter UPI ID', 'E');
        setLoading(true);
        const res = await bindUpi({ upiId });
        setLoading(false);
        if (res.success) {
            showMsg('UPI Bound! ₹5 Reward Added.');
            setShowUpiModal(false);
        } else {
            showMsg(res.message || 'Error', 'E');
        }
    };

    const handleTelegram = async () => {
        window.open('https://t.me/mafiflottery', '_blank');
        const res = await joinTelegramReward();
        if (res.success) showMsg('Joined! ₹5 Reward Added.');
    };

    if (!user) return null;

    return (
        <div className="bg-[#0a0f1d] min-h-screen text-white font-sans flex flex-col relative pb-20">
            {msg && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[250] px-6 py-3 rounded-full font-black text-xs flex items-center gap-3 animate-in slide-in-from-top-4 border backdrop-blur-md ${msg.type === 'S' ? 'bg-green-600/80 border-green-400' : 'bg-red-600/80 border-red-400'}`}>
                    {msg.type === 'S' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                    {msg.text}
                </div>
            )}

            <div className="p-4 bg-[#111827] flex items-center gap-4 border-b border-white/5 sticky top-0 z-50">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={18}/></button>
                <h1 className="font-black text-sm uppercase tracking-widest gold-text">Rewards Hub</h1>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
                <div className="bg-gradient-to-br from-indigo-600 to-blue-900 rounded-[2.5rem] p-8 relative overflow-hidden border border-white/10 shadow-2xl mb-4">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black italic gold-text tracking-tighter">ELITE REWARDS</h2>
                        <p className="text-blue-100 text-xs mt-2 font-medium opacity-80 uppercase tracking-widest">Complete missions for instant assets</p>
                        <div className="mt-8 bg-black/30 rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                            <Gift size={32} className="text-yellow-500" />
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Reward Potential</p>
                                <p className="text-xl font-black text-white">₹20.00 Total</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Mission 1: Bank */}
                    <div className={`p-6 rounded-3xl border-2 transition-all ${user.isBankBound ? 'bg-green-600/10 border-green-500/30 grayscale' : 'bg-slate-900 border-white/5'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400"><CreditCard size={24}/></div>
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-widest">Bind Bank Account</h4>
                                    <p className="text-xs text-slate-500 font-bold mt-0.5">Secure your withdrawal channel</p>
                                </div>
                            </div>
                            <span className="text-green-500 font-black italic text-lg">+₹10</span>
                        </div>
                        {user.isBankBound ? (
                            <div className="w-full py-3 bg-green-500/20 text-green-500 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-[0.2em]">
                                <CheckCircle2 size={16}/> MISSION COMPLETE
                            </div>
                        ) : (
                            <button onClick={() => setShowBankModal(true)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all border-t-2 border-white/10">BIND & CLAIM</button>
                        )}
                    </div>

                    {/* Mission 2: UPI */}
                    <div className={`p-6 rounded-3xl border-2 transition-all ${user.isUpiBound ? 'bg-blue-600/10 border-blue-500/30 grayscale' : 'bg-slate-900 border-white/5'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400"><Smartphone size={24}/></div>
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-widest">Bind UPI ID</h4>
                                    <p className="text-xs text-slate-500 font-bold mt-0.5">Instant digital settlements</p>
                                </div>
                            </div>
                            <span className="text-blue-400 font-black italic text-lg">+₹5</span>
                        </div>
                        {user.isUpiBound ? (
                            <div className="w-full py-3 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-[0.2em]">
                                <CheckCircle2 size={16}/> MISSION COMPLETE
                            </div>
                        ) : (
                            <button onClick={() => setShowUpiModal(true)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all border-t-2 border-white/10">BIND & CLAIM</button>
                        )}
                    </div>

                    {/* Mission 3: Telegram */}
                    <div className={`p-6 rounded-3xl border-2 transition-all ${user.isTelegramJoined ? 'bg-cyan-600/10 border-cyan-500/30 grayscale' : 'bg-slate-900 border-white/5'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-cyan-400"><Send size={24}/></div>
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-widest">Join Official Telegram</h4>
                                    <p className="text-xs text-slate-500 font-bold mt-0.5">Stay updated on elite logs</p>
                                </div>
                            </div>
                            <span className="text-cyan-400 font-black italic text-lg">+₹5</span>
                        </div>
                        {user.isTelegramJoined ? (
                            <div className="w-full py-3 bg-cyan-500/20 text-cyan-400 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-[0.2em]">
                                <CheckCircle2 size={16}/> MISSION COMPLETE
                            </div>
                        ) : (
                            <button onClick={handleTelegram} className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all border-t-2 border-white/10">JOIN & CLAIM</button>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/10">
                    <p className="text-[9px] text-yellow-500/60 font-bold uppercase tracking-widest text-center leading-relaxed italic">
                        Warning: Details once bound are final and cannot be modified. They will be strictly enforced for all withdrawal requests. One bank/upi per account limit applies.
                    </p>
                </div>
            </div>

            {/* Bank Modal */}
            {showBankModal && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/90 backdrop-blur-md">
                    <div className="bg-[#111] w-full max-w-md rounded-t-[3rem] p-8 border-t border-white/10 animate-in slide-in-from-bottom">
                        <div className="flex justify-between items-center mb-8">
                             <h3 className="text-xl font-black italic text-white uppercase tracking-widest">Bank Integration</h3>
                             <button onClick={() => setShowBankModal(false)} className="p-2 bg-slate-800 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="space-y-4 mb-8">
                            <input type="text" placeholder="Account Holder Name" value={bankForm.accountName} onChange={e=>setBankForm({...bankForm, accountName: e.target.value})} className="w-full bg-slate-900 border border-white/5 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm" />
                            <input type="text" placeholder="Account Number" value={bankForm.accountNo} onChange={e=>setBankForm({...bankForm, accountNo: e.target.value})} className="w-full bg-slate-900 border border-white/5 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm" />
                            <input type="text" placeholder="IFSC Code" value={bankForm.ifsc} onChange={e=>setBankForm({...bankForm, ifsc: e.target.value})} className="w-full bg-slate-900 border border-white/5 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm" />
                        </div>
                        <button onClick={handleBankBind} disabled={loading} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50">SAVE & ACTIVATE</button>
                    </div>
                </div>
            )}

            {/* UPI Modal */}
            {showUpiModal && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/90 backdrop-blur-md">
                    <div className="bg-[#111] w-full max-w-md rounded-t-[3rem] p-8 border-t border-white/10 animate-in slide-in-from-bottom">
                        <div className="flex justify-between items-center mb-8">
                             <h3 className="text-xl font-black italic text-white uppercase tracking-widest">UPI Integration</h3>
                             <button onClick={() => setShowUpiModal(false)} className="p-2 bg-slate-800 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="mb-8">
                            <input type="text" placeholder="Enter UPI ID (e.g. user@bank)" value={upiId} onChange={e=>setUpiId(e.target.value)} className="w-full bg-slate-900 border border-white/5 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm" />
                        </div>
                        <button onClick={handleUpiBind} disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50">SAVE & ACTIVATE</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BindingRewards;
