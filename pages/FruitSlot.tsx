
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, RotateCw, HelpCircle, X } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

const FRUITS = ['🍎', '🍓', '🍋', '🍉', '🍇', '🍒', '🍊'];

const FruitSlot: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState(['🍎', '🍎', '🍎']);
  const [spinning, setSpinning] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [floating, setFloating] = useState<{ text: string; color: string; id: number } | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const triggerFloating = (text: string, color: string) => {
      setFloating({ text, color, id: Date.now() });
      // Increased to 3 seconds as requested
      setTimeout(() => setFloating(null), 3000);
  };

  const spin = () => {
    if (spinning || userBalance < bet) return;
    updateBalance(-bet, 'BET', 'Fruit Slots');
    setSpinning(true);
    // FIX: Changed invalid sound name 'spin' to 'slot_reel'
    playSound('slot_reel');

    let count = 0;
    const interval = setInterval(() => {
        setReels([
            FRUITS[Math.floor(Math.random() * FRUITS.length)],
            FRUITS[Math.floor(Math.random() * FRUITS.length)],
            FRUITS[Math.floor(Math.random() * FRUITS.length)]
        ]);
        count++;
        if (count > 25) {
            clearInterval(interval);
            finalize();
        }
    }, 80);
  };

  const finalize = () => {
    if (!isMounted.current) return;
    const outcome = [
        FRUITS[Math.floor(Math.random() * FRUITS.length)],
        FRUITS[Math.floor(Math.random() * FRUITS.length)],
        FRUITS[Math.floor(Math.random() * FRUITS.length)]
    ];
    setReels(outcome);
    setSpinning(false);

    const isMatch3 = outcome[0] === outcome[1] && outcome[1] === outcome[2];
    const isMatch2 = outcome[0] === outcome[1] || outcome[1] === outcome[2] || outcome[0] === outcome[2];
    
    let mult = 0;
    if (isMatch3) mult = 25;
    else if (isMatch2) mult = 2.5;

    if (mult > 0) {
        const win = bet * mult;
        updateBalance(win, 'WIN', 'Fruit Slot Win');
        playSound('win');
        triggerFloating(`+₹${win.toFixed(2)}`, 'text-green-400');
    } else {
        playSound('loss');
        triggerFloating(`-₹${bet.toFixed(2)}`, 'text-red-500');
    }
  };

  return (
    <div className="bg-[#1e0a11] min-h-screen flex flex-col font-sans text-white relative overflow-hidden">
        {floating && (
            <div key={floating.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-[100] font-black text-5xl italic pointer-events-none animate-float-up ${floating.color}`} style={{ textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
                {floating.text}
            </div>
        )}

        <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/5">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={20}/></button>
                <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-pink-500/20 shadow-inner">
                    <Wallet size={14} className="text-pink-500" />
                    <span className="text-sm font-black font-mono text-pink-500">₹{userBalance.toFixed(2)}</span>
                </div>
            </div>
            <h1 className="text-sm font-black text-pink-500 italic uppercase">FRUIT PARTY</h1>
            <button onClick={() => setShowRules(true)} className="p-2 bg-pink-500/20 text-pink-400 rounded-xl"><HelpCircle size={20}/></button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm bg-gradient-to-b from-pink-900 to-pink-950 p-6 rounded-[2.5rem] border-[8px] border-pink-700 shadow-[0_0_50px_rgba(236,72,153,0.3)]">
                 <div className="bg-black/60 p-4 rounded-[2rem] flex justify-between gap-2">
                    {reels.map((r, i) => (
                        <div key={i} className={`flex-1 h-32 bg-white rounded-2xl flex items-center justify-center text-4xl shadow-inner ${spinning ? 'animate-slot-spin blur-[2px]' : 'animate-in zoom-in'}`}>
                            {r}
                        </div>
                    ))}
                 </div>
            </div>
            
            <button onClick={spin} disabled={spinning} className="mt-14 w-full max-w-xs py-6 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all border-t-2 border-white/20">
                {spinning ? 'SPINNING...' : `STAKE ₹${bet}`}
            </button>
            <div className="mt-6 flex gap-2">
                {[10, 50, 100, 500].map(a => <button key={a} onClick={() => setBet(a)} className={`px-5 py-2 rounded-xl font-black text-xs transition-all ${bet === a ? 'bg-pink-500 shadow-lg scale-105' : 'bg-slate-800 opacity-60'}`}>₹{a}</button>)}
            </div>
        </div>

        {showRules && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <div className="bg-slate-900 border-2 border-pink-500/30 w-full max-w-sm p-8 rounded-[2.5rem] animate-in slide-in-from-bottom">
                     <div className="flex justify-between items-center mb-8">
                         <h2 className="text-2xl font-black text-pink-500 italic uppercase">PAYTABLE</h2>
                         <button onClick={() => setShowRules(false)} className="p-2 bg-slate-800 rounded-full"><X/></button>
                     </div>
                     <div className="space-y-4">
                         <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                             <div className="flex gap-2 text-2xl">🍎🍎🍎</div>
                             <div className="text-xl font-black text-yellow-500">25X</div>
                         </div>
                         <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                             <div className="flex gap-2 text-2xl">🍎🍎?</div>
                             <div className="text-xl font-black text-pink-500">2.5X</div>
                         </div>
                     </div>
                </div>
            </div>
        )}
        <style>{`
            @keyframes slot-spin {
                0% { transform: translateY(0); }
                25% { transform: translateY(-10px); }
                50% { transform: translateY(0); }
                75% { transform: translateY(10px); }
                100% { transform: translateY(0); }
            }
            .animate-slot-spin { animation: slot-spin 0.15s infinite linear; }
            @keyframes float-up {
                0% { transform: translate(-50%, 0); opacity: 0; scale: 0.5; }
                15% { opacity: 1; scale: 1.2; }
                85% { opacity: 1; scale: 1.2; }
                100% { transform: translate(-50%, -200px); opacity: 0; scale: 1.5; }
            }
            .animate-float-up { animation: float-up 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        `}</style>
    </div>
  );
};

export default FruitSlot;
