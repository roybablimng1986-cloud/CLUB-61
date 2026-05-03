
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Minus, Info, HelpCircle, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, subscribeToSevenUpDown, subscribeToSevenUpDownBets, getClockOffset, addGameBet } from '../services/supabaseService';
import { GameResult } from '../types';
import { db, auth } from '../services/supabaseService';
import { doc, onSnapshot, setDoc, getDoc, collection, query, where, limit, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';

const CYCLE_DURATION = 40000; // 40s total
const BETTING_TIME = 25000;   // 25s to bet
const LOCKOUT_TIME = 5000;    // 5s lockout
const ROLLING_TIME = 5000;    // 5s rolling animation
const RESULT_TIME = 5000;     // 5s result display

import SevenUpDownResultPopup from '../components/SevenUpDownResultPopup';
import { useStabilizedTimer } from '../hooks/useTimer';
import HowToPlay from '../components/HowToPlay';

const SevenUpDown: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [gameState, setGameState] = useState<any>({
    status: 'BETTING',
    period: new Date().getTime().toString().slice(-6),
    endTime: Date.now() + 30000,
    dice: [1, 1],
    history: [2, 7, 5, 12, 10]
  });
  const [betAmount, setBetAmount] = useState(100);
  const [selectedTarget, setSelectedTarget] = useState<'DOWN' | 'SEVEN' | 'UP' | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [dice, setDice] = useState([1, 1]);
  const [history, setHistory] = useState<number[]>([]);
  const [suResult, setSuResult] = useState<any | null>(null);
  
  const timeLeft = useStabilizedTimer(gameState.endTime);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
  const [allBets, setAllBets] = useState<any[]>([]);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string>(gameState.period);
  const [phase, setPhase] = useState<'BETTING' | 'RESULT' | 'ROLLING'>('BETTING');
  const [showHelp, setShowHelp] = useState(false);
  const [isBetting, setIsBetting] = useState(false);
  
  const isMounted = useRef(true);

  // Initial Logic
  useEffect(() => {
    setHistory(gameState.history);
    const mainInterval = setInterval(() => {
        if (gameState.status === 'BETTING') {
            if (Date.now() >= gameState.endTime) {
                setGameState(prev => ({ ...prev, status: 'ROLLING' }));
                handleRollSequence();
            } else if (timeLeft <= 3) {
                setIsLocked(true);
            }
            if (timeLeft <= 5 && timeLeft > 0) playSound('wingo_tick');
        }
    }, 1000);
    return () => clearInterval(mainInterval);
  }, [gameState.status, gameState.endTime, timeLeft]);

  async function handleRollSequence() {
    setIsRolling(true);
    playSound('wheel_spin');
    
    // Pre-calculate the result
    const finalD1 = Math.floor(Math.random() * 6) + 1;
    const finalD2 = Math.floor(Math.random() * 6) + 1;
    const sum = finalD1 + finalD2;
    const outcome = sum < 7 ? 'DOWN' : sum > 7 ? 'UP' : 'SEVEN';

    // Dice randomization animation
    let rollCount = 0;
    const rollInterval = setInterval(() => {
        setDice([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
        rollCount++;
        if (rollCount >= 20) {
            clearInterval(rollInterval);
            setDice([finalD1, finalD2]);
        }
    }, 150);

    await new Promise(r => setTimeout(r, 4000));
    if (!isMounted.current) return;

    setDice([finalD1, finalD2]);
    setIsRolling(false);
    setPhase('RESULT');
    playSound('dt_card');

    processResult(sum, outcome, [finalD1, finalD2]);

    await new Promise(r => setTimeout(r, 6000));
    if (isMounted.current) {
        const nextPeriod = (parseInt(gameState.period) + 1).toString();
        setGameState(prev => ({
            status: 'BETTING',
            period: nextPeriod,
            endTime: Date.now() + 30000,
            dice: [finalD1, finalD2],
            history: [sum, ...prev.history].slice(0, 20)
        }));
        setHistory(prev => [sum, ...prev].slice(0, 20));
        setCurrentRoundId(nextPeriod);
        setPhase('BETTING');
        setIsLocked(false);
        setMyBets([]);
        setAllBets([]);
        setSuResult(null);
    }
  }

  function processResult(sum: number, outcome: string, finalDice: number[]) {
    let totalWin = 0;
    let totalBet = 0;
    
    myBets.forEach(bet => {
        totalBet += bet.amount;
        if (bet.target === outcome) {
            const mult = outcome === 'SEVEN' ? 3 : 2;
            totalWin += bet.amount * mult;
        }
    });

    if (totalWin > 0) {
        updateBalance(totalWin, 'WIN', '7 Up Down Win');
    }

    if (totalBet > 0) {
        setSuResult({
            win: totalWin > 0,
            amount: totalWin,
            period: gameState.period,
            dice: finalDice,
            sum: sum,
            target: myBets.map(b => b.target).join(', ')
        });
        addGameHistory('7 Up Down', totalBet, totalWin, `Landed ${sum} | Period: ${gameState.period}`);
    }
  }

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

    const handleConfirmBet = async () => {
        if (!selectedTarget || isLocked || betAmount > userBalance || phase !== 'BETTING' || isBetting) return;
        
        setIsBetting(true);
        try {
            const betData = {
                amount: betAmount,
                target: selectedTarget,
                period: gameState.period,
                uid: auth.currentUser?.uid,
                username: 'You',
                id: Date.now()
            };
            setMyBets(prev => [...prev, betData]);
            setAllBets(prev => [betData, ...prev]);
            await updateBalance(-betAmount, 'BET', `7 Up Down: ${selectedTarget}`);
            playSound('bet_place');
        } catch (e) {
            console.error(e);
        } finally {
            setIsBetting(false);
        }
    };

    const handleCancelLastBet = async () => {
        if (myBets.length === 0 || isLocked || phase !== 'BETTING') return;
        const lastBet = myBets[myBets.length - 1];
        setMyBets(prev => prev.slice(0, -1));
        setAllBets(prev => prev.filter(b => b.id !== lastBet.id));
        await updateBalance(lastBet.amount, 'WIN', 'Bet Cancelled');
        playSound('click');
    };

    const adjustBet = (amt: number) => {
    if (isLocked) return;
    setBetAmount(prev => Math.max(10, prev + amt));
    playSound('click');
  };

  const handleManualBetChange = (val: string) => {
    if (isLocked) return;
    const num = parseInt(val.replace(/[^0-9]/g, '')) || 0;
    setBetAmount(num);
  };

  return (
    <div className="h-screen flex flex-col font-sans text-white select-none relative overflow-hidden" 
         style={{ 
            backgroundColor: '#4a0404',
            backgroundImage: `radial-gradient(circle at center, #800000 0%, #4a0404 100%), url("https://www.transparenttextures.com/patterns/damask.png")`,
            backgroundBlendMode: 'overlay'
         }}>
        <SevenUpDownResultPopup result={suResult} onClose={() => setSuResult(null)} />
        <HowToPlay 
            isOpen={showHelp} 
            onClose={() => setShowHelp(false)} 
            title="7 Up Down Rules"
            rules={[
                "Two dice are rolled. Predict if the sum will be UNDER 7 (2-6), EQUAL to 7, or OVER 7 (8-12).",
                "Winner payout: Under 7 pays 2x, Over 7 pays 2x, 7 pays 3x.",
                "Place your bets while the dice are sitting idle."
            ]}
            payouts={[
                { label: "Under 7 (2-6)", value: "2x" },
                { label: "Over 7 (8-12)", value: "2x" },
                { label: "Exactly 7", value: "3x" }
            ]}
        />
        
        {/* Header */}
        <div className="p-4 flex justify-between items-center relative z-10 shrink-0">
            <button onClick={onBack} className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center border border-white/10 active:scale-90 shadow-lg">
                <ArrowLeft size={20} />
            </button>
            <div className="flex gap-4">
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
                    <img src="https://cdn-icons-png.flaticon.com/512/2489/2489756.png" className="w-4 h-4" alt="coins" referrerPolicy="no-referrer" />
                    <span className="text-xs font-black">{userBalance.toLocaleString()}</span>
                </div>
            </div>
        </div>

        {/* Game Content */}
        <div className="flex-1 flex flex-col items-center justify-start p-4 pt-0 relative z-10 overflow-hidden">
            
            {/* History (Scrollable) */}
            <div className="w-full mb-4 shrink-0 overflow-x-auto no-scrollbar">
                <div className="flex gap-2 justify-start px-2 min-w-max flex-row-reverse">
                    {history.map((h, i) => (
                        <div key={`${i}-${h}`} className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-[10px] font-black border-2 rounded-lg shadow-lg ${h < 7 ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : h > 7 ? 'bg-red-600/20 border-red-500/40 text-red-400' : 'bg-yellow-600/20 border-yellow-500/40 text-yellow-400'}`}>
                            {h}
                        </div>
                    ))}
                </div>
            </div>

            {/* Timer Display */}
            <div className="mb-4 flex flex-col items-center shrink-0">
                <div className={`text-4xl font-black italic tracking-tighter ${(phase === 'BETTING' && (timeLeft || 0) <= 5) ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
                    00:{(timeLeft || 0).toString().padStart(2, '0')}
                </div>
                <div className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40">
                    {phase === 'BETTING' ? 'Betting Open' : 'Waiting for Result'}
                </div>
            </div>

            {/* Dice Table */}
            <div className="relative w-44 h-44 md:w-52 md:h-52 rounded-full bg-[#800000] border-[8px] border-[#4a2c2c] shadow-[inset_0_0_40px_rgba(0,0,0,0.8),0_15px_30px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden mb-6 shrink-0 group">
                <div className="absolute inset-0 opacity-10 bg-black/40" />
                <div className="flex gap-4 relative z-10">
                    <motion.div 
                        animate={isRolling ? { 
                            rotate: [0, 90, 180, 270, 360], 
                            x: [0, 15, -15, 10, 0],
                            y: [0, -10, 10, -5, 0],
                        } : {}}
                        transition={isRolling ? { repeat: Infinity, duration: 0.3 } : {}}
                    >
                        <DiceIcon value={dice[0]} size={45} />
                    </motion.div>
                    <motion.div 
                        animate={isRolling ? { 
                            rotate: [0, -90, -180, -270, -360], 
                            x: [0, -15, 15, -10, 0],
                            y: [0, 10, -10, 5, 0],
                        } : {}}
                        transition={isRolling ? { repeat: Infinity, duration: 0.3 } : {}}
                    >
                        <DiceIcon value={dice[1]} size={45} />
                    </motion.div>
                </div>
            </div>

            {/* Betting Targets */}
            <div className={`grid grid-cols-3 gap-2 w-full max-w-sm mb-4 transition-all shrink-0 ${isLocked ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <div className="relative">
                    <button 
                        onClick={() => setSelectedTarget('DOWN')}
                        className={`w-full flex flex-col items-center justify-center py-4 rounded-2xl border-b-4 transition-all ${selectedTarget === 'DOWN' ? 'bg-blue-600 border-blue-800 scale-105 shadow-xl text-white' : 'bg-black/40 border-black/60 text-white/60 hover:bg-black/60'}`}
                    >
                        <span className="text-[10px] font-black uppercase mb-1">Down</span>
                        <span className="text-xl font-black italic">2 - 6</span>
                        <span className="text-[10px] font-bold opacity-60">Payout 2x</span>
                    </button>
                    {allBets.filter(b => b.target === 'DOWN').length > 0 && (
                        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg">
                            ₹{allBets.filter(b => b.target === 'DOWN').reduce((acc, curr) => acc + curr.amount, 0)}
                        </div>
                    )}
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setSelectedTarget('SEVEN')}
                        className={`w-full flex flex-col items-center justify-center py-4 rounded-2xl border-b-4 transition-all ${selectedTarget === 'SEVEN' ? 'bg-yellow-600 border-yellow-800 scale-105 shadow-xl text-white' : 'bg-black/40 border-black/60 text-white/60 hover:bg-black/60'}`}
                    >
                        <span className="text-[10px] font-black uppercase mb-1">Lucky</span>
                        <span className="text-xl font-black italic">7</span>
                        <span className="text-[10px] font-bold opacity-60">Payout 3x</span>
                    </button>
                    {allBets.filter(b => b.target === 'SEVEN').length > 0 && (
                        <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg">
                            ₹{allBets.filter(b => b.target === 'SEVEN').reduce((acc, curr) => acc + curr.amount, 0)}
                        </div>
                    )}
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setSelectedTarget('UP')}
                        className={`w-full flex flex-col items-center justify-center py-4 rounded-2xl border-b-4 transition-all ${selectedTarget === 'UP' ? 'bg-red-600 border-red-800 scale-105 shadow-xl text-white' : 'bg-black/40 border-black/60 text-white/60 hover:bg-black/60'}`}
                    >
                        <span className="text-[10px] font-black uppercase mb-1">Up</span>
                        <span className="text-xl font-black italic">8 - 12</span>
                        <span className="text-[10px] font-bold opacity-60">Payout 2x</span>
                    </button>
                    {allBets.filter(b => b.target === 'UP').length > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg">
                            ₹{allBets.filter(b => b.target === 'UP').reduce((acc, curr) => acc + curr.amount, 0)}
                        </div>
                    )}
                </div>
            </div>

            {/* Bet Controls and Button Area */}
            <div className="bg-[#1a0101] w-full p-4 border-t border-white/10 mt-auto shrink-0 space-y-4">
                <div className={`w-full max-w-sm mx-auto space-y-4 ${isLocked ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 py-1">
                        {[10, 50, 100, 500, 1000, 5000].map(amt => (
                            <button 
                                key={amt}
                                onClick={() => { setBetAmount(amt); playSound('click'); }}
                                className={`flex-shrink-0 w-11 h-11 rounded-full border-2 font-black text-[10px] transition-all flex items-center justify-center shadow-lg active:scale-90 ${betAmount === amt ? 'bg-yellow-500 text-black border-white' : 'bg-black/60 text-yellow-500 border-yellow-500/20'}`}
                            >
                                {amt >= 1000 ? (amt/1000)+'K' : amt}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <button 
                            onClick={handleConfirmBet}
                            disabled={!selectedTarget || isBetting}
                            className={`flex-1 py-5 rounded-2xl font-black text-xl uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale ${selectedTarget ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black' : 'bg-white/10 text-white/40'}`}
                        >
                            {isBetting ? '...' : `BET ₹${betAmount}`}
                        </button>
                        {myBets.length > 0 && !isLocked && phase === 'BETTING' && (
                            <button 
                                onClick={handleCancelLastBet}
                                className="px-6 bg-red-600/20 border border-red-500/30 rounded-2xl text-[10px] font-black uppercase text-red-500 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={16} /> RETURN
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Bets List */}
            <div className="w-full max-w-md bg-black/40 rounded-t-3xl border-t border-x border-white/5 flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex border-b border-white/5 shrink-0">
                    <button 
                        onClick={() => setActiveTab('ALL')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ALL' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-white/5' : 'text-white/40'}`}
                    >
                        Live Bets ({allBets.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('MY')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MY' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-white/5' : 'text-white/40'}`}
                    >
                        My Round Activity ({myBets.length})
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1">
                    {(activeTab === 'ALL' ? allBets : myBets).map((b, idx) => (
                        <motion.div 
                            key={b.id || `bet-${idx}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                                    {b.uid === auth.currentUser?.uid ? 'YOU' : (b.username?.charAt(0) || 'U')}
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-white/90">{b.uid === auth.currentUser?.uid ? 'You' : b.username}</div>
                                    <div className={`text-[8px] font-bold ${b.target === 'DOWN' ? 'text-blue-400' : b.target === 'UP' ? 'text-red-400' : 'text-yellow-400'}`}>
                                        Target: {b.target}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <img src="https://cdn-icons-png.flaticon.com/512/2489/2489756.png" className="w-3 h-3" alt="coins" referrerPolicy="no-referrer" />
                                <span className="text-[12px] font-black text-yellow-500">₹{b.amount.toLocaleString()}</span>
                            </div>
                        </motion.div>
                    ))}
                    {(activeTab === 'MY' && myBets.length === 0) && (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                            <Plus size={32} />
                            <p className="text-[10px] uppercase font-black tracking-widest mt-2">No Bets Placed</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Result Overlay */}
        <AnimatePresence>
            {suResult && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none"
                >
                    {/* Falling Coins Animation */}
                    {suResult.win && <FallingCoins />}

                    <motion.div
                        initial={{ scale: 0.5, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        className="flex flex-col items-center"
                    >
                        <h2 className={`text-5xl md:text-7xl font-black italic tracking-tighter mb-4 ${suResult.win ? 'text-yellow-400' : 'text-zinc-400'} drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]`}>
                            {suResult.win ? 'YOU WIN!' : 'YOU LOST!'}
                        </h2>
                        
                        {suResult.win && (
                            <div className="flex items-center gap-3 bg-black/60 px-8 py-3 rounded-full border border-yellow-500/30 mb-8 shadow-2xl">
                                <img src="https://cdn-icons-png.flaticon.com/512/2489/2489756.png" className="w-8 h-8" alt="coin" referrerPolicy="no-referrer" />
                                <span className="text-3xl font-black text-white">{suResult.amount.toLocaleString()}</span>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

const BetOption = ({ label, targetStr, mult, active, onClick, bets }: any) => {
    const total = bets.reduce((acc: number, b: any) => acc + b.amount, 0);
    return (
        <button 
            onClick={onClick} 
            className={`relative flex flex-col items-center justify-center py-3 rounded-2xl border-b-8 transition-all h-32 overflow-hidden active:scale-95 ${
                active 
                ? 'bg-yellow-500 border-yellow-400 scale-105 z-10 text-black' 
                : 'bg-[#2a0202]/80 border-[#1a0101] text-white'
            }`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${active ? 'text-black/60' : 'text-white/40'}`}>{targetStr}</span>
            <span className={`text-2xl font-black italic tracking-tighter mb-1`}>{label}</span>
            <div className={`text-[10px] font-black px-3 py-1 rounded-full ${active ? 'bg-black/90 text-yellow-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                {mult}
            </div>
            {total > 0 && (
                <div className="absolute top-2 right-2 bg-white text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.4)] animate-in zoom-in">
                    ₹{total}
                </div>
            )}
        </button>
    );
};

const DiceIcon = ({ value, size }: { value: number; size: number }) => {
    const dots = {
        1: [[50, 50]],
        2: [[25, 25], [75, 75]],
        3: [[25, 25], [50, 50], [75, 75]],
        4: [[25, 25], [25, 75], [75, 25], [75, 75]],
        5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
        6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]]
    };

    return (
        <div 
            className="bg-white rounded-lg shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.2),2px_2px_4px_rgba(0,0,0,0.3)] relative"
            style={{ width: size, height: size }}
        >
            {(dots[value as keyof typeof dots] || []).map(([x, y], idx) => (
                <div 
                    key={`${value}-dot-${idx}`} 
                    className="absolute bg-zinc-900 rounded-full shadow-inner"
                    style={{ 
                        width: size * 0.18, 
                        height: size * 0.18, 
                        left: `${x}%`, 
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                />
            ))}
        </div>
    );
};

const FallingCoins = () => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
                <motion.img
                    key={i}
                    src="https://cdn-icons-png.flaticon.com/512/2489/2489756.png"
                    className="absolute w-8 h-8"
                    initial={{ 
                        top: -50, 
                        left: `${Math.random() * 100}%`,
                        rotate: 0,
                        opacity: 1
                    }}
                    animate={{ 
                        top: '120%', 
                        rotate: 360 * 2,
                        left: `${(Math.random() * 20 - 10) + (i * 5)}%`
                    }}
                    transition={{ 
                        duration: 2 + Math.random() * 2, 
                        repeat: Infinity,
                        delay: Math.random() * 2
                    }}
                    referrerPolicy="no-referrer"
                />
            ))}
        </div>
    );
};

export default SevenUpDown;
