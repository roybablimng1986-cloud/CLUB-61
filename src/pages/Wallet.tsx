import React from 'react';
import { View } from '../types';
import { transactions } from '../services/mockFirebase';
const Wallet: React.FC<{ setView: (v: View) => void; userBalance: number }> = ({ setView, userBalance }) => {
    return (
        <div className="bg-[#0f172a] min-h-screen text-white p-4 pb-20">
            <h1 className="text-center font-bold mb-6">Wallet</h1>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl mb-6"><div className="text-sm opacity-70">Balance</div><div className="text-4xl font-bold">₹{userBalance.toFixed(2)}</div></div>
            <div className="flex gap-4 mb-6"><button onClick={()=>setView('DEPOSIT')} className="flex-1 bg-[#1e293b] py-4 rounded-xl border border-slate-700">Deposit</button><button onClick={()=>setView('WITHDRAW')} className="flex-1 bg-[#1e293b] py-4 rounded-xl border border-slate-700">Withdraw</button></div>
            <h3 className="font-bold mb-4">History</h3>
            <div className="space-y-2">{transactions.filter(t=>['DEPOSIT','WITHDRAW','GIFT'].includes(t.type)).map(t=><div key={t.id} className="bg-[#1e293b] p-3 rounded flex justify-between"><span>{t.type}</span><span className={t.type==='DEPOSIT'?'text-green-500':'text-red-500'}>{t.amount}</span></div>)}</div>
        </div>
    );
};
export default Wallet;