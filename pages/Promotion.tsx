
import React, { useState, useEffect } from 'react';
import { Gift, ArrowLeft } from 'lucide-react';
import { redeemGiftCode, getTransactionHistory } from '../services/mockFirebase';
import { Transaction } from '../types';

const Promotion: React.FC = () => {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [giftHistory, setGiftHistory] = useState<Transaction[]>([]);

  useEffect(() => {
      const unsub = getTransactionHistory((txs) => {
          setGiftHistory(txs.filter(t => t.type === 'GIFT'));
      });
      return unsub;
  }, []);

  const handleRedeem = async () => {
      if (!code) return;
      
      const amount = await redeemGiftCode(code);
      if (amount > 0) {
          setMessage({ type: 'success', text: `Success! ₹${amount} added.` });
          setCode('');
      } else {
          setMessage({ type: 'error', text: 'Invalid gift code or already used.' });
      }

      setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="bg-[#1e293b] min-h-screen flex flex-col font-sans">
      <div className="bg-[#1e293b] p-4 text-white text-center font-bold text-lg relative shadow-md">
        Gift Center
      </div>
      
      <div className="w-full h-64 bg-orange-100 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#ffedd5_0%,_#fed7aa_100%)]"></div>
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
               <img 
                   src="https://img.freepik.com/free-vector/open-gift-box-with-coins-lottery-balls_107791-325.jpg?w=1060" 
                   className="w-48 h-auto object-contain mix-blend-multiply opacity-90 drop-shadow-2xl"
                   alt="Gift Box"
               />
          </div>
      </div>

      <div className="flex-1 bg-[#1e293b] -mt-6 rounded-t-3xl relative z-10 px-6 pt-10 pb-20">
          <div className="text-white text-sm mb-6">
              <p className="font-black uppercase tracking-widest text-slate-300">Exclusive Reward</p>
              <p className="text-slate-400 text-xs">Redeem elite Mafia codes for instant assets.</p>
          </div>

          <div className="space-y-6">
              <div>
                  <label className="block text-slate-400 text-[10px] font-black uppercase mb-2 ml-1">Enter Secret Code</label>
                  <input 
                      type="text" 
                      placeholder="e.g. MAFIA100"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full bg-[#0f172a] text-white rounded-2xl py-5 px-6 border border-slate-700 outline-none focus:border-blue-500 transition-colors font-black tracking-widest"
                  />
              </div>

              {message && (
                  <div className={`text-center text-xs font-black uppercase tracking-widest ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                      {message.text}
                  </div>
              )}

              <button 
                  onClick={handleRedeem}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-[0.3em]"
              >
                  Claim Code
              </button>

              <div className="mt-12">
                  <h3 className="text-white flex items-center gap-3 font-black uppercase tracking-widest text-sm mb-6">
                      <div className="p-2 bg-blue-500/10 rounded-lg"><Gift size={18} className="text-blue-500"/></div>
                      Redemption History
                  </h3>
                  {giftHistory.length > 0 ? (
                      <div className="space-y-3">
                          {giftHistory.map((tx) => (
                              <div key={tx.id} className="bg-[#0f172a] p-5 rounded-2xl border border-slate-700 flex justify-between items-center shadow-lg">
                                  <div>
                                      <p className="text-white font-black text-sm uppercase">{tx.desc}</p>
                                      <p className="text-[9px] text-slate-500 font-bold mt-1">{tx.date}</p>
                                  </div>
                                  <div className="text-right">
                                      <span className="text-green-500 font-black text-lg">+₹{tx.amount}</span>
                                      <p className="text-[8px] text-slate-600 font-black uppercase">Success</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl mb-4 border border-white/5"></div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">No redemption logs</p>
                    </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Promotion;
