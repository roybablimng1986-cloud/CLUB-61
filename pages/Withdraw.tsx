

import React, { useState } from 'react';
import { ArrowLeft, CreditCard, Building2, Smartphone, AlertCircle } from 'lucide-react';
import { handleWithdraw } from '../services/mockFirebase';

interface WithdrawProps {
    onBack: () => void;
    userBalance: number;
}

const Withdraw: React.FC<WithdrawProps> = ({ onBack, userBalance }) => {
    const [amount, setAmount] = useState('');
    const [password, setPassword] = useState('');
    const [method, setMethod] = useState<'BANK' | 'UPI' | 'PHONEPE'>('BANK');
    const [message, setMessage] = useState('');
    
    // Dynamic Fields
    const [accountName, setAccountName] = useState('');
    const [accountNo, setAccountNo] = useState('');
    const [ifsc, setIfsc] = useState('');
    const [upiId, setUpiId] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    const onSubmit = async () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val < 110) {
            setMessage('Minimum withdrawal amount is ₹110');
            return;
        }
        if (password.length !== 6) {
            setMessage('Please enter your 6-digit withdrawal password');
            return;
        }

        // Validate method specific fields and construct details object
        let details: any = { accountName };

        if (method === 'BANK') {
            if (!accountName || !accountNo || !ifsc) {
                setMessage('Please fill all bank details');
                return;
            }
            details = { ...details, accountNo, ifsc };
        } else if (method === 'UPI') {
            if (!accountName || !upiId) {
                setMessage('Please fill UPI details');
                return;
            }
            details = { ...details, upiId };
        } else if (method === 'PHONEPE') {
            if (!accountName || !phoneNumber) {
                setMessage('Please fill PhonePe details');
                return;
            }
            details = { ...details, phoneNumber };
        }

        // Pass details to service
        const res = await handleWithdraw(val, method, password, details);
        if (res.success) {
            setMessage('Request Submitted! Status: Processing');
            setAmount('');
            setPassword('');
        } else {
            setMessage(res.message);
        }
    };

    return (
        <div className="bg-[#0f172a] min-h-screen font-sans text-white">
            <div className="bg-[#1e293b] p-4 flex items-center gap-4 border-b border-slate-700">
                <button onClick={onBack}><ArrowLeft /></button>
                <h1 className="text-lg font-bold">Withdraw</h1>
            </div>

            <div className="p-4">
                 <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 mb-6 shadow-lg">
                     <p className="text-blue-100 text-sm mb-1">Available balance</p>
                     <h2 className="text-3xl font-bold">₹{userBalance.toFixed(2)}</h2>
                     <div className="flex items-center gap-2 mt-4 text-xs text-blue-100 bg-white/10 px-3 py-1 rounded-full w-fit">
                         <CreditCard size={12}/>
                         Main Wallet
                     </div>
                 </div>

                 <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wide">Select Method</h3>
                 <div className="grid grid-cols-3 gap-3 mb-6">
                     <button 
                        onClick={() => setMethod('BANK')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-colors ${method === 'BANK' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-[#1e293b]'}`}
                     >
                         <Building2 size={24} className={method === 'BANK' ? 'text-blue-400' : 'text-slate-400'}/>
                         <span className="text-xs font-bold">Bank Card</span>
                     </button>
                     <button 
                        onClick={() => setMethod('UPI')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-colors ${method === 'UPI' ? 'border-green-500 bg-green-500/10' : 'border-slate-700 bg-[#1e293b]'}`}
                     >
                         <Smartphone size={24} className={method === 'UPI' ? 'text-green-400' : 'text-slate-400'}/>
                         <span className="text-xs font-bold">UPI</span>
                     </button>
                     <button 
                        onClick={() => setMethod('PHONEPE')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-colors ${method === 'PHONEPE' ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 bg-[#1e293b]'}`}
                     >
                         <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${method === 'PHONEPE' ? 'bg-purple-500 text-white' : 'bg-slate-600 text-slate-300'}`}>Pe</div>
                         <span className="text-xs font-bold">PhonePe</span>
                     </button>
                 </div>

                 <div className="space-y-4 mb-6">
                     {/* Dynamic Fields */}
                     <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 space-y-3">
                        <label className="text-xs text-slate-400 uppercase font-bold">Account Details</label>
                        
                        <input 
                            type="text" 
                            placeholder="Account Holder Name"
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-sm text-white outline-none"
                        />

                        {method === 'BANK' && (
                            <>
                                <input 
                                    type="text" 
                                    placeholder="Account Number"
                                    value={accountNo}
                                    onChange={(e) => setAccountNo(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-sm text-white outline-none"
                                />
                                <input 
                                    type="text" 
                                    placeholder="IFSC Code"
                                    value={ifsc}
                                    onChange={(e) => setIfsc(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-sm text-white outline-none uppercase"
                                />
                            </>
                        )}

                        {method === 'UPI' && (
                             <input 
                                type="text" 
                                placeholder="UPI ID (e.g. name@okhdfcbank)"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-sm text-white outline-none"
                            />
                        )}

                        {method === 'PHONEPE' && (
                             <input 
                                type="tel" 
                                placeholder="PhonePe Number"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-sm text-white outline-none"
                            />
                        )}
                     </div>

                     <div>
                         <label className="text-sm text-slate-400 block mb-2">Withdraw Amount</label>
                         <div className="bg-[#1e293b] rounded-xl border border-slate-700 flex items-center gap-3 p-4">
                             <span className="text-green-500 font-bold">₹</span>
                             <input 
                                 type="number" 
                                 placeholder="Enter amount"
                                 value={amount}
                                 onChange={(e) => setAmount(e.target.value)}
                                 className="bg-transparent w-full outline-none font-bold text-lg text-white"
                             />
                         </div>
                         <div className="text-xs text-slate-500 mt-1 text-right">Min: ₹110</div>
                     </div>

                     <div>
                         <label className="text-sm text-slate-400 block mb-2">Withdrawal Password</label>
                         <div className="bg-[#1e293b] rounded-xl border border-slate-700 flex items-center gap-3 p-4">
                             <input 
                                 type="password" 
                                 placeholder="6-digit password"
                                 maxLength={6}
                                 value={password}
                                 onChange={(e) => setPassword(e.target.value.replace(/\D/g,''))}
                                 className="bg-transparent w-full outline-none font-bold text-lg text-white tracking-widest"
                             />
                         </div>
                     </div>
                 </div>

                 {message && (
                     <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${message.includes('Processing') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                         <AlertCircle size={20} className="shrink-0 mt-0.5"/>
                         <p className="text-sm font-medium">{message}</p>
                     </div>
                 )}

                 <button 
                     onClick={onSubmit}
                     className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                 >
                     Withdraw
                 </button>

                 <div className="mt-8">
                     <h4 className="font-bold text-slate-300 mb-2">Withdrawal Rules</h4>
                     <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside">
                         <li>Minimum withdrawal amount is ₹110.</li>
                         <li>Withdrawals are processed within 1-24 hours.</li>
                         <li>Ensure your bank/UPI details are correct before submitting.</li>
                         <li>3% service fee applies to withdrawals under ₹500.</li>
                     </ul>
                 </div>
            </div>
        </div>
    );
};

export default Withdraw;