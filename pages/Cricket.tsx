
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Trophy, X, HelpCircle, History } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

const OUTCOMES = [
    { label: '1 Run', val: 1, mult: 1.5, color: 'bg-blue-600' },
    { label: '2 Runs', val: 2, mult: 2.5, color: 'bg-indigo-600' },
    { label: '4 Runs', val: 4, mult: 5.0, color: 'bg-purple-600' },
    { label: '6 Runs', val: 6, mult: 10.0, color: 'bg-yellow-500' },
    { label: 'Wicket', val: 0, mult: 20.0, color: 'bg-red-600' }
];

const Cricket: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'BOWLING' | 'RESULT'>('IDLE');
  const [landed, setLanded] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  const isMounted = useRef(true);
  useEffect(() => {
      isMounted.current = true;
      return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const playBall = () => {
    if (selectedTarget === null || status !== 'IDLE') return;
    if (userBalance < betAmount) { alert("Insufficient Balance!"); return; }

    setStatus('BOWLING');
    updateBalance(-betAmount, 'BET', `Cricket Bet on ${selectedTarget === 0 ? 'Wicket' : selectedTarget + ' Runs'}`);
    playSound('spin');

    setTimeout(() => {
        if (!isMounted.current) return;
        const weights = [0.4, 0.25, 0.15, 0.1, 0.1]; // Distribution
        const r = Math.random();
        let cumulative = 0;
        let outcomeIdx = 0;
        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (r < cumulative) { outcomeIdx = i; break; }
        }
        const result = OUTCOMES[outcomeIdx];
        setLanded(result.val);
        setStatus('RESULT');
        setHistory(prev => [result.val, ...prev].slice(0, 10));

        const isWin = selectedTarget === result.val;
        const winAmt = isWin ? betAmount * result.mult : 0;

        if (isWin) {
            updateBalance(winAmt, 'WIN', 'Cricket Win');
            playSound('win');
        } else {
            playSound('loss');
        }

        onResult({ win: isWin, amount: isWin ? winAmt : betAmount, game: 'Cricket Hero' });
        addGameHistory('Cricket Hero', betAmount, winAmt, `Landed ${result.label}`);

        setTimeout(() => {
            if (isMounted.current) {
                setStatus('IDLE');
                setLanded(null);
                setSelectedTarget(null);
            }
        }, 3000);
    }, 1500);
  };

  return (
    <div className="bg-[#111] min-h-screen flex flex-col font-sans text-white select-none overflow-hidden">
        <div className="p-4 flex justify-between items-center bg-[#064e3b] border-b border-white/5 z-50">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={18}/></button>
            <h1 className="text-xl font-black gold-text italic tracking-widest uppercase">CRICKET HERO</h1>
            <div className="bg-black/50 px-3 py-1 rounded-full text-yellow-500 font-mono text-sm">₹{userBalance.toFixed(2)}</div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 relative bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]">
             {/* Stadium Lights Effect */}
             <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-green-500/10 to-transparent pointer-events-none"></div>

             <div className="w-full max-w-sm aspect-video bg-[#064e3b] rounded-[2rem] border-8 border-white/10 shadow-[0_0_100px_rgba(5,150,105,0.2)] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grass.png')] opacity-30"></div>
                <div className="w-1.5 h-full bg-white/20 absolute left-1/2 -translate-x-1/2"></div>
                
                {status === 'BOWLING' ? (
                    <div className="flex flex-col items-center animate-bounce">
                        <div className="w-10 h-10 bg-red-600 rounded-full border-2 border-red-400 shadow-2xl flex items-center justify-center">
                            <div className="w-8 h-0.5 bg-white/40"></div>
                        </div>
                        <span className="mt-4 font-black text-white italic animate-pulse">BOWLING...</span>
                    </div>
                ) : landed !== null ? (
                    <div className="flex flex-col items-center animate-in zoom-in duration-500">
                        <div className={`w-32 h-32 rounded-full ${OUTCOMES.find(o=>o.val===landed)?.color} flex items-center justify-center border-4 border-white shadow-[0_0_50px_rgba(255,255,255,0.2)]`}>
                            <span className="text-5xl font-black italic">{landed === 0 ? 'W' : landed}</span>
                        </div>
                        <span className="mt-6 text-2xl font-black italic gold-text tracking-tighter uppercase">{landed === 0 ? 'WICKET!' : landed + ' RUNS!'}</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center opacity-30">
                        <div className="w-20 h-20 bg-slate-800 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center text-4xl">?</div>
                        <span className="mt-4 font-black text-sm uppercase tracking-widest">Awaiting Ball</span>
                    </div>
                )}
             </div>

             <div className="mt-10 flex gap-2 overflow-x-auto no-scrollbar py-2 w-full justify-center">
                {history.map((h, i) => (
                    <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border border-white/10 ${h === 0 ? 'bg-red-600' : h >= 4 ? 'bg-yellow-500 text-black' : 'bg-blue-600'}`}>{h === 0 ? 'W' : h}</span>
                ))}
             </div>
        </div>

        <div className="bg-[#0a0a0a] p-6 border-t border-white/10 pb-12 z-50 shadow-2xl">
             <div className="grid grid-cols-5 gap-2 mb-8">
                 {OUTCOMES.map(o => (
                     <button 
                        key={o.val}
                        onClick={() => status === 'IDLE' && setSelectedTarget(o.val)}
                        disabled={status !== 'IDLE'}
                        className={`h-24 rounded-2xl flex flex-col items-center justify-center transition-all border-b-4 active:scale-95 ${selectedTarget === o.val ? o.color + ' border-white/40 scale-105 shadow-xl' : 'bg-zinc-900 border-zinc-800 opacity-60'}`}
                     >
                         <span className="text-xl font-black italic">{o.val === 0 ? 'W' : o.val}</span>
                         <span className="text-[8px] font-black uppercase opacity-60">{o.mult}X</span>
                     </button>
                 ))}
             </div>
             <div className="flex gap-4">
                 <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {[10, 50, 100, 500].map(a => <button key={a} onClick={() => status === 'IDLE' && setBetAmount(a)} className={`px-5 py-3 rounded-2xl font-black text-xs border transition-all ${betAmount === a ? 'bg-white text-black border-white shadow-lg' : 'bg-zinc-800 text-zinc-600'}`}>₹{a}</button>)}
                 </div>
                 <button onClick={playBall} disabled={selectedTarget === null || status !== 'IDLE'} className="px-10 py-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-30 transition-all border-t-2 border-white/20">HIT</button>
             </div>
        </div>
        <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};

export default Cricket;
