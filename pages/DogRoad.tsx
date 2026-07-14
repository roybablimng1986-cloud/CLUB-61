import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, getMuteStatus } from '../services/supabaseService';
import { GameResult } from '../types';

interface DogProps {
    onBack: () => void;
    userBalance: number;
    onResult: (result: GameResult) => void;
}

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'HARDCORE';

const MULTIPLIERS: Record<Difficulty, number[]> = {
    EASY: [1.3, 1.7, 2.3, 3.2, 4.4, 6.2, 8.7, 12.5, 18.3, 26.9, 40.0, 60.0, 90.0, 135.0, 205.0],
    MEDIUM: [1.4, 2.2, 3.5, 5.5, 9.1, 15.3, 26.8, 48.7, 91.3, 175.0, 350.0, 700.0, 1400.0, 2800.0, 5600.0],
    HARD: [2.9, 9.1, 29.4, 99.0, 345.0, 1250.0, 4500.0, 16000.0, 58000.0, 210000.0, 750000.0, 2500000.0, 9000000.0, 30000000.0, 99000000.0],
    HARDCORE: [4.9, 24.5, 122.5, 612.5, 3062.5, 15312.5, 76562.5, 382812.5, 1914062.5, 9570312.5, 47851562.5, 239257812.5, 999999999.0, 999999999.0, 999999999.0]
};

const CAR_IMAGES = ['🚕', '🚓', '🚚', '🚑', '🚒', '🚐'];

// Standalone synthesised Sound FX Engine for Dog Road to guarantee 100% offline lag-free gameplay audio
class DogRoadSfx {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    this.isMuted = getMuteStatus();
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playStep() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Highly satisfying bouncy jump sound for road crossing success
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.16);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(320, now);
    osc2.frequency.exponentialRampToValueAtTime(1280, now + 0.16);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.18);
    osc2.stop(now + 0.18);
  }

  playCrash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Sudden brakes crash explosion
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.6);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.6);
    
    osc.start(now);
    osc.stop(now + 0.6);
  }

  playCashout() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Joyous major coin clink melody
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, idx) => {
      const delay = idx * 0.05;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.06, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.3);
    });
  }
}

