import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Swords, Zap, HelpCircle } from 'lucide-react';
import { playSound } from '../services/supabaseService';

interface DiceDuelResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    dice: number[];
    sum: number;
    target: string;
  } | null;
  onClose: () => void;
}

const DiceDuelResultPopup: React.FC<DiceDuelResultPopupProps> = ({ result, onClose }) => {
  React.useEffect(() => {
    if (result) {
      if (result.win) playSound('win_popup');
      else playSound('loss_popup');

      // Auto dismiss after exactly 2 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [result, onClose]);

  if (!result) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.9, opacity: 0, rotate: 2 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`w-[270px] rounded-[2.5rem] overflow-hidden border shadow-[0_15px_40px_rgba(0,0,0,0.6)] ${
            result.win 
              ? 'bg-[#04151f]/95 border-cyan-500/40 text-cyan-100 shadow-cyan-950/20' 
              : 'bg-[#18081a]/95 border-fuchsia-500/40 text-fuchsia-100 shadow-fuchsia-950/20'
          }`}
        >
          <div className="p-5 text-center relative">
            {/* Close button */}
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={14} className="text-white/40 hover:text-white" />
            </button>

            {/* Header Icon */}
            <div className="flex justify-center mb-3">
              <div className={`p-3 rounded-full ${
                result.win 
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' 
                  : 'bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30'
              }`}>
                {result.win ? (
                  <Trophy size={24} className="animate-bounce" />
                ) : (
                  <Swords size={24} className="animate-pulse" />
                )}
              </div>
            </div>

            {/* Header Title */}
            <h3 className={`text-xl font-extrabold uppercase tracking-tight ${result.win ? 'text-cyan-400' : 'text-fuchsia-400'}`}>
              {result.win ? 'DUEL VICTORY' : 'DUEL DEFEAT'}
            </h3>
            <p className="text-[9px] font-mono tracking-widest text-white/30 uppercase mt-0.5 mb-4">Cyber Dice Duel</p>

            {/* Results Grid */}
            <div className="space-y-2 mb-4">
              {/* Dice Circles */}
              <div className="bg-black/40 p-3.5 rounded-2xl border border-white/5">
                <div className="flex justify-center gap-3 mb-2.5">
                  {result.dice.map((d, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: i * 0.1, type: 'spring' }}
                      className="w-10 h-10 rounded-full bg-slate-950 border border-slate-700/60 shadow-inner flex items-center justify-center text-lg font-black text-white"
                    >
                      {d}
                    </motion.div>
                  ))}
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-white/40 uppercase">DICE SUM</span>
                  <span className={`text-sm font-black italic ${result.win ? 'text-cyan-400' : 'text-fuchsia-400'}`}>
                    {result.sum}
                  </span>
                </div>
              </div>

              {/* Details List */}
              <div className="bg-black/35 px-3.5 py-1.5 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-[9px] font-bold text-white/40 uppercase">Your Bet</span>
                <span className="text-[10px] font-bold text-white uppercase">{result.target}</span>
              </div>

              <div className="bg-black/35 px-3.5 py-2 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-[9px] font-bold text-white/40 uppercase">
                  {result.win ? 'Profit' : 'Loss'}
                </span>
                <span className={`text-xs font-black italic ${result.win ? 'text-yellow-400' : 'text-white/30'}`}>
                  {result.win ? `+₹${result.amount.toFixed(1)}` : `-₹${result.amount.toFixed(1)}`}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button 
              onClick={onClose}
              className={`w-full py-2.5 rounded-2xl font-black uppercase tracking-wider text-[11px] shadow-lg active:scale-95 transition-all ${
                result.win 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/20' 
                  : 'bg-gradient-to-r from-fuchsia-600 to-pink-700 text-white shadow-fuchsia-500/20'
              }`}
            >
              Continue Duel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DiceDuelResultPopup;
