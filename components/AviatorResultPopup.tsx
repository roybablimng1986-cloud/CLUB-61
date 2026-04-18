
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, AlertCircle, Plane } from 'lucide-react';
import { playSound } from '../services/supabaseService';

interface AviatorResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    multiplier: number;
    game: string;
  } | null;
  onClose: () => void;
}

const AviatorResultPopup: React.FC<AviatorResultPopupProps> = ({ result, onClose }) => {
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
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
          className={`w-full max-w-sm rounded-[2.5rem] overflow-hidden border-2 shadow-[0_0_100px_rgba(226,27,34,0.3)] ${result.win ? 'bg-[#1a2e1a] border-green-500/30' : 'bg-[#1a1a1a] border-red-500/30'}`}
        >
          <div className={`p-8 text-center relative ${result.win ? 'bg-gradient-to-b from-green-500/20 to-transparent' : 'bg-gradient-to-b from-red-500/20 to-transparent'}`}>
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <X size={20} className="text-white/50" />
            </button>

            <div className="mb-6 inline-flex p-6 rounded-full bg-black/40 border border-white/10 relative">
              {result.win ? (
                <Trophy size={48} className="text-yellow-500 animate-bounce" />
              ) : (
                <Plane size={48} className="text-red-500 -rotate-45 animate-pulse" />
              )}
              <div className="absolute inset-0 bg-white/5 rounded-full blur-xl animate-pulse"></div>
            </div>

            <h2 className={`text-4xl font-black italic tracking-tighter uppercase mb-2 ${result.win ? 'text-green-500' : 'text-red-500'}`}>
              {result.win ? 'HUGE WIN!' : 'FLEW AWAY'}
            </h2>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-8">Official Aviator Result</p>

            <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 mb-8">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Multiplier Reached</p>
              <h3 className={`text-5xl font-black italic tracking-tighter ${result.win ? 'text-green-500' : 'text-red-500'}`}>
                {result.multiplier.toFixed(2)}x
              </h3>
            </div>

            <div className={`p-6 rounded-[2rem] border-2 mb-8 ${result.win ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">
                {result.win ? 'Total Payout' : 'Stake Lost'}
              </p>
              <h3 className={`text-4xl font-black italic ${result.win ? 'text-yellow-500' : 'text-white/20'}`}>
                {result.win ? `+₹${result.amount.toFixed(2)}` : `-₹${result.amount.toFixed(2)}`}
              </h3>
            </div>

            <button 
              onClick={onClose}
              className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.4em] text-sm shadow-2xl active:scale-95 transition-all ${result.win ? 'bg-green-600 text-white shadow-green-900/40' : 'bg-white/10 text-white border border-white/10'}`}
            >
              NEXT FLIGHT
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AviatorResultPopup;
