
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, Volume2, VolumeX, Timer, X, Play } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, getMuteStatus, toggleMute, shouldForceLoss } from '../services/mockFirebase';
import { GameResult } from '../types';

interface Props {
  onBack: () => void;
  userBalance: number;
  onResult: (r: GameResult) => void;
}

type Card = { rank: string; suit: string; color: string; id: string };
const SUITS = [{ s: '♠', c: 'text-slate-900' }, { s: '♣', c: 'text-slate-900' }, { s: '♥', c: 'text-red-600' }, { s: '♦', c: 'text-red-600' }];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const createDeck = (): Card[] => {
    let deck: Card[] = [];
    SUITS.forEach(suit => {
        RANKS.forEach((rank) => {
            deck.push({ rank, suit: suit.s, color: suit.c, id: `${rank}${suit.s}-${Math.random()}` });
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
  const [history, setHistory] = useState<('A' | 'B')[]>([]);
  const [muted, setMuted] = useState(getMuteStatus());
  const [timeLeft, setTimeLeft] = useState(15);
  const [betConfirmed, setBetConfirmed] = useState(false);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const interval = setInterval(() => {
        if (!isMounted.current) return;
        
        if (gameState === 'BETTING' && betConfirmed) {
            if (timeLeft > 0) {
                setTimeLeft(prev => prev - 1);
                if (timeLeft <= 5) playSound('wingo_tick');
            } else {
                startRound();
            }
        }
    }, 1000);
    return () => { isMounted.current = false; clearInterval(interval); stopAllSounds(); };
  }, [gameState, timeLeft, betConfirmed]);

  const handlePlaceBet = () => {
    if (!selectedSide) { alert("Select a Side First!"); return; }
    if (userBalance < betAmount) { alert("Insufficient Balance!"); return; }
    setBetConfirmed(true);
    playSound('click');
  };

  const startRound = async () => {
    setGameState('DEALING');
    updateBalance(-betAmount, 'BET', `Andar Bahar on ${selectedSide}`);
    playSound('click');

    const deck = createDeck();
    const jokerCard = deck.pop()!;
    setJoker(jokerCard);

    await new Promise(r => setTimeout(r, 1000));

    let turn: 'A' | 'B' = 'A';
    let winner: 'ANDAR' | 'BAHAR' | null = null;
    let currentAndar: Card[] = [];
    let currentBahar: Card[] = [];

    while (!winner && deck.length > 0) {
        if (!isMounted.current) break;
        const nextCard = deck.pop()!;
        playSound('dt_card');

        if (turn === 'A') {
            currentAndar = [nextCard, ...currentAndar];
            setAndarCards([...currentAndar]);
            if (nextCard.rank === jokerCard.rank) winner = 'ANDAR';
            turn = 'B';
        } else {
            currentBahar = [nextCard, ...currentBahar];
            setBaharCards([...currentBahar]);
            if (nextCard.rank === jokerCard.rank) winner = 'BAHAR';
            turn = 'A';
        }
        await new Promise(r => setTimeout(r, 700));
    }

    if (winner && isMounted.current) {
        if (shouldForceLoss(betAmount, userBalance)) winner = selectedSide === 'ANDAR' ? 'BAHAR' : 'ANDAR';
        
        const isWin = selectedSide === winner;
        const winAmount = isWin ? betAmount * 1.95 : 0;
        
        setGameState('RESULT');
        if (isWin) { updateBalance(winAmount, 'WIN', 'Andar Bahar Win'); playSound('win'); }
        else playSound('loss');

        setHistory(prev => [winner === 'ANDAR' ? 'A' : 'B', ...prev].slice(0, 15));
        // FIX: Changed winAmt to winAmount to correctly reference the variable declared on line 85
        onResult({ win: isWin, amount: isWin ? winAmount : betAmount, game: 'Andar Bahar' });
        addGameHistory('Andar Bahar', betAmount, winAmount, `Result: ${winner}`);

        setTimeout(() => {
            if(isMounted.current) { 
              setGameState('BETTING'); 
              setTimeLeft(15); 
              setJoker(null); 
              setAndarCards([]); 
              setBaharCards([]); 
              setSelectedSide(null); 
              setBetConfirmed(false);
            }
        }, 4000);
    }
  };

  const FullCard: React.FC<{ card: Card }> = ({ card }) => (
      <div className="w-16 h-24 sm:w-20 sm:h-28 bg-white rounded-xl flex flex-col items-center justify-center border-2 border-slate-300 shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden shrink-0">
          <div className={`absolute top-0.5 left-1 font-black text-xs ${card.color}`}>{card.rank}</div>
          <div className={`text-3xl ${card.color}`}>{card.suit}</div>
          <div className={`absolute bottom-0.5 right-1 font-black text-xs rotate-180 ${card.color}`}>{card.rank}</div>
      </div>
  );

  return (
    <div className="bg-[#064e3b] min-h-screen flex flex-col font-sans text-white select-none overflow-x-hidden relative">
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/5 z-50">
        <button onClick={onBack} disabled={gameState === 'DEALING'} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
        <h1 className="text-xl font-black italic gold-text tracking-widest uppercase">ANDAR BAHAR</h1>
        <div className="bg-black/50 px-3 py-1.5 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono shadow-inner">₹{userBalance.toFixed(2)}</div>
      </div>

      <div className="flex-1 flex flex-col items-center p-4 relative overflow-y-auto no-scrollbar pb-80">
        <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-black mb-6 ${gameState === 'BETTING' && betConfirmed ? 'border-green-500 text-green-500' : 'border-red-600 text-red-600 animate-pulse'}`}>
            <span className="text-2xl font-mono">{betConfirmed ? timeLeft : '--'}s</span>
        </div>
        
        <div className="mb-10 text-center">
            <span className="text-[8px] font-black uppercase text-yellow-500/60 tracking-[0.4em] block mb-2">Trump</span>
            <div className="flex justify-center h-28">
              {joker ? <FullCard card={joker} /> : <div className="w-20 h-28 bg-black/40 border-4 border-dashed border-white/10 rounded-2xl flex items-center justify-center text-2xl text-white/5">?</div>}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full h-[320px] max-h-[320px]">
            <div className="flex flex-col items-center bg-black/20 rounded-3xl p-4 border border-white/5 h-full overflow-hidden">
                <span className="text-[9px] font-black uppercase text-red-400 tracking-widest mb-4 shrink-0">ANDAR</span>
                <div className="relative w-full flex flex-wrap justify-center content-start gap-1 h-full overflow-y-auto no-scrollbar">
                    {andarCards.map((c) => <FullCard key={c.id} card={c} />)}
                </div>
            </div>
            <div className="flex flex-col items-center bg-black/20 rounded-3xl p-4 border border-white/5 h-full overflow-hidden">
                <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-4 shrink-0">BAHAR</span>
                <div className="relative w-full flex flex-wrap justify-center content-start gap-1 h-full overflow-y-auto no-scrollbar">
                    {baharCards.map((c) => <FullCard key={c.id} card={c} />)}
                </div>
            </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-[#111] p-6 pb-12 border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,1)] z-[60]">
        {!betConfirmed && gameState === 'BETTING' ? (
            <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
                <div className="flex gap-4">
                    <button onClick={() => setSelectedSide('ANDAR')} className={`flex-1 h-20 rounded-[1.5rem] border-b-4 flex flex-col items-center justify-center transition-all ${selectedSide === 'ANDAR' ? 'bg-red-600 border-red-800 ring-2 ring-white/20 shadow-xl scale-105' : 'bg-slate-800 border-slate-900 opacity-60'}`}>
                        <span className="font-black italic">ANDAR</span>
                        <span className="text-[8px] font-bold opacity-60">1.95X</span>
                    </button>
                    <button onClick={() => setSelectedSide('BAHAR')} className={`flex-1 h-20 rounded-[1.5rem] border-b-4 flex flex-col items-center justify-center transition-all ${selectedSide === 'BAHAR' ? 'bg-blue-600 border-blue-800 ring-2 ring-white/20 shadow-xl scale-105' : 'bg-slate-800 border-slate-900 opacity-60'}`}>
                        <span className="font-black italic">BAHAR</span>
                        <span className="text-[8px] font-bold opacity-60">1.95X</span>
                    </button>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar justify-center py-2">
                    {[10, 100, 500, 1000, 5000].map(a => <button key={a} onClick={() => setBetAmount(a)} className={`px-4 py-2 rounded-xl font-black text-[10px] border transition-all ${betAmount === a ? 'bg-yellow-500 text-black border-white' : 'bg-zinc-900 text-zinc-600 border-white/5'}`}>₹{a >= 1000 ? (a/1000)+'K' : a}</button>)}
                </div>
                <button onClick={handlePlaceBet} className="w-full py-5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-xl border-t-2 border-white/20 active:scale-95">
                    <Play size={20}/> PLACE BET ₹{betAmount}
                </button>
            </div>
        ) : (
            <div className="text-center py-10">
                <p className="text-sm font-black italic gold-text tracking-widest uppercase animate-pulse">
                    {gameState === 'BETTING' ? `BET PLACED ON ${selectedSide} | ₹${betAmount}` : `DEALING IN PROGRESS...`}
                </p>
            </div>
        )}
      </div>
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};
export default AndarBahar;
