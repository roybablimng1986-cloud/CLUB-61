
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, ShieldAlert, X, HelpCircle, Trophy } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

const MULTIPLIERS = [1.92, 3.84, 7.68, 15.36, 30.72];

const Penalty: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [round, setRound] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'SHOOTING' | 'DONE'>('IDLE');
  const [keeperPos, setKeeperPos] = useState<number | null>(null);
  const [ballPos, setBallPos] = useState<number | null>(null);

  const isMounted = useRef(true);
  useEffect(() => {
      isMounted.current = true;
      return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const kick = (target: number) => {
    if (gameState === 'SHOOTING' || gameState === 'DONE') return;
    
    if (round === 0) {
        if (userBalance < betAmount) { alert("Insufficient Balance!"); return; }
        updateBalance(-betAmount, 'BET', 'Penalty Stake');
    }

    setGameState('SHOOTING');
    setBallPos(target);
    playSound('click');

    const kPos = Math.floor(Math.random() * 5);
    setKeeperPos(kPos);

    setTimeout(() => {
        if (!isMounted.current) return;
        if (target !== kPos) {
            playSound('win');
            const nextRound = round + 1;
            setRound(nextRound);
            setGameState('PLAYING');
            setBallPos(null);
            setKeeperPos(null);
            if (nextRound === MULTIPLIERS.length) cashOut();
        } else {
            playSound('loss');
            setGameState('DONE');
            addGameHistory('Penalty King', betAmount, 0, `Saved at Goal ${round + 1}`);
            onResult({ win: false, amount: betAmount, game: 'Penalty King' });
            setTimeout(() => {
                if (isMounted.current) {
                    setGameState('IDLE');
                    setRound(0);
                    setBallPos(null);
                    setKeeperPos(null);
                }
            }, 3000);
        }
    }, 1200);
  };

  const cashOut = () => {
      if (round === 0) return;
      const winAmt = betAmount * MULTIPLIERS[round - 1];
      updateBalance(winAmt, 'WIN', 'Penalty Win');
      playSound('win');
      onResult({ win: true, amount: winAmt, game: 'Penalty King', resultDetails: [{label: 'Goals', value: round.toString()}] });
      addGameHistory('Penalty King', betAmount, winAmt, `${round} Goals Cleared`);
      setGameState('IDLE');
      setRound(0);
      setBallPos(null);
      setKeeperPos(null);
  };

  return (
    <div className="bg-[#052c16] min-h-screen flex flex-col font-sans text-white relative select-none overflow-hidden">
      <div className="p-4 flex justify-between items-center bg-black/60 border-b border-white/5 z-50">
        <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={18}/></button>
        <h1 className="text-xl font-black gold-text tracking-widest italic">PENALTY KING</h1>
        <div className="bg-black/50 px-4 py-1.5 rounded-2xl text-yellow-500 font-mono text-sm border border-yellow-500/20">₹{userBalance.toFixed(2)}</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
          <div className="bg-yellow-500/10 px-4 py-1 rounded-full mb-8 border border-yellow-500/20">
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Current Level Multiplier: {round > 0 ? MULTIPLIERS[round-1] : '1.0'}x</span>
          </div>

          <div className="w-full max-w-sm h-64 border-4 border-white rounded-t-3xl relative bg-[#065f46] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
               <div className="absolute inset-x-0 bottom-0 h-4 bg-white/20"></div>
               <div className="grid grid-cols-5 h-full relative z-20">
                   {[0,1,2,3,4].map(i => (
                       <button key={i} onClick={() => kick(i)} disabled={gameState === 'SHOOTING' || gameState === 'DONE'} className={`border-r border-white/10 hover:bg-white/10 transition-all flex items-center justify-center text-3xl group ${ballPos === i ? 'bg-white/5' : ''}`}>
                           <div className={`w-8 h-8 rounded-full border-2 border-white/10 group-hover:border-white/40 flex items-center justify-center transition-all ${ballPos === i ? 'scale-150 border-white' : ''}`}>
                               🎯
                           </div>
                       </button>
                   ))}
               </div>
               
               {keeperPos !== null && (
                   <div 
                     className="absolute bottom-4 w-16 h-16 bg-red-600 rounded-full border-4 border-white flex items-center justify-center transition-all duration-700 shadow-2xl z-30"
                     style={{ left: `${keeperPos * 20 + 10}%`, transform: 'translateX(-50%)' }}
                   >
                       <ShieldAlert size={32} className="text-white animate-pulse" />
                   </div>
               )}

               {ballPos !== null && (
                   <div 
                     className="absolute w-8 h-8 bg-white rounded-full transition-all duration-700 z-40 shadow-xl flex items-center justify-center text-xs text-black font-bold"
                     style={{ 
                        bottom: gameState === 'SHOOTING' ? '70%' : '10px', 
                        left: `${ballPos * 20 + 10}%`, 
                        transform: 'translateX(-50%)' 
                    }}
                   >⚽</div>
               )}
          </div>
          
          <div className="mt-12 grid grid-cols-5 gap-2 w-full max-w-sm">
              {MULTIPLIERS.map((m, i) => (
                  <div key={i} className={`py-3 rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${round > i ? 'bg-green-600 border-green-400' : round === i ? 'bg-yellow-500 border-white text-black' : 'bg-black/40 border-white/5 opacity-40'}`}>
                      <span className="text-[10px] font-black">{m}x</span>
                      <div className="w-1 h-1 rounded-full bg-current mt-1"></div>
                  </div>
              ))}
          </div>
      </div>

      <div className="bg-[#111] p-6 border-t border-white/5 pb-12 shadow-2xl z-50">
        <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
                {[10, 100, 500, 1000].map(a => <button key={a} onClick={() => round === 0 && setBetAmount(a)} className={`px-5 py-2 rounded-xl font-black text-xs border transition-all ${betAmount === a ? 'bg-white text-black border-white shadow-lg' : 'bg-zinc-900 text-zinc-600 border-white/5'}`}>₹{a}</button>)}
            </div>
            {round > 0 && (
                <button onClick={cashOut} className="bg-yellow-500 text-black px-8 py-3 rounded-2xl font-black shadow-xl active:scale-95 animate-in zoom-in border-t-2 border-white/40">
                    COLLECT ₹{(betAmount * MULTIPLIERS[round-1]).toFixed(2)}
                </button>
            )}
        </div>
        <p className="text-center text-[9px] text-slate-500 uppercase tracking-[0.3em] font-black italic">Pick a target in the goal to launch stake</p>
      </div>
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};

export default Penalty;
