import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Wallet, Info, Trophy, History, CreditCard, Gift, MousePointer2, Sparkles, X } from 'lucide-react';
import { playSound, updateBalance, addGameHistory } from '../services/mockFirebase';
import { GameResult } from '../types';

type Stage = 'PICK_AMOUNT' | 'PICK_TICKET' | 'SCRATCHING' | 'REVEAL';

const ScratchCard: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [betAmount, setBetAmount] = useState(10);
    const [stage, setStage] = useState<'PICK_AMOUNT' | 'PLAYING' | 'REVEALED'>('PICK_AMOUNT');
    const [winningAmount, setWinningAmount] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScratching, setIsScratching] = useState(false);
    const [scratchPercent, setScratchPercent] = useState(0);
    
    const isMounted = useRef(true);

    const initCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw cover
        ctx.fillStyle = '#4b5563'; // Gray cover
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add texture/text
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2);
        
        ctx.globalCompositeOperation = 'destination-out';
    };

    const handleScratch = (e: React.MouseEvent | React.TouchEvent) => {
        if (stage !== 'PLAYING') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();

        checkScratchPercent();
    };

    const checkScratchPercent = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let pixels = 0;
        for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] === 0) pixels++;
        }
        
        const percent = (pixels / (canvas.width * canvas.height)) * 100;
        setScratchPercent(percent);

        if (percent > 35 && stage === 'PLAYING') {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setStage('REVEALED');
        if (winningAmount > 0) {
            updateBalance(winningAmount, 'WIN', 'Scratch Win');
            playSound('win');
            onResult({ win: true, amount: winningAmount, game: 'Scratch Card', resultDetails: [{ label: 'Winnings', value: `₹${winningAmount.toFixed(2)}` }] });
        } else {
            playSound('loss');
            onResult({ win: false, amount: betAmount, game: 'Scratch Card', resultDetails: [{ label: 'Result', value: 'Better luck next time' }] });
        }
    };

    const handleBuy = () => {
        if (betAmount > userBalance) return alert("Insufficient Balance");
        updateBalance(-betAmount, 'BET', 'Scratch Card');
        
        // Random result
        const rand = Math.random();
        let win = 0;
        if (rand < 0.1) win = betAmount * 10;
        else if (rand < 0.25) win = betAmount * 5;
        else if (rand < 0.45) win = betAmount * 2;
        
        setWinningAmount(win);
        setScratchPercent(0);
        setStage('PLAYING');
        setTimeout(initCanvas, 100);
    };

    return (
        <div className="min-h-screen bg-[#070b14] text-white flex flex-col font-sans mb-safe">
            <div className="p-4 flex justify-between items-center bg-[#0d121f] border-b border-white/5">
                <button onClick={onBack} className="p-2.5 bg-[#1a1f2e] rounded-xl"><ArrowLeft size={20} /></button>
                <div className="text-sm font-black font-mono bg-[#1a1f2e] px-4 py-2 rounded-xl border border-white/5 shadow-inner">
                    <span className="text-emerald-500 mr-2">₹</span>{userBalance.toFixed(2)}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
                {stage === 'PICK_AMOUNT' ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm space-y-6">
                        <div className="text-center">
                            <h2 className="text-3xl font-black italic gold-text mb-2 tracking-tighter">INSTANT CASH</h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Choose your ticket price</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[10, 50, 100, 500].map(amt => (
                                <button key={amt} onClick={() => setBetAmount(amt)} className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1
                                    ${betAmount === amt ? 'bg-yellow-500 border-white text-black scale-105' : 'bg-[#1a1f2e] border-white/5 text-slate-400'}
                                `}>
                                    <span className="text-xl font-black font-mono">₹{amt}</span>
                                    <span className="text-[8px] font-black uppercase">Ticket</span>
                                </button>
                            ))}
                        </div>
                        <button onClick={handleBuy} className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl font-black text-xl shadow-xl active:translate-y-1">BUY TICKET</button>
                    </motion.div>
                ) : (
                    <div className="w-full flex flex-col items-center gap-12">
                        <div className="relative w-full max-w-[280px] aspect-[3/4] bg-gradient-to-br from-indigo-600 to-purple-800 rounded-[2.5rem] p-1 shadow-2xl">
                            <div className="absolute inset-2 border-2 border-white/10 rounded-[2.2rem] pointer-events-none"></div>
                            <div className="h-full bg-[#121624] rounded-[2.3rem] overflow-hidden flex flex-col items-center justify-center relative">
                                {/* Result Layer (Hidden) */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    {winningAmount > 0 ? (
                                        <div className="animate-bounce">
                                            <div className="text-[10px] font-black text-yellow-500 uppercase mb-1">YOU WON</div>
                                            <div className="text-4xl font-black italic gold-text tracking-tighter">₹{winningAmount}</div>
                                        </div>
                                    ) : (
                                        <div className="text-slate-700 font-black italic uppercase text-3xl opacity-50">LOSS</div>
                                    )}
                                </div>

                                {/* Scatch Canvas */}
                                <canvas 
                                    ref={canvasRef}
                                    width={280}
                                    height={380}
                                    onMouseMove={(e) => isScratching && handleScratch(e)}
                                    onMouseDown={() => setIsScratching(true)}
                                    onMouseUp={() => setIsScratching(false)}
                                    onTouchMove={(e) => handleScratch(e)}
                                    className={`absolute inset-0 z-20 cursor-crosshair transition-opacity duration-500 ${stage === 'REVEALED' ? 'opacity-0' : 'opacity-100'}`}
                                />
                            </div>
                        </div>

                        <div className="text-center space-y-4">
                           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-loose">
                               {stage === 'PLAYING' ? (
                                   <>
                                       SCRATCH THE CARD TO REVEAL<br/>
                                       <span className="text-blue-400">PROGRESS: {Math.round(scratchPercent)}%</span>
                                   </>
                               ) : 'GAME OVER'}
                           </div>
                           
                           {stage === 'PLAYING' && scratchPercent > 5 && (
                               <button 
                                   onClick={handleComplete}
                                   className="px-6 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-500 text-[10px] font-black uppercase tracking-widest active:scale-95"
                               >
                                   REVEAL ALL
                               </button>
                           )}

                           {stage === 'REVEALED' && (
                               <button onClick={() => setStage('PICK_AMOUNT')} className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl font-black text-xs uppercase italic active:scale-95">Next Ticket</button>
                           )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScratchCard;
