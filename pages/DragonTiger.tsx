
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, X, AlertCircle } from 'lucide-react';
import { updateBalance, subscribeToDragonTiger, playSound, addGameHistory, stopAllSounds, getGameHistory } from '../services/mockFirebase';
import { DragonTigerState, GameResult, GameHistoryItem } from '../types';

interface Props {
    onBack: () => void;
    userBalance: number;
    username: string;
    onResult: (r: GameResult) => void;
}

type BetTarget = 'D' | 'T' | 'Tie' | 'D_EVEN' | 'D_ODD' | 'T_EVEN' | 'T_ODD';

interface UserBet {
    id: string;
    target: BetTarget;
    amount: number;
}

const DragonTiger: React.FC<Props> = ({ onBack, userBalance, username, onResult }) => {
    const [gameState, setGameState] = useState<DragonTigerState | null>(null);
    const [selectedChip, setSelectedChip] = useState(10);
    const [myBets, setMyBets] = useState<UserBet[]>([]);
    const [showDragon, setShowDragon] = useState(false);
    const [showTiger, setShowTiger] = useState(false);
    const [confirmDrawerOpen, setConfirmDrawerOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<BetTarget | null>(null);
    const [localHistory, setLocalHistory] = useState<GameHistoryItem[]>([]);

    const isMounted = useRef(true);
    const resultHandledRef = useRef<string | null>(null);

    useEffect(() => {
        isMounted.current = true;
        const unsub = subscribeToDragonTiger((state) => {
            if (!isMounted.current) return;
            setGameState(state);
            if (state.status === 'BETTING') {
                setShowDragon(false); setShowTiger(false); resultHandledRef.current = null;
                if (state.timeLeft <= 5 && state.timeLeft > 0) playSound('wingo_tick');
            }
            if (state.status === 'RESULT' && resultHandledRef.current !== state.period) {
                resultHandledRef.current = state.period;
                handleRevealingSequence(state);
            }
        });
        
        const unsubH = getGameHistory('Dragon Tiger', (data) => {
            if(isMounted.current) setLocalHistory(data);
        });

        return () => { isMounted.current = false; unsub(); unsubH(); stopAllSounds(); };
    }, []);

    const handleRevealingSequence = async (state: DragonTigerState) => {
        await new Promise(r => setTimeout(r, 800));
        if (!isMounted.current) return;
        setShowDragon(true);
        playSound('dt_card');
        await new Promise(r => setTimeout(r, 1200));
        if (!isMounted.current) return;
        setShowTiger(true);
        playSound('dt_card');
        await new Promise(r => setTimeout(r, 1000));
        if (isMounted.current && myBets.length > 0) {
            playSound('dt_draw');
            processMyResult(state);
        }
    };

    const processMyResult = (state: DragonTigerState) => {
        const dVal = state.dragonCard || 0;
        const tVal = state.tigerCard || 0;
        const winner = dVal > tVal ? 'D' : tVal > dVal ? 'T' : 'Tie';
        let totalWin = 0; let totalBet = 0;
        myBets.forEach(bet => {
            totalBet += bet.amount;
            if (bet.target === winner) totalWin += bet.amount * (winner === 'Tie' ? 9 : 2);
        });
        const hasWon = totalWin > 0;
        if (hasWon) { updateBalance(totalWin, 'WIN', 'Dragon Tiger Win'); playSound('win'); onResult({ win: true, amount: totalWin, game: 'Dragon Tiger' }); }
        else { playSound('loss'); onResult({ win: false, amount: totalBet, game: 'Dragon Tiger' }); }
        addGameHistory('Dragon Tiger', totalBet, totalWin, `Period: ${state.period}`);
        setMyBets([]);
    };

    const handleTargetClick = (target: BetTarget) => {
        if (gameState?.status !== 'BETTING' || gameState!.timeLeft <= 2) return;
        setConfirmTarget(target);
        setConfirmDrawerOpen(true);
        playSound('click');
    };

    const confirmBetAction = () => {
        if (selectedChip > userBalance) { alert("Insufficient Balance"); return; }
        updateBalance(-selectedChip, 'BET', `DT Bet on ${confirmTarget}`);
        setMyBets(prev => [...prev, { id: Date.now().toString(), target: confirmTarget!, amount: selectedChip }]);
        setConfirmDrawerOpen(false);
        playSound('click');
    };

    const getCardRank = (val: number | null) => {
        if (val === null || val === undefined) return '?';
        if (val === 1) return 'A';
        if (val === 11) return 'J';
        if (val === 12) return 'Q';
        if (val === 13) return 'K';
        return val.toString();
    };

    if (!gameState) return <div className="min-h-screen bg-black flex items-center justify-center font-black gold-text">Syncing Arena...</div>;

    return (
        <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white select-none overflow-hidden relative">
            <div className="p-4 flex justify-between items-center bg-[#111827] border-b border-yellow-500/20 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={20}/></button>
                    <h1 className="text-lg font-black gold-text uppercase tracking-widest italic">DRAGON TIGER</h1>
                </div>
                <div className="bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono shadow-inner italic">₹{userBalance.toFixed(2)}</div>
            </div>

            <div className="flex-1 bg-gradient-to-b from-[#064e3b] via-[#0a0f1d] to-[#0a0f1d] flex flex-col items-center py-8 gap-6 relative overflow-y-auto no-scrollbar pb-72">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-black shadow-2xl bg-black/40 ${gameState.status === 'BETTING' ? 'border-green-500 text-green-500' : 'border-red-600 text-red-600 animate-pulse'}`}>
                        <span className="text-2xl font-mono">{gameState.timeLeft}</span>
                    </div>
                </div>

                <div className="flex justify-center items-center gap-10 w-full px-4 mt-12">
                    <div className={`w-32 h-48 rounded-2xl border-4 transition-all duration-700 relative overflow-hidden flex flex-col items-center justify-center shadow-2xl ${showDragon ? 'bg-white border-red-500 scale-105' : 'bg-slate-900 border-white/10'}`}>
                        {showDragon ? (
                            <>
                                <span className="absolute top-2 left-3 font-black text-3xl text-red-600">{getCardRank(gameState.dragonCard)}</span>
                                <span className="text-8xl text-red-600">♦</span>
                                <span className="absolute bottom-2 font-black text-xs text-red-500 tracking-widest uppercase">Dragon</span>
                            </>
                        ) : <div className="text-6xl font-black text-white/5 italic">D</div>}
                    </div>
                    <span className="text-3xl font-black italic gold-text">VS</span>
                    <div className={`w-32 h-48 rounded-2xl border-4 transition-all duration-700 relative overflow-hidden flex flex-col items-center justify-center shadow-2xl ${showTiger ? 'bg-white border-orange-500 scale-105' : 'bg-slate-900 border-white/10'}`}>
                        {showTiger ? (
                            <>
                                <span className="absolute top-2 left-3 font-black text-3xl text-zinc-900">{getCardRank(gameState.tigerCard)}</span>
                                <span className="text-8xl text-zinc-900">♠</span>
                                <span className="absolute bottom-2 font-black text-xs text-orange-500 tracking-widest uppercase">Tiger</span>
                            </>
                        ) : <div className="text-6xl font-black text-white/5 italic">T</div>}
                    </div>
                </div>

                <div className="w-full px-6">
                    <div className="flex items-center gap-2 mb-3 text-zinc-500">
                        <History size={16} className="text-yellow-500/50" />
                        <span className="text-[10px] font-black uppercase tracking-widest">History</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
                        {gameState.history.map((h, i) => (
                            <span key={i} className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-lg ${h==='D'?'bg-red-600':h==='T'?'bg-orange-600':'bg-green-600'}`}>{h}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-[#111] p-4 border-t border-white/10 z-[60] fixed bottom-0 left-0 w-full shadow-[0_-20px_60px_rgba(0,0,0,1)] pb-10">
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <BetButton target="D" label="DRAGON" mult="2.0X" color="bg-red-950/40 border-red-700" bets={myBets} onClick={handleTargetClick} status={gameState.status} />
                    <BetButton target="Tie" label="TIE" mult="9.0X" color="bg-green-950/40 border-green-700" bets={myBets} onClick={handleTargetClick} status={gameState.status} />
                    <BetButton target="T" label="TIGER" mult="2.0X" color="bg-orange-950/40 border-orange-700" bets={myBets} onClick={handleTargetClick} status={gameState.status} />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                    {[10, 50, 100, 500, 1000].map(chip => (
                        <button key={chip} onClick={() => setSelectedChip(chip)} className={`flex-shrink-0 w-14 h-14 rounded-full border-4 flex items-center justify-center font-black text-xs transition-all ${selectedChip === chip ? 'bg-yellow-500 border-white text-black scale-110 shadow-2xl' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>₹{chip}</button>
                    ))}
                </div>
            </div>

            {confirmDrawerOpen && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/85 backdrop-blur-md">
                    <div className="bg-[#111] w-full max-w-md rounded-t-[3.5rem] p-10 border-t-2 border-yellow-500/40 animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-8">
                             <div><h3 className="text-3xl font-black italic gold-text uppercase">Stake on {confirmTarget}</h3></div>
                             <button onClick={() => setConfirmDrawerOpen(false)} className="p-4 bg-slate-800 rounded-full active:scale-90"><X size={24}/></button>
                        </div>
                        <button onClick={confirmBetAction} className="w-full py-7 rounded-[2.5rem] bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-black uppercase tracking-[0.4em] text-2xl shadow-2xl active:scale-95 border-t-2 border-white/30">CONFIRM ₹{selectedChip}</button>
                    </div>
                </div>
            )}
            <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
        </div>
    );
};

const BetButton = ({ target, label, mult, color, bets, onClick, status }: any) => {
    const amount = bets.filter((b:any)=>b.target===target).reduce((a:number,b:any)=>a+b.amount,0);
    return (
        <button onClick={() => onClick(target)} disabled={status !== 'BETTING'} className={`h-28 rounded-3xl border-b-[8px] transition-all active:scale-95 flex flex-col items-center justify-center ${status === 'BETTING' ? color : 'bg-slate-900 opacity-40 grayscale'}`}>
            <span className="text-lg font-black italic">{label}</span>
            <span className="text-[8px] font-black opacity-60 uppercase">{mult}</span>
            {amount > 0 && <div className="mt-2 bg-yellow-500 text-black px-3 py-1 rounded-full text-[9px] font-black animate-in zoom-in shadow-lg">₹{amount}</div>}
        </button>
    );
};

export default DragonTiger;
