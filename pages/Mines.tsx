import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, HelpCircle, Wallet, Volume2, VolumeX } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, getMuteStatus, shouldForceLoss } from '../services/supabaseService';
import { GameResult } from '../types';
import MinesResultPopup from '../components/MinesResultPopup';
import HowToPlay from '../components/HowToPlay';

// Custom standalone AudioContext Synth class for rapid lag-free professional mines audio
class MinesSfx {
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
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playReveal() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Crisp upward chime Sweep for Gem reveal
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playBomb() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Deep rumble bomb explosion
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
    
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
    
    // Energetic cascade of high bell registers (Triad chord)
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
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

  playTileClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

// Probability combination-based professional multiplier generator
const getMinesMultiplier = (gems: number, mines: number): number => {
  if (gems <= 0) return 1.0;
  let p = 1.0;
  for (let i = 0; i < gems; i++) {
    p *= (25 - mines - i) / (25 - i);
  }
  // Standard 1% house edge multiplier calculation
  const mult = 0.99 / p;
  return parseFloat(mult.toFixed(2));
};

const Mines: React.FC<{
    onBack: () => void;
    userBalance: number;
    onResult: (result: GameResult) => void;
}> = ({ onBack, userBalance, onResult }) => {
    const sfx = useRef(new MinesSfx());
    const [grid, setGrid] = useState<number[]>(Array(25).fill(0));
    const gridRef = useRef<number[]>(Array(25).fill(0));
    const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
    const [betAmount, setBetAmount] = useState(10);
    const [isPlaying, setIsPlaying] = useState(false);
    const [minesCount, setMinesCount] = useState(3);
    const [gemsFound, setGemsFound] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [muted, setMuted] = useState(getMuteStatus());
    const [minesResult, setMinesResult] = useState<any | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    
    const isMounted = useRef(true);
    const isForcedLoss = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        sfx.current.setMuted(muted);
        return () => { 
            isMounted.current = false; 
            stopAllSounds(); 
        };
    }, [muted]);

    const startGame = async () => {
        if (betAmount > userBalance) { 
            alert("Insufficient Balance!"); 
            return; 
        }
        playSound('click');
        
        isForcedLoss.current = shouldForceLoss(betAmount, userBalance);

        updateBalance(-betAmount, 'BET', 'Mines Game');
        setIsPlaying(true); 
        setGameOver(false); 
        setGemsFound(0); 
        setRevealed(Array(25).fill(false));
        
        const newGrid = Array(25).fill(1); // 1 = Gem
        let minesPlaced = 0;
        while(minesPlaced < minesCount) {
            const idx = Math.floor(Math.random() * 25);
            if (newGrid[idx] !== 2) { 
                newGrid[idx] = 2; // 2 = Mine
                minesPlaced++; 
            }
        }
        gridRef.current = newGrid;
        setGrid(newGrid);
    };

    const handleTileClick = (index: number) => {
        if (!isPlaying || revealed[index] || gameOver) return;

        sfx.current.playTileClick();
        const newRevealed = [...revealed];
        newRevealed[index] = true;
        setRevealed(newRevealed);

        if (gridRef.current[index] === 2) {
            // Bomb explosion sound
            sfx.current.playBomb();
            playSound('mine_bomb');
            
            setGameOver(true); 
            setIsPlaying(false);
            setRevealed(Array(25).fill(true));
            addGameHistory('Mines', betAmount, 0, `Hit Mine (${minesCount} Mines)`);
            
            setMinesResult({
                win: false,
                amount: betAmount,
                multiplier: 0,
                gemsFound: gemsFound,
                minesCount: minesCount
            });
        } else {
            // Success gem chime sound
            sfx.current.playReveal();
            playSound('mine_reveal');
            setGemsFound(prev => prev + 1);
        }
    };

    const cashOut = () => {
        if (!isPlaying || gameOver) return;
        
        // Cashout chime sound
        sfx.current.playCashout();
        playSound('cash_out');
        
        const multiplier = getMinesMultiplier(gemsFound, minesCount);
        const winAmount = betAmount * multiplier;
        updateBalance(winAmount, 'WIN', 'Mines Win');
        addGameHistory('Mines', betAmount, winAmount, `Cashed Out @ ${multiplier.toFixed(2)}x`);
        
        setIsPlaying(false); 
        setGameOver(true);
        setRevealed(Array(25).fill(true)); 
        
        setMinesResult({
            win: true,
            amount: winAmount,
            multiplier: multiplier,
            gemsFound: gemsFound,
            minesCount: minesCount
        });
    };

    const currentMultiplier = getMinesMultiplier(gemsFound, minesCount);
    const nextMultiplier = getMinesMultiplier(gemsFound + 1, minesCount);

    return (
        <div className="bg-[#0f172a] min-h-screen flex flex-col pb-safe font-sans select-none">
            <MinesResultPopup result={minesResult} onClose={() => setMinesResult(null)} />
            <HowToPlay 
                isOpen={showHelp} 
                onClose={() => setShowHelp(false)} 
                title="Mines Rules"
                rules={[
                    "Set the number of mines (1-20) and your stake.",
                    "Reveal tiles to find Gems. Each Gem increases your multiplier.",
                    "If you reveal a Mine, you lose your entire stake and accumulated gems.",
                    "Cash out at any time after finding at least one gem.",
                    "The more mines you choose, the faster the multiplier grows based on mathematical probability."
                ]}
                payouts={[
                    { label: "1 Gem (3 Mines)", value: `${getMinesMultiplier(1, 3)}x` },
                    { label: "5 Gems (3 Mines)", value: `${getMinesMultiplier(5, 3)}x` },
                    { label: "1 Gem (10 Mines)", value: `${getMinesMultiplier(1, 10)}x` },
                    { label: "More Mines / Risk", value: "Significantly Higher Multiplier" }
                ]}
            />
            
            {/* Header */}
            <div className="bg-[#1e293b] p-4 flex items-center justify-between border-b border-slate-700 shadow-lg z-50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2.5 bg-slate-800 rounded-2xl active:scale-90 transition-all">
                        <ArrowLeft className="text-white" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black gold-text uppercase leading-none tracking-wider">MINES ELITE</h1>
                        <span className="text-[8px] text-yellow-500/40 mt-1 uppercase font-bold">Hunt Wallet</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setMuted(prev => !prev)} 
                        className="p-2.5 bg-slate-800 rounded-2xl text-slate-400 active:scale-90 transition-all border border-slate-700/50"
                    >
                        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <div className="flex items-center gap-2 bg-[#0f172a] px-3 py-1 rounded-2xl border border-yellow-500/20 shadow-inner">
                         <Wallet size={14} className="text-yellow-500"/>
                         <span className="text-sm font-black text-white">₹{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setShowHelp(true)} className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-2xl border border-yellow-500/20 active:scale-90 transition-all">
                        <HelpCircle size={20}/>
                    </button>
                </div>
            </div>

            <div className="flex-1 p-6 flex flex-col items-center justify-center">
                {/* Real-time multiplier display panel */}
                {isPlaying && (
                    <div className="mb-4 flex gap-4 items-center bg-[#1e293b] px-4 py-2 rounded-2xl border border-slate-700 shadow-lg">
                        <div className="flex flex-col text-center">
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Current Multiplier</span>
                            <span className="text-lg font-black text-emerald-400">{currentMultiplier.toFixed(2)}x</span>
                        </div>
                        <div className="w-px h-8 bg-slate-700" />
                        <div className="flex flex-col text-center">
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Next Gem Multiplier</span>
                            <span className="text-lg font-black text-yellow-400">{nextMultiplier.toFixed(2)}x</span>
                        </div>
                    </div>
                )}

                {/* Mines Grid */}
                <div className="grid grid-cols-5 gap-2.5 mb-8">
                    {grid.map((val, idx) => (
                        <button
                            key={idx}
                            disabled={!isPlaying || (revealed[idx] && !gameOver)}
                            onClick={() => handleTileClick(idx)}
                            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all ${
                                !revealed[idx] 
                                    ? 'bg-[#334155] hover:bg-[#475569] shadow-[0_4px_0_#1e293b] active:translate-y-[2px] active:shadow-[0_2px_0_#1e293b]' 
                                    : (val === 2 
                                        ? 'bg-gradient-to-b from-red-900 to-red-950 border border-red-500/40 shadow-inner shadow-red-950' 
                                        : 'bg-gradient-to-b from-emerald-900 to-emerald-950 border border-emerald-500/40 shadow-inner shadow-emerald-950')
                            }`}
                        >
                            {revealed[idx] && (
                                <div className="flex flex-col items-center justify-center animate-in zoom-in duration-200">
                                    {val === 2 ? (
                                        <>
                                            <span className="text-2xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">💣</span>
                                            <span className="text-[7px] text-red-400 font-black uppercase mt-0.5 tracking-tighter">BOMB</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-2xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">💎</span>
                                            <span className="text-[7px] text-emerald-400 font-black uppercase mt-0.5 tracking-tighter font-sans">GEM</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Game Control Settings */}
                <div className="w-full max-w-md bg-[#1e293b] rounded-3xl p-5 space-y-5 shadow-2xl border border-slate-700">
                    {!isPlaying ? (
                        <>
                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-widest">Stake Amount</p>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                    {[10, 50, 100, 500, 1000].map(amt => (
                                        <button 
                                            key={amt} 
                                            onClick={() => setBetAmount(amt)} 
                                            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-xs font-black border transition-all ${
                                                betAmount === amt 
                                                    ? 'bg-blue-600 border-white text-white shadow-lg shadow-blue-500/20' 
                                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            ₹{amt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-widest">Mines Count</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {[1, 3, 5, 10, 20].map(num => (
                                        <button 
                                            key={num} 
                                            onClick={() => setMinesCount(num)} 
                                            className={`py-3 rounded-xl font-black text-xs border transition-all ${
                                                minesCount === num 
                                                    ? 'bg-red-600 text-white border-white shadow-lg shadow-red-500/20' 
                                                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                                            }`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button 
                                onClick={startGame} 
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-[20px] rounded-2xl font-black text-white shadow-[0_10px_20px_rgba(37,99,235,0.4)] active:scale-95 transition-all uppercase tracking-[0.2em] text-xl md:text-2xl border border-blue-400/20"
                            >
                                START HUNTING
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={cashOut} 
                            disabled={gemsFound === 0} 
                            className={`w-full py-[18px] rounded-2xl font-black shadow-[0_10px_20px_rgba(16,185,129,0.3)] text-white transition-all active:scale-95 text-lg md:text-xl uppercase tracking-wider ${
                                gemsFound > 0 
                                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 border-b-4 border-emerald-700 active:border-b-0' 
                                    : 'bg-slate-700 opacity-50 cursor-not-allowed text-slate-400'
                            }`}
                        >
                            {gemsFound === 0 
                                ? 'FIND GEMS TO CASHOUT' 
                                : `CASHOUT ₹${(betAmount * currentMultiplier).toFixed(2)} (${currentMultiplier.toFixed(2)}x)`
                            }
                        </button>
                    )}
                </div>
            </div>
            <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
        </div>
    );
};

export default Mines;
