
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Wallet, HelpCircle, X, Clock, Plane, Sparkles, TrendingUp, RotateCcw, AlertTriangle, Users } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, subscribeToWinGoBets } from '../services/supabaseService';
import { GameResult } from '../types';

type WheelOutcome = '1' | '2' | '5' | '10' | 'CRAZY_PLANE' | 'MEGA_CHANCE';

interface Bet {
    type: WheelOutcome;
    amount: number;
}

const SEGMENTS: WheelOutcome[] = [
    '1', '2', '1', '5', '1', '2', 'MEGA_CHANCE', '1', '2', '1', '10', '1', '2', '1', '5', '1', '2', 'CRAZY_PLANE',
    '1', '2', '1', '10', '1', '2', 'MEGA_CHANCE', '1', '2', '1', '5', '1', '2', '10', '1', '2', '1', '5', '1', '2', 'MEGA_CHANCE',
    '1', '10', '1', '2', '1', '5', '1', '2', '1', '10', '1', '2', '1', '5', 'MEGA_CHANCE'
]; // 54 Segments total

const getHexColor = (type: WheelOutcome) => {
    switch (type) {
        case '1': return '#0284c7'; // sky-600
        case '2': return '#059669'; // emerald-600
        case '5': return '#db2777'; // pink-600
        case '10': return '#ea580c'; // orange-600
        case 'CRAZY_PLANE': return '#7c3aed'; // purple-600
        case 'MEGA_CHANCE': return '#e11d48'; // rose-600
        default: return '#334155';
    }
};

const getSegmentColor = (type: WheelOutcome) => {
    switch (type) {
        case '1': return 'bg-sky-600';
        case '2': return 'bg-emerald-600';
        case '5': return 'bg-pink-600';
        case '10': return 'bg-orange-600';
        case 'CRAZY_PLANE': return 'bg-purple-600';
        case 'MEGA_CHANCE': return 'bg-rose-600';
        default: return 'bg-slate-700';
    }
};

const getSegmentLabel = (type: WheelOutcome) => {
    switch(type) {
        case 'CRAZY_PLANE': return 'CRAZY';
        case 'MEGA_CHANCE': return 'MEGA';
        default: return type;
    }
}

const getPayout = (type: WheelOutcome) => {
    switch(type) {
        case '1': return 2;
        case '2': return 3;
        case '5': return 6;
        case '10': return 11;
        default: return 1;
    }
}

