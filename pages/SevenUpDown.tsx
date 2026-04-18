
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Minus, Info, HelpCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, subscribeToSevenUpDown, subscribeToSevenUpDownBets, getClockOffset } from '../services/supabaseService';
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

const SevenUpDown: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [gameState, setGameState] = useState<any>(null);
  const [bet, setBet] = useState(100);
  const [target, setTarget] = useState<'DOWN' | 'SEVEN' | 'UP' | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [dice, setDice] = useState([1, 1]);
  const [history, setHistory] = useState<number[]>([]);
  const [suResult, setSuResult] = useState<any | null>(null);
  const timeLeft = useStabilizedTimer(gameState?.status === 'BETTING' ? gameState.endTime : undefined);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
  const [allBets, setAllBets] = useState<any[]>([]);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string>('0');
  const [phase, setPhase] = useState<'BETTING' | 'LOCKOUT' | 'ROLLING' | 'RESULT'>('BETTING');
  
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
    
    if (target && hasBetThisRound.current) {
      const isWin = target === outcome;
      const mult = outcome === 'SEVEN' ? 3 : 2;
      const winAmt = isWin ? bet * mult : 0;

      setSuResult({
        win: isWin,
        amount: isWin ? winAmt : bet,
        period: state.period,
        dice: state.dice,
        sum: sum,
        target: target
      });

      if (isWin) {
        updateBalance(winAmt, 'WIN', '7 Up Down Win');
      }
      addGameHistory('7 Up Down', bet, winAmt, `Landed ${sum}`);
    }
  };

  const placeBet = async () => {
    if (isLocked || !target || hasBetThisRound.current || bet > userBalance) return;
    
    hasBetThisRound.current = true;
    updateBalance(-bet, 'BET', `7 Up Down: ${target}`);
    playSound('bet_place');

    if (auth.currentUser) {
        try {
            await addGameBet('seven_up_down_bets', {
                amount: bet,
                target: target,
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
            <div className="relative">
                <div className="bg-[#e21b22] px-12 py-2 rounded-sm shadow-2xl border-y-2 border-yellow-500/50">
                    <h1 className="text-2xl font-black text-white italic tracking-tighter drop-shadow-lg">7 Up Down</h1>
                </div>
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-[#4a0404] shadow-lg">
                    <HelpCircle size={16} className="text-[#4a0404]" />
                </div>
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-[#4a0404] shadow-lg">
                    <Info size={16} className="text-[#4a0404]" />
                </div>
            </div>
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
            <div className={`grid grid-cols-3 gap-2 w-full max-w-sm mb-4 transition-all shrink-0 ${isLocked ? 'opacity-50 grayscale scale-95' : ''}`}>
                <BetOption 
                    label="2 To 6" 
                    mult="2x" 
                    active={target === 'DOWN'} 
                    onClick={() => !isRolling && !isLocked && setTarget('DOWN')}
                    isWinner={phase === 'RESULT' && dice[0] + dice[1] < 7}
                    isCalculating={isRolling}
                />
                <BetOption 
                    label="7" 
                    mult="3x" 
                    active={target === 'SEVEN'} 
                    onClick={() => !isRolling && !isLocked && setTarget('SEVEN')}
                    isWinner={phase === 'RESULT' && dice[0] + dice[1] === 7}
                    isCalculating={isRolling}
                />
                <BetOption 
                    label="8 To 12" 
                    mult="2x" 
                    active={target === 'UP'} 
                    onClick={() => !isRolling && !isLocked && setTarget('UP')}
                    isWinner={phase === 'RESULT' && dice[0] + dice[1] > 7}
                    isCalculating={isRolling}
                />
            </div>

            {/* Bet Controls */}
            <div className={`flex flex-col items-center gap-2 w-full max-w-xs transition-opacity shrink-0 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-4">
                    <button onClick={() => adjustBet(-100)} className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center border-b-4 border-yellow-800 active:translate-y-1 active:border-b-0 transition-all">
                        <Minus size={16} className="text-black font-bold" />
                    </button>
                    <div className="bg-black/60 px-4 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 min-w-[100px] justify-center">
                        <img src="https://cdn-icons-png.flaticon.com/512/2489/2489756.png" className="w-3 h-3" alt="coin" referrerPolicy="no-referrer" />
                        <input 
                            type="text" 
                            className="bg-transparent text-white text-base font-black w-12 outline-none text-center"
                            value={bet}
                            onChange={(e) => handleManualBetChange(e.target.value)}
                        />
                    </div>
                    <button onClick={() => adjustBet(100)} className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center border-b-4 border-yellow-800 active:translate-y-1 active:border-b-0 transition-all">
                        <Plus size={16} className="text-black font-bold" />
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setBet(prev => prev * 2)} className="bg-yellow-600/20 border border-yellow-600/50 px-2 py-0.5 rounded text-[8px] font-black text-yellow-500 uppercase tracking-widest">2x</button>
                    <button onClick={() => setBet(prev => Math.max(10, Math.floor(prev / 2)))} className="bg-yellow-600/20 border border-yellow-600/50 px-2 py-0.5 rounded text-[8px] font-black text-yellow-500 uppercase tracking-widest">1/2</button>
                </div>
            </div>

            {/* Place Bet Button */}
            <div className="mt-4 shrink-0">
                <button 
                    onClick={placeBet} 
                    disabled={!target || isLocked || hasBetThisRound.current}
                    className={`px-12 py-3 rounded-full bg-gradient-to-b from-[#ff4d4d] to-[#800000] border-2 border-yellow-500/50 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:grayscale font-black uppercase tracking-widest text-sm`}
                >
                    {hasBetThisRound.current ? 'Bet Placed' : 'Place Bet'}
                </button>
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

const BetOption = ({ label, mult, active, onClick, isWinner, isCalculating }: any) => (
    <button 
        onClick={onClick} 
        className={`relative flex flex-col items-center justify-between py-3 rounded-xl border-2 transition-all h-24 overflow-hidden ${
            active 
            ? 'bg-gradient-to-b from-yellow-400 to-yellow-600 border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105 z-10' 
            : 'bg-[#2a0202]/60 border-yellow-600/30'
        }`}
    >
        {/* Scanning effect on active option during calculation */}
        {active && isCalculating && (
            <motion.div 
                animate={{ left: ['-100%', '200%'] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
            />
        )}

        <div className={`text-[8px] font-black px-2 py-0.5 rounded-full relative z-10 ${active ? 'bg-black text-yellow-500' : 'bg-yellow-600/20 text-yellow-500'}`}>
            {mult}
        </div>
        <div className={`text-xs font-black uppercase tracking-tighter relative z-10 ${active ? 'text-black' : 'text-white'}`}>
            {label}
        </div>
        <div className="relative w-6 h-6 rounded-full bg-black/20 flex items-center justify-center z-10">
            {isWinner ? (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <Check size={12} className="text-white font-bold" />
                </div>
            ) : (
                <div className={`w-3 h-3 rounded-full ${active ? 'bg-black/40' : 'bg-white/5'}`}></div>
            )}
        </div>
        <div className={`text-[8px] font-black uppercase relative z-10 ${active ? 'text-black/60' : 'text-white/40'}`}>Win</div>
    </button>
);

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
