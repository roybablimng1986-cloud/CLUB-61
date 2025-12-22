
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Rocket, Zap, HelpCircle, X } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

const Limbo: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [targetMult, setTargetMult] = useState(2.0); 
  const [gameState, setGameState] = useState<'IDLE' | 'RISING' | 'DONE'>('IDLE');
  const [resultMult, setResultMult] = useState(1.0);
  const [history, setHistory] = useState<number[]>([]);
  const [showRules, setShowRules] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const num = parseFloat(val);
      if (val === '') {
          setTargetMult(0);
          return;
      }
      setTargetMult(num);
  };

  const startRound = () => {
    if (gameState === 'RISING' || userBalance < betAmount) return;
    
    // Ensure final target is valid before starting
    const finalTarget = Math.max(1.1, targetMult || 1.1);
    if (targetMult < 1.1) setTargetMult(1.1);

    updateBalance(-betAmount, 'BET', 'Limbo Stake');
    playSound('click');
    setGameState('RISING');

    // Provably fair generation (simulated)
    const r = Math.random();
    const outcome = Math.max(1, 0.99 / (1 - r));
    const cappedOutcome = Math.min(100000, outcome);

    let current = 1.0;
    const interval = setInterval(() => {
        if (!isMounted.current) { clearInterval(interval); return; }
        current *= 1.25;
        if (current >= cappedOutcome) {
            clearInterval(interval);
            setResultMult(cappedOutcome);
            setGameState('DONE');
            finalize(cappedOutcome, finalTarget);
        } else {
            setResultMult(current);
        }
    }, 50);
  };

  const finalize = (outcome: number, target: number) => {
    const isWin = outcome >= target;
    const winAmt = isWin ? betAmount * target : 0;
    
    if (isWin) {
        updateBalance(winAmt, 'WIN', 'Limbo Win');
        playSound('win');
    } else {
        playSound('loss');
    }

    setHistory(prev => [outcome, ...prev].slice(0, 10));
    onResult({ win: isWin, amount: isWin ? winAmt : betAmount, game: 'Limbo' });
    addGameHistory('Limbo', betAmount, winAmt, `Target ${target}x | Got ${outcome.toFixed(2)}x`);

    setTimeout(() => {
        if(isMounted.current) setGameState('IDLE');
    }, 1500);
  };

  return (
    <div className="bg-[#0f172a] min-h-screen flex flex-col font-sans text-white relative">
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/5">
        <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={20}/></button>
        <h1 className="text-xl font-black gold-text italic tracking-widest">LIMBO ARENA</h1>
        <button onClick={() => setShowRules(true)} className="p-2 bg-blue-500/20 rounded-xl text-blue-400"><HelpCircle size={20}/></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,_#1e293b_0%,_transparent_70%)]">
        <div className={`text-7xl font-black mb-8 italic tracking-tighter ${gameState === 'DONE' ? (resultMult >= targetMult ? 'text-green-500' : 'text-red-500') : 'text-white'}`}>
            {resultMult.toFixed(2)}x
        </div>
        
        <div className={`w-32 h-32 rounded-full flex items-center justify-center bg-blue-600/10 border-4 border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.2)] ${gameState === 'RISING' ? 'animate-bounce' : ''}`}>
             <Rocket size={64} className="text-blue-500 -rotate-45" />
        </div>
        
        <div className="mt-12 flex gap-2 overflow-x-auto no-scrollbar max-w-full px-4">
            {history.map((h, i) => (
                <span key={i} className={`px-4 py-1.5 rounded-full text-[10px] font-black border border-white/5 ${h >= targetMult ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>{h.toFixed(2)}x</span>
            ))}
        </div>
      </div>

      <div className="bg-[#111] p-6 border-t border-white/5 pb-12">
        <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Stake Amount</label>
                <div className="bg-black rounded-xl p-3 flex items-center gap-2 border border-white/10 shadow-inner">
                    <span className="text-yellow-500 font-bold">₹</span>
                    <input type="number" value={betAmount} onChange={e => setBetAmount(Number(e.target.value))} className="bg-transparent w-full outline-none font-bold text-lg" />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Target Payout</label>
                <div className="bg-black rounded-xl p-3 flex items-center gap-2 border border-white/10 shadow-inner">
                    <span className="text-blue-500 font-bold">x</span>
                    <input 
                        type="number" 
                        step="0.1" 
                        value={targetMult || ''} 
                        onChange={handleTargetChange} 
                        placeholder="2.0"
                        className="bg-transparent w-full outline-none font-bold text-lg" 
                    />
                </div>
            </div>
        </div>

        <button onClick={startRound} disabled={gameState === 'RISING'} className={`w-full py-6 rounded-3xl font-black text-xl active:scale-95 transition-all shadow-xl border-t-2 border-white/10 ${gameState === 'RISING' ? 'bg-zinc-800 text-zinc-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'}`}>
            {gameState === 'RISING' ? 'BOOSTING...' : 'START JET'}
        </button>
      </div>

      {showRules && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-slate-900 border border-slate-700 w-full max-w-sm p-6 rounded-3xl animate-in zoom-in">
                   <div className="flex justify-between items-center mb-6">
                       <h2 className="text-xl font-black gold-text">LIMBO RULES</h2>
                       <button onClick={() => setShowRules(false)}><X/></button>
                   </div>
                   <div className="space-y-4 text-sm text-slate-400">
                       <p>1. Set your <span className="text-white font-bold">Stake</span> and any <span className="text-blue-400 font-bold">Target Multiplier</span> (Min 1.1x).</p>
                       <p>2. If the rocket crashes <span className="text-green-500 font-bold">AFTER</span> your target, you win your target payout.</p>
                       <p>3. If it crashes <span className="text-red-500 font-bold">BEFORE</span>, you lose your stake.</p>
                       <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                           <p className="text-xs italic text-yellow-500">Ex: Target 5.0x, Rocket hits 7.0x. You win 5x your bet!</p>
                       </div>
                   </div>
              </div>
          </div>
      )}
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};

export default Limbo;
