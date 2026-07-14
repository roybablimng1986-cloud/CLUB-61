import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, AlertCircle, ArrowUpRight, TrendingUp } from 'lucide-react';
import { playSound } from '../services/supabaseService';

interface HiLoResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    multiplier: number;
    finalCard: { rank: string; suit: string };
  } | null;
  onClose: () => void;
}

const HiLoResultPopup: React.FC<HiLoResultPopupProps> = ({ result, onClose }) => {
  React.useEffect(() => {
    if (result) {
      if (result.win) playSound('win_popup');
      else playSound('loss_popup');
    }
  }, [result]);

  if (!result) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
        <motion.div 
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          className={`w-[260px] rounded-[2.5rem] overflow-hidden border shadow-[0_15px_45px_rgba(0,0,0,0.6)] ${
            result.win 
              ? 'bg-[#150e22]/95 border-amber-500/40 text-amber-100 shadow-amber-950/25' 
              : 'bg-[#0f0e14]/95 border-red-500/30 text-red-100 shadow-red-950/20'
          }`}
        >
          <div className="p-5 text-center relative">
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={12} className="text-white/40 hover:text-white" />
            </button>

            <div className="flex justify-center mb-3">
              <div className={`p-3 rounded-full ${
                result.win 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {result.win ? (
                  <Trophy size={24} className="animate-bounce" />
                ) : (
                  <AlertCircle size={24} className="animate-pulse" />
                )}
              </div>
            </div>

            <h3 className={`text-lg font-black uppercase tracking-tight ${result.win ? 'text-amber-400' : 'text-red-500'}`}>
              {result.win ? 'ROYALE WIN' : 'UNLUCKY GUESS'}
            </h3>
            <p className="text-[8px] font-mono tracking-widest text-white/30 uppercase mt-0.5 mb-4">Royal Hi-Lo Predictor</p>

            <div className="space-y-2 mb-4">
              <div className="bg-black/40 py-4 px-3 rounded-2xl border border-white/5 flex flex-col items-center">
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-2.5">Drawn Card</span>
                <div className="w-14 h-20 bg-white rounded-lg flex flex-col items-center justify-center border border-slate-300 shadow-lg relative overflow-hidden shrink-0 rotate-3 transform">
                  <div className={`absolute top-0.5 left-1 font-black text-[10px] ${['♥','♦'].includes(result.finalCard.suit) ? 'text-red-600' : 'text-slate-900'}`}>{result.finalCard.rank}</div>
                  <div className={`text-2xl ${['♥','♦'].includes(result.finalCard.suit) ? 'text-red-600' : 'text-slate-900'}`}>{result.finalCard.suit}</div>
                </div>
              </div>

              {result.win && (
                <div className="bg-black/35 px-3.5 py-1.5 rounded-xl border border-white/5 flex justify-between items-center">
                  <span className="text-[9px] font-bold text-white/40 uppercase">Multiplier</span>
                  <span className="text-xs font-black text-amber-400">{result.multiplier.toFixed(2)}x</span>
                </div>
              )}

              <div className="bg-black/35 px-3.5 py-2 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-[9px] font-bold text-white/40 uppercase">
                  {result.win ? 'Winnings' : 'Staked Loss'}
                </span>
                <span className={`text-xs font-black italic ${result.win ? 'text-amber-400' : 'text-red-400'}`}>
                  {result.win ? `+₹${result.amount.toFixed(1)}` : `-₹${result.amount.toFixed(1)}`}
                </span>
              </div>
            </div>

            <button 
              onClick={onClose}
              className={`w-full py-2.5 rounded-2xl font-black uppercase tracking-wider text-[10px] shadow-lg active:scale-95 transition-all ${
                result.win 
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-amber-500/20' 
                  : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
              }`}
            >
              Continue Playing
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default HiLoResultPopup;
