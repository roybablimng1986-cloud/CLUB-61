import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, Leaf, Droplets, Skull, Settings, Volume2, VolumeX, HelpCircle, 
  Zap, Plus, Minus, RotateCcw, Wallet, X, ChevronLeft, Play, Square
} from 'lucide-react';
import { updateBalance, playSound as playServiceSound, addGameHistory, getMuteStatus, toggleMute, shouldForceLoss } from '../services/supabaseService';
import { GameResult } from '../types';
import VortexResultPopup from '../components/VortexResultPopup';

interface Props {
  onBack: () => void;
  userBalance: number;
  onResult: (r: GameResult) => void;
}

const MULTIPLIERS = { fire: 1.2, earth: 1.1, water: 1.05 };

const RING_ITEMS = {
    outer: [
        { type: 'icon', value: 'fire', angle: 0 },
        { type: 'text', value: '1.2X', angle: 24 },
        { type: 'text', value: '2.5X', angle: 48 },
        { type: 'text', value: '1.8X', angle: 72 },
        { type: 'text', value: '3.5X', angle: 96 },
        { type: 'text', value: '5.0X', angle: 120 },
        { type: 'text', value: '2.8X', angle: 144 },
        { type: 'text', value: '1.5X', angle: 168 },
        { type: 'text', value: '2.0X', angle: 192 },
        { type: 'text', value: '3.2X', angle: 216 },
        { type: 'text', value: '6.5X', angle: 240 },
        { type: 'text', value: '8.0X', angle: 264 },
        { type: 'text', value: '4.2X', angle: 288 },
        { type: 'text', value: '12.0X', angle: 312 },
        { type: 'text', value: 'BONUS', angle: 336, info: true }
    ],
    middle: [
        { type: 'icon', value: 'earth', angle: 0 },
        { type: 'text', value: '1.1X', angle: 40 },
        { type: 'text', value: '1.6X', angle: 80 },
        { type: 'text', value: '1.3X', angle: 120 },
        { type: 'text', value: '2.0X', angle: 160 },
        { type: 'text', value: '2.8X', angle: 200 },
        { type: 'text', value: '5.0X', angle: 240 },
        { type: 'text', value: '3.5X', angle: 280 },
        { type: 'text', value: '+2.2X', angle: 320 }
    ],
    inner: [
        { type: 'icon', value: 'water', angle: 0 },
        { type: 'text', value: '1.05X', angle: 60 },
        { type: 'text', value: '1.8X', angle: 180 },
        { type: 'text', value: '+1.2X', angle: 300 }
    ]
};

// Segment counts for each circle match the visual counts
const SEGMENTS = {
    fire: 15,
    earth: 9,
    water: 4
};

const SPIN_SYMBOLS = ['fire', 'earth', 'water', 'skull', 'wind', 'fire', 'earth', 'water', 'skull', 'wind'];

const getRingMultiplier = (type: 'fire' | 'earth' | 'water', progress: number): number => {
    if (progress <= 0) return 0;
    const items = type === 'fire' ? RING_ITEMS.outer : (type === 'earth' ? RING_ITEMS.middle : RING_ITEMS.inner);
    const itemIndex = Math.min(progress, items.length - 1);
    const item = items[itemIndex];
    if (!item || item.type !== 'text') return 0;
    
    const valStr = item.value;
    if (valStr === 'BONUS') return 15; // BONUS is 15X now
    const num = parseFloat(valStr.replace(/[X+]/g, ''));
    return isNaN(num) ? 0 : num;
};

const calculateTotalPayout = (prog: { fire: number, earth: number, water: number }, bet: number): number => {
    let totalMult = 0;
    totalMult += getRingMultiplier('fire', prog.fire);
    totalMult += getRingMultiplier('earth', prog.earth);
    totalMult += getRingMultiplier('water', prog.water);
    return bet * totalMult;
};

