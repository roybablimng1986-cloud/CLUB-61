
import React, { useState } from 'react';
import { ArrowLeft, Smartphone, QrCode, ClipboardCopy, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { submitDepositRequest } from '../services/mockFirebase';

const Deposit: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [step, setStep] = useState(1);
    const [amount, setAmount] = useState(50);
    const [method, setMethod] = useState<'UPI' | 'PhonePe'>('UPI');
    const [utr, setUtr] = useState('');
    const [error, setError] = useState('');
    const [showCopied, setShowCopied] = useState(false);
    
    const UPI_ID = "9339409219@fam";
    const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`upi://pay?pa=${UPI_ID}&pn=MAFIA_CLUB&am=${amount}&cu=INR`)}&color=000000&margin=10`;

    const handleCopy = (text: string) => { navigator.clipboard.writeText(text); setShowCopied(true); setTimeout(() => setShowCopied(false), 2000); };
    const openUpiApp = () => { window.location.href = `upi://pay?pa=${UPI_ID}&pn=MAFIA_CLUB&am=${amount}&cu=INR`; };
    
    const submitUtr = () => { 
        if (utr.length !== 12) { setError('Invalid 12-digit UTR'); return; } 
        submitDepositRequest(amount, method, utr); 
        setStep(3); 
    };

    return (
        <div className="bg-[#0f172a] min-h-screen font-sans text-white relative">
            {showCopied && <div className="fixed top-1/2 left-1/2 -translate-x-1/2 z-[300] bg-black/90 px-8 py-3 rounded-full flex gap-3 border border-yellow-500/20 shadow-2xl font-bold animate-in zoom-in"><CheckCircle2 className="text-green-500"/> Copied!</div>}
            
            <div className="bg-[#1e293b] p-4 flex items-center gap-4 border-b border-slate-700 sticky top-0 z-50">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft /></button>
                <h1 className="text-lg font-black uppercase tracking-tighter italic gold-text">ELITE REFILL</h1>
            </div>

            {step === 1 && (
                <div className="p-6 animate-in fade-in">
                    <div className="bg-yellow-500/10 p-4 rounded-2xl border border-yellow-500/20 flex gap-3 mb-8">
                        <Zap size={20} className="text-yellow-500 shrink-0" />
                        <p className="text-[10px] text-yellow-500/80 font-bold uppercase tracking-widest leading-relaxed">Exclusive Offer: First deposit gets 25% Instant Cash Bonus. Claimable once.</p>
                    </div>

                    <h3 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.3em]">Select Channel</h3>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div onClick={() => setMethod('UPI')} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${method === 'UPI' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-[#1e293b] opacity-60'}`}>
                            <QrCode size={40} className={method === 'UPI' ? 'text-blue-400' : 'text-slate-500'}/>
                            <span className="font-black text-xs uppercase tracking-widest">Normal UPI</span>
                        </div>
                        <div onClick={() => setMethod('PhonePe')} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${method === 'PhonePe' ? 'border-purple-500 bg-purple-500/10' : 'border-slate-800 bg-[#1e293b] opacity-60'}`}>
                            <Smartphone size={40} className={method === 'PhonePe' ? 'text-purple-400' : 'text-slate-500'}/>
                            <span className="font-black text-xs uppercase tracking-widest">PhonePe</span>
                        </div>
                    </div>

                    <h3 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.3em]">Elite Amounts (Min ₹50)</h3>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[50, 100, 500, 1000, 5000, 10000].map(a => (
                            <button key={a} onClick={() => setAmount(a)} className={`py-4 rounded-2xl font-black text-sm transition-all border ${amount === a ? 'bg-blue-600 border-white text-white' : 'bg-[#1e293b] border-slate-800 text-slate-400'}`}>₹{a}</button>
                        ))}
                    </div>

                    <div className="bg-[#1e293b] rounded-3xl p-5 border-2 border-slate-800 flex items-center gap-4 mb-8">
                        <span className="text-blue-500 font-black text-xl">₹</span>
                        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="bg-transparent w-full outline-none font-black text-3xl" placeholder="Custom"/>
                    </div>

                    <button 
                        onClick={() => amount >= 50 ? setStep(2) : alert("Min deposit is ₹50")} 
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 py-6 rounded-3xl font-black text-lg shadow-2xl active:scale-95 transition-all uppercase tracking-[0.4em] border-t-2 border-white/20"
                    >
                        CONTINUE
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="p-6 animate-in slide-in-from-right">
                    <div className="bg-white p-8 rounded-[3rem] flex justify-center mb-8 shadow-2xl relative">
                        <img src={qrImage} className="w-56 h-56 mix-blend-multiply" alt="QR" />
                        <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Elite Channel</div>
                    </div>

                    <button onClick={openUpiApp} className="w-full py-5 bg-white text-black rounded-3xl font-black text-lg mb-8 flex justify-center items-center gap-3 shadow-xl active:scale-95">
                        <Smartphone size={24} /> Pay via Mobile App
                    </button>

                    <div className="bg-[#1e293b] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                        <h3 className="text-white font-black uppercase tracking-widest mb-6 flex items-center gap-3 text-sm">
                            <ClipboardCopy size={20} className="text-blue-400"/> SUBMIT 12-DIGIT UTR
                        </h3>
                        <input 
                            type="text" 
                            placeholder="Enter 12 digits..." 
                            value={utr} 
                            onChange={(e) => setUtr(e.target.value.replace(/\D/g,''))} 
                            maxLength={12} 
                            className="w-full bg-[#0a0f1d] border-2 border-slate-700 rounded-2xl p-5 text-white font-mono text-center text-2xl font-black mb-6 outline-none focus:border-blue-500 transition-all" 
                        />
                        {error && <p className="text-red-500 text-xs text-center mb-6 font-bold uppercase">{error}</p>}
                        <button onClick={submitUtr} className="w-full bg-green-600 py-5 rounded-2xl font-black text-white shadow-xl active:scale-95 uppercase tracking-widest">Verify Payment</button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center animate-in zoom-in">
                    <div className="w-32 h-32 bg-green-500/10 rounded-full flex items-center justify-center mb-8 border-2 border-green-500/20">
                        <CheckCircle2 size={64} className="text-green-500" />
                    </div>
                    <h2 className="text-3xl font-black italic gold-text uppercase tracking-tighter mb-4">LOGGED TO LEDGER</h2>
                    <p className="text-slate-400 text-sm mb-12 px-8">Your refill for <span className="text-white font-bold">₹{amount}</span> is being verified. 1x wager requirement applied.</p>
                    <button onClick={onBack} className="w-full bg-blue-600 py-5 rounded-3xl font-black text-white shadow-xl uppercase tracking-widest">DONE</button>
                </div>
            )}
        </div>
    );
};
export default Deposit;
