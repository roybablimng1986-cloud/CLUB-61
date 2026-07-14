import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy } from 'lucide-react';
import { playSound } from '../services/supabaseService';

interface DogRoadResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    lane: number;
    multiplier: number;
  } | null;
  onClose: () => void;
}

const DogRoadResultPopup: React.FC<DogRoadResultPopupProps> = ({ result, onClose }) => {
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
          className={`w-full max-w-sm rounded-[3rem] overflow-hidden border-2 shadow-[0_0_100px_rgba(0,0,0,0.5)] ${result.win ? 'bg-[#0a1a1a] border-yellow-500/30 shadow-yellow-950/20' : 'bg-[#1a1a1a] border-red-500/30 shadow-red-950/20'}`}
        >
          <div className={`p-8 text-center relative ${result.win ? 'bg-gradient-to-b from-yellow-500/20 to-transparent' : 'bg-gradient-to-b from-red-500/20 to-transparent'}`}>
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <X size={20} className="text-white/50" />
            </button>

            {/* Prominent Dog Character Display instead of Chicken */}
            <div className="mb-6 inline-flex p-6 rounded-full bg-black/40 border border-white/10 relative">
              {result.win ? (
                <div className="relative">
                  <img src="https://cdn-icons-png.flaticon.com/512/616/616554.png" alt="Dog Winner" className="w-20 h-20 object-contain animate-bounce" />
                  <Trophy size={24} className="text-yellow-500 absolute -bottom-1 -right-1" />
                </div>
              ) : (
                <div className="relative">
                  <img src="https://cdn-icons-png.flaticon.com/512/616/616554.png" alt="Dog Crash" className="w-20 h-20 object-contain filter grayscale opacity-70" />
                  <div className="text-3xl absolute -bottom-1 -right-1">💥</div>
                </div>
              )}
            </div>

            <h2 className={`text-4xl font-black italic tracking-tighter uppercase mb-2 ${result.win ? 'text-yellow-500' : 'text-red-500'}`}>
              {result.win ? 'LEGENDARY SPRINT!' : 'CAUGHT!'}
            </h2>

            <div className="space-y-4 mb-8">
                <div className="bg-black/30 p-6 rounded-3xl border border-white/5">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-4">Sprint Progress</p>
                    <div className="flex flex-col items-center">
                        <p className={`text-5xl font-black italic tracking-tighter ${result.win ? 'text-yellow-500' : 'text-white/40'}`}>
                            {result.multiplier.toFixed(2)}x
                        </p>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-2">Lane {result.lane + 1}</p>
                    </div>
                </div>
            </div>

            <div className={`p-6 rounded-[2rem] border-2 mb-8 ${result.win ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">
                {result.win ? 'Total Profit' : 'Total Loss'}
              </p>
              <h3 className={`text-4xl font-black italic ${result.win ? 'text-yellow-500' : 'text-white/20'}`}>
                {result.win ? `+₹${result.amount.toFixed(2)}` : `-₹${result.amount.toFixed(2)}`}
              </h3>
            </div>

            <button 
              onClick={onClose}
              className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.4em] text-sm shadow-2xl active:scale-95 transition-all ${result.win ? 'bg-yellow-600 text-black' : 'bg-white/10 text-white border border-white/10'}`}
            >
              CONTINUE SPRINT
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DogRoadResultPopup;
