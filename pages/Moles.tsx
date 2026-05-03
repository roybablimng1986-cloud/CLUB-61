import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Wallet, Info, Trophy, History, Hammer, Circle, X } from 'lucide-react';
import { playSound, updateBalance, addGameHistory } from '../services/mockFirebase';
import { GameResult } from '../types';

const Moles: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [betAmount, setBetAmount] = useState(10);
    const [ratsCount, setRatsCount] = useState(1);
    const [status, setStatus] = useState<'IDLE' | 'PLAYING' | 'GAMEOVER' | 'CASHOUT'>('IDLE');
    const [revealed, setRevealed] = useState<number[]>([]);
    const [molesPositions, setMolesPositions] = useState<number[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    const [multiplier, setMultiplier] = useState(1.0);
    
    const isMounted = useRef(true);

    const calculateMultiplier = (totalHoles: number, totalRats: number, hits: number) => {
        let m = 1.0;
        let holes = totalHoles;
        let rats = totalRats;
        
        for(let i = 0; i < hits; i++) {
            if (rats > 0) {
                m *= (holes / rats);
                holes--;
                rats--;
            }
        }
        return m * 0.96; // House edge
    };

    const handleStart = () => {
        if (betAmount > userBalance) return alert("Insufficient Balance");
        if (betAmount < 10) return alert("Minimum bet is ₹10");

        updateBalance(-betAmount, 'BET', 'Moles Stake');
        playSound('bet_place');
        
        // Randomly place rats
        const positions: number[] = [];
        while(positions.length < ratsCount) {
            const pos = Math.floor(Math.random() * 6);
            if (!positions.includes(pos)) positions.push(pos);
        }
        
        setMolesPositions(positions);
        setRevealed([]);
        setMultiplier(1.0);
        setStatus('PLAYING');
    };

    const handleHit = (idx: number) => {
        if (status !== 'PLAYING' || revealed.includes(idx)) return;

        playSound('dt_card'); // Hammer sound fallback
        setRevealed(prev => [...prev, idx]);

        if (molesPositions.includes(idx)) {
            // Hit a rat
            const nextHits = revealed.length + 1;
            const nextMulti = calculateMultiplier(6, ratsCount, nextHits);
            setMultiplier(nextMulti);
            playSound('win');

            // If all rats found (unlikely logic for this game, usually you can cashout whenever)
        } else {
            // Miss - Loss
            handleLoss();
        }
    };

    const handleLoss = () => {
        setStatus('GAMEOVER');
        playSound('loss');
        playSound('plane_crash'); // Laughing sound fallback or generic loss
        
        setHistory(prev => [{ win: false, multi: 0 }, ...prev].slice(0, 10));
        onResult({ 
            win: false, 
            amount: betAmount, 
            game: 'Moles', 
            resultDetails: [{ label: 'Result', value: 'Missed!', color: 'text-red-500' }] 
        });
        
        setTimeout(() => setStatus('IDLE'), 2000);
    };

    const handleCashout = () => {
        if (status !== 'PLAYING' || revealed.length === 0) return;

        const win = betAmount * multiplier;
        updateBalance(win, 'WIN', 'Moles Cashout');
        playSound('cash_out');
        setStatus('CASHOUT');
        
        setHistory(prev => [{ win: true, multi: multiplier }, ...prev].slice(0, 10));
        onResult({ 
            win: true, 
            amount: win, 
            game: 'Moles', 
            resultDetails: [{ label: 'Win', value: `₹${win.toFixed(2)}`, color: 'text-green-500' }, { label: 'Multi', value: `${multiplier.toFixed(2)}x` }] 
        });
        addGameHistory('Moles', betAmount, win, `Found ${revealed.length} rats`);

        setTimeout(() => setStatus('IDLE'), 2000);
    };

    return (
        <div className="min-h-screen bg-[#070b14] text-white flex flex-col font-sans select-none overflow-hidden pb-safe">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-[#0d121f] border-b border-white/5 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 bg-[#1a1f2e] rounded-xl active:scale-90 transition-transform">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black italic gold-text tracking-wider uppercase leading-none">MOLES</h1>
                        <p className="text-[8px] font-bold text-slate-500 tracking-[0.2em] uppercase mt-1">Underground Arena</p>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2 bg-[#1a1f2e] px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
                        <Wallet size={14} className="text-emerald-500" />
                        <span className="text-sm font-black font-mono">₹{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setShowHelp(true)} className="text-slate-400 hover:text-white transition-colors">
                        <Info size={20} />
                    </button>
                </div>
            </div>

            {/* Game Stage */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] bg-repeat">
                <div className="relative z-10 grid grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <motion.div 
                            key={i}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleHit(i)}
                            className="relative group w-24 h-24 sm:w-32 sm:h-32"
                        >
                            {/* Hole */}
                            <div className="absolute inset-0 bg-black/60 rounded-full shadow-inner border-t-8 border-black/40 overflow-hidden transform perspective-1000 rotateX-30">
                                <div className="absolute inset-x-2 bottom-0 h-4 bg-black/40 rounded-[50%_50%_0_0]"></div>
                            </div>

                            {/* Rat/Mole Animation */}
                            <AnimatePresence>
                                {revealed.includes(i) && (
                                    <motion.div 
                                        initial={{ y: 50 }}
                                        animate={{ y: 0 }}
                                        className="absolute inset-0 flex items-center justify-center -top-8"
                                    >
                                        {molesPositions.includes(i) ? (
                                            <div className="relative">
                                                {/* Yellow Rat UI as requested */}
                                                <div className="w-16 h-20 bg-yellow-500 rounded-[40%_40%_20%_20%] shadow-lg border-b-4 border-yellow-700 flex flex-col items-center justify-center">
                                                    <div className="flex gap-4 mb-2">
                                                        <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                                                        <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                                                    </div>
                                                    <div className="w-4 h-1 bg-pink-300 rounded-full"></div>
                                                </div>
                                                <div className="absolute -top-4 -left-2 w-8 h-8 bg-yellow-600 rounded-full -z-10 rotate-[-15deg]"></div>
                                                <div className="absolute -top-4 -right-2 w-8 h-8 bg-yellow-600 rounded-full -z-10 rotate-[15deg]"></div>
                                            </div>
                                        ) : (
                                            <motion.div 
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="text-red-500 font-black text-4xl italic uppercase"
                                            >
                                                MISS
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Hammer Animation on Hit */}
                            {revealed.includes(i) && (
                                <motion.div 
                                    initial={{ rotate: 45, x: 20, y: -20, opacity: 0 }}
                                    animate={{ rotate: 0, x: 0, y: 0, opacity: [0, 1, 0] }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
                                >
                                    <Hammer size={48} className="text-slate-400 fill-slate-700" />
                                </motion.div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Status Overlay */}
                <div className="mt-12 text-center">
                    <AnimatePresence mode="wait">
                        {status === 'PLAYING' ? (
                            <motion.div 
                                key="playing"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-1"
                            >
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Current Multiplier</p>
                                <h3 className="text-4xl font-black italic gold-text">{multiplier.toFixed(2)}x</h3>
                            </motion.div>
                        ) : status === 'IDLE' ? (
                            <motion.p 
                                key="idle" 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }}
                                className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] animate-pulse"
                            >
                                Select rats & place your bet
                            </motion.p>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-[#0a0f1d] p-6 border-t border-white/5 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-[60]">
                {status === 'IDLE' ? (
                    <div className="space-y-6">
                        {/* Rats Count Control */}
                        <div className="space-y-2">
                             <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Rats in Arena</span>
                                <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">{ratsCount} / 5</span>
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <button 
                                        key={n}
                                        onClick={() => setRatsCount(n)}
                                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border
                                            ${ratsCount === n ? 'bg-yellow-600 border-white text-slate-950 scale-105' : 'bg-[#1a1f2e] text-slate-500 border-white/5'}
                                        `}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Amount & Play */}
                        <div className="flex gap-4">
                            <div className="flex-[2] bg-[#1a1f2e] p-1.5 rounded-2xl border border-white/5 flex items-center justify-between shadow-inner">
                                <button onClick={() => setBetAmount(Math.max(10, betAmount - 10))} className="w-10 h-10 rounded-xl bg-[#2a2f3e] flex items-center justify-center font-black active:scale-90 transition-transform text-slate-400">-</button>
                                <div className="flex flex-col items-center">
                                    <span className="text-xl font-black font-mono">₹{betAmount}</span>
                                </div>
                                <button onClick={() => setBetAmount(betAmount + 50)} className="w-10 h-10 rounded-xl bg-[#2a2f3e] flex items-center justify-center font-black active:scale-90 transition-transform text-slate-400">+</button>
                            </div>
                            <button 
                                onClick={handleStart}
                                className="flex-[3] bg-emerald-600 border-b-[6px] border-emerald-800 rounded-2xl font-black text-lg active:translate-y-1 active:border-b-0 transition-all shadow-xl uppercase"
                            >
                                START HUNT
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-4 items-stretch h-20">
                        {status === 'PLAYING' ? (
                            <>
                                <div className="flex-[2] flex flex-col justify-center items-center bg-black/40 rounded-2xl border border-white/5">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pending Payout</span>
                                    <span className="text-xl font-black italic gold-text">₹{(betAmount * multiplier).toFixed(2)}</span>
                                </div>
                                <button 
                                    onClick={handleCashout}
                                    disabled={revealed.length === 0}
                                    className={`flex-[3] bg-yellow-600 border-b-[6px] border-yellow-800 rounded-2xl font-black text-lg active:translate-y-1 active:border-b-0 transition-all shadow-xl uppercase
                                        ${revealed.length === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                                    `}
                                >
                                    CASHOUT
                                </button>
                            </>
                        ) : (
                            <div className="w-full flex items-center justify-center bg-zinc-900/50 rounded-2xl border border-white/5 animate-pulse">
                                <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 italic">Reseting Area...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Help Overlay */}
            <AnimatePresence>
                {showHelp && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md p-6 flex items-center justify-center"
                    >
                        <div className="bg-[#1a1f2e] w-full max-w-sm rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative">
                            <button onClick={() => setShowHelp(false)} className="absolute top-6 right-6 p-2 bg-black/20 rounded-full">
                                <X size={16} className="text-slate-400" />
                            </button>
                            
                            <h3 className="text-2xl font-black italic gold-text uppercase mb-6">MOLES RULES</h3>
                            
                            <div className="space-y-6 text-sm font-medium text-slate-300">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-yellow-600/20 flex items-center justify-center shrink-0 border border-yellow-500/20 text-yellow-400 font-black italic">1</div>
                                    <p>Select how many <span className="text-white font-black">Yellow Rats</span> are hiding in the 6 holes.</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-600/20 flex items-center justify-center shrink-0 border border-orange-500/20 text-orange-400 font-black italic">2</div>
                                    <p>Lesser rats = Higher multiplier per hit. Hit a hole to reveal what's inside.</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400 font-black italic">3</div>
                                    <p>If you hit a rat, you win! Cashout or keep hunting for bigger rewards.</p>
                                </div>
                            </div>

                            <button onClick={() => setShowHelp(false)} className="w-full mt-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all">
                                GOT IT
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Moles;