const CrazyWheel: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [gameState, setGameState] = useState<'BETTING' | 'SPINNING' | 'BONUS_CRAZY' | 'BONUS_MEGA' | 'RESULT'>('BETTING');
    const [timeLeft, setTimeLeft] = useState(15);
    const [myBets, setMyBets] = useState<Bet[]>([]);
    const [allBetsTotal, setAllBetsTotal] = useState<Record<WheelOutcome, number>>({ '1': 0, '2': 0, '5': 0, '10': 0, 'CRAZY_PLANE': 0, 'MEGA_CHANCE': 0 });
    const [rotation, setRotation] = useState(0);
    const [bonusRotation, setBonusRotation] = useState(0);
    const [result, setResult] = useState<WheelOutcome | null>(null);
    const [history, setHistory] = useState<WheelOutcome[]>([]);
    const [topSlot, setTopSlot] = useState<{ target: WheelOutcome; mult: number } | null>(null);
    const [isTopSlotSpinning, setIsTopSlotSpinning] = useState(false);
    const [activeMultipliers, setActiveMultipliers] = useState<Record<string, number>>({});
    const [showHelp, setShowHelp] = useState(false);
    const [winAmount, setWinAmount] = useState(0);
    const [planeX, setPlaneX] = useState(1);
    const [megaX, setMegaX] = useState(1);
    const [selectedChip, setSelectedChip] = useState(10);
    const isMounted = useRef(true);
    
    const wheelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        isMounted.current = true;
        setHistory(['1', '10', '2', 'CRAZY_PLANE', '1', '5', '1', '2', 'MEGA_CHANCE'].slice(0, 8));
        return () => { isMounted.current = false; };
    }, []);

    // Global timer
    useEffect(() => {
        if (gameState !== 'BETTING') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    startSpin();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);

    // Top Slot randomization
    useEffect(() => {
        if (gameState === 'BETTING' && timeLeft === 5) {
            triggerTopSlot();
        }
    }, [timeLeft, gameState]);

    const triggerTopSlot = async () => {
        setIsTopSlotSpinning(true);
        setActiveMultipliers({});
        setTopSlot(null);
        playSound('wheel_spin');
        
        // Rapid random cycling for reel effect
        const targets: WheelOutcome[] = ['1', '2', '5', '10', 'CRAZY_PLANE', 'MEGA_CHANCE'];
        let cycle = 0;
        const interval = setInterval(() => {
            setTopSlot({
                target: targets[Math.floor(Math.random() * targets.length)],
                mult: [2, 3, 5, 10, 25, 50, 100][Math.floor(Math.random() * 7)]
            });
            cycle++;
            if (cycle > 20) {
                clearInterval(interval);
                finalizeTopSlot();
            }
        }, 100);
    };

    const finalizeTopSlot = async () => {
        if (!isMounted.current) return;
        
        if (Math.random() > 0.25) {
            const targets: WheelOutcome[] = ['1', '2', '5', '10', 'CRAZY_PLANE', 'MEGA_CHANCE'];
            const newTarget = targets[Math.floor(Math.random() * targets.length)];
            const newMult = [2, 5, 10, 15, 20, 25, 50][Math.floor(Math.random() * 7)];
            
            setTopSlot({ target: newTarget, mult: newMult });
            playSound('win');
            
            setTimeout(() => {
                if (isMounted.current) {
                    setActiveMultipliers({ [newTarget]: newMult });
                    playSound('dt_card');
                }
            }, 800);
        } else {
            setTopSlot(null);
        }
        setIsTopSlotSpinning(false);
    };

    const handlePlaceBet = (type: WheelOutcome) => {
        if (gameState !== 'BETTING') return;
        if (userBalance < selectedChip) {
            playSound('loss');
            return;
        }
        updateBalance(-selectedChip, 'BET', `Crazy Wheel ${type}`);
        playSound('dt_card');
        setMyBets(prev => {
            const existing = prev.find(b => b.type === type);
            if (existing) {
                return prev.map(b => b.type === type ? { ...b, amount: b.amount + selectedChip } : b);
            }
            return [...prev, { type, amount: selectedChip }];
        });
        // Increase all bets total but only by the actual chip amount + a smaller random variance
        setAllBetsTotal(prev => ({ ...prev, [type]: prev[type] + selectedChip + Math.floor(Math.random() * 50) }));
    };

    const startSpin = async () => {
        if (!isMounted.current) return;
        setGameState('SPINNING');
        playSound('wheel_spin');
        
        const randomIndex = Math.floor(Math.random() * SEGMENTS.length);
        const finalResult = SEGMENTS[randomIndex];
        const segmentDeg = 360 / SEGMENTS.length;
        const targetSegDeg = randomIndex * segmentDeg;
        const extraRotations = (10 + Math.random() * 5) * 360; 
        const targetRotation = extraRotations + (360 - targetSegDeg);
        
        setRotation(prev => prev + targetRotation);
        
        await new Promise(r => setTimeout(r, 7000));
        if (!isMounted.current) return;
        setResult(finalResult);
        setHistory(prev => [finalResult, ...prev].slice(0, 10));

        if (finalResult === 'CRAZY_PLANE') {
            startCrazyBonus();
        } else if (finalResult === 'MEGA_CHANCE') {
            startMegaBonus();
        } else {
            finalizeRound(finalResult, 1);
        }
    };

    const startCrazyBonus = async () => {
        setGameState('BONUS_CRAZY');
        setBonusRotation(0);
        playSound('wheel_spin');
        
        const mults = [2, 5, 10, 25, 50, 100, 500];
        const winIdx = Math.floor(Math.random() * 24);
        const winX = mults[winIdx % mults.length];
        
        const extraRot = (8 + Math.random() * 4) * 360;
        const targetRot = extraRot + (360 - (winIdx * (360/24)));
        
        setBonusRotation(targetRot);
        
        await new Promise(r => setTimeout(r, 4500));
        if (!isMounted.current) return;
        setPlaneX(winX); // Reuse planeX for bonus display
        playSound('win');
        
        await new Promise(r => setTimeout(r, 1500));
        finalizeRound('CRAZY_PLANE', winX);
    };

    const startMegaBonus = async () => {
        setGameState('BONUS_MEGA');
        playSound('wingo_draw');
        let count = 0;
        const mults = [2, 5, 10, 20, 50, 100, 250, 500];
        const interval = setInterval(() => {
            if (!isMounted.current) { clearInterval(interval); return; }
            setMegaX(mults[Math.floor(Math.random() * mults.length)]);
            count++;
            if (count > 25) {
                clearInterval(interval);
                const finalX = mults[Math.floor(Math.random() * mults.length)];
                setMegaX(finalX);
                finalizeRound('MEGA_CHANCE', finalX);
            }
        }, 120);
    };

    const finalizeRound = (outcome: WheelOutcome, bonusX: number) => {
        let totalWin = 0;
        const basePayouts: Record<WheelOutcome, number> = { '1': 1, '2': 2, '5': 5, '10': 10, 'CRAZY_PLANE': bonusX, 'MEGA_CHANCE': bonusX };
        
        // Use the active multiplier if it was assigned last betting phase
        const topSlotMult = activeMultipliers[outcome] || 1;
        const finalPayout = (basePayouts[outcome] + (outcome === 'CRAZY_PLANE' || outcome === 'MEGA_CHANCE' ? 0 : 1)) * topSlotMult;

        myBets.forEach(bet => {
            if (bet.type === outcome) {
                totalWin += bet.amount * finalPayout;
            }
        });

        if (totalWin > 0) {
            updateBalance(totalWin, 'WIN', `Crazy Wheel ${outcome}`);
            playSound('win');
            setWinAmount(totalWin);
        }
        
        setGameState('RESULT');
        onResult({ win: totalWin > 0, amount: totalWin, game: 'Crazy Wheel' });
        addGameHistory('Crazy Wheel', myBets.reduce((a,b) => a+b.amount, 0), totalWin, outcome);

        setTimeout(() => {
            if (!isMounted.current) return;
            setGameState('BETTING');
            setTimeLeft(15);
            setMyBets([]);
            setAllBetsTotal({ '1': 0, '2': 0, '5': 0, '10': 0, 'CRAZY_PLANE': 0, 'MEGA_CHANCE': 0 });
            setResult(null);
            setTopSlot(null);
            setActiveMultipliers({});
            setWinAmount(0);
            setPlaneX(1);
            setMegaX(1);
            setBonusRotation(0);
        }, 1000);
    };

    return (
        <div className="bg-[#05060f] min-h-screen text-white flex flex-col font-sans select-none overflow-hidden relative">
            <HowToPlay isOpen={showHelp} onClose={() => setShowHelp(false)} />

            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-[#0a0c1a] border-b border-white/5 z-[80] shadow-2xl">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} disabled={gameState !== 'BETTING'} className="p-2 bg-slate-800/50 rounded-xl border border-white/10 active:scale-95"><ArrowLeft size={18}/></button>
                    <h1 className="text-sm font-black tracking-[0.2em] text-purple-400 uppercase italic">CRAZY WHEEL</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowHelp(true)} className="p-2 bg-slate-800/50 rounded-xl border border-white/10 text-yellow-500"><HelpCircle size={18}/></button>
                    <div className="bg-slate-900 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                        <Wallet size={12} className="text-yellow-500" />
                        <span className="text-xs font-black font-mono">₹{userBalance.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Top Slot Feature */}
            <div className="h-20 bg-black/40 flex items-center justify-center gap-4 border-b border-white/5 relative overflow-hidden">
                <AnimatePresence mode="wait">
                    {isTopSlotSpinning ? (
                        <motion.div key="spinning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                            <RotateCcw size={20} className="text-purple-500 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white animate-pulse">GENERATING MULTIPLIER...</span>
                        </motion.div>
                    ) : topSlot ? (
                        <motion.div key="slot" initial={{ y: -50, scale: 0.8 }} animate={{ y: 0, scale: 1 }} exit={{ y: -50 }} className="flex items-center gap-4 bg-gradient-to-r from-purple-900 to-indigo-900 px-8 py-2 rounded-2xl border border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                            <Sparkles size={18} className="text-yellow-400" />
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-purple-300 uppercase tracking-widest leading-none mb-1">BOOSTED TARGET</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-black text-white italic drop-shadow-lg">{getSegmentLabel(topSlot.target)}</span>
                                    <div className="bg-yellow-500 text-black px-2 py-0.5 rounded-lg font-black text-sm">x{topSlot.mult}</div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div key="idle" className="text-[8px] font-black tracking-[0.4em] text-slate-700 uppercase">Wait for bonus boost</div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Wheel Area */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-4">
                {/* Pointer */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                    <div className="text-4xl">🔻</div>
                    <div className="w-1 h-32 bg-gradient-to-b from-white/20 to-transparent"></div>
                </div>

                {/* SVG The Wheel */}
                <motion.div 
                    style={{ rotate: rotation }}
                    transition={{ duration: 7, ease: [0.15, 0, 0.1, 1] }}
                    className="relative w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] rounded-full border-[10px] border-[#101226] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden"
                >
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        {SEGMENTS.map((type, i) => {
                            const angle = 360 / SEGMENTS.length;
                            const startAngle = i * angle;
                            const endAngle = (i + 1) * angle;
                            const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                            const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                            const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                            const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);
                            
                            return (
                                <g key={i}>
                                    <path 
                                        d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                                        fill={getHexColor(type)}
                                        stroke="#0a0c1a"
                                        strokeWidth="0.2"
                                    />
                                    <text
                                        x="82"
                                        y="50"
                                        transform={`rotate(${startAngle + angle/2}, 50, 50)`}
                                        fill="white"
                                        fontSize="4.5"
                                        fontWeight="1000"
                                        textAnchor="middle"
                                        className="select-none pointer-events-none drop-shadow-[0_3px_2px_rgba(0,0,0,1)]"
                                        style={{ fontFamily: 'Inter, sans-serif' }}
                                    >
                                        {getSegmentLabel(type)}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </motion.div>

                {/* Center Hub */}
                <div className="absolute w-24 h-24 bg-gradient-to-br from-indigo-900 via-purple-900 to-black rounded-full border-4 border-[#1a1c3a] z-40 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.5)]">
                    <div className="flex flex-col items-center">
                        <div className="text-xl font-black italic gold-text tracking-tighter leading-none">CRAZY</div>
                        <div className="text-[8px] font-black text-white tracking-[0.2em]">WHEEL</div>
                    </div>
                </div>

                {/* Timer Overlay */}
                <AnimatePresence>
                    {gameState === 'BETTING' && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute z-50 bg-black/70 backdrop-blur-2xl px-10 py-5 rounded-[2.5rem] border border-white/10 flex flex-col items-center shadow-2xl">
                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] mb-2">TIME TO BET</span>
                            <div className="text-6xl font-black italic text-white font-mono flex items-center gap-4">
                                <Clock size={32} className={`${timeLeft <= 5 ? 'text-red-500 animate-bounce' : 'text-yellow-500'}`} />
                                {timeLeft}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Betting Panel */}
            <div className="bg-[#0a0c1a] p-4 lg:p-6 rounded-t-[3rem] border-t border-white/5 z-[90] shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
                {/* History Bar */}
                <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar mb-2 px-2">
                    {history.map((h, i) => (
                        <motion.div 
                            key={`${h}-${i}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`min-w-[40px] h-10 rounded-xl flex items-center justify-center text-[10px] font-black border border-white/10 ${getSegmentColor(h)} shadow-lg flex-shrink-0`}
                        >
                            {getSegmentLabel(h)}
                        </motion.div>
                    ))}
                    {history.length === 0 && <div className="text-[8px] font-black text-slate-700 uppercase tracking-widest py-3">No history yet</div>}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    {(['1', '2', '5', '10', 'MEGA_CHANCE', 'CRAZY_PLANE'] as WheelOutcome[]).map(type => (
                        <button
                            key={type}
                            onClick={() => handlePlaceBet(type)}
                            className={`h-24 rounded-3xl border-b-4 flex flex-col items-center justify-center gap-1 transition-all relative overflow-hidden active:scale-95 ${getSegmentColor(type)} border-black/30 shadow-xl`}
                        >
                            {/* Extra Multiplier Badge */}
                            <AnimatePresence>
                                {activeMultipliers[type] && (
                                    <motion.div 
                                        initial={{ scale: 0, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        className="absolute top-2 left-2 bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-lg shadow-lg z-10 animate-pulse border border-white/20"
                                    >
                                        X{activeMultipliers[type]}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="text-2xl font-black italic shadow-text text-white">{getSegmentLabel(type)}</div>
                            <div className="text-[10px] font-bold opacity-80 uppercase tracking-widest text-white/80">
                                {type === 'CRAZY_PLANE' || type === 'MEGA_CHANCE' ? 'BONUS' : `${getPayout(type)}X`}
                            </div>
                            
                            {/* Total Bets Label */}
                            <div className="absolute top-2 right-3 flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-full text-[8px] font-black text-slate-200">
                                <Users size={10} /> ₹{allBetsTotal[type]}
                            </div>

                            {/* My Bet Bubble */}
                            {myBets.some(b => b.type === type) && (
                                <div className="absolute bottom-1 bg-yellow-500 text-black text-[11px] font-black px-4 py-1 rounded-full shadow-2xl border border-white/30 animate-in zoom-in slide-in-from-bottom-2 duration-300">
                                    ₹{myBets.find(b => b.type === type)?.amount}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
                
                <div className="flex gap-3 justify-center">
                    {[10, 50, 100, 500, 1000, 5000].map(val => (
                        <button 
                            key={val} 
                            onClick={() => { setSelectedChip(val); playSound('click'); }}
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-[10px] font-black transition-all border-2 active:scale-90 ${selectedChip === val ? 'bg-yellow-500 border-white text-black scale-110 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'bg-slate-800 border-white/5 text-slate-400'}`}
                        >
                            ₹{val >= 1000 ? (val/1000)+'K' : val}
                        </button>
                    ))}
                </div>
            </div>


            {/* Bonus Overlays */}
            {gameState === 'BONUS_CRAZY' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[100] bg-[#0c0d1e] backdrop-blur-3xl flex flex-col items-center justify-center p-8 overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.2),transparent_70%)] animate-pulse" />
                    <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="italic text-purple-400 font-extrabold tracking-[0.6em] mb-12 uppercase text-base drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]">CRAZY BONUS ROOM</motion.div>
                    
                    {/* Bonus Spinner */}
                    <div className="relative">
                        <motion.div 
                            style={{ rotate: bonusRotation }}
                            transition={{ duration: 4, ease: [0.1, 0, 0, 1] }}
                            className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border-[10px] border-[#1a1c3a] shadow-[0_0_100px_rgba(168,85,247,0.3)] bg-slate-900 relative flex items-center justify-center overflow-hidden"
                        >
                            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                {[...Array(24)].map((_, i) => {
                                    const ang = 360/24;
                                    const sA = i * ang;
                                    const eA = (i + 1) * ang;
                                    const x1 = 50 + 50 * Math.cos((Math.PI * sA) / 180);
                                    const y1 = 50 + 50 * Math.sin((Math.PI * sA) / 180);
                                    const x2 = 50 + 50 * Math.cos((Math.PI * eA) / 180);
                                    const y2 = 50 + 50 * Math.sin((Math.PI * eA) / 180);
                                    return (
                                        <g key={i}>
                                            <path d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`} fill={i%2==0 ? '#1e1b4b' : '#312e81'} stroke="#4f46e5" strokeWidth="0.2" />
                                            <text x="82" y="50" transform={`rotate(${sA+ang/2}, 50, 50)`} fill="white" fontSize="4" fontWeight="900" textAnchor="middle">{[2,5,10,25,50,100,500][i%7]}X</text>
                                        </g>
                                    );
                                })}
                            </svg>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.5)_100%)] pointer-events-none" />
                        </motion.div>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-4xl drop-shadow-lg z-50">🔻</div>
                    </div>
                    
                    <div className="mt-16 relative">
                        <div className="text-7xl font-black italic gold-text animate-pulse">{bonusX}x</div>
                        <div className="absolute -inset-10 bg-purple-500/20 blur-[60px] -z-10" />
                    </div>
                </motion.div>
            )}

            {gameState === 'BONUS_MEGA' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[100] bg-indigo-950/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8">
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.1),transparent_70%)]" />
                     <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="italic text-pink-400 font-extrabold tracking-[0.4em] mb-10 uppercase text-sm drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">MEGA CHOICE DRAW</motion.div>
                     
                     <div className="relative group">
                        <motion.div 
                            animate={{ scale: [1, 1.05, 1], rotateY: [0, 180, 360] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="w-56 h-72 bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-800 rounded-[2.5rem] flex flex-col items-center justify-center shadow-[0_0_100px_rgba(236,72,153,0.5)] border-4 border-white/30 p-2"
                        >
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4">MULTIPLIER</span>
                            <span className="text-7xl font-black italic text-white drop-shadow-2xl">{bonusX}x</span>
                            <Sparkles className="absolute top-4 right-4 text-white/30" size={24} />
                        </motion.div>
                        <div className="absolute -inset-20 bg-pink-500/10 blur-[120px] rounded-full -z-10" />
                     </div>
                </motion.div>
            )}

    // Results Screen
            {gameState === 'RESULT' && myBets.length > 0 && (
                <div className="absolute inset-0 z-[110] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-10 animate-in zoom-in duration-300">
                    {winAmount > 0 ? (
                        <>
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1, rotate: 360 }}
                                className="w-40 h-40 bg-yellow-500 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(234,179,8,0.6)] mb-8 border-8 border-white/20"
                            >
                                <TrendingUp size={80} className="text-black" />
                            </motion.div>
                            <h2 className="text-6xl font-black italic text-white uppercase tracking-tighter mb-2 drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">BIG WIN!</h2>
                            <div className="text-8xl font-black gold-text italic mb-4 animate-pulse drop-shadow-2xl">₹{winAmount.toFixed(0)}</div>
                            <div className="bg-white/10 px-6 py-2 rounded-full border border-white/20 text-sm font-black text-purple-300 uppercase tracking-widest">
                                Result: {getSegmentLabel(result || '1')}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mb-8 border border-white/10">
                                <RotateCcw size={64} className="text-slate-500" />
                            </div>
                            <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter mb-2">TRY AGAIN</h2>
                            <div className="text-7xl font-black text-slate-400 italic mb-10">{getSegmentLabel(result || '1')}</div>
                            <p className="text-xs font-black text-slate-600 uppercase tracking-widest">No matching bets this time</p>
                        </>
                    )}
                </div>
            )}

            {/* Quick Result for non-bettors */}
            {gameState === 'RESULT' && myBets.length === 0 && (
                 <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-[110] bg-black/60 backdrop-blur-md px-10 py-6 rounded-3xl border border-white/10 text-center animate-in slide-in-from-top-10 duration-500">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">GAME RESULT</span>
                    <div className="text-6xl font-black italic text-white">{getSegmentLabel(result || '1')}</div>
                 </div>
            )}


            <style>{`
                .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .shadow-text { text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
};

const HowToPlay: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/95 backdrop-blur-md p-4">
            <motion.div initial={{ y: 200 }} animate={{ y: 0 }} className="w-full max-w-md bg-[#0a0c1a] rounded-3xl p-8 border border-white/10 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-xl text-slate-400"><X size={20}/></button>
                <h2 className="text-2xl font-black italic gold-text uppercase mb-6 pr-8">CRAZY WHEEL RULES</h2>
                <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <h4 className="text-yellow-500 font-black text-xs uppercase mb-2">Base Game</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">Place bets on numbers or bonus games. If the wheel lands on your number, you win (Bet x Multiplier). "1" pays 2x, "2" pays 3x, etc.</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <h4 className="text-purple-400 font-black text-xs uppercase mb-2">Top Slot Boost</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">At the start of each round, a Top Slot might assign a multiplier (up to 50x) to a random segment. If the wheel lands there, that multiplier applies to all winning bets on that segment.</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <h4 className="text-indigo-400 font-black text-xs uppercase mb-2">Crazy Plane Bonus</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">Landing on Crazy Plane starts an interactive flight. The multiplier climbs rapidly; if it reaches 100x+, it's a Mega Win!</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <h4 className="text-pink-400 font-black text-xs uppercase mb-2">Mega Chance</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">A specialized RNG draw that guarantees a multiplier between 2x and 500x your bet.</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CrazyWheel;


