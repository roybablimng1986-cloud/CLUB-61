
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, AlertCircle, ShieldCheck, Lock, Unlock } from 'lucide-react';
import { playSound } from '../services/supabaseService';

interface VaultBreakerResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    tierReached: number;
  } | null;
  onClose: () => void;
}

const VaultBreakerResultPopup: React.FC<VaultBreakerResultPopupProps> = ({ result, onClose }) => {
  React.useEffect(() => {
    if (result) {
      if (result.win) playSound('win_popup');
      else playSound('loss_popup');
    }
  }, [result]);

  if (!result) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 50 }}
          className={`w-full max-w-sm rounded-[3rem] overflow-hidden border-2 shadow-[0_0_100px_rgba(0,0,0,0.5)] ${result.win ? 'bg-[#0a1a1a] border-blue-500/30' : 'bg-[#1a1a1a] border-red-500/30'}`}
        >
          <div className={`p-8 text-center relative ${result.win ? 'bg-gradient-to-b from-blue-500/20 to-transparent' : 'bg-gradient-to-b from-red-500/20 to-transparent'}`}>
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <X size={20} className="text-white/50" />
            </button>

            <div className="mb-6 inline-flex p-6 rounded-full bg-black/40 border border-white/10 relative">
              {result.win ? (
                <Unlock size={48} className="text-yellow-500 animate-bounce" />
              ) : (
                <ShieldCheck size={48} className="text-red-500 animate-pulse" />
              )}
            </div>

            <h2 className={`text-4xl font-black italic tracking-tighter uppercase mb-2 ${result.win ? 'text-blue-500' : 'text-red-500'}`}>
              {result.win ? 'VAULT CRACKED!' : 'ALARM TRIGGERED'}
            </h2>

            <div className="space-y-4 mb-8">
                <div className="bg-black/30 p-6 rounded-3xl border border-white/5">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-4">Breach Summary</p>
                    <div className="flex flex-col items-center">
                        <p className={`text-xl font-black italic uppercase ${result.win ? 'text-blue-400' : 'text-red-500'}`}>
                            Tier {result.tierReached} Reached
                        </p>
                        {result.win && (
                            <p className="text-xl font-black italic gold-text uppercase mt-2">5.0x Payout!</p>
                        )}
                    </div>
                </div>
            </div>

            <div className={`p-6 rounded-[2rem] border-2 mb-8 ${result.win ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">
                {result.win ? 'Total Profit' : 'Total Loss'}
              </p>
              <h3 className={`text-4xl font-black italic ${result.win ? 'text-yellow-500' : 'text-white/20'}`}>
                {result.win ? `+₹${result.amount.toFixed(2)}` : `-₹${result.amount.toFixed(2)}`}
              </h3>
            </div>

            <button 
              onClick={onClose}
              className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.4em] text-sm shadow-2xl active:scale-95 transition-all ${result.win ? 'bg-blue-600 text-white' : 'bg-white/10 text-white border border-white/10'}`}
            >
              TRY AGAIN
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default VaultBreakerResultPopup;
