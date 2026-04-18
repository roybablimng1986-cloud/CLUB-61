
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, RotateCw, History, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, db, auth, subscribeToJhandiMunda, subscribeToJhandiMundaBets, getClockOffset } from '../services/supabaseService';
import { GameResult, JhandiMundaState } from '../types';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, where, addDoc } from 'firebase/firestore';

import JhandiMundaResultPopup from '../components/JhandiMundaResultPopup';

const SYMBOLS = [
    { id: 'HEART', icon: '♥️', label: 'Heart' },
    { id: 'SPADE', icon: '♠️', label: 'Spade' },
    { id: 'DIAMOND', icon: '♦️', label: 'Diamond' },
    { id: 'CLUB', icon: '♣️', label: 'Club' },
    { id: 'FLAG', icon: '🚩', label: 'Flag' },
    { id: 'FACE', icon: '👤', label: 'Face' },
    { id: 'TIE', icon: '🎲', label: 'TIE' }
];

import { useStabilizedTimer } from '../hooks/useTimer';

const JhandiMunda: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [gameState, setGameState] = useState<JhandiMundaState | null>(null);
    const [betAmount, setBetAmount] = useState(10);
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const [myBets, setMyBets] = useState<any[]>([]);
    const [allBets, setAllBets] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
    const [isBettingLocked, setIsBettingLocked] = useState(false);
    const [rolling, setRolling] = useState(false);
    const [displayDice, setDisplayDice] = useState<string[]>(['🚩','🚩','🚩','🚩','🚩','🚩']);
    const [jmResult, setJmResult] = useState<any | null>(null);
    
    const timeLeft = useStabilizedTimer(gameState?.endTime);
  
  const isMounted = useRef(true);
  const resultHandledRef = useRef<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    
    const unsubState = subscribeToJhandiMunda((state) => {
        if (!isMounted.current) return;
        setGameState(state);

        if (state.status === 'BETTING') {
            setRolling(false);
            resultHandledRef.current = null;
        } else {
            setIsBettingLocked(true);
        }

        if (state.status === 'RESULT' && resultHandledRef.current !== state.period) {
            resultHandledRef.current = state.period;
            handleRollSequence(state);
        }
    });

    const unsubBets = subscribeToJhandiMundaBets((bets) => {
        setAllBets(bets);
        if (auth.currentUser) {
            setMyBets(bets.filter((b: any) => b.uid === auth.currentUser?.uid));
        }
    });

    return () => { isMounted.current = false; unsubState(); unsubBets(); stopAllSounds(); };
}, []);

useEffect(() => {
    if (gameState?.status === 'BETTING') {
        setIsBettingLocked(timeLeft <= 5);
        if (timeLeft <= 5 && timeLeft > 0) playSound('wingo_tick');
    }
}, [timeLeft, gameState?.status]);

if (!gameState) return <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center font-black gold-text text-xl italic uppercase tracking-widest">Entering Arena...</div>;

