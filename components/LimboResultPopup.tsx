
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Rocket, X } from 'lucide-react';
import { playSound } from '../services/supabaseService';

interface LimboResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    multiplier: number;
    target: number;
  } | null;
  onClose: () => void;
}

const LimboResultPopup: React.FC<LimboResultPopupProps> = ({ result, onClose }) => {
  React.useEffect(() => {
    if (result) {
      if (result.win) {
        playSound('win_popup');
      } else {
        playSound('loss_popup');
      }

      // Auto dismiss after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [result, onClose]);

  if (!result) return null;

  return (
    <AnimatePresence>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-xs pointer-events-none">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={`pointer-events-auto relative rounded-xl border px-3 py-2 shadow-xl flex items-center gap-2.5 overflow-hidden backdrop-blur-xl ${
            result.win 
              ? 'bg-emerald-950/90 border-emerald-500/40 shadow-emerald-500/10 text-emerald-400' 
              : 'bg-rose-950/90 border-rose-500/40 shadow-rose-500/10 text-rose-400'
          }`}
        >
          {/* Status Icon */}
          <div className="shrink-0">
            {result.win ? (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                <Trophy size={14} className="text-emerald-400 animate-bounce" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-400/30 flex items-center justify-center">
                <Rocket size={14} className="text-rose-400 rotate-45" />
              </div>
            )}
          </div>

          {/* Details column */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[10px] font-black tracking-widest uppercase">
                {result.win ? 'WIN' : 'CRASHED'}
              </span>
              <span className="text-[9px] opacity-75 font-bold font-mono">
                {result.multiplier.toFixed(2)}x
              </span>
            </div>
            <p className="text-[9px] text-white/80 truncate mt-0.5 font-mono">
              {result.win 
                ? `Payout: +₹${result.amount.toFixed(2)}`
                : `Lost: ₹${result.amount.toFixed(2)}`
              }
            </p>
          </div>

          {/* Manual close */}
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white/70 p-1 active:scale-95 transition-all self-center shrink-0"
          >
            <X size={14} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LimboResultPopup;

