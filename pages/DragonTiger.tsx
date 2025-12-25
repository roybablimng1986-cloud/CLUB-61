
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, Loader2, X, RotateCcw, Trash2, HelpCircle, Trophy } from 'lucide-react';
import { updateBalance, subscribeToDragonTiger, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
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
        return () => { isMounted.current = false; unsub(); stopAllSounds(); };
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
        const dVal = state.dragonCard!;
        const tVal = state.tigerCard!;
        const winner = dVal > tVal ? 'D' : tVal > dVal ? 'T' : 'Tie';
        let totalWin = 0; let totalBet = 0;
        myBets.forEach(bet => {
            totalBet += bet.amount;
            if (bet.target === winner) totalWin += bet.amount * (winner === 'Tie' ? 9 : 2);
        });
        if (totalWin > 0) { updateBalance(totalWin, 'WIN', 'DT Win'); playSound('win'); onResult({ win: true, amount: totalWin, game: 'Dragon Tiger' }); }
        else { playSound('loss'); onResult({ win: false, amount: totalBet, game: 'Dragon Tiger' }); }
        addGameHistory('Dragon Tiger', totalBet, totalWin, `Result: ${winner}`);
        setMyBets([]);
    };

    const handleTargetClick = (target: 'D' | 'T' | 'Tie') => {
        if (gameState?.status !== 'BETTING') return;
        setConfirmTarget(target); setConfirmAmount(selectedChip); setConfirmDrawerOpen(true);
        playSound('click');
    };

    const confirmBetAction = () => {
        if (confirmAmount > userBalance) return alert("Low Balance");
        updateBalance(-confirmAmount, 'BET', `DT: ${confirmTarget}`);
        setMyBets(prev => [...prev, { id: Date.now().toString(), target: confirmTarget!, amount: confirmAmount }]);
        setConfirmDrawerOpen(false);
        playSound('click');
    };

    if (!gameState) return <div className="min-h-screen bg-black flex items-center justify-center font-black gold-text animate-pulse">Entering Arena...</div>;

    return (
        <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white select-none overflow-hidden relative">
            <div className="p-4 flex justify-between items-center bg-[#111827] border-b border-yellow-500/20 shadow-2xl relative z-50">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={20}/></button>
                <div className="bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono">₹{userBalance.toFixed(2)}</div>
            </div>

            <div className="flex-1 bg-gradient-to-b from-[#064e3b] via-[#0a0f1d] to-[#0a0f1d] flex flex-col items-center justify-center gap-12">
                <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center font-black ${gameState.status === 'BETTING' ? 'border-green-500 text-green-500' : 'border-red-600 text-red-600 animate-pulse'}`}>
                    <span className="text-4xl italic">{gameState.timeLeft}</span>
                </div>

                <div className="flex justify-center items-center gap-8 w-full px-4">
                    <div className={`w-32 h-48 rounded-2xl border-4 transition-all duration-700 ${showDragon ? 'border-red-500 bg-white' : 'border-white/10 bg-slate-900'} flex items-center justify-center shadow-2xl overflow-hidden relative`}>
                        {showDragon ? <span className="text-7xl font-black text-red-600">{gameState.dragonCard}</span> : <span className="text-4xl opacity-10 font-black">D</span>}
                    </div>
                    <span className="text-4xl font-black italic gold-text animate-pulse">VS</span>
                    <div className={`w-32 h-48 rounded-2xl border-4 transition-all duration-700 ${showTiger ? 'border-orange-500 bg-white' : 'border-white/10 bg-slate-900'} flex items-center justify-center shadow-2xl overflow-hidden relative`}>
                        {showTiger ? <span className="text-7xl font-black text-slate-900">{gameState.tigerCard}</span> : <span className="text-4xl opacity-10 font-black">T</span>}
                    </div>
                </div>
            </div>

            <div className="bg-[#111] p-6 border-t border-white/10 shadow-2xl z-50">
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <button onClick={() => handleTargetClick('D')} disabled={gameState.status !== 'BETTING'} className="h-32 rounded-3xl bg-red-950/40 border-red-700 border-b-8 flex flex-col items-center justify-center font-black italic text-xl text-red-500 disabled:opacity-40">DRAGON</button>
                    <button onClick={() => handleTargetClick('Tie')} disabled={gameState.status !== 'BETTING'} className="h-32 rounded-3xl bg-green-950/40 border-green-700 border-b-8 flex flex-col items-center justify-center font-black italic text-xl text-green-500 disabled:opacity-40">TIE</button>
                    <button onClick={() => handleTargetClick('T')} disabled={gameState.status !== 'BETTING'} className="h-32 rounded-3xl bg-orange-950/40 border-orange-700 border-b-8 flex flex-col items-center justify-center font-black italic text-xl text-orange-500 disabled:opacity-40">TIGER</button>
                </div>
                <button onClick={confirmBetAction} disabled={!confirmTarget} className="w-full py-6 bg-yellow-500 text-black rounded-[2rem] font-black uppercase text-xl shadow-xl border-t-2 border-white/20 active:scale-95 disabled:opacity-50">CONFIRM STAKE</button>
            </div>
        </div>
    );
};
export default DragonTiger;
