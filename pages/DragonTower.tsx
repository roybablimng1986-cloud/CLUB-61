
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, HelpCircle, X, Lock, Flame, Sparkles, Trophy, Skull } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

const LEVELS = [1.32, 1.76, 2.35, 3.12, 4.20, 5.60, 7.50, 10.0, 13.5, 18.0, 24.0, 32.0];

const DragonTower: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [currentLv, setCurrentLv] = useState(-1);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'REVEALING' | 'LOST' | 'WON'>('IDLE');
  const [revealedIdx, setRevealedIdx] = useState<number | null>(null);
  const [gridData, setGridData] = useState<number[]>([]); 
  const [revealedRows, setRevealedRows] = useState<number[]>([]); // Levels where we reveal the fire
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const start = () => {
    if (userBalance < bet) return;
    updateBalance(-bet, 'BET', 'Dragon Tower');
    playSound('click');
    const newGrid = LEVELS.map(() => Math.floor(Math.random() * 4));
    setGridData(newGrid);
    setGameState('PLAYING');
    setCurrentLv(-1);
    setRevealedIdx(null);
    setRevealedRows([]);
  };

  const pick = async (idx: number) => {
    if (gameState !== 'PLAYING') return;
    setGameState('REVEALING');
    setRevealedIdx(idx);
    playSound('tick');
    await new Promise(r => setTimeout(r, 800));
    
    const trapIdx = gridData[currentLv + 1];
    const isWin = idx !== trapIdx;
    
    if (isWin) {
        playSound('win');
        // When winning a row, we "reveal" the fire location of that row so the user sees it as they move up
        setRevealedRows(prev => [...prev, currentLv + 1]);
        setCurrentLv(prev => prev + 1);
        setGameState('PLAYING');
        setRevealedIdx(null);
        if (currentLv + 1 === LEVELS.length - 1) cashout(true);
    } else {
        playSound('loss');
        setGameState('LOST');
        setRevealedRows(prev => [...prev, currentLv + 1]); // Show where you died
        addGameHistory('Dragon Tower', bet, 0, `Burned at Level ${currentLv + 2}`);
        
        onResult({
            win: false,
            amount: bet,
            game: 'Dragon Tower',
            resultDetails: [{label: 'Level reached', value: (currentLv + 1).toString()}]
        });
    }
  };

  const cashout = (auto = false) => {
    if (gameState !== 'PLAYING' || currentLv === -1) return;
    const winAmt = bet * LEVELS[currentLv];
    updateBalance(winAmt, 'WIN', 'Dragon Tower Cashout');
    playSound('win');
    setGameState('WON');
    onResult({ win: true, amount: winAmt, game: 'Dragon Tower' });
  };

  const resetGame = () => {
      setGameState('IDLE');
      setCurrentLv(-1);
      setRevealedRows([]);
  };

  return (
    <div className="bg-[#0a0505] min-h-screen flex flex-col font-sans text-white overflow-hidden relative">
      {/* Full Screen Result Overlays */}
      {gameState === 'LOST' && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-md animate-in fade-in duration-500">
              <div className="bg-red-600 p-6 rounded-full shadow-[0_0_50px_rgba(220,38,38,0.8)] mb-6 animate-bounce">
                  <Skull size={64} className="text-white" />
              </div>
              <h2 className="text-5xl font-black italic gold-text uppercase mb-2">WASTED</h2>
              <p className="text-red-400 font-bold tracking-widest mb-10">YOU HIT THE FIRE</p>
              <div className="bg-black/40 px-10 py-4 rounded-2xl border border-red-500/30 mb-10">
                  <p className="text-[10px] text-red-500 font-black uppercase text-center mb-1">Loss</p>
                  <p className="text-3xl font-black text-white">₹{bet.toFixed(2)}</p>
              </div>
              <button onClick={resetGame} className="px-12 py-4 bg-white text-black font-black rounded-full shadow-2xl active:scale-95 transition-transform uppercase tracking-widest">Try Again</button>
          </div>
      )}

      {gameState === 'WON' && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-green-950/90 backdrop-blur-md animate-in fade-in duration-500">
              <div className="bg-yellow-500 p-6 rounded-full shadow-[0_0_50px_rgba(234,179,8,0.8)] mb-6 animate-pulse">
                  <Trophy size={64} className="text-black" />
              </div>
              <h2 className="text-5xl font-black italic gold-text uppercase mb-2">VICTORY</h2>
              <p className="text-green-400 font-bold tracking-widest mb-10">ELITE CLIMBER</p>
              <div className="bg-black/40 px-10 py-4 rounded-2xl border border-yellow-500/30 mb-10 text-center">
                  <p className="text-[10px] text-yellow-500 font-black uppercase mb-1">Winning Amount</p>
                  <p className="text-4xl font-black text-white italic">₹{(bet * LEVELS[currentLv]).toFixed(2)}</p>
              </div>
              <button onClick={resetGame} className="px-12 py-4 bg-yellow-500 text-black font-black rounded-full shadow-2xl active:scale-95 transition-transform uppercase tracking-widest">Collect & Close</button>
          </div>
      )}

      <div className="p-4 flex justify-between items-center bg-black/60 border-b border-orange-500/20 z-50 shadow-xl">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={20}/></button>
            <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-orange-500/20 shadow-inner">
                <Wallet size={14} className="text-orange-500" />
                <span className="text-sm font-black font-mono text-orange-500">₹{userBalance.toFixed(2)}</span>
            </div>
        </div>
        <h1 className="text-sm font-black gold-text italic tracking-widest uppercase">DRAGON TOWER</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col-reverse gap-4 bg-[#0a0505] relative">
          {/* Background fire embers effect */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          {LEVELS.map((m, i) => (
              <div key={i} className={`h-20 w-full rounded-3xl border-2 flex items-center justify-between px-6 transition-all duration-500 relative z-10 ${currentLv === i ? 'bg-orange-950/40 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)] scale-[1.03]' : i === currentLv + 1 ? 'bg-zinc-900 border-zinc-700' : 'bg-black/40 border-white/5 opacity-40'}`}>
                  <span className={`font-black text-xl italic w-14 ${currentLv >= i ? 'text-orange-400' : 'text-zinc-600'}`}>{m}x</span>
                  <div className="flex-1 flex justify-end gap-3">
                      {[0,1,2,3].map(tileIdx => {
                          const isCurrentRow = i === currentLv + 1;
                          const isTrap = gridData[i] === tileIdx;
                          const isPicked = isCurrentRow && revealedIdx === tileIdx;
                          const isFireRevealed = revealedRows.includes(i) && isTrap;
                          
                          return (
                              <button 
                                key={tileIdx} 
                                onClick={() => pick(tileIdx)}
                                disabled={!isCurrentRow || gameState !== 'PLAYING'}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border-2 relative overflow-hidden ${
                                    isFireRevealed 
                                        ? 'bg-orange-600/20 border-orange-500/40' 
                                        : isPicked 
                                            ? 'bg-green-600 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)]' 
                                            : isCurrentRow 
                                                ? 'bg-zinc-800 border-zinc-600 hover:border-orange-500 active:scale-90 shadow-lg' 
                                                : currentLv >= i 
                                                    ? 'bg-green-900/20 border-green-500/20'
                                                    : 'bg-black/20 border-white/5'
                                }`}
                              >
                                  {isFireRevealed ? (
                                      <div className="animate-fire-pulse">
                                        <Flame size={28} className="text-orange-500 fill-orange-500/20" />
                                      </div>
                                  ) : isCurrentRow ? (
                                      <span className="text-zinc-600 font-black text-xl">?</span>
                                  ) : currentLv >= i ? (
                                      <Sparkles size={20} className="text-green-400 opacity-60" />
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

      {/* Control Panel - Fix: Only show button if not LOST or WON */}
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
        ) : gameState === 'PLAYING' || gameState === 'REVEALING' ? (
            <button onClick={() => cashout()} disabled={currentLv === -1 || gameState !== 'PLAYING'} className={`w-full py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all ${currentLv === -1 ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-yellow-500 text-black shadow-yellow-500/40 border-t-2 border-white/30'}`}>
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
