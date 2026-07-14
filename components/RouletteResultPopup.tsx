import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, AlertCircle, RefreshCw } from 'lucide-react';
import { playSound } from '../services/supabaseService';

interface RouletteResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    period: string;
    winningNumber: number;
    isRed: boolean;
    target: string;
  } | null;
  onClose: () => void;
}

const RouletteResultPopup: React.FC<RouletteResultPopupProps> = ({ result, onClose }) => {
  React.useEffect(() => {
    if (result) {
      if (result.win) playSound('win_popup');
      else playSound('loss_popup');
    }
  }, [result]);

  if (!result) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-x-0 top-0 z-[300] flex justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div 
          initial={{ y: -150, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -150, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 280 }}
          className={`w-[290px] rounded-3xl overflow-hidden border shadow-[0_12px_40px_rgba(0,0,0,0.6)] ${
            result.win 
              ? 'bg-[#0f2414]/95 border-emerald-500/40 text-emerald-100' 
              : 'bg-[#180e0e]/95 border-red-500/40 text-red-100'
          }`}
        >
          <div className="p-4 text-center relative">
            <button 
              onClick={onClose} 
              className="absolute top-3 right-3 p-1 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={12} className="text-white/40 hover:text-white" />
            </button>

            <div className="flex items-center gap-3 justify-center mb-2">
              <div className={`p-1.5 rounded-full ${result.win ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {result.win ? <Trophy size={18} className="animate-bounce" /> : <RefreshCw size={18} className="animate-spin" />}
              </div>
              <h4 className={`text-base font-black uppercase tracking-tight ${result.win ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.win ? 'Roulette Win!' : 'Round Ended'}
              </h4>
            </div>

            <p className="text-[8px] font-mono tracking-widest text-white/30 uppercase mb-3">Period: {result.period}</p>

            <div className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5 mb-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl font-black italic border-2 shadow-inner ${
                result.winningNumber === 0 
                  ? 'bg-emerald-600 border-emerald-400 text-white' 
                  : result.isRed 
                    ? 'bg-red-600 border-red-400 text-white' 
                    : 'bg-zinc-800 border-zinc-600 text-white'
              }`}>
                {result.winningNumber}
              </div>

              <div className="flex-1 text-left space-y-0.5">
                <div className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Landed Number</div>
                <div className="flex gap-1.5">
                  <span className="text-[9px] px-2 py-0.5 bg-white/5 rounded-md font-bold text-yellow-500 uppercase">{result.winningNumber === 0 ? 'Zero' : result.isRed ? 'Red' : 'Black'}</span>
                  <span className="text-[9px] px-2 py-0.5 bg-white/5 rounded-md font-bold text-yellow-500 uppercase">{result.winningNumber !== 0 && (result.winningNumber % 2 === 0 ? 'Even' : 'Odd')}</span>
                </div>
              </div>
            </div>

            <div className="bg-black/30 px-3.5 py-2 rounded-2xl border border-white/5 mb-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-white/40 uppercase">Payout</span>
                <span className={`text-xs font-black ${result.win ? 'text-yellow-400' : 'text-white/20'}`}>
                  {result.win ? `+₹${result.amount.toFixed(1)}` : 'No Match'}
                </span>
              </div>
            </div>

            <button 
              onClick={onClose}
              className={`w-full py-2 rounded-xl font-black uppercase tracking-wider text-[10px] transition-all duration-300 ${
                result.win 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/45' 
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

export default RouletteResultPopup;
