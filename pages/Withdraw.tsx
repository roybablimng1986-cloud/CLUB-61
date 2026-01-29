import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, Smartphone, AlertCircle, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { handleWithdraw, subscribeToBalance } from '../services/mockFirebase';
import { UserProfile } from '../types';

const Withdraw: React.FC<{ onBack: () => void; userBalance: number }> = ({ onBack, userBalance }) => {
    const [amount, setAmount] = useState('');
    const [password, setPassword] = useState('');
    const [method, setMethod] = useState<'BANK' | 'UPI' | 'PHONEPE'>('BANK');
    const [message, setMessage] = useState<{ type: 'S'|'E', text: string } | null>(null);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [details, setDetails] = useState({ accountName: '', accountNo: '', ifsc: '', upiId: '', phonePe: '' });

    useEffect(() => {
        const unsub = subscribeToBalance(u => {
            setUser(u);
            if (u?.isBankBound) setMethod('BANK');
            else if (u?.isUpiBound) setMethod('UPI');
        });
        return unsub;
    }, []);

    const showMsg = (text: string, type: 'S'|'E' = 'E') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 4000);
    };

    const onSubmit = async () => {
        if (!user) return;
        // Verify PIN is set
        if (!user.withdrawalPassword) return showMsg('Please set your Security PIN in Safety Hub first.');
        
        const val = parseFloat(amount);
        if (isNaN(val) || val < 110) return showMsg('Minimum withdrawal is ₹110');
        if ((user.wagerRequired || 0) > 0) return showMsg(`Turnover incomplete! ₹${user.wagerRequired.toFixed(2)} left.`);
        if (!password) return showMsg('Enter Security PIN');

        let payload = {};
        if (method === 'BANK') {
            if (!details.accountName || !details.accountNo || !details.ifsc) return showMsg('Please enter full bank details');
            payload = { accountName: details.accountName, accountNo: details.accountNo, ifsc: details.ifsc };
        } else if (method === 'UPI') {
            if (!details.upiId) return showMsg('Enter UPI ID');
            payload = { upiId: details.upiId };
        } else {
            if (!details.phonePe) return showMsg('Enter PhonePe Number');
            payload = { phonePe: details.phonePe };
        }

        const res = await handleWithdraw(val, method, password, payload);
        if (res.success) {
            showMsg(res.message || 'Request Submitted', 'S');
            setAmount(''); setPassword('');
        } else showMsg(res.message || 'Withdrawal Failed');
    };

    return (
        <div className="bg-[#0a0f1d] min-h-screen text-white font-sans flex flex-col pb-10">
            <div className="p-4 bg-[#111827] flex items-center justify-between border-b border-slate-800 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-full active:scale-90"><ArrowLeft size={18}/></button>
                    <h1 className="font-black text-sm uppercase tracking-widest italic gold-text">CASH OUT ASSETS</h1>
                </div>
            </div>

            <div className="p-6 space-y-6">
                <div className="bg-gradient-to-br from-indigo-600 to-blue-900 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
                    <p className="text-blue-100 text-[10px] mb-2 uppercase tracking-[0.3em] font-black">Withdrawable Capital</p>
                    <h2 className="text-5xl font-black italic tracking-tighter">₹{userBalance.toFixed(2)}</h2>
                </div>

                {/* Method Switcher */}
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setMethod('BANK')} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${method==='BANK'?'border-blue-500 bg-blue-500/10 text-blue-400':'border-slate-800 bg-[#111827] text-zinc-500'}`}><Building2 size={24}/><span className="text-[8px] font-black uppercase">Bank</span></button>
                    <button onClick={() => setMethod('UPI')} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${method==='UPI'?'border-blue-500 bg-blue-500/10 text-blue-400':'border-slate-800 bg-[#111827] text-zinc-500'}`}><Smartphone size={24}/><span className="text-[8px] font-black uppercase">UPI</span></button>
                    <button onClick={() => setMethod('PHONEPE')} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${method==='PHONEPE'?'border-purple-500 bg-purple-500/10 text-purple-400':'border-slate-800 bg-[#111827] text-zinc-500'}`}><Smartphone size={24}/><span className="text-[8px] font-black uppercase text-zinc-600">PhonePe</span></button>
                </div>

                <div className="bg-[#111827] border-2 border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                    {method === 'BANK' ? (
                        <div className="space-y-3">
                            <input type="text" placeholder="Holder Name" value={details.accountName} onChange={e=>setDetails({...details, accountName: e.target.value})} className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm" />
                            <input type="text" placeholder="Account Number" value={details.accountNo} onChange={e=>setDetails({...details, accountNo: e.target.value})} className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm" />
                            <input type="text" placeholder="IFSC Code" value={details.ifsc} onChange={e=>setDetails({...details, ifsc: e.target.value})} className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm" />
                        </div>
                    ) : method === 'UPI' ? (
                        <input type="text" placeholder="Enter UPI ID" value={details.upiId} onChange={e=>setDetails({...details, upiId: e.target.value})} className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm" />
                    ) : (
                        <input type="tel" placeholder="Enter PhonePe Number" value={details.phonePe} onChange={e=>setDetails({...details, phonePe: e.target.value})} className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm" />
                    )}
                </div>

                <div className="space-y-4">
                    <div className="bg-[#111827] border-2 border-slate-800 rounded-3xl p-5 flex items-center gap-4">
                        <span className="text-yellow-500 font-black text-2xl">₹</span>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Min 110" className="bg-transparent w-full outline-none font-black text-3xl italic" />
                    </div>
                    <div className="bg-[#111827] border-2 border-slate-800 rounded-3xl p-5 flex items-center gap-4">
                        <Lock size={24} className="text-slate-600" />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value.replace(/\D/g,''))} placeholder="6-DIGIT PIN" maxLength={6} className="bg-transparent w-full outline-none font-black text-3xl tracking-[0.4em]" />
                    </div>

                    {message && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 border ${message.type === 'S' ? 'bg-green-600/10 border-green-500 text-green-400' : 'bg-red-600/10 border-red-500 text-red-400'}`}>
                            {message.type === 'S' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                            <p className="text-[10px] font-black uppercase">{message.text}</p>
                        </div>
                    )}

                    {!user?.withdrawalPassword && (
                        <p className="text-[10px] text-orange-500 font-black uppercase text-center border border-orange-500/20 p-4 rounded-2xl bg-orange-500/5">
                            Security Alert: No PIN Set. Go to Safety Hub in Profile.
                        </p>
                    )}

                    <button onClick={onSubmit} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 py-6 rounded-3xl font-black uppercase tracking-[0.3em] shadow-2xl active:scale-95 border-t-2 border-white/20">CONFIRM PAYOUT</button>
                </div>
            </div>
            <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
        </div>
    );
};

export default Withdraw;
