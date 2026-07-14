
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, AlertCircle, Dice6 } from 'lucide-react';
import { playSound } from '../services/supabaseService';

interface SevenUpDownResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    period: string;
    dice: number[];
    sum: number;
    target: string;
  } | null;
  onClose: () => void;
}

const SevenUpDownResultPopup: React.FC<SevenUpDownResultPopupProps> = ({ result, onClose }) => {
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

  const getOutcomeLabel = (sum: number) => {
    if (sum < 7) return 'DOWN (2-6)';
    if (sum > 7) return 'UP (8-12)';
    return 'SEVEN (7)';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className={`w-[320px] rounded-[2rem] overflow-hidden border-2 shadow-[0_0_40px_rgba(0,0,0,0.8)] ${
            result.win 
              ? 'bg-gradient-to-b from-[#190f24] to-[#0b0712] border-fuchsia-500/50 shadow-fuchsia-950/50' 
              : 'bg-gradient-to-b from-[#24111c] to-[#12070e] border-pink-500/50 shadow-pink-950/50'
          }`}
        >
          <div className="p-5 text-center relative">
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <X size={16} className="text-white/70" />
            </button>

            <div className="mb-3 inline-flex p-3 rounded-full bg-black/40 border border-white/10">
              {result.win ? (
                <Trophy size={36} className="text-fuchsia-400 animate-bounce" />
              ) : (
                <Dice6 size={36} className="text-pink-500 animate-pulse" />
              )}
            </div>

            <h2 className={`text-2xl font-black italic tracking-tighter uppercase mb-1 ${result.win ? 'text-fuchsia-400' : 'text-pink-500'}`}>
              {result.win ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">Period: {result.period}</p>

            <div className="space-y-3 mb-4">
              <div className="bg-black/50 p-4 rounded-2xl border border-fuchsia-500/20 shadow-inner">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-2">Dice Result</p>
                <div className="flex justify-center gap-3 mb-2">
                  {result.dice.map((d, i) => (
                    <div key={i} className="w-12 h-12 bg-gradient-to-b from-[#111] to-[#222] rounded-xl flex items-center justify-center text-xl font-black text-white border-2 border-fuchsia-500/60 shadow-[0_0_12px_rgba(217,70,239,0.3)]">
                      {d}
                    </div>
                  ))}
                </div>
                <p className="text-lg font-black italic text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-500 uppercase leading-none mt-2">Sum: {result.sum}</p>
                <p className="text-[9px] font-black text-fuchsia-400/80 uppercase tracking-widest leading-none mt-1">{getOutcomeLabel(result.sum)}</p>
              </div>

              <div className="bg-black/40 py-2 px-3 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Your Bet</span>
                <span className="text-xs font-black text-white uppercase tracking-wider">{result.target}</span>
              </div>
            </div>

            <div className={`py-3 px-4 rounded-2xl border-2 mb-4 ${result.win ? 'bg-fuchsia-500/10 border-fuchsia-500/30' : 'bg-pink-500/10 border-pink-500/30'}`}>
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-0.5">
                {result.win ? 'Winnings' : 'Total Loss'}
              </p>
              <h3 className={`text-2xl font-black italic ${result.win ? 'text-yellow-400' : 'text-white/30'}`}>
                {result.win ? `+₹${result.amount.toFixed(2)}` : `-₹${result.amount.toFixed(2)}`}
              </h3>
            </div>

            <button 
              onClick={onClose}
              className={`w-full py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg active:scale-95 transition-all ${
                result.win 
                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white shadow-fuchsia-500/20' 
                  : 'bg-white/10 text-white border border-white/10'
              }`}
            >
              CONTINUE PLAYING
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SevenUpDownResultPopup;
