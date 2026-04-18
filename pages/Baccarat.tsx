
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, HelpCircle, X, AlertCircle, Users, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, db, auth, subscribeToBaccarat, subscribeToBaccaratBets, getClockOffset } from '../services/supabaseService';
import { GameResult, BaccaratState } from '../types';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, where, addDoc } from 'firebase/firestore';

import BaccaratResultPopup from '../components/BaccaratResultPopup';

type Card = { rank: string; suit: string; value: number; id: string };
const SUITS = ['♠', '♣', '♥', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const createDeck = (): Card[] => {
    let deck: Card[] = [];
    SUITS.forEach(suit => {
        RANKS.forEach((rank, idx) => {
            let val = idx + 1;
            if (val >= 10) val = 0; 
            deck.push({ rank, suit, value: val, id: `${rank}${suit}-${Math.random()}` });
        });
    });
    return deck.sort(() => Math.random() - 0.5);
};

const Baccarat: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [gameState, setGameState] = useState<BaccaratState | null>(null);
    const [betAmount, setBetAmount] = useState(10);
    const [selectedBet, setSelectedBet] = useState<'PLAYER' | 'BANKER' | 'TIE' | null>(null);
    const [myBets, setMyBets] = useState<any[]>([]);
    const [allBets, setAllBets] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
    const [isBettingLocked, setIsBettingLocked] = useState(false);
    const [playerHand, setPlayerHand] = useState<Card[]>([]);
    const [bankerHand, setBankerHand] = useState<Card[]>([]);
    const [dealing, setDealing] = useState(false);
    const [bcResult, setBcResult] = useState<any | null>(null);
    
    const [timeLeft, setTimeLeft] = useState(0);
    
    const isMounted = useRef(true);
    const resultHandledRef = useRef<string | null>(null);

    useEffect(() => {
        isMounted.current = true;
        
        const unsubState = subscribeToBaccarat((state) => {
            if (!isMounted.current || !state) return;
            setGameState(state);

            if (state.status === 'BETTING') {
                setDealing(false);
                setPlayerHand([]);
                setBankerHand([]);
                resultHandledRef.current = null;
            } else {
                setIsBettingLocked(true);
            }

            if (state.status === 'RESULT' && resultHandledRef.current !== state.period) {
                resultHandledRef.current = state.period;
                handleDealingSequence(state);
            }
        });

        const unsubBets = subscribeToBaccaratBets((bets) => {
            setAllBets(bets);
            if (auth.currentUser) {
                setMyBets(bets.filter((b: any) => b.uid === auth.currentUser?.uid));
            }
        });

        return () => { isMounted.current = false; unsubState(); unsubBets(); stopAllSounds(); };
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            if (gameState?.endTime) {
                const remaining = Math.max(0, Math.floor((gameState.endTime - (Date.now() + getClockOffset())) / 1000));
                setTimeLeft(remaining);
                if (gameState.status === 'BETTING') {
                    setIsBettingLocked(remaining <= 5);
                    if (remaining <= 5 && remaining > 0) playSound('wingo_tick');
                }
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState?.endTime, gameState?.status]);

    if (!gameState) return <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center font-black gold-text text-xl italic uppercase tracking-widest">Entering Arena...</div>;

    // Listen to bets for the current period
    // Redundant - now handled by shared listener in first useEffect

    const getScore = (hand: Card[]) => {
        if (hand.length === 0) return 0;
        const total = hand.reduce((acc, c) => acc + c.value, 0);
        return total % 10;
    };

    const handleDealingSequence = async (state: BaccaratState) => {
        setDealing(true);
        const deck = createDeck();
        const pHand = [deck.pop()!, deck.pop()!];
        const bHand = [deck.pop()!, deck.pop()!];

        // Simulate dealing based on result
        // In a real app, the server would provide the hands. 
        // Here we'll just make sure the winner matches the state.winner
        if (state.winner === 'PLAYER') {
            while (getScore(pHand) <= getScore(bHand)) pHand.push(deck.pop()!);
        } else if (state.winner === 'BANKER') {
            while (getScore(bHand) <= getScore(pHand)) bHand.push(deck.pop()!);
        } else {
            // Tie
            while (getScore(pHand) !== getScore(bHand)) pHand.push(deck.pop()!);
        }

        for (let i = 0; i < Math.max(pHand.length, bHand.length); i++) {
            if (pHand[i]) {
                setPlayerHand(prev => [...prev, pHand[i]]);
                playSound('dt_card');
                await new Promise(r => setTimeout(r, 600));
            }
            if (bHand[i]) {
                setBankerHand(prev => [...prev, bHand[i]]);
                playSound('dt_card');
                await new Promise(r => setTimeout(r, 600));
            }
        }

        setDealing(false);
        const myCurrentBets = allBets.filter(b => b.uid === auth.currentUser?.uid);
        if (myCurrentBets.length > 0) {
            processMyResult(state, myCurrentBets);
        }
    };

    const processMyResult = (state: BaccaratState, currentBets: any[]) => {
        let totalWin = 0;
        let totalBet = 0;
        
        currentBets.forEach(bet => {
            totalBet += bet.amount;
            if (bet.target === state.winner) {
                const multi = state.winner === 'TIE' ? 9 : 2.0;
                totalWin += bet.amount * multi;
            }
        });

        const isWin = totalWin > 0;
        if (isWin) updateBalance(totalWin, 'WIN', 'Baccarat Win');
        
        setBcResult({
            win: isWin,
            amount: isWin ? totalWin : totalBet,
            period: state.period,
            winner: state.winner || '',
            playerHand: playerHand,
            bankerHand: bankerHand,
            playerScore: getScore(playerHand),
            bankerScore: getScore(bankerHand),
            target: currentBets.map(b => b.target).join(', ')
        });

        addGameHistory('Baccarat Elite', totalBet, totalWin, `Period: ${state.period}`);
    };

    const handlePlaceBet = async () => {
        if (!selectedBet || !auth.currentUser || !gameState) return;
        if (userBalance < betAmount) { alert("Insufficient Balance!"); return; }

        try {
            const betData = {
                target: selectedBet,
                amount: betAmount,
                period: gameState.period,
            };

            await addGameBet('baccarat_bets', betData);
            await updateBalance(-betAmount, 'BET', `Baccarat on ${selectedBet}`);
            playSound('bet_place');
        } catch (e) {
            console.error("Bet error:", e);
        }
    };

    const CardView: React.FC<{ card: Card }> = ({ card }) => (
        <motion.div 
            initial={{ scale: 0, rotateY: 180 }}
            animate={{ scale: 1, rotateY: 0 }}
            className="w-16 h-24 sm:w-24 sm:h-36 bg-white rounded-xl flex flex-col items-center justify-center border-2 border-slate-300 shadow-2xl relative overflow-hidden"
        >
             <div className={`absolute top-1 left-2 font-black text-sm sm:text-xl ${card.suit==='♥'||card.suit==='♦'?'text-red-600':'text-zinc-900'}`}>{card.rank}</div>
             <div className={`text-3xl sm:text-6xl ${card.suit==='♥'||card.suit==='♦'?'text-red-600':'text-zinc-900'}`}>{card.suit}</div>
             <div className={`absolute bottom-1 right-2 font-black text-sm sm:text-xl rotate-180 ${card.suit==='♥'||card.suit==='♦'?'text-red-600':'text-zinc-900'}`}>{card.rank}</div>
        </motion.div>
    );

    if (!gameState) return <div className="min-h-screen bg-black flex items-center justify-center font-black gold-text">Syncing Table...</div>;

    return (
        <div className="bg-[#051c14] min-h-screen flex flex-col font-sans text-white select-none overflow-x-hidden relative">
            <BaccaratResultPopup result={bcResult} onClose={() => setBcResult(null)} />
            {/* Header */}
            <div className="p-4 flex justify-between bg-black/40 border-b border-white/5 shadow-lg items-center z-50">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
                <h1 className="text-sm font-black italic gold-text uppercase tracking-widest">BACCARAT ELITE</h1>
                <div className="bg-black/50 px-3 py-2 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono shadow-inner flex items-center gap-2">
                    <Wallet size={14} />
                    <span>₹{userBalance.toFixed(2)}</span>
                </div>
            </div>

            {/* Game Content */}
            <div className="flex-1 flex flex-col items-center p-4 relative bg-[url('https://www.transparenttextures.com/patterns/felt.png')] overflow-y-auto no-scrollbar pb-80">
                
                {/* History (Top) */}
                <div className="w-full mb-4">
                    <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
                        {gameState.history.map((h, i) => (
                            <span key={i} className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black shadow-lg ${h==='P'?'bg-blue-600':h==='B'?'bg-red-600':'bg-green-600'}`}>{h}</span>
                        ))}
                    </div>
                </div>

                {/* Table Area */}
                <div className="w-full flex justify-around items-start mb-12 relative z-10 mt-8">
                     <div className="flex flex-col items-center gap-4">
                         <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black uppercase text-blue-400 tracking-[0.4em] mb-1">Player</span>
                            <div className={`text-5xl font-black italic transition-all duration-700 ${gameState.status==='RESULT'?'scale-110 gold-text':'text-white/20'}`}>{getScore(playerHand)}</div>
                         </div>
                         <div className="flex gap-1 min-h-[6rem] sm:min-h-[9rem]">
                             {playerHand.map((c, i) => <CardView key={i} card={c} />)}
                         </div>
                     </div>

                     <div className="flex flex-col items-center gap-4">
                         <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black uppercase text-red-400 tracking-[0.4em] mb-1">Banker</span>
                            <div className={`text-5xl font-black italic transition-all duration-700 ${gameState.status==='RESULT'?'scale-110 gold-text':'text-white/20'}`}>{getScore(bankerHand)}</div>
                         </div>
                         <div className="flex gap-1 min-h-[6rem] sm:min-h-[9rem]">
                             {bankerHand.map((c, i) => <CardView key={i} card={c} />)}
                         </div>
                     </div>
                </div>

                {/* Timer */}
                <div className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center font-black mb-8 ${gameState.status === 'BETTING' ? (isBettingLocked ? 'border-orange-500 text-orange-500' : 'border-green-500 text-green-500') : 'border-red-600 text-red-600 animate-pulse'}`}>
                    <span className="text-[8px] uppercase opacity-60">Time</span>
                    <span className="text-xl font-mono leading-none">{timeLeft}</span>
                </div>

                {/* Live Bets Display */}
                <div className="w-full mt-6 flex-1 flex flex-col min-h-[300px]">
                    <div className="flex border-b border-white/5">
                        <button onClick={() => setActiveTab('ALL')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ALL' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-zinc-500'}`}>All Bets ({allBets.length})</button>
                        <button onClick={() => setActiveTab('MY')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MY' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-zinc-500'}`}>My Bets ({myBets.length})</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {(activeTab === 'ALL' ? allBets : myBets).map((bet) => (
                                <motion.div 
                                    key={bet.id || bet.uid}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[8px] shadow-lg ${bet.target==='PLAYER'?'bg-blue-600':bet.target==='BANKER'?'bg-red-600':'bg-green-600'}`}>
                                            {bet.target.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase">{bet.username || 'Player'}</div>
                                            <div className="text-[8px] text-zinc-500">{new Date(bet.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-black text-yellow-500">₹{bet.amount}</div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Betting Controls */}
            <div className="fixed bottom-0 left-0 w-full bg-[#111] p-4 pb-10 border-t border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,1)] z-[60]">
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <button onClick={() => setSelectedBet('PLAYER')} disabled={isBettingLocked || gameState.status !== 'BETTING'} className={`h-24 rounded-2xl border-b-4 transition-all active:scale-95 flex flex-col items-center justify-center relative overflow-hidden ${selectedBet === 'PLAYER' ? 'bg-blue-600 border-blue-800 scale-105 shadow-xl' : 'bg-zinc-900 border-zinc-950 opacity-40 grayscale'}`}>
                        <span className="text-xl font-black italic">PLAYER</span>
                        <span className="text-[8px] font-black opacity-60 mt-1">2.0X</span>
                        {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={16} className="text-white/20" /></div>}
                    </button>
                    <button onClick={() => setSelectedBet('TIE')} disabled={isBettingLocked || gameState.status !== 'BETTING'} className={`h-24 rounded-2xl border-b-4 transition-all active:scale-95 flex flex-col items-center justify-center relative overflow-hidden ${selectedBet === 'TIE' ? 'bg-green-600 border-green-800 scale-105 shadow-xl' : 'bg-zinc-900 border-zinc-950 opacity-40 grayscale'}`}>
                        <span className="text-xl font-black italic">TIE</span>
                        <span className="text-[8px] font-black opacity-60 mt-1">9.0X</span>
                        {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={16} className="text-white/20" /></div>}
                    </button>
                    <button onClick={() => setSelectedBet('BANKER')} disabled={isBettingLocked || gameState.status !== 'BETTING'} className={`h-24 rounded-2xl border-b-4 transition-all active:scale-95 flex flex-col items-center justify-center relative overflow-hidden ${selectedBet === 'BANKER' ? 'bg-red-600 border-red-800 scale-105 shadow-xl' : 'bg-zinc-900 border-zinc-950 opacity-40 grayscale'}`}>
                        <span className="text-xl font-black italic">BANKER</span>
                        <span className="text-[8px] font-black opacity-60 mt-1">2.0X</span>
                        {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={16} className="text-white/20" /></div>}
                    </button>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 flex-1">
                        {[10, 50, 100, 500, 1000].map(a => (
                            <button key={a} onClick={() => setBetAmount(a)} className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-[10px] transition-all ${betAmount === a ? 'bg-yellow-500 border-white text-black scale-110 shadow-2xl' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>₹{a >= 1000 ? (a/1000)+'K' : a}</button>
                        ))}
                    </div>
                    {selectedBet && gameState.status === 'BETTING' && !isBettingLocked && (
                        <button onClick={handlePlaceBet} className="bg-yellow-500 text-black px-8 py-3 rounded-xl font-black text-xs uppercase animate-in slide-in-from-right shadow-lg">Place Bet</button>
                    )}
                </div>
            </div>
            <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
        </div>
    );
};
export default Baccarat;