const DogRoad: React.FC<DogProps> = ({ onBack, userBalance, onResult }) => {
    const sfx = useRef(new DogRoadSfx());
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'CRASHING' | 'CRASHED' | 'WON'>('IDLE');
    const [currentLane, setCurrentLane] = useState(-1);
    const [betAmount, setBetAmount] = useState(10);
    const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
    const [muted, setMuted] = useState(getMuteStatus());
    
    const [crashLane, setCrashLane] = useState<number | null>(null);
    const [carType, setCarType] = useState('🚕');
    
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        sfx.current.setMuted(muted);
        return () => {
            isMounted.current = false;
            stopAllSounds();
        };
    }, [muted]);

    const startGame = () => {
        if (betAmount > userBalance) {
            alert("Insufficient Balance!");
            return;
        }

        playSound('click');
        updateBalance(-betAmount, 'BET', 'Dog Road');
        setGameState('PLAYING');
        setCurrentLane(-1);
        setCrashLane(null);
    };

    const nextStep = () => {
        if (gameState !== 'PLAYING') return;
        playSound('click');

        let failChance = 0.0;
        if (difficulty === 'EASY') failChance = 0.15;
        if (difficulty === 'MEDIUM') failChance = 0.25;
        if (difficulty === 'HARD') failChance = 0.45;
        if (difficulty === 'HARDCORE') failChance = 0.65;

        const isCrash = Math.random() < failChance;

        if (isCrash) {
            initiateCrash();
        } else {
            handleSuccess();
        }
    };

    const handleSuccess = () => {
        // Play next road step sound
        sfx.current.playStep();
        playSound('car_next');
        
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
        
        // Play crash sound
        sfx.current.playCrash();
        playSound('car_crash'); 

        setTimeout(() => {
            if (!isMounted.current) return;
            setGameState('CRASHED');
            addGameHistory('Dog Road', betAmount, 0, `Crashed at Lane ${nextLane + 1}`);
            onResult({
                win: false,
                amount: betAmount,
                game: 'Dog Road',
                period: Date.now().toString().slice(-8),
                resultDetails: [{ label: 'Result', value: 'Crashed!', color: 'bg-red-500' }]
            });
        }, 800);
    };

    const cashOut = (auto = false) => {
        if (currentLane === -1) {
            updateBalance(betAmount, 'GIFT', 'Stake Returned');
            setGameState('IDLE');
            return;
        }

        const mult = MULTIPLIERS[difficulty][currentLane];
        const winAmount = betAmount * mult;
        updateBalance(winAmount, 'WIN', 'Dog Road Win');
        addGameHistory('Dog Road', betAmount, winAmount, `Cashed out ${mult}x`);
        
        // Play cashout sound
        sfx.current.playCashout();
        playSound('cash_out');
        
        setGameState('WON');
        
        onResult({
            win: true,
            amount: winAmount,
            game: 'Dog Road',
            period: Date.now().toString().slice(-8),
            resultDetails: [
                { label: 'Victory', value: `${mult}x`, color: 'bg-green-500' }
            ]
        });
    };

    const currentMultiplier = currentLane === -1 ? 1.0 : MULTIPLIERS[difficulty][currentLane];
    const nextMultiplier = MULTIPLIERS[difficulty][currentLane + 1] || 0;
    const potentialWin = (betAmount * currentMultiplier).toFixed(2);

    let translateX = 0;
    if (currentLane > -1) {
        translateX = -(currentLane + 1) * 25 + 25;
    }

    return (
        <div className="bg-[#1a1c20] min-h-screen flex flex-col font-sans text-white overflow-hidden select-none">
            {/* Header */}
            <div className="bg-[#24262b] p-3 flex items-center justify-between border-b border-gray-800 z-20 shadow-xl">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} disabled={gameState === 'PLAYING' && currentLane > -1}>
                        <ArrowLeft className="text-gray-400" />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="font-black text-xl tracking-tighter italic gold-text">DOG <span className="text-orange-500">ROAD</span></span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full border border-gray-700">
                        <span className="text-yellow-500 font-bold">₹</span>
                        <span className="text-sm font-bold text-white">{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setMuted(prev => !prev)}>
                        {muted ? <VolumeX size={20} className="text-gray-400"/> : <Volume2 size={20} className="text-gray-400"/>}
                    </button>
                </div>
            </div>

            {/* Arena */}
            <div className="flex-1 relative overflow-hidden bg-[#2b2e33]">
                <div 
                    className="absolute inset-y-0 left-0 flex items-center transition-transform duration-500 ease-in-out"
                    style={{ 
                        transform: `translateX(${translateX + 10}vw)`, 
                        width: `${(MULTIPLIERS[difficulty].length + 1) * 25}vw`
                    }}
                >
                    {/* Start Zone */}
                    <div className="w-[25vw] h-full flex-shrink-0 bg-[#3a4042] border-r-4 border-gray-500 relative flex flex-col justify-center items-center z-10">
                        <div className="absolute inset-y-0 right-0 w-2 bg-gray-400 border-l border-dashed border-gray-600"></div>
                        <div className="w-20 h-20 bg-orange-800/20 rounded-full flex items-center justify-center mb-8 border-2 border-orange-900/50 shadow-inner">
                            <div className="text-4xl font-black">🏁</div>
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

                                <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    isPassed ? 'opacity-50 scale-90' : 'opacity-100'
                                }`}>
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-gray-600 to-gray-800 shadow-xl border-4 border-gray-700"></div>
                                    <div className="absolute inset-2 rounded-full bg-[#25282c] flex items-center justify-center border border-gray-600 shadow-inner">
                                        {isPassed ? (
                                            <div className="relative z-10 bg-yellow-500/20 p-2 rounded-full">
                                                <span className="text-yellow-500 font-bold">₹</span>
                                            </div>
                                        ) : (
                                            <span className="relative z-10 font-black text-xl text-gray-400 font-mono tracking-tighter">
                                                {mult}x
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {isDogHere && gameState !== 'CRASHED' && gameState !== 'CRASHING' && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 animate-in zoom-in duration-300">
                                        <img src="https://cdn-icons-png.flaticon.com/512/616/616554.png" alt="Dog" className="w-16 h-16 object-contain drop-shadow-2xl animate-bounce" />
                                        <div className="w-12 h-4 bg-black/50 rounded-full blur-sm mx-auto mt-[-8px]"></div>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                                            {mult}x
                                        </div>
                                    </div>
                                )}

                                {isCrashSite && (
                                    <>
                                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center transition-all duration-700 ease-in ${
                                            gameState === 'CRASHING' ? 'translate-y-0 opacity-100' : gameState === 'CRASHED' ? 'translate-y-0 opacity-100' : '-translate-y-[200px] opacity-0'
                                        }`}>
                                            <div className="text-6xl transform scale-y-[-1]">{carType}</div>
                                        </div>
                                        {gameState === 'CRASHED' && (
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 animate-in zoom-in bounce-in">
                                                <div className="text-xs font-black text-white bg-red-600 px-3 py-1.5 rounded shadow-lg border border-red-400 uppercase tracking-widest">Wasted!</div>
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

            {/* Bottom Controls */}
            <div className="bg-[#24262b] p-4 border-t border-gray-800 z-20 pb-6">
                {gameState === 'IDLE' || gameState === 'CRASHED' || gameState === 'WON' ? (
                    <div className="max-w-4xl mx-auto w-full">
                         <div className="flex bg-[#1a1c20] p-1 rounded-lg mb-4">
                            {(['EASY', 'MEDIUM', 'HARD', 'HARDCORE'] as Difficulty[]).map(d => (
                                <button
                                    key={d}
                                    onClick={() => setDifficulty(d)}
                                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
                                        difficulty === d ? 'bg-gray-600 text-white shadow' : 'text-gray-500 hover:bg-gray-800'
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
                                        className="bg-transparent outline-none text-white font-bold text-lg w-full font-mono"
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
                         {currentLane === -1 ? (
                            <button 
                                onClick={() => cashOut(false)}
                                className="flex-1 bg-red-600/20 text-red-500 hover:bg-red-600/30 font-black text-lg rounded-lg border border-red-500/30 active:scale-95 transition-all uppercase flex flex-col items-center justify-center leading-none py-3"
                            >
                                <RotateCcw size={20} className="mb-1" />
                                <span>RETURN</span>
                            </button>
                         ) : (
                            <button 
                                onClick={() => cashOut(false)}
                                disabled={gameState === 'CRASHING'}
                                className="flex-1 bg-orange-500 hover:bg-orange-400 text-black font-black text-lg rounded-lg shadow-[0_4px_0_rgb(194,65,12)] active:shadow-none active:translate-y-1 transition-all uppercase flex flex-col items-center justify-center leading-none py-3"
                            >
                                <span>COLLECT</span>
                                <span className="text-xs font-mono font-bold mt-1">₹{potentialWin}</span>
                            </button>
                         )}

                        <button 
                            onClick={nextStep}
                            disabled={gameState === 'CRASHING'}
                            className="flex-[2] bg-green-500 hover:bg-green-400 text-black font-black text-lg rounded-lg shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1 transition-all uppercase flex items-center justify-center gap-2"
                        >
                            GO <ArrowLeft className="rotate-180" size={24} strokeWidth={3}/>
                        </button>
                    </div>
                )}
            </div>
            <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
        </div>
    );
};

export default DogRoad;
