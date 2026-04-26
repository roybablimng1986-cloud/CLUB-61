
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, X, AlertCircle, Users, Check, HelpCircle } from 'lucide-react';
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
    const [gameState, setGameState] = useState<DragonTigerState | null>(null);
    const [selectedChip, setSelectedChip] = useState(10);
    const [myBets, setMyBets] = useState<any[]>([]);
    const [allBets, setAllBets] = useState<any[]>([]);
    const allBetsRef = useRef<any[]>([]);
    useEffect(() => { allBetsRef.current = allBets; }, [allBets]);

    const [showDragon, setShowDragon] = useState(false);
    const [showTiger, setShowTiger] = useState(false);
    const [confirmDrawerOpen, setConfirmDrawerOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<BetTarget | null>(null);
    const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
    const [isBettingLocked, setIsBettingLocked] = useState(false);
    const [dtResult, setDtResult] = useState<any | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    const isMounted = useRef(true);
    const resultHandledRef = useRef<string | null>(null);

    const timeLeft = useStabilizedTimer(gameState?.endTime);

    async function handleRevealingSequence(state: DragonTigerState) {
        await new Promise(r => setTimeout(r, 500));
        if (!isMounted.current) return;
        setShowDragon(true);
        playSound('dt_card');
        await new Promise(r => setTimeout(r, 1000));
        if (!isMounted.current) return;
        setShowTiger(true);
        playSound('dt_card');
        await new Promise(r => setTimeout(r, 1500));
        
        if (isMounted.current) {
            const myCurrentBets = allBetsRef.current.filter(b => b.uid === auth.currentUser?.uid);
            if (myCurrentBets.length > 0) {
                processUserResult(state, myCurrentBets);
            }
        }
    }

    function processUserResult(state: DragonTigerState, currentBets: any[]) {
        const dSum = state.dragonCards.reduce((a, b) => a + b.rank, 0);
        const tSum = state.tigerCards.reduce((a, b) => a + b.rank, 0);
        
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
            amount: hasWon ? totalWin : totalBet,
            period: state.period,
            winner,
            dragonCards: state.dragonCards,
            tigerCards: state.tigerCards,
            target: currentBets.map(b => b.target).join(', ')
        });

        addGameHistory('Dragon Tiger', totalBet, totalWin, `Period: ${state.period}`);
    }

    useEffect(() => {
        isMounted.current = true;
        
        // Global Game State Listener
        const unsubState = subscribeToDragonTiger((state) => {
            if (!state) return;
            setGameState(state);

            if (state.status === 'BETTING') {
                setShowDragon(false);
                setShowTiger(false);
                resultHandledRef.current = null;
            } else {
                setIsBettingLocked(true);
            }

            if (state.status === 'RESULT' && resultHandledRef.current !== state.period) {
                resultHandledRef.current = state.period;
                handleRevealingSequence(state);
            }
        });

        const unsubBets = subscribeToDragonTigerBets((bets) => {
            setAllBets(bets);
            if (auth.currentUser) {
                setMyBets(bets.filter((b: any) => b.uid === auth.currentUser?.uid));
            }
        });

        return () => {
            isMounted.current = false;
            unsubState();
            unsubBets();
            stopAllSounds();
        };
    }, []);

    useEffect(() => {
        if (gameState?.status === 'BETTING') {
            setIsBettingLocked(timeLeft <= 3);
            if (timeLeft <= 5 && timeLeft > 0) playSound('wingo_tick');
        }
    }, [timeLeft, gameState?.status]);

    if (!gameState) return <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center font-black gold-text">Syncing Arena...</div>;

    const handleTargetClick = (target: BetTarget) => {
        if (isBettingLocked || gameState?.status !== 'BETTING') return;
        setConfirmTarget(target);
        setConfirmDrawerOpen(true);
        playSound('click');
    };

    const confirmBetAction = async () => {
        if (!auth.currentUser || !gameState) return;
        if (selectedChip > userBalance) {
            alert("Insufficient Balance");
            return;
        }

        try {
            const betData = {
                target: confirmTarget,
                amount: selectedChip,
                period: gameState.period,
            };

            await addGameBet('dragon_tiger_bets', betData);
            await updateBalance(-selectedChip, 'BET', `DT Bet on ${confirmTarget}`);
            setConfirmDrawerOpen(false);
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
        <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
                {cards.map((card, idx) => (
                    <div key={idx} className="card-container">
                        <div className={`card-inner ${show ? 'flip' : ''}`}>
                            <div className="card-front text-2xl">?</div>
                            <div className="card-back flex flex-col items-center justify-center relative shadow-xl overflow-hidden rounded-lg">
                                <span className={`absolute top-1 left-2 text-sm font-black ${['♥', '♦'].includes(card?.suit || '') ? 'text-red-600' : 'text-zinc-900'}`}>
                                    {getCardRank(card?.rank)}
                                </span>
                                <span className={`text-4xl ${['♥', '♦'].includes(card?.suit || '') ? 'text-red-600' : 'text-zinc-900'}`}>
                                    {card?.suit}
                                </span>
                                <span className={`absolute bottom-1 right-2 text-sm font-black rotate-180 ${['♥', '♦'].includes(card?.suit || '') ? 'text-red-600' : 'text-zinc-900'}`}>
                                    {getCardRank(card?.rank)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
                {cards.length === 0 && (
                    <div className="card-container">
                        <div className="card-front text-2xl">?</div>
                    </div>
                )}
            </div>
            <span className={`text-xs font-black uppercase tracking-widest ${label === 'Dragon' ? 'text-red-500' : 'text-orange-500'}`}>{label}</span>
        </div>
    );

    if (!gameState) return <div className="min-h-screen bg-black flex items-center justify-center font-black gold-text">Syncing Arena...</div>;

    return (
        <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white select-none overflow-hidden relative">
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
            <div className="p-4 flex justify-between items-center bg-[#111827] border-b border-yellow-500/20 z-50">
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
            <div className="flex-1 casino-gradient flex flex-col items-center py-4 gap-4 relative overflow-y-auto no-scrollbar pb-96">
                
                {/* History (Top) */}
                <div className="w-full px-4">
                    <div className="flex gap-1 overflow-x-auto no-scrollbar py-2 bg-black/20 rounded-full px-3 border border-white/5">
                        {gameState.history.map((h, i) => (
                            <span key={i} className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg border border-white/10 ${h==='D'?'bg-red-600':h==='T'?'bg-orange-600':'bg-green-600'}`}>{h}</span>
                        ))}
                    </div>
                              {/* Layout Optimization */}
                <div className="w-full max-w-sm px-4 mt-2">
                    <div className="bg-slate-900/60 rounded-[2.5rem] p-6 border-4 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                        
                        <div className="flex justify-between items-center mb-6">
                            <Card cards={gameState.dragonCards || []} show={showDragon} label="Dragon" />
                            
                            <div className="flex flex-col items-center">
                                <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center font-black shadow-2xl bg-black/60 ${gameState.status === 'BETTING' ? (isBettingLocked ? 'border-orange-500 text-orange-500' : 'border-green-500 text-green-500') : 'border-red-600 text-red-600 animate-pulse'}`}>
                                    <span className="text-xl font-mono leading-none">{timeLeft}</span>
                                </div>
                            </div>

                            <Card cards={gameState.tigerCards || []} show={showTiger} label="Tiger" />
                        </div>

                        <div className="text-center">
                            <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">{gameState.status}</span>
                        </div>
                    </div>
                </div>

                {/* Betting Grid - Refined */}
                <div className="px-4 grid grid-cols-2 gap-4 mt-2 w-full max-w-sm">
                    <button 
                        disabled={isBettingLocked || gameState.status !== 'BETTING'}
                        onClick={() => handleTargetClick('D')}
                        className={`relative h-28 rounded-2xl overflow-hidden border-2 transition-all active:scale-95 ${isBettingLocked ? 'opacity-50 grayscale' : 'hover:border-red-500/50'} ${confirmTarget === 'D' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'border-white/5 bg-red-950/20'}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent"></div>
                        <div className="relative h-full flex flex-col items-center justify-center p-2">
                            <span className="text-xl font-black italic text-red-500 tracking-tighter">DRAGON</span>
                            <span className="text-[7px] font-black text-red-500/60 uppercase tracking-widest mt-1">Payout 1:1</span>
                            <span className="text-xs font-black text-white italic mt-2">₹{(gameState?.totalBets?.D || 0).toLocaleString()}</span>
                        </div>
                    </button>

                    <button 
                        disabled={isBettingLocked || gameState.status !== 'BETTING'}
                        onClick={() => handleTargetClick('T')}
                        className={`relative h-28 rounded-2xl overflow-hidden border-2 transition-all active:scale-95 ${isBettingLocked ? 'opacity-50 grayscale' : 'hover:border-orange-500/50'} ${confirmTarget === 'T' ? 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)]' : 'border-white/5 bg-orange-950/20'}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-transparent"></div>
                        <div className="relative h-full flex flex-col items-center justify-center p-2">
                            <span className="text-xl font-black italic text-orange-500 tracking-tighter">TIGER</span>
                            <span className="text-[7px] font-black text-orange-500/60 uppercase tracking-widest mt-1">Payout 1:1</span>
                            <span className="text-xs font-black text-white italic mt-2">₹{(gameState?.totalBets?.T || 0).toLocaleString()}</span>
                        </div>
                    </button>
                </div>

                <div className="px-4 w-full max-w-sm mt-4">
                    <button 
                        disabled={isBettingLocked || gameState.status !== 'BETTING'}
                        onClick={() => handleTargetClick('Tie')}
                        className={`w-full relative h-16 rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${isBettingLocked ? 'opacity-50 grayscale' : 'hover:border-green-500/50'} ${confirmTarget === 'Tie' ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'border-white/5 bg-green-950/20'}`}
                    >
                        <div className="relative h-full flex items-center justify-between px-6">
                            <span className="text-lg font-black italic text-green-500 tracking-tighter">TIE (1:8)</span>
                            <span className="text-sm font-black text-white italic font-mono">₹{(gameState?.totalBets?.Tie || 0).toLocaleString()}</span>
                        </div>
                    </button>
                </div>            </div>

                {/* Live Bets Section */}
                <div className="w-full mt-4 flex-1 flex flex-col min-h-[300px]">
                    <div className="flex border-b border-white/5 px-4">
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
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${bet.target === 'D' ? 'bg-red-600' : bet.target === 'T' ? 'bg-orange-600' : 'bg-green-600'}`}>
                                            {bet.target}
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase flex items-center gap-2">
                                                {bet.username || 'Player'}
                                                {bet.target === 'D' ? <span className="text-[6px] text-red-500 font-bold uppercase">Dragon</span> : bet.target === 'T' ? <span className="text-[6px] text-orange-500 font-bold uppercase">Tiger</span> : <span className="text-[6px] text-green-500 font-bold uppercase">Tie</span>}
                                            </div>
                                            <div className="text-[8px] text-zinc-500">{new Date(bet.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-black text-yellow-500">₹{bet.amount}</div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {(activeTab === 'ALL' ? allBets : myBets).length === 0 && (
                            <div className="text-center py-10 text-zinc-600 text-[10px] font-black uppercase tracking-widest">No bets placed yet</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-[#111] p-4 border-t border-white/10 z-[60] fixed bottom-0 left-0 w-full shadow-[0_-20px_60px_rgba(0,0,0,1)] pb-4">
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <BetButton target="D" label="DRAGON" mult="2.0X" color="bg-red-950/40 border-red-700" bets={myBets} onClick={handleTargetClick} disabled={isBettingLocked || gameState.status !== 'BETTING'} />
                    <BetButton target="Tie" label="TIE" mult="11X" color="bg-green-950/40 border-green-700" bets={myBets} onClick={handleTargetClick} disabled={isBettingLocked || gameState.status !== 'BETTING'} />
                    <BetButton target="T" label="TIGER" mult="2.0X" color="bg-orange-950/40 border-orange-700" bets={myBets} onClick={handleTargetClick} disabled={isBettingLocked || gameState.status !== 'BETTING'} />
                </div>
                
                <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 flex-1">
                        {[10, 50, 100, 500, 1000, 5000].map(chip => (
                            <button 
                                key={chip} 
                                onClick={() => setSelectedChip(chip)} 
                                className={`flex-shrink-0 w-14 h-14 rounded-full border-4 flex flex-col items-center justify-center font-black text-[9px] transition-all relative overflow-hidden ${selectedChip === chip ? 'bg-yellow-500 border-white text-black scale-110 shadow-[0_0_20px_rgba(234,179,8,0.6)]' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}
                            >
                                <div className={`absolute inset-0 opacity-20 bg-[radial-gradient(circle,transparent_40%,black_100%)]`} />
                                <span className="z-10">₹{chip >= 1000 ? (chip/1000)+'K' : chip}</span>
                                <div className="w-full h-1 bg-white/20 absolute bottom-2" />
                            </button>
                        ))}
                    </div>
                    {confirmTarget && gameState.status === 'BETTING' && !isBettingLocked && (
                        <button onClick={confirmBetAction} className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-black text-xs uppercase animate-in slide-in-from-right">Place Bet</button>
                    )}
                </div>
            </div>

            {/* Confirm Drawer */}
            {confirmDrawerOpen && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/85 backdrop-blur-md">
                    <div className="bg-[#111] w-full max-w-md rounded-t-[3.5rem] p-10 border-t-2 border-yellow-500/40 animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-8">
                             <div><h3 className="text-3xl font-black italic gold-text uppercase">Stake on {confirmTarget === 'D' ? 'Dragon' : confirmTarget === 'T' ? 'Tiger' : 'Tie'}</h3></div>
                             <button onClick={() => setConfirmDrawerOpen(false)} className="p-4 bg-slate-800 rounded-full active:scale-90"><X size={24}/></button>
                        </div>
                        <div className="flex items-center justify-between mb-8 bg-black/40 p-6 rounded-3xl border border-white/5">
                            <span className="text-zinc-500 font-black uppercase tracking-widest">Amount</span>
                            <span className="text-3xl font-black text-yellow-500">₹{selectedChip}</span>
                        </div>
                        <button onClick={confirmBetAction} className="w-full py-7 rounded-[2.5rem] bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-black uppercase tracking-[0.4em] text-2xl shadow-2xl active:scale-95 border-t-2 border-white/30">CONFIRM</button>
                    </div>
                </div>
            )}
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
                    transition: transform 0.6s;
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
                }
                .card-front { background: linear-gradient(45deg, #222, #444); border: 2px solid gold; color: gold; font-size: 2rem; font-weight: bold; }
                .card-back { background: white; color: black; transform: rotateY(180deg); border: 2px solid #ccc; }
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
