
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, HelpCircle, X, AlertCircle } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, shouldForceLoss } from '../services/mockFirebase';
import { GameResult } from '../types';

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
    const [gameState, setGameState] = useState<'IDLE' | 'DEALING' | 'RESULT'>('IDLE');
    const [selectedBet, setSelectedBet] = useState<'PLAYER' | 'BANKER' | 'TIE' | null>(null);
    const [betAmount, setBetAmount] = useState(10);
    const [playerHand, setPlayerHand] = useState<Card[]>([]);
    const [bankerHand, setBankerHand] = useState<Card[]>([]);
    const [history, setHistory] = useState<string[]>([]);
    const [showRules, setShowRules] = useState(false);
    const [showBalanceError, setShowBalanceError] = useState(false);
    
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; stopAllSounds(); };
    }, []);

    const getScore = (hand: Card[]) => {
        if (hand.length === 0) return 0;
        const total = hand.reduce((acc, c) => acc + c.value, 0);
        return total % 10;
    };

    const startRound = async () => {
        if (!selectedBet) return;
        if (userBalance < betAmount) {
            setShowBalanceError(true);
            setTimeout(() => setShowBalanceError(false), 3000);
            return;
        }

        setGameState('DEALING');
        updateBalance(-betAmount, 'BET', `Baccarat Stake: ${selectedBet}`);
        playSound('click');

        const deck = createDeck();
        const pHand = [deck.pop()!, deck.pop()!];
        const bHand = [deck.pop()!, deck.pop()!];

        setPlayerHand([pHand[0]]); playSound('dt_card');
        await new Promise(r => setTimeout(r, 600));
        setBankerHand([bHand[0]]); playSound('dt_card');
        await new Promise(r => setTimeout(r, 600));
        setPlayerHand([pHand[0], pHand[1]]); playSound('dt_card');
        await new Promise(r => setTimeout(r, 600));
        setBankerHand([bHand[0], bHand[1]]); playSound('dt_card');
        await new Promise(r => setTimeout(r, 1000));

        let pScore = getScore(pHand);
        let bScore = getScore(bHand);

        if (pScore < 8 && bScore < 8) {
            if (pScore <= 5) {
                const p3 = deck.pop()!; pHand.push(p3); setPlayerHand([...pHand]);
                pScore = getScore(pHand); playSound('dt_card');
                await new Promise(r => setTimeout(r, 800));
            }
            // Simple banker rules for clone version
            if (bScore <= 5) {
                const b3 = deck.pop()!; bHand.push(b3); setBankerHand([...bHand]);
                bScore = getScore(bHand); playSound('dt_card');
                await new Promise(r => setTimeout(r, 800));
            }
        }

        let winner: 'PLAYER' | 'BANKER' | 'TIE' = pScore > bScore ? 'PLAYER' : bScore > pScore ? 'BANKER' : 'TIE';
        if (shouldForceLoss(betAmount, userBalance)) {
            winner = selectedBet === 'PLAYER' ? 'BANKER' : 'PLAYER';
        }

        const isWin = selectedBet === winner;
        const winAmt = isWin ? betAmount * (winner === 'TIE' ? 9 : 2.0) : 0;
        
        if (isWin) { updateBalance(winAmt, 'WIN', 'Baccarat Win'); playSound('win'); }
        else playSound('loss');

        setGameState('RESULT');
        setHistory(prev => [winner.charAt(0), ...prev].slice(0, 15));
        onResult({ 
            win: isWin, 
            amount: isWin ? winAmt : betAmount, 
            game: 'Baccarat Elite',
            resultDetails: [{ label: 'Winner', value: winner }, { label: 'P-Score', value: pScore.toString() }, { label: 'B-Score', value: bScore.toString() }]
        });
        addGameHistory('Baccarat Elite', betAmount, winAmt, `Round P:${pScore} B:${bScore}`);

        setTimeout(() => { if (isMounted.current) { setGameState('IDLE'); setPlayerHand([]); setBankerHand([]); setSelectedBet(null); } }, 5000);
    };

    const CardView: React.FC<{ card: Card }> = ({ card }) => (
        <div className="w-20 h-32 sm:w-28 sm:h-40 bg-white rounded-xl flex flex-col items-center justify-center border-2 border-slate-300 shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
             <div className={`absolute top-1 left-2 font-black text-xl ${card.suit==='♥'||card.suit==='♦'?'text-red-600':'text-zinc-900'}`}>{card.rank}</div>
             <div className={`text-6xl ${card.suit==='♥'||card.suit==='♦'?'text-red-600':'text-zinc-900'}`}>{card.suit}</div>
             <div className={`absolute bottom-1 right-2 font-black text-xl rotate-180 ${card.suit==='♥'||card.suit==='♦'?'text-red-600':'text-zinc-900'}`}>{card.rank}</div>
        </div>
    );

    return (
        <div className="bg-[#051c14] min-h-screen flex flex-col font-sans text-white select-none overflow-x-hidden relative">
            {showBalanceError && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-red-600 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-red-400 animate-in slide-in-from-top-4">
                    <AlertCircle className="text-white" size={20}/>
                    <span className="font-black text-xs uppercase tracking-widest">Insufficient Balance! Please deposit to continue.</span>
                </div>
            )}

            <div className="p-4 flex justify-between bg-black/40 border-b border-white/5 shadow-lg items-center z-50">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
                <h1 className="text-sm font-black italic gold-text uppercase">BACCARAT ELITE</h1>
                <div className="bg-black/50 px-3 py-2 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono shadow-inner flex items-center gap-2">
                    <Wallet size={14} />
                    <span>₹{userBalance.toFixed(2)}</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-[url('https://www.transparenttextures.com/patterns/felt.png')]">
                 <div className="w-full flex justify-around items-start mb-16 relative z-10">
                     <div className="flex flex-col items-center gap-6">
                         <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.4em] mb-1">Player</span>
                            <div className={`text-7xl font-black italic transition-all duration-700 ${gameState==='RESULT'?'scale-125 gold-text drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]':'text-white/20'}`}>{getScore(playerHand)}</div>
                         </div>
                         <div className="flex gap-2 min-h-[9rem] sm:min-h-[12rem]">
                             {playerHand.map((c, i) => <CardView key={i} card={c} />)}
                         </div>
                     </div>

                     <div className="flex flex-col items-center gap-6">
                         <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase text-red-400 tracking-[0.4em] mb-1">Banker</span>
                            <div className={`text-7xl font-black italic transition-all duration-700 ${gameState==='RESULT'?'scale-125 gold-text drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]':'text-white/20'}`}>{getScore(bankerHand)}</div>
                         </div>
                         <div className="flex gap-2 min-h-[9rem] sm:min-h-[12rem]">
                             {bankerHand.map((c, i) => <CardView key={i} card={c} />)}
                         </div>
                     </div>
                 </div>
                 
                 <div className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl border border-white/10 relative z-10">
                    <History size={16} className="text-yellow-500/60"/>
                    <div className="flex gap-1.5">
                        {history.map((h, i) => <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${h==='P'?'bg-blue-600':h==='B'?'bg-red-600':'bg-green-600'} shadow-lg`}>{h}</span>)}
                    </div>
                 </div>
            </div>

            <div className="bg-[#111] p-6 pb-12 border-t border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,1)] z-50">
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <button onClick={() => setGameState('IDLE') || setSelectedBet('PLAYER')} disabled={gameState === 'DEALING'} className={`h-28 rounded-3xl border-b-8 transition-all active:scale-95 flex flex-col items-center justify-center ${selectedBet === 'PLAYER' ? 'bg-blue-600 border-blue-800 scale-105 shadow-2xl' : 'bg-zinc-900 border-zinc-950 opacity-40 grayscale'}`}>
                        <span className="text-2xl font-black italic">PLAYER</span>
                        <span className="text-[10px] font-black opacity-60 mt-1">2.0X</span>
                    </button>
                    <button onClick={() => setGameState('IDLE') || setSelectedBet('TIE')} disabled={gameState === 'DEALING'} className={`h-28 rounded-3xl border-b-8 transition-all active:scale-95 flex flex-col items-center justify-center ${selectedBet === 'TIE' ? 'bg-green-600 border-green-800 scale-105 shadow-2xl' : 'bg-zinc-900 border-zinc-950 opacity-40 grayscale'}`}>
                        <span className="text-2xl font-black italic">TIE</span>
                        <span className="text-[10px] font-black opacity-60 mt-1">9.0X</span>
                    </button>
                    <button onClick={() => setGameState('IDLE') || setSelectedBet('BANKER')} disabled={gameState === 'DEALING'} className={`h-28 rounded-3xl border-b-8 transition-all active:scale-95 flex flex-col items-center justify-center ${selectedBet === 'BANKER' ? 'bg-red-600 border-red-800 scale-105 shadow-2xl' : 'bg-zinc-900 border-zinc-950 opacity-40 grayscale'}`}>
                        <span className="text-2xl font-black italic">BANKER</span>
                        <span className="text-[10px] font-black opacity-60 mt-1">2.0X</span>
                    </button>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar py-1">
                        {[10, 100, 500, 1000, 5000].map(a => <button key={a} onClick={() => setBetAmount(a)} className={`px-5 py-3 rounded-2xl font-black text-xs border transition-all ${betAmount === a ? 'bg-yellow-500 text-black border-white' : 'bg-zinc-900 text-zinc-600'}`}>₹{a >= 1000 ? `${a/1000}K` : a}</button>)}
                    </div>
                    <button onClick={startRound} disabled={!selectedBet || gameState !== 'IDLE'} className="px-10 py-5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-3xl font-black uppercase tracking-widest shadow-2xl active:scale-95 disabled:opacity-30 text-lg">STAKE</button>
                </div>
            </div>
            <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
        </div>
    );
};
export default Baccarat;
