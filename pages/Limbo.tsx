
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Rocket, Zap, HelpCircle, X } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, db, auth, addGameBet, shouldForceLoss } from '../services/supabaseService';
import { GameResult } from '../types';
import { collection, addDoc } from 'firebase/firestore';

import LimboResultPopup from '../components/LimboResultPopup';
import HowToPlay from '../components/HowToPlay';

const Limbo: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [targetMult, setTargetMult] = useState(2.0); 
  const [gameState, setGameState] = useState<'IDLE' | 'RISING' | 'DONE'>('IDLE');
  const [resultMult, setResultMult] = useState(1.0);
  const [history, setHistory] = useState<number[]>([]);
  const [lbResult, setLbResult] = useState<any | null>(null);
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

  const startRound = async () => {
    if (gameState === 'RISING' || userBalance < betAmount) return;
    
    // Ensure final target is valid before starting
    const finalTarget = Math.max(1.1, targetMult || 1.1);
    if (targetMult < 1.1) setTargetMult(1.1);

    // Record bet in Firestore
    if (auth.currentUser) {
        addGameBet('limbo_bets', {
            amount: betAmount,
            target: finalTarget.toString(),
            timestamp: Date.now()
        });
    }

    updateBalance(-betAmount, 'BET', 'Limbo Stake');
    playSound('bet_place');
    setLbResult(null);
    setGameState('RISING');

    // Provably fair generation (simulated)
    const r = Math.random();
    const forced = shouldForceLoss(betAmount, userBalance);
    const outcome = forced ? (1.0 + Math.random() * (finalTarget - 1.01)) : Math.max(1, 0.99 / (1 - r));
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
    
    setLbResult({
        win: isWin,
        amount: isWin ? winAmt : 0,
        multiplier: outcome,
        target: target
    });

    if (isWin) {
        updateBalance(winAmt, 'WIN', 'Limbo Win');
    }

    setHistory(prev => [outcome, ...prev].slice(0, 10));
    addGameHistory('Limbo', betAmount, winAmt, `Target ${target}x | Got ${outcome.toFixed(2)}x`);

    setTimeout(() => {
        if(isMounted.current) setGameState('IDLE');
    }, 1500);
  };

  return (
    <div className="bg-[#0f172a] min-h-screen flex flex-col font-sans text-white relative">
      <LimboResultPopup result={lbResult} onClose={() => setLbResult(null)} />
      <HowToPlay 
          isOpen={showRules} 
          onClose={() => setShowRules(false)} 
          title="Limbo Rules"
          rules={[
              "Set your target multiplier and stake your bet.",
              "The game generates a random multiplier result.",
              "If the result is greater than or equal to your target, you win!",
              "Winning payout is calculation as stake × target multiplier.",
              "If the result is lower than your target, the bet is lost."
          ]}
          payouts={[
              { label: "Result >= Target", value: "Stake × Target" },
              { label: "Result < Target", value: "Loss" }
          ]}
      />
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90 transition-all"><ArrowLeft size={20}/></button>
            <div className="flex flex-col">
                <h1 className="text-sm font-black gold-text italic tracking-widest uppercase leading-none">LIMBO ELITE</h1>
                <span className="text-[8px] text-yellow-500/40 mt-1 uppercase font-bold">Rocket Wallet</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 shadow-inner flex items-center gap-2">
                <Wallet size={14} className="text-yellow-500" />
                <span className="text-sm font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
            </div>
            <button onClick={() => setShowRules(true)} className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20 active:scale-90 transition-all"><HelpCircle size={20}/></button>
        </div>
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
