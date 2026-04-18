
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, HelpCircle, X, Lock, Flame, Sparkles, Trophy, Skull } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, db, auth } from '../services/supabaseService';
import { GameResult } from '../types';
import { collection, addDoc } from 'firebase/firestore';

import { motion, AnimatePresence } from 'motion/react';
import DragonTowerResultPopup from '../components/DragonTowerResultPopup';

const LEVELS = [1.32, 1.76, 2.35, 3.12, 4.20, 5.60, 7.50, 10.0, 13.5, 18.0, 24.0, 32.0];

const DragonTower: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [currentLv, setCurrentLv] = useState(-1);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'REVEALING' | 'LOST' | 'WON'>('IDLE');
  const [revealedIdx, setRevealedIdx] = useState<number | null>(null);
  const [gridData, setGridData] = useState<number[]>([]); 
  const [revealedRows, setRevealedRows] = useState<number[]>([]); // Levels where we reveal the fire
  const [dtResult, setDtResult] = useState<any | null>(null);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const start = async () => {
    if (userBalance < bet) return;
    
    // Record bet in Firestore removed to save quota for instant games
    // addGameHistory will still record the result for the user

    updateBalance(-bet, 'BET', 'Dragon Tower');
    playSound('bet_place');
    const newGrid = LEVELS.map(() => Math.floor(Math.random() * 4));
    setGridData(newGrid);
    setDtResult(null);
    setGameState('PLAYING');
    setCurrentLv(-1);
    setRevealedIdx(null);
    setRevealedRows([]);
  };

  const pick = async (idx: number) => {
    if (gameState !== 'PLAYING') return;
    setGameState('REVEALING');
    setRevealedIdx(idx);
    playSound('tower_step');
    await new Promise(r => setTimeout(r, 800));
    
    const trapIdx = gridData[currentLv + 1];
    const isWin = idx !== trapIdx;
    
    if (isWin) {
        setRevealedRows(prev => [...prev, currentLv + 1]);
        setCurrentLv(prev => prev + 1);
        setGameState('PLAYING');
        setRevealedIdx(null);
        if (currentLv + 1 === LEVELS.length - 1) cashout(true);
    } else {
        setGameState('LOST');
        setRevealedRows(prev => [...prev, currentLv + 1]);
        setDtResult({
            win: false,
            amount: bet,
            level: currentLv + 1,
            multiplier: 0
        });
        addGameHistory('Dragon Tower', bet, 0, `Burned at Level ${currentLv + 2}`);
    }
  };

  const cashout = (auto = false) => {
    if (gameState !== 'PLAYING' || currentLv === -1) return;
    const winAmt = bet * LEVELS[currentLv];
    updateBalance(winAmt, 'WIN', 'Dragon Tower Cashout');
    setDtResult({
        win: true,
        amount: winAmt,
        level: currentLv + 1,
        multiplier: LEVELS[currentLv]
    });
    setGameState('WON');
  };

  const resetGame = () => {
      setGameState('IDLE');
      setCurrentLv(-1);
      setRevealedRows([]);
  };

  return (
    <div className="bg-[#0a0505] min-h-screen flex flex-col font-sans text-white overflow-hidden relative">
      <DragonTowerResultPopup result={dtResult} onClose={() => resetGame()} />

      <div className="p-4 flex justify-between items-center bg-black/60 border-b border-orange-500/20 z-50 shadow-xl">
        <div className="flex items-center gap-3">
            <button onClick={onBack} disabled={gameState === 'PLAYING'} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={20}/></button>
            <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-orange-500/20 shadow-inner">
                <Wallet size={14} className="text-orange-500" />
                <span className="text-sm font-black font-mono text-orange-500">₹{userBalance.toFixed(2)}</span>
            </div>
        </div>
        <h1 className="text-sm font-black gold-text italic tracking-widest uppercase">DRAGON TOWER</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col-reverse gap-4 bg-[#0a0505] relative">
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          {LEVELS.map((m, i) => (
              <div key={i} className={`h-24 w-full rounded-2xl border-2 flex items-center justify-between px-4 transition-all duration-500 relative z-10 ${currentLv === i ? 'bg-orange-950/40 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)] scale-[1.03]' : i === currentLv + 1 ? 'bg-zinc-900 border-zinc-700' : 'bg-black/40 border-white/5 opacity-40'}`}>
                  <span className={`font-black text-lg italic w-12 ${currentLv >= i ? 'text-orange-400' : 'text-zinc-600'}`}>{m}x</span>
                  <div className="flex-1 flex justify-end gap-2">
                      {[0,1,2,3].map(tileIdx => {
                          const isCurrentRow = i === currentLv + 1;
                          const isTrap = gridData[i] === tileIdx;
                          const isPicked = isCurrentRow && revealedIdx === tileIdx;
                          const isFireRevealed = revealedRows.includes(i) && isTrap;
                          const isSuccess = revealedRows.includes(i) && !isTrap;
                          
                          return (
                              <button 
                                key={tileIdx} 
                                onClick={() => pick(tileIdx)}
                                disabled={!isCurrentRow || gameState !== 'PLAYING'}
                                className={`w-20 h-24 rounded-2xl flex items-center justify-center transition-all border-4 relative overflow-hidden ${
                                    isFireRevealed 
                                        ? 'bg-red-950/60 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.8),inset_0_0_30px_rgba(239,68,68,0.6)] z-20' 
                                        : isSuccess
                                            ? 'bg-green-600 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.6)]'
                                            : isPicked 
                                                ? 'bg-blue-600 border-blue-400 animate-pulse' 
                                                : isCurrentRow 
                                                    ? 'bg-zinc-800 border-zinc-500 hover:border-orange-500 active:scale-95 shadow-[0_10px_20px_rgba(0,0,0,0.4)]' 
                                                    : currentLv >= i 
                                                        ? 'bg-green-900/20 border-green-500/10'
                                                        : 'bg-black/40 border-white/5'
                                }`}
                              >
                                  {isFireRevealed ? (
                                      <motion.div 
                                        initial={{ scale: 0, y: 20 }}
                                        animate={{ scale: 1.2, y: 0 }}
                                        className="relative flex flex-col items-center"
                                      >
                                        <Flame size={48} className="text-orange-500 fill-orange-600 animate-pulse" />
                                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-red-600/60 via-orange-500/20 to-transparent blur-xl"></div>
                                      </motion.div>
                                  ) : isCurrentRow ? (
                                      <span className="text-zinc-600 font-black text-xl">?</span>
                                  ) : currentLv >= i && isSuccess ? (
                                      <motion.div initial={{scale: 0}} animate={{scale: 1}}><Sparkles size={24} className="text-green-400" /></motion.div>
                                  ) : currentLv >= i ? (
                                      <Lock size={16} className="text-zinc-800/40"/>
                                  ) : (
                                      <Lock size={16} className="text-zinc-800"/>
                                  )}
                              </button>
                          );
                      })}
                  </div>
              </div>
          ))}
      </div>

      <div className="bg-[#111] p-6 border-t border-white/10 pb-12 z-50">
        {gameState === 'IDLE' ? (
            <div className="space-y-4">
                <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar">
                    {[10, 100, 500, 1000, 5000].map(amt => (
                        <button key={amt} onClick={() => setBet(amt)} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${bet === amt ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'bg-zinc-900 text-zinc-600 border border-white/5'}`}>₹{amt}</button>
                    ))}
                </div>
                <button onClick={start} className="w-full py-6 bg-gradient-to-r from-orange-600 to-red-600 rounded-[2.5rem] font-black text-xl shadow-xl active:scale-95 transition-all uppercase tracking-widest border-t-2 border-white/10">Climb Tower</button>
            </div>
        ) : gameState === 'PLAYING' ? (
            <button onClick={() => cashout()} disabled={currentLv === -1} className={`w-full py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all ${currentLv === -1 ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-yellow-500 text-black shadow-yellow-500/40 border-t-2 border-white/30'}`}>
                {currentLv === -1 ? 'PICK A TILE' : `CASH OUT ₹${(bet * LEVELS[currentLv]).toFixed(2)}`}
            </button>
        ) : null}
      </div>

      <style>{`
        .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        @keyframes fire-pulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.1); filter: brightness(1.3); }
        }
        .animate-fire-pulse { animation: fire-pulse 1s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

export default DragonTower;
