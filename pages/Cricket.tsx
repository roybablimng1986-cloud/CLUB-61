
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Trophy, X, HelpCircle, History, Users, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, db, auth, subscribeToCricket, subscribeToCricketBets, addGameBet, getClockOffset } from '../services/supabaseService';
import { GameResult, CricketState } from '../types';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, where, addDoc } from 'firebase/firestore';

import CricketResultPopup from '../components/CricketResultPopup';
import HowToPlay from '../components/HowToPlay';
import { useStabilizedTimer } from '../hooks/useTimer';

const OUTCOMES = [
    { label: '1 Run', val: 1, mult: 2.1, color: 'bg-blue-600' },
    { label: '2 Runs', val: 2, mult: 4.2, color: 'bg-indigo-600' },
    { label: '4 Runs', val: 4, mult: 12.0, color: 'bg-purple-600' },
    { label: '6 Runs', val: 6, mult: 25.0, color: 'bg-yellow-500' },
    { label: 'Wicket', val: 0, mult: 60.0, color: 'bg-red-600' },
    { label: 'TIE', val: 7, mult: 10.0, color: 'bg-orange-600' }
];

const Cricket: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [gameState, setGameState] = useState<CricketState>({
    status: 'BETTING',
    period: new Date().getTime().toString().slice(-6),
    endTime: Date.now() + 25000,
    history: [1, 2, 4, 1, 0, 6, 1],
    landed: 1,
    timeLeft: 25
  });
  const [betAmount, setBetAmount] = useState(10);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [allBets, setAllBets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
  const [isBettingLocked, setIsBettingLocked] = useState(false);
  const [bowling, setBowling] = useState(false);
  const [landedResult, setLandedResult] = useState<number | null>(null);
  const [crResult, setCrResult] = useState<any | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  const timeLeft = useStabilizedTimer(gameState.endTime);
  
  const isMounted = useRef(true);

  // Initial Logic
  useEffect(() => {
    const mainInterval = setInterval(() => {
        if (gameState.status === 'BETTING') {
            if (Date.now() >= gameState.endTime) {
                setGameState(prev => ({ ...prev, status: 'RESULT' }));
                handleBowlingSequence();
            } else if (timeLeft <= 5) {
                setIsBettingLocked(true);
                if (timeLeft > 0) playSound('wingo_tick');
            }
        }
    }, 1000);
    return () => clearInterval(mainInterval);
  }, [gameState.status, gameState.endTime, timeLeft]);

  async function handleBowlingSequence() {
    setBowling(true);
    playSound('sports_kick');
    
    await new Promise(r => setTimeout(r, 4000));
    if (!isMounted.current) return;

    // Local result
    const landed = OUTCOMES[Math.floor(Math.random() * OUTCOMES.length)].val;
    setBowling(false);
    setLandedResult(landed);
    
    processMyResult(landed);

    await new Promise(r => setTimeout(r, 6000));
    if (isMounted.current) {
        const nextPeriod = (parseInt(gameState.period) + 1).toString();
        setGameState(prev => ({
            status: 'BETTING',
            period: nextPeriod,
            endTime: Date.now() + 25000,
            history: [landed, ...prev.history].slice(0, 20),
            landed: landed,
            timeLeft: 25
        }));
        setLandedResult(null);
        setMyBets([]);
        setAllBets([]);
        setIsBettingLocked(false);
        setCrResult(null);
        setSelectedTarget(null);
    }
  }

  function processMyResult(landed: number) {
    let totalWin = 0;
    let totalBet = 0;
    
    myBets.forEach(bet => {
        totalBet += bet.amount;
        if (bet.target === landed) {
            const outcome = OUTCOMES.find(o => o.val === landed);
            if (outcome) totalWin += bet.amount * outcome.mult;
        }
    });

    const isWin = totalWin > 0;
    if (isWin) {
        updateBalance(totalWin, 'WIN', 'Cricket Win');
    }

    if (totalBet > 0) {
        setCrResult({
            win: isWin,
            amount: totalWin,
            period: gameState.period,
            landed: landed,
            target: myBets[0]?.target
        });
        addGameHistory('Cricket Hero', totalBet, totalWin, `Period: ${gameState.period}`);
    }
  }

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const handlePlaceBet = async () => {
    if (selectedTarget === null || gameState.status !== 'BETTING' || isBettingLocked) return;
    if (userBalance < betAmount) { alert("Insufficient Balance!"); return; }

    try {
        const betData = {
            target: selectedTarget,
            amount: betAmount,
            period: gameState.period,
            uid: auth.currentUser?.uid,
            username: 'You',
            id: Date.now(),
            timestamp: Date.now()
        };

        setMyBets(prev => [...prev, betData]);
        setAllBets(prev => [betData, ...prev]);
        await updateBalance(-betAmount, 'BET', `Cricket on ${selectedTarget === 0 ? 'Wicket' : selectedTarget + ' Runs'}`);
        playSound('bet_place');
    } catch (e) {
        console.error("Bet error:", e);
    }
  };

  if (!gameState) return <div className="min-h-screen bg-black flex items-center justify-center font-black gold-text">Entering Stadium...</div>;

  return (
    <div className="bg-[#111] min-h-screen flex flex-col font-sans text-white select-none overflow-x-hidden relative">
        <CricketResultPopup result={crResult} onClose={() => setCrResult(null)} />
        <HowToPlay 
            isOpen={showHelp} 
            onClose={() => setShowHelp(false)} 
            title="Cricket Hero Rules"
            rules={[
                "Bet on the outcome of the next ball in the elite match.",
                "Options: 1 Run, 2 Runs, 4 Runs, 6 Runs, or WICKET.",
                "Wicket pays a high multiplier (60x) due to its rarity.",
                "6 Runs pays 25x, and 4 Runs pays 12x.",
                "Bets are closed 5 seconds before the bowler launches the ball."
            ]}
            payouts={[
                { label: "WICKET", value: "60x" },
                { label: "6 RUNS", value: "25x" },
                { label: "4 RUNS", value: "12x" },
                { label: "2 RUNS", value: "4.2x" },
                { label: "1 RUN", value: "2.1x" }
            ]}
        />
        {/* Header */}
        <div className="p-4 flex justify-between items-center bg-[#064e3b] border-b border-white/5 z-50 shadow-xl">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
                <div className="flex flex-col text-left">
                    <h1 className="text-xs font-black gold-text italic tracking-widest uppercase leading-none">CRICKET HERO</h1>
                    <span className="text-[8px] text-yellow-500/40 mt-1 uppercase font-bold">Pitch Wallet</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="bg-black/50 px-3 py-1.5 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono text-sm flex items-center gap-2">
                    <Wallet size={14} className="text-yellow-500" />
                    <span className="font-black">₹{userBalance.toFixed(2)}</span>
                </div>
                <button onClick={() => setShowHelp(true)} className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20 active:scale-90"><HelpCircle size={18}/></button>
            </div>
        </div>

        {/* Game Content */}
        <div className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto no-scrollbar pb-80">
            {gameState.status === 'BETTING' && (
                <div className="w-full bg-black/40 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-[9px] text-slate-400 leading-relaxed max-w-sm mb-4">
                    <h4 className="font-black gold-text mb-1 uppercase tracking-widest text-[10px]">Stadium Guide</h4>
                    <p>1. Predict the outcome of the next delivery.<br/>2. Wicket (W) pays a massive 60.0x!<br/>3. Boundaries (4s, 6s) pay up to 25.0x.<br/>4. Secure your innings before the bowler runs in.</p>
                </div>
            )}
            
            {/* History (Top) */}
            <div className="w-full mb-4">
                <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
                    {gameState.history.map((h, i) => (
                        <span key={i} className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg border border-white/5 ${h === 0 ? 'bg-red-600' : h >= 4 ? 'bg-yellow-500 text-black' : 'bg-blue-600'}`}>
                            {h === 0 ? 'W' : h}
                        </span>
                    ))}
                </div>
            </div>

            {/* Main Pitch */}
            <div className="w-full max-w-sm aspect-video bg-[#064e3b] rounded-[2rem] border-8 border-white/10 shadow-[0_0_100px_rgba(5,150,105,0.2)] flex flex-col items-center justify-center relative overflow-hidden mb-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.05)_0%,_transparent_70%)]"></div>
                
                {bowling ? (
                    <motion.div 
                        initial={{ scale: 0.5, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        className="flex flex-col items-center"
                    >
                        <div className="w-12 h-12 bg-red-600 rounded-full border-2 border-red-400 shadow-2xl flex items-center justify-center animate-spin">
                            <div className="w-10 h-0.5 bg-white/40"></div>
                        </div>
                        <span className="mt-4 font-black text-white italic tracking-widest animate-pulse">BOWLING...</span>
                    </motion.div>
                ) : landedResult !== null ? (
                    <motion.div 
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="flex flex-col items-center"
                    >
                        <div className={`w-32 h-32 rounded-full ${OUTCOMES.find(o=>o.val===landedResult)?.color} flex items-center justify-center border-4 border-white shadow-[0_0_50px_rgba(255,255,255,0.3)]`}>
                            <span className="text-6xl font-black italic">{landedResult === 0 ? 'W' : landedResult}</span>
                        </div>
                        <span className="mt-6 text-3xl font-black italic gold-text tracking-tighter uppercase">{landedResult === 0 ? 'WICKET!' : landedResult + ' RUNS!'}</span>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center opacity-30">
                        <div className="text-4xl font-black italic tracking-widest mb-2">{timeLeft}s</div>
                        <span className="font-black text-[10px] uppercase tracking-[0.5em]">Awaiting Ball</span>
                    </div>
                )}
            </div>

            {/* Live Bets Display */}
            <div className="w-full mt-6 flex-1 flex flex-col min-h-[300px]">
                <div className="flex border-b border-white/5">
                    <button onClick={() => setActiveTab('ALL')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ALL' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-zinc-500'}`}>All Batsmen ({allBets.length})</button>
                    <button onClick={() => setActiveTab('MY')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MY' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-zinc-500'}`}>My Innings ({myBets.length})</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {(activeTab === 'ALL' ? allBets : myBets).map((bet, idx) => (
                            <motion.div 
                                key={bet.id || `cri-bet-${idx}-${bet.uid}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] bg-black/20 border border-white/5`}>
                                        {bet.target === 0 ? 'W' : bet.target}
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
        <div className="fixed bottom-0 left-0 w-full bg-[#0a0a0a] p-4 pb-10 border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,1)] z-[60]">
            <div className="grid grid-cols-6 gap-2 mb-4">
                {OUTCOMES.map(o => (
                    <button 
                        key={o.val} 
                        onClick={() => setSelectedTarget(o.val)} 
                        disabled={isBettingLocked || gameState.status !== 'BETTING'}
                        className={`h-16 rounded-xl flex flex-col items-center justify-center transition-all border-2 active:scale-95 relative overflow-hidden ${selectedTarget === o.val ? o.color + ' border-white scale-105 shadow-lg' : 'bg-zinc-900 border-white/5 opacity-60'}`}
                    >
                        <span className="text-xl font-black italic">{o.val === 0 ? 'W' : o.val === 7 ? 'T' : o.val}</span>
                        <span className="text-[7px] font-black opacity-60">{o.mult}X</span>
                        {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={12} className="text-white/20" /></div>}
                    </button>
                ))}
            </div>
            
            <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 flex-1">
                    {[10, 50, 100, 500, 1000].map(a => (
                        <button key={a} onClick={() => setBetAmount(a)} className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-[10px] transition-all ${betAmount === a ? 'bg-yellow-500 border-white text-black scale-110 shadow-2xl' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>₹{a >= 1000 ? (a/1000)+'K' : a}</button>
                    ))}
                </div>
                {selectedTarget !== null && gameState.status === 'BETTING' && !isBettingLocked && (
                    <button onClick={handlePlaceBet} className="bg-yellow-500 text-black px-8 py-3 rounded-xl font-black text-xs uppercase animate-in slide-in-from-right shadow-lg">Place Bet</button>
                )}
            </div>
        </div>
        <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};
export default Cricket;
