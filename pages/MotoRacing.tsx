
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Timer, Trophy, History, Zap } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

const Superbike = ({ color, isRacing }: { color: string, isRacing: boolean }) => (
  <div className={`relative transition-transform duration-300 ${isRacing ? 'rotate-[-8deg] scale-110' : ''}`}>
    <svg width="60" height="40" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Wheels */}
        <circle cx="12" cy="36" r="8" fill="#111" stroke="#333" strokeWidth="2" />
        <circle cx="52" cy="36" r="8" fill="#111" stroke="#333" strokeWidth="2" />
        <circle cx="12" cy="36" r="4" fill="#222" />
        <circle cx="52" cy="36" r="4" fill="#222" />
        
        {/* Fairing/Body - Ninja Style */}
        <path d="M12 36L20 20H45L52 36H45L40 28H24L20 36H12Z" fill={color} />
        <path d="M20 20L25 8H45L48 18L45 20H20Z" fill={color} />
        <path d="M45 8L55 18L52 24L42 12L45 8Z" fill={color} opacity="0.6" />
        
        {/* Seat / Tank */}
        <path d="M25 15C25 15 30 10 38 10C45 10 46 15 46 15L45 20H24L25 15Z" fill="#222" />
        
        {/* Windshield */}
        <path d="M45 8L48 12L44 14L41 10L45 8Z" fill="#add8e6" opacity="0.4" />
        
        {/* Highlights */}
        <path d="M22 22H40" stroke="white" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
        
        {/* Speed lines when racing */}
        {isRacing && (
            <g opacity="0.6">
                <path d="M0 24H8" stroke="white" strokeWidth="1" />
                <path d="M-5 28H5" stroke="white" strokeWidth="1" />
            </g>
        )}
    </svg>
  </div>
);

