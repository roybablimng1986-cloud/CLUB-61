
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
    Sword
} from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, addGameBet, auth } from '../services/supabaseService';
import { GameResult } from '../types';
import HowToPlay from '../components/HowToPlay';

interface Props {
  onBack: () => void;
  userBalance: number;
  onResult: (r: GameResult) => void;
}

const TOWER_LEVELS = [
    { level: 1, mult: 1.00 },
    { level: 2, mult: 1.50 },
    { level: 3, mult: 2.10 },
    { level: 4, mult: 3.20 },
    { level: 5, mult: 5.00 },
    { level: 6, mult: 8.50 },
    { level: 7, mult: 15.00 },
    { level: 8, mult: 30.00 },
    { level: 9, mult: 60.00 },
    { level: 10, mult: 100.00 },
];

const DIFFICULTY_MODES = [
    { id: 'EASY', label: 'Easy', traps: 1, total: 3, color: 'text-green-400' },
    { id: 'MEDIUM', label: 'Medium', traps: 2, total: 3, color: 'text-yellow-400' },
    { id: 'HARD', label: 'Hard', traps: 3, total: 4, color: 'text-red-400' },
];

const FAKE_WINS = [
    { name: 'Guest4523', amount: 100, mult: 6.50, win: 650 },
    { name: 'Guest7856', amount: 200, mult: 12.30, win: 2460 },
    { name: 'Guest1578', amount: 50, mult: 3.25, win: 162.50 },
    { name: 'Guest2586', amount: 150, mult: 8.70, win: 1305 },
    { name: 'Guest3698', amount: 300, mult: 15.60, win: 4680 },
];

