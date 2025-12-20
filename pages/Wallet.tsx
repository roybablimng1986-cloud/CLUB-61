
import React, { useState } from 'react';
import { ArrowLeft, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, History, X, CheckCircle2 } from 'lucide-react';
import { transactions, approveTransaction } from '../services/mockFirebase';
import { View, Transaction } from '../types';

interface WalletProps {
    setView: (view: View) => void;
    userBalance: number;
}

const Wallet: React.FC<WalletProps> = ({ setView, userBalance }) => {
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

    // Filter out game logic (BET and WIN) from Wallet history as requested
    const financialTransactions = transactions.filter(tx => 
        tx.type === 'DEPOSIT' || 
        tx.type === 'WITHDRAW' || 
        tx.type === 'GIFT' || 
        tx.type === 'COMMISSION' || 
        tx.type === 'BONUS'
    );

    const handleApprove = async () => {
        if(selectedTx) {
            await approveTransaction(selectedTx.id);
            setSelectedTx(null); // Close modal
        }
    }

    return (
        <div className="bg-[#0f172a] min-h-screen pb-24 font-sans">
             <div className="bg-[#1e293b] p-4 text-center border-b border-slate-700 sticky top-0 z-10">
                 <h1 className="text-white font-bold text-lg">Wallet</h1>
             </div>

             <div className="p-4">
                 {/* Balance Card */}
                 <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-6 shadow-2xl mb-6 relative overflow-hidden">
                     <div className="relative z-10">
                        <p className="text-blue-100 text-sm mb-1 font-medium">Total Balance</p>
                        <h2 className="text-4xl font-bold text-white mb-2">₹{userBalance.toFixed(2)}</h2>
                        <div className="flex gap-2">
                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white backdrop-blur-sm">Withdrawable: ₹{userBalance.toFixed(2)}</span>
                        </div>
                     </div>
                     <WalletIcon className="absolute -bottom-4 -right-4 text-white/10 w-32 h-32 transform rotate-12" />
                 </div>

                 {/* Action Buttons */}
                 <div className="grid grid-cols-2 gap-4 mb-8">
                     <button 
                        onClick={() => setView('DEPOSIT')}
                        className="bg-[#1e293b] p-4 rounded-xl flex items-center gap-4 border border-slate-700 hover:bg-slate-700/50 transition-colors"
                     >
                         <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                             <ArrowUpRight size={24}/>
                         </div>
                         <div className="text-left">
                             <h3 className="font-bold text-white">Deposit</h3>
                             <p className="text-xs text-slate-400">Add funds</p>
                         </div>
                     </button>
                     <button 
                        onClick={() => setView('WITHDRAW')}
                        className="bg-[#1e293b] p-4 rounded-xl flex items-center gap-4 border border-slate-700 hover:bg-slate-700/50 transition-colors"
                     >
                         <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                             <ArrowDownLeft size={24}/>
                         </div>
                         <div className="text-left">
                             <h3 className="font-bold text-white">Withdraw</h3>
                             <p className="text-xs text-slate-400">Cash out</p>
                         </div>
                     </button>
                 </div>

                 {/* Transaction History */}
                 <div className="space-y-4">
                     <h3 className="text-white font-bold flex items-center gap-2">
                         <History size={18} className="text-blue-500"/>
                         Transaction History
                     </h3>
                     
                     <div className="space-y-3">
                         {financialTransactions.length > 0 ? financialTransactions.map((tx) => (
                             <div 
                                key={tx.id} 
                                onClick={() => setSelectedTx(tx)}
                                className="bg-[#1e293b] p-4 rounded-xl border border-slate-700/50 flex justify-between items-center cursor-pointer hover:bg-slate-800 transition-colors"
                             >
                                 <div className="flex items-center gap-3">
                                     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                         tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'COMMISSION' || tx.type === 'GIFT' || tx.type === 'BONUS'
                                         ? 'bg-green-500/10 text-green-500' 
                                         : 'bg-red-500/10 text-red-500'
                                     }`}>
                                         {tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'COMMISSION' || tx.type === 'GIFT' || tx.type === 'BONUS'
                                         ? <ArrowUpRight size={18}/> 
                                         : <ArrowDownLeft size={18}/>}
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-white text-sm">{tx.desc}</h4>
                                         <p className="text-[10px] text-slate-400">{tx.date}</p>
                                     </div>
                                 </div>
                                 <div className="text-right">
                                     <div className={`font-bold ${
                                         tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'COMMISSION' || tx.type === 'GIFT' || tx.type === 'BONUS'
                                         ? 'text-green-500' 
                                         : 'text-white'
                                     }`}>
                                         {tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'COMMISSION' || tx.type === 'GIFT' || tx.type === 'BONUS' ? '+' : '-'}₹{tx.amount}
                                     </div>
                                     <div className={`text-[10px] uppercase font-bold ${
                                         tx.status === 'SUCCESS' ? 'text-green-500' : 
                                         tx.status === 'PROCESSING' ? 'text-yellow-500' : 'text-red-500'
                                     }`}>{tx.status}</div>
                                 </div>
                             </div>
                         )) : (
                             <div className="text-center py-10 text-slate-500">No transactions found</div>
                         )}
                     </div>
                 </div>
             </div>

             {/* Detail Modal */}
             {selectedTx && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                     <div className="bg-[#1e293b] w-full max-w-sm rounded-2xl p-6 border border-slate-700 relative animate-in zoom-in duration-200">
                         <button onClick={() => setSelectedTx(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X/></button>
                         <h3 className="text-lg font-bold text-white mb-6">Transaction Details</h3>
                         
                         <div className="space-y-4">
                             <DetailRow label="Type" value={selectedTx.type} />
                             <DetailRow label="Amount" value={`₹${selectedTx.amount}`} highlight />
                             <DetailRow label="Status" value={selectedTx.status} color={selectedTx.status === 'SUCCESS' ? 'text-green-500' : selectedTx.status === 'PROCESSING' ? 'text-yellow-500' : 'text-red-500'} />
                             <DetailRow label="Date" value={selectedTx.date} />
                             <DetailRow label="Transaction ID" value={selectedTx.id} />
                             
                             {selectedTx.utr && <DetailRow label="UTR / Ref No" value={selectedTx.utr} />}
                             {selectedTx.method && <DetailRow label="Method" value={selectedTx.method} />}

                             {/* Withdrawal Details */}
                             {selectedTx.accountDetails && (
                                 <div className="bg-[#0f172a] p-3 rounded-lg mt-2">
                                     <p className="text-xs text-slate-500 uppercase font-bold mb-2">Beneficiary Details</p>
                                     {selectedTx.accountDetails.accountName && <p className="text-sm text-white"><span className="text-slate-400">Name:</span> {selectedTx.accountDetails.accountName}</p>}
                                     {selectedTx.accountDetails.accountNo && <p className="text-sm text-white"><span className="text-slate-400">Acc No:</span> {selectedTx.accountDetails.accountNo}</p>}
                                     {selectedTx.accountDetails.ifsc && <p className="text-sm text-white"><span className="text-slate-400">IFSC:</span> {selectedTx.accountDetails.ifsc}</p>}
                                     {selectedTx.accountDetails.upiId && <p className="text-sm text-white"><span className="text-slate-400">UPI:</span> {selectedTx.accountDetails.upiId}</p>}
                                     {selectedTx.accountDetails.phoneNumber && <p className="text-sm text-white"><span className="text-slate-400">Phone:</span> {selectedTx.accountDetails.phoneNumber}</p>}
                                 </div>
                             )}

                             {/* ADMIN APPROVAL BUTTON REMOVED AS REQUESTED */}
                         </div>
                     </div>
                 </div>
             )}
        </div>
    );
}

const DetailRow = ({ label, value, highlight, color }: { label: string, value: string, highlight?: boolean, color?: string }) => (
    <div className="flex justify-between items-center">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className={`font-medium text-sm ${highlight ? 'text-xl font-bold text-white' : 'text-slate-200'} ${color || ''}`}>{value}</span>
    </div>
);

export default Wallet;
