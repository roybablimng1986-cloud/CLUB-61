
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, RotateCw, History, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, db, auth, subscribeToCarRoulette, subscribeToCarRouletteBets, getClockOffset } from '../services/supabaseService';
import { GameResult, CarRouletteState } from '../types';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, where, addDoc } from 'firebase/firestore';

import CarRouletteResultPopup from '../components/CarRouletteResultPopup';

const BRANDS = [
    { id: 'FERRARI', icon: 'https://www.car-logos.org/wp-content/uploads/2011/09/ferrari.png', mult: 40, color: 'bg-red-600', label: 'Ferrari' },
    { id: 'LAMBO', icon: 'https://www.car-logos.org/wp-content/uploads/2011/09/lamborghini.png', mult: 30, color: 'bg-yellow-600', label: 'Lambo' },
    { id: 'TIE', icon: 'https://cdn-icons-png.flaticon.com/512/3229/3229649.png', mult: 100, color: 'bg-green-600', label: 'TIE / DRAW' },
    { id: 'BMW', icon: 'https://www.car-logos.org/wp-content/uploads/2011/09/bmw.png', mult: 5, color: 'bg-blue-600', label: 'BMW' },
    { id: 'BENZ', icon: 'https://www.car-logos.org/wp-content/uploads/2011/09/mercedes.png', mult: 5, color: 'bg-zinc-600', label: 'Benz' },
    { id: 'AUDI', icon: 'https://www.car-logos.org/wp-content/uploads/2011/09/audi.png', mult: 5, color: 'bg-zinc-800', label: 'Audi' },
    { id: 'TESLA', icon: 'https://www.car-logos.org/wp-content/uploads/2011/09/tesla.png', mult: 5, color: 'bg-red-800', label: 'Tesla' }
];

const CarRoulette: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [gameState, setGameState] = useState<CarRouletteState | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [allBets, setAllBets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
  const [isBettingLocked, setIsBettingLocked] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [crResult, setCrResult] = useState<any | null>(null);
  
  const [timeLeft, setTimeLeft] = useState(0);
  
  const isMounted = useRef(true);
  const resultHandledRef = useRef<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    
    const unsubState = subscribeToCarRoulette((state) => {
        if (!isMounted.current) return;
        setGameState(state);

        if (state.status === 'BETTING') {
            setSpinning(false);
            resultHandledRef.current = null;
        } else {
            setIsBettingLocked(true);
        }

        if (state.status === 'RESULT' && resultHandledRef.current !== state.period) {
            resultHandledRef.current = state.period;
            handleSpinSequence(state);
        }
    });

    const unsubBets = subscribeToCarRouletteBets((bets) => {
        setAllBets(bets);
        if (auth.currentUser) {
            setMyBets(bets.filter((b: any) => b.uid === auth.currentUser?.uid));
        }
    });

    return () => { isMounted.current = false; unsubState(); unsubBets(); stopAllSounds(); };
}, []);

useEffect(() => {
    const timer = setInterval(() => {
        if (gameState?.endTime) {
            const remaining = Math.max(0, Math.floor((gameState.endTime - (Date.now() + getClockOffset())) / 1000));
            setTimeLeft(remaining);
            if (gameState.status === 'BETTING') {
                setIsBettingLocked(remaining <= 5);
                if (remaining <= 5 && remaining > 0) playSound('wingo_tick');
            }
        }
    }, 1000);
    return () => clearInterval(timer);
}, [gameState?.endTime, gameState?.status]);

if (!gameState) return <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center font-black gold-text text-xl italic uppercase tracking-widest">Entering Arena...</div>;

