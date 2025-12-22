
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Lock, Unlock, ShieldCheck, X, HelpCircle } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

const VaultBreaker: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'RESULT'>('IDLE');
  const [combination, setCombination] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [level, setLevel] = useState(1);
  const [showRules, setShowRules] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const start = () => {
      if (userBalance < bet) return;
      updateBalance(-bet, 'BET', 'Vault Breaker');
      setGameState('PLAYING');
      generateLevel(1);
      setUserInput([]);
      playSound('click');
  };

  const generateLevel = (lv: number) => {
      const combo = Array.from({length: lv + 2}, () => Math.floor(Math.random() * 4) + 1);
      setCombination(combo);
      setLevel(lv);
  };

  const handleInput = (num: number) => {
      if (gameState !== 'PLAYING') return;
      const nextInput = [...userInput, num];
      setUserInput(nextInput);
      playSound('click');

      const currentIdx = nextInput.length - 1;
      if (nextInput[currentIdx] !== combination[currentIdx]) {
          finalize(false);
      } else if (nextInput.length === combination.length) {
          if (level === 3) {
              finalize(true);
          } else {
              playSound('win');
              generateLevel(level + 1);
              setUserInput([]);
          }
      }
  };

  const finalize = (success: boolean) => {
      const winAmt = success ? bet * 5 : 0;
      if (success) {
          updateBalance(winAmt, 'WIN', 'Vault Breaker Win');
          playSound('win');
      } else {
          playSound('loss');
      }
      setGameState('RESULT');
      onResult({ win: success, amount: success ? winAmt : bet, game: 'Vault Breaker' });
      addGameHistory('Vault Breaker', bet, winAmt, success ? 'Vault Cracked' : 'Alarm Triggered');
      setTimeout(() => isMounted.current && setGameState('IDLE'), 3000);
  };

  return (
    <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white select-none">
        <div className="p-4 flex justify-between items-center bg-black/40 border-b border-blue-500/20 sticky top-0 z-50">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
                <h1 className="text-xl font-black italic gold-text">VAULT BREAKER</h1>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowRules(true)} className="p-2 bg-slate-800 rounded-xl active:scale-90"><HelpCircle size={18}/></button>
                <div className="text-blue-400 font-mono text-sm bg-black/40 px-3 py-1.5 rounded-xl border border-blue-500/20">₹{userBalance.toFixed(2)}</div>
            </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
             <div className={`w-48 h-48 rounded-full border-[12px] flex items-center justify-center transition-all duration-500 ${gameState==='PLAYING' ? 'border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)]' : 'border-zinc-800'}`}>
                 {gameState === 'PLAYING' ? <Unlock size={64} className="text-blue-400 animate-pulse" /> : <Lock size={64} className="text-zinc-700" />}
             </div>
             
             <div className="mt-10 flex gap-3">
                 {combination.map((_, i) => (
                     <div key={i} className={`w-4 h-4 rounded-full border-2 ${userInput.length > i ? 'bg-blue-500 border-blue-300' : 'border-zinc-800'}`}></div>
                 ))}
             </div>
             
             {gameState === 'PLAYING' && (
                 <div className="mt-4 bg-blue-500/10 px-4 py-1 rounded-full border border-blue-500/20">
                     <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Security Tier {level}/3</span>
                 </div>
             )}
        </div>

        <div className="bg-[#111] p-8 pb-12 border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,1)]">
            {gameState === 'IDLE' ? (
                <div className="space-y-6">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {[10, 50, 100, 500].map(a => <button key={a} onClick={() => setBet(a)} className={`px-5 py-3 rounded-xl font-black text-xs border transition-all ${bet === a ? 'bg-blue-600 text-white border-white shadow-lg' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}>₹{a}</button>)}
                    </div>
                    <button onClick={start} className="w-full py-6 rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xl shadow-xl active:scale-95 transition-all border-t-2 border-white/20">ATTEMPT BREAK-IN</button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(num => (
                        <button key={num} onClick={() => handleInput(num)} disabled={gameState !== 'PLAYING'} className="h-24 bg-zinc-900 rounded-3xl border-b-4 border-zinc-950 text-3xl font-black active:scale-95 transition-all flex items-center justify-center active:bg-blue-900 shadow-xl">{num}</button>
                    ))}
                </div>
            )}
        </div>

        {showRules && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                <div className="bg-slate-900 border-2 border-blue-500/30 w-full max-w-sm p-10 rounded-[3rem] shadow-2xl animate-in zoom-in">
                     <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                         <h2 className="text-2xl font-black text-blue-500 italic uppercase">HOW TO PLAY</h2>
                         <button onClick={() => setShowRules(false)} className="p-2 bg-slate-800 rounded-full"><X size={20}/></button>
                     </div>
                     <div className="space-y-4 text-sm text-slate-300 font-medium leading-relaxed">
                         <p>1. Set your <span className="text-white font-bold">Stake</span> and attempt to crack the combination.</p>
                         <p>2. Tap the numbers <span className="text-blue-400 font-bold">1-4</span> to guess the secret sequence.</p>
                         <p>3. Successfully guess all digits in a tier to advance. There are <span className="text-white font-bold">3 Tiers</span>.</p>
                         <p>4. Cracking all 3 tiers unlocks the vault for a <span className="text-yellow-500 font-bold">5.0x</span> payout.</p>
                         <p>5. One wrong guess triggers the alarm and the stake is lost.</p>
                     </div>
                </div>
            </div>
        )}
        <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};
export default VaultBreaker;
