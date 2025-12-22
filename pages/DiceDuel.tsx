
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, RotateCw, History, HelpCircle, X } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

const DiceDuel: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [target, setTarget] = useState<'BIG' | 'SMALL' | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [dice, setDice] = useState([1, 1]);
  const [history, setHistory] = useState<number[]>([]);
  const [floating, setFloating] = useState<{ text: string; color: string; id: number } | null>(null);
  const [showRules, setShowRules] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const triggerFloating = (text: string, color: string) => {
      setFloating({ text, color, id: Date.now() });
      setTimeout(() => setFloating(null), 3000);
  };

  const roll = () => {
    if (isRolling || !target || userBalance < bet) return;
    
    updateBalance(-bet, 'BET', 'Dice Duel');
    setIsRolling(true);
    playSound('spin');

    let count = 0;
    const interval = setInterval(() => {
        setDice([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
        count++;
        if (count > 15) {
            clearInterval(interval);
            if (isMounted.current) finalize();
        }
    }, 80);
  };

  const finalize = () => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const sum = d1 + d2;
    setDice([d1, d2]);
    setIsRolling(false);

    const outcome = sum >= 7 ? 'BIG' : 'SMALL';
    const isWin = target === outcome;
    const winAmt = isWin ? bet * 1.95 : 0;

    if (isWin) {
        updateBalance(winAmt, 'WIN', 'Dice Win');
        playSound('win');
        triggerFloating(`+₹${winAmt.toFixed(2)}`, 'text-green-400');
    } else {
        playSound('loss');
        triggerFloating(`-₹${bet.toFixed(2)}`, 'text-red-500');
    }

    setHistory(prev => [sum, ...prev].slice(0, 10));
    onResult({ 
        win: isWin, 
        amount: isWin ? winAmt : bet, 
        game: 'Dice Duel', 
        resultDetails: [{label: 'Sum', value: sum.toString(), color: isWin ? 'text-green-400' : 'text-red-400'}] 
    });
    addGameHistory('Dice Duel', bet, winAmt, `Bet ${target} | Sum ${sum}`);
    setTarget(null);
  };

  return (
    <div className="bg-[#0f172a] min-h-screen flex flex-col font-sans text-white relative overflow-hidden">
        {floating && (
            <div key={floating.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-[100] font-black text-5xl italic pointer-events-none animate-float-up ${floating.color}`} style={{ textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
                {floating.text}
            </div>
        )}

        <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/5 shadow-2xl relative z-50">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90 transition-all"><ArrowLeft size={20}/></button>
                <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 shadow-inner">
                    <Wallet size={14} className="text-yellow-500" />
                    <span className="text-sm font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
                </div>
            </div>
            <h1 className="text-sm font-black gold-text italic tracking-widest uppercase">DICE DUEL</h1>
            <button onClick={() => setShowRules(true)} className="p-2 bg-slate-800 rounded-xl active:scale-90 transition-all"><HelpCircle size={20}/></button>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <div className="flex gap-6 mb-16 relative">
                {dice.map((v, i) => (
                    <div key={i} className={`w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center text-6xl text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-b-[10px] border-slate-300 transition-all duration-300 ${isRolling ? 'animate-bounce rotate-12 scale-90' : 'rotate-0'}`}>
                        {v}
                    </div>
                ))}
            </div>
            
            <div className="grid grid-cols-2 gap-6 w-full max-w-sm mb-8">
                <button 
                  onClick={() => !isRolling && setTarget('SMALL')} 
                  className={`py-8 rounded-3xl font-black text-2xl border-b-[8px] transition-all active:scale-95 ${target === 'SMALL' ? 'bg-blue-600 border-blue-800 scale-105 shadow-[0_0_30px_rgba(37,99,235,0.4)]' : 'bg-slate-800 border-slate-900 opacity-60'}`}
                >
                    SMALL
                    <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">(Sum 2-6)</p>
                </button>
                <button 
                  onClick={() => !isRolling && setTarget('BIG')} 
                  className={`py-8 rounded-3xl font-black text-2xl border-b-[8px] transition-all active:scale-95 ${target === 'BIG' ? 'bg-orange-600 border-orange-800 scale-105 shadow-[0_0_30px_rgba(234,88,12,0.4)]' : 'bg-slate-800 border-slate-900 opacity-60'}`}
                >
                    BIG
                    <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">(Sum 7-12)</p>
                </button>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar py-4 w-full justify-center">
                {history.map((h, i) => (
                    <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border border-white/10 ${h >= 7 ? 'bg-orange-500' : 'bg-blue-500'}`}>{h}</span>
                ))}
            </div>
        </div>

        <div className="bg-[#111] p-6 pb-12 border-t border-white/5 shadow-2xl">
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
                {[10, 50, 100, 500, 1000, 5000].map(a => (
                    <button key={a} onClick={() => !isRolling && setBet(a)} className={`flex-shrink-0 px-6 py-3 rounded-2xl font-black text-sm border transition-all ${bet === a ? 'bg-yellow-500 text-black border-white shadow-lg' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}>₹{a >= 1000 ? (a/1000)+'K' : a}</button>
                ))}
            </div>
            <button 
                onClick={roll} 
                disabled={!target || isRolling} 
                className={`w-full py-6 rounded-[2.5rem] font-black text-2xl uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-t-2 border-white/10 ${!target || isRolling ? 'bg-zinc-800 text-zinc-600' : 'bg-gradient-to-r from-red-600 to-orange-600 text-white'}`}
            >
                {isRolling ? 'ROLLING...' : 'ROLL DICE'}
            </button>
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
