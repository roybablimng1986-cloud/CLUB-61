import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Zap, Shield, Target, TrendingUp, Info } from 'lucide-react';
import { playSound, updateBalance, addGameHistory, shouldForceLoss } from '../services/supabaseService';
import { GameResult } from '../types';

const CyberVoyage: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [bet, setBet] = useState(10);
    const [status, setStatus] = useState<'IDLE' | 'PLAYING' | 'RESULT'>('IDLE');
    const [currentStep, setCurrentStep] = useState(0);
    const [path, setPath] = useState<number[]>([]);
    const [winMult, setWinMult] = useState(0);

    const steps = [
        { label: "WARP DRIVE", mults: [1.2, 1.5, 0, 1.8] },
        { label: "ION STORM", mults: [2.0, 0, 2.5, 1.1] },
        { label: "NEBULA GATE", mults: [0, 3.5, 4.0, 0] },
        { label: "QUANTUM CORE", mults: [5.0, 8.0, 0, 12.0] }
    ];

    const isForcedLoss = useRef(false);

    const startGame = () => {
        if (bet > userBalance) return;
        
        isForcedLoss.current = shouldForceLoss(bet, userBalance);

        updateBalance(-bet, 'BET', 'Cyber Voyage');
        playSound('bet_place');
        setStatus('PLAYING');
        setCurrentStep(0);
        setPath([]);
        setWinMult(0);
    };

    const handleChoice = (index: number) => {
        if (status !== 'PLAYING') return;

        let mult = steps[currentStep].mults[index];
        
        if (isForcedLoss.current && currentStep >= 1 && mult > 0) {
            // Force a loss if they are winning and forced
            // Find a mirror index that is 0 if possible
            const zeroIdx = steps[currentStep].mults.indexOf(0);
            if (zeroIdx !== -1) mult = 0;
        }

        setPath([...path, index]);
        
        if (mult === 0) {
            playSound('loss');
            setStatus('RESULT');
            onResult({ win: false, amount: bet, game: 'Cyber Voyage' });
        } else {
            playSound('win');
            if (currentStep === steps.length - 1) {
                const finalMult = mult;
                setWinMult(finalMult);
                const winAmt = bet * finalMult;
                updateBalance(winAmt, 'WIN', 'Voyage Success');
                addGameHistory('Cyber Voyage', bet, winAmt, `Reached level ${currentStep + 1}`);
                setStatus('RESULT');
                onResult({ win: true, amount: winAmt, game: 'Cyber Voyage' });
            } else {
                setCurrentStep(prev => prev + 1);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-cyan-400 flex flex-col font-sans select-none overflow-hidden pb-safe">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-black/40 border-b border-cyan-500/20 backdrop-blur-xl z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 bg-cyan-950/30 border border-cyan-500/20 rounded-xl active:scale-90 transition-transform"><ArrowLeft size={20} className="text-cyan-400" /></button>
                    <div>
                        <h1 className="text-lg font-black tracking-widest uppercase leading-none text-white">CYBER VOYAGE</h1>
                        <span className="text-[8px] font-bold text-cyan-500 uppercase tracking-widest">Protocol v2.4.0</span>
                    </div>
                </div>
                <div className="bg-cyan-950/30 px-4 py-2 rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                    <span className="text-cyan-500 mr-2 text-xs font-bold uppercase tracking-widest">Balance</span>
                    <span className="text-sm font-black text-white font-mono">₹{userBalance.toFixed(2)}</span>
                </div>
            </div>

            {/* Step Progress */}
            <div className="flex justify-center gap-2 p-6">
                {steps.map((_, i) => (
                    <div key={i} className={`h-1.5 w-12 rounded-full transition-all duration-500 ${i < currentStep ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : i === currentStep && status === 'PLAYING' ? 'bg-cyan-400 animate-pulse' : 'bg-white/10'}`}></div>
                ))}
            </div>

            {/* Main Game Stage */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                <AnimatePresence mode="wait">
                    {status === 'IDLE' ? (
                         <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
                            <Zap size={60} className="mx-auto mb-4 text-cyan-500 animate-pulse" />
                            <h2 className="text-2xl font-black text-white uppercase italic mb-2 tracking-tighter">Ready for Warp?</h2>
                            <p className="text-xs text-cyan-500/60 uppercase font-bold tracking-widest">Choose the correct portal to advance</p>
                         </motion.div>
                    ) : status === 'PLAYING' ? (
                        <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-sm">
                            <div className="text-center mb-10">
                                <span className="text-[10px] font-black uppercase text-cyan-500/40 tracking-[0.3em] mb-2 block">Sector</span>
                                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{steps[currentStep].label}</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[0, 1, 2, 3].map((idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleChoice(idx)}
                                        className="aspect-square bg-cyan-950/20 border border-cyan-500/20 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all active:scale-90 hover:bg-cyan-500/10 hover:border-cyan-500/40 group relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <Target size={32} className="text-cyan-500/40 group-hover:text-cyan-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500/60 group-hover:text-cyan-400">Portal {idx + 1}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="result" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                            {winMult > 0 ? (
                                <>
                                    <TrendingUp size={80} className="mx-auto mb-4 text-emerald-400 animate-bounce" />
                                    <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">VOYAGE SUCCESS</h2>
                                    <div className="text-6xl font-black text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)] mb-6">₹{(bet * winMult).toFixed(2)}</div>
                                </>
                            ) : (
                                <>
                                    <Shield size={80} className="mx-auto mb-4 text-red-500 opacity-50" />
                                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">SYSTEM FAILURE</h2>
                                    <p className="text-red-500 uppercase font-black tracking-widest text-xs mb-8">Navigation data corrupted</p>
                                </>
                            )}
                            <button onClick={() => setStatus('IDLE')} className="px-12 py-4 bg-cyan-500 text-black font-black rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.4)] active:scale-95 transition-all">Retry Link</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Controls */}
            <div className="p-8 bg-black/40 backdrop-blur-xl border-t border-cyan-500/20 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 mb-6 justify-center">
                    {[10, 50, 100, 500, 1000].map(amt => (
                        <button key={amt} onClick={() => setBet(amt)} className={`px-6 py-4 rounded-2xl text-xs font-black transition-all shrink-0 border-2 ${bet === amt ? 'bg-cyan-500 border-cyan-300 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-cyan-950/20 border-cyan-500/10 text-cyan-500/40 hover:border-cyan-500/30'}`}>₹{amt}</button>
                    ))}
                </div>
                <button 
                    onClick={startGame}
                    disabled={status === 'PLAYING'}
                    className={`w-full py-6 rounded-3xl font-black text-xl uppercase tracking-[0.2em] transition-all relative overflow-hidden group ${status === 'PLAYING' ? 'bg-slate-900 border border-white/5 text-slate-700' : 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-2xl active:scale-95 active:shadow-inner'}`}
                >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    {status === 'PLAYING' ? 'VOYAGE IN PROGRESS' : 'INITIATE WARP'}
                </button>
            </div>
        </div>
    );
};

export default CyberVoyage;
