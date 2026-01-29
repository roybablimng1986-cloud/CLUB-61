
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, ShieldAlert, X, HelpCircle, Trophy, Play } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

const MULTIPLIERS = [1.92, 3.84, 7.68, 15.36, 30.72];

const Penalty: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [round, setRound] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'SHOOTING' | 'DONE'>('IDLE');
  const [keeperPos, setKeeperPos] = useState<number | null>(null);
  const [ballPos, setBallPos] = useState<number | null>(null);
  const [betDeducted, setBetDeducted] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => {
      isMounted.current = true;
      return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const handlePlaceBet = () => {
    if (userBalance < betAmount) { alert("Insufficient Balance!"); return; }
    updateBalance(-betAmount, 'BET', 'Penalty Stake');
    setBetDeducted(true);
    setGameState('PLAYING');
    playSound('click');
  };

  const kick = (target: number) => {
    if (gameState !== 'PLAYING' || !betDeducted) return;

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
                    setBetDeducted(false);
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
      setBetDeducted(false);
  };

  return (
    <div className="bg-[#052c16] min-h-screen flex flex-col font-sans text-white relative select-none overflow-hidden">
      <div className="p-4 flex justify-between items-center bg-black/60 border-b border-white/5 z-50">
        <button onClick={onBack} disabled={gameState === 'PLAYING' || gameState === 'SHOOTING'} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
        <h1 className="text-xl font-black gold-text tracking-widest italic uppercase">PENALTY KING</h1>
        <div className="bg-black/50 px-4 py-1.5 rounded-2xl text-yellow-500 font-mono text-sm border border-yellow-500/20">₹{userBalance.toFixed(2)}</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
          {!betDeducted && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[45] flex items-center justify-center px-6">
                  <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl text-center w-full max-w-sm">
                      <p className="text-xs font-black uppercase text-yellow-500 mb-6 tracking-widest">Stake Required to Enter Pitch</p>
                      <button onClick={handlePlaceBet} className="w-full py-5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-2xl font-black uppercase shadow-xl flex items-center justify-center gap-3 border-t-2 border-white/20 active:scale-95 transition-all">
                          <Play size={20}/> PLACE BET ₹{betAmount}
                      </button>
                  </div>
              </div>
          )}

          <div className="bg-yellow-500/10 px-4 py-1 rounded-full mb-8 border border-yellow-500/20">
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Multiplier Path: {round > 0 ? MULTIPLIERS[round-1] : '1.0'}x</span>
          </div>

          <div className={`w-full max-w-sm h-64 border-4 border-white rounded-t-3xl relative bg-[#065f46] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] ${!betDeducted ? 'opacity-40 grayscale' : ''}`}>
               <div className="absolute inset-x-0 bottom-0 h-4 bg-white/20"></div>
               <div className="grid grid-cols-5 h-full relative z-20">
                   {[0,1,2,3,4].map(i => (
                       <button key={i} onClick={() => kick(i)} disabled={gameState !== 'PLAYING'} className={`border-r border-white/10 hover:bg-white/10 transition-all flex items-center justify-center text-3xl group ${ballPos === i ? 'bg-white/5' : ''}`}>
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
        <div className="flex flex-col gap-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {[10, 50, 100, 500, 1000].map(a => <button key={a} onClick={() => !betDeducted && setBetAmount(a)} className={`px-5 py-3 rounded-xl font-black text-xs border transition-all ${betAmount === a ? 'bg-white text-black border-white shadow-lg' : 'bg-zinc-900 text-zinc-600 border-white/5'}`}>₹{a}</button>)}
            </div>
            
            <div className="flex gap-4">
                 {round > 0 && (
                    <button onClick={cashOut} disabled={gameState === 'SHOOTING' || gameState === 'DONE'} className="flex-1 bg-orange-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 border-t-2 border-white/20">
                        CASH OUT
                    </button>
                 )}
                 <div className="flex-[2] py-5 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-zinc-400 font-black border border-white/5 italic">
                    {betDeducted ? `STAKE: ₹${betAmount}` : `SELECT CHIP & PLAY`}
                 </div>
            </div>
        </div>
      </div>
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};

export default Penalty;
