
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, RotateCw, Trophy, History } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

interface Props {
  onBack: () => void;
  userBalance: number;
  onResult: (r: GameResult) => void;
}

const SYMBOLS = ['💎', '🎰', '🔔', '🍒', '🍋', '🍇', '7️⃣'];

const SlotMachine: React.FC<Props> = ({ onBack, userBalance, onResult }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState<string[]>(['💎', '7️⃣', '💎']);
  const [history, setHistory] = useState<string[]>([]);
  const [floating, setFloating] = useState<{ text: string; color: string; id: number } | null>(null);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopAllSounds();
    };
  }, []);

  const triggerFloating = (text: string, color: string) => {
      setFloating({ text, color, id: Date.now() });
      setTimeout(() => setFloating(null), 1500);
  };

  const spin = async () => {
    if (isSpinning || userBalance < betAmount) return;

    setIsSpinning(true);
    // FIX: Changed invalid sound name 'spin' to 'slot_reel'
    playSound('slot_reel');
    updateBalance(-betAmount, 'BET', 'Slot Machine Spin');

    let count = 0;
    const maxCycles = 25;
    const interval = setInterval(() => {
        setReels([
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        ]);
        count++;
        if (count > maxCycles) {
            clearInterval(interval);
            finalizeSpin();
        }
    }, 80);
  };

  const finalizeSpin = () => {
    if (!isMounted.current) return;
    
    const outcome = [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    ];

    setReels(outcome);
    setIsSpinning(false);

    const isJackpot = outcome[0] === outcome[1] && outcome[1] === outcome[2];
    const isPair = outcome[0] === outcome[1] || outcome[1] === outcome[2] || outcome[0] === outcome[2];

    let multiplier = 0;
    if (isJackpot) multiplier = outcome[0] === '7️⃣' ? 50 : 20;
    else if (isPair) multiplier = 2;

    const winAmount = betAmount * multiplier;
    
    if (winAmount > 0) {
        updateBalance(winAmount, 'WIN', 'Slot Machine Win');
        playSound('win');
        triggerFloating(`+₹${winAmount.toFixed(2)}`, 'text-yellow-400');
    } else {
        playSound('loss');
        triggerFloating(`-₹${betAmount.toFixed(2)}`, 'text-red-500');
    }

    setHistory(prev => [outcome.join(''), ...prev].slice(0, 5));
    addGameHistory('Slot Machine', betAmount, winAmount, `Landed ${outcome.join(' ')}`);
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen flex flex-col font-sans text-white relative overflow-hidden select-none">
      {floating && (
          <div key={floating.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-[100] font-black text-5xl italic pointer-events-none animate-float-up ${floating.color}`} style={{ textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
              {floating.text}
          </div>
      )}

      <div className="p-4 flex justify-between items-center bg-black/60 backdrop-blur-xl border-b border-white/5 z-50">
        <button onClick={onBack} className="p-2.5 bg-zinc-900 rounded-2xl border border-white/10 active:scale-90 transition-all"><ArrowLeft size={20}/></button>
        <div className="text-center">
            <h1 className="text-xl font-black italic gold-text tracking-widest uppercase">ROYAL SLOTS</h1>
        </div>
        <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 shadow-inner">
          <Wallet size={14} className="text-yellow-500" />
          <span className="text-sm font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-gradient-to-b from-zinc-800 to-zinc-950 p-6 rounded-[2.5rem] border-[8px] border-zinc-800 shadow-[0_0_80px_rgba(0,0,0,1)] relative overflow-hidden">
             <div className="bg-[#111] p-4 rounded-[2.5rem] flex justify-between gap-3 border-4 border-zinc-800 shadow-inner mt-4">
                {reels.map((symbol, i) => (
                    <div key={i} className={`flex-1 h-36 bg-zinc-50 rounded-3xl flex items-center justify-center text-5xl shadow-2xl transition-transform ${isSpinning ? 'scale-95 opacity-50' : 'animate-in zoom-in'}`}>
                        {symbol}
                    </div>
                ))}
             </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] p-6 pb-12 border-t border-white/5 shadow-[0_-20px_60px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center mb-8 px-2">
              <div className="flex gap-2">
                  {[10, 50, 100, 500].map(amt => (
                      <button key={amt} onClick={() => !isSpinning && setBetAmount(amt)} className={`w-14 h-11 rounded-2xl font-black text-xs border transition-all ${betAmount === amt ? 'bg-yellow-500 text-black border-white shadow-lg' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}>₹{amt}</button>
                  ))}
              </div>
              <p className="text-2xl font-black text-white italic">₹{betAmount}</p>
          </div>
          <button onClick={spin} disabled={isSpinning} className={`w-full py-6 rounded-[2.5rem] font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 text-xl border-t-2 border-white/10 ${isSpinning ? 'bg-zinc-800 text-zinc-500 opacity-50' : 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-red-900/40'}`}>
            <RotateCw size={28} className={isSpinning ? 'animate-spin' : ''} />
            {isSpinning ? 'SPINNING' : 'SPIN REELS'}
          </button>
      </div>

      <style>{`
        .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        @keyframes float-up {
            0% { transform: translate(-50%, 0); opacity: 0; scale: 0.5; }
            20% { opacity: 1; scale: 1.2; }
            100% { transform: translate(-50%, -150px); opacity: 0; scale: 1.5; }
        }
        .animate-float-up { animation: float-up 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
    </div>
  );
};

export default SlotMachine;
