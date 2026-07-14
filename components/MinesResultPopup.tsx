import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Bomb, Check, TrendingUp } from 'lucide-react';
import { playSound } from '../services/supabaseService';

interface MinesResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    multiplier: number;
    gemsFound: number;
    minesCount: number;
  } | null;
  onClose: () => void;
}

const MinesResultPopup: React.FC<MinesResultPopupProps> = ({ result, onClose }) => {
  React.useEffect(() => {
    if (result) {
      if (result.win) playSound('win_popup');
      else playSound('loss_popup');
    }
  }, [result]);

  if (!result) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: -40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -40 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={`w-[260px] rounded-[2rem] overflow-hidden border shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${
            result.win 
              ? 'bg-[#0b1c10]/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/20' 
              : 'bg-[#180a0a]/95 border-red-500/40 text-red-100 shadow-red-950/20'
          }`}
        >
          <div className="p-5 text-center relative">
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={14} className="text-white/40 hover:text-white" />
            </button>

            <div className="flex justify-center mb-3">
              <div className={`p-3 rounded-full ${result.win ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {result.win ? (
                  <Trophy size={24} className="animate-bounce" />
                ) : (
                  <Bomb size={24} className="animate-pulse" />
                )}
              </div>
            </div>

            <h3 className={`text-xl font-extrabold uppercase tracking-tight ${result.win ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.win ? 'CASHOUT' : 'EXPLODED'}
            </h3>
            
            <p className="text-[9px] font-mono tracking-widest text-white/30 uppercase mt-0.5 mb-3">Mines Hunt</p>

            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between items-center bg-black/35 px-3.5 py-1.5 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Multiplier</span>
                <span className={`text-xs font-black italic ${result.win ? 'text-yellow-400' : 'text-slate-400'}`}>
                  {result.multiplier.toFixed(2)}x
                </span>
              </div>

              <div className="flex justify-between items-center bg-black/35 px-3.5 py-1.5 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Gems Found</span>
                <span className="text-xs font-bold text-white font-mono">
                  {result.gemsFound} 💎
                </span>
              </div>

              <div className="flex justify-between items-center bg-black/35 px-3.5 py-2 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  {result.win ? 'Profit' : 'Loss'}
                </span>
                <span className={`text-sm font-black italic ${result.win ? 'text-yellow-400' : 'text-red-400'}`}>
                  {result.win ? `+₹${result.amount.toFixed(1)}` : `-₹${result.amount.toFixed(1)}`}
                </span>
              </div>
            </div>

            <button 
              onClick={onClose}
              className={`w-full py-2.5 rounded-2xl font-black uppercase tracking-wider text-[11px] shadow-lg active:scale-95 transition-all ${
                result.win 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20' 
                  : 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-red-500/20'
              }`}
            >
              Continue
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MinesResultPopup;
