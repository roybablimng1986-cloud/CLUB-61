
import React, { useState } from 'react';
import { Gift, ArrowLeft } from 'lucide-react';
import { redeemGiftCode, transactions } from '../services/mockFirebase';

const Promotion: React.FC = () => {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Filter gift transactions ONLY
  const giftHistory = transactions.filter(t => t.type === 'GIFT');

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
        Gift
      </div>
      
      {/* Background Image Area */}
      <div className="w-full h-64 bg-orange-100 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#ffedd5_0%,_#fed7aa_100%)]"></div>
          {/* Decorative Elements mimicking the screenshot */}
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
               <img 
                   src="https://img.freepik.com/free-vector/open-gift-box-with-coins-lottery-balls_107791-325.jpg?w=1060&t=st=1708455000~exp=1708455600~hmac=fake" 
                   className="w-48 h-auto object-contain mix-blend-multiply opacity-90 drop-shadow-2xl"
                   alt="Gift Box"
               />
          </div>
      </div>

      <div className="flex-1 bg-[#1e293b] -mt-6 rounded-t-3xl relative z-10 px-6 pt-10 pb-20">
          <div className="text-white text-sm mb-6">
              <p className="font-medium text-slate-300">Hi</p>
              <p className="text-slate-400">We have a gift for you</p>
          </div>

          <div className="space-y-6">
              <div>
                  <label className="block text-slate-400 text-sm mb-2">Please enter the gift code below</label>
                  <input 
                      type="text" 
                      placeholder="Please enter gift code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full bg-[#0f172a] text-white rounded-xl py-4 px-4 border border-slate-700 outline-none focus:border-blue-500 transition-colors"
                  />
              </div>

              {message && (
                  <div className={`text-center text-sm font-bold ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                      {message.text}
                  </div>
              )}

              <button 
                  onClick={handleRedeem}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-full shadow-lg shadow-blue-900/40 transition-all active:scale-95"
              >
                  Receive
              </button>

              <div className="mt-8">
                  <h3 className="text-white flex items-center gap-2 font-bold mb-4">
                      <Gift size={16} className="text-blue-500"/>
                      Promo Code History
                  </h3>
                  {giftHistory.length > 0 ? (
                      <div className="space-y-3">
                          {giftHistory.map((tx) => (
                              <div key={tx.id} className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                                  <div>
                                      <p className="text-white font-bold text-sm">{tx.desc}</p>
                                      <p className="text-[10px] text-slate-400">{tx.date}</p>
                                  </div>
                                  <span className="text-green-500 font-bold">+₹{tx.amount}</span>
                              </div>
                          ))}
                      </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <div className="w-24 h-24 bg-slate-700 rounded-lg mb-2"></div>
                        <p className="text-slate-500 text-sm">No promo code history</p>
                    </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Promotion;