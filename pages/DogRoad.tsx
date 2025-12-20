
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, HelpCircle, Settings2, Coins, Volume2, VolumeX } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus } from '../services/mockFirebase';
import { GameResult } from '../types';

interface DogProps {
    onBack: () => void;
    userBalance: number;
    onResult: (result: GameResult) => void;
}

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'HARDCORE';

const MULTIPLIERS: Record<Difficulty, number[]> = {
    EASY: [1.31, 1.74, 2.34, 3.19, 4.41, 6.17, 8.74, 12.55, 18.25, 26.90, 40.0, 60.0, 90.0, 135.0, 205.0],
    MEDIUM: [1.44, 2.21, 3.45, 5.53, 9.09, 15.30, 26.78, 48.70, 91.30, 175.0, 350.0, 700.0, 1400.0, 2800.0, 5600.0],
    HARD: [2.94, 9.09, 29.40, 99.00, 345.0, 1250.0, 4500.0, 16000.0, 58000.0, 210000.0, 750000.0, 2500000.0, 9000000.0, 30000000.0, 99000000.0],
    HARDCORE: [4.90, 24.50, 122.50, 612.50, 3062.50, 15312.50, 76562.50, 382812.50, 1914062.50, 9570312.50, 47851562.50, 239257812.50, 999999999.0, 999999999.0, 999999999.0]
};

const CAR_IMAGES = ['🚕', '🚓', '🚚', '🚑', '🚒', '🚐'];

