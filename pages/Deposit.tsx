
import React, { useState } from 'react';
import { ArrowLeft, CreditCard, Banknote, QrCode, ClipboardCopy, CheckCircle2, Clock, Smartphone } from 'lucide-react';
import { submitDepositRequest } from '../services/mockFirebase';

interface DepositProps {
    onBack: () => void;
}

const Deposit: React.FC<DepositProps> = ({ onBack }) => {
    const [step, setStep] = useState(1); // 1: Amount/Method, 2: UTR, 3: Success
    const [amount, setAmount] = useState(200);
    const [method, setMethod] = useState<'UPI' | 'PhonePe'>('UPI');
    const [utr, setUtr] = useState('');
    const [error, setError] = useState('');
    const [showCopied, setShowCopied] = useState(false);

    // Specific UPI ID
    const UPI_ID = "9339409219@fam";
    
    // Determine QR Code Styling based on Method
    // PhonePe = Purple Color (#5f259f), UPI = Black
    const qrColor = method === 'PhonePe' ? '5f259f' : '000000';
    
    // Generate QR URL based on UPI ID and Amount (Standard UPI for Scanning)
    // Format: upi://pay?pa=ADDRESS&pn=NAME&am=AMOUNT&cu=INR
    const qrData = `upi://pay?pa=${UPI_ID}&pn=TirangaGames&am=${amount}&cu=INR`;
    const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&color=${qrColor}&margin=10`;

    const amounts = [200, 1000, 5000, 10000, 50000, 100000];

    const handleAmountSelect = (amt: number) => {
        setAmount(amt);
    };

    const goToStep2 = () => {
        if (amount < 100) {
            setError('Minimum deposit is ₹100');
            return;
        }
        setError('');
        setStep(2);
    };

    const submitUtr = () => {
        if (utr.length !== 12) {
            setError('Please enter a valid 12-digit UTR/Reference No.');
            return;
        }
        submitDepositRequest(amount, method, utr);
        setStep(3);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    };

    const openUpiApp = () => {
        // Use specific scheme for PhonePe, otherwise generic UPI
        const scheme = method === 'PhonePe' ? 'phonepe' : 'upi';
        const deepLink = `${scheme}://pay?pa=${UPI_ID}&pn=TirangaGames&am=${amount}&cu=INR`;
        window.location.href = deepLink;
    };

    return (
        <div className="bg-[#0f172a] min-h-screen font-sans text-white relative">
            {/* Copied Toast */}
            {showCopied && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 animate-in zoom-in fade-in duration-200">
                    <CheckCircle2 className="text-green-500"/> Copied!
                </div>
            )}

            <div className="bg-[#1e293b] p-4 flex items-center gap-4 border-b border-slate-700">
                <button onClick={onBack}><ArrowLeft /></button>
                <h1 className="text-lg font-bold">Deposit</h1>
            </div>

            {step === 1 && (
                <div className="p-4 pb-20">
                    <div className="bg-[#1e293b] rounded-xl p-4 mb-6 border border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-400 text-sm">Balance</span>
                            <span className="font-bold text-xl">₹0.00</span>
                        </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wide">Select Payment Method</h3>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div 
                            onClick={() => setMethod('UPI')}
                            className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col items-center gap-2 transition-all ${method === 'UPI' ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' : 'border-slate-700 bg-[#1e293b]'}`}
                        >
                            <QrCode className="text-blue-400" size={32} />
                            <span className="font-bold text-sm">UPI x QR</span>
                            <span className="text-[10px] text-slate-400">100 - 50K</span>
                        </div>
                        <div 
                             onClick={() => setMethod('PhonePe')}
                             className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col items-center gap-2 transition-all ${method === 'PhonePe' ? 'border-[#5f259f] bg-[#5f259f]/10 shadow-lg shadow-[#5f259f]/20' : 'border-slate-700 bg-[#1e293b]'}`}
                        >
                            <div className="w-8 h-8 rounded bg-[#5f259f] flex items-center justify-center text-white font-bold text-xs shadow-md">Pe</div>
                            <span className="font-bold text-sm text-[#ce9aff]">PhonePe</span>
                            <span className="text-[10px] text-slate-400">500 - 100K</span>
                        </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wide">Deposit Amount</h3>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {amounts.map(amt => (
                            <button 
                                key={amt}
                                onClick={() => handleAmountSelect(amt)}
                                className={`py-3 rounded-lg font-bold transition-all ${amount === amt ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg' : 'bg-[#1e293b] text-slate-400 border border-slate-700'}`}
                            >
                                ₹{amt >= 1000 ? `${amt/1000}K` : amt}
                            </button>
                        ))}
                    </div>

                    <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700 flex items-center gap-3 mb-2 focus-within:border-blue-500 transition-colors">
                        <span className="text-slate-400 font-bold">₹</span>
                        <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="bg-transparent w-full outline-none font-bold text-xl text-white"
                        />
                    </div>
                    {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

                    <button 
                        onClick={goToStep2}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 py-4 rounded-xl font-bold text-lg shadow-lg hover:from-blue-500 hover:to-blue-400 transition-all mt-4"
                    >
                        Deposit ₹{amount}
                    </button>
                    
                    <div className="mt-6 text-xs text-slate-400 space-y-2 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-slate-300">Recharge instructions</h4>
                        <p>1. If the transfer time is up, please fill out the deposit form again.</p>
                        <p>2. The transfer amount must match the order you created, otherwise the money cannot be credited successfully.</p>
                        <p>3. If you transfer the wrong amount, our company will not be responsible for the lost amount!</p>
                        <p>4. Note: do not cancel the deposit order after the money has been transferred.</p>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="p-4 pb-20">
                    <div className="text-center mb-6">
                        <div className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">To Pay</div>
                        <h2 className="text-4xl font-black text-white">₹{amount.toFixed(2)}</h2>
                    </div>

                    <div className="bg-white p-6 rounded-2xl flex flex-col items-center justify-center mb-6 shadow-2xl relative overflow-hidden">
                         {/* QR Code */}
                         <div className="relative z-10 p-2 bg-white rounded-xl shadow-lg">
                             <img src={qrImage} alt="Deposit QR" className="w-48 h-48 mix-blend-multiply" />
                             <div className="mt-2 text-center">
                                 <p className="text-black font-bold text-xs uppercase tracking-wider">Scan to Pay</p>
                             </div>
                         </div>
                    </div>

                    <button 
                        onClick={openUpiApp}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 mb-6 transition-all active:scale-95 ${
                            method === 'PhonePe' 
                            ? 'bg-[#5f259f] hover:bg-[#4a1d7c] text-white shadow-[#5f259f]/30' 
                            : 'bg-white text-black hover:bg-slate-100 shadow-white/10'
                        }`}
                    >
                        <Smartphone size={20} />
                        Pay via {method} App
                    </button>

                    <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <ClipboardCopy size={18} className="text-blue-400"/>
                            Submit UTR / Ref No.
                        </h3>
                        <p className="text-xs text-slate-400 mb-4">After payment, please enter the 12-digit UTR/Reference Number from your payment app to verify the transaction.</p>
                        
                        <input 
                            type="text" 
                            placeholder="Enter 12-digit UTR"
                            value={utr}
                            onChange={(e) => setUtr(e.target.value)}
                            maxLength={12}
                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-4 text-white font-mono tracking-widest text-center mb-4 focus:border-blue-500 transition-colors outline-none"
                        />
                        {error && <p className="text-red-500 text-xs text-center mb-4">{error}</p>}
                        
                        <button 
                            onClick={submitUtr}
                            className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-bold text-white shadow-lg shadow-green-900/20 transition-all active:scale-95"
                        >
                            Submit UTR
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in zoom-in duration-300">
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <CheckCircle2 size={48} className="text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Deposit Submitted!</h2>
                    <p className="text-slate-400 mb-8 max-w-xs mx-auto">Your deposit request has been submitted successfully. It will be processed within 5-10 minutes.</p>
                    
                    <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 w-full mb-8">
                        <div className="flex justify-between mb-2">
                            <span className="text-slate-400 text-sm">Amount</span>
                            <span className="text-white font-bold">₹{amount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400 text-sm">UTR</span>
                            <span className="text-white font-mono text-xs">{utr}</span>
                        </div>
                    </div>

                    <button 
                        onClick={onBack}
                        className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-white shadow-lg"
                    >
                        Back to Wallet
                    </button>
                </div>
            )}
        </div>
    );
};

export default Deposit;