// Listen to bets for the current period
// Redundant - now handled by shared listener in first useEffect

  const handleSpinSequence = async (state: CarRouletteState) => {
    setSpinning(true);
    playSound('wheel_spin');
    
    let current = activeIdx;
    let speed = 50;
    const finalIdx = state.resultIdx || 0;
    let rounds = 30 + finalIdx;

    const run = () => {
        if (!isMounted.current) return;
        setActiveIdx(current % BRANDS.length);
        current++;
        rounds--;
        if (rounds > 0) {
            speed += 5;
            setTimeout(run, speed);
        } else {
            setSpinning(false);
            setActiveIdx(finalIdx);
            const myCurrentBets = allBets.filter(b => b.uid === auth.currentUser?.uid);
            if (myCurrentBets.length > 0) {
                processMyResult(state, myCurrentBets);
            }
        }
    };
    run();
  };

  const processMyResult = (state: CarRouletteState, currentBets: any[]) => {
    const resultBrand = BRANDS[state.resultIdx || 0];
    let totalWin = 0;
    let totalBet = 0;
    
    currentBets.forEach(bet => {
        totalBet += bet.amount;
        if (bet.target === resultBrand.id) {
            totalWin += bet.amount * resultBrand.mult;
        }
    });

    const isWin = totalWin > 0;
    setCrResult({
        win: isWin,
        amount: isWin ? totalWin : totalBet,
        period: state.period,
        winner: resultBrand,
        target: currentBets.map(b => b.target).join(', ')
    });
    
    if (isWin) {
        updateBalance(totalWin, 'WIN', 'Car Roulette Win');
    }
    addGameHistory('Car Roulette', totalBet, totalWin, `Period: ${state.period}`);
  };

  const handlePlaceBet = async () => {
    if (!selectedBrand || !auth.currentUser || !gameState) return;
    if (userBalance < betAmount) { alert("Insufficient Balance!"); return; }

    try {
        const betData = {
            target: selectedBrand,
            amount: betAmount,
            period: gameState.period,
        };

        await addGameBet('car_roulette_bets', betData);
        await updateBalance(-betAmount, 'BET', `Car Roulette on ${selectedBrand}`);
        playSound('bet_place');
    } catch (e) {
        console.error("Bet error:", e);
    }
  };

  if (!gameState) return <div className="min-h-screen bg-black flex items-center justify-center font-black gold-text">Syncing Engines...</div>;

  return (
    <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white select-none overflow-x-hidden relative">
        <CarRouletteResultPopup result={crResult} onClose={() => setCrResult(null)} />
        {/* Header */}
        <div className="p-4 flex justify-between items-center bg-[#111] border-b border-zinc-800 z-50">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
            <h1 className="text-xl font-black italic gold-text tracking-widest uppercase">CAR ROULETTE</h1>
            <div className="bg-black/50 px-3 py-1.5 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono shadow-inner">₹{userBalance.toFixed(2)}</div>
        </div>

        {/* Game Content */}
        <div className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto no-scrollbar pb-96">
            
            {/* History (Top) */}
            <div className="w-full mb-4">
                <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
                    {gameState.history.map((h, i) => (
                        <span key={i} className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center p-1 shadow-lg bg-zinc-800 border border-white/5`}>
                            <img src={BRANDS[parseInt(h)]?.icon} alt="car" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        </span>
                    ))}
                </div>
            </div>

            {/* Timer & Status */}
            <div className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center font-black mb-8 ${gameState.status === 'BETTING' ? (isBettingLocked ? 'border-orange-500 text-orange-500' : 'border-green-500 text-green-500') : 'border-red-600 text-red-600 animate-pulse'}`}>
                <span className="text-[8px] uppercase opacity-60">Time</span>
                <span className="text-2xl font-mono leading-none">{timeLeft}</span>
            </div>

            {/* Roulette Wheel */}
            <div className="grid grid-cols-3 gap-3 mb-10 w-full max-w-md">
                {BRANDS.map((b, i) => (
                    <motion.div 
                        key={b.id} 
                        animate={activeIdx === i ? { scale: 1.1, filter: 'brightness(1.5)' } : { scale: 1, filter: 'brightness(1)' }}
                        className={`h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center relative overflow-hidden p-2 ${activeIdx === i ? 'bg-yellow-500 border-white shadow-[0_0_30px_rgba(234,179,8,0.5)] z-10' : 'bg-zinc-900 border-white/5 opacity-40'}`}
                    >
                        <img src={b.icon} alt={b.label} className="w-12 h-12 object-contain mb-1" referrerPolicy="no-referrer" />
                        <span className="text-[10px] font-black text-white/80">{b.mult}X</span>
                        {activeIdx === i && <motion.div layoutId="active-glow" className="absolute inset-0 bg-white/20 animate-pulse" />}
                    </motion.div>
                ))}
            </div>

            {/* Live Bets Display */}
            <div className="w-full mt-6 flex-1 flex flex-col min-h-[300px]">
                <div className="flex border-b border-white/5">
                    <button onClick={() => setActiveTab('ALL')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ALL' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-zinc-500'}`}>All Bets ({allBets.length})</button>
                    <button onClick={() => setActiveTab('MY')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MY' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-zinc-500'}`}>My Bets ({myBets.length})</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {(activeTab === 'ALL' ? allBets : myBets).map((bet) => (
                            <motion.div 
                                key={bet.id || bet.uid}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center p-1 bg-zinc-800 border border-white/5`}>
                                        <img src={BRANDS.find(b => b.id === bet.target)?.icon} alt="car" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase">{bet.username || 'Player'}</div>
                                        <div className="text-[8px] text-zinc-500">{new Date(bet.timestamp).toLocaleTimeString()}</div>
                                    </div>
                                </div>
                                <div className="text-sm font-black text-yellow-500">₹{bet.amount}</div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>

        {/* Betting Controls */}
        <div className="fixed bottom-0 left-0 w-full bg-[#111] p-4 pb-10 border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,1)] z-[60]">
            <div className="grid grid-cols-3 gap-2 mb-4">
                {BRANDS.map(b => (
                    <button 
                        key={b.id + 'bet'} 
                        onClick={() => setSelectedBrand(b.id)} 
                        disabled={isBettingLocked || gameState.status !== 'BETTING'}
                        className={`py-3 rounded-xl font-black text-[10px] border-2 transition-all relative overflow-hidden ${selectedBrand === b.id ? 'bg-blue-600 border-white scale-105 shadow-lg' : 'bg-slate-800 border-white/5 opacity-60'}`}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <img src={b.icon} alt={b.label} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                            <span className="text-[8px] font-black">{b.label}</span>
                            <span className="text-[7px] opacity-60">{b.mult}X</span>
                        </div>
                        {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={16} className="text-white/20" /></div>}
                    </button>
                ))}
            </div>
            
            <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 flex-1">
                    {[10, 50, 100, 500, 1000, 5000].map(a => (
                        <button 
                            key={a} 
                            onClick={() => setBetAmount(a)} 
                            className={`flex-shrink-0 w-14 h-14 rounded-full border-4 flex flex-col items-center justify-center font-black text-[9px] transition-all relative overflow-hidden ${betAmount === a ? 'bg-yellow-500 border-white text-black scale-110 shadow-[0_0_20px_rgba(234,179,8,0.6)]' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}
                        >
                            <div className={`absolute inset-0 opacity-20 bg-[radial-gradient(circle,transparent_40%,black_100%)]`} />
                            <span className="z-10">₹{a >= 1000 ? (a/1000)+'K' : a}</span>
                            <div className="w-full h-1 bg-white/20 absolute bottom-2" />
                        </button>
                    ))}
                </div>
                {selectedBrand && gameState.status === 'BETTING' && !isBettingLocked && (
                    <button onClick={handlePlaceBet} className="bg-yellow-500 text-black px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-transform">Place Bet</button>
                )}
            </div>
        </div>
        <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};
export default CarRoulette;