const DragonTower: React.FC<Props> = ({ onBack, userBalance, onResult }) => {
    const [betAmount, setBetAmount] = useState(100);
    const [difficulty, setDifficulty] = useState(DIFFICULTY_MODES[0]);
    const [currentLevel, setCurrentLevel] = useState(0); // 0 = not started
    const [isPlaying, setIsPlaying] = useState(false);
    const [history, setHistory] = useState<number[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    const [isExploding, setIsExploding] = useState<number | null>(null);
    const [lastMultiplier, setLastMultiplier] = useState(1.00);
    const [tab, setTab] = useState<'MANUAL' | 'AUTO'>('MANUAL');
    const [autoCashout, setAutoCashout] = useState(10.00);

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; stopAllSounds(); };
    }, []);

    const startGame = async () => {
        if (isPlaying || userBalance < betAmount) return;

        setIsPlaying(true);
        setCurrentLevel(1);
        setIsExploding(null);
        updateBalance(-betAmount, 'BET', 'Dragon Tower Initial');
        playSound('bet_place');

        // Initial bet record
        if (auth.currentUser) {
            addGameBet('dragon_tower_bets', {
                amount: betAmount,
                target: 'START',
                difficulty: difficulty.id
            });
        }
    };

    const handleLevelClimb = () => {
        if (!isPlaying) return;

        const winChance = (difficulty.total - difficulty.traps) / difficulty.total;
        const roll = Math.random();

        if (roll <= winChance) {
            // WIN
            playSound('tower_step'); // Consistent with other games
            if (currentLevel < TOWER_LEVELS.length) {
                setCurrentLevel(prev => prev + 1);
            } else {
                // MAX REACHED
                cashOut();
            }
        } else {
            // TRAP
            handleLoss();
        }
    };

    const handleLoss = () => {
        setIsExploding(currentLevel);
        setIsPlaying(false);
        playSound('mine_bomb');
        setLastMultiplier(1.00);
        
        setTimeout(() => {
            if (isMounted.current) {
                setCurrentLevel(0);
                setIsExploding(null);
            }
        }, 2000);

        addGameHistory('Dragon Tower', betAmount, 0, `Trapped at Level ${currentLevel}`);
    };

    const cashOut = () => {
        if (!isPlaying || currentLevel === 0) return;

        const multiplier = TOWER_LEVELS[currentLevel - 1].mult;
        const winAmount = betAmount * multiplier;

        updateBalance(winAmount, 'WIN', 'Dragon Tower Cashout');
        playSound('cash_out');
        setLastMultiplier(multiplier);
        setHistory(prev => [multiplier, ...prev].slice(0, 10));
        setIsPlaying(false);
        setCurrentLevel(0);

        addGameHistory('Dragon Tower', betAmount, winAmount, `Cashed out at ${multiplier}x`);
    };

    const currentMultiplier = currentLevel > 0 ? TOWER_LEVELS[currentLevel - 1].mult : 1.00;
    const nextMultiplier = currentLevel < TOWER_LEVELS.length ? TOWER_LEVELS[currentLevel].mult : 100.00;

    return (
        <div className="min-h-screen bg-[#0B1020] text-white flex flex-col font-sans relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-orange-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[100px] rounded-full" />
                
                {/* Cloud/Mist Effects */}
                <motion.div 
                    animate={{ x: [-20, 20], opacity: [0.3, 0.5] }}
                    transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
                    className="absolute top-1/3 left-0 right-0 h-40 bg-gradient-to-r from-transparent via-slate-800/20 to-transparent blur-3xl"
                />
            </div>

            <HowToPlay 
                isOpen={showHelp} 
                onClose={() => setShowHelp(false)}
                title="Dragon Tower Guide"
                rules={[
                    "Set your bet amount and difficulty level.",
                    "Climb the tower to increase your multiplier.",
                    "Each level contains hidden traps - avoid them to survive!",
                    "Cash out at any time to secure your current winnings.",
                    "Difficulty affects potential multipliers and trap density."
                ]}
                payouts={[
                    { label: "Level 1", value: "1.00x" },
                    { label: "Level 5", value: "5.00x" },
                    { label: "Level 10 (MAX)", value: "100.00x" }
                ]}
            />

            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/5 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 bg-slate-800/50 rounded-2xl border border-white/10 hover:bg-slate-800 transition-all active:scale-95"><ArrowLeft size={18}/></button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                             <Flame size={14} className="text-orange-500 fill-orange-500 animate-pulse" />
                             <h1 className="text-sm font-black italic gold-text tracking-widest uppercase">DRAGON TOWER</h1>
                        </div>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 ml-5">Climb for Glory</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                        <Wallet size={14} className="text-orange-500" />
                        <span className="text-sm font-black font-mono text-orange-500">₹{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setShowHelp(true)} className="p-2.5 bg-orange-500/10 text-orange-500 rounded-2xl border border-orange-500/20 hover:bg-orange-500/20 transition-all"><HelpCircle size={18}/></button>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                
                {/* Left Panel - Control */}
                <div className="w-full md:w-80 p-4 border-r border-white/5 bg-black/20 flex flex-col gap-4 overflow-y-auto z-20">
                    <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5">
                        {['MANUAL', 'AUTO'].map((t) => (
                            <button 
                                key={t}
                                onClick={() => setTab(t as any)}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${tab === t ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex justify-between items-center">
                                Bet Amount
                                <span className="text-zinc-400">Min 10</span>
                            </label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={betAmount} 
                                    onChange={(e) => setBetAmount(Number(e.target.value))}
                                    disabled={isPlaying}
                                    className="w-full bg-slate-900 rounded-2xl py-3.5 px-4 font-black border border-white/5 focus:border-orange-500/50 transition-all text-sm outline-none"
                                />
                                <Coins className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500/50" size={16} />
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {[100, 500, 1000, 2000].map(amt => (
                                    <button 
                                        key={amt} 
                                        onClick={() => !isPlaying && setBetAmount(amt)}
                                        className={`py-2 px-1 rounded-xl text-[10px] font-black border transition-all ${betAmount === amt ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-slate-900 border-white/5 text-zinc-500'}`}
                                    >
                                        {amt >= 1000 ? `${amt/1000}K` : amt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {tab === 'AUTO' && (
                             <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Auto Cashout</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={autoCashout} 
                                        onChange={(e) => setAutoCashout(Number(e.target.value))}
                                        className="w-full bg-slate-900 rounded-2xl py-3.5 px-4 font-black border border-white/5 text-sm outline-none"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 font-black text-xs">x</span>
                                </div>
                             </div>
                        )}

                        <button 
                            onClick={startGame}
                            disabled={isPlaying || userBalance < betAmount}
                            className={`w-full py-5 rounded-2xl font-black italic tracking-[0.2em] uppercase transition-all active:scale-95 text-sm shadow-xl ${isPlaying ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-900/20 border-t border-white/20'}`}
                        >
                            {isPlaying ? 'CLIMBING...' : 'PLACE BET'}
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-slate-900/30 rounded-2xl p-4 border border-white/5 space-y-3 mt-4">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-zinc-500 uppercase tracking-widest">Total Bets</span>
                            <span className="text-white font-mono">245</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-zinc-500 uppercase tracking-widest">Total Win</span>
                            <span className="text-emerald-400 font-mono">₹12,450.00</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-zinc-500 uppercase tracking-widest">Players</span>
                            <span className="text-white font-mono flex items-center gap-1"><Users size={10}/> 23</span>
                        </div>
                    </div>

                    {/* Live Wins */}
                    <div className="flex-1 mt-4 overflow-hidden flex flex-col">
                        <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                            <TrendingUp size={12} className="text-orange-500" />
                            Live Wins
                        </h4>
                        <div className="space-y-2 overflow-y-auto no-scrollbar">
                            {FAKE_WINS.map((win, i) => (
                                <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 animate-in slide-in-from-right duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-orange-600 flex items-center justify-center"><User size={12}/></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black">{win.name}</span>
                                            <span className="text-[8px] text-zinc-500 font-bold">₹{win.amount}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-blue-400">{win.mult.toFixed(2)}x</div>
                                        <div className="text-[10px] font-black text-emerald-400">₹{win.win.toFixed(0)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Center - Tower */}
                <div className="flex-1 relative flex flex-col items-center p-8 bg-[#0B1020]/50 overflow-y-auto scroll-smooth">
                    
                    {/* Dragon Art Decoration */}
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 opacity-10 pointer-events-none select-none w-full max-w-lg">
                        <svg viewBox="0 0 200 200" className="w-full h-auto fill-orange-500">
                             <path d="M100,20 C120,20 140,30 150,50 C160,70 155,90 140,110 C125,130 100,150 100,180 C100,150 75,130 60,110 C45,90 40,70 50,50 C60,30 80,20 100,20 Z" />
                        </svg>
                    </div>

                    <div className="w-full max-w-xs flex flex-col-reverse gap-3 relative z-10 pt-20">
                        {TOWER_LEVELS.map((lvl) => {
                            const isCurrent = currentLevel === lvl.level;
                            const isPast = currentLevel > lvl.level;
                            const isNext = isPlaying && currentLevel === lvl.level - 1;
                            const isExploded = isExploding === lvl.level;

                            return (
                                <motion.div 
                                    key={lvl.level}
                                    initial={false}
                                    animate={{ 
                                        scale: isCurrent ? 1.05 : 1,
                                        opacity: isPlaying ? (isCurrent || isPast || isNext ? 1 : 0.4) : 1
                                    }}
                                    className={`relative group h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${
                                        isCurrent 
                                            ? 'bg-gradient-to-r from-orange-600 to-orange-500 border-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.4)]'
                                            : isPast
                                            ? 'bg-zinc-800/80 border-zinc-700/50 text-zinc-500'
                                            : isNext
                                            ? 'bg-slate-900/50 border-orange-500/20 border-dashed cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5'
                                            : 'bg-zinc-900 border-white/5 text-zinc-600 opacity-50'
                                    } ${isExploded ? 'bg-red-600 border-red-500 animate-shake shadow-[0_0_40px_rgba(239,68,68,0.5)]' : ''}`}
                                    onClick={() => isNext && handleLevelClimb()}
                                >
                                    <span className={`text-lg font-black italic tracking-tighter ${isCurrent ? 'text-white' : ''}`}>
                                        {lvl.mult.toFixed(2)}x
                                    </span>
                                    
                                    {isCurrent && (
                                        <motion.div 
                                            layoutId="char" 
                                            className="absolute -bottom-1 w-full flex justify-center"
                                        >
                                            <div className="w-8 h-4 bg-orange-400 blur-md rounded-full animate-pulse" />
                                        </motion.div>
                                    )}

                                    {isExploded && (
                                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl">
                                            <motion.div 
                                                initial={{ scale: 0, opacity: 1 }}
                                                animate={{ scale: 3, opacity: 0 }}
                                                className="w-20 h-20 bg-red-500 rounded-full"
                                            />
                                            <Flame size={32} className="text-white animate-bounce" />
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}

                        {/* Player Starting Point */}
                        <div className={`mt-4 py-8 flex flex-col items-center gap-4 transition-all ${currentLevel > 0 ? 'opacity-30' : 'opacity-100'}`}>
                             <div className="relative">
                                 <motion.div 
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="relative z-20"
                                 >
                                    <div className="w-12 h-12 bg-gradient-to-b from-orange-400 to-orange-600 rounded-2xl border-2 border-white/20 shadow-2xl flex items-center justify-center p-2">
                                        <Sword className="text-white" />
                                    </div>
                                 </motion.div>
                                 <div className="absolute -bottom-2 translate-y-full w-full flex justify-center">
                                      <div className="w-16 h-2 bg-black/40 blur-sm rounded-full" />
                                 </div>
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ascent Origin</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Info */}
                <div className="w-64 p-4 border-l border-white/5 bg-black/20 flex flex-col gap-4 hidden lg:flex z-20">
                    <div className="space-y-4">
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 text-center relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Trophy size={40}/></div>
                           <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">Next Possible</p>
                           <h3 className="text-2xl font-black gold-text italic tracking-tighter">{nextMultiplier.toFixed(2)}x</h3>
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 text-center transition-all">
                           <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">Your Bets</p>
                           <h3 className="text-2xl font-black text-blue-400 italic font-mono tracking-tighter">
                               {isPlaying ? 1 : 0}
                           </h3>
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 text-center">
                           <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">Last Result</p>
                           <h3 className={`text-2xl font-black italic font-mono tracking-tighter ${lastMultiplier > 1 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                               {lastMultiplier.toFixed(2)}x
                           </h3>
                        </div>
                    </div>

                    <div className="flex-1 mt-4 overflow-hidden">
                        <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                             <HistoryIcon size={12} className="text-blue-500" />
                             History
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {history.length > 0 ? history.map((h, i) => (
                                <div key={i} className={`p-2 rounded-xl text-center text-[10px] font-black italic border ${h > 1 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-900 border-white/5 text-zinc-600'}`}>
                                    {h.toFixed(2)}x
                                </div>
                            )) : (
                                <div className="col-span-2 py-8 text-center text-zinc-700 text-[10px] font-bold italic border border-dashed border-zinc-800 rounded-2xl">
                                    Awaiting Legend...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Security Badge */}
                    <div className="mt-auto p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center gap-3">
                        <ShieldCheck className="text-emerald-500/50" size={20} />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">Provably Fair</span>
                            <span className="text-[8px] text-zinc-600 font-bold uppercase leading-none mt-0.5">Verified RNG v2.1</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Panel - Actions */}
            <div className="p-4 safe-bottom bg-[#0B1020] border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30">
                 <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4">
                    <div className="grid grid-cols-6 gap-2 flex-1 md:flex-[0.6]">
                        {[1, 1.5, 2, 3, 5].map(m => (
                            <button 
                                key={m}
                                onClick={() => !isPlaying && setBetAmount(Math.floor(betAmount * m))}
                                className="h-12 rounded-xl bg-slate-900 border border-white/5 text-[10px] font-black italic active:scale-90 transition-all hover:bg-slate-800"
                            >
                                {m}x
                            </button>
                        ))}
                        <button 
                            onClick={() => !isPlaying && setBetAmount(userBalance)}
                            className="h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 text-[10px] font-black italic text-orange-500 active:scale-90 transition-all hover:bg-orange-500/20"
                        >
                            ALL
                        </button>
                    </div>

                    <button 
                        onClick={cashOut}
                        disabled={!isPlaying || currentLevel === 0}
                        className={`flex-1 py-5 rounded-[2.5rem] font-black italic tracking-[0.4em] uppercase transition-all active:scale-95 text-base flex flex-col items-center justify-center leading-none gap-1 border-t-2 ${!isPlaying || currentLevel === 0 ? 'bg-zinc-800 text-zinc-600 border-white/5 opacity-50' : 'bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-[0_10px_40px_rgba(249,115,22,0.3)] border-white/10'}`}
                    >
                        <span>CASH OUT</span>
                        <span className="text-xs tracking-widest text-white/70 italic uppercase">₹{(betAmount * currentMultiplier).toFixed(2)}</span>
                    </button>
                 </div>
            </div>
        </div>
    );
};

export default DragonTower;
