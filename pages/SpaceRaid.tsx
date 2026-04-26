
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Zap, ShieldAlert, Rocket, Users, Check, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, db, auth, subscribeToSpaceRaid, subscribeToSpaceRaidBets, addGameBet, getClockOffset } from '../services/supabaseService';
import { GameResult, SpaceRaidState } from '../types';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, where, addDoc } from 'firebase/firestore';

import SpaceRaidResultPopup from '../components/SpaceRaidResultPopup';
import HowToPlay from '../components/HowToPlay';

import { useStabilizedTimer } from '../hooks/useTimer';

const SpaceRaid: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [gameState, setGameState] = useState<SpaceRaidState | null>(null);
    const [betAmount, setBetAmount] = useState(10);
    const [myBets, setMyBets] = useState<any[]>([]);
    const [allBets, setAllBets] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
    const [isBettingLocked, setIsBettingLocked] = useState(false);
    const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
    const [hasCashedOut, setHasCashedOut] = useState(false);
    const [srResult, setSrResult] = useState<any | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    
    const timeLeft = useStabilizedTimer(gameState?.status === 'BETTING' ? gameState.endTime : undefined);
    
    const isMounted = useRef(true);
    const resultHandledRef = useRef<string | null>(null);
    const frameRef = useRef<number>(0);

    function startRaidAnimation(crashPoint: number) {
        let start = Date.now();
        const animate = () => {
            if (!isMounted.current) return;
            const elapsed = (Date.now() - start) / 1000;
            const multi = Math.pow(1.08, elapsed * 10); 
            
            if (multi >= crashPoint) {
                setCurrentMultiplier(crashPoint);
                playSound('plane_crash');

                const myCurrentBets = allBets.filter(b => b.uid === auth.currentUser?.uid);
                let tieWin = 0;
                let tieBet = 0;
                
                myCurrentBets.forEach(b => {
                    if (b.isTie) {
                        tieBet += b.amount;
                        if (crashPoint <= 1.05) tieWin += b.amount * 50;
                    }
                });

                if (tieWin > 0) updateBalance(tieWin, 'WIN', 'Space Raid Tie Win');

                if (!hasCashedOut && myCurrentBets.some(b => !b.isTie && !b.cashedOut)) {
                    // Normal bet lost
                    setSrResult({
                        win: tieWin > 0,
                        amount: tieWin > 0 ? tieWin : myCurrentBets.reduce((acc, b) => acc + b.amount, 0),
                        period: gameState!.period,
                        multiplier: 0,
                        crashPoint: crashPoint
                    });
                } else if (tieWin > 0) {
                    setSrResult({
                        win: true,
                        amount: tieWin,
                        period: gameState!.period,
                        multiplier: 0,
                        crashPoint: crashPoint
                    });
                }
            } else {
                setCurrentMultiplier(multi);
                frameRef.current = requestAnimationFrame(animate);
            }
        };
        animate();
    }

    const handlePlaceBet = async (isTie = false) => {
        if (!auth.currentUser || !gameState) return;
        if (userBalance < betAmount) { alert("Insufficient Balance!"); return; }

        try {
            const betData = {
                amount: betAmount,
                period: gameState.period,
                cashedOut: false,
                isTie: isTie
            };

            await addGameBet('space_raid_bets', betData);
            await updateBalance(-betAmount, 'BET', `Space Raid ${isTie ? 'Tie' : 'Bet'}`);
            playSound('bet_place');
        } catch (e) {
            console.error("Bet error:", e);
        }
    };

    const handleCashOut = async () => {
        if (hasCashedOut || !auth.currentUser || !gameState || currentMultiplier <= 1) return;
        
        const myCurrentBets = myBets.filter(b => !b.cashedOut && !b.isTie);
        if (myCurrentBets.length === 0) return;

        setHasCashedOut(true);
        playSound('win');
        
        let totalWin = 0;
        myCurrentBets.forEach(async (bet) => {
            const win = bet.amount * currentMultiplier;
            totalWin += win;
            // Mark as cashed out in DB (optional for UI, but good for consistency)
            // await updateDoc(doc(db, 'space_raid_bets', bet.id), { cashedOut: true, cashOutMultiplier: currentMultiplier });
        });

        updateBalance(totalWin, 'WIN', 'Space Raid Cashout');
        setSrResult({
            win: true,
            amount: totalWin,
            period: gameState.period,
            multiplier: currentMultiplier,
            crashPoint: 0 // Will be set when animation finishes, but we already won
        });
        addGameHistory('Space Raid', myCurrentBets.reduce((acc, b) => acc + b.amount, 0), totalWin, `Cashed out at ${currentMultiplier.toFixed(2)}x`);
    };

    useEffect(() => {
        isMounted.current = true;
        
        const unsubState = subscribeToSpaceRaid((state) => {
            if (!isMounted.current) return;
            setGameState(state);

            if (state.status === 'BETTING') {
                setHasCashedOut(false);
                setCurrentMultiplier(1.0);
                resultHandledRef.current = null;
            } else {
                setIsBettingLocked(true);
            }

            if (state.status === 'RESULT' && resultHandledRef.current !== state.period) {
                resultHandledRef.current = state.period;
                startRaidAnimation(state.crashPoint);
            }
        });

        const unsubBets = subscribeToSpaceRaidBets((bets) => {
            setAllBets(bets);
            if (auth.currentUser) {
                setMyBets(bets.filter((b: any) => b.uid === auth.currentUser?.uid));
            }
        });

        return () => { isMounted.current = false; unsubState(); unsubBets(); stopAllSounds(); cancelAnimationFrame(frameRef.current); };
    }, []);

    useEffect(() => {
        if (gameState?.status === 'BETTING') {
            setIsBettingLocked(timeLeft <= 5);
            if (timeLeft <= 5 && timeLeft > 0) playSound('wingo_tick');
        }
    }, [timeLeft, gameState?.status]);

    if (!gameState) return <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center font-black gold-text text-xl italic uppercase tracking-widest">Entering Arena...</div>;

    return (
        <div className="bg-[#00001a] min-h-screen flex flex-col font-sans text-white overflow-hidden relative select-none">
            <SpaceRaidResultPopup result={srResult} onClose={() => setSrResult(null)} />
            <HowToPlay 
                isOpen={showHelp} 
                onClose={() => setShowHelp(false)} 
                title="Space Raid Rules"
                rules={[
                    "This is a multiplayer crash game. All players bet on the same rocket.",
                    "Place your bet before the countdown ends.",
                    "Watch the Rocket fly! The multiplier increases exponentially.",
                    "Extract your winnings any time before the crash.",
                    "TIE 50X: Bet that the rocket will crash at 1.05x or lower for a 50x payout!"
                ]}
                payouts={[
                    { label: "Normal Extract", value: "Stake × Multiplier" },
                    { label: "TIE (<= 1.05x)", value: "50x" }
                ]}
            />
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-black/40 border-b border-cyan-500/20 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 bg-slate-800 rounded-2xl active:scale-90 transition-all"><ArrowLeft size={18}/></button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black italic text-cyan-400 tracking-widest uppercase leading-none">SPACE RAID</h1>
                        <span className="text-[8px] text-cyan-500/50 mt-1 uppercase font-bold">Raid Wallet</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-black/80 px-4 py-2 rounded-2xl border-2 border-cyan-500/40 text-cyan-400 font-mono shadow-[0_0_15px_rgba(34,211,238,0.2)] flex items-center gap-2">
                        <Wallet size={14} />
                        <span className="font-black italic">₹{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setShowHelp(true)} className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20 active:scale-90 transition-all"><HelpCircle size={18}/></button>
                </div>
            </div>

            {/* Game Content */}
            <div className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto no-scrollbar pb-60">
                
                {/* History (Top) */}
                <div className="w-full mb-4">
                    <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
                        {gameState.history.map((h, i) => (
                            <span key={i} className={`flex-shrink-0 px-3 py-1 rounded-full font-black text-[10px] shadow-lg border border-white/5 ${h >= 2 ? 'bg-cyan-600' : 'bg-zinc-800'}`}>
                                {h.toFixed(2)}x
                            </span>
                        ))}
                    </div>
                </div>

                {/* Main Display */}
                <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[300px] relative">
                    <div className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(6,182,212,0.1)_0%,_transparent_70%)] ${gameState.status === 'RESULT' ? 'animate-pulse' : ''}`}></div>
                    
                    <motion.div 
                        key={gameState.period + (gameState.status === 'RESULT' ? 'active' : 'idle')}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`text-7xl font-black italic tracking-tighter ${gameState.status === 'RESULT' && currentMultiplier >= gameState.crashPoint ? 'text-red-600 scale-110' : 'text-cyan-400'}`}
                    >
                        {gameState.status === 'RESULT' && currentMultiplier >= gameState.crashPoint ? 'CRASHED' : currentMultiplier.toFixed(2) + 'x'}
                    </motion.div>

                    <div className="mt-12 relative">
                        <motion.div
                            animate={gameState.status === 'RESULT' && currentMultiplier < gameState.crashPoint ? { 
                                y: [0, -20, 0],
                                rotate: [-45, -40, -45],
                                scale: [1, 1.1, 1]
                            } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <Rocket size={100} className={`text-cyan-400 -rotate-45 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)] ${gameState.status === 'RESULT' && currentMultiplier >= gameState.crashPoint ? 'opacity-0' : ''}`} />
                        </motion.div>
                        {gameState.status === 'RESULT' && currentMultiplier >= gameState.crashPoint && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 2 }} className="absolute inset-0 flex items-center justify-center text-orange-500">
                                <Zap size={60} fill="currentColor" />
                            </motion.div>
                        )}
                    </div>

                    {gameState.status === 'BETTING' && (
                        <div className="mt-8 flex flex-col items-center">
                            <span className="text-[10px] uppercase tracking-[0.5em] text-cyan-500/60 mb-2">Next Raid In</span>
                            <div className="text-4xl font-mono font-black text-white">{timeLeft}s</div>
                        </div>
                    )}
                </div>

                {/* Live Bets Display */}
                <div className="w-full mt-6 flex-1 flex flex-col min-h-[300px]">
                    <div className="flex border-b border-white/5">
                        <button onClick={() => setActiveTab('ALL')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ALL' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-zinc-500'}`}>All Raiders ({allBets.length})</button>
                        <button onClick={() => setActiveTab('MY')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MY' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-zinc-500'}`}>My Missions ({myBets.length})</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {(activeTab === 'ALL' ? allBets : myBets).map((bet, idx) => (
                                <motion.div 
                                    key={bet.id || `sr-${bet.uid}-${bet.timestamp}-${idx}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-cyan-900/50 flex items-center justify-center">
                                            <Rocket size={14} className="text-cyan-400" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase flex items-center gap-2">
                                                {bet.username || 'Raider'}
                                                {bet.isTie && <span className="bg-orange-500/20 text-orange-400 text-[6px] px-1 rounded uppercase">TIE 50X</span>}
                                            </div>
                                            <div className="text-[8px] text-zinc-500">{new Date(bet.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-cyan-400">₹{bet.amount}</div>
                                        {bet.cashedOut && <div className="text-[8px] text-green-500 font-black uppercase">Cashed Out</div>}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Betting Controls */}
            <div className="fixed bottom-0 left-0 w-full bg-[#050510]/95 backdrop-blur-xl p-4 pb-8 border-t border-cyan-500/30 shadow-[0_-20px_100px_rgba(0,0,0,1)] z-[60]">
                {gameState.status === 'RESULT' && currentMultiplier < gameState.crashPoint && !hasCashedOut && myBets.filter(b => !b.cashedOut && !b.isTie).length > 0 ? (
                    <button 
                        onClick={handleCashOut}
                        className="w-full py-6 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 text-black font-black text-2xl rounded-2xl shadow-[0_0_50px_rgba(234,179,8,0.4)] uppercase mb-4 animate-bounce border-t-2 border-white/40"
                    >
                        EXTRACT ₹{(betAmount * currentMultiplier).toFixed(2)}
                    </button>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                            {[10, 50, 100, 200, 500, 1000, 2000, 5000].map(a => (
                                <button 
                                    key={a} 
                                    onClick={() => setBetAmount(a)} 
                                    className={`flex-shrink-0 px-6 py-2.5 rounded-xl font-black text-[10px] transition-all border ${betAmount === a ? 'bg-cyan-500 text-black border-white shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-white/5 text-zinc-500 border-white/5'}`}
                                >
                                    ₹{a >= 1000 ? (a/1000)+'K' : a}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handlePlaceBet(true)}
                                disabled={isBettingLocked || gameState.status !== 'BETTING'}
                                className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase transition-all border-b-2 ${isBettingLocked || gameState.status !== 'BETTING' ? 'bg-zinc-800 text-zinc-600 border-zinc-950 opacity-40' : 'bg-orange-600 text-white border-orange-800 shadow-xl active:scale-95'}`}
                            >
                                TIE 50X
                            </button>
                            <button 
                                onClick={() => handlePlaceBet(false)}
                                disabled={isBettingLocked || gameState.status !== 'BETTING'}
                                className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-b-2 ${isBettingLocked || gameState.status !== 'BETTING' ? 'bg-zinc-800 text-zinc-600 border-zinc-950 opacity-40' : 'bg-cyan-600 text-white border-cyan-800 shadow-[0_0_30px_rgba(34,211,238,0.3)] active:scale-95'}`}
                            >
                                {isBettingLocked ? 'LOCKED' : 'LAUNCH RAID'}
                            </button>
                        </div>
                    </div>
                )}
                
                {hasCashedOut && (
                    <div className="text-center py-2 text-green-500 font-black italic uppercase tracking-widest animate-bounce">
                        Mission Successful!
                    </div>
                )}
            </div>
        </div>
    );
};
export default SpaceRaid;
