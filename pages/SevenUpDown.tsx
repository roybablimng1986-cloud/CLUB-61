
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Minus, Info, HelpCircle, Check } from 'lucide-react';
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
  const [gameState, setGameState] = useState<any>(null);
  const [bet, setBet] = useState(100);
  const [target, setTarget] = useState<'DOWN' | 'SEVEN' | 'UP' | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [dice, setDice] = useState([1, 1]);
  const [history, setHistory] = useState<number[]>([]);
  const [suResult, setSuResult] = useState<any | null>(null);
  const timeLeft = useStabilizedTimer(gameState?.endTime);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
  const [allBets, setAllBets] = useState<any[]>([]);
  const allBetsRef = useRef<any[]>([]);
  useEffect(() => { allBetsRef.current = allBets; }, [allBets]);

  const [myBets, setMyBets] = useState<any[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string>('0');
  const [phase, setPhase] = useState<'BETTING' | 'LOCKOUT' | 'ROLLING' | 'RESULT'>('BETTING');
  const [showHelp, setShowHelp] = useState(false);
  
  const isMounted = useRef(true);
  const lastPhaseRef = useRef<string>('');
  const hasBetThisRound = useRef(false);
  const hasProcessedResult = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    
    const unsub = subscribeToSevenUpDown((state) => {
        if (!isMounted.current || !state) return;
        setGameState(state);
        setPhase(state.status);
        // timeLeft will be updated by the local timer interval using state.endTime
        setIsLocked(state.status !== 'BETTING');
        setDice(state.dice);
        setHistory(state.history || []);
        setCurrentRoundId(state.period);

        if (state.status === 'BETTING' && lastPhaseRef.current !== 'BETTING') {
            hasBetThisRound.current = false;
            hasProcessedResult.current = false;
            setSuResult(null);
            setTarget(null);
            setIsRolling(false);
        }

        if (state.status === 'RESULT' && lastPhaseRef.current !== 'RESULT') {
            setIsRolling(false);
            processResult(state);
        }

        if (state.status === 'LOCKED' && lastPhaseRef.current === 'BETTING') {
            setIsRolling(true);
            playSound('wheel_spin');
        }

        lastPhaseRef.current = state.status;
    });

    const unsubBets = subscribeToSevenUpDownBets((bets) => {
      setAllBets(bets);
      if (auth.currentUser) {
        setMyBets(bets.filter((b: any) => b.uid === auth.currentUser?.uid));
      }
    });

    return () => {
      isMounted.current = false;
      stopAllSounds();
      unsub();
      unsubBets();
    };
  }, []);

  useEffect(() => {
    if (gameState?.status === 'BETTING') {
        setIsLocked(timeLeft <= 5);
        if (timeLeft <= 5 && timeLeft > 0) playSound('wingo_tick');
    }
  }, [timeLeft, gameState?.status]);

  const processResult = async (state: any) => {
    if (hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    const sum = state.sum;
    const outcome = sum < 7 ? 'DOWN' : sum > 7 ? 'UP' : 'SEVEN';
    
    const myCurrentBets = allBetsRef.current.filter(b => b.uid === auth.currentUser?.uid);
    if (myCurrentBets.length > 0) {
        let totalWin = 0;
        let totalBet = 0;
        let wonAtLeastOne = false;

        myCurrentBets.forEach(bet => {
            totalBet += bet.amount;
            const isWin = bet.target === outcome;
            if (isWin) {
                wonAtLeastOne = true;
                const mult = outcome === 'SEVEN' ? 3 : 2;
                totalWin += bet.amount * mult;
            }
        });

        setSuResult({
            win: wonAtLeastOne,
            amount: wonAtLeastOne ? totalWin : totalBet,
            period: state.period,
            dice: state.dice,
            sum: sum,
            target: myCurrentBets.map(b => b.target).join(', ')
        });

        if (totalWin > 0) {
            updateBalance(totalWin, 'WIN', '7 Up Down Win');
        }
        addGameHistory('7 Up Down', totalBet, totalWin, `Landed ${sum}`);
    }
  };

    const placeBetOnTarget = async (selectedTarget: 'DOWN' | 'SEVEN' | 'UP') => {
        if (isLocked || bet > userBalance || phase !== 'BETTING') return;
        
        updateBalance(-bet, 'BET', `7 Up Down: ${selectedTarget}`);
        playSound('bet_place');

        if (auth.currentUser) {
            try {
                await addGameBet('seven_up_down_bets', {
                    amount: bet,
                    target: selectedTarget,
                    period: currentRoundId,
                });
            } catch (e) {}
        }
    };

    const adjustBet = (amt: number) => {
    if (isLocked) return;
    setBet(prev => Math.max(10, prev + amt));
    playSound('click');
  };

  const handleManualBetChange = (val: string) => {
    if (isLocked) return;
    const num = parseInt(val.replace(/[^0-9]/g, '')) || 0;
    setBet(num);
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
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10">
                <img src="https://cdn-icons-png.flaticon.com/512/2489/2489756.png" className="w-4 h-4" alt="coins" referrerPolicy="no-referrer" />
                <span className="text-xs font-bold">{userBalance.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10">
                <img src="https://cdn-icons-png.flaticon.com/512/616/616490.png" className="w-4 h-4" alt="gems" referrerPolicy="no-referrer" />
                <span className="text-xs font-bold">110</span>
            </div>
        </div>

        {/* Ribbon Title */}
        <div className="flex justify-center -mt-2 relative z-10 shrink-0">
            <button onClick={() => setShowHelp(true)} className="relative">
                <div className="bg-[#e21b22] px-12 py-2 rounded-sm shadow-2xl border-y-2 border-yellow-500/50">
                    <h1 className="text-2xl font-black text-white italic tracking-tighter drop-shadow-lg">7 Up Down</h1>
                </div>
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-[#4a0404] shadow-lg">
                    <HelpCircle size={16} className="text-[#4a0404]" />
                </div>
            </button>
        </div>

        {/* Game Content */}
        <div className="flex-1 flex flex-col items-center justify-start p-4 pt-2 relative z-10 overflow-hidden">
            
            {/* History (Top) */}
            <div className="w-full flex justify-center mb-4 shrink-0">
                <div className="flex gap-1 bg-black/40 p-2 rounded-lg border border-white/5 relative z-10">
                    {history.map((h, i) => (
                        <div key={`${i}-${h}`} className={`w-7 h-7 flex items-center justify-center text-[10px] font-black border rounded shadow-inner ${h < 7 ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : h > 7 ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'}`}>
                            {h}
                        </div>
                    ))}
                </div>
            </div>

            {/* Timer Display */}
            <div className="mb-4 flex flex-col items-center shrink-0">
                <div className={`text-4xl font-black italic tracking-tighter ${(phase === 'BETTING' && (timeLeft || 0) <= 5) ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>
                    00:{(timeLeft || 0).toString().padStart(2, '0')}
                </div>
                <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40">
                    {phase === 'BETTING' ? 'Place Your Bets' : phase === 'LOCKOUT' ? 'Betting Closed' : phase === 'ROLLING' ? 'Rolling...' : 'Result'}
                </div>
            </div>

            {/* Dice Table (Main Area) */}
            <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full bg-[#800000] border-[10px] border-[#4a2c2c] shadow-[inset_0_0_40px_rgba(0,0,0,0.8),0_15px_30px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden mb-4 shrink-0">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }}></div>
                
                {/* Laser Scanning Effect during calculation */}
                {isRolling && (
                    <motion.div 
                        initial={{ top: '-10%' }}
                        animate={{ top: '110%' }}
                        transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-yellow-400/40 shadow-[0_0_15px_rgba(250,204,21,0.8)] z-20"
                    />
                )}

                <div className="flex gap-4 relative z-10">
                    <motion.div 
                        animate={isRolling ? { 
                            rotate: [0, 90, 180, 270, 360], 
                            x: [0, 10, -10, 5, 0],
                            y: [0, -5, 5, -2, 0],
                            scale: [1, 1.1, 0.9, 1]
                        } : {}}
                        transition={isRolling ? { repeat: Infinity, duration: 0.4 } : {}}
                    >
                        <DiceIcon value={dice[0]} size={40} />
                    </motion.div>
                    <motion.div 
                        animate={isRolling ? { 
                            rotate: [0, -90, -180, -270, -360], 
                            x: [0, -10, 10, -5, 0],
                            y: [0, 5, -5, 2, 0],
                            scale: [1, 0.9, 1.1, 1]
                        } : {}}
                        transition={isRolling ? { repeat: Infinity, duration: 0.4 } : {}}
                    >
                        <DiceIcon value={dice[1]} size={40} />
                    </motion.div>
                </div>
            </div>

            {/* Betting Options */}
            <div className={`grid grid-cols-3 gap-4 w-full max-w-sm mb-6 transition-all shrink-0 ${isLocked ? 'opacity-50 grayscale' : ''}`}>
                <BetOption 
                    label="2 - 6" 
                    targetStr="DOWN"
                    mult="2.0X" 
                    active={target === 'DOWN'} 
                    onClick={() => placeBetOnTarget('DOWN')} 
                    bets={myBets.filter(b => b.target === 'DOWN')}
                />
                <BetOption 
                    label="7" 
                    targetStr="LUCKY"
                    mult="3.0X" 
                    active={target === 'SEVEN'} 
                    onClick={() => placeBetOnTarget('SEVEN')} 
                    bets={myBets.filter(b => b.target === 'SEVEN')}
                />
                <BetOption 
                    label="8 - 12" 
                    targetStr="UP"
                    mult="2.0X" 
                    active={target === 'UP'} 
                    onClick={() => placeBetOnTarget('UP')} 
                    bets={myBets.filter(b => b.target === 'UP')}
                />
            </div>

            {/* Bet Amount Selector (Chips Style) */}
            <div className={`flex flex-col items-center gap-4 w-full max-w-sm mb-2 transition-all shrink-0 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 w-full justify-center">
                    {[10, 50, 100, 500, 1000, 5000].map(amt => (
                        <button 
                            key={amt}
                            onClick={() => setBet(amt)}
                            className={`flex-shrink-0 w-12 h-12 rounded-full border-4 font-black text-[10px] transition-all flex items-center justify-center shadow-lg active:scale-90 ${bet === amt ? 'bg-yellow-500 text-black border-white scale-110 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'bg-black/80 text-yellow-500 border-yellow-500/30'}`}
                        >
                            {amt >= 1000 ? (amt/1000)+'K' : amt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Live Bets Section */}
            <div className="w-full max-w-md mt-6 bg-black/40 rounded-t-3xl border-t border-x border-white/10 flex flex-col flex-1 min-h-0">
                <div className="flex border-b border-white/10 shrink-0">
                    <button 
                        onClick={() => setActiveTab('ALL')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ALL' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/5' : 'text-white/40'}`}
                    >
                        All Bets
                    </button>
                    <button 
                        onClick={() => setActiveTab('MY')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MY' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/5' : 'text-white/40'}`}
                    >
                        My Bets
                    </button>
                </div>
                
                <div className="flex-1 p-2 overflow-y-auto">
                    <div className="grid grid-cols-4 text-[8px] font-bold text-white/30 uppercase tracking-widest mb-2 px-2">
                        <div>User</div>
                        <div className="text-center">Bet</div>
                        <div className="text-center">Target</div>
                        <div className="text-right">Time</div>
                    </div>
                    
                    <div className="space-y-1">
                        {(activeTab === 'ALL' ? allBets : myBets).map((b, idx) => {
                            const uniqueKey = b.id || `bet-${b.uid || 'anon'}-${b.timestamp || idx}-${idx}`;
                            return (
                                <div key={uniqueKey} className="grid grid-cols-4 items-center bg-white/5 rounded-lg p-2 border border-white/5 hover:bg-white/10 transition-all">
                                    <div className="text-[10px] font-bold truncate">{b.uid === auth.currentUser?.uid ? 'You' : b.username}</div>
                                <div className="flex items-center justify-center gap-1">
                                    <img src="https://cdn-icons-png.flaticon.com/512/2489/2489756.png" className="w-2.5 h-2.5" alt="coin" referrerPolicy="no-referrer" />
                                    <span className="text-[10px] font-black text-yellow-500">{b.amount.toLocaleString()}</span>
                                </div>
                                <div className="text-center">
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${b.target === 'DOWN' ? 'bg-blue-500/20 text-blue-400' : b.target === 'UP' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                        {b.target}
                                    </span>
                                </div>
                                <div className="text-right text-[8px] font-mono text-white/40">
                                    {activeTab === 'MY' && b.status && b.status !== 'PENDING' ? (
                                        <span className={b.status === 'WIN' ? 'text-green-500' : 'text-red-500'}>
                                            {b.status === 'WIN' ? `+${b.winAmount}` : 'LOST'}
                                        </span>
                                    ) : new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        );
                    })}
                        {(activeTab === 'MY' && myBets.length === 0) && (
                            <div className="text-center py-8 text-white/20 text-xs italic">No bets placed yet</div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Back Button */}
        <button onClick={onBack} className="absolute bottom-4 left-4 w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center border-2 border-[#4a0404] shadow-lg z-20">
            <ArrowLeft size={16} className="text-[#4a0404]" />
        </button>

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
