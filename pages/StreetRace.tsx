
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Zap, Trophy, History } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

const BIKES = [
    { id: 1, name: 'Hayabusa', color: '#ef4444', speed: 1.2 },
    { id: 2, name: 'Ninja H2', color: '#22c55e', speed: 1.3 },
    { id: 3, name: 'Ducati V4', color: '#eab308', speed: 1.1 },
    { id: 4, name: 'S1000RR', color: '#3b82f6', speed: 1.25 }
];

const StreetRace: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [gameState, setGameState] = useState<'IDLE' | 'RACING' | 'RESULT'>('IDLE');
  const [selectedBike, setSelectedBike] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [progress, setProgress] = useState<number[]>([0, 0, 0, 0]);
  const [winner, setWinner] = useState<number | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const startRace = () => {
    if (!selectedBike || userBalance < betAmount) return;
    updateBalance(-betAmount, 'BET', 'Street Race Stake');
    setGameState('RACING');
    playSound('spin');
    setProgress([0, 0, 0, 0]);

    const interval = setInterval(() => {
        if (!isMounted.current) { clearInterval(interval); return; }
        setProgress(prev => {
            const next = prev.map((p, i) => p + Math.random() * (BIKES[i].speed * 1.5));
            const wonIdx = next.findIndex(p => p >= 100);
            if (wonIdx !== -1) {
                clearInterval(interval);
                finalize(wonIdx + 1);
            }
            return next;
        });
    }, 50);
  };

  const finalize = (wonId: number) => {
    setWinner(wonId);
    setGameState('RESULT');
    const isWin = selectedBike === wonId;
    const winAmt = isWin ? betAmount * 3.8 : 0;

    if (isWin) {
        updateBalance(winAmt, 'WIN', 'Street Race Win');
        playSound('win');
    } else {
        playSound('loss');
    }

    onResult({ win: isWin, amount: isWin ? winAmt : betAmount, game: 'Street Race' });
    addGameHistory('Street Race', betAmount, winAmt, `Winner: Bike #${wonId}`);

    setTimeout(() => {
        if (isMounted.current) {
            setGameState('IDLE');
            setSelectedBike(null);
            setProgress([0,0,0,0]);
        }
    }, 4000);
  };

  return (
    <div className="bg-black min-h-screen flex flex-col font-sans text-white select-none overflow-hidden">
        <div className="p-4 flex justify-between items-center bg-[#111] border-b border-red-500/20">
            <button onClick={onBack} className="p-2 bg-zinc-800 rounded-xl"><ArrowLeft size={18}/></button>
            <h1 className="text-xl font-black italic gold-text tracking-tighter">STREET RACE</h1>
            <div className="text-yellow-500 font-mono text-sm">₹{userBalance.toFixed(2)}</div>
        </div>

        <div className="flex-1 p-6 relative flex flex-col justify-center gap-4 bg-[url('https://www.transparenttextures.com/patterns/asphalt-dark.png')]">
             {BIKES.map((bike, idx) => (
                 <div key={bike.id} className={`h-20 bg-zinc-900/80 rounded-2xl relative border-2 transition-all ${selectedBike === bike.id ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-white/5'}`}>
                     <div className="absolute top-0 left-0 h-full bg-white/5 rounded-2xl" style={{ width: `${progress[idx]}%` }}></div>
                     <div className="h-full flex items-center px-4 relative z-10">
                         <div className="w-10 font-black italic text-zinc-600">#{bike.id}</div>
                         <div className="flex-1 relative">
                             <div className="absolute transition-all duration-75" style={{ left: `calc(${progress[idx]}% - 40px)` }}>
                                 <div className={`w-12 h-8 rounded-lg flex items-center justify-center text-2xl shadow-xl ${gameState==='RACING'?'animate-bounce':''}`} style={{ backgroundColor: bike.color }}>🏍️</div>
                             </div>
                         </div>
                         {gameState === 'RESULT' && winner === bike.id && <Trophy size={20} className="text-yellow-500 animate-pulse" />}
                     </div>
                 </div>
             ))}
             {gameState === 'RACING' && <div className="absolute inset-0 bg-white/5 pointer-events-none animate-pulse"></div>}
        </div>

        <div className="bg-[#111] p-6 pb-12 border-t border-white/10">
            <div className="grid grid-cols-4 gap-2 mb-6">
                {BIKES.map(bike => (
                    <button key={bike.id} onClick={() => gameState==='IDLE' && setSelectedBike(bike.id)} className={`h-24 rounded-2xl border-b-4 flex flex-col items-center justify-center transition-all ${selectedBike === bike.id ? 'bg-red-600 border-red-800 scale-105' : 'bg-zinc-900 border-zinc-950 opacity-40'}`}>
                        <span className="text-xs font-black">#{bike.id}</span>
                        <span className="text-[10px] opacity-60">3.8X</span>
                    </button>
                ))}
            </div>
            <div className="flex gap-4">
                 <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar">
                    {[10, 100, 500, 1000].map(a => <button key={a} onClick={() => gameState==='IDLE' && setBetAmount(a)} className={`px-4 py-3 rounded-xl font-black text-xs border transition-all ${betAmount === a ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-600'}`}>₹{a}</button>)}
                 </div>
                 <button onClick={startRace} disabled={!selectedBike || gameState !== 'IDLE'} className="px-10 py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-30 border-t-2 border-white/20">NITRO START</button>
            </div>
        </div>
        <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};
export default StreetRace;
