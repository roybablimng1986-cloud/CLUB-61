
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, HelpCircle, X, ShieldAlert, RotateCw } from 'lucide-react';
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
            if (val >= 10) val = 0; // 10, J, Q, K are worth 0
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
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; stopAllSounds(); };
    }, []);

    const getScore = (hand: Card[]) => {
        const total = hand.reduce((acc, c) => acc + c.value, 0);
        return total % 10;
    };

    const startRound = async () => {
        if (!selectedBet || userBalance < betAmount) return;
        setGameState('DEALING');
        updateBalance(-betAmount, 'BET', `Baccarat on ${selectedBet}`);
        playSound('click');

        const deck = createDeck();
        const pHand = [deck.pop()!, deck.pop()!];
        const bHand = [deck.pop()!, deck.pop()!];

        setPlayerHand([pHand[0]]);
        await new Promise(r => setTimeout(r, 600));
        setBankerHand([bHand[0]]);
        await new Promise(r => setTimeout(r, 600));
        setPlayerHand([pHand[0], pHand[1]]);
        await new Promise(r => setTimeout(r, 600));
        setBankerHand([bHand[0], bHand[1]]);
        await new Promise(r => setTimeout(r, 1000));

        let pScore = getScore(pHand);
        let bScore = getScore(bHand);

        let pThird: Card | null = null;
        if (pScore < 8 && bScore < 8) {
            if (pScore <= 5) {
                pThird = deck.pop()!;
                pHand.push(pThird);
                setPlayerHand([...pHand]);
                pScore = getScore(pHand);
                await new Promise(r => setTimeout(r, 800));
            }
            let drawBanker = false;
            if (!pThird) {
                if (bScore <= 5) drawBanker = true;
            } else {
                const pv = pThird.value;
                if (bScore <= 2) drawBanker = true;
                else if (bScore === 3 && pv !== 8) drawBanker = true;
                else if (bScore === 4 && [2,3,4,5,6,7].includes(pv)) drawBanker = true;
                else if (bScore === 5 && [4,5,6,7].includes(pv)) drawBanker = true;
                else if (bScore === 6 && [6,7].includes(pv)) drawBanker = true;
            }
            if (drawBanker) {
                bHand.push(deck.pop()!);
                setBankerHand([...bHand]);
                bScore = getScore(bHand);
                await new Promise(r => setTimeout(r, 800));
            }
        }

        let winner: 'PLAYER' | 'BANKER' | 'TIE' = pScore > bScore ? 'PLAYER' : bScore > pScore ? 'BANKER' : 'TIE';
        if (shouldForceLoss(betAmount, userBalance)) {
            if (selectedBet === winner) {
                if (winner === 'PLAYER') winner = 'BANKER';
                else if (winner === 'BANKER') winner = 'PLAYER';
                else winner = Math.random() > 0.5 ? 'PLAYER' : 'BANKER';
            }
        }

        const isWin = selectedBet === winner;
        let winMult = winner === 'TIE' ? 9 : 2.0; // BOTH SIDES NOW 2.0X AS REQUESTED

        const winAmt = isWin ? betAmount * winMult : 0;
        if (isWin) { updateBalance(winAmt, 'WIN', 'Baccarat Win'); playSound('win'); }
        else playSound('loss');

        setGameState('RESULT');
        setHistory(prev => [winner.charAt(0), ...prev].slice(0, 10));
        onResult({ win: isWin, amount: isWin ? winAmt : betAmount, game: 'Baccarat Elite' });
        addGameHistory('Baccarat Elite', betAmount, winAmt, `Final - P:${pScore} | B:${bScore}`);

        setTimeout(() => {
            if (isMounted.current) {
                setGameState('IDLE');
                setPlayerHand([]);
                setBankerHand([]);
                setSelectedBet(null);
            }
        }, 4000);
    };

    return (
        <div className="bg-[#051c14] min-h-screen flex flex-col font-sans text-white select-none overflow-x-hidden">
            <div className="p-4 flex justify-between bg-black/40 border-b border-white/5 shadow-lg items-center">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={18}/></button>
                    <h1 className="text-sm font-black italic gold-text uppercase tracking-widest">BACCARAT ELITE</h1>
                </div>
                <div className="flex gap-2 items-center">
                    <button onClick={() => setShowRules(true)} className="p-2 bg-slate-800 rounded-xl"><HelpCircle size={18}/></button>
                    <div className="bg-black/50 px-3 py-1.5 rounded-xl text-yellow-500 font-mono text-sm border border-yellow-500/20">₹{userBalance.toFixed(2)}</div>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                 <div className="w-full flex justify-around mb-12">
                     <div className="flex flex-col items-center gap-4">
                         <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em]">PLAYER</span>
                         <div className={`text-6xl font-black transition-all duration-500 ${gameState==='RESULT'?'scale-110 text-white':'text-white/30'}`}>{getScore(playerHand)}</div>
                         <div className="flex gap-1.5 h-24">
                             {playerHand.map((c, i) => (
                                 <div key={i} className="w-16 h-24 bg-white rounded-lg flex flex-col items-center justify-center border-2 border-blue-500 shadow-2xl animate-in zoom-in">
                                     <span className={`text-2xl font-black ${c.suit==='♥'||c.suit==='♦'?'text-red-600':'text-black'}`}>{c.rank}</span>
                                     <span className={`text-lg ${c.suit==='♥'||c.suit==='♦'?'text-red-600':'text-black'}`}>{c.suit}</span>
                                 </div>
                             ))}
                             {playerHand.length === 0 && <div className="w-16 h-24 bg-black/20 border-2 border-dashed border-white/10 rounded-lg"></div>}
                         </div>
                     </div>
                     <div className="flex flex-col items-center gap-4">
                         <span className="text-[10px] font-black uppercase text-red-400 tracking-[0.3em]">BANKER</span>
                         <div className={`text-6xl font-black transition-all duration-500 ${gameState==='RESULT'?'scale-110 text-white':'text-white/30'}`}>{getScore(bankerHand)}</div>
                         <div className="flex gap-1.5 h-24">
                             {bankerHand.map((c, i) => (
                                 <div key={i} className="w-16 h-24 bg-white rounded-lg flex flex-col items-center justify-center border-2 border-red-500 shadow-2xl animate-in zoom-in">
                                     <span className={`text-2xl font-black ${c.suit==='♥'||c.suit==='♦'?'text-red-600':'text-black'}`}>{c.rank}</span>
                                     <span className={`text-lg ${c.suit==='♥'||c.suit==='♦'?'text-red-600':'text-black'}`}>{c.suit}</span>
                                 </div>
                             ))}
                             {bankerHand.length === 0 && <div className="w-16 h-24 bg-black/20 border-2 border-dashed border-white/10 rounded-lg"></div>}
                         </div>
                     </div>
                 </div>
                 
                 <div className="flex gap-2 bg-black/20 p-2 rounded-full border border-white/5">
                    {history.map((h, i) => <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${h==='P'?'bg-blue-600':h==='B'?'bg-red-600':'bg-green-600'} shadow-lg border border-white/10`}>{h}</span>)}
                    {history.length === 0 && <span className="text-[9px] text-zinc-500 px-4">No Session Logs</span>}
                 </div>
            </div>

            <div className="bg-[#111] p-6 pb-12 border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <button onClick={() => setGameState('IDLE') || setSelectedBet('PLAYER')} className={`h-28 rounded-[2rem] border-b-8 flex flex-col items-center justify-center transition-all ${selectedBet === 'PLAYER' ? 'bg-blue-600 border-blue-800 scale-105 shadow-xl' : 'bg-slate-900 border-slate-950 opacity-40'}`}>
                        <span className="text-xl font-black italic tracking-tight">PLAYER</span>
                        <span className="text-[10px] opacity-60 font-black tracking-widest mt-1">2.0X</span>
                    </button>
                    <button onClick={() => setGameState('IDLE') || setSelectedBet('TIE')} className={`h-28 rounded-[2rem] border-b-8 flex flex-col items-center justify-center transition-all ${selectedBet === 'TIE' ? 'bg-green-600 border-green-800 scale-105 shadow-xl' : 'bg-slate-900 border-slate-950 opacity-40'}`}>
                        <span className="text-xl font-black italic tracking-tight">TIE</span>
                        <span className="text-[10px] opacity-60 font-black tracking-widest mt-1">9.0X</span>
                    </button>
                    <button onClick={() => setGameState('IDLE') || setSelectedBet('BANKER')} className={`h-28 rounded-[2rem] border-b-8 flex flex-col items-center justify-center transition-all ${selectedBet === 'BANKER' ? 'bg-red-600 border-red-800 scale-105 shadow-xl' : 'bg-slate-900 border-slate-950 opacity-40'}`}>
                        <span className="text-xl font-black italic tracking-tight">BANKER</span>
                        <span className="text-[10px] opacity-60 font-black tracking-widest mt-1">2.0X</span>
                    </button>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar py-1">
                        {[10, 100, 500, 1000, 5000].map(a => <button key={a} onClick={() => setBetAmount(a)} className={`px-5 py-3 rounded-xl font-black text-xs border transition-all ${betAmount === a ? 'bg-white text-black border-white shadow-lg' : 'bg-zinc-800 text-zinc-600 border-white/5'}`}>₹{a >= 1000 ? `${a/1000}K` : a}</button>)}
                    </div>
                    <button onClick={startRound} disabled={!selectedBet || gameState !== 'IDLE'} className="px-10 py-5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-30 border-t-2 border-white/30">DEAL</button>
                </div>
            </div>

            {showRules && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
                    <div className="bg-[#051c14] border-2 border-yellow-500/30 w-full max-w-sm p-8 rounded-[3rem] shadow-2xl animate-in zoom-in">
                         <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                             <h2 className="text-2xl font-black text-yellow-500 italic uppercase tracking-tighter">BACCARAT RULES</h2>
                             <button onClick={() => setShowRules(false)} className="p-2 bg-slate-800 rounded-full"><X size={20}/></button>
                         </div>
                         <div className="space-y-4 text-sm text-emerald-100 font-medium leading-relaxed">
                             <p>1. Predict which hand will have a score closest to <span className="text-yellow-500 font-bold">9</span>.</p>
                             <p>2. Cards <span className="text-white font-bold">10, J, Q, K</span> are worth <span className="text-yellow-500">0</span>. Aces are <span className="text-yellow-500">1</span>.</p>
                             <p>3. If the score exceeds 9, only the last digit counts.</p>
                             <div className="bg-black/30 p-4 rounded-xl border border-white/10 mt-4">
                                <h4 className="text-xs font-black text-yellow-500 mb-2 uppercase tracking-widest">Payouts</h4>
                                <div className="flex justify-between"><span>Player/Banker</span><span className="font-bold">2.0x</span></div>
                                <div className="flex justify-between"><span>Tie Win</span><span className="font-bold">9.0x</span></div>
                             </div>
                         </div>
                    </div>
                </div>
            )}
            <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
        </div>
    );
};
export default Baccarat;
