import React, { useState } from 'react';
import { ArrowLeft, Smartphone, QrCode, ClipboardCopy, CheckCircle2 } from 'lucide-react';
import { submitDepositRequest } from '../services/mockFirebase';

const Deposit: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [step, setStep] = useState(1);
    const [amount, setAmount] = useState(200);
    const [method, setMethod] = useState<'UPI' | 'PhonePe'>('UPI');
    const [utr, setUtr] = useState('');
    const [error, setError] = useState('');
    const [showCopied, setShowCopied] = useState(false);
    
    const UPI_ID = "9339409219@fam";
    const qrColor = method === 'PhonePe' ? '5f259f' : '000000';
    const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`upi://pay?pa=${UPI_ID}&pn=TirangaGames&am=${amount}&cu=INR`)}&color=${qrColor}&margin=10`;

    const handleCopy = (text: string) => { navigator.clipboard.writeText(text); setShowCopied(true); setTimeout(() => setShowCopied(false), 2000); };
    const openUpiApp = () => { window.location.href = `${method === 'PhonePe' ? 'phonepe' : 'upi'}://pay?pa=${UPI_ID}&pn=TirangaGames&am=${amount}&cu=INR`; };
    const submitUtr = () => { if (utr.length !== 12) { setError('Invalid UTR'); return; } submitDepositRequest(amount, method, utr); setStep(3); };

    return (
        <div className="bg-[#0f172a] min-h-screen font-sans text-white relative">
            {showCopied && <div className="fixed top-1/2 left-1/2 -translate-x-1/2 z-50 bg-black/80 px-6 py-3 rounded-full flex gap-2"><CheckCircle2 className="text-green-500"/> Copied!</div>}
            <div className="bg-[#1e293b] p-4 flex items-center gap-4 border-b border-slate-700"><button onClick={onBack}><ArrowLeft /></button><h1 className="text-lg font-bold">Deposit</h1></div>
            {step === 1 && (
                <div className="p-4 pb-20">
                    <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase">Method</h3>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div onClick={() => setMethod('UPI')} className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col items-center gap-2 ${method === 'UPI' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-[#1e293b]'}`}><QrCode size={32}/><span className="font-bold text-sm">UPI</span></div>
                        <div onClick={() => setMethod('PhonePe')} className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col items-center gap-2 ${method === 'PhonePe' ? 'border-[#5f259f] bg-[#5f259f]/10' : 'border-slate-700 bg-[#1e293b]'}`}><div className="w-8 h-8 rounded bg-[#5f259f] flex items-center justify-center text-xs">Pe</div><span className="font-bold text-sm text-[#ce9aff]">PhonePe</span></div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase">Amount</h3>
                    <div className="grid grid-cols-3 gap-3 mb-4">{[200, 1000, 5000, 10000, 50000, 100000].map(a => <button key={a} onClick={() => setAmount(a)} className={`py-3 rounded-lg font-bold ${amount === a ? 'bg-blue-600' : 'bg-[#1e293b] border border-slate-700'}`}>₹{a}</button>)}</div>
                    <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700 flex items-center gap-3 mb-4"><span className="text-slate-400 font-bold">₹</span><input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="bg-transparent w-full outline-none font-bold text-xl text-white"/></div>
                    <button onClick={() => setStep(2)} className="w-full bg-blue-600 py-4 rounded-xl font-bold text-lg shadow-lg">Deposit ₹{amount}</button>
                </div>
            )}
            {step === 2 && (
                <div className="p-4 pb-20">
                    <div className="text-center mb-6"><h2 className="text-4xl font-black text-white">₹{amount.toFixed(2)}</h2></div>
                    <div className="bg-white p-6 rounded-2xl flex justify-center mb-6"><img src={qrImage} className="w-48 h-48 mix-blend-multiply" alt="QR" /></div>
                    <button onClick={openUpiApp} className={`w-full py-4 rounded-xl font-bold text-lg mb-6 flex justify-center gap-2 ${method === 'PhonePe' ? 'bg-[#5f259f] text-white' : 'bg-white text-black'}`}><Smartphone size={20} /> Pay via {method} App</button>
                    <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><ClipboardCopy size={18} className="text-blue-400"/> Submit UTR</h3>
                        <input type="text" placeholder="Enter 12-digit UTR" value={utr} onChange={(e) => setUtr(e.target.value)} maxLength={12} className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-4 text-white font-mono text-center mb-4 outline-none" />
                        {error && <p className="text-red-500 text-xs text-center mb-4">{error}</p>}
                        <button onClick={submitUtr} className="w-full bg-green-600 py-4 rounded-xl font-bold text-white shadow-lg">Submit UTR</button>
                    </div>
                </div>
            )}
            {step === 3 && (
                <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6"><CheckCircle2 size={48} className="text-green-500" /></div>
                    <h2 className="text-2xl font-bold text-white mb-2">Deposit Submitted!</h2>
                    <p className="text-slate-400 mb-8">Your request is processing.</p>
                    <button onClick={onBack} className="w-full bg-blue-600 py-4 rounded-xl font-bold text-white shadow-lg">Back to Wallet</button>
                </div>
            )}
        </div>
    );
};
export default Deposit;