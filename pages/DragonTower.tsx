
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    ArrowLeft, 
    Wallet, 
    RotateCw, 
    History as HistoryIcon, 
    HelpCircle, 
    Trophy, 
    Users, 
    TrendingUp,
    ShieldCheck,
    Coins,
    User,
    Flame,
    Sword,
    ChevronUp,
    ShieldAlert,
    Zap,
    Play,
    Pause,
    Lock
} from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, addGameBet, auth } from '../services/supabaseService';
import { GameResult } from '../types';
import HowToPlay from '../components/HowToPlay';

interface Props {
  onBack: () => void;
  userBalance: number;
  onResult: (r: GameResult) => void;
}

const TOTAL_LEVELS = 10;

const DIFFICULTY_MODES = [
    { id: 'EASY', label: 'Easy', traps: 1, total: 3, color: 'text-green-400', icon: '🟢', riskFactor: 3/2 },
    { id: 'MEDIUM', label: 'Medium', traps: 2, total: 3, color: 'text-yellow-400', icon: '🟡', riskFactor: 3/1 },
    { id: 'HARD', label: 'Hard', traps: 3, total: 4, color: 'text-red-400', icon: '🔴', riskFactor: 4/1 },
];

const DragonTower: React.FC<Props> = ({ onBack, userBalance, onResult }) => {
    const [betAmount, setBetAmount] = useState(10);
    const [difficulty, setDifficulty] = useState(DIFFICULTY_MODES[0]);
    const [currentLevel, setCurrentLevel] = useState(0); // 0 = not started
    const [isPlaying, setIsPlaying] = useState(false);
    const [history, setHistory] = useState<number[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    const [explodedIdx, setExplodedIdx] = useState<{level: number, tile: number} | null>(null);
    const [lastMultiplier, setLastMultiplier] = useState(1.00);
    const [tab, setTab] = useState<'MANUAL' | 'AUTO'>('MANUAL');
    
    // Auto Mode States
    const [isAutoActive, setIsAutoActive] = useState(false);
    const [autoTargetLevel, setAutoTargetLevel] = useState(5);

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; stopAllSounds(); };
    }, []);

    const getMultiplierForLevel = (lvl: number) => {
        if (lvl <= 0) return 1.00;
        return Math.pow(difficulty.riskFactor * 0.98, lvl); // 0.98 for house edge
    };

    const startGame = async () => {
        if (isPlaying || userBalance < betAmount) return;

        setIsPlaying(true);
        setCurrentLevel(1);
        setExplodedIdx(null);
        updateBalance(-betAmount, 'BET', 'Dragon Tower Start');
        playSound('bet_place');

        if (auth.currentUser) {
            addGameBet('dragon_tower_bets', {
                amount: betAmount,
                target: 'START',
                difficulty: difficulty.id
            });
        }
    };

    const handleTilePick = async (tileIdx: number) => {
        if (!isPlaying || explodedIdx) return;

        const winChance = (difficulty.total - difficulty.traps) / difficulty.total;
        const isWin = Math.random() <= winChance;

        if (isWin) {
            playSound('tower_step');
            if (currentLevel < TOTAL_LEVELS) {
                setCurrentLevel(prev => prev + 1);
            } else {
                cashOut();
            }
        } else {
            handleLoss(tileIdx);
        }
    };

    const handleLoss = (tileIdx: number) => {
        setExplodedIdx({ level: currentLevel, tile: tileIdx });
        setIsPlaying(false);
        setIsAutoActive(false);
        playSound('mine_bomb');
        setLastMultiplier(1.00);
        
        setTimeout(() => {
            if (isMounted.current) {
                setCurrentLevel(0);
                setExplodedIdx(null);
            }
        }, 2000);

        addGameHistory('Dragon Tower', betAmount, 0, `Tower Collapse Level ${currentLevel}`);
    };

    const cashOut = () => {
        if (!isPlaying || currentLevel <= 1) return;

        const multiplier = getMultiplierForLevel(currentLevel - 1);
        const winAmount = betAmount * multiplier;

        updateBalance(winAmount, 'WIN', 'Dragon Tower Success');
        playSound('cash_out');
        setLastMultiplier(multiplier);
        setHistory(prev => [multiplier, ...prev].slice(0, 10));
        setIsPlaying(false);
        setCurrentLevel(0);
        setIsAutoActive(false);

        addGameHistory('Dragon Tower', betAmount, winAmount, `Dragon Defeated at ${multiplier.toFixed(2)}x`);
    };

    // Auto Mode Logic
    useEffect(() => {
        if (isAutoActive && isPlaying && currentLevel > 0) {
            if (currentLevel > autoTargetLevel) {
                cashOut();
            } else {
                const timer = setTimeout(() => {
                    const randomTile = Math.floor(Math.random() * difficulty.total);
                    handleTilePick(randomTile);
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [isAutoActive, isPlaying, currentLevel, autoTargetLevel, difficulty.total]);

    const currentMultiplier = getMultiplierForLevel(currentLevel - 1);
    const nextMultiplier = getMultiplierForLevel(currentLevel);

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-red-600/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 blur-[100px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>
            </div>

            <HowToPlay 
                isOpen={showHelp} 
                onClose={() => setShowHelp(false)}
                title="Dragon Tower Guide"
                rules={[
                    "Set your bet amount and difficulty level.",
                    "Climb the tower level by level.",
                    "Each level has multiple tiles. Some are SAFE, some are TRAPS.",
                    "Correct tiles move you UP and increase your multiplier.",
                    "Cash out at any time to take your winnings.",
                    "The higher the difficulty, the bigger the multiplier jump!"
                ]}
                payouts={[
                    { label: "Level 1", value: "1.00x" },
                    { label: "Difficulty Easy", value: "1.47x per level" },
                    { label: "Difficulty Medium", value: "2.94x per level" },
                    { label: "Difficulty Hard", value: "3.92x per level" }
                ]}
            />

            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 bg-slate-800/50 rounded-2xl border border-white/10 active:scale-90"><ArrowLeft size={18}/></button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                             <Flame size={14} className="text-red-500 fill-red-500 animate-pulse" />
                             <h1 className="text-sm font-black italic gold-text tracking-widest uppercase">DRAGON TOWER</h1>
                        </div>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Legendary Ascent</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                        <Wallet size={14} className="text-yellow-500" />
                        <span className="text-sm font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setShowHelp(true)} className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-2xl border border-yellow-500/20 active:scale-90"><HelpCircle size={18}/></button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Left Panel - Control */}
                <div className="w-full md:w-80 p-4 border-r border-white/5 bg-black/20 flex flex-col gap-4 overflow-y-auto no-scrollbar z-20 pb-40 md:pb-4">
                    <div className="flex bg-slate-950 p-1 rounded-2xl border border-white/5">
                        {['MANUAL', 'AUTO'].map((t) => (
                            <button 
                                key={t}
                                onClick={() => { setTab(t as any); setIsAutoActive(false); }}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${tab === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {/* Difficulty */}
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Difficulty</label>
                            <div className="grid grid-cols-3 gap-2">
                                {DIFFICULTY_MODES.map(mode => (
                                    <button 
                                        key={mode.id}
                                        disabled={isPlaying}
                                        onClick={() => setDifficulty(mode)}
                                        className={`py-3 rounded-xl flex flex-col items-center justify-center transition-all border ${difficulty.id === mode.id ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-900 border-white/5 text-zinc-500'}`}
                                    >
                                        <span className="text-lg">{mode.icon}</span>
                                        <span className="text-[8px] font-black uppercase mt-1">{mode.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bet Amount */}
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex justify-between">Stake Amount<span className="text-indigo-400">Min 10</span></label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={betAmount} 
                                    onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
                                    disabled={isPlaying}
                                    className="w-full bg-slate-950 rounded-2xl py-3.5 px-4 font-black border border-white/5 focus:border-indigo-500/50 transition-all text-sm outline-none"
                                />
                                <Coins className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500/30" size={16} />
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {[10, 50, 100, 500].map(amt => (
                                    <button 
                                        key={amt} 
                                        onClick={() => !isPlaying && setBetAmount(amt)}
                                        className={`py-2 rounded-lg text-[10px] font-black border transition-all ${betAmount === amt ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-950 border-white/5 text-zinc-500'}`}
                                    >
                                        ₹{amt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {tab === 'AUTO' && (
                             <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Target Level ({autoTargetLevel})</label>
                                    <input 
                                        type="range" 
                                        min="2" 
                                        max={TOTAL_LEVELS} 
                                        value={autoTargetLevel} 
                                        onChange={(e) => setAutoTargetLevel(Number(e.target.value))}
                                        className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                             </div>
                        )}

                        <button 
                            onClick={tab === 'MANUAL' ? startGame : () => { setIsAutoActive(!isAutoActive); if(!isAutoActive) startGame(); }}
                            disabled={(isPlaying && tab === 'MANUAL') || userBalance < betAmount}
                            className={`w-full py-5 rounded-2xl font-black italic tracking-[0.2em] uppercase transition-all active:scale-95 text-sm shadow-xl flex items-center justify-center gap-3 ${isAutoActive ? 'bg-red-600 text-white' : (isPlaying && tab === 'MANUAL') ? 'bg-zinc-800 text-zinc-500' : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-t border-white/20'}`}
                        >
                            {tab === 'AUTO' ? (isAutoActive ? <Pause size={18}/> : <Play size={18}/>) : null}
                            {tab === 'AUTO' ? (isAutoActive ? 'STOP AUTO' : 'START AUTO') : (isPlaying ? 'CLIMBING...' : 'PLACE BET')}
                        </button>
                    </div>

                    {/* History */}
                    <div className="mt-4 flex-1 flex flex-col min-h-[200px]">
                        <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                             <HistoryIcon size={12} className="text-indigo-500" />
                             Last Climbs
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {history.map((h, i) => (
                                <div key={i} className={`p-2 rounded-xl text-center text-[10px] font-black border ${h > 1 ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-slate-900 border-white/5 text-zinc-600'}`}>
                                    {h.toFixed(2)}x
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Game Area - The Tower */}
                <div className="flex-1 overflow-y-auto no-scrollbar bg-black/40 p-4 md:p-8 flex flex-col items-center">
                    <div className="flex flex-col-reverse gap-4 w-full max-w-sm relative">
                        {/* Levels */}
                        {Array.from({ length: TOTAL_LEVELS }).map((_, i) => {
                            const levelNum = i + 1;
                            const isCurrent = currentLevel === levelNum;
                            const isPast = currentLevel > levelNum;
                            const isNext = isPlaying && currentLevel === levelNum - 1;
                            
                            return (
                                <div key={levelNum} className="relative group">
                                    <div className="absolute -left-10 md:-left-16 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-50">
                                         <span className="text-[10px] font-black text-indigo-400/50 font-mono">L{levelNum}</span>
                                         <div className="w-4 h-0.5 bg-indigo-500/20"></div>
                                    </div>

                                    <div className={`grid gap-2 items-center transition-all duration-500 ${difficulty.total === 3 ? 'grid-cols-3' : 'grid-cols-4'} ${isCurrent ? 'scale-105' : isPast ? 'opacity-30' : isNext ? 'opacity-100' : 'opacity-10 grayscale pointer-events-none'}`}>
                                        {Array.from({ length: difficulty.total }).map((_, tileIdx) => {
                                            const isExploded = explodedIdx?.level === levelNum && explodedIdx?.tile === tileIdx;
                                            
                                            return (
                                                <button
                                                    key={tileIdx}
                                                    disabled={!isNext || explodedIdx !== null || isAutoActive}
                                                    onClick={() => handleTilePick(tileIdx)}
                                                    className={`aspect-square sm:aspect-video rounded-xl border-2 flex items-center justify-center transition-all relative overflow-hidden ${isNext ? 'bg-slate-900 border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-500/10 active:scale-95' : 'bg-zinc-950 border-white/5'} ${isExploded ? 'bg-red-600 border-red-400 shadow-[0_0_30px_rgba(220,38,38,0.5)] z-10' : ''}`}
                                                >
                                                    {isExploded ? (
                                                        <Flame size={20} className="text-white animate-bounce" />
                                                    ) : isPast ? (
                                                        <ShieldCheck size={16} className="text-green-500/50" />
                                                    ) : isNext ? (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 animate-pulse"></div>
                                                    ) : (
                                                        <Lock size={12} className="text-zinc-800" />
                                                    )}

                                                    {/* Explosion Animation Overlay */}
                                                    <AnimatePresence>
                                                        {isExploded && (
                                                            <motion.div 
                                                                initial={{ scale: 0, opacity: 1 }}
                                                                animate={{ scale: 4, opacity: 0 }}
                                                                className="absolute inset-0 bg-orange-500 rounded-full"
                                                            />
                                                        )}
                                                    </AnimatePresence>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Multiplier Label for the level */}
                                    <div className="absolute -right-12 md:-right-20 top-1/2 -translate-y-1/2 text-right">
                                        <span className={`text-[10px] font-black font-mono tracking-tighter ${isCurrent ? 'text-indigo-400 animate-pulse' : 'text-zinc-600'}`}>
                                            {getMultiplierForLevel(levelNum).toFixed(2)}x
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Ground Base */}
                        <div className="mt-8 py-10 flex flex-col items-center">
                             <div className={`w-16 h-4 bg-indigo-500/10 blur-xl rounded-full transition-all duration-500 ${isPlaying ? 'scale-150' : 'scale-50'}`}></div>
                             <div className="mt-4 flex flex-col items-center">
                                 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center p-2 shadow-2xl relative">
                                     <Sword size={20} />
                                     {currentLevel === 0 && !isPlaying && (
                                         <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-ping"></div>
                                     )}
                                 </div>
                                 <span className="text-[8px] text-zinc-600 font-black uppercase mt-2 tracking-widest">Altar of Fortune</span>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Stats Panel (Large Screens) */}
                <div className="w-64 p-4 border-l border-white/5 bg-black/20 hidden lg:flex flex-col gap-4 z-20">
                     <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 text-center flex flex-col items-center gap-1 group">
                         <Trophy size={32} className="text-yellow-500/20 group-hover:text-yellow-500/40 transition-all mb-2" />
                         <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Next Payout</span>
                         <h3 className="text-2xl font-black italic gold-text">₹{(betAmount * nextMultiplier).toFixed(2)}</h3>
                     </div>

                     <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-4">
                         <div className="flex justify-between items-center">
                             <span className="text-[9px] text-zinc-500 font-black uppercase">Current Lvl</span>
                             <span className="text-xs font-black text-white">{currentLevel} / {TOTAL_LEVELS}</span>
                         </div>
                         <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                             <motion.div 
                                className="h-full bg-indigo-500"
                                animate={{ width: `${(currentLevel / TOTAL_LEVELS) * 100}%` }}
                             />
                         </div>
                     </div>

                     <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-center gap-3 mt-auto">
                        <ShieldCheck className="text-indigo-500/50" size={20} />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-indigo-500/50 uppercase tracking-widest leading-none">Safe Protocols</span>
                            <span className="text-[8px] text-zinc-700 font-bold uppercase mt-1">Certified RNG 1.0</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="p-4 md:p-6 bg-[#020617] border-t border-white/10 z-[100] shadow-[0_-20px_100px_rgba(0,0,0,1)]">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4">
                    <div className="flex-1 flex flex-col gap-1 items-center md:items-start">
                         <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Staked Value</span>
                         <div className="text-2xl font-black italic text-white font-mono">₹{(betAmount * currentMultiplier).toFixed(2)}</div>
                    </div>
                    
                    <div className="flex gap-4 flex-[2]">
                        <button 
                            onClick={cashOut}
                            disabled={!isPlaying || currentLevel <= 1 || isAutoActive}
                            className={`flex-1 py-4 md:py-5 rounded-2xl font-black italic tracking-[0.3em] uppercase transition-all active:scale-95 text-sm border-t-2 shadow-2xl flex items-center justify-center gap-3 ${!isPlaying || currentLevel <= 1 || isAutoActive ? 'bg-zinc-900 text-zinc-600 border-white/5 opacity-50' : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-black border-white/40'}`}
                        >
                            CASH OUT
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .animate-shake { animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both infinite; }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

export default DragonTower;
