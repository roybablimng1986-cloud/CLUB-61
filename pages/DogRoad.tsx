
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Wallet, PlayCircle, Trophy, Zap, Shield, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, shouldForceLoss, db, auth } from '../services/supabaseService';
import { GameResult } from '../types';
import { collection, query, orderBy, limit, onSnapshot, addDoc } from 'firebase/firestore';

import DogRoadResultPopup from '../components/DogRoadResultPopup';

interface DogProps {
    onBack: () => void;
    userBalance: number;
    onResult: (result: GameResult) => void;
}

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE';

const MULTIPLIERS: Record<Difficulty, number[]> = {
    EASY: [1.31, 1.74, 2.34, 3.19, 4.41, 6.17, 8.74, 12.55, 18.25],
    MEDIUM: [1.44, 2.21, 3.45, 5.53, 9.09, 15.30, 26.78, 48.70, 91.30],
    HARD: [2.94, 9.09, 29.40, 99.00, 345.0, 1250.0, 4500.0, 16000.0, 58000.0],
    ELITE: [4.90, 24.50, 122.50, 612.50, 3062.50, 15312.50, 76562.50, 382812.50, 1914062.50]
};

    const DogRoad: React.FC<DogProps> = ({ onBack, userBalance, onResult }) => {
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'CRASHING' | 'CRASHED' | 'WON'>('IDLE');
    const [currentLane, setCurrentLane] = useState(-1);
    const [betAmount, setBetAmount] = useState(10);
    const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
    const [crashLane, setCrashLane] = useState<number | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const [drResult, setDrResult] = useState<any | null>(null);
    
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { 
            isMounted.current = false; 
            stopAllSounds(); 
        };
    }, []);

    const startGame = async () => {
        if (betAmount > userBalance) return;
        playSound('bet_place');
        updateBalance(-betAmount, 'BET', 'Dog Road Sprint');
        
        setDrResult(null);
        setGameState('PLAYING');
        setCurrentLane(-1);
        setCrashLane(null);
    };

    const nextStep = () => {
        if (gameState !== 'PLAYING' || isMoving) return;
        setIsMoving(true);
        playSound('tower_step');

        setTimeout(() => {
            if (!isMounted.current) return;
            
            let failChance = 0.12;
            if (difficulty === 'EASY') failChance = 0.05;
            if (difficulty === 'MEDIUM') failChance = 0.15;
            if (difficulty === 'HARD') failChance = 0.25;
            if (difficulty === 'ELITE') failChance = 0.40;

            const isCrash = Math.random() < failChance || shouldForceLoss(betAmount, userBalance);

            if (isCrash) initiateCrash();
            else handleSuccess();
            
            setIsMoving(false);
        }, 600);
    };

    const handleSuccess = () => {
        playSound('win');
        setCurrentLane(prev => prev + 1);
        if (currentLane + 1 >= MULTIPLIERS[difficulty].length - 1) cashOut();
    };

    const initiateCrash = () => {
        const nextLane = currentLane + 1;
        setCrashLane(nextLane);
        setGameState('CRASHING');
        playSound('plane_crash'); 

        setTimeout(() => {
            if (!isMounted.current) return;
            setGameState('CRASHED');
            setDrResult({
                win: false,
                amount: betAmount,
                lane: nextLane,
                multiplier: 0
            });
            addGameHistory('Dog Road', betAmount, 0, `Caught at Lane ${nextLane}`);
        }, 800);
    };

    const cashOut = () => {
        if (currentLane === -1) return;
        const mult = MULTIPLIERS[difficulty][currentLane];
        const winAmount = betAmount * mult;
        updateBalance(winAmount, 'WIN', 'Dog Road Cashout');
        setDrResult({
            win: true,
            amount: winAmount,
            lane: currentLane,
            multiplier: mult
        });
        setGameState('WON');
        addGameHistory('Dog Road', betAmount, winAmount, `Cashed out at Lane ${currentLane}`);
    };

    const currentMultiplier = currentLane === -1 ? 1.0 : MULTIPLIERS[difficulty][currentLane];
    
    return (
        <div className="h-screen flex flex-col font-sans text-white overflow-hidden select-none relative" 
             style={{ backgroundColor: '#050a14', backgroundImage: 'radial-gradient(circle at center, #1e293b 0%, #050a14 100%)' }}>
            <DogRoadResultPopup result={drResult} onClose={() => setDrResult(null)} />
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-50 backdrop-blur-md bg-black/20 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} disabled={gameState === 'PLAYING'} className="p-2 bg-white/5 rounded-xl active:scale-90 transition-all">
                        <ArrowLeft size={20}/>
                    </button>
                    <div>
                        <h1 className="font-black text-xs uppercase tracking-[0.3em] text-yellow-500 italic">Dog Road</h1>
                        <p className="text-[8px] text-white/40 uppercase tracking-widest">Elite Sprint</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
                    <Wallet size={14} className="text-yellow-500" />
                    <span className="font-mono text-sm font-bold">₹{userBalance.toFixed(2)}</span>
                </div>
            </div>

            {/* Game Stage - 3D Perspective Road */}
            <div className="flex-1 relative perspective-[1200px] overflow-hidden flex justify-center bg-[#050a14] pt-20">
                {/* Environment Background */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-transparent"></div>
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-end pb-[350px]">
                    
                    {/* The Road */}
                    <motion.div 
                        animate={{ 
                            rotateX: 60, 
                            y: 600 + (currentLane + 1) * 280 
                        }}
                        transition={{ type: 'spring', damping: 25, stiffness: 40 }}
                        className="relative w-full h-[6000px] bg-[#1a202c] border-x-[40px] border-yellow-600/40 shadow-[0_0_250px_rgba(0,0,0,1)]"
                        style={{ 
                            transformStyle: 'preserve-3d',
                            backgroundImage: `
                                linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%),
                                url("https://www.transparenttextures.com/patterns/asphalt-dark.png")
                            `,
                        }}
                    >
                        {/* Road Markings */}
                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 border-x-4 border-dashed border-white/20"></div>
                        <div className="absolute inset-y-0 left-1/4 -translate-x-1/2 w-2 bg-white/5"></div>
                        <div className="absolute inset-y-0 right-1/4 translate-x-1/2 w-2 bg-white/5"></div>

                        {/* Lanes / Steps */}
                        {MULTIPLIERS[difficulty].map((mult, index) => (
                            <div 
                                key={index}
                                className="absolute left-0 right-0 h-48 border-t-8 border-white/5 flex items-center justify-center"
                                style={{ bottom: `${(index + 1) * 240}px` }}
                            >
                                <div className={`px-16 py-8 rounded-[3rem] border-8 transition-all duration-500 flex flex-col items-center ${currentLane >= index ? 'bg-green-500 border-white shadow-[0_0_80px_rgba(34,197,94,0.6)]' : 'bg-black/40 border-white/5'}`}>
                                    <span className={`font-black text-6xl italic leading-none ${currentLane >= index ? 'text-white' : 'text-white/20'}`}>{mult}x</span>
                                    <span className="text-[12px] uppercase tracking-[0.3em] opacity-40 font-black mt-2">Multiplier</span>
                                </div>
                                
                                {crashLane === index && (
                                    <motion.div 
                                        initial={{ scale: 0, opacity: 0, rotate: -45 }}
                                        animate={{ scale: 3, opacity: 1, rotate: 0 }}
                                        className="absolute z-50"
                                    >
                                        <div className="text-[15rem] filter drop-shadow-[0_0_100px_rgba(239,68,68,1)]">🚓</div>
                                        <div className="absolute inset-0 flex items-center justify-center text-9xl animate-ping">💥</div>
                                    </motion.div>
                                )}
                            </div>
                        ))}

                        {/* Finish Line */}
                        <div className="absolute top-0 left-0 right-0 h-80 bg-[repeating-linear-gradient(45deg,#000,#000_40px,#fff_40px,#fff_80px)] opacity-20"></div>
                    </motion.div>

                    {/* The Dog (Fixed in screen space but animated) */}
                    <div className="absolute bottom-[380px] left-1/2 -translate-x-1/2 z-40">
                        <motion.div
                            animate={isMoving ? { 
                                y: [-280, 0],
                                scale: [0.85, 1.15, 1],
                                rotate: [0, -12, 12, 0],
                                skewX: [0, -8, 8, 0]
                            } : { 
                                y: 0,
                                scale: 1,
                                rotate: 0,
                                skewX: 0
                            }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="relative"
                        >
                            <div className="text-[10rem] drop-shadow-[0_60px_100px_rgba(0,0,0,1)] filter brightness-125 contrast-125">🐕</div>
                            {/* Dog Shadow */}
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-12 bg-black/60 rounded-full blur-2xl -z-10"></div>
                            
                            {/* Dust/Speed Particles */}
                            {isMoving && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: [0, 1, 0], scale: [1, 5], y: [0, 150] }}
                                    className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex gap-10"
                                >
                                    <div className="w-12 h-12 bg-white/20 rounded-full blur-xl"></div>
                                    <div className="w-16 h-16 bg-white/10 rounded-full blur-2xl"></div>
                                    <div className="w-10 h-10 bg-white/30 rounded-full blur-lg"></div>
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                </div>

                {/* Vignette & Lighting */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(transparent_30%,_rgba(0,0,0,0.8)_100%)]"></div>
                <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#050a14] to-transparent"></div>
            </div>

            {/* Controls */}
            <div className="bg-[#0f172a]/90 backdrop-blur-lg p-6 pb-10 border-t border-white/10 z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col h-[280px]">
                <div className="flex-1 overflow-hidden flex flex-col">
                    {gameState === 'IDLE' || gameState === 'CRASHED' || gameState === 'WON' ? (
                        <div className="space-y-4 max-w-md mx-auto w-full">
                            <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                                {(['EASY', 'MEDIUM', 'HARD', 'ELITE'] as Difficulty[]).map(d => (
                                    <button 
                                        key={d} 
                                        onClick={() => setDifficulty(d)} 
                                        className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${difficulty === d ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/20 hover:bg-white/5'}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1 bg-black/40 p-2.5 rounded-xl border border-white/5">
                                    <p className="text-[7px] text-white/30 uppercase font-black mb-0.5">Stake</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-yellow-500 font-bold text-xs">₹</span>
                                        <input type="number" value={betAmount} onChange={e => setBetAmount(Number(e.target.value))} className="bg-transparent w-full outline-none font-black text-lg italic" />
                                    </div>
                                </div>
                                <button 
                                    onClick={startGame} 
                                    className="flex-[1.5] py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-xl font-black text-lg uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <PlayCircle size={20}/> START
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3 max-w-md mx-auto w-full animate-in slide-in-from-bottom duration-300">
                            <button 
                                onClick={cashOut} 
                                disabled={currentLane === -1 || gameState !== 'PLAYING'} 
                                className={`flex-1 py-3 rounded-xl font-black uppercase shadow-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border-t border-white/10 ${currentLane === -1 ? 'bg-zinc-800 text-zinc-600' : 'bg-gradient-to-b from-orange-500 to-red-600 text-white'}`}
                            >
                                <span className="text-[8px] tracking-widest">CASH OUT</span>
                                <span className="text-base italic">₹{(betAmount * currentMultiplier).toFixed(2)}</span>
                            </button>
                            <button 
                                onClick={nextStep} 
                                disabled={gameState !== 'PLAYING' || isMoving} 
                                className="flex-[1.5] py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-xl font-black text-xl uppercase tracking-[0.2em] active:scale-95 shadow-xl border-t border-white/30 flex items-center justify-center gap-2"
                            >
                                <Zap size={20} className={isMoving ? 'animate-spin' : ''}/> GO
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default DogRoad;
