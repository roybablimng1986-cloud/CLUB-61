import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Coins, Sparkles, Flame, Percent } from 'lucide-react';
import { playSound } from '../services/supabaseService';

interface HeadTailsResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    outcome: string;
    target: string;
  } | null;
  onClose: () => void;
}

const HeadTailsResultPopup: React.FC<HeadTailsResultPopupProps> = ({ result, onClose }) => {
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
          initial={{ scale: 0.9, opacity: 0, rotateX: 45 }}
          animate={{ scale: 1, opacity: 1, rotateX: 0 }}
          exit={{ scale: 0.9, opacity: 0, rotateX: -45 }}
          transition={{ type: "spring", damping: 20 }}
          className={`w-[270px] rounded-[2.5rem] p-0.5 overflow-hidden relative ${
            result.win 
              ? 'bg-gradient-to-b from-[#10b981] via-[#059669] to-[#047857] shadow-[0_0_30px_rgba(16,185,129,0.25)]' 
              : 'bg-gradient-to-b from-[#f97316] via-[#ea580c] to-[#c2410c] shadow-[0_0_30px_rgba(234,88,12,0.25)]'
          }`}
        >
          {/* Futuristic inner dark container */}
          <div className="bg-[#0b0f19]/95 rounded-[2.4rem] p-5 text-center relative overflow-hidden flex flex-col items-center">
            {/* Hologram scanlines effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_95%,rgba(255,255,255,0.05)_95%)] bg-[length:100%_8px] pointer-events-none opacity-30"></div>
            
            {/* Close Button */}
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 active:scale-90 z-50">
              <X size={14} className="text-white/40" />
            </button>
 
            {/* The Landed Coin Area - Compact */}
            <div className="relative mb-4 mt-2">
              {/* Spinning background light */}
              <div className={`absolute -inset-2 rounded-full opacity-30 blur-xl animate-pulse ${result.win ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
              
              {/* Golden metallic 3D Coin token display */}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center relative z-10 border-2 shadow-lg p-0.5 ${
                result.outcome === 'HEAD' 
                  ? 'bg-gradient-to-r from-yellow-300 via-amber-500 to-yellow-600 border-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                  : 'bg-gradient-to-r from-orange-400 via-red-500 to-orange-600 border-orange-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
              }`}>
                <div className="w-full h-full rounded-full bg-black/40 border border-white/20 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-black italic select-none drop-shadow-md ${
                    result.outcome === 'HEAD' ? 'text-yellow-400' : 'text-orange-400'
                  }`}>
                    {result.outcome === 'HEAD' ? 'H' : 'T'}
                  </span>
                  <span className="text-[7px] font-black text-white/50 tracking-widest uppercase mt-0.5">
                    {result.outcome}
                  </span>
                </div>
              </div>
            </div>
 
            {/* Text result with premium font size */}
            <h2 className={`text-2xl font-black italic tracking-tight uppercase mb-1 ${
              result.win 
                ? 'bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent drop-shadow-[0_2px_5px_rgba(16,185,129,0.3)]' 
                : 'bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent drop-shadow-[0_2px_5px_rgba(234,88,12,0.3)]'
            }`}>
              {result.win ? 'GOLD FLIP!' : 'RUST FLIP'}
            </h2>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-4">
              {result.win ? 'PREDICTED CORRECTLY' : 'COIN COLLIDED OPPOSITE'}
            </p>
 
            {/* Middle Info Panel */}
            <div className="grid grid-cols-2 gap-2 w-full mb-4">
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 text-left">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-0.5">Your Bet</span>
                <span className={`text-[10px] font-black italic ${result.target === 'HEAD' ? 'text-yellow-500' : 'text-orange-500'}`}>
                  {result.target === 'HEAD' ? 'HEADS (H)' : 'TAILS (T)'}
                </span>
              </div>
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 text-left">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-0.5">Landed</span>
                <span className={`text-[10px] font-black italic ${result.outcome === 'HEAD' ? 'text-yellow-500' : 'text-orange-500'}`}>
                  {result.outcome === 'HEAD' ? 'HEADS (H)' : 'TAILS (T)'}
                </span>
              </div>
            </div>
 
            {/* Payout Display */}
            <div className={`w-full p-3.5 rounded-2xl border mb-4 flex flex-col items-center justify-center relative overflow-hidden ${
              result.win ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-orange-500/5 border-orange-500/20'
            }`}>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                {result.win ? 'CREDITED' : 'DEBITED'}
              </span>
              <h3 className={`text-2xl font-black italic tracking-tight ${result.win ? 'text-emerald-400' : 'text-orange-500'}`}>
                {result.win ? `+₹${result.amount.toFixed(2)}` : `-₹${result.amount.toFixed(2)}`}
              </h3>
            </div>
 
            {/* Primary Action Button */}
            <button 
              onClick={onClose}
              className={`w-full py-3 rounded-2xl font-black uppercase tracking-wider text-[11px] shadow-lg active:scale-95 transition-all text-black hover:brightness-110 flex items-center justify-center gap-2 ${
                result.win 
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400' 
                  : 'bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400'
              }`}
            >
              {result.win ? <Trophy size={12} /> : <Flame size={12} />}
              {result.win ? 'CONTINUE' : 'RETRY'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default HeadTailsResultPopup;
