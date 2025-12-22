
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, Loader2, X, RotateCcw, Trash2, HelpCircle } from 'lucide-react';
import { updateBalance, subscribeToDragonTiger, playSound, addGameHistory } from '../services/mockFirebase';
import { DragonTigerState, GameResult } from '../types';

interface Props {
    onBack: () => void;
    userBalance: number;
    username: string;
    onResult: (r: GameResult) => void;
}

interface UserBet {
    id: string;
    target: 'D' | 'T' | 'Tie';
    amount: number;
}

const DragonTiger: React.FC<Props> = ({ onBack, userBalance, username, onResult }) => {
    const [gameState, setGameState] = useState<DragonTigerState | null>(null);
    const [selectedChip, setSelectedChip] = useState(10);
    const [myBets, setMyBets] = useState<UserBet[]>([]);
    const [showRules, setShowRules] = useState(false);
    
    const [showDragon, setShowDragon] = useState(false);
    const [showTiger, setShowTiger] = useState(false);
    
    const [confirmDrawerOpen, setConfirmDrawerOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<'D' | 'T' | 'Tie' | null>(null);
    const [confirmAmount, setConfirmAmount] = useState(10);
    const [customAmount, setCustomAmount] = useState('');

    const lastTickRef = useRef(0);
    const isMounted = useRef(true);
    const resultHandledRef = useRef<string | null>(null);

    useEffect(() => {
        isMounted.current = true;
        const unsub = subscribeToDragonTiger((state) => {
            if (!isMounted.current) return;
            setGameState(state);
            
            if (state.status === 'LOCKED') {
                setConfirmDrawerOpen(false);
            }

            if (state.status === 'BETTING') {
                setShowDragon(false);
                setShowTiger(false);
                resultHandledRef.current = null;
                if (state.timeLeft <= 5 && state.timeLeft > 0 && state.timeLeft !== lastTickRef.current) {
                    playSound('tick');
                    lastTickRef.current = state.timeLeft;
                }
            }

            if (state.status === 'RESULT' && resultHandledRef.current !== state.period) {
                resultHandledRef.current = state.period;
                handleRevealingSequence(state);
            }
        });
        return () => {
            isMounted.current = false;
            unsub();
        };
    }, [myBets]);

    const handleRevealingSequence = async (state: DragonTigerState) => {
        await new Promise(r => setTimeout(r, 600));
        if (!isMounted.current) return;
        setShowDragon(true);
        playSound('click');

        await new Promise(r => setTimeout(r, 1200));
        if (!isMounted.current) return;
        setShowTiger(true);
        playSound('click');

        await new Promise(r => setTimeout(r, 1000));
        if (!isMounted.current) return;
        
        if (myBets.length > 0) {
            processMyResult(state);
        }
    };

    const processMyResult = (state: DragonTigerState) => {
        const dVal = state.dragonCard!;
        const tVal = state.tigerCard!;
        const winner = dVal > tVal ? 'D' : tVal > dVal ? 'T' : 'Tie';
        
        let totalWin = 0;
        let totalBet = 0;
        
        myBets.forEach(bet => {
            totalBet += bet.amount;
            if (bet.target === winner) {
                const multiplier = winner === 'Tie' ? 9 : 2;
                totalWin += bet.amount * multiplier;
            }
        });

        if (totalWin > 0) {
            updateBalance(totalWin, 'WIN', 'Dragon Tiger Win');
            playSound('win');
            onResult({ win: true, amount: totalWin, game: 'Dragon Tiger' });
        } else {
            playSound('loss');
            onResult({ win: false, amount: totalBet, game: 'Dragon Tiger' });
        }

        addGameHistory('Dragon Tiger', totalBet, totalWin, `D:${getCardRank(dVal)} vs T:${getCardRank(tVal)}`);
        setMyBets([]);
    };

    const handleTargetClick = (target: 'D' | 'T' | 'Tie') => {
        if (!gameState || gameState.status !== 'BETTING') return;
        setConfirmTarget(target);
        setConfirmAmount(selectedChip);
        setCustomAmount('');
        setConfirmDrawerOpen(true);
        playSound('click');
    };

    const confirmBetAction = () => {
        let finalAmount = confirmAmount;
        if (customAmount && !isNaN(parseFloat(customAmount))) {
            finalAmount = parseFloat(customAmount);
        }
        if (finalAmount > userBalance) { alert("Insufficient Balance!"); return; }
        if (finalAmount <= 0) return;

        updateBalance(-finalAmount);
        setMyBets(prev => [...prev, { 
            id: Math.random().toString(36).substr(2, 9),
            target: confirmTarget!, 
            amount: finalAmount 
        }]);
        setConfirmDrawerOpen(false);
        playSound('click');
    };

    const clearAllBets = () => {
        if (gameState?.status !== 'BETTING') return;
        const totalRefund = myBets.reduce((acc, b) => acc + b.amount, 0);
        if (totalRefund > 0) {
            updateBalance(totalRefund, 'GIFT', 'Bet Refund');
            setMyBets([]);
            playSound('click');
        }
    };

    const getCardRank = (val: number | null) => {
        if (!val) return '?';
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        return ranks[val - 1];
    };

    const groupedBets = myBets.reduce((acc, bet) => {
        acc[bet.target] = (acc[bet.target] || 0) + bet.amount;
        return acc;
    }, {} as Record<string, number>);

    if (!gameState) return (
        <div className="bg-[#0a0f1d] min-h-screen flex flex-col items-center justify-center font-sans text-white">
            <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
            <div className="text-xl font-black italic tracking-widest animate-pulse gold-text uppercase">Entering Arena...</div>
        </div>
    );

    return (
        <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white select-none overflow-hidden relative">
            <div className="p-4 flex justify-between items-center bg-[#111827] border-b border-white/5 shadow-2xl relative z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 bg-slate-800/80 rounded-2xl border border-white/10 active:scale-90 transition-all"><ArrowLeft size={20}/></button>
                    <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 shadow-inner">
                        <Wallet size={14} className="text-yellow-500" />
                        <span className="text-sm font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
                    </div>
                </div>
                <h1 className="text-sm font-black italic gold-text tracking-widest uppercase">DRAGON TIGER</h1>
                <button onClick={() => setShowRules(true)} className="p-2.5 bg-slate-800/80 rounded-2xl border border-white/10 active:scale-90 transition-all"><HelpCircle size={20}/></button>
            </div>

            <div className="flex-1 bg-gradient-to-b from-[#064e3b] via-[#0a0f1d] to-[#0a0f1d] relative overflow-hidden flex flex-col">
                <div className="bg-black/40 p-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/5 relative z-40">
                    <History size={14} className="text-yellow-500 shrink-0"/>
                    <div className="flex gap-1.5">
                        {gameState.history.map((h, i) => (
                            <span key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border border-white/10 shrink-0 ${h === 'D' ? 'bg-red-600' : h === 'T' ? 'bg-orange-600' : 'bg-green-600'} text-white shadow-lg`}>{h}</span>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center flex-1">
                    <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center font-black shadow-[0_0_40px_rgba(0,0,0,0.8)] relative transition-all duration-300 bg-black/60 backdrop-blur-xl ${gameState.status === 'BETTING' ? 'border-green-500 text-green-500 shadow-green-500/20' : 'border-red-600 text-red-600 animate-pulse'}`}>
                        <span className="text-[10px] uppercase opacity-60">TIME</span>
                        <span className="text-4xl leading-none font-mono">{gameState.timeLeft}</span>
                    </div>

                    <div className="flex justify-center items-center gap-6 mt-10 px-4 relative z-10 w-full">
                        <div className="flex flex-col items-center gap-4">
                            <div className={`card-container w-32 h-48 rounded-2xl border-4 transition-all duration-700 preserve-3d ${showDragon ? 'flipped border-red-500 shadow-red-500/40' : 'border-white/10 bg-[#1e293b]'}`}>
                               <div className="card-face card-front bg-slate-800 flex items-center justify-center rounded-xl">
                                   <div className="w-16 h-24 border-2 border-white/5 rounded-lg flex items-center justify-center text-4xl opacity-10 font-black italic">?</div>
                               </div>
                               <div className="card-face card-back bg-white flex flex-col items-center justify-center rounded-xl overflow-hidden">
                                   <div className="text-7xl font-black text-red-600 tracking-tighter">{getCardRank(gameState.dragonCard)}</div>
                                   <div className="text-[10px] font-black text-red-600/30 uppercase mt-1 tracking-widest">DRAGON</div>
                               </div>
                               <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-red-600 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border-2 border-red-400 shadow-xl z-30 uppercase">Dragon</div>
                            </div>
                        </div>

                        <div className="text-3xl font-black italic gold-text drop-shadow-2xl animate-pulse z-20">VS</div>

                        <div className="flex flex-col items-center gap-4">
                            <div className={`card-container w-32 h-48 rounded-2xl border-4 transition-all duration-700 preserve-3d ${showTiger ? 'flipped border-orange-500 shadow-orange-500/40' : 'border-white/10 bg-[#1e293b]'}`}>
                               <div className="card-face card-front bg-slate-800 flex items-center justify-center rounded-xl">
                                   <div className="w-16 h-24 border-2 border-white/5 rounded-lg flex items-center justify-center text-4xl opacity-10 font-black italic">?</div>
                               </div>
                               <div className="card-face card-back bg-white flex flex-col items-center justify-center rounded-xl overflow-hidden">
                                   <div className="text-7xl font-black text-slate-900 tracking-tighter">{getCardRank(gameState.tigerCard)}</div>
                                   <div className="text-[10px] font-black text-slate-900/20 uppercase mt-1 tracking-widest">TIGER</div>
                               </div>
                               <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-orange-600 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border-2 border-orange-400 shadow-xl z-30 uppercase">Tiger</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-4 mb-4 relative z-10">
                    <button 
                        onClick={() => handleTargetClick('D')}
                        disabled={gameState.status !== 'BETTING'}
                        className={`h-36 rounded-3xl border-b-[8px] flex flex-col items-center justify-center transition-all active:scale-95 ${gameState.status === 'BETTING' ? 'bg-red-900/40 border-red-700 shadow-2xl' : 'bg-slate-800/40 border-slate-900 opacity-30 grayscale'}`}
                    >
                        <span className="text-xl font-black text-red-500 uppercase italic">DRAGON</span>
                        <span className="text-[9px] font-black text-red-500/50 mt-1">2.0X</span>
                        {groupedBets['D'] > 0 && <div className="mt-2 bg-yellow-500 text-black px-3 py-1 rounded-full text-[10px] font-black animate-in zoom-in">₹{groupedBets['D']}</div>}
                    </button>

                    <button 
                        onClick={() => handleTargetClick('Tie')}
                        disabled={gameState.status !== 'BETTING'}
                        className={`h-36 rounded-3xl border-b-[8px] flex flex-col items-center justify-center transition-all active:scale-95 ${gameState.status === 'BETTING' ? 'bg-green-900/40 border-green-700 shadow-2xl' : 'bg-slate-800/40 border-slate-900 opacity-30 grayscale'}`}
                    >
                        <span className="text-xl font-black text-green-500 uppercase italic">TIE</span>
                        <span className="text-[9px] font-black text-green-500/50 mt-1">9.0X</span>
                        {groupedBets['Tie'] > 0 && <div className="mt-2 bg-yellow-500 text-black px-3 py-1 rounded-full text-[10px] font-black animate-in zoom-in">₹{groupedBets['Tie']}</div>}
                    </button>

                    <button 
                        onClick={() => handleTargetClick('T')}
                        disabled={gameState.status !== 'BETTING'}
                        className={`h-36 rounded-3xl border-b-[8px] flex flex-col items-center justify-center transition-all active:scale-95 ${gameState.status === 'BETTING' ? 'bg-orange-900/40 border-orange-700 shadow-2xl' : 'bg-slate-800/40 border-slate-900 opacity-30 grayscale'}`}
                    >
                        <span className="text-xl font-black text-orange-500 uppercase italic">TIGER</span>
                        <span className="text-[9px] font-black text-orange-500/50 mt-1">2.0X</span>
                        {groupedBets['T'] > 0 && <div className="mt-2 bg-yellow-500 text-black px-3 py-1 rounded-full text-[10px] font-black animate-in zoom-in">₹{groupedBets['T']}</div>}
                    </button>
                </div>
            </div>

            <div className="bg-[#111827] border-t border-white/5 p-6 shadow-[0_-20px_60px_rgba(0,0,0,1)] relative z-50 pb-10">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={clearAllBets}
                        disabled={myBets.length === 0 || gameState.status !== 'BETTING'}
                        className="w-16 h-16 rounded-2xl bg-red-600/10 border-2 border-red-600/30 text-red-500 flex flex-col items-center justify-center active:scale-90 transition-all disabled:opacity-30"
                    >
                        <Trash2 size={20} />
                        <span className="text-[8px] font-black uppercase mt-1">Clear</span>
                    </button>

                    <div className="flex-1 flex gap-3 overflow-x-auto no-scrollbar py-2">
                        {[10, 50, 100, 500, 1000, 5000].map(chip => (
                            <button 
                                key={chip}
                                onClick={() => setSelectedChip(chip)}
                                className={`flex-shrink-0 w-16 h-16 rounded-full border-4 flex items-center justify-center font-black text-xs transition-all duration-300 ${selectedChip === chip ? 'bg-yellow-500 border-white text-black scale-110 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                            >
                                {chip >= 1000 ? `${chip/1000}K` : chip}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {showRules && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-slate-900 border border-yellow-500/30 w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl">
                         <div className="flex justify-between items-center mb-8">
                             <h2 className="text-2xl font-black italic gold-text uppercase">GAME RULES</h2>
                             <button onClick={() => setShowRules(false)} className="p-2 bg-slate-800 rounded-full"><X/></button>
                         </div>
                         <div className="space-y-4 text-sm text-slate-300 leading-relaxed font-medium">
                             <p>1. <span className="text-red-500 font-bold">Dragon</span> and <span className="text-orange-500 font-bold">Tiger</span> each receive one card.</p>
                             <p>2. The side with the higher card value wins. (Ace is lowest, King is highest).</p>
                             <p>3. <span className="text-white font-bold">Payouts</span>: Dragon/Tiger wins pay <span className="text-green-500">2.0x</span>. A Tie pays <span className="text-green-500">9.0x</span>.</p>
                             <p>4. In case of a Tie, half of the Dragon/Tiger bets are returned to the user.</p>
                         </div>
                    </div>
                </div>
            )}

            {confirmDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-md p-0">
                    <div className="bg-[#111827] w-full max-w-md rounded-t-[3rem] p-8 border-t border-yellow-500/30 animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Placing Stake</p>
                                <h3 className="text-2xl font-black italic gold-text">Stake on {confirmTarget === 'D' ? 'DRAGON' : confirmTarget === 'T' ? 'TIGER' : 'TIE'}</h3>
                            </div>
                            <button onClick={() => setConfirmDrawerOpen(false)} className="p-3 bg-slate-800 rounded-full"><X size={20}/></button>
                        </div>

                        <div className="space-y-6 mb-8">
                            <div className="grid grid-cols-4 gap-2">
                                {[10, 50, 100, 500].map(amt => (
                                    <button 
                                        key={amt} 
                                        onClick={() => { setConfirmAmount(amt); setCustomAmount(''); }}
                                        className={`py-3 rounded-xl font-black text-xs border transition-all ${confirmAmount === amt && !customAmount ? 'bg-yellow-500 text-black border-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                    >
                                        ₹{amt}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest absolute -top-2 left-4 bg-[#111827] px-2">Custom Amount</label>
                                <input 
                                    type="number"
                                    placeholder="0.00"
                                    value={customAmount}
                                    onChange={(e) => { setCustomAmount(e.target.value); setConfirmAmount(0); }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white font-black text-xl outline-none focus:border-yellow-500 transition-all"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={confirmBetAction}
                            className="w-full py-5 rounded-[1.5rem] bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                        >
                            Confirm ₹{customAmount ? parseFloat(customAmount) : confirmAmount}
                        </button>
                    </div>
                </div>
            )}
            
            <style>{`
                .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .card-container { position: relative; transform-style: preserve-3d; transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .card-container.flipped { transform: rotateY(180deg); }
                .card-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 0.75rem; }
                .card-back { transform: rotateY(180deg); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .preserve-3d { transform-style: preserve-3d; }
            `}</style>
        </div>
    );
};

export default DragonTiger;
