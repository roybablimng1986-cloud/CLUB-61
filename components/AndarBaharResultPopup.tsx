
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, AlertCircle, Swords } from 'lucide-react';
import { playSound } from '../services/supabaseService';

interface AndarBaharResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    period: string;
    winner: string;
    joker: any;
    andarCards: any[];
    baharCards: any[];
    target: string;
  } | null;
  onClose: () => void;
}

const AndarBaharResultPopup: React.FC<AndarBaharResultPopupProps> = ({ result, onClose }) => {
  React.useEffect(() => {
    if (result) {
      if (result.win) playSound('win_popup');
      else playSound('loss_popup');
    }
  }, [result]);

  if (!result) return null;

  const isWinnerAndar = result.winner === 'ANDAR';
  const isWinnerBahar = result.winner === 'BAHAR';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          className="w-full max-w-sm rounded-[2.5rem] bg-stone-100 text-zinc-900 border-[8px] border-yellow-500 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col p-6 items-center"
        >
          {/* Light suit watermark in background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
            <span className="text-[250px] font-black">{result.win ? '♥' : '♠'}</span>
          </div>

          {/* Corner Indices - Top Left */}
          <div className={`absolute top-4 left-4 flex flex-col items-center leading-none font-black text-xl select-none ${result.win ? 'text-red-600' : 'text-stone-800'}`}>
            <span>{result.win ? 'W' : 'L'}</span>
            <span className="text-2xl mt-0.5">{result.win ? '♥' : '♠'}</span>
          </div>

          {/* Corner Indices - Bottom Right (Rotated) */}
          <div className={`absolute bottom-4 right-4 flex flex-col items-center leading-none font-black text-xl select-none rotate-180 ${result.win ? 'text-red-600' : 'text-stone-800'}`}>
            <span>{result.win ? 'W' : 'L'}</span>
            <span className="text-2xl mt-0.5">{result.win ? '♥' : '♠'}</span>
          </div>

          <div className="w-full text-center relative z-10 flex flex-col items-center">
            {/* Close Button */}
            <button onClick={onClose} className="absolute -top-1 -right-1 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors">
              <X size={20} className="text-stone-600" />
            </button>

            {/* Emblem */}
            <div className={`mt-4 mb-4 p-4 rounded-full bg-stone-200/50 border border-stone-300 shadow-inner flex items-center justify-center`}>
              {result.win ? (
                <Trophy size={38} className="text-yellow-600 animate-bounce" />
              ) : (
                <Swords size={38} className="text-stone-800 animate-pulse" />
              )}
            </div>

            {/* Title */}
            <h2 className={`text-3xl font-black italic tracking-tighter uppercase leading-none mb-1 ${result.win ? 'text-red-600' : 'text-stone-900'}`}>
              {result.win ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            <p className="text-[8px] font-bold text-stone-500 uppercase tracking-[0.3em] mb-4">Period: {result.period}</p>

            {/* Inner Battle Cards */}
            <div className="w-full bg-stone-200/60 border border-stone-300 rounded-[2rem] p-4 shadow-sm mb-4">
              <p className="text-[8px] font-black text-stone-500 uppercase tracking-[0.2em] mb-3">ROUND REVEAL</p>
              <div className="grid grid-cols-2 gap-3 items-center justify-center relative">
                
                {/* ANDAR Card */}
                <div className={`flex flex-col items-center p-2 rounded-xl bg-white border-2 ${isWinnerAndar ? 'border-yellow-500 shadow-md scale-105' : 'border-stone-200 opacity-65'}`}>
                  <span className="text-[9px] font-black text-red-600 uppercase tracking-wider mb-1">Andar</span>
                  {result.andarCards && result.andarCards[0] ? (
                    <div className="w-12 h-18 bg-stone-50 rounded-lg flex flex-col items-center justify-center border border-stone-300 relative overflow-hidden">
                      <div className={`absolute top-0.5 left-1 font-black text-[10px] ${['♥','♦'].includes(result.andarCards[0].suit) ? 'text-red-600' : 'text-stone-900'}`}>{result.andarCards[0].rank}</div>
                      <div className={`text-lg mt-1 ${['♥','♦'].includes(result.andarCards[0].suit) ? 'text-red-600' : 'text-stone-900'}`}>{result.andarCards[0].suit}</div>
                      <div className={`absolute bottom-0.5 right-1 font-black text-[10px] rotate-180 ${['♥','♦'].includes(result.andarCards[0].suit) ? 'text-red-600' : 'text-stone-900'}`}>{result.andarCards[0].rank}</div>
                    </div>
                  ) : (
                    <div className="w-12 h-18 bg-stone-200 border border-dashed border-stone-300 rounded-lg" />
                  )}
                </div>

                {/* VS Divider */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-stone-100 z-20">
                  VS
                </div>

                {/* BAHAR Card */}
                <div className={`flex flex-col items-center p-2 rounded-xl bg-white border-2 ${isWinnerBahar ? 'border-yellow-500 shadow-md scale-105' : 'border-stone-200 opacity-65'}`}>
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider mb-1">Bahar</span>
                  {result.baharCards && result.baharCards[0] ? (
                    <div className="w-12 h-18 bg-stone-50 rounded-lg flex flex-col items-center justify-center border border-stone-300 relative overflow-hidden">
                      <div className={`absolute top-0.5 left-1 font-black text-[10px] ${['♥','♦'].includes(result.baharCards[0].suit) ? 'text-red-600' : 'text-stone-900'}`}>{result.baharCards[0].rank}</div>
                      <div className={`text-lg mt-1 ${['♥','♦'].includes(result.baharCards[0].suit) ? 'text-red-600' : 'text-stone-900'}`}>{result.baharCards[0].suit}</div>
                      <div className={`absolute bottom-0.5 right-1 font-black text-[10px] rotate-180 ${['♥','♦'].includes(result.baharCards[0].suit) ? 'text-red-600' : 'text-stone-900'}`}>{result.baharCards[0].rank}</div>
                    </div>
                  ) : (
                    <div className="w-12 h-18 bg-stone-200 border border-dashed border-stone-300 rounded-lg" />
                  )}
                </div>

              </div>
            </div>

            {/* Winning details */}
            <div className="w-full bg-stone-200/40 p-3 rounded-2xl border border-stone-300 text-center mb-4">
              <p className="text-[8px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Winning Side</p>
              <p className={`text-xl font-black italic uppercase tracking-tighter ${result.winner === 'ANDAR' ? 'text-red-600' : result.winner === 'TIE' ? 'text-orange-500' : 'text-blue-600'}`}>
                {result.winner} {result.winner === 'TIE' && '(EQUAL)'}
              </p>
            </div>

            {/* Profit and Loss Box */}
            <div className={`w-full p-4 rounded-2xl border mb-5 flex flex-col items-center ${result.win ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest mb-0.5">
                {result.win ? 'Total Profit' : 'Total Loss'}
              </p>
              <h3 className={`text-3xl font-black italic ${result.win ? 'text-emerald-600' : 'text-red-600'}`}>
                {result.win ? `+₹${result.amount.toFixed(2)}` : `-₹${result.amount.toFixed(2)}`}
              </h3>
            </div>

            {/* Confirm Button */}
            <button 
              onClick={onClose}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-md active:scale-95 transition-all ${result.win ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/10' : 'bg-stone-800 hover:bg-stone-900 text-white shadow-stone-900/10'}`}
            >
              CONTINUE BATTLE
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AndarBaharResultPopup;
