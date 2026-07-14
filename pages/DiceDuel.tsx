import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, HelpCircle, X, Coins, Trophy } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, shouldForceLoss } from '../services/supabaseService';
import { GameResult } from '../types';
import DiceDuelResultPopup from '../components/DiceDuelResultPopup';

const DiceDuel: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [target, setTarget] = useState<'SMALL' | 'BIG' | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [dice, setDice] = useState([1, 1]);
  const [history, setHistory] = useState<number[]>([8, 4, 11, 6, 7, 5, 9, 3]);
  const [floating, setFloating] = useState<{ text: string; color: string; id: number } | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [ddResult, setDdResult] = useState<any | null>(null);

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
      setTimeout(() => setFloating(null), 3000);
  };

  const roll = async () => {
    if (isRolling || !target) return;
    if (userBalance < bet) {
      triggerFloating("Insufficient Balance", "text-red-500");
      return;
    }
    
    setIsRolling(true);
    setDdResult(null);
    playSound('dice_rattle');

    // Deduct bet from balance
    await updateBalance(-bet, 'BET', `Dice Duel: ${target}`);

    // Precalculate outcome first to guarantee perfect sync with final dice state
    let d1 = Math.floor(Math.random() * 6) + 1;
    let d2 = Math.floor(Math.random() * 6) + 1;
    let sum = d1 + d2;
    let outcome: 'SMALL' | 'BIG' = sum >= 7 ? 'BIG' : 'SMALL';

    // Respect forced loss if configured
    try {
      const forcedLoss = await shouldForceLoss(bet, userBalance, 'Dice Duel');
      if (forcedLoss) {
        let attempts = 0;
        while (outcome === target && attempts < 25) {
          d1 = Math.floor(Math.random() * 6) + 1;
          d2 = Math.floor(Math.random() * 6) + 1;
          sum = d1 + d2;
          outcome = sum >= 7 ? 'BIG' : 'SMALL';
          attempts++;
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Animate rolling dice and end exactly on precalculated values
    let count = 0;
    const interval = setInterval(() => {
        if (count < 18) {
            setDice([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
        } else {
            setDice([d1, d2]);
            clearInterval(interval);
            setTimeout(() => {
                if (isMounted.current) {
                    finalizeDuel(d1, d2, sum, outcome);
                }
            }, 600);
        }
        count++;
    }, 85);
  };

  const finalizeDuel = async (
    d1: number,
    d2: number,
    sum: number,
    outcome: 'SMALL' | 'BIG'
  ) => {
    setIsRolling(false);
    playSound('dice_roll');

    const didWin = target === outcome;
    const multiplier = 1.95;
    const winAmount = didWin ? bet * multiplier : 0;

    setHistory(prev => [sum, ...prev].slice(0, 15));

    setDdResult({
        win: didWin,
        amount: didWin ? winAmount : bet,
        dice: [d1, d2],
        sum: sum,
        target: target as string
    });

    if (didWin) {
        await updateBalance(winAmount, 'WIN', 'Dice Duel Win');
        triggerFloating(`+₹${winAmount.toFixed(1)}`, 'text-green-400');
        onResult({
            win: true,
            amount: winAmount,
            game: 'Dice Duel',
            period: Date.now().toString(),
            resultDetails: [{ label: 'Outcome', value: `${outcome} (${sum})` }, { label: 'Roll', value: `${d1} + ${d2}` }]
        });
    } else {
        triggerFloating(`-₹${bet.toFixed(1)}`, 'text-red-500');
        onResult({
            win: false,
            amount: 0,
            game: 'Dice Duel',
            period: Date.now().toString(),
            resultDetails: [{ label: 'Outcome', value: `${outcome} (${sum})` }, { label: 'Roll', value: `${d1} + ${d2}` }]
        });
    }

    addGameHistory('Dice Duel', bet, winAmount, `Bet ${target} | Sum ${sum} (${d1}+${d2})`);
    setTarget(null);
  };

  return (
    <div className="bg-[#0f172a] min-h-screen flex flex-col font-sans text-white relative overflow-hidden">
        <DiceDuelResultPopup result={ddResult} onClose={() => setDdResult(null)} />
        
        {floating && (
            <div key={floating.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-[100] font-black text-5xl italic pointer-events-none animate-float-up ${floating.color}`} style={{ textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
                {floating.text}
            </div>
        )}

        {/* Top Header */}
        <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/5 shadow-2xl relative z-50">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90 transition-all"><ArrowLeft size={20}/></button>
                <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 shadow-inner">
                    <Wallet size={14} className="text-yellow-500" />
                    <span className="text-sm font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
                </div>
            </div>
            <div className="flex flex-col items-center">
                <h1 className="text-sm font-black gold-text italic tracking-widest uppercase">DICE DUEL</h1>
                <p className="text-[10px] font-black font-mono tracking-widest mt-0.5 text-green-400">
                    {isRolling ? 'ROLLING...' : 'BIG OR SMALL'}
                </p>
            </div>
            <button onClick={() => setShowRules(true)} className="p-2 bg-slate-800 rounded-xl active:scale-90 transition-all"><HelpCircle size={20}/></button>
        </div>
        
        {/* Arena Stage */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <div className="flex gap-6 mb-16 relative">
                {dice.map((v, i) => (
                    <div 
                      key={i} 
                      className={`w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center text-6xl text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-b-[10px] border-slate-300 transition-all duration-300 ${isRolling ? 'animate-bounce rotate-12 scale-90' : 'rotate-0'}`}
                    >
                        {v}
                    </div>
                ))}
            </div>
            
            {/* Betting Slots Grid */}
            <div className="grid grid-cols-2 gap-6 w-full max-w-sm mb-8">
                {/* Small Button */}
                <button 
                  onClick={() => !isRolling && setTarget('SMALL')} 
                  className={`py-8 rounded-3xl font-black text-2xl border-b-[8px] transition-all active:scale-95 flex flex-col items-center justify-center ${target === 'SMALL' ? 'bg-blue-600 border-blue-800 scale-105 shadow-[0_0_30px_rgba(37,99,235,0.4)]' : 'bg-slate-800 border-slate-900 opacity-60'}`}
                >
                    SMALL
                    <span className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">(Sum 2-6)</span>
                </button>

                {/* Big Button */}
                <button 
                  onClick={() => !isRolling && setTarget('BIG')} 
                  className={`py-8 rounded-3xl font-black text-2xl border-b-[8px] transition-all active:scale-95 flex flex-col items-center justify-center ${target === 'BIG' ? 'bg-orange-600 border-orange-800 scale-105 shadow-[0_0_30px_rgba(234,88,12,0.4)]' : 'bg-slate-800 border-slate-900 opacity-60'}`}
                >
                    BIG
                    <span className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">(Sum 7-12)</span>
                </button>
            </div>

            {/* Duel History */}
            <div className="w-full max-w-sm bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5 mb-4">
                <div className="flex justify-between items-center mb-3 px-1">
                    <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Duel History (Last 15)</span>
                    <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">LIVE STATS</span>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 w-full px-1 justify-start">
                    {history.map((h, i) => (
                        <span 
                          key={i} 
                          className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black border border-white/10 ${h >= 7 ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}
                        >
                            {h}
                        </span>
                    ))}
                </div>
            </div>
        </div>

        {/* Bottom Controls */}
        <div className="bg-[#111] p-6 pb-12 border-t border-white/5 shadow-2xl">
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
                {[10, 50, 100, 500, 1000, 5000].map(a => (
                    <button key={a} onClick={() => !isRolling && setBet(a)} className={`flex-shrink-0 px-6 py-3 rounded-2xl font-black text-sm border transition-all ${bet === a ? 'bg-yellow-500 text-black border-white shadow-lg' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}>₹{a >= 1000 ? (a/1000)+'K' : a}</button>
                ))}
            </div>
            <div className="flex gap-4">
                <button 
                    onClick={roll} 
                    disabled={!target || isRolling} 
                    className={`flex-1 py-6 rounded-[2.5rem] font-black text-2xl uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-t-2 border-white/10 flex items-center justify-center gap-2 ${!target || isRolling ? 'bg-zinc-800 text-zinc-600' : 'bg-gradient-to-r from-red-600 to-orange-600 text-white'}`}
                >
                    <Coins size={24} className="animate-bounce" />
                    {isRolling ? 'ROLLING...' : 'ROLL DICE'}
                </button>
            </div>
        </div>

        {showRules && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <div className="bg-slate-900 border border-yellow-500/30 w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl">
                     <div className="flex justify-between items-center mb-8">
                          <h2 className="text-2xl font-black italic gold-text uppercase">DICE RULES</h2>
                          <button onClick={() => setShowRules(false)} className="p-2 bg-slate-800 rounded-full"><X/></button>
                     </div>
                     <div className="space-y-4 text-sm text-slate-300 leading-relaxed font-medium">
                          <p>1. Choose either <span className="text-blue-500 font-bold">SMALL</span> or <span className="text-orange-500 font-bold">BIG</span>.</p>
                          <p>2. Two dice are rolled and their sum is calculated.</p>
                          <p>3. <span className="text-blue-500 font-bold">SMALL</span> wins if the sum is between 2 and 6.</p>
                          <p>4. <span className="text-orange-500 font-bold">BIG</span> wins if the sum is between 7 and 12.</p>
                          <p>5. A successful prediction pays <span className="text-green-500 font-bold">1.95x</span> your stake.</p>
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
                100% { transform: translate(-50%, -150px); opacity: 0; scale: 1.5; }
            }
            .animate-float-up { animation: float-up 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        `}</style>
    </div>
  );
};

export default DiceDuel;
