import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound } from '../services/supabaseService';

interface VortexResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    multiplier: number;
  } | null;
  onClose: () => void;
}

const VortexResultPopup: React.FC<VortexResultPopupProps> = ({ result, onClose }) => {
  React.useEffect(() => {
    if (result) {
      if (result.win) playSound('win_popup');
      else playSound('loss_popup');
      
      // Auto close after 2 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [result, onClose]);

  if (!result || !result.win) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
          className="bg-[#1a1a1a] px-10 py-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center pointer-events-auto cursor-pointer"
          onClick={onClose}
        >
          <h2 className="text-5xl font-black text-white italic tracking-tighter mb-1">
            {result.multiplier.toFixed(2)}X
          </h2>
          <p className="text-lg font-bold text-slate-400 font-mono">
            {result.amount.toFixed(2)}
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default VortexResultPopup;
