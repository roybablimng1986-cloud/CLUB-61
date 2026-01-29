
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Wallet, PlayCircle, Trophy } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, shouldForceLoss } from '../services/mockFirebase';
import { GameResult } from '../types';

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
    
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; stopAllSounds(); };
    }, []);

    const startGame = () => {
        if (betAmount > userBalance) return alert("Insufficient Capital!");
        playSound('click');
        updateBalance(-betAmount, 'BET', 'Dog Road Sprint');
        setGameState('PLAYING');
        setCurrentLane(-1);
        setCrashLane(null);
    };

    const nextStep = () => {
        if (gameState !== 'PLAYING') return;
        playSound('click');

        // Balanced fail chances
        let failChance = 0.12;
        if (difficulty === 'EASY') failChance = 0.05;
        if (difficulty === 'MEDIUM') failChance = 0.15;
        if (difficulty === 'HARD') failChance = 0.25;
        if (difficulty === 'ELITE') failChance = 0.40;

        const isCrash = Math.random() < failChance || shouldForceLoss(betAmount, userBalance);

        if (isCrash) initiateCrash();
        else handleSuccess();
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
            addGameHistory('Dog Road', betAmount, 0, `Caught at Lane ${nextLane}`);
            onResult({ win: false, amount: betAmount, game: 'Dog Road' });
        }, 800);
    };

    const cashOut = () => {
        if (currentLane === -1) return;
        const mult = MULTIPLIERS[difficulty][currentLane];
        const winAmount = betAmount * mult;
        updateBalance(winAmount, 'WIN', 'Dog Road Cashout');
        playSound('win');
        setGameState('WON');
        onResult({ win: true, amount: winAmount, game: 'Dog Road', resultDetails: [{ label: 'Multiplier', value: `${mult}x` }] });
    };

    const currentMultiplier = currentLane === -1 ? 1.0 : MULTIPLIERS[difficulty][currentLane];
    const laneWidthVW = 30; 
    
    // TRANSFORMATION FOR PERFECT CENTERING
    // The road slides left, keeping the "active" zone in the center of the phone screen
    let translateX = -(currentLane + 1) * laneWidthVW + 35; 

    return (
        <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white overflow-hidden select-none">
            <div className="bg-[#111827] p-4 flex items-center justify-between border-b border-white/5 z-50 shadow-xl">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} disabled={gameState === 'PLAYING'} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
                    <h1 className="font-black text-sm uppercase tracking-widest gold-text italic">DOG ROAD</h1>
                </div>
                <div className="bg-black/50 px-3 py-1.5 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono text-xs">₹{userBalance.toFixed(2)}</div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-[#0f172a] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                <div 
                    className="absolute inset-y-0 left-0 flex items-center transition-transform duration-500 ease-in-out px-10"
                    style={{ transform: `translateX(${translateX}vw)`, width: `${(MULTIPLIERS[difficulty].length + 2) * laneWidthVW}vw` }}
                >
                    {/* Starting Area */}
                    <div className={`w-[${laneWidthVW}vw] h-full flex-shrink-0 relative flex flex-col justify-center items-center z-10 border-r-4 border-white/10 bg-black/20`}>
                        <div className="text-4xl mb-10">🏁</div>
                        {currentLane === -1 && gameState !== 'CRASHED' && gameState !== 'CRASHING' && (
                             <div className="absolute top-[45%] left-1/2 -translate-x-1/2 text-7xl animate-bounce">🐕</div>
                        )}
                    </div>

                    {/* Lanes */}
                    {MULTIPLIERS[difficulty].map((mult, index) => (
                        <div key={index} className={`w-[${laneWidthVW}vw] h-full flex-shrink-0 relative border-r border-dashed border-white/5 flex items-center justify-center`}>
                            {/* Road Lines */}
                            <div className="absolute inset-x-0 top-[35%] h-[2px] bg-white/5 shadow-inner"></div>
                            <div className="absolute inset-x-0 bottom-[35%] h-[2px] bg-white/5 shadow-inner"></div>

                            <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${currentLane >= index ? 'bg-green-500/10 border-green-500/40 opacity-40 scale-90' : 'bg-black/40 border-white/10 shadow-2xl'}`}>
                                 <span className={`font-black text-xl italic ${currentLane >= index ? 'text-green-500' : 'text-slate-700'}`}>{mult}x</span>
                            </div>

                            {currentLane === index && gameState !== 'CRASHED' && gameState !== 'CRASHING' && (
                                <div className="absolute top-[45%] left-1/2 -translate-x-1/2 text-7xl animate-bounce z-20 drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]">🐕</div>
                            )}

                            {crashLane === index && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-700 scale-150">
                                    <div className="text-8xl drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]">🚓</div>
                                    {gameState === 'CRASHED' && <div className="absolute inset-0 flex items-center justify-center text-4xl animate-ping">💥</div>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(transparent_50%,_rgba(0,0,0,0.9)_100%)]"></div>
            </div>

            <div className="bg-[#111827] p-6 pb-12 border-t border-white/10 z-50">
                {gameState === 'IDLE' || gameState === 'CRASHED' || gameState === 'WON' ? (
                    <div className="space-y-6">
                        <div className="flex gap-2 p-1.5 bg-black/40 rounded-3xl border border-white/5 shadow-inner">
                            {(['EASY', 'MEDIUM', 'HARD', 'ELITE'] as Difficulty[]).map(d => (
                                <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${difficulty === d ? 'bg-yellow-500 text-black shadow-xl' : 'text-slate-600'}`}>{d}</button>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1 bg-black/40 p-4 rounded-3xl border border-white/5 shadow-inner">
                                <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Stake</p>
                                <input type="number" value={betAmount} onChange={e => setBetAmount(Number(e.target.value))} className="bg-transparent w-full outline-none font-black text-xl italic" />
                            </div>
                            <button onClick={startGame} className="flex-[1.5] py-6 bg-gradient-to-r from-green-600 to-emerald-700 rounded-3xl font-black text-2xl uppercase tracking-[0.4em] shadow-2xl border-t-2 border-white/20 active:scale-95 flex items-center justify-center gap-3">
                                <PlayCircle size={28}/> START
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-4 animate-in slide-in-from-bottom duration-300">
                        <button onClick={cashOut} disabled={currentLane === -1 || gameState !== 'PLAYING'} className={`flex-1 py-6 rounded-3xl font-black uppercase shadow-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border-t-2 border-white/10 ${currentLane === -1 ? 'bg-zinc-800 text-zinc-600' : 'bg-gradient-to-b from-orange-500 to-red-600 text-white'}`}>
                            <span className="text-[9px] tracking-widest font-black uppercase">CASH OUT</span>
                            <span className="text-xl italic font-mono">₹{(betAmount * currentMultiplier).toFixed(2)}</span>
                        </button>
                        <button onClick={nextStep} disabled={gameState !== 'PLAYING'} className="flex-[1.5] py-8 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-3xl font-black text-3xl uppercase tracking-[0.5em] active:scale-95 animate-pulse border-t-2 border-white/30 shadow-2xl">
                            GO
                        </button>
                    </div>
                )}
            </div>
            <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
        </div>
    );
};

export default DogRoad;
