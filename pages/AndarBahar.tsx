
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, Volume2, VolumeX, ShieldCheck, Timer, CreditCard } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, getMuteStatus, toggleMute } from '../services/mockFirebase';
import { GameResult } from '../types';

interface Props {
  onBack: () => void;
  userBalance: number;
  onResult: (r: GameResult) => void;
}

type Card = { rank: string; suit: string; value: number; id: string };
const SUITS = ['♠', '♣', '♥', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const createDeck = (): Card[] => {
    let deck: Card[] = [];
    SUITS.forEach(suit => {
        RANKS.forEach((rank, idx) => {
            deck.push({ rank, suit, value: idx + 1, id: `${rank}${suit}-${Math.random()}` });
        });
    });
    return deck.sort(() => Math.random() - 0.5);
};

const AndarBahar: React.FC<Props> = ({ onBack, userBalance, onResult }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [selectedSide, setSelectedSide] = useState<'ANDAR' | 'BAHAR' | null>(null);
  const [gameState, setGameState] = useState<'BETTING' | 'DEALING' | 'RESULT'>('BETTING');
  const [joker, setJoker] = useState<Card | null>(null);
  const [andarCards, setAndarCards] = useState<Card[]>([]);
  const [baharCards, setBaharCards] = useState<Card[]>([]);
  const [history, setHistory] = useState<('A' | 'B')[]>(['A', 'B', 'B', 'A', 'B', 'A']);
  const [muted, setMuted] = useState(getMuteStatus());
  const [timeLeft, setTimeLeft] = useState(15);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const interval = setInterval(() => {
        if (gameState === 'BETTING') {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (selectedSide) startRound();
                    return 15;
                }
                return prev - 1;
            });
        }
    }, 1000);
    return () => { isMounted.current = false; clearInterval(interval); stopAllSounds(); };
  }, [gameState, selectedSide]);

  const startRound = async () => {
    if (!selectedSide || userBalance < betAmount) return;
    
    setGameState('DEALING');
    updateBalance(-betAmount, 'BET', `Andar Bahar on ${selectedSide}`);
    playSound('click');

    const deck = createDeck();
    const jokerCard = deck.pop()!;
    setJoker(jokerCard);
    setAndarCards([]);
    setBaharCards([]);

    await new Promise(r => setTimeout(r, 600));

    let turn: 'A' | 'B' = 'A';
    let winner: 'ANDAR' | 'BAHAR' | null = null;

    while (!winner && deck.length > 0) {
        if (!isMounted.current) break;
        const nextCard = deck.pop()!;
        playSound('tick');

        if (turn === 'A') {
            setAndarCards(prev => [nextCard, ...prev]);
            if (nextCard.rank === jokerCard.rank) winner = 'ANDAR';
            turn = 'B';
        } else {
            setBaharCards(prev => [nextCard, ...prev]);
            if (nextCard.rank === jokerCard.rank) winner = 'BAHAR';
            turn = 'A';
        }
        await new Promise(r => setTimeout(r, 400));
    }

    if (winner && isMounted.current) {
        const isWin = selectedSide === winner;
        const winAmount = isWin ? betAmount * 1.98 : 0;
        setGameState('RESULT');
        if (isWin) { updateBalance(winAmount, 'WIN', 'Andar Bahar Win'); playSound('win'); }
        else playSound('loss');

        setHistory(prev => [winner === 'ANDAR' ? ('A' as const) : ('B' as const), ...prev].slice(0, 15));
        onResult({ win: isWin, amount: isWin ? winAmount : betAmount, game: 'Andar Bahar' });
        addGameHistory('Andar Bahar', betAmount, winAmount, `Match: ${jokerCard.rank} on ${winner}`);

        setTimeout(() => {
            if(isMounted.current) {
                setGameState('BETTING');
                setTimeLeft(15);
                setJoker(null);
                setAndarCards([]);
                setBaharCards([]);
                setSelectedSide(null);
            }
        }, 3000);
    }
  };

  return (
    <div className="bg-[#064e3b] min-h-screen flex flex-col font-sans text-white select-none overflow-hidden relative">
      <div className="p-3 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 z-50">
        <button onClick={onBack} className="p-2 bg-slate-800/80 rounded-2xl active:scale-90 transition-all border border-white/10"><ArrowLeft size={18}/></button>
        <div className="text-center">
            <h1 className="text-lg font-black italic gold-text tracking-widest uppercase">ANDAR BAHAR</h1>
            <p className="text-[6px] text-zinc-300 font-bold uppercase tracking-[0.4em]">Fast 15s Cycle</p>
        </div>
        <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-2xl border border-yellow-500/20 shadow-inner">
          <Wallet size={12} className="text-yellow-500" />
          <span className="text-xs font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center p-2 relative">
        <div className="mt-4 flex flex-col items-center gap-2">
            <div className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center font-black ${gameState === 'BETTING' ? 'border-green-500 text-green-500' : 'border-red-600 text-red-600 animate-pulse'}`}>
                <span className="text-[8px] opacity-60">TIME</span>
                <span className="text-3xl leading-none">{timeLeft}s</span>
            </div>
            
            <div className="w-24 h-32 rounded-2xl border-4 border-dashed border-yellow-500/30 flex items-center justify-center relative bg-black/30 mt-4">
                {joker ? (
                    <div className="bg-white rounded-lg flex flex-col items-center justify-center w-20 h-28 border-2 border-yellow-400">
                        <span className={`text-2xl font-black ${joker.suit==='♥'||joker.suit==='♦'?'text-red-600':'text-black'}`}>{joker.rank}</span>
                        <span className={`text-xl ${joker.suit==='♥'||joker.suit==='♦'?'text-red-600':'text-black'}`}>{joker.suit}</span>
                    </div>
                ) : <span className="text-yellow-500/20 font-black text-xl">TRUMP</span>}
            </div>
        </div>

        <div className="w-full mt-6 grid grid-cols-2 gap-4 h-48 overflow-hidden pt-4">
            <div className="flex flex-col items-center gap-2">
                 <h4 className="text-[10px] font-black uppercase text-red-500">Andar</h4>
                 <div className="flex flex-col items-center relative w-full h-full">
                    {andarCards.slice(0, 5).map((c, i) => (
                        <div key={c.id} className="absolute bg-white rounded-md w-12 h-18 border border-slate-300 flex flex-col items-center justify-center" style={{ top: `${i * 10}px`, zIndex: 100 - i }}>
                             <span className={`text-sm font-black ${c.suit==='♥'||c.suit==='♦'?'text-red-600':'text-black'}`}>{c.rank}</span>
                        </div>
                    ))}
                 </div>
            </div>
            <div className="flex flex-col items-center gap-2">
                 <h4 className="text-[10px] font-black uppercase text-blue-500">Bahar</h4>
                 <div className="flex flex-col items-center relative w-full h-full">
                    {baharCards.slice(0, 5).map((c, i) => (
                        <div key={c.id} className="absolute bg-white rounded-md w-12 h-18 border border-slate-300 flex flex-col items-center justify-center" style={{ top: `${i * 10}px`, zIndex: 100 - i }}>
                             <span className={`text-sm font-black ${c.suit==='♥'||c.suit==='♦'?'text-red-600':'text-black'}`}>{c.rank}</span>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
      </div>

      <div className="bg-[#111] p-6 pb-12 border-t border-white/10">
        <div className="flex gap-4 mb-6">
             <button onClick={() => gameState === 'BETTING' && setSelectedSide('ANDAR')} className={`flex-1 h-28 rounded-3xl border-b-8 transition-all active:scale-95 flex flex-col items-center justify-center ${selectedSide === 'ANDAR' ? 'bg-red-600 border-red-800 shadow-xl' : 'bg-slate-800 border-slate-900 opacity-60'}`}>
                <span className="text-2xl font-black italic">ANDAR</span>
                <span className="text-xs font-bold opacity-60">1.98X</span>
             </button>
             <button onClick={() => gameState === 'BETTING' && setSelectedSide('BAHAR')} className={`flex-1 h-28 rounded-3xl border-b-8 transition-all active:scale-95 flex flex-col items-center justify-center ${selectedSide === 'BAHAR' ? 'bg-blue-600 border-blue-800 shadow-xl' : 'bg-slate-800 border-slate-900 opacity-60'}`}>
                <span className="text-2xl font-black italic">BAHAR</span>
                <span className="text-xs font-bold opacity-60">1.98X</span>
             </button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
            {[10, 100, 500, 1000].map(a => <button key={a} onClick={() => setBetAmount(a)} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${betAmount === a ? 'bg-yellow-500 text-black shadow-lg scale-105' : 'bg-zinc-900 text-zinc-600'}`}>₹{a}</button>)}
        </div>
      </div>
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};

export default AndarBahar;
