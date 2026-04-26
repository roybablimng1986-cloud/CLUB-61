
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, HelpCircle, Timer, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, db, auth, getClockOffset, addGameBet } from '../services/supabaseService';
import { GameResult, JhandiMundaState } from '../types';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, where, addDoc } from 'firebase/firestore';

import { useStabilizedTimer } from '../hooks/useTimer';
import HowToPlay from '../components/HowToPlay';

const SYMBOLS = ['Heart', 'Spade', 'Diamond', 'Club', 'Face', 'Flag'];
const SYMBOL_ICONS = {
    Heart: '❤️',
    Spade: '♠️',
    Diamond: '💎',
    Club: '♣️',
    Face: '🤴',
    Flag: '🚩'
};

const JhandiMunda: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [gameState, setGameState] = useState<JhandiMundaState | null>(null);
    const [betAmount, setBetAmount] = useState(10);
    const [myBets, setMyBets] = useState<any[]>([]);
    const [allBets, setAllBets] = useState<any[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [floating, setFloating] = useState<{ text: string; color: string; id: number } | null>(null);
    const [isBettingLocked, setIsBettingLocked] = useState(false);

    const timeLeft = useStabilizedTimer(gameState?.endTime);
    
    const isMounted = useRef(true);
    const resultHandledRef = useRef<string | null>(null);
    const allBetsRef = useRef<any[]>([]);
    useEffect(() => { allBetsRef.current = allBets; }, [allBets]);

    useEffect(() => {
        isMounted.current = true;
        
        const q = query(collection(db, 'jhandi_munda_state'), orderBy('period', 'desc'), limit(1));
        const unsubState = onSnapshot(q, (snap) => {
            if (!isMounted.current || snap.empty) return;
            const state = snap.docs[0].data() as JhandiMundaState;
            setGameState(state);

            if (state.status === 'BETTING') {
                resultHandledRef.current = null;
            } else {
                setIsBettingLocked(true);
            }

            if (state.status === 'RESULT' && resultHandledRef.current !== state.period) {
                resultHandledRef.current = state.period;
                handleResultSequence(state);
            }
        });

        const bq = query(collection(db, 'jhandi_munda_bets'), orderBy('timestamp', 'desc'), limit(50));
        const unsubBets = onSnapshot(bq, (snap) => {
            const bets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllBets(bets);
            if (auth.currentUser) {
                setMyBets(bets.filter((b: any) => b.uid === auth.currentUser?.uid));
            }
        });

        return () => { isMounted.current = false; unsubState(); unsubBets(); stopAllSounds(); };
    }, []);

    useEffect(() => {
        if (gameState?.status === 'BETTING') {
            setIsBettingLocked(timeLeft <= 5);
            if (timeLeft <= 5 && timeLeft > 0) playSound('wingo_tick');
        }
    }, [timeLeft, gameState?.status]);

    function handleResultSequence(state: JhandiMundaState) {
        setIsShaking(true);
        playSound('wheel_spin');
        
        setTimeout(() => {
            if (!isMounted.current) return;
            setIsShaking(false);
            const myCurrentBets = allBetsRef.current.filter(b => b.uid === auth.currentUser?.uid);
            if (myCurrentBets.length > 0) {
                processResult(state, myCurrentBets);
            }
        }, 3000);
    }

    function processResult(state: JhandiMundaState, currentBets: any[]) {
        let totalWin = 0;
        let totalBet = 0;
        
        const counts: Record<string, number> = {};
        state.dice.forEach(s => counts[s] = (counts[s] || 0) + 1);

        currentBets.forEach(bet => {
            totalBet += bet.amount;
            const matchCount = counts[bet.symbol] || 0;
            if (matchCount >= 1) {
                // Typical Jhandi Munda payout: 
                // 1 match: stake back (or 1x? usually 1x win + stake)
                // 2 matches: 2x win + stake
                // Actually common rules: 1 match = 1x win, 2 matches = 2x win etc.
                totalWin += bet.amount + (bet.amount * matchCount);
            }
        });

        if (totalWin > 0) {
            updateBalance(totalWin, 'WIN', 'Jhandi Munda Win');
            triggerFloating(`+₹${totalWin.toFixed(2)}`, 'text-yellow-400');
        } else {
            triggerFloating(`-₹${totalBet.toFixed(2)}`, 'text-red-500');
        }

        addGameHistory('Jhandi Munda', totalBet, totalWin, `Outcome: ${state.dice.join(', ')}`);
    }

    const triggerFloating = (text: string, color: string) => {
        setFloating({ text, color, id: Date.now() });
        setTimeout(() => setFloating(null), 3000);
    };

    const handlePlaceBet = async (symbol: string) => {
        if (isBettingLocked || gameState?.status !== 'BETTING' || !auth.currentUser) return;
        if (userBalance < betAmount) { alert("Insufficient Balance"); return; }

        try {
            await addGameBet('jhandi_munda_bets', {
                amount: betAmount,
                symbol: symbol,
                period: gameState.period
            });
            await updateBalance(-betAmount, 'BET', `Jhandi Munda: ${symbol}`);
            playSound('bet_place');
        } catch (e) {}
    };

    if (!gameState) return <div className="min-h-screen bg-[#064e3b] flex items-center justify-center font-black text-white italic tracking-widest uppercase">Syncing Street Arena...</div>;

    return (
        <div className="bg-[#064e3b] min-h-screen flex flex-col font-sans text-white overflow-hidden relative select-none">
            {floating && (
                <div key={floating.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-[300] font-black text-6xl italic pointer-events-none animate-float-up ${floating.color}`} style={{ textShadow: '0 0 30px rgba(0,0,0,0.8)' }}>
                    {floating.text}
                </div>
            )}

            <HowToPlay 
                isOpen={showHelp} 
                onClose={() => setShowHelp(false)} 
                title="Jhandi Munda Rules"
                rules={[
                    "6 dice with 6 symbols are rolled.",
                    "Bet on one or more symbols.",
                    "Payout depends on how many dice land on your symbol.",
                    "1 match = 2.0x, 2 matches = 3.0x, 3 matches = 4.0x..."
                ]}
                payouts={[
                    { label: "1 Symbol Match", value: "2x" },
                    { label: "2 Symbols Match", value: "3x" },
                    { label: "3 Symbols Match", value: "4x" }
                ]}
            />

            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-black/20 border-b border-emerald-400/20 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 bg-emerald-900 rounded-xl active:scale-90"><ArrowLeft size={20}/></button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black italic text-emerald-300 tracking-widest uppercase leading-none">JHANDI MUNDA</h1>
                        <span className="text-[8px] text-emerald-400/50 mt-1 uppercase font-bold">Street Wallet</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-black/60 px-4 py-2 rounded-2xl border border-emerald-400/20 text-emerald-300 font-mono italic flex items-center gap-2">
                        <Wallet size={14} />
                        <span className="font-black">₹{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setShowHelp(true)} className="p-2 bg-emerald-400/10 text-emerald-300 rounded-xl border border-emerald-400/20 active:scale-90"><HelpCircle size={20}/></button>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center p-4 gap-6 overflow-y-auto no-scrollbar pb-80">
                
                {/* Rolling Area */}
                <div className="w-full max-w-sm aspect-video bg-emerald-950/40 rounded-[3rem] border-4 border-emerald-800/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center relative overflow-hidden shrink-0 mt-4">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                    
                    <div className={`grid grid-cols-3 gap-6 relative z-10 ${isShaking ? 'animate-shake' : ''}`}>
                        {gameState.dice.map((s, i) => (
                            <motion.div 
                                key={i} 
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-3xl"
                            >
                                {isShaking ? SYMBOL_ICONS[SYMBOLS[Math.floor(Math.random()*6)] as keyof typeof SYMBOL_ICONS] : SYMBOL_ICONS[s as keyof typeof SYMBOL_ICONS]}
                            </motion.div>
                        ))}
                    </div>

                    {gameState.status === 'BETTING' && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center">
                            <Timer size={40} className="text-emerald-400 mb-2 animate-bounce" />
                            <span className="text-4xl font-black font-mono text-emerald-400">{timeLeft}s</span>
                        </div>
                    )}
                </div>

                {/* Betting Grid */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-sm px-2 shrink-0">
                    {SYMBOLS.map(sym => (
                        <button 
                            key={sym}
                            onClick={() => handlePlaceBet(sym)}
                            disabled={isBettingLocked || gameState.status !== 'BETTING'}
                            className={`h-24 rounded-3xl bg-emerald-900/40 border-2 transition-all active:scale-95 flex flex-col items-center justify-center relative overflow-hidden ${isBettingLocked ? 'opacity-40 grayscale border-emerald-900/50' : 'border-emerald-400/30 hover:border-emerald-400'}`}
                        >
                            <span className="text-3xl mb-1">{SYMBOL_ICONS[sym as keyof typeof SYMBOL_ICONS]}</span>
                            <span className="text-[10px] font-black uppercase tracking-tighter text-emerald-300">{sym}</span>
                            {myBets.some(b => b.symbol === sym) && (
                                <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[8px] font-black px-1.5 rounded-full shadow-lg">
                                     ₹{myBets.filter(b => b.symbol === sym).reduce((acc, b) => acc + b.amount, 0)}
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Live Bets */}
                <div className="w-full mt-4 flex flex-col flex-1 min-h-[300px]">
                    <div className="flex border-b border-white/5">
                        <button className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-400 border-b-2 border-emerald-400">Public Logs ({allBets.length})</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {allBets.map((bet: any) => (
                                <motion.div 
                                    key={bet.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center text-lg">{SYMBOL_ICONS[bet.symbol as keyof typeof SYMBOL_ICONS]}</div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase">{bet.username || 'Street Gambler'}</div>
                                            <div className="text-[8px] text-zinc-500">{new Date(bet.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-black text-emerald-400">₹{bet.amount}</div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Betting Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-[#042f2e]/95 backdrop-blur-xl p-4 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-[60] border-t border-emerald-400/20 pb-8">
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 justify-center mb-2">
                    {[10, 50, 100, 500, 1000, 5000].map(amt => (
                        <button 
                            key={amt} 
                            onClick={() => setBetAmount(amt)}
                            className={`flex-shrink-0 w-14 h-14 rounded-full border-2 font-black text-[10px] transition-all flex flex-col items-center justify-center shadow-lg active:scale-90 ${betAmount === amt ? 'bg-emerald-400 text-black border-white scale-110 shadow-[0_0_15px_rgba(52,211,153,0.4)]' : 'bg-black/40 text-emerald-300 border-white/5'}`}
                        >
                            <span>₹{amt >= 1000 ? (amt/1000)+'K' : amt}</span>
                        </button>
                    ))}
                </div>
                <div className="text-center text-[8px] font-black uppercase tracking-[0.3em] text-emerald-400/50">Select Amount & Tap Symbols to Bet</div>
            </div>

            <style>{`
                @keyframes float-up {
                    0% { transform: translate(-50%, 0); opacity: 0; scale: 0.5; }
                    15% { opacity: 1; scale: 1.2; }
                    85% { opacity: 1; scale: 1.2; }
                    100% { transform: translate(-50%, -200px); opacity: 0; scale: 1.5; }
                }
                .animate-float-up { animation: float-up 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                @keyframes shake {
                    0% { transform: translate(2px, 2px) rotate(0deg); }
                    10% { transform: translate(-2px, -3px) rotate(-1deg); }
                    20% { transform: translate(-4px, 0px) rotate(1deg); }
                    30% { transform: translate(4px, 3px) rotate(0deg); }
                    40% { transform: translate(2px, -2px) rotate(1deg); }
                    50% { transform: translate(-2px, 3px) rotate(-1deg); }
                    60% { transform: translate(-4px, 2px) rotate(0deg); }
                    70% { transform: translate(4px, 2px) rotate(-1deg); }
                    80% { transform: translate(-2px, -2px) rotate(1deg); }
                    90% { transform: translate(2px, 3px) rotate(0deg); }
                    100% { transform: translate(2px, -3px) rotate(-1deg); }
                }
                .animate-shake { animation: shake 0.2s infinite; }
            `}</style>
        </div>
    );
};

export default JhandiMunda;
