
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, HelpCircle, X, ChevronUp, Lock, Sparkles, RotateCcw } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, db, auth, addGameBet } from '../services/supabaseService';
import { GameResult } from '../types';
import { collection, addDoc } from 'firebase/firestore';

import DragonTowerResultPopup from '../components/DragonTowerResultPopup';
import HowToPlay from '../components/HowToPlay';

const LEVELS = [1.5, 3.2, 6.8, 14.5, 32.0, 75.0, 200.0, 500.0];

const Tower: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [currentLv, setCurrentLv] = useState(-1);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'REVEALING' | 'LOST' | 'WON'>('IDLE');
  const [showRules, setShowRules] = useState(false);
  const [revealedIdx, setRevealedIdx] = useState<number | null>(null);
  const [tResult, setTResult] = useState<any | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const start = async () => {
    if (userBalance < bet) return;
    
    // Record bet in Firestore removed to save quota for instant games
    // addGameHistory will still record the result for the user

    updateBalance(-bet, 'BET', 'Tower of Fortune');
    playSound('bet_place');
    setTResult(null);
    setGameState('PLAYING');
    setCurrentLv(-1);
    setRevealedIdx(null);
  };

  const pick = async (idx: number) => {
    if (gameState !== 'PLAYING') return;
    setGameState('REVEALING');
    setRevealedIdx(idx);
    playSound('tower_step');

    await new Promise(r => setTimeout(r, 800));

    // Refined RTP: 66% win rate per floor (1/3 chance of hitting trap)
    const isWin = Math.random() > 0.33; 

    if (isWin) {
        playSound('win');
        setCurrentLv(prev => prev + 1);
        setGameState('PLAYING');
        setRevealedIdx(null);
        if (currentLv + 1 === LEVELS.length - 1) cashout(true);
    } else {
        // SET STATE TO LOST IMMEDIATELY TO HIDE CASH OUT BUTTON
        setGameState('LOST');
        setTResult({
            win: false,
            amount: bet,
            level: currentLv + 1,
            multiplier: 0
        });
        addGameHistory('Tower', bet, 0, `Floor ${currentLv + 1} Collapse`);
        setTimeout(() => {
            setGameState('IDLE');
            setCurrentLv(-1);
        }, 2000);
    }
  };

  const cashout = (auto = false) => {
    if (currentLv === -1 || gameState !== 'PLAYING') return;
    const winAmt = bet * LEVELS[currentLv];
    updateBalance(winAmt, 'WIN', 'Tower Cashout');
    
    setTResult({
        win: true,
        amount: winAmt,
        level: currentLv + 1,
        multiplier: LEVELS[currentLv]
    });

    addGameHistory('Tower', bet, winAmt, `Floor ${currentLv + 1} Cashout`);
    setGameState('IDLE');
    setCurrentLv(-1);
  };

  const cancelBet = () => {
    if (gameState !== 'IDLE') return;
    playSound('click');
  };

  return (
    <div className="bg-[#0c0a1a] min-h-screen flex flex-col font-sans text-white overflow-hidden relative">
      <DragonTowerResultPopup result={tResult} onClose={() => setTResult(null)} />
      <HowToPlay 
          isOpen={showHelp} 
          onClose={() => setShowHelp(false)} 
          title="Tower Rules"
          rules={[
              "Start your climb from the bottom floor.",
              "Each floor has 3 tiles: 2 are safe, 1 is a trap.",
              "Picking a safe tile moves you up and increases your multiplier.",
              "Cash Out at any level to take your winnings.",
              "If you hit a trap, you lose your stake."
          ]}
          payouts={[
              { label: "Floor 1", value: "1.5x" },
              { label: "Floor 4", value: "14.5x" },
              { label: "Top Floor", value: "500x" }
          ]}
      />
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/5 relative z-50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} disabled={gameState === 'PLAYING'} className="p-2.5 bg-slate-800 rounded-2xl active:scale-90 transition-all"><ArrowLeft size={18}/></button>
          <div className="flex flex-col text-left">
              <h1 className="text-sm font-black gold-text italic tracking-widest uppercase leading-none">TOWER ELITE</h1>
              <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Stair Wallet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-black/50 px-4 py-2 rounded-2xl border border-indigo-500/20 shadow-inner flex items-center gap-2">
                <Wallet size={14} className="text-indigo-400" />
                <span className="text-sm font-black font-mono text-indigo-400 italic">₹{userBalance.toFixed(2)}</span>
            </div>
            <button onClick={() => setShowHelp(true)} className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 active:scale-90 transition-all"><HelpCircle size={18}/></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 flex flex-col-reverse gap-4 bg-[url('https://img.freepik.com/free-vector/dark-blue-night-sky-background-with-clouds-stars_1017-26154.jpg')] bg-cover relative">
          {gameState === 'IDLE' && (
              <div className="absolute top-4 left-4 right-4 bg-black/40 p-3 rounded-xl border border-white/10 text-[9px] text-slate-300 leading-relaxed z-10 backdrop-blur-sm">
                  <h4 className="font-black text-indigo-400 mb-1 uppercase">How to Play</h4>
                  <p>1. Start from the bottom floor. Pick 1 of 3 tiles.<br/>2. Two tiles are SAFE, one is a TRAP.<br/>3. Choosing SAFE moves you UP and increases payout.<br/>4. Cash out any time to take winnings!</p>
              </div>
          )}
          {LEVELS.map((m, i) => (
              <div key={i} className={`h-32 w-full rounded-3xl border-2 flex items-center justify-between px-8 transition-all duration-500 ${currentLv === i ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-105' : i === currentLv + 1 ? 'bg-slate-800/80 border-slate-600' : 'bg-black/40 border-white/5 opacity-40'}`}>
                  <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Floor {i+1}</span>
                      <span className="font-black text-3xl italic tracking-tighter text-white drop-shadow-lg">{m}x</span>
                  </div>
                  {i === currentLv + 1 && (gameState === 'PLAYING' || gameState === 'REVEALING') ? (
                      <div className="flex gap-3">
                          {[0,1,2].map(btn => (
                              <button key={btn} onClick={() => pick(btn)} className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 ${revealedIdx === btn ? 'bg-yellow-500 text-black scale-110' : 'bg-indigo-500/20 hover:bg-indigo-500 border border-indigo-400/30 text-white'}`}>
                                  <span className="text-2xl font-black italic">?</span>
                              </button>
                          ))}
                      </div>
                  ) : currentLv >= i ? (
                      <div className="bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] p-4 rounded-full border border-white/20">
                          <Sparkles className="text-black" size={28} />
                      </div>
                  ) : (
                      <Lock size={24} className="text-slate-600" />
                  )}
              </div>
          ))}
      </div>

      <div className="bg-[#111] p-6 border-t border-white/5 pb-12 z-50">
        {gameState === 'IDLE' ? (
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 flex-1">
                        {[10, 50, 100, 500, 1000].map(a => <button key={a} onClick={() => setBet(a)} className={`flex-shrink-0 px-6 py-2 rounded-xl font-black border transition-all ${bet === a ? 'bg-yellow-500 text-black border-white shadow-lg' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}>₹{a}</button>)}
                    </div>
                    <button onClick={cancelBet} className="p-4 bg-red-600/10 rounded-2xl text-red-500 border border-red-500/20 active:scale-90 transition-all">
                        <RotateCcw size={20} />
                    </button>
                </div>
                <button onClick={start} className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all outline-none border-t border-white/20">START CLIMB</button>
            </div>
        ) : gameState === 'PLAYING' || gameState === 'REVEALING' ? (
            <div className="space-y-4">
                <div className="text-center mb-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Current Win Potential</span>
                    <h3 className="text-3xl font-black gold-text">₹{(bet * (currentLv === -1 ? 1 : LEVELS[currentLv])).toFixed(2)}</h3>
                </div>
                <button onClick={() => cashout()} disabled={currentLv === -1 || gameState === 'REVEALING'} className={`w-full py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all ${currentLv === -1 ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-yellow-500 text-black shadow-yellow-500/40 border-t-2 border-white/30'}`}>
                    {currentLv === -1 ? 'PICK A FLOOR' : `CASH OUT`}
                </button>
            </div>
        ) : null}
      </div>

      {showRules && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-sm p-6 rounded-[2.5rem] animate-in zoom-in">
                   <div className="flex justify-between items-center mb-6">
                       <h2 className="text-xl font-black italic gold-text">TOWER RULES</h2>
                       <button onClick={() => setShowRules(false)} className="p-2 bg-slate-800 rounded-full"><X/></button>
                   </div>
                   <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                       <p>1. Start your climb from the bottom floor.</p>
                       <p>2. Each floor has 3 tiles: <span className="text-green-400 font-bold">2 are safe</span>, <span className="text-red-500 font-bold">1 is a trap</span>.</p>
                       <p>3. Picking a safe tile moves you up and increases your multiplier.</p>
                       <p>4. Cash Out at any level to take your winnings.</p>
                       <p>5. If you hit a trap, you lose your stake.</p>
                   </div>
              </div>
          </div>
      )}
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};

export default Tower;
