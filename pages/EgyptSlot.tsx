
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, RotateCw, HelpCircle, X } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

const SYMBOLS = ['🏺', '👁️', '🐈', '☥', '🪲', '🪙', '👸'];

const EgyptSlot: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState(['🏺', '🏺', '🏺']);
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
    updateBalance(-bet, 'BET', 'Egyptian Gold');
    setSpinning(true);
    playSound('spin');

    let count = 0;
    const interval = setInterval(() => {
        setReels([
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        ]);
        count++;
        if (count > 30) {
            clearInterval(interval);
            finalize();
        }
    }, 60);
  };

  const finalize = () => {
    if (!isMounted.current) return;
    const outcome = [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    ];
    setReels(outcome);
    setSpinning(false);

    const isMatch3 = outcome[0] === outcome[1] && outcome[1] === outcome[2];
    const isMatch2 = outcome[0] === outcome[1] || outcome[1] === outcome[2] || outcome[0] === outcome[2];
    
    let mult = 0;
    if (isMatch3) mult = outcome[0] === '🏺' ? 100 : 40;
    else if (isMatch2) mult = 3.0;

    if (mult > 0) {
        const win = bet * mult;
        updateBalance(win, 'WIN', 'Egyptian Win');
        playSound('win');
        triggerFloating(`+₹${win.toFixed(2)}`, 'text-yellow-400');
    } else {
        playSound('loss');
        triggerFloating(`-₹${bet.toFixed(2)}`, 'text-red-500');
    }
  };

  return (
    <div className="bg-[#1a1200] min-h-screen flex flex-col font-sans text-white relative overflow-hidden">
        {floating && (
            <div key={floating.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-[100] font-black text-5xl italic pointer-events-none animate-float-up ${floating.color}`} style={{ textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
                {floating.text}
            </div>
        )}

        <div className="p-4 flex justify-between items-center bg-black/40 border-b border-yellow-500/20">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 bg-zinc-900 rounded-xl"><ArrowLeft size={20}/></button>
                <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 shadow-inner">
                    <Wallet size={14} className="text-yellow-500" />
                    <span className="text-sm font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
                </div>
            </div>
            <h1 className="text-sm font-black gold-text italic uppercase">EGYPT GOLD</h1>
            <button onClick={() => setShowRules(true)} className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl"><HelpCircle size={20}/></button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm bg-gradient-to-b from-yellow-700 to-yellow-950 p-6 rounded-[2.5rem] border-[8px] border-yellow-600 shadow-[0_0_80px_rgba(234,179,8,0.2)]">
                 <div className="bg-[#111] p-4 rounded-[2rem] flex justify-between gap-3 shadow-inner">
                    {reels.map((r, i) => (
                        <div key={i} className={`flex-1 h-36 bg-zinc-100 rounded-2xl flex items-center justify-center text-5xl border-4 border-yellow-500/30 transition-all ${spinning ? 'scale-90 opacity-50 blur-[1px]' : 'animate-in zoom-in'}`}>
                            {r}
                        </div>
                    ))}
                 </div>
            </div>
            <div className="mt-12 w-full max-w-xs space-y-6">
                <button onClick={spin} disabled={spinning} className="w-full py-6 bg-gradient-to-r from-yellow-500 to-yellow-700 text-black font-black text-2xl rounded-3xl shadow-xl shadow-yellow-900/40 active:scale-95 transition-all border-t-2 border-white/20">
                   {spinning ? 'BLESSING REELS...' : `STAKE ₹${bet}`}
                </button>
                <div className="flex gap-2 justify-center">
                    {[10, 50, 100, 500].map(a => <button key={a} onClick={() => !spinning && setBet(a)} className={`px-5 py-2 rounded-xl font-black text-xs transition-all ${bet === a ? 'bg-yellow-600 text-black scale-105 shadow-lg' : 'bg-zinc-900 text-yellow-500/60'}`}>₹{a}</button>)}
                </div>
            </div>
        </div>

        {showRules && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
                <div className="bg-[#1a1200] border-2 border-yellow-500/30 w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl">
                     <div className="flex justify-between items-center mb-10">
                         <h2 className="text-2xl font-black gold-text italic uppercase">ANCIENT PAYOUTS</h2>
                         <button onClick={() => setShowRules(false)} className="p-2 bg-zinc-900 rounded-full"><X/></button>
                     </div>
                     <div className="space-y-4">
                         <div className="flex justify-between items-center bg-zinc-900/80 p-4 rounded-2xl border border-yellow-500/10">
                             <div className="flex gap-2 text-2xl">🏺🏺🏺</div>
                             <div className="text-2xl font-black text-yellow-400">100X</div>
                         </div>
                         <div className="flex justify-between items-center bg-zinc-900/80 p-4 rounded-2xl border border-yellow-500/10">
                             <div className="flex gap-2 text-2xl">👁️👁️👁️</div>
                             <div className="text-2xl font-black text-yellow-400">40X</div>
                         </div>
                     </div>
                </div>
            </div>
        )}
        <style>{`
            .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
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

export default EgyptSlot;
