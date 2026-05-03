
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, X, AlertCircle, Users, Check, HelpCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, db, auth, subscribeToDragonTiger, subscribeToDragonTigerBets, addGameBet, getClockOffset } from '../services/supabaseService';
import { DragonTigerState, GameResult, GameHistoryItem } from '../types';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, where, getDocs, addDoc } from 'firebase/firestore';

import DragonTigerResultPopup from '../components/DragonTigerResultPopup';
import HowToPlay from '../components/HowToPlay';

import { useStabilizedTimer } from '../hooks/useTimer';

interface Props {
    onBack: () => void;
    userBalance: number;
    username: string;
    onResult: (r: GameResult) => void;
}

type BetTarget = 'D' | 'T' | 'Tie';

const DragonTiger: React.FC<Props> = ({ onBack, userBalance, username, onResult }) => {
    const [gameState, setGameState] = useState<DragonTigerState>({
        status: 'BETTING',
        period: new Date().getTime().toString().slice(-6),
        endTime: Date.now() + 15000,
        dragonCards: [],
        tigerCards: [],
        history: ['D', 'T', 'D', 'D'],
        totalBets: { D: 0, T: 0, Tie: 0 },
        timeLeft: 15
    });
    const [selectedChip, setSelectedChip] = useState(10);
    const [confirmTarget, setConfirmTarget] = useState<BetTarget | null>(null);
    const [myBets, setMyBets] = useState<any[]>([]);
    const [allBets, setAllBets] = useState<any[]>([]);
    const allBetsRef = useRef<any[]>([]);
    useEffect(() => { allBetsRef.current = allBets; }, [allBets]);

    const [showDragon, setShowDragon] = useState(false);
    const [showTiger, setShowTiger] = useState(false);
    const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
    const [isBettingLocked, setIsBettingLocked] = useState(false);
    const [dtResult, setDtResult] = useState<any | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    const isMounted = useRef(true);
    const resultHandledRef = useRef<string | null>(null);

    const timeLeft = useStabilizedTimer(gameState.endTime);

    // Internal Game Engine for Local Session
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            if (gameState.status === 'BETTING') {
                if (now >= gameState.endTime) {
                    // Transition to RESULT
                    setGameState(prev => ({ ...prev, status: 'RESULT' }));
                    handleRevealingSequence();
                }
            } else if (gameState.status === 'RESULT') {
                // If revealing is done, start new round after delay
                // This is handled by handleRevealingSequence's end
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState.status, gameState.endTime]);

    async function handleRevealingSequence() {
        if (!isMounted.current) return;
        
        // Generate Local Result
        const suits = ['♠', '♣', '♥', '♦'];
        const dragonCard = { rank: Math.floor(Math.random() * 13) + 1, suit: suits[Math.floor(Math.random() * 4)] };
        const tigerCard = { rank: Math.floor(Math.random() * 13) + 1, suit: suits[Math.floor(Math.random() * 4)] };
        
        const newState: DragonTigerState = {
            ...gameState,
            status: 'RESULT',
            dragonCards: [dragonCard],
            tigerCards: [tigerCard]
        };
        setGameState(newState);

        await new Promise(r => setTimeout(r, 800));
        if (!isMounted.current) return;
        setShowDragon(true);
        playSound('dt_card');
        await new Promise(r => setTimeout(r, 800));
        if (!isMounted.current) return;
        setShowTiger(true);
        playSound('dt_card');
        await new Promise(r => setTimeout(r, 1000));
        
        if (isMounted.current) {
            processUserResult(newState, myBets);
            
            // Wait more then reset
            await new Promise(r => setTimeout(r, 4000));
            if (isMounted.current) {
                const winner = dragonCard.rank > tigerCard.rank ? 'D' : tigerCard.rank > dragonCard.rank ? 'T' : 'Tie';
                setGameState(prev => ({
                    status: 'BETTING',
                    period: (parseInt(prev.period) + 1).toString(),
                    endTime: Date.now() + 15000,
                    dragonCards: [],
                    tigerCards: [],
                    history: [winner as 'D' | 'T' | 'Tie', ...prev.history].slice(0, 20),
                    totalBets: { D: 0, T: 0, Tie: 0 },
                    timeLeft: 15
                }));
                setMyBets([]);
                setAllBets([]);
                setShowDragon(false);
                setShowTiger(false);
                setIsBettingLocked(false);
            }
        }
    }

    function processUserResult(state: DragonTigerState, currentBets: any[]) {
        const dragonCard = state.dragonCards[0];
        const tigerCard = state.tigerCards[0];
        
        const dSum = dragonCard.rank;
        const tSum = tigerCard.rank;
        
        let winner: 'D' | 'T' | 'Tie' = 'Tie';
        if (dSum > tSum) winner = 'D';
        else if (tSum > dSum) winner = 'T';
        else winner = 'Tie';
        
        let totalWin = 0;
        let totalBet = 0;
        
        currentBets.forEach(bet => {
            totalBet += bet.amount;
            if (bet.target === winner) {
                let multi = 2;
                if (winner === 'Tie') multi = 11;
                totalWin += bet.amount * multi;
            }
        });

        const hasWon = totalWin > 0;
        if (hasWon) updateBalance(totalWin, 'WIN', 'Dragon Tiger Win');
        
        setDtResult({
            win: hasWon,
            amount: hasWon ? totalWin : 0,
            period: state.period,
            winner,
            dragonCards: state.dragonCards,
            tigerCards: state.tigerCards,
            target: currentBets.map(b => b.target).join(', ')
        });

        if (totalBet > 0) {
            addGameHistory('Dragon Tiger', totalBet, totalWin, `Period: ${state.period}`);
        }
    }

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            stopAllSounds();
        };
    }, []);

    const handleTargetClick = (target: BetTarget) => {
        if (isBettingLocked || gameState.status !== 'BETTING') return;
        setConfirmTarget(target);
    };

    const cancelLastBet = async () => {
        if (myBets.length === 0 || gameState.status !== 'BETTING' || isBettingLocked) return;
        const lastBet = myBets[0]; // Recent is first
        setMyBets(prev => prev.slice(1));
        setAllBets(prev => prev.filter(b => b.id !== lastBet.id));
        setGameState(prev => ({
            ...prev,
            totalBets: {
                ...prev.totalBets,
                [lastBet.target]: Math.max(0, (prev.totalBets[lastBet.target as keyof typeof prev.totalBets] || 0) - lastBet.amount)
            }
        }));
        await updateBalance(lastBet.amount, 'WIN', 'Bet Cancelled');
        playSound('click');
    };

    const confirmBetAction = async () => {
        if (!confirmTarget || !auth.currentUser || gameState.status !== 'BETTING' || isBettingLocked) return;
        if (selectedChip > userBalance) {
            alert("Insufficient Balance");
            return;
        }

        const target = confirmTarget;
        try {
            const betData = {
                id: `bet_${Date.now()}`,
                uid: auth.currentUser.uid,
                username: username || 'Player',
                target,
                amount: selectedChip,
                period: gameState.period,
            };

            setMyBets(prev => [betData, ...prev]);
            setAllBets(prev => [betData, ...prev]);
            setGameState(prev => ({
                ...prev,
                totalBets: {
                    ...prev.totalBets,
                    [target]: (prev.totalBets[target as keyof typeof prev.totalBets] || 0) + selectedChip
                }
            }));

            await updateBalance(-selectedChip, 'BET', `DT Bet on ${target}`);
            playSound('bet_place');
        } catch (e) {
            console.error("Bet error:", e);
        }
    };

    const getCardRank = (val: number | undefined) => {
        if (!val) return '?';
        if (val === 1) return 'A';
        if (val === 11) return 'J';
        if (val === 12) return 'Q';
        if (val === 13) return 'K';
        return val.toString();
    };

    const Card = ({ cards, show, label }: { cards: { rank: number; suit: string }[], show: boolean, label: string }) => (
        <div className="flex flex-col items-center gap-4">
            <div className="flex gap-3">
                {cards.map((card, idx) => (
                    <div key={idx} className="card-container">
                        <div className={`card-inner ${show ? 'flip' : ''}`}>
                            <div className="card-front text-5xl flex items-center justify-center bg-gradient-to-br from-red-800 to-red-950 text-yellow-500 font-black shadow-2xl">?</div>
                            <div className="card-back flex flex-col items-center justify-center relative shadow-2xl overflow-hidden rounded-xl border-2 border-white/20 bg-white">
                                <span className={`absolute top-2 left-3 text-2xl font-black ${['♥', '♦'].includes(card?.suit || '') ? 'text-red-600' : 'text-zinc-900'}`}>
                                    {getCardRank(card?.rank)}
                                </span>
                                <span className={`text-7xl ${['♥', '♦'].includes(card?.suit || '') ? 'text-red-600' : 'text-zinc-900'} drop-shadow-sm`}>
                                    {card?.suit}
                                </span>
                                <span className={`absolute bottom-2 right-3 text-2xl font-black rotate-180 ${['♥', '♦'].includes(card?.suit || '') ? 'text-red-600' : 'text-zinc-900'}`}>
                                    {getCardRank(card?.rank)}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
                            </div>
                        </div>
                    </div>
                ))}
                {cards.length === 0 && (
                    <div className="card-container">
                        <div className="card-front text-4xl shadow-[0_0_20px_rgba(234,179,8,0.2)]">?</div>
                    </div>
                )}
            </div>
            <span className={`text-base font-black uppercase tracking-[0.2em] italic ${label === 'Dragon' ? 'text-red-500' : 'text-orange-500'} drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>{label}</span>
        </div>
    );

    if (!gameState) return <div className="min-h-screen bg-black flex items-center justify-center font-black gold-text">Syncing Arena...</div>;

    return (
        <div className="bg-[#0a0f1d] fixed inset-0 flex flex-col font-sans text-white select-none overflow-hidden">
            <DragonTigerResultPopup result={dtResult} onClose={() => setDtResult(null)} />
            <HowToPlay 
                isOpen={showHelp} 
                onClose={() => setShowHelp(false)} 
                title="Dragon Tiger Rules"
                rules={[
                    "Two cards are dealt: one to the Dragon and one to the Tiger.",
                    "Bet on which card will be higher. King is the highest, Ace is the lowest.",
                    "Payout for Dragon or Tiger is 1:1.",
                    "A Tie pays 1:8."
                ]}
                payouts={[
                    { label: "Dragon / Tiger", value: "2x" },
                    { label: "Tie", value: "9x" }
                ]}
            />
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-[#111827] border-b border-yellow-500/20 z-50 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={20}/></button>
                    <div className="flex flex-col">
                        <h1 className="text-xs font-black gold-text uppercase tracking-widest italic leading-none">DRAGON TIGER</h1>
                        <span className="text-[8px] text-yellow-500/40 mt-1 uppercase font-bold">Arena Wallet</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono shadow-inner italic flex items-center gap-2">
                        <Wallet size={14} className="text-yellow-500" />
                        <span className="font-black">₹{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setShowHelp(true)} className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20 active:scale-90"><HelpCircle size={20}/></button>
                </div>
            </div>

            {/* Game Area */}
            <div className="flex-1 flex flex-col items-center py-4 gap-4 relative overflow-y-auto no-scrollbar pb-[160px]">
                
                {/* History (Top) */}
                <div className="w-full px-4 shrink-0">
                    <div className="flex gap-1 overflow-x-auto no-scrollbar py-2 bg-black/20 rounded-full px-3 border border-white/5">
                        {gameState.history.map((h, i) => (
                            <span key={i} className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg border border-white/10 ${h==='D'?'bg-red-600':h==='T'?'bg-orange-600':'bg-green-600'}`}>{h}</span>
                        ))}
                    </div>
                </div>
                
                {/* Stage Layout - Enhanced Visibility and Compact */}
                <div className="w-full max-w-sm px-2 shrink-0">
                    <div className="bg-slate-900/60 rounded-[2rem] p-4 border-2 border-slate-800 shadow-[0_15px_40px_rgba(0,0,0,0.6),inset_0_0_40px_rgba(0,0,0,0.4)] relative overflow-hidden h-[240px] flex flex-col justify-center">
                        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }}></div>
                        
                        <div className="flex justify-between items-center relative z-10">
                             <div className="flex-1 flex justify-center">
                                <Card cards={gameState.dragonCards || []} show={showDragon} label="Dragon" />
                             </div>
                            
                            <div className="flex flex-col items-center px-1">
                                <div className={`w-12 h-12 rounded-full border-[3px] flex flex-col items-center justify-center font-black shadow-[0_0_15px_rgba(0,0,0,0.6)] bg-black/90 transition-all ${gameState.status === 'BETTING' ? (timeLeft <= 10 ? 'border-red-500 text-red-500 animate-pulse scale-105' : 'border-green-500 text-green-500') : 'border-yellow-600 text-yellow-500'}`}>
                                    <span className="text-xl font-mono leading-none tracking-tighter">{timeLeft}</span>
                                </div>
                                <span className={`text-[7px] font-black uppercase tracking-[0.1em] mt-1 drop-shadow-lg ${gameState.status === 'BETTING' ? 'text-green-500/60' : 'text-yellow-500'}`}>{gameState.status}</span>
                            </div>

                             <div className="flex-1 flex justify-center">
                                <Card cards={gameState.tigerCards || []} show={showTiger} label="Tiger" />
                             </div>
                        </div>
                    </div>
                </div>

                {/* Betting Grid - Compact but accessible */}
                <div className="px-4 grid grid-cols-2 gap-2 mt-2 w-full max-w-xs">
                    <button 
                        disabled={isBettingLocked || gameState.status !== 'BETTING'}
                        onClick={() => handleTargetClick('D')}
                        className={`relative h-20 rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${isBettingLocked ? 'opacity-50 grayscale' : 'hover:border-red-500/50'} ${confirmTarget === 'D' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-white/5 bg-red-950/20'}`}
                    >
                        <div className="relative h-full flex flex-col items-center justify-center p-2">
                            <span className="text-base font-black italic text-red-500 tracking-tighter">DRAGON</span>
                            <span className="text-[10px] font-black text-white italic mt-1">₹{(gameState?.totalBets?.D || 0).toLocaleString()}</span>
                        </div>
                    </button>

                    <button 
                        disabled={isBettingLocked || gameState.status !== 'BETTING'}
                        onClick={() => handleTargetClick('T')}
                        className={`relative h-20 rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${isBettingLocked ? 'opacity-50 grayscale' : 'hover:border-orange-500/50'} ${confirmTarget === 'T' ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'border-white/5 bg-orange-950/20'}`}
                    >
                        <div className="relative h-full flex flex-col items-center justify-center p-2">
                            <span className="text-base font-black italic text-orange-500 tracking-tighter">TIGER</span>
                            <span className="text-[10px] font-black text-white italic mt-1">₹{(gameState?.totalBets?.T || 0).toLocaleString()}</span>
                        </div>
                    </button>
                </div>

                <div className="px-4 w-full max-w-xs mt-2">
                    <button 
                        disabled={isBettingLocked || gameState.status !== 'BETTING'}
                        onClick={() => handleTargetClick('Tie')}
                        className={`w-full relative h-10 rounded-xl overflow-hidden border transition-all active:scale-95 ${isBettingLocked ? 'opacity-50 grayscale' : 'hover:border-green-500/50'} ${confirmTarget === 'Tie' ? 'border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)]' : 'border-white/5 bg-green-950/20'}`}
                    >
                        <div className="relative h-full flex items-center justify-between px-4">
                            <span className="text-xs font-black italic text-green-500 tracking-tighter">TIE (1:8)</span>
                            <span className="text-[10px] font-black text-white italic font-mono">₹{(gameState?.totalBets?.Tie || 0).toLocaleString()}</span>
                        </div>
                    </button>
                </div>

                {/* Live Bets Section - Minimal and Scroll Controlled */}
                <div className="w-full mt-2 flex-1 flex flex-col overflow-hidden px-4 pb-[130px]">
                    <div className="flex border-b border-white/5 shrink-0">
                        <button onClick={() => setActiveTab('ALL')} className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'ALL' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-zinc-500'}`}>Current Bets</button>
                        <button onClick={() => setActiveTab('MY')} className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'MY' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-zinc-500'}`}>My Record</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 no-scrollbar max-h-[150px]">
                        <AnimatePresence mode="popLayout">
                            {(activeTab === 'ALL' ? allBets : myBets).map((bet, idx) => (
                                <motion.div 
                                    key={bet.id || `dt-bet-${idx}`}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[8px] ${bet.target === 'D' ? 'bg-red-600' : bet.target === 'T' ? 'bg-orange-600' : 'bg-green-600'}`}>
                                            {bet.target}
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black uppercase flex items-center gap-2">
                                                {bet.username || 'Player'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-black text-yellow-500">₹ {bet.amount}</div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="bg-[#111] p-3 border-t border-white/10 z-[60] fixed bottom-0 left-0 w-full shadow-[0_-20px_60px_rgba(0,0,0,1)] pb-4">
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 justify-center">
                        {[10, 50, 100, 500, 1000, 5000].map(chip => (
                            <button 
                                key={chip} 
                                onClick={() => setSelectedChip(chip)} 
                                className={`flex-shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center font-black text-[9px] transition-all ${selectedChip === chip ? 'bg-yellow-500 border-white text-black scale-110 shadow-lg' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}
                            >
                                ₹{chip >= 1000 ? (chip/1000)+'K' : chip}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={confirmBetAction} 
                            disabled={!confirmTarget || isBettingLocked || gameState.status !== 'BETTING'}
                            className={`flex-1 py-4 rounded-xl font-black text-base uppercase tracking-widest transition-all active:scale-95 shadow-2xl disabled:opacity-50 disabled:grayscale ${confirmTarget ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black' : 'bg-white/5 text-white/20'}`}
                        >
                            {confirmTarget ? `CONFIRM ₹${selectedChip} ON ${confirmTarget === 'D' ? 'DRAGON' : confirmTarget === 'T' ? 'TIGER' : 'TIE'}` : 'SELECT TARGET'}
                        </button>
                        {myBets.length > 0 && gameState.status === 'BETTING' && !isBettingLocked && (
                            <button onClick={cancelLastBet} className="px-6 bg-red-600/20 border border-red-500/30 rounded-xl text-[10px] font-black uppercase text-red-500 active:scale-95 transition-all flex items-center gap-2">
                                <RotateCcw size={16} /> RETURN
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .card-container {
                    perspective: 1000px;
                    width: 100px;
                    height: 140px;
                }
                .card-inner {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    transform-style: preserve-3d;
                }
                .card-inner.flip {
                    transform: rotateY(180deg);
                }
                .card-front, .card-back {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    backface-visibility: hidden;
                    border-radius: 8px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                }
                .card-front { 
                    background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%); 
                    color: gold; 
                    font-size: 2rem; 
                    font-weight: bold;
                    background-image: 
                        radial-gradient(circle at 50% 50%, rgba(253, 230, 138, 0.1) 1px, transparent 0),
                        linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%);
                    background-size: 10px 10px, 100% 100%;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                }
                .card-back { 
                    background: #f8fafc; 
                    color: black; 
                    transform: rotateY(180deg); 
                    border: 1px solid #cbd5e1;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }
            `}</style>
        </div>
    );
};

const BetButton = ({ target, label, mult, color, bets, onClick, disabled }: any) => {
    const amount = bets.filter((b:any)=>b.target===target).reduce((a:number,b:any)=>a+b.amount,0);
    return (
        <button onClick={() => onClick(target)} disabled={disabled} className={`h-24 rounded-2xl border-b-[6px] transition-all active:scale-95 flex flex-col items-center justify-center relative overflow-hidden ${!disabled ? color : 'bg-slate-900 opacity-40 grayscale'}`}>
            <span className="text-sm font-black italic">{label}</span>
            <span className="text-[7px] font-black opacity-60 uppercase">{mult}</span>
            {amount > 0 && <div className="mt-1 bg-yellow-500 text-black px-2 py-0.5 rounded-full text-[8px] font-black animate-in zoom-in shadow-lg">₹{amount}</div>}
            {disabled && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={20} className="text-white/20" /></div>}
        </button>
    );
};

export default DragonTiger;
