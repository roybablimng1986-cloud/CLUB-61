
import React, { useState, useEffect } from 'react';
import { Gift, ArrowLeft, History } from 'lucide-react';
import { redeemGiftCode, getTransactionHistory, playSound } from '../services/mockFirebase';
import { Transaction } from '../types';

const Promotion: React.FC = () => {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{type: 'success'|'error'|'info', text: string} | null>(null);
  const [giftHistory, setGiftHistory] = useState<Transaction[]>([]);

  useEffect(() => {
      const unsub = getTransactionHistory((txs) => {
          setGiftHistory(txs.filter(t => t.type === 'GIFT'));
      });
      return unsub;
  }, []);

  const handleRedeem = async () => {
      if (!code) return;
      
      const res = await redeemGiftCode(code);
      if (res > 0) {
          setMessage({ type: 'success', text: `Success! ₹${res} added to wallet.` });
          playSound('win');
          setCode('');
      } else if (res === -1) {
          setMessage({ type: 'error', text: 'You have already used this code.' });
          playSound('loss');
      } else if (res === -2) {
          setMessage({ type: 'error', text: 'Code limit has been reached.' });
          playSound('loss');
      } else if (res === -3) {
          setMessage({ type: 'error', text: 'VIP Level insufficient for this reward.' });
          playSound('loss');
      } else {
          setMessage({ type: 'error', text: 'Invalid gift code.' });
          playSound('loss');
      }

      setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="bg-[#1e293b] min-h-screen flex flex-col font-sans">
      <div className="bg-[#1e293b] p-4 text-white text-center font-black text-sm uppercase tracking-[0.2em] relative shadow-md">
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

      <div className="flex-1 bg-[#1e293b] -mt-6 rounded-t-[3rem] relative z-10 px-6 pt-10 pb-28 border-t border-white/10">
          <div className="text-white text-sm mb-8 text-center">
              <p className="font-black uppercase tracking-widest text-yellow-500">Exclusive Mafia Assets</p>
              <p className="text-slate-400 text-[10px] mt-1 uppercase">Redeem secret codes for instant wallet boost.</p>
          </div>

          <div className="space-y-6">
              <div className="bg-[#0f172a] rounded-[2rem] p-1 border border-white/5">
                  <input 
                      type="text" 
                      placeholder="ENTER SECRET CODE"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="w-full bg-transparent text-white text-center rounded-[2rem] py-5 px-6 outline-none focus:text-yellow-400 transition-colors font-black tracking-[0.4em] uppercase"
                  />
              </div>

              {message && (
                  <div className={`text-center text-[10px] font-black uppercase tracking-widest animate-in zoom-in ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                      {message.text}
                  </div>
              )}

              <button 
                  onClick={handleRedeem}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 text-black font-black py-5 rounded-[2rem] shadow-xl transition-all active:scale-95 uppercase tracking-[0.3em] border-t-2 border-white/20"
              >
                  Claim Assets
              </button>

              <div className="mt-12">
                  <h3 className="text-white flex items-center gap-3 font-black uppercase tracking-widest text-[10px] mb-6 opacity-60">
                      <History size={16} className="text-yellow-500"/>
                      Redemption Archive
                  </h3>
                  {giftHistory.length > 0 ? (
                      <div className="space-y-3">
                          {giftHistory.map((tx) => (
                              <div key={tx.id} className="bg-[#0f172a] p-5 rounded-3xl border border-white/5 flex justify-between items-center shadow-lg">
                                  <div>
                                      <p className="text-white font-black text-xs uppercase tracking-tighter italic">Mafia Bounty Claimed</p>
                                      <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">{tx.date}</p>
                                  </div>
                                  <div className="text-right">
                                      <span className="text-green-500 font-black text-lg italic tracking-tighter">+₹{tx.amount}</span>
                                      <p className="text-[8px] text-slate-700 font-black uppercase">Settled</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-10">
                        <Gift size={48} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No logs found</p>
                    </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Promotion;
