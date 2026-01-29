
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Gift, CreditCard, Smartphone, Send, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { bindBank, bindUpi, joinTelegramReward, subscribeToBalance } from '../services/mockFirebase';
import { UserProfile } from '../types';

const BindingRewards: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [showBankModal, setShowBankModal] = useState(false);
    const [showUpiModal, setShowUpiModal] = useState(false);
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
        } else showMsg('Verification Failed', 'E');
    };

    const handleUpiBind = async () => {
        if (!upiId) return showMsg('Please enter UPI ID', 'E');
        setLoading(true);
        const res = await bindUpi({ upiId });
        setLoading(false);
        if (res.success) {
            showMsg('UPI Bound! ₹5 Reward Added.');
            setShowUpiModal(false);
        } else showMsg('Verification Failed', 'E');
    };

    const handleTelegram = async () => {
        window.open('https://t.me/mafiflottery', '_blank');
        const res = await joinTelegramReward();
        if (res.success) showMsg('Joined! ₹5 Reward Added.');
    };

    if (!user) return null;

    return (
        <div className="bg-[#0a0f1d] min-h-screen text-white font-sans flex flex-col relative pb-20 overflow-x-hidden">
            {msg && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[250] px-6 py-3 rounded-full font-black text-xs flex items-center gap-3 animate-in slide-in-from-top-4 border backdrop-blur-md ${msg.type === 'S' ? 'bg-green-600 border-green-400' : 'bg-red-600 border-red-400'}`}>
                    {msg.type === 'S' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                    {msg.text}
                </div>
            )}

            <div className="p-4 bg-[#111827] flex items-center gap-4 border-b border-white/5 sticky top-0 z-50">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={18}/></button>
                <h1 className="font-black text-sm uppercase tracking-widest gold-text">Rewards Hub</h1>
            </div>

            <div className="p-6 space-y-6">
                <div className="bg-gradient-to-br from-indigo-600 to-blue-900 rounded-[2.5rem] p-8 relative overflow-hidden border border-white/10 shadow-2xl">
                    <h2 className="text-3xl font-black italic gold-text tracking-tighter">ELITE REWARDS</h2>
                    <p className="text-blue-100 text-xs mt-2 font-medium opacity-80 uppercase tracking-widest">Complete missions for instant assets</p>
                </div>

                <div className="space-y-4">
                    <RewardCard 
                        icon={<CreditCard size={24}/>} 
                        title="Bind Bank Account" 
                        reward="+₹10" 
                        completed={user.isBankBound} 
                        onAction={() => setShowBankModal(true)} 
                    />
                    <RewardCard 
                        icon={<Smartphone size={24}/>} 
                        title="Bind UPI ID" 
                        reward="+₹5" 
                        completed={user.isUpiBound} 
                        onAction={() => setShowUpiModal(true)} 
                    />
                    <RewardCard 
                        icon={<Send size={24}/>} 
                        title="Join Official Telegram" 
                        reward="+₹5" 
                        completed={user.isTelegramJoined} 
                        onAction={handleTelegram} 
                    />
                </div>
            </div>

            {showBankModal && (
                <Modal title="Bank Integration" onClose={() => setShowBankModal(false)}>
                    <div className="space-y-4 mb-8">
                        <Input placeholder="Account Holder Name" value={bankForm.accountName} onChange={v => setBankForm({...bankForm, accountName: v})} />
                        <Input placeholder="Account Number" value={bankForm.accountNo} onChange={v => setBankForm({...bankForm, accountNo: v})} />
                        <Input placeholder="IFSC Code" value={bankForm.ifsc} onChange={v => setBankForm({...bankForm, ifsc: v})} />
                    </div>
                    <button onClick={handleBankBind} disabled={loading} className="w-full py-5 bg-blue-600 rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50">SAVE & ACTIVATE</button>
                </Modal>
            )}

            {showUpiModal && (
                <Modal title="UPI Integration" onClose={() => setShowUpiModal(false)}>
                    <div className="mb-8">
                        <Input placeholder="Enter UPI ID (e.g. user@bank)" value={upiId} onChange={setUpiId} />
                    </div>
                    <button onClick={handleUpiBind} disabled={loading} className="w-full py-5 bg-indigo-600 rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50">SAVE & ACTIVATE</button>
                </Modal>
            )}
        </div>
    );
};

const RewardCard = ({ icon, title, reward, completed, onAction }: any) => (
    <div className={`p-6 rounded-3xl border-2 transition-all ${completed ? 'bg-green-600/10 border-green-500/30' : 'bg-slate-900 border-white/5'}`}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400">{icon}</div>
                <div>
                    <h4 className="font-black text-sm uppercase tracking-widest">{title}</h4>
                </div>
            </div>
            <span className="text-green-500 font-black italic text-lg">{reward}</span>
        </div>
        {completed ? (
            <div className="w-full py-3 bg-green-500/20 text-green-500 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-[0.2em]">
                <CheckCircle2 size={16}/> CLAIMED
            </div>
        ) : (
            <button onClick={onAction} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 border-t-2 border-white/10">BIND & CLAIM</button>
        )}
    </div>
);

const Input = ({ placeholder, value, onChange }: any) => (
    <input 
        type="text" 
        placeholder={placeholder} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className="w-full bg-slate-900 border border-white/10 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm" 
    />
);

const Modal = ({ title, children, onClose }: any) => (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/90 backdrop-blur-md">
        <div className="bg-[#111] w-full max-w-md rounded-t-[3rem] p-8 border-t border-white/10 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-black italic text-white uppercase tracking-widest">{title}</h3>
                 <button onClick={onClose} className="p-2 bg-slate-800 rounded-full"><X size={20}/></button>
            </div>
            {children}
        </div>
    </div>
);

export default BindingRewards;
