import React, { useState } from 'react';
import { ArrowLeft, Building2, Smartphone, AlertCircle } from 'lucide-react';
import { handleWithdraw } from '../services/mockFirebase';

const Withdraw: React.FC<{ onBack: () => void; userBalance: number }> = ({ onBack, userBalance }) => {
    const [amount, setAmount] = useState('');
    const [password, setPassword] = useState('');
    const [method, setMethod] = useState<'BANK'|'UPI'|'PHONEPE'>('BANK');
    const [message, setMessage] = useState('');
    const [details, setDetails] = useState<any>({});

    const onSubmit = async () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val < 110) { setMessage('Minimum withdrawal ₹110'); return; }
        if (password.length !== 6) { setMessage('Enter 6-digit password'); return; }
        const res = await handleWithdraw(val, method, password, details);
        setMessage(res.success ? 'Request Submitted!' : res.message || 'Error');
    };

    return (
        <div className="bg-[#0f172a] min-h-screen font-sans text-white">
            <div className="bg-[#1e293b] p-4 flex items-center gap-4 border-b border-slate-700"><button onClick={onBack}><ArrowLeft /></button><h1 className="text-lg font-bold">Withdraw</h1></div>
            <div className="p-4">
                 <div className="bg-blue-600 rounded-2xl p-6 mb-6 shadow-lg"><p className="text-blue-100 text-sm">Balance</p><h2 className="text-3xl font-bold">₹{userBalance.toFixed(2)}</h2></div>
                 <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase">Method</h3>
                 <div className="grid grid-cols-3 gap-3 mb-6">
                     {['BANK', 'UPI', 'PHONEPE'].map(m => (
                         <button key={m} onClick={() => setMethod(m as any)} className={`p-3 rounded-xl border text-xs font-bold ${method === m ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-[#1e293b]'}`}>{m}</button>
                     ))}
                 </div>
                 <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 space-y-3 mb-6">
                    <input type="text" placeholder="Account Name" onChange={e => setDetails({...details, accountName: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-sm text-white outline-none"/>
                    {method === 'BANK' && <><input type="text" placeholder="Account No" onChange={e => setDetails({...details, accountNo: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-sm text-white outline-none"/><input type="text" placeholder="IFSC" onChange={e => setDetails({...details, ifsc: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-sm text-white outline-none"/></>}
                    {method === 'UPI' && <input type="text" placeholder="UPI ID" onChange={e => setDetails({...details, upiId: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-sm text-white outline-none"/>}
                    {method === 'PHONEPE' && <input type="tel" placeholder="PhonePe Number" onChange={e => setDetails({...details, phoneNumber: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-sm text-white outline-none"/>}
                    <div className="bg-[#1e293b] rounded-xl border border-slate-700 flex items-center gap-3 p-4"><span className="text-green-500 font-bold">₹</span><input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-transparent w-full outline-none font-bold text-lg text-white"/></div>
                    <div className="bg-[#1e293b] rounded-xl border border-slate-700 flex items-center gap-3 p-4"><input type="password" placeholder="6-digit Password" maxLength={6} value={password} onChange={(e) => setPassword(e.target.value.replace(/\D/g,''))} className="bg-transparent w-full outline-none font-bold text-lg text-white tracking-widest"/></div>
                 </div>
                 {message && <div className="p-4 rounded-xl mb-6 bg-slate-800 text-white text-sm">{message}</div>}
                 <button onClick={onSubmit} className="w-full bg-blue-600 py-4 rounded-xl font-bold text-lg shadow-lg">Withdraw</button>
            </div>
        </div>
    );
};
export default Withdraw;