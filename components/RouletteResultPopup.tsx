
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, AlertCircle, Target } from 'lucide-react';
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
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 50 }}
          className={`w-full max-w-sm rounded-[3rem] overflow-hidden border-2 shadow-[0_0_100px_rgba(0,0,0,0.5)] ${result.win ? 'bg-[#1a2e1a] border-green-500/30' : 'bg-[#1a1a1a] border-red-500/30'}`}
        >
          <div className={`p-8 text-center relative ${result.win ? 'bg-gradient-to-b from-green-500/20 to-transparent' : 'bg-gradient-to-b from-red-500/20 to-transparent'}`}>
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <X size={20} className="text-white/50" />
            </button>

            <div className="mb-6 inline-flex p-6 rounded-full bg-black/40 border border-white/10 relative">
              {result.win ? (
                <Trophy size={48} className="text-yellow-500 animate-bounce" />
              ) : (
                <Target size={48} className="text-red-500 animate-pulse" />
              )}
            </div>

            <h2 className={`text-4xl font-black italic tracking-tighter uppercase mb-2 ${result.win ? 'text-green-500' : 'text-red-500'}`}>
              {result.win ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-8">Period: {result.period}</p>

            <div className="space-y-4 mb-8">
                <div className="bg-black/30 p-6 rounded-3xl border border-white/5">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-4">Winning Number</p>
                    <div className="flex justify-center">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-6xl font-black italic border-4 shadow-2xl ${result.winningNumber === 0 ? 'bg-green-600 border-green-400' : result.isRed ? 'bg-red-600 border-red-400' : 'bg-zinc-900 border-zinc-700'}`}>
                            {result.winningNumber}
                        </div>
                    </div>
                    <div className="mt-4 flex justify-center gap-4">
                        <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase text-yellow-500">{result.winningNumber % 2 === 0 ? 'Even' : 'Odd'}</div>
                        <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase text-yellow-500">{result.winningNumber >= 1 && result.winningNumber <= 18 ? '1-18' : '19-36'}</div>
                    </div>
                </div>

                <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Your Bets</p>
                    <p className="text-xs font-black text-white uppercase">{result.target}</p>
                </div>
            </div>

            <div className={`p-6 rounded-[2rem] border-2 mb-8 ${result.win ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">
                {result.win ? 'Total Profit' : 'Total Loss'}
              </p>
              <h3 className={`text-4xl font-black italic ${result.win ? 'text-yellow-500' : 'text-white/20'}`}>
                {result.win ? `+₹${result.amount.toFixed(2)}` : `-₹${result.amount.toFixed(2)}`}
              </h3>
            </div>

            <button 
              onClick={onClose}
              className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.4em] text-sm shadow-2xl active:scale-95 transition-all ${result.win ? 'bg-green-600 text-white' : 'bg-white/10 text-white border border-white/10'}`}
            >
              CONTINUE PLAYING
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RouletteResultPopup;
