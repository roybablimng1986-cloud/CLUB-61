import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Wallet, Info, Trophy, Settings, History, Play, Pause, Square } from 'lucide-react';
import { playSound, updateBalance, addGameHistory } from '../services/mockFirebase';
import { GameResult } from '../types';

type Difficulty = 'Easy' | 'Normal' | 'Hard';

const Pump: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [betAmount, setBetAmount] = useState(10);
    const [difficulty, setDifficulty] = useState<Difficulty>('Normal');
    const [multiplier, setMultiplier] = useState(1.0);
    const [status, setStatus] = useState<'IDLE' | 'PLAYING' | 'CRASHED' | 'CASHOUT'>('IDLE');
    const [history, setHistory] = useState<number[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    
    const isMounted = useRef(true);
    const multiplierRef = useRef(1.0);

    const getDifficultySettings = (diff: Difficulty) => {
        switch(diff) {
            case 'Easy': return { crashChance: 0.04, step: 0.10 };
            case 'Normal': return { crashChance: 0.10, step: 0.30 };
            case 'Hard': return { crashChance: 0.22, step: 0.75 };
        }
    };

    const handleStart = () => {
        if (betAmount > userBalance) return alert("Insufficient Balance");
        if (betAmount < 10) return alert("Minimum bet is ₹10");

        updateBalance(-betAmount, 'BET', 'Pump Stake');
        playSound('bet_place');
        
        multiplierRef.current = 1.0;
        setMultiplier(1.0);
        setStatus('PLAYING');
    };

    const handlePump = () => {
        if (status !== 'PLAYING') return;

        const { crashChance, step } = getDifficultySettings(difficulty);
        
        // Random crash check
        if (Math.random() < crashChance) {
            handleCrash();
            return;
        }

        playSound('wingo_tick');
        const nextMulti = multiplierRef.current + step;
        multiplierRef.current = nextMulti;
        setMultiplier(nextMulti);
    };

    const handleCrash = () => {
        setStatus('CRASHED');
        playSound('plane_crash');
        setHistory(prev => [multiplierRef.current, ...prev].slice(0, 10));
        onResult({ 
            win: false, 
            amount: betAmount, 
            game: 'Pump', 
            resultDetails: [{ label: 'Crashed', value: `${multiplierRef.current.toFixed(2)}x`, color: 'text-red-500' }] 
        });
        
        setTimeout(() => setStatus('IDLE'), 2000);
    };

    const handleCashout = () => {
        if (status !== 'PLAYING') return;

        const win = betAmount * multiplierRef.current;
        updateBalance(win, 'WIN', 'Pump Cashout');
        playSound('cash_out');
        setStatus('CASHOUT');
        setHistory(prev => [multiplierRef.current, ...prev].slice(0, 10));
        
        onResult({ 
            win: true, 
            amount: win, 
            game: 'Pump', 
            resultDetails: [{ label: 'Win', value: `₹${win.toFixed(2)}`, color: 'text-green-500' }, { label: 'Multi', value: `${multiplierRef.current.toFixed(2)}x` }] 
        });
        addGameHistory('Pump', betAmount, win, `Pumped to ${multiplierRef.current.toFixed(2)}x`);

        setTimeout(() => setStatus('IDLE'), 2000);
    };

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    return (
        <div className="min-h-screen bg-[#070b14] text-white flex flex-col font-sans select-none overflow-hidden pb-safe">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-[#0d121f] border-b border-white/5 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 bg-[#1a1f2e] rounded-xl active:scale-90 transition-transform">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black italic gold-text tracking-wider uppercase leading-none">PUMP</h1>
                        <p className="text-[8px] font-bold text-slate-500 tracking-[0.2em] uppercase mt-1">Inflation Arena</p>
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

            {/* History Bar */}
            <div className="bg-[#0a0f1d] p-2 flex items-center gap-3 overflow-x-auto no-scrollbar border-b border-white/5">
                <History size={14} className="text-slate-700 shrink-0 ml-2" />
                <div className="flex gap-2">
                    {history.length === 0 ? (
                        <span className="text-[10px] font-black text-slate-800 uppercase italic">No recent bursts</span>
                    ) : (
                        history.map((h, i) => (
                            <span key={i} className={`px-3 py-1 rounded-full text-[10px] font-black border whitespace-nowrap shadow-md ${h >= 2 ? 'bg-purple-600/20 text-purple-400 border-purple-500/20' : 'bg-red-900/20 text-red-400 border-red-500/20'}`}>
                                {h.toFixed(2)}x
                            </span>
                        ))
                    )}
                </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"></div>
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-20 pointer-events-none">
                    {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} className="border-[0.5px] border-white/5"></div>
                    ))}
                </div>

                {/* The Balloon */}
                <div className="relative z-10 flex flex-col items-center justify-center mt-[-10%]">
                    <AnimatePresence mode="wait">
                        {status === 'CRASHED' ? (
                            <motion.div 
                                key="crashed"
                                initial={{ scale: 0.8, opacity: 1 }}
                                animate={{ scale: 2, opacity: 0 }}
                                className="absolute"
                            >
                                <div className="w-40 h-40 bg-red-600 rounded-full blur-2xl opacity-50"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-4xl font-black text-white italic drop-shadow-2xl">POP!</span>
                                </div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>

                    <motion.div 
                        initial={{ scale: 0.4 }}
                        animate={{ 
                            scale: status === 'IDLE' ? 0.4 : 0.6 + (multiplier - 1) * 0.2,
                            rotate: status === 'IDLE' ? [0, 1, -1, 0] : status === 'PLAYING' ? [0, 3, -3, 0] : 0,
                            x: status === 'IDLE' ? [0, 1, -1, 0] : 0
                        }}
                        transition={{ 
                            scale: { type: 'spring', stiffness: 100, damping: 12 },
                            rotate: { duration: status === 'IDLE' ? 0.5 : 2, repeat: Infinity },
                            x: { duration: 0.4, repeat: Infinity }
                        }}
                        className={`relative w-40 h-48 rounded-[50%_50%_50%_50%_/_40%_40%_60%_60%] shadow-2xl flex items-center justify-center
                            ${difficulty === 'Easy' ? 'bg-emerald-500' : difficulty === 'Normal' ? 'bg-blue-600' : 'bg-red-600'}
                            ${status === 'CRASHED' ? 'opacity-0 scale-0' : 'opacity-100'}
                        `}
                    >
                        {/* Balloon Shine */}
                        <div className="absolute top-4 left-6 w-10 h-14 bg-white/20 rounded-full blur-sm rotate-[30deg]"></div>
                        
                        {/* Current Multiplier */}
                        <div className="text-center z-20">
                            <motion.h2 
                                key={multiplier}
                                initial={{ scale: 1.2 }}
                                animate={{ scale: 1 }}
                                className="text-3xl font-black italic drop-shadow-lg"
                            >
                                {multiplier.toFixed(2)}x
                            </motion.h2>
                            {status === 'PLAYING' && (
                                <p className="text-[10px] font-black uppercase text-white/50 tracking-widest mt-1 italic">
                                    Pump it!
                                </p>
                            )}
                        </div>

                        {/* Balloon Tail */}
                        <div className={`absolute -bottom-2 w-4 h-4 rotate-45 z-0
                            ${difficulty === 'Easy' ? 'bg-emerald-600' : difficulty === 'Normal' ? 'bg-blue-700' : 'bg-red-700'}
                        `}></div>
                    </motion.div>

                    {/* Balloon String */}
                    <motion.div 
                        animate={{ height: status === 'PLAYING' ? 120 : 80 }}
                        className="w-0.5 bg-slate-700 mt-2 origin-top"
                    ></motion.div>
                </div>

                {/* Dynamic Feedback */}
                <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none">
                    <AnimatePresence>
                        {status === 'CASHOUT' && (
                            <motion.div 
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                className="bg-emerald-500/20 backdrop-blur-md px-8 py-3 rounded-2xl border border-emerald-500/30 flex flex-col items-center gap-1"
                            >
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">SUCCESSFUL CASHOUT</span>
                                <span className="text-2xl font-black italic gold-text tracking-tighter">₹{(betAmount * multiplier).toFixed(2)}</span>
                            </motion.div>
                        )}
                        {status === 'CRASHED' && (
                            <motion.div 
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                className="bg-red-600/20 backdrop-blur-md px-8 py-3 rounded-2xl border border-red-500/30 flex flex-col items-center"
                            >
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">BET LOST</span>
                                <span className="text-lg font-black italic text-white uppercase tracking-tighter">BALLOON BURST</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Lower Controls */}
            <div className="bg-[#0a0f1d] p-6 border-t border-white/5 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-[60]">
                {status === 'IDLE' ? (
                    <div className="space-y-6">
                        {/* Difficulty Selector */}
                        <div className="flex gap-2">
                            {(['Easy', 'Normal', 'Hard'] as Difficulty[]).map((diff) => (
                                <button 
                                    key={diff}
                                    onClick={() => setDifficulty(diff)}
                                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                                        ${difficulty === diff 
                                            ? diff === 'Easy' ? 'bg-emerald-600 border-white text-white' : diff === 'Normal' ? 'bg-blue-600 border-white text-white' : 'bg-red-600 border-white text-white'
                                            : 'bg-[#1a1f2e] text-slate-500 border-white/5'
                                        }`}
                                >
                                    {diff}
                                </button>
                            ))}
                        </div>

                        {/* Amount Controls */}
                        <div className="flex gap-4 items-center">
                            <div className="flex-1 bg-[#1a1f2e] p-1.5 rounded-2xl border border-white/5 flex items-center justify-between shadow-inner">
                                <button onClick={() => setBetAmount(Math.max(10, betAmount - 10))} className="w-10 h-10 rounded-xl bg-[#2a2f3e] flex items-center justify-center font-black active:scale-90 transition-transform text-slate-400">-</button>
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">STAKE</span>
                                    <span className="text-xl font-black font-mono">₹{betAmount}</span>
                                </div>
                                <button onClick={() => setBetAmount(betAmount + 50)} className="w-10 h-10 rounded-xl bg-[#2a2f3e] flex items-center justify-center font-black active:scale-90 transition-transform text-slate-400">+</button>
                            </div>
                        </div>

                        {/* Start Button */}
                        <button 
                            onClick={handleStart}
                            className={`w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 border-b-[6px] shadow-2xl flex items-center justify-center gap-3
                                ${difficulty === 'Easy' ? 'bg-emerald-600 border-emerald-800 text-white' : difficulty === 'Normal' ? 'bg-blue-600 border-blue-800 text-white' : 'bg-red-600 border-red-800 text-white'}
                            `}
                        >
                            <Play size={20} className="fill-current" />
                            PLACE BET
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-4 items-stretch h-32">
                        {status === 'PLAYING' ? (
                            <>
                                <button 
                                    onClick={handlePump}
                                    className="flex-1 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl border-b-[6px] border-orange-800 active:translate-y-1 active:border-b-0 transition-all flex flex-col items-center justify-center gap-1 group"
                                >
                                    <motion.div whileTap={{ scale: 0.9 }}>
                                        <Play size={32} className="rotate-[-90deg] fill-white" />
                                    </motion.div>
                                    <span className="text-xs font-black uppercase tracking-tighter text-white drop-shadow-md">PUMP IT</span>
                                </button>
                                <button 
                                    onClick={handleCashout}
                                    className="flex-1 bg-zinc-900 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-emerald-500"
                                >
                                    <Trophy size={28} />
                                    <span className="text-xs font-black uppercase tracking-tighter">CASHOUT</span>
                                </button>
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center animate-pulse">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Cleaning up the arena...</p>
                                    <div className="flex gap-1 justify-center">
                                        {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-bounce" style={{ animationDelay: `${i*0.2}s` }}></div>)}
                                    </div>
                                </div>
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
                                <Square size={16} className="text-slate-400 rotate-45" />
                            </button>
                            
                            <h3 className="text-2xl font-black italic gold-text uppercase mb-6">PUMP RULES</h3>
                            
                            <div className="space-y-6 text-sm font-medium text-slate-300">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0 border border-blue-500/20 text-blue-400 font-black italic italic">1</div>
                                    <p>Select your <span className="text-white font-black">Difficulty</span> level. Higher risk means bigger multipliers.</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-600/20 flex items-center justify-center shrink-0 border border-orange-500/20 text-orange-400 font-black italic">2</div>
                                    <p>Click <span className="text-white font-black">PUMP</span> to inflate the balloon and increase your multiplier.</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400 font-black italic">3</div>
                                    <p>Watch out! The balloon can <span className="text-red-500 font-black">BURST</span> at any moment. Cash out before it pops!</p>
                                </div>
                            </div>

                            <button onClick={() => setShowHelp(false)} className="w-full mt-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all">
                                UNDERSTOOD
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Pump;
