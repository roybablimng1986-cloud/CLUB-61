import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Wallet, Info, Trophy, History, Settings, Play, RefreshCcw, Star, Zap, Gem } from 'lucide-react';
import { playSound, updateBalance, addGameHistory } from '../services/mockFirebase';
import { GameResult } from '../types';

const SYMBOLS = [
  { icon: '🍒', value: 'CHERRY', multiplier: 2, color: 'text-red-500' },
  { icon: '🍋', value: 'LEMON', multiplier: 3, color: 'text-yellow-400' },
  { icon: '🍇', value: 'GRAPE', multiplier: 5, color: 'text-purple-400' },
  { icon: '🔔', value: 'BELL', multiplier: 10, color: 'text-yellow-600' },
  { icon: '💎', value: 'DIAMOND', multiplier: 25, color: 'text-blue-400' },
  { icon: '7️⃣', value: 'SEVEN', multiplier: 100, color: 'text-red-600' },
  { icon: '👑', value: 'CROWN', multiplier: 500, color: 'text-yellow-500' },
];

const JackpotSpin: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [betAmount, setBetAmount] = useState(10);
    const [spinningReels, setSpinningReels] = useState<boolean[]>([false, false, false, false]);
    const [status, setStatus] = useState<'IDLE' | 'SPINNING' | 'WIN' | 'LOSS'>('IDLE');
    const [isSpinning, setIsSpinning] = useState(false);
    const [showPaytable, setShowPaytable] = useState(false);
    const [grid, setGrid] = useState<number[]>(Array(16).fill(0).map(() => Math.floor(Math.random() * SYMBOLS.length)));
    const [winningLines, setWinningLines] = useState<number[][]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [jackpotPool, setJackpotPool] = useState(54820.45);
    const [totalWin, setTotalWin] = useState(0);
    
    const isMounted = useRef(true);

    const PAYLINES = [
        [0,1,2,3], [4,5,6,7], [8,9,10,11], [12,13,14,15], // Horizontals
        [0,4,8,12], [1,5,9,13], [2,6,10,14], [3,7,11,15], // Verticals
        [0,5,10,15], [3,6,9,12] // Diagonals
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setJackpotPool(prev => prev + (Math.random() * 0.5));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleSpin = () => {
        if (status === 'SPINNING' || isSpinning) return;
        if (betAmount > userBalance) return alert("Insufficient Balance");
        
        setWinningLines([]);
        setTotalWin(0);
        updateBalance(-betAmount, 'BET', 'Slot Spin');
        playSound('dt_card');
        setStatus('SPINNING');
        setIsSpinning(true);
        setSpinningReels([true, true, true, true]);

        // Predetermine result immediately
        const newGrid = Array.from({ length: 16 }, () => {
            const rand = Math.random();
            if (rand < 0.005) return 6; // Crown
            if (rand < 0.03) return 5; // Seven
            if (rand < 0.08) return 4; // Diamond
            if (rand < 0.18) return 3; // Bell
            if (rand < 0.35) return 2; // Grape
            if (rand < 0.60) return 1; // Lemon
            return 0; // Cherry
        });

        // Staggered stop logic
        [0, 1, 2, 3].forEach((col) => {
            setTimeout(() => {
                if (!isMounted.current) return;
                
                // Partially update grid column by column
                setGrid(prev => {
                    const next = [...prev];
                    for(let row = 0; row < 4; row++) {
                        next[row * 4 + col] = newGrid[row * 4 + col];
                    }
                    return next;
                });

                setSpinningReels(prev => {
                    const next = [...prev];
                    next[col] = false;
                    return next;
                });
                
                playSound('dt_card'); // Sound for each reel stop

                if (col === 3) {
                    setIsSpinning(false);
                    checkResult(newGrid);
                }
            }, 1000 + col * 400); // 1s, 1.4s, 1.8s, 2.2s
        });
    };

    const checkResult = (currentGrid: number[]) => {
        let lines: number[][] = [];
        let winSum = 0;

        PAYLINES.forEach(line => {
            const symbolsInLine = line.map(idx => currentGrid[idx]);
            if (symbolsInLine.every(s => s === symbolsInLine[0])) {
                lines.push(line);
                winSum += betAmount * SYMBOLS[symbolsInLine[0]].multiplier;
            }
        });

        if (winSum > 0) {
            setWinningLines(lines);
            setTotalWin(winSum);
            updateBalance(winSum, 'WIN', 'Slot Win');
            playSound('win');
            setStatus('WIN');
            onResult({ 
                win: true, 
                amount: winSum, 
                game: 'Jackpot Spin', 
                resultDetails: [{ label: 'Lines Won', value: lines.length.toString() }, { label: 'Total Payout', value: `₹${winSum.toFixed(2)}` }] 
            });
        } else {
            playSound('loss');
            setStatus('LOSS');
        }

        setTimeout(() => { if (isMounted.current) setStatus('IDLE'); }, 3000);
    };

    return (
        <div className="min-h-screen bg-[#070b14] text-white flex flex-col font-sans select-none overflow-hidden pb-safe">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-[#0d121f] border-b border-white/5 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 bg-[#1a1f2e] rounded-xl active:scale-90 transition-transform"><ArrowLeft size={20} /></button>
                    <h1 className="text-lg font-black italic gold-text uppercase">ROYAL SLOTS</h1>
                </div>
                <div className="flex gap-2 items-center">
                    <button onClick={() => setShowPaytable(true)} className="p-2.5 bg-[#1a1f2e] rounded-xl"><Info size={20} className="text-blue-400" /></button>
                    <div className="bg-[#1a1f2e] px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
                        <span className="text-emerald-500 mr-2 text-sm font-bold">₹</span>
                        <span className="text-sm font-black font-mono">{userBalance.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Jackpot */}
            <div className="bg-yellow-600/10 p-2 text-center border-b border-yellow-500/10">
                <div className="text-[9px] font-black tracking-[0.4em] text-yellow-500 mb-0.5">JACKPOT POOL</div>
                <div className="text-2xl font-black italic tabular-nums text-white">₹{jackpotPool.toFixed(2)}</div>
            </div>

            {/* Grid */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                <div className="bg-gradient-to-b from-[#2a2f3e] to-[#0d121f] p-3 rounded-[2rem] shadow-2xl border-4 border-[#1a1f2e] relative">
                    <div className="grid grid-cols-4 gap-2 bg-black/80 p-2 rounded-2xl">
                        {grid.map((symIdx, i) => {
                            const isWin = winningLines.some(line => line.includes(i));
                            const colIndex = i % 4;
                            const isReelSpinning = spinningReels[colIndex];
                            
                            return (
                                <motion.div 
                                    key={i}
                                    animate={isReelSpinning ? { 
                                        y: [0, 150, -150, 0],
                                        filter: ["blur(0px)", "blur(4px)", "blur(4px)", "blur(0px)"]
                                    } : { 
                                        y: [20, -10, 5, 0], // Landing bounce
                                        scale: isWin ? [1, 1.1, 1] : 1,
                                    }}
                                    transition={isReelSpinning ? { 
                                        repeat: Infinity, 
                                        duration: 0.1,
                                        ease: "linear",
                                        delay: colIndex * 0.02
                                    } : { 
                                        y: { duration: 0.4, ease: "easeOut" },
                                        scale: { duration: 0.6, repeat: isWin ? Infinity : 0, ease: "easeInOut" }
                                    }}
                                    className={`w-16 h-16 sm:w-22 sm:h-22 flex items-center justify-center rounded-2xl bg-[#1a1f2e] border transition-all shadow-inner
                                        ${isWin ? 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.4)] z-10' : 'border-white/5'}
                                    `}
                                >
                                    <span className={`text-4xl sm:text-5xl filter drop-shadow-md select-none`}>
                                        {SYMBOLS[symIdx].icon}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-6 h-12 flex items-center justify-center">
                    {status === 'WIN' && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                           <div className="text-emerald-400 font-black italic text-2xl uppercase tracking-tighter">Big Win!</div>
                           <div className="text-white font-mono font-black">+₹{totalWin.toFixed(2)}</div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="bg-[#0a0f1d] p-6 border-t border-white/5 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                <div className="flex gap-4 items-center mb-6 overflow-x-auto no-scrollbar py-2">
                    {[10, 20, 50, 100, 200, 500].map(amt => (
                        <button key={amt} onClick={() => setBetAmount(amt)} className={`px-5 py-3 rounded-xl text-xs font-black transition-all shrink-0 border ${betAmount === amt ? 'bg-yellow-500 border-white text-black' : 'bg-[#1a1f2e] border-white/5 text-slate-500'}`}>₹{amt}</button>
                    ))}
                </div>
                <button 
                  onClick={handleSpin}
                  disabled={status === 'SPINNING'}
                  className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-2xl transition-all ${status === 'SPINNING' ? 'bg-slate-800 text-slate-600 grayscale' : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white active:translate-y-1'}`}
                >
                    <RefreshCcw className={status === 'SPINNING' ? 'animate-spin' : ''} />
                    SPIN WHEEL
                </button>
            </div>
            {/* Paytable Modal */}
            <AnimatePresence>
                {showPaytable && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md p-6 flex flex-col items-center justify-center"
                    >
                        <div className="bg-[#1a1f2e] w-full max-w-sm rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-y-auto max-h-[85vh]">
                            <h3 className="text-2xl font-black italic gold-text uppercase mb-6 text-center">PAYTABLE</h3>
                            
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                {SYMBOLS.map((s, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5 shadow-inner">
                                        <span className="text-2xl">{s.icon}</span>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-500 uppercase">{s.value}</span>
                                            <span className="text-xs font-black text-yellow-500">{s.multiplier}X</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 text-[10px] font-bold text-slate-400 bg-black/40 p-5 rounded-2xl border border-white/5">
                                <p className="text-white uppercase font-black mb-2 border-b border-white/10 pb-2">How to Play:</p>
                                <ul className="space-y-2 list-disc pl-4">
                                    <li>Match 4 symbols in any horizontal, vertical, or diagonal line.</li>
                                    <li>Total win = Bet x Symbol Multiplier.</li>
                                    <li>Multiple winning lines are combined!</li>
                                </ul>
                            </div>

                            <button onClick={() => setShowPaytable(false)} className="w-full mt-8 py-4 bg-yellow-500 text-black font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all">BACK TO GAME</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default JackpotSpin;