const DogRoad: React.FC<DogProps> = ({ onBack, userBalance, onResult }) => {
    // Game State
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'CRASHING' | 'CRASHED' | 'WON'>('IDLE');
    const [currentLane, setCurrentLane] = useState(-1);
    const [betAmount, setBetAmount] = useState(10);
    const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
    const [muted, setMuted] = useState(getMuteStatus());
    
    // UI Refs
    const [crashLane, setCrashLane] = useState<number | null>(null);
    const [carType, setCarType] = useState('🚕');
    
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        // Cleanup function for audio
        return () => {
            isMounted.current = false;
            stopAllSounds();
        };
    }, []);

    const handleToggleMute = () => {
        setMuted(toggleMute());
    };

    const startGame = () => {
        if (betAmount > userBalance) {
            alert("Insufficient Balance!");
            return;
        }

        if(isMounted.current) playSound('click');
        updateBalance(-betAmount, 'BET', 'Dog Road');
        setGameState('PLAYING');
        setCurrentLane(-1);
        setCrashLane(null);
    };

    const nextStep = () => {
        if (gameState !== 'PLAYING') return;
        if(isMounted.current) playSound('click');

        let failChance = 0.0;
        if (difficulty === 'EASY') failChance = 0.05;
        if (difficulty === 'MEDIUM') failChance = 0.15;
        if (difficulty === 'HARD') failChance = 0.35;
        if (difficulty === 'HARDCORE') failChance = 0.50;

        const isCrash = Math.random() < failChance;

        if (isCrash) {
            initiateCrash();
        } else {
            handleSuccess();
        }
    };

    const handleSuccess = () => {
        if(isMounted.current) playSound('win');
        setCurrentLane(prev => prev + 1);
        
        if (currentLane + 1 >= MULTIPLIERS[difficulty].length - 1) {
            cashOut(true);
        }
    };

    const initiateCrash = () => {
        const nextLane = currentLane + 1;
        setCrashLane(nextLane);
        setCarType(CAR_IMAGES[Math.floor(Math.random() * CAR_IMAGES.length)]);
        setGameState('CRASHING'); 
        if(isMounted.current) playSound('loss'); 

        setTimeout(() => {
            if (!isMounted.current) return;
            setGameState('CRASHED');
            addGameHistory('Dog Road', betAmount, 0, `Crashed at ${(nextLane)}`);
            onResult({
                win: false,
                amount: betAmount,
                game: 'Dog Road',
                period: Date.now().toString().slice(-8),
                resultDetails: [{ label: 'Result', value: 'Crash', color: 'bg-red-500' }]
            });
        }, 800);
    };

    const cashOut = (auto = false) => {
        const winAmount = betAmount * MULTIPLIERS[difficulty][currentLane];
        updateBalance(winAmount, 'WIN', 'Dog Road Win');
        addGameHistory('Dog Road', betAmount, winAmount, `Cashed out ${MULTIPLIERS[difficulty][currentLane]}x`);
        if(isMounted.current) playSound('win');
        setGameState('WON');
        
        onResult({
            win: true,
            amount: winAmount,
            game: 'Dog Road',
            period: Date.now().toString().slice(-8),
            resultDetails: [
                { label: 'Multiplier', value: `${MULTIPLIERS[difficulty][currentLane]}x`, color: 'bg-green-500' },
                { label: 'Difficulty', value: difficulty, color: 'bg-blue-500' }
            ]
        });
    };

    const currentMultiplier = currentLane === -1 ? 1.0 : MULTIPLIERS[difficulty][currentLane];
    const nextMultiplier = MULTIPLIERS[difficulty][currentLane + 1] || 0;
    const potentialWin = (betAmount * currentMultiplier).toFixed(2);

    const laneWidthVW = 25; 
    let translateX = 0;
    if (currentLane > -1) {
        translateX = -(currentLane + 1) * 25 + 25;
    }

    return (
        <div className="bg-[#1a1c20] min-h-screen flex flex-col font-sans text-white overflow-hidden">
            {/* Header */}
            <div className="bg-[#24262b] p-3 flex items-center justify-between border-b border-gray-800 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onBack}><ArrowLeft className="text-gray-400" /></button>
                    <div className="flex items-center gap-2">
                        <span className="font-black text-xl tracking-tighter italic">DOG <span className="text-orange-500">ROAD</span></span>
                        <HelpCircle size={16} className="text-gray-500"/>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Wallet Display Fixed */}
                    <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full border border-gray-700">
                        <Coins size={14} className="text-yellow-500"/>
                        <span className="text-sm font-bold text-white">₹{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={handleToggleMute}>
                        {muted ? <VolumeX size={20} className="text-gray-400"/> : <Volume2 size={20} className="text-gray-400"/>}
                    </button>
                    <Settings2 size={20} className="text-gray-400"/>
                </div>
            </div>

            {/* Game World (Fixed Viewport) */}
            <div className="flex-1 relative overflow-hidden bg-[#2b2e33]">
                <div 
                    className="absolute inset-y-0 left-0 flex items-center transition-transform duration-500 ease-in-out"
                    style={{ 
                        transform: `translateX(${translateX + 10}vw)`, 
                        width: `${(MULTIPLIERS[difficulty].length + 1) * 25}vw`
                    }}
                >
                    {/* Sidewalk */}
                    <div className="w-[25vw] h-full flex-shrink-0 bg-[#3a4042] border-r-4 border-gray-500 relative flex flex-col justify-center items-center z-10">
                        <div className="absolute inset-y-0 right-0 w-2 bg-gray-400 border-l border-dashed border-gray-600"></div>
                        <div className="w-20 h-20 bg-orange-800/20 rounded-full flex items-center justify-center mb-8 border-2 border-orange-900/50">
                            <div className="text-4xl">🏁</div>
                        </div>
                        {currentLane === -1 && gameState !== 'CRASHED' && gameState !== 'CRASHING' && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-300">
                                <img src="https://cdn-icons-png.flaticon.com/512/616/616554.png" alt="Dog" className="w-16 h-16 object-contain drop-shadow-2xl animate-bounce" />
                                <div className="w-10 h-3 bg-black/40 rounded-full blur-sm mx-auto mt-[-5px]"></div>
                            </div>
                        )}
                    </div>

                    {/* Lanes */}
                    {MULTIPLIERS[difficulty].map((mult, index) => {
                        const isPassed = currentLane >= index;
                        const isCrashSite = crashLane === index;
                        const isDogHere = currentLane === index;
                        const isNext = currentLane + 1 === index;

                        return (
                            <div key={index} className={`w-[25vw] h-full flex-shrink-0 relative border-r-2 border-dashed border-gray-600/50 bg-[#2b2e33] flex items-center justify-center ${isNext ? 'brightness-110' : ''}`}>
                                <div className="absolute inset-x-0 top-[20%] h-[2px] bg-white/10"></div>
                                <div className="absolute inset-x-0 bottom-[20%] h-[2px] bg-white/10"></div>

                                {/* Manhole/Multiplier */}
                                <div className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    isPassed ? 'opacity-50 scale-90' : 'opacity-100'
                                }`}>
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-gray-600 to-gray-800 shadow-xl border-4 border-gray-700"></div>
                                    <div className="absolute inset-2 rounded-full bg-[#25282c] flex items-center justify-center border border-gray-600 shadow-inner">
                                        <div className="absolute inset-0 flex justify-center gap-1 opacity-20">
                                            {[...Array(6)].map((_, i) => <div key={i} className="w-1 h-full bg-black"></div>)}
                                        </div>
                                        {isPassed ? (
                                            <div className="relative z-10 bg-yellow-500/20 p-2 rounded-full">
                                                <Coins size={32} className="text-yellow-500 fill-yellow-500 drop-shadow-md"/>
                                            </div>
                                        ) : (
                                            <span className="relative z-10 font-black text-lg md:text-xl text-gray-400 font-mono tracking-tighter">
                                                {mult}x
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Dog Character */}
                                {isDogHere && gameState !== 'CRASHED' && gameState !== 'CRASHING' && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 animate-in zoom-in duration-300">
                                        <img src="https://cdn-icons-png.flaticon.com/512/616/616554.png" alt="Dog" className="w-16 h-16 object-contain drop-shadow-2xl animate-bounce" />
                                        <div className="w-12 h-4 bg-black/50 rounded-full blur-sm mx-auto mt-[-8px]"></div>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                                            {mult}x
                                        </div>
                                    </div>
                                )}

                                {/* Crash Animation */}
                                {isCrashSite && (
                                    <>
                                        {gameState === 'CRASHING' && (
                                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                                               <img src="https://cdn-icons-png.flaticon.com/512/616/616554.png" alt="Dog" className="w-16 h-16 object-contain grayscale opacity-50" />
                                           </div>
                                        )}
                                        
                                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center transition-all duration-700 ease-in ${
                                            gameState === 'CRASHING' ? 'translate-y-0 opacity-100' : gameState === 'CRASHED' ? 'translate-y-0 opacity-100' : '-translate-y-[200px] opacity-0'
                                        }`}>
                                            <div className="text-6xl transform scale-y-[-1]">{carType}</div>
                                        </div>
                                        
                                        {gameState === 'CRASHED' && (
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 animate-in zoom-in bounce-in">
                                                <div className="text-xs font-black text-white bg-red-600 px-2 py-1 rounded shadow-lg border border-red-400">CRASHED!</div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(transparent_50%,_rgba(0,0,0,0.8)_100%)]"></div>
            </div>

            {/* Controls */}
            <div className="bg-[#24262b] p-4 border-t border-gray-800 z-20">
                {gameState === 'IDLE' || gameState === 'CRASHED' || gameState === 'WON' ? (
                    <div className="max-w-4xl mx-auto w-full">
                         <div className="flex bg-[#1a1c20] p-1 rounded-lg mb-4">
                            {(['EASY', 'MEDIUM', 'HARD', 'HARDCORE'] as Difficulty[]).map(d => (
                                <button
                                    key={d}
                                    onClick={() => setDifficulty(d)}
                                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
                                        difficulty === d 
                                        ? d === 'HARDCORE' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-gray-600 text-white shadow'
                                        : 'text-gray-500 hover:bg-gray-800'
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1 bg-[#1a1c20] rounded-lg p-3 border border-gray-700 flex flex-col justify-center">
                                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1">Bet Amount</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-green-500 font-bold">₹</span>
                                    <input 
                                        type="number" 
                                        value={betAmount}
                                        onChange={(e) => setBetAmount(Number(e.target.value))}
                                        className="bg-transparent outline-none text-white font-bold text-lg w-full"
                                    />
                                </div>
                            </div>
                            
                            <button 
                                onClick={startGame}
                                className="flex-[2] bg-green-500 hover:bg-green-400 text-black font-black text-xl rounded-lg shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1 transition-all uppercase tracking-wide"
                            >
                                Play
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-4 max-w-4xl mx-auto w-full animate-in slide-in-from-bottom fade-in duration-300">
                         <div className="flex-1 bg-[#1a1c20] rounded-lg p-2 border border-gray-700 flex flex-col items-center justify-center">
                             <span className="text-xs text-gray-500">Next Payout</span>
                             <span className="text-xl font-bold text-white">{nextMultiplier}x</span>
                         </div>
                         
                         <button 
                            onClick={() => cashOut(false)}
                            disabled={gameState === 'CRASHING'}
                            className="flex-[2] bg-orange-500 hover:bg-orange-400 text-black font-black text-lg rounded-lg shadow-[0_4px_0_rgb(194,65,12)] active:shadow-none active:translate-y-1 transition-all uppercase flex flex-col items-center justify-center leading-none py-3"
                        >
                            <span>CASH OUT</span>
                            <span className="text-xs font-medium mt-1">₹{potentialWin}</span>
                        </button>

                        <button 
                            onClick={nextStep}
                            disabled={gameState === 'CRASHING'}
                            className="flex-[2] bg-green-500 hover:bg-green-400 text-black font-black text-lg rounded-lg shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1 transition-all uppercase flex items-center justify-center gap-2"
                        >
                            GO <ArrowLeft className="rotate-180" size={24} strokeWidth={3}/>
                        </button>
                    </div>
                )}
                
                <div className="flex justify-between mt-4 text-[10px] text-gray-500 font-medium px-2">
                    <span>Chance of being shot down: {difficulty === 'EASY' ? '5%' : difficulty === 'MEDIUM' ? '15%' : '35%'}</span>
                    <span>Max Win: ₹{(betAmount * MULTIPLIERS[difficulty][MULTIPLIERS[difficulty].length-1]).toFixed(0)}</span>
                </div>
            </div>
        </div>
    );
};

export default DogRoad;