const Vortex: React.FC<Props> = ({ onBack, userBalance, onResult }) => {
    const [betAmount, setBetAmount] = useState(10);
    const [payout, setPayout] = useState(0);
    const [partPayoutCollected, setPartPayoutCollected] = useState(0);
    const [gameState, setGameState] = useState<'intro' | 'idle' | 'spinning' | 'loss'>('intro');
    const [progress, setProgress] = useState({ fire: 0, earth: 0, water: 0 });
    const [activeElement, setActiveElement] = useState<string>('water');
    const [showPayoutPopup, setShowPayoutPopup] = useState(false);
    const [winMultiplier, setWinMultiplier] = useState(0);
    const [spinIndex, setSpinIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(getMuteStatus());
    const [showHelp, setShowHelp] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isAutoSpin, setIsAutoSpin] = useState(false);
    
    const [popupResult, setPopupResult] = useState<{win: boolean, amount: number, multiplier: number} | null>(null);

    // Sync Refs to resolve stale closures entirely
    const userBalanceRef = useRef(userBalance);
    const betAmountRef = useRef(betAmount);
    const progressRef = useRef(progress);
    const payoutRef = useRef(payout);
    const partPayoutCollectedRef = useRef(partPayoutCollected);
    const gameStateRef = useRef(gameState);
    const isAutoSpinRef = useRef(isAutoSpin);

    useEffect(() => { userBalanceRef.current = userBalance; }, [userBalance]);
    useEffect(() => { betAmountRef.current = betAmount; }, [betAmount]);
    useEffect(() => { progressRef.current = progress; }, [progress]);
    useEffect(() => { payoutRef.current = payout; }, [payout]);
    useEffect(() => { partPayoutCollectedRef.current = partPayoutCollected; }, [partPayoutCollected]);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    useEffect(() => { isAutoSpinRef.current = isAutoSpin; }, [isAutoSpin]);

    const playSound = useCallback((type: string) => {
        if (isMuted) return;
        
        if (type === 'spin') playServiceSound('wingo_tick');
        else if (type === 'tick') playServiceSound('wingo_tick');
        else if (type === 'win') playServiceSound('win_popup');
        else if (type === 'loss') playServiceSound('loss_popup');
        else if (type === 'click') playServiceSound('wingo_tick');
        else if (type === 'skull') playServiceSound('loss_popup');
        else if (type === 'cashout') playServiceSound('cash_out');
        
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            
            switch (type) {
            case 'cashout':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, context.currentTime); // C5
                osc.frequency.setValueAtTime(659.25, context.currentTime + 0.08); // E5
                osc.frequency.setValueAtTime(783.99, context.currentTime + 0.16); // G5
                osc.frequency.setValueAtTime(1046.50, context.currentTime + 0.24); // C6
                gain.gain.setValueAtTime(0.08, context.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45);
                break;
            case 'fire':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, context.currentTime);
                osc.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.1);
                gain.gain.setValueAtTime(0.04, context.currentTime);
                break;
            case 'earth':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(220, context.currentTime);
                osc.frequency.exponentialRampToValueAtTime(330, context.currentTime + 0.15);
                gain.gain.setValueAtTime(0.05, context.currentTime);
                break;
            case 'water':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(660, context.currentTime);
                osc.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.1);
                gain.gain.setValueAtTime(0.03, context.currentTime);
                break;
            case 'wind':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, context.currentTime);
                osc.frequency.exponentialRampToValueAtTime(800, context.currentTime + 0.4);
                gain.gain.setValueAtTime(0.02, context.currentTime);
                break;
            }
            osc.start();
            osc.stop(context.currentTime + 0.6);
        } catch (e) {
            console.warn("Synth audio failed", e);
        }
    }, [isMuted]);

    const handleCashOut = useCallback((isAuto = false) => {
        const finalPrize = payoutRef.current + partPayoutCollectedRef.current;
        if (finalPrize <= 0) return;
        
        updateBalance(finalPrize, 'WIN', 'VORTEX');
        addGameHistory('VORTEX', betAmountRef.current, finalPrize, `Won at ${(finalPrize / betAmountRef.current).toFixed(2)}x`);
        
        setWinMultiplier(finalPrize / betAmountRef.current);
        setPopupResult({ win: true, amount: finalPrize, multiplier: finalPrize / betAmountRef.current });
        setPartPayoutCollected(0);
        setPayout(0);
        setProgress({ fire: 0, earth: 0, water: 0 });
        setShowPayoutPopup(true);
        setTimeout(() => {
            setShowPayoutPopup(false);
            setPopupResult(null);
        }, 3000);
        playSound('cashout');
        
        setIsAutoSpin(false);
        setGameState('idle');
    }, [playSound]);

    const handleSpinLogic = useCallback(async () => {
        const isRestarting = payoutRef.current === 0 && progressRef.current.fire === 0 && progressRef.current.earth === 0 && progressRef.current.water === 0;
        
        if (isRestarting) {
            if (userBalanceRef.current < betAmountRef.current) {
                setIsAutoSpin(false);
                setGameState('idle');
                alert("Insufficient Balance!");
                return false;
            }
            updateBalance(-betAmountRef.current, 'BET', 'VORTEX');
            playSound('spin');
        }

        // Check for admin manual results overrides
        let overrideValue = null;
        try {
            const overrideRes = await fetch('/api/admin/overrides');
            if (overrideRes.ok) {
                const overrideData = await overrideRes.json();
                const vOverride = overrideData?.vortex || overrideData?.GAME_VORTEX;
                if (vOverride?.result !== undefined && vOverride?.result !== null) {
                    overrideValue = String(vOverride.result).toUpperCase();
                    // Clear the override so it only applies once
                    await fetch('/api/admin/override', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ gameId: 'vortex', result: null })
                    });
                }
            }
        } catch (e) {
            console.error("Failed to fetch Vortex override:", e);
        }

        if (overrideValue !== null) {
            if (overrideValue === '0X' || overrideValue === 'SKULL' || overrideValue === 'LOSS') {
                setActiveElement('skull');
                setGameState('loss');
                setPopupResult({ win: false, amount: 0, multiplier: 0 });
                setPayout(0);
                setProgress({ fire: 0, earth: 0, water: 0 });
                playSound('skull');
                setIsAutoSpin(false);
                setTimeout(() => setPopupResult(null), 2000);
                return true;
            } else {
                // Force target progress representing chosen multiplier override:
                // Choices: '200X', '85X', '50X', '28X', '12X', '7X', '3X', '0X'
                let targetProgress = { fire: 1, earth: 0, water: 0 };
                let hitType: 'fire' | 'earth' | 'water' = 'fire';

                if (overrideValue === '200X' || overrideValue === '200') {
                    targetProgress = { fire: 13, earth: 0, water: 0 };
                    hitType = 'fire';
                } else if (overrideValue === '85X' || overrideValue === '85') {
                    targetProgress = { fire: 10, earth: 0, water: 0 };
                    hitType = 'fire';
                } else if (overrideValue === '50X' || overrideValue === '50' || overrideValue === '52X' || overrideValue === '52') {
                    targetProgress = { fire: 5, earth: 0, water: 0 };
                    hitType = 'fire';
                } else if (overrideValue === '28X' || overrideValue === '28') {
                    targetProgress = { fire: 4, earth: 0, water: 0 };
                    hitType = 'fire';
                } else if (overrideValue === '12X' || overrideValue === '12' || overrideValue === '12.5X' || overrideValue === '12.5') {
                    targetProgress = { fire: 2, earth: 0, water: 0 };
                    hitType = 'fire';
                } else if (overrideValue === '7X' || overrideValue === '7' || overrideValue === '7.7X' || overrideValue === '7.7') {
                    targetProgress = { fire: 3, earth: 0, water: 0 };
                    hitType = 'fire';
                } else if (overrideValue === '3X' || overrideValue === '3' || overrideValue === '3.9X' || overrideValue === '3.9') {
                    targetProgress = { fire: 1, earth: 0, water: 0 };
                    hitType = 'fire';
                }

                setActiveElement(hitType);
                playSound(hitType);
                setProgress(targetProgress);

                const newPayoutVal = Math.max(0, calculateTotalPayout(targetProgress, betAmountRef.current) - partPayoutCollectedRef.current);
                setPayout(newPayoutVal);
                setGameState('idle');
                return true;
            }
        }

        const rand = Math.random();
        
        // Rigging check
        const isHouseEdgeTick = Math.random() < 0.08;
        if (isHouseEdgeTick && shouldForceLoss(payoutRef.current || betAmountRef.current, userBalanceRef.current, 'VORTEX')) {
            setActiveElement('skull');
            setGameState('loss');
            setPopupResult({ win: false, amount: 0, multiplier: 0 });
            setPayout(0);
            setProgress({ fire: 0, earth: 0, water: 0 });
            playSound('skull');
            setIsAutoSpin(false);
            setTimeout(() => setPopupResult(null), 2000);
            return true;
        }

        const SKULL_PROB = 0.09; 
        const WIND_PROB = 0.12;

        if (rand < SKULL_PROB) {
            setActiveElement('skull');
            setGameState('loss');
            setPopupResult({ win: false, amount: 0, multiplier: 0 });
            setPayout(0);
            setProgress({ fire: 0, earth: 0, water: 0 });
            playSound('skull');
            setIsAutoSpin(false);
            setTimeout(() => setPopupResult(null), 2000);
        } else if (rand < SKULL_PROB + WIND_PROB) {
            setActiveElement('wind');
            playSound('wind');
            setProgress(prev => {
                const types: ('fire' | 'earth' | 'water')[] = ['fire', 'earth', 'water'];
                const maxVal = Math.max(prev.fire, prev.earth, prev.water);
                if (maxVal === 0) return prev;
                const typeToDecrease = types.find(t => prev[t] === maxVal);
                if (typeToDecrease) {
                    const newState = { ...prev, [typeToDecrease]: Math.max(0, prev[typeToDecrease] - 1) }; 
                    const newPayoutVal = Math.max(0, calculateTotalPayout(newState, betAmountRef.current) - partPayoutCollectedRef.current);
                    setPayout(newPayoutVal);
                    return newState;
                }
                return prev;
            });
            setGameState('idle');
        } else {
            // Equal distribution among water, earth, fire
            const weights = Math.random();
            const hitType: 'fire' | 'earth' | 'water' = weights < 0.5 ? 'water' : (weights < 0.85 ? 'earth' : 'fire');
            
            setActiveElement(hitType);
            playSound(hitType);
            
            setProgress(prev => {
                const currentProgress = prev[hitType];
                const limit = SEGMENTS[hitType];
                
                if (currentProgress < limit) {
                    const next = { ...prev, [hitType]: currentProgress + 1 };
                    const newPayoutVal = Math.max(0, calculateTotalPayout(next, betAmountRef.current) - partPayoutCollectedRef.current);
                    setPayout(newPayoutVal);

                    // Only auto cash out if ALL rings are fully filled
                    if (next.fire === SEGMENTS.fire && next.earth === SEGMENTS.earth && next.water === SEGMENTS.water) {
                        setTimeout(() => {
                            handleCashOut(true);
                        }, 500);
                    }
                    return next;
                }
                return prev;
            });
            setGameState('idle');
        }
        return true;
    }, [playSound, handleCashOut]);

    // Single click spin with precise animation
    const triggerSpinOnce = () => {
        if (gameState === 'spinning') return;
        
        // Balance check for start
        const isRestarting = payout === 0 && progress.fire === 0 && progress.earth === 0 && progress.water === 0;
        if (isRestarting && userBalance < betAmount) {
            alert("Insufficient Balance!");
            return;
        }

        setGameState('spinning');
        
        // Fast rolling visual effect for central symbol
        let ticks = 0;
        const rollTimer = setInterval(() => {
            setSpinIndex(prev => (prev + 1) % SPIN_SYMBOLS.length);
            playSound('tick');
            ticks++;
            
            if (ticks >= 15) {
                clearInterval(rollTimer);
                // Resolve spin outcome
                handleSpinLogic();
            }
        }, 60);
    };

    // Auto spin handling
    useEffect(() => {
        let autoTimer: any = null;
        if (isAutoSpin && gameState === 'idle') {
            autoTimer = setTimeout(() => {
                triggerSpinOnce();
            }, 1000);
        }
        return () => clearTimeout(autoTimer);
    }, [isAutoSpin, gameState]);

    const handlePartPayout = () => {
        if (payout === 0) return;
        const half = payout / 2;
        updateBalance(half, 'WIN', 'VORTEX PARTIAL');
        setPartPayoutCollected(p => p + half);
        setPayout(prev => prev - half);
        playSound('win');
    };

    const renderIcon = (type: string, size = 24, glow = true) => {
        switch (type) {
            case 'fire':
                return (
                    <div className={`rounded-full bg-gradient-to-tr from-red-600 via-orange-500 to-yellow-300 p-[1.5px] ${glow ? 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' : ''}`} style={{ width: size, height: size }}>
                        <div className="w-full h-full rounded-full bg-[#0a0c10] flex items-center justify-center relative overflow-hidden">
                            <Flame size={size * 0.7} className="text-orange-500 fill-orange-500/80 drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]" />
                        </div>
                    </div>
                );
            case 'earth':
                return (
                    <div className={`rounded-full bg-gradient-to-tr from-green-700 via-emerald-500 to-green-300 p-[1.5px] ${glow ? 'shadow-[0_0_20px_rgba(34,197,94,0.6)]' : ''}`} style={{ width: size, height: size }}>
                        <div className="w-full h-full rounded-full bg-[#0a0c10] flex items-center justify-center relative overflow-hidden">
                            <Zap size={size * 0.6} className="text-emerald-400 fill-emerald-400/80 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
                        </div>
                    </div>
                );
            case 'water':
                return (
                    <div className={`rounded-full bg-gradient-to-tr from-blue-700 via-sky-500 to-cyan-300 p-[1.5px] ${glow ? 'shadow-[0_0_20px_rgba(59,130,246,0.6)]' : ''}`} style={{ width: size, height: size }}>
                        <div className="w-full h-full rounded-full bg-[#0a0c10] flex items-center justify-center relative overflow-hidden">
                            <Droplets size={size * 0.65} className="text-sky-400 fill-sky-400/80 drop-shadow-[0_0_5px_rgba(56,189,248,0.8)]" />
                        </div>
                    </div>
                );
            case 'wind':
                return <div className="animate-spin" style={{ width: size, height: size }}><RotateCcw size={size} className="text-white opacity-50" /></div>;
            case 'skull':
                return (
                    <div className={`rounded-full bg-gradient-to-tr from-gray-700 via-yellow-900 to-gray-400 p-[2px] shadow-2xl`} style={{ width: size, height: size }}>
                        <div className="w-full h-full rounded-full bg-[#0a0c10] flex items-center justify-center relative overflow-hidden">
                            <Skull size={size * 0.7} className="text-red-500 fill-red-500/40 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    if (gameState === 'intro') {
        return (
            <div className="fixed inset-0 z-50 bg-[#0c0d12] flex flex-col p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-12">
                    <button onClick={onBack} className="flex items-center gap-1 text-gray-500 font-bold"><ChevronLeft size={20}/> Back</button>
                    <button onClick={() => setGameState('idle')} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-black text-sm uppercase shadow-lg">GO TO GAME</button>
                </div>
                <div className="max-w-md mx-auto flex flex-col items-center flex-1">
                    <h1 className="text-3xl font-black mb-16 text-center tracking-tight text-white italic uppercase">How to play?</h1>
                    <div className="space-y-12 w-full">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-[#161722] rounded-full flex items-center justify-center ring-2 ring-purple-500/10">
                                <RotateCcw className="text-white animate-spin" size={28} />
                            </div>
                            <p className="text-sm text-gray-400 font-black uppercase tracking-wider leading-relaxed">Spin the wheel and accumulate multipliers of Fire, Earth, and Water.</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex gap-2">
                                <div className="w-14 h-14 bg-[#161722] rounded-full flex items-center justify-center border border-white/5 text-[9px] font-black tracking-widest text-center shadow-inner text-gray-400 italic">CASH<br/>OUT</div>
                                <div className="w-14 h-14 bg-[#161722] rounded-full flex items-center justify-center border border-white/5 shadow-xl"><RotateCcw size={20} className="text-gray-500" /></div>
                            </div>
                            <p className="text-sm text-gray-400 font-black uppercase tracking-wider leading-relaxed">Hit "Cash Out" to claim, or "Part Payout" to take half and keep elements rolling.</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="relative w-16 h-16">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="32" cy="32" r="28" fill="none" stroke="#ef4444" strokeWidth="6" strokeDasharray="176" strokeLinecap="round" opacity="0.3" />
                                    <circle cx="32" cy="32" r="28" fill="none" stroke="#ef4444" strokeWidth="6" strokeDasharray="140 176" strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center transform rotate-90">
                                    <div className="text-[8px] font-black text-center text-white italic">BONUS</div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-400 font-black uppercase tracking-wider leading-relaxed">Fill any ring's segments completely to trigger an automatic jackpot Cash Out!</p>
                        </div>
                    </div>
                    <button onClick={() => setGameState('idle')} className="mt-auto mb-10 w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xl rounded-full border-t-2 border-white/20 active:translate-y-1 transition-all uppercase tracking-[0.2em] shadow-2xl">Let's Go!</button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full bg-[#08090d] text-white flex flex-col items-center pb-6 scroll-smooth min-h-screen overflow-hidden overflow-y-auto">
            <header className="w-full max-w-lg flex items-center justify-between px-6 py-4 z-50 bg-[#0c0d12]/90 backdrop-blur-md sticky top-0 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2.5 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all border border-white/5 text-gray-400 hover:text-white">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="flex flex-col">
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 italic">Vortex Wallet</div>
                        <div className="flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-xl border border-white/10 shadow-inner">
                            <Wallet size={12} className="text-yellow-500" />
                            <span className="text-sm font-black font-mono text-yellow-400">
                                ₹{userBalance.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { playSound('click'); setShowHelp(true); }} className="p-2 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10 text-gray-500 hover:text-white">
                        <HelpCircle size={18} />
                    </button>
                    <button onClick={() => { playSound('click'); setIsMuted(toggleMute()); }} className="p-2 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10 text-gray-400 hover:text-white">
                        {isMuted ? <VolumeX size={18} className="opacity-30" /> : <Volume2 size={18} />}
                    </button>
                    <button onClick={() => { playSound('click'); setShowSettings(true); }} className="p-2 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10 text-gray-500 hover:text-white">
                        <Settings size={18} />
                    </button>
                </div>
            </header>

            <div className="mt-4 mb-2 relative flex flex-col items-center select-none z-10 scale-75 sm:scale-90 md:scale-100 transition-transform origin-top">
                <h1 className="text-5xl font-black italic tracking-tighter text-white uppercase drop-shadow-[0_0_20px_rgba(147,51,234,0.5)] leading-none">VORTEX ELITE</h1>
                <div className="text-[9px] font-black tracking-[0.4em] text-purple-500 uppercase leading-none mt-1 ml-16 italic opacity-80">Official Game</div>
            </div>

            {/* Circular Wheels Display */}
            <div className="relative flex-shrink-0 w-full flex items-center justify-center p-2 mb-4">
                <div className="relative w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] md:w-[460px] md:h-[460px] flex items-center justify-center origin-center transition-all">
                    <div className="absolute w-[460px] h-[460px] scale-[0.73] sm:scale-[0.82] md:scale-100 flex items-center justify-center transition-transform">
                        {[1, 0.72, 0.44].map((scale, idx) => {
                            const types: ('fire' | 'earth' | 'water')[] = ['fire', 'earth', 'water'];
                            const type = types[idx];
                            const currentProgress = progress[type];
                            const limit = SEGMENTS[type];
                            const strokeWidth = 24;
                            const radius = idx === 0 ? 180 : (idx === 1 ? 130 : 80);
                            const circumference = 2 * Math.PI * radius;
                            const progressValue = (currentProgress / limit) * circumference;
                            const color = idx === 0 ? "#ef4444" : (idx === 1 ? "#10b981" : "#3b82f6");
                            const labels = idx === 0 ? RING_ITEMS.outer : (idx === 1 ? RING_ITEMS.middle : RING_ITEMS.inner);
                            const totalSize = 460;
                            const marginTopVal = idx === 0 ? 38 : (idx === 1 ? 88 : 138);

                            return (
                                <div 
                                    key={idx} 
                                    className={`absolute flex items-center justify-center rounded-full ${
                                        gameState === 'spinning' 
                                            ? (idx === 0 
                                                ? 'animate-[spin_3s_linear_infinite]' 
                                                : idx === 1 
                                                    ? 'animate-[spin_2.5s_linear_infinite_reverse]' 
                                                    : 'animate-[spin_2s_linear_infinite]') 
                                            : 'transition-transform duration-500'
                                    }`} 
                                    style={{ width: totalSize, height: totalSize }}
                                >
                                    <svg className="absolute inset-0 transform -rotate-90 pointer-events-none" viewBox={`0 0 ${totalSize} ${totalSize}`}>
                                        <circle cx={totalSize/2} cy={totalSize/2} r={radius} fill="none" stroke="#0a0c10" strokeWidth={strokeWidth} />
                                        <circle 
                                            cx={totalSize/2} cy={totalSize/2} r={radius} 
                                            fill="none" stroke={color} strokeWidth={strokeWidth}
                                            strokeDasharray={`${progressValue} ${circumference}`}
                                            strokeLinecap="round"
                                            style={{ filter: `drop-shadow(0 0 12px ${color}bb)`, transition: 'stroke-dasharray 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                                            opacity={currentProgress > 0 ? 1 : 0}
                                        />
                                    </svg>
                                    {labels.map((item, lidx) => (
                                        <div key={lidx} className="absolute inset-0 flex items-start justify-center pointer-events-none" style={{ transform: `rotate(${item.angle}deg)` }}>
                                            <div className="flex flex-col items-center" style={{ marginTop: `${marginTopVal}px` }}>
                                                {item.type === 'icon' ? (
                                                    <div className="mb-0.5">{renderIcon(type, idx === 0 ? 16 : (idx === 1 ? 14 : 12))}</div>
                                                ) : (
                                                    <span className={`text-[10px] font-black italic drop-shadow-md tracking-tighter ${currentProgress > 0 && (lidx <= currentProgress) ? 'text-white' : 'text-white/15'}`}>
                                                        {item.value}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>

                    {/* Central rolling segment */}
                    <div className={`absolute w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full bg-[#0a0c10] border-[6px] sm:border-[10px] border-[#181922] shadow-[inset_0_10px_25px_rgba(0,0,0,1),0_0_60px_rgba(147,51,234,0.4)] flex items-center justify-center overflow-hidden z-30 transition-all duration-300 ${gameState === 'spinning' ? 'scale-110 shadow-[0_0_80px_rgba(147,51,234,0.6)]' : ''}`}>
                        <AnimatePresence mode="wait">
                            {gameState === 'spinning' ? (
                                <motion.div 
                                    key="spinning-center" 
                                    initial={{ y: -250, rotate: 0 }} 
                                    animate={{ y: 0, rotate: 360 }} 
                                    transition={{ 
                                        y: { duration: 0.12, repeat: Infinity, ease: "linear" },
                                        rotate: { duration: 0.6, repeat: Infinity, ease: "linear" }
                                    }} 
                                    className="flex flex-col items-center justify-center gap-16 blur-[1px] opacity-95"
                                >
                                    {renderIcon(SPIN_SYMBOLS[spinIndex % SPIN_SYMBOLS.length], 85, false)}
                                    {renderIcon(SPIN_SYMBOLS[(spinIndex + 1) % SPIN_SYMBOLS.length], 85, false)}
                                    {renderIcon(SPIN_SYMBOLS[(spinIndex + 2) % SPIN_SYMBOLS.length], 85, false)}
                                </motion.div>
                            ) : gameState === 'loss' ? (
                                <motion.div key="skull" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1.2, rotate: 0 }} exit={{ scale: 0 }} className="relative z-10 flex items-center justify-center">
                                    {renderIcon('skull', 120, true)}
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key={activeElement} 
                                    initial={{ opacity: 0, scale: 0.4, rotate: -90 }} 
                                    animate={{ opacity: 1, scale: 1, rotate: 0 }} 
                                    exit={{ opacity: 0, scale: 2, rotate: 90 }} 
                                    className="flex items-center justify-center w-full h-full relative"
                                >
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <div className={`absolute inset-0 blur-[30px] opacity-25 rounded-full ${activeElement === 'fire' ? 'bg-red-500' : (activeElement === 'earth' ? 'bg-green-500' : (activeElement === 'water' ? 'bg-blue-500' : 'bg-gray-500'))}`}></div>
                                        {renderIcon(activeElement, 105, true)}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Custom Control Bar footer - perfectly designed */}
            <footer className="w-full max-w-md mx-auto px-4 pb-6 z-30 mt-auto scale-95 transition-transform">
                <div className="bg-[#151620] rounded-[2.5rem] p-4 sm:p-5 shadow-2xl border border-white/5 space-y-4">
                    {/* Compact input and output blocks */}
                    <div className="flex items-center justify-between bg-black/40 rounded-3xl p-3 border border-white/5 relative shadow-inner">
                        {/* Stake selector */}
                        <div className="flex flex-col flex-1 items-center">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1.5 italic">BET AMOUNT</span>
                            <div className="flex items-center justify-center gap-2.5 w-full">
                                <button 
                                    onClick={() => { playSound('click'); setBetAmount(p => Math.max(10, p - 10)); }} 
                                    disabled={gameState === 'spinning'}
                                    className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-white/5 active:scale-90 transition-all text-purple-400 disabled:opacity-30"
                                >
                                    <Minus size={14} />
                                </button>
                                
                                <div className="bg-black/40 rounded-lg px-2 py-1.5 border border-white/5 shadow-inner">
                                    <input 
                                        type="number" 
                                        value={betAmount} 
                                        readOnly
                                        className="w-14 bg-transparent text-center text-lg font-black italic text-white outline-none font-mono" 
                                    />
                                </div>
                                
                                <button 
                                    onClick={() => { playSound('click'); setBetAmount(p => p + 10); }} 
                                    disabled={gameState === 'spinning'}
                                    className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-white/5 active:scale-90 transition-all text-purple-400 disabled:opacity-30"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                            
                            {/* Preset quick bet selection tiles */}
                            <div className="flex gap-1 mt-2">
                                {[10, 50, 100, 500].map(val => (
                                    <button 
                                        key={val} 
                                        onClick={() => { playSound('click'); setBetAmount(val); }}
                                        disabled={gameState === 'spinning'}
                                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all ${
                                            betAmount === val 
                                            ? 'bg-purple-600 border-purple-500 text-white' 
                                            : 'bg-zinc-900 border-transparent text-gray-400'
                                        }`}
                                    >
                                        ₹{val}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-[1px] h-12 bg-white/10 mx-2"></div>

                        {/* Payout Area */}
                        <div className="flex flex-col items-center flex-1 overflow-hidden">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] italic mb-1.5">PAYOUT MULTI</span>
                            <div className="flex flex-col items-center">
                                <span className={`text-xl sm:text-2xl font-black italic transition-all duration-300 truncate max-w-full ${payout > 0 ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'text-white/10'}`}>
                                    ₹{payout.toFixed(1)}
                                </span>
                                {payout > 0 && (
                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest font-mono mt-0.5">
                                        +{(payout / betAmount).toFixed(2)}X
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Operational controls */}
                    <div className="flex items-center justify-between gap-3 h-28">
                        {/* Cashout */}
                        <button 
                            disabled={payout === 0 || gameState === 'spinning'} 
                            onClick={() => handleCashOut()} 
                            className={`flex-1 h-full rounded-2xl flex flex-col items-center justify-center border-b-4 active:scale-95 active:border-b-0 transition-all ${
                                payout > 0 && gameState !== 'spinning'
                                ? 'bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-900 shadow-xl text-white' 
                                : 'bg-zinc-800/20 border-transparent opacity-10 pointer-events-none'
                            }`}
                        >
                            <span className="text-xs font-black uppercase italic tracking-widest text-center leading-none mb-1">CASH OUT</span>
                            {payout > 0 && <span className="text-xs font-mono">₹{payout.toFixed(1)}</span>}
                        </button>

                        {/* Central SPIN once / holding */}
                        <div className="flex flex-col items-center gap-1">
                            <button 
                                onClick={triggerSpinOnce} 
                                disabled={gameState === 'spinning'}
                                className={`w-20 h-20 rounded-full p-1.5 bg-gradient-to-tr from-purple-800 via-fuchsia-600 to-purple-400 active:scale-95 transition-all shadow-[0_0_40px_rgba(147,51,234,0.4)] ${gameState === 'spinning' ? 'animate-pulse opacity-50' : ''}`}
                            >
                                <div className="w-full h-full rounded-full bg-[#0a0b10] border-2 border-white/10 flex flex-col items-center justify-center relative shadow-inner">
                                    <RotateCcw size={28} className={`text-white opacity-90 ${gameState === 'spinning' ? 'animate-spin' : ''}`} />
                                    <span className="text-[7px] font-black text-white/30 tracking-widest uppercase mt-0.5">SPIN</span>
                                </div>
                            </button>
                            
                            {/* Auto spin toggle */}
                            <button 
                                onClick={() => setIsAutoSpin(!isAutoSpin)}
                                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${
                                    isAutoSpin ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-zinc-900 text-zinc-500'
                                }`}
                            >
                                {isAutoSpin ? 'STOP AUTO' : 'AUTO SPIN'}
                            </button>
                        </div>

                        {/* Part payout */}
                        <button 
                            disabled={payout === 0 || gameState === 'spinning'} 
                            onClick={handlePartPayout} 
                            className={`flex-1 h-full rounded-2xl flex flex-col items-center justify-center border-b-4 active:scale-95 active:border-b-0 transition-all ${
                                payout > 0 && gameState !== 'spinning'
                                ? 'bg-[#2a2e38] border-zinc-700 shadow-xl text-white' 
                                : 'bg-zinc-800/20 border-transparent opacity-10 pointer-events-none'
                            }`}
                        >
                            <RotateCcw size={18} className="text-white opacity-60 mb-1" />
                            <span className="text-[9px] font-black uppercase text-white/75 italic tracking-widest text-center leading-none">PART PAYOUT</span>
                        </button>
                    </div>
                </div>
            </footer>

            <AnimatePresence>
                {showHelp && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
                        <div className="flex justify-between items-center mb-8"><button onClick={() => setShowHelp(false)} className="flex items-center gap-1 text-gray-400 font-bold hover:text-white border-none"><ChevronLeft size={20}/> Back</button></div>
                        <div className="max-w-md mx-auto flex flex-col items-center">
                            <h2 className="text-3xl font-black mb-12 text-center tracking-tight text-white italic">Game Mechanics</h2>
                            <div className="space-y-10 w-full">
                                <div className="flex items-center gap-6"><div className="w-16 h-16 bg-[#161722] rounded-full flex items-center justify-center ring-2 ring-purple-500/10"><RotateCcw className="text-white animate-spin" size={28} /></div><p className="text-sm text-gray-400 font-bold uppercase leading-tight italic">Click Spin to roll. Element hits fill the corresponding progress ring.</p></div>
                                <div className="flex items-center gap-6"><div className="w-16 h-16 bg-[#161722] rounded-full flex items-center justify-center border border-white/5 text-orange-500">{renderIcon('fire', 32)}</div><p className="text-sm text-gray-400 font-bold uppercase leading-tight italic">Fire elements give the highest multipliers but are the rarest.</p></div>
                                <div className="flex items-center gap-6"><div className="w-16 h-16 bg-[#161722] rounded-full flex items-center justify-center border border-white/5 text-red-500">{renderIcon('skull', 32)}</div><p className="text-sm text-gray-400 font-bold uppercase leading-tight italic">Beware the skull. It zeros your progress and payout immediately.</p></div>
                            </div>
                            <button onClick={() => setShowHelp(false)} className="mt-16 w-full py-4 bg-purple-600 text-white font-black text-xl rounded-xl uppercase tracking-[0.2em] shadow-lg">I got it!</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSettings && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-6">
                        <div className="bg-[#161722] w-full max-w-xs rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                            <h2 className="text-xl font-black text-white italic mb-8 uppercase tracking-widest">Settings</h2>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex flex-col"><span className="text-xs font-black text-white/40 uppercase tracking-widest italic">Sounds</span><span className="text-xs text-gray-400 font-bold">{isMuted ? "Disabled" : "Enabled"}</span></div>
                                    <button onClick={() => setIsMuted(toggleMute())} className={`w-12 h-6 rounded-full transition-colors relative ${isMuted ? 'bg-gray-800' : 'bg-purple-600'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isMuted ? 'left-1' : 'left-7'}`} /></button>
                                </div>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="mt-8 w-full py-4 bg-zinc-900 text-white font-black rounded-2xl uppercase tracking-widest text-xs">Close</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showPayoutPopup && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, y: -250 }} exit={{ opacity: 0, scale: 1.5, y: -450 }} className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
                        <div className="bg-[#161722]/98 border-b-[8px] border-black/40 p-10 md:p-14 rounded-[3.5rem] text-center shadow-[0_60px_180px_rgba(0,0,0,1)] backdrop-blur-3xl border border-white/5">
                            <div className="text-5xl font-black text-white mb-2 italic tracking-tight drop-shadow-2xl">{winMultiplier.toFixed(2)}X</div>
                            <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-purple-500 to-transparent mx-auto mb-8 opacity-40" />
                            <div className="text-6xl font-black text-white tracking-tighter italic">₹{(winMultiplier * betAmount).toFixed(1)}</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <VortexResultPopup result={popupResult} onClose={() => setPopupResult(null)} />
        </div>
    );
};

export default Vortex;
