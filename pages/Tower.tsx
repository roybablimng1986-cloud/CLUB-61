
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, HelpCircle, X, ChevronUp, Lock, Sparkles } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

const LEVELS = [1.5, 3.2, 6.8, 14.5, 32.0, 75.0, 200.0, 500.0];

const Tower: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [currentLv, setCurrentLv] = useState(-1);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'REVEALING' | 'LOST'>('IDLE');
  const [showRules, setShowRules] = useState(false);
  const [revealedIdx, setRevealedIdx] = useState<number | null>(null);

  const start = () => {
    if (userBalance < bet) return;
    updateBalance(-bet, 'BET', 'Tower of Fortune');
    playSound('click');
    setGameState('PLAYING');
    setCurrentLv(-1);
    setRevealedIdx(null);
  };

  const pick = async (idx: number) => {
    if (gameState !== 'PLAYING') return;
    setGameState('REVEALING');
    setRevealedIdx(idx);
    playSound('tick');

    await new Promise(r => setTimeout(r, 800));

    const isWin = Math.random() > 0.35; // 65% win chance per floor

    if (isWin) {
        playSound('win');
        setCurrentLv(prev => prev + 1);
        setGameState('PLAYING');
        setRevealedIdx(null);
        if (currentLv + 1 === LEVELS.length - 1) cashout(true);
    } else {
        playSound('loss');
        setGameState('LOST');
        addGameHistory('Tower', bet, 0, `Floor ${currentLv + 1} Collapse`);
        setTimeout(() => {
            setGameState('IDLE');
            setCurrentLv(-1);
        }, 2000);
    }
  };

  const cashout = (auto = false) => {
    if (currentLv === -1) return;
    const winAmt = bet * LEVELS[currentLv];
    updateBalance(winAmt, 'WIN', 'Tower Cashout');
    playSound('win');
    onResult({ win: true, amount: winAmt, game: 'Tower of Fortune', resultDetails: [{label: 'Floors', value: `${currentLv + 1}`}]});
    setGameState('IDLE');
    setCurrentLv(-1);
  };

  return (
    <div className="bg-[#0c0a1a] min-h-screen flex flex-col font-sans text-white overflow-hidden relative">
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/5 relative z-50">
        <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={20}/></button>
        <h1 className="text-xl font-black gold-text italic tracking-widest uppercase">TOWER ELITE</h1>
        <button onClick={() => setShowRules(true)} className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl"><HelpCircle size={20}/></button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 flex flex-col-reverse gap-4 bg-[url('https://img.freepik.com/free-vector/dark-blue-night-sky-background-with-clouds-stars_1017-26154.jpg')] bg-cover">
          {LEVELS.map((m, i) => (
              <div key={i} className={`h-16 w-full rounded-2xl border-2 flex items-center justify-between px-6 transition-all duration-500 ${currentLv === i ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-105' : i === currentLv + 1 ? 'bg-slate-800/80 border-slate-600' : 'bg-black/40 border-white/5 opacity-40'}`}>
                  <span className="font-black text-lg italic">{m}x</span>
                  {i === currentLv + 1 ? (
                      <div className="flex gap-2">
                          {[0,1,2].map(btn => (
                              <button key={btn} onClick={() => pick(btn)} className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${revealedIdx === btn ? 'bg-yellow-500 text-black scale-110 shadow-lg' : 'bg-indigo-500/20 hover:bg-indigo-500 border border-indigo-400/30'}`}>
                                  ?
                              </button>
                          ))}
                      </div>
                  ) : currentLv >= i ? (
                      <Sparkles className="text-yellow-400" />
                  ) : (
                      <Lock size={16} className="text-slate-600" />
                  )}
              </div>
          ))}
      </div>

      <div className="bg-[#111] p-6 border-t border-white/5 pb-12 z-50">
        {gameState === 'IDLE' ? (
            <div className="space-y-4">
                <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
                    {[10, 50, 100, 500, 1000].map(a => <button key={a} onClick={() => setBet(a)} className={`flex-shrink-0 px-6 py-2 rounded-xl font-black border ${bet === a ? 'bg-yellow-500 text-black border-white' : 'bg-slate-900 text-slate-500 border-white/5'}`}>₹{a}</button>)}
                </div>
                <button onClick={start} className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all">START CLIMB</button>
            </div>
        ) : (
            <div className="space-y-4">
                <div className="text-center mb-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Current Win Potential</span>
                    <h3 className="text-3xl font-black gold-text">₹{(bet * (currentLv === -1 ? 1 : LEVELS[currentLv])).toFixed(2)}</h3>
                </div>
                <button onClick={() => cashout()} disabled={currentLv === -1 || gameState === 'REVEALING'} className={`w-full py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all ${currentLv === -1 ? 'bg-slate-800 text-slate-600' : 'bg-yellow-500 text-black shadow-yellow-500/20'}`}>
                    {currentLv === -1 ? 'PICK A FLOOR' : `CASH OUT`}
                </button>
            </div>
        )}
      </div>

      {showRules && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl">
                   <div className="flex justify-between items-center mb-8">
                       <h2 className="text-2xl font-black italic gold-text">TOWER RULES</h2>
                       <button onClick={() => setShowRules(false)} className="p-2 bg-slate-800 rounded-full"><X/></button>
                   </div>
                   <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                       <p>1. Start your climb from the bottom floor.</p>
                       <p>2. Each floor has 3 tiles: <span className="text-green-400 font-bold">2 are safe</span>, <span className="text-red-500 font-bold">1 is a trap</span>.</p>
                       <p>3. Successfully picking a safe tile moves you up and increases your multiplier.</p>
                       <p>4. You can <span className="text-yellow-500 font-bold">Cash Out</span> at any level to take your winnings.</p>
                       <p>5. If you hit a trap, you lose your entire stake.</p>
                   </div>
              </div>
          </div>
      )}
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};

export default Tower;