const MotoRacing: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [gameState, setGameState] = useState<'BETTING' | 'RACING' | 'RESULT'>('BETTING');
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedBike, setSelectedBike] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [betPlaced, setBetPlaced] = useState(false);
  const [bikePositions, setBikePositions] = useState<number[]>(new Array(6).fill(0));
  const [winner, setWinner] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  const raceInterval = useRef<number | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    setHistory(Array.from({ length: 10 }, () => Math.floor(Math.random() * 6) + 1));
    startNewRound();
    return () => { isMounted.current = false; if (raceInterval.current) clearInterval(raceInterval.current); stopAllSounds(); };
  }, []);

  const startNewRound = () => {
    if (!isMounted.current) return;
    setGameState('BETTING'); setTimeLeft(10); setBikePositions(new Array(6).fill(0));
    setWinner(null); setSelectedBike(null); setBetPlaced(false);
  };

  useEffect(() => {
    if (gameState === 'BETTING' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'BETTING' && timeLeft === 0) {
      startRace();
    }
  }, [timeLeft, gameState]);

  const placeBet = () => {
    if (!selectedBike || betPlaced || userBalance < betAmount) return;
    updateBalance(-betAmount, 'BET', `Bike ${selectedBike}`);
    setBetPlaced(true);
    playSound('click');
  };

  const startRace = () => {
    setGameState('RACING');
    // FIX: Changed invalid sound name 'spin' to 'race_rev'
    playSound('race_rev');
    const interval = window.setInterval(() => {
      setBikePositions(prev => {
        const next = [...prev];
        let won = -1;
        for (let i = 0; i < 6; i++) {
          next[i] += 0.4 + Math.random() * 1.4;
          if (next[i] >= 85) { won = i + 1; break; }
        }
        if (won !== -1) { clearInterval(interval); finishRace(won); return prev; }
        return next;
      });
    }, 50);
    raceInterval.current = interval;
  };

  const finishRace = (bikeNum: number) => {
    setGameState('RESULT'); setWinner(bikeNum);
    setHistory(prev => [bikeNum, ...prev].slice(0, 10));
    const win = betPlaced && selectedBike === bikeNum;
    const winAmount = win ? betAmount * 5 : 0;
    if (win) { updateBalance(winAmount, 'WIN', 'Moto Racing Win'); playSound('win'); } else if (betPlaced) playSound('loss');
    onResult({ win, amount: win ? winAmount : betAmount, game: 'Moto Racing', resultDetails: [{label: 'Winner', value: `Bike ${bikeNum}`}] });
    addGameHistory('Moto Racing', betPlaced ? betAmount : 0, winAmount, `Bike ${bikeNum} Won`);
    setTimeout(() => isMounted.current && startNewRound(), 4000);
  };

  return (
    <div className="bg-black min-h-screen flex flex-col text-white font-sans overflow-hidden">
      <div className="p-4 flex justify-between items-center bg-[#111] border-b border-white/5 z-50 shadow-2xl">
        <button onClick={onBack} className="p-2 bg-zinc-900 rounded-xl active:scale-90"><ArrowLeft size={20}/></button>
        <h1 className="text-xl font-black gold-text italic tracking-widest uppercase">MOTO GP ELITE</h1>
        <div className="bg-zinc-900 px-4 py-1.5 rounded-xl border border-yellow-500/20 text-yellow-500 font-mono text-sm">₹{userBalance.toFixed(2)}</div>
      </div>

      <div className="flex-1 bg-[#111] p-4 flex flex-col gap-2 relative overflow-hidden justify-center bg-[url('https://www.transparenttextures.com/patterns/asphalt-dark.png')]">
        {[1,2,3,4,5,6].map((bike, idx) => (
          <div key={bike} className="h-16 bg-zinc-900/60 rounded-xl relative flex items-center overflow-hidden border border-white/5 shadow-inner backdrop-blur-sm">
            <div className="w-12 h-full flex items-center justify-center font-black bg-zinc-800 italic z-10 text-xl border-r border-white/5">#{bike}</div>
            <div className="absolute transition-all duration-75 ease-linear" style={{ left: `calc(48px + ${bikePositions[idx]}%)`, top: '50%', transform: 'translateY(-50%)' }}>
              <Superbike color={COLORS[idx]} isRacing={gameState === 'RACING'} />
            </div>
            <div className="absolute right-0 h-full w-16 flex flex-wrap opacity-20">
                {Array.from({length: 16}).map((_, i) => <div key={i} className={`w-4 h-4 ${ (Math.floor(i/4) + (i%4)) % 2 === 0 ? 'bg-white' : 'bg-black'}`}></div>)}
            </div>
            <div className="absolute right-0 h-full w-1.5 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"></div>
          </div>
        ))}
        {gameState === 'BETTING' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                <div className="w-28 h-28 rounded-full border-4 border-yellow-500 flex flex-col items-center justify-center bg-black/90 shadow-[0_0_50px_rgba(234,179,8,0.5)]">
                    <Timer size={36} className="text-yellow-500 mb-1" />
                    <span className="text-3xl font-black font-mono tracking-tighter">{timeLeft}s</span>
                </div>
            </div>
        )}
      </div>

      <div className="bg-zinc-950 p-6 pb-10 border-t border-white/10 z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
        <div className="flex justify-between items-center mb-6 px-2">
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em]">Racing History</span>
            <div className="flex gap-1.5">
                {history.map((h, i) => <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border border-white/10 shadow-lg`} style={{ backgroundColor: COLORS[h-1] }}>{h}</span>)}
            </div>
        </div>
        <div className="grid grid-cols-6 gap-2 mb-8">
            {[1,2,3,4,5,6].map(bike => (
                <button 
                  key={bike} 
                  disabled={gameState !== 'BETTING' || betPlaced} 
                  onClick={() => setSelectedBike(bike)} 
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-b-4 transition-all active:scale-95 ${selectedBike === bike ? 'bg-yellow-500 border-yellow-700 text-black scale-110 shadow-xl' : 'bg-zinc-900 border-zinc-800 text-zinc-500 opacity-60'}`}
                >
                    <span className="text-2xl font-black italic">#{bike}</span>
                    <span className="text-[9px] font-black uppercase opacity-60">5X</span>
                </button>
            ))}
        </div>
        <div className="flex gap-4">
             <div className="flex-1 bg-black/40 p-2 rounded-2xl flex gap-2 overflow-x-auto no-scrollbar border border-white/5">
                {[10, 50, 100, 500, 1000].map(amt => (
                    <button key={amt} onClick={() => !betPlaced && setBetAmount(amt)} className={`px-5 py-2.5 rounded-xl text-[11px] font-black transition-all ${betAmount === amt ? 'bg-white text-black shadow-lg' : 'bg-zinc-800 text-zinc-500'}`}>₹{amt}</button>
                ))}
             </div>
             <button onClick={placeBet} disabled={!selectedBike || gameState !== 'BETTING' || betPlaced} className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs border-t-2 border-white/10 shadow-2xl transition-all active:scale-90 ${betPlaced ? 'bg-green-600 text-white' : 'bg-yellow-500 text-black shadow-yellow-900/20'}`}>
                {betPlaced ? 'STAKED' : 'PLACE STAKE'}
             </button>
        </div>
      </div>
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};

export default MotoRacing;