// Listen to bets for the current period
// Redundant - now handled by shared listener in first useEffect

  const handleRollSequence = async (state: JhandiMundaState) => {
    setRolling(true);
    playSound('wheel_spin');
    
    let count = 0;
    const interval = setInterval(() => {
        if (!isMounted.current) { clearInterval(interval); return; }
        setDisplayDice(Array.from({length: 6}, () => SYMBOLS[Math.floor(Math.random() * 6)].icon));
        count++;
        if (count > 20) {
            clearInterval(interval);
            setRolling(false);
            setDisplayDice(state.dice);
            const myCurrentBets = allBets.filter(b => b.uid === auth.currentUser?.uid);
            if (myCurrentBets.length > 0) {
                processMyResult(state, myCurrentBets);
            }
        }
    }, 100);
  };

  const processMyResult = (state: JhandiMundaState, currentBets: any[]) => {
    let totalWin = 0;
    let totalBet = 0;
    
    currentBets.forEach(bet => {
        totalBet += bet.amount;
        const targetIcon = SYMBOLS.find(s => s.id === bet.target)?.icon;
        const matches = state.dice.filter(d => d === targetIcon).length;
        
        if (bet.target === 'TIE') {
            const uniqueCount = new Set(state.dice).size;
            if (uniqueCount === 6) totalWin += bet.amount * 100;
        } else if (matches >= 1) {
            const mult = matches === 1 ? 1.5 : matches === 2 ? 3 : matches === 3 ? 5 : matches >= 4 ? 10 : 0;
            totalWin += bet.amount * mult;
        }
    });

    const isWin = totalWin > 0;
    const myTarget = currentBets[0]?.target;
    const targetIcon = SYMBOLS.find(s => s.id === myTarget)?.icon || '';
    const matches = state.dice.filter(d => d === targetIcon).length;

    setJmResult({
        win: isWin,
        amount: isWin ? totalWin : totalBet,
        period: state.period,
        dice: state.dice,
        matches: matches,
        target: targetIcon
    });

    if (isWin) {
        updateBalance(totalWin, 'WIN', 'Jhandi Munda Win');
    }
    addGameHistory('Jhandi Munda', totalBet, totalWin, `Period: ${state.period}`);
  };

  const handlePlaceBet = async () => {
    if (!selectedSymbol || !auth.currentUser || !gameState) return;
    if (userBalance < betAmount) { alert("Insufficient Balance!"); return; }

    try {
        const betData = {
            target: selectedSymbol,
            amount: betAmount,
            period: gameState.period,
        };

        await addGameBet('jhandi_munda_bets', betData);
        await updateBalance(-betAmount, 'BET', `Jhandi Munda on ${selectedSymbol}`);
        playSound('bet_place');
    } catch (e) {
        console.error("Bet error:", e);
    }
  };

  if (!gameState) return <div className="min-h-screen bg-black flex items-center justify-center font-black gold-text">Syncing Dice...</div>;

  return (
    <div className="bg-[#301934] min-h-screen flex flex-col font-sans text-white select-none overflow-x-hidden relative">
        <JhandiMundaResultPopup result={jmResult} onClose={() => setJmResult(null)} />
        {/* Header */}
        <div className="p-4 flex justify-between items-center bg-black/40 border-b border-purple-500/20 z-50">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
            <h1 className="text-xl font-black italic gold-text tracking-widest uppercase">JHANDI MUNDA</h1>
            <div className="bg-black/50 px-3 py-1.5 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono shadow-inner">₹{userBalance.toFixed(2)}</div>
        </div>

        {/* Game Content */}
        <div className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto no-scrollbar pb-96">
            
            {/* History (Top) */}
            <div className="w-full mb-4">
                <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
                    {gameState.history.map((h, i) => (
                        <span key={i} className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shadow-lg bg-white/5 border border-white/5`}>
                            {SYMBOLS[h]?.icon}
                        </span>
                    ))}
                </div>
            </div>

            {/* Timer & Status */}
            <div className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center font-black mb-8 ${gameState.status === 'BETTING' ? (isBettingLocked ? 'border-orange-500 text-orange-500' : 'border-green-500 text-green-500') : 'border-red-600 text-red-600 animate-pulse'}`}>
                <span className="text-[8px] uppercase opacity-60">Time</span>
                <span className="text-2xl font-mono leading-none">{timeLeft}</span>
            </div>

            {/* Dice Area */}
            <div className="grid grid-cols-3 gap-4 mb-10 bg-black/30 p-6 rounded-3xl border border-white/5 w-full max-w-md">
                {displayDice.map((d, i) => (
                    <motion.div 
                        key={i} 
                        animate={rolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.1, 1] } : { rotate: 0, scale: 1 }}
                        transition={rolling ? { repeat: Infinity, duration: 0.2 } : {}}
                        className={`w-full aspect-square bg-white rounded-2xl flex items-center justify-center text-4xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-b-4 border-slate-300`}
                    >
                        {d}
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
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-white/10 border border-white/5`}>
                                        {SYMBOLS.find(s => s.id === bet.target)?.icon}
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
            <div className="grid grid-cols-4 gap-2 mb-4">
                {SYMBOLS.map(s => (
                    <button 
                        key={s.id} 
                        onClick={() => setSelectedSymbol(s.id)} 
                        disabled={isBettingLocked || gameState.status !== 'BETTING'}
                        className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center relative overflow-hidden ${selectedSymbol === s.id ? 'bg-purple-600 border-white scale-105 shadow-lg' : 'bg-zinc-900 border-white/5 opacity-60'}`}
                    >
                        <span className="text-xl">{s.icon}</span>
                        <span className="text-[7px] font-black uppercase mt-1">{s.label}</span>
                        {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={14} className="text-white/20" /></div>}
                    </button>
                ))}
            </div>
            
            <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 flex-1">
                    {[10, 50, 100, 500, 1000, 5000].map(a => (
                        <button key={a} onClick={() => setBetAmount(a)} className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-[10px] transition-all ${betAmount === a ? 'bg-yellow-500 border-white text-black scale-110 shadow-2xl' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>₹{a >= 1000 ? (a/1000)+'K' : a}</button>
                    ))}
                </div>
                {selectedSymbol && gameState.status === 'BETTING' && !isBettingLocked && (
                    <button onClick={handlePlaceBet} className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-black text-xs uppercase animate-in slide-in-from-right">Place Bet</button>
                )}
            </div>
        </div>
        <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};
export default JhandiMunda;
