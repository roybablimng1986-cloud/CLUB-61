
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, AlertCircle } from 'lucide-react';
import { playSound } from '../services/supabaseService';

interface WinGoResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    period: string;
    number: number;
    bigSmall: string;
    color: string;
    target: string;
  } | null;
  onClose: () => void;
}

const WinGoResultPopup: React.FC<WinGoResultPopupProps> = ({ result, onClose }) => {
  React.useEffect(() => {
    if (result) {
      if (result.win) playSound('win_popup');
      else playSound('loss_popup');
    }
  }, [result]);

  if (!result) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0, y: 100 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 100 }}
          className={`w-full max-w-sm rounded-[3rem] overflow-hidden border-2 shadow-[0_0_80px_rgba(0,0,0,0.5)] ${result.win ? 'bg-[#1a2e1a] border-green-500/30' : 'bg-[#2e1a1a] border-red-500/30'}`}
        >
          <div className={`p-8 text-center relative ${result.win ? 'bg-gradient-to-b from-green-500/20 to-transparent' : 'bg-gradient-to-b from-red-500/20 to-transparent'}`}>
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/20 rounded-full hover:bg-black/40 transition-colors">
              <X size={20} className="text-white/50" />
            </button>

            <div className="mb-6 inline-flex p-5 rounded-full bg-black/20 border border-white/10">
              {result.win ? (
                <Trophy size={48} className="text-yellow-500 animate-bounce" />
              ) : (
                <AlertCircle size={48} className="text-red-500 animate-pulse" />
              )}
            </div>

            <h2 className={`text-4xl font-black italic tracking-tighter uppercase mb-2 ${result.win ? 'text-green-500' : 'text-red-500'}`}>
              {result.win ? 'YOU WON!' : 'BET SETTLED'}
            </h2>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-8">Period: {result.period}</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-black/40 p-5 rounded-[2rem] border border-white/10 shadow-inner">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">Your Stake</p>
                <p className="text-xl font-black text-white italic uppercase tracking-tighter">{result.target}</p>
              </div>
              <div className="bg-black/40 p-5 rounded-[2rem] border border-white/10 shadow-inner">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">Outcome</p>
                <div className="flex items-center justify-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg border-2 border-white/20 ${result.color === 'Green' ? 'bg-green-500' : result.color === 'Red' ? 'bg-red-500' : 'bg-purple-500'}`}>
                    {result.number}
                  </span>
                  <span className="text-xl font-black text-white italic uppercase tracking-tighter">{result.bigSmall}</span>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-[2rem] border-2 mb-8 ${result.win ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">
                {result.win ? 'Winning Amount' : 'Better Luck Next Time'}
              </p>
              <h3 className={`text-4xl font-black italic ${result.win ? 'text-yellow-500' : 'text-white/20'}`}>
                {result.win ? `+₹${result.amount.toFixed(2)}` : `-₹${result.amount.toFixed(2)}`}
              </h3>
            </div>

            <button 
              onClick={onClose}
              className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.3em] text-sm shadow-2xl active:scale-95 transition-all ${result.win ? 'bg-green-500 text-black' : 'bg-white/10 text-white border border-white/10'}`}
            >
              CLOSE ARENA
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WinGoResultPopup;
