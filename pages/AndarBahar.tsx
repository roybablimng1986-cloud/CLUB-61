
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, Volume2, VolumeX, Timer, X } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, getMuteStatus, toggleMute, shouldForceLoss } from '../services/mockFirebase';
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
  const [showConfirm, setShowConfirm] = useState(false);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const interval = setInterval(() => {
        if (!isMounted.current) return;
        
        if (gameState === 'BETTING') {
            if (timeLeft > 0) {
                setTimeLeft(prev => prev - 1);
                // FIX: Changed invalid sound name 'tick' to 'wingo_tick'
                if (timeLeft <= 5) playSound('wingo_tick');
            } else {
                if (selectedSide && showConfirm === false) { // Auto confirm if they picked but didn't click
                   startRound();
                } else {
                   setTimeLeft(15); // Reset if nobody bet
                }
            }
        }
    }, 1000);
    return () => { isMounted.current = false; clearInterval(interval); stopAllSounds(); };
  }, [gameState, selectedSide, showConfirm]);

  const initiateBet = (side: 'ANDAR' | 'BAHAR') => {
      if (gameState !== 'BETTING') return;
      setSelectedSide(side);
      setShowConfirm(true);
      playSound('click');
  }

  const startRound = async () => {
    if (!selectedSide || userBalance < betAmount) return;
    
    setShowConfirm(false);
    setGameState('DEALING');
    updateBalance(-betAmount, 'BET', `Andar Bahar on ${selectedSide}`);
    playSound('click');

    const deck = createDeck();
    const jokerCard = deck.pop()!;
    setJoker(jokerCard);
    setAndarCards([]);
    setBaharCards([]);

    await new Promise(r => setTimeout(r, 800));

    let turn: 'A' | 'B' = 'A';
    let winner: 'ANDAR' | 'BAHAR' | null = null;

    while (!winner && deck.length > 0) {
        if (!isMounted.current) break;
        const nextCard = deck.pop()!;
        // FIX: Changed invalid sound name 'tick' to 'wingo_tick'
        playSound('wingo_tick');

        if (turn === 'A') {
            setAndarCards(prev => [nextCard, ...prev]);
            if (nextCard.rank === jokerCard.rank) winner = 'ANDAR';
            turn = 'B';
        } else {
            setBaharCards(prev => [nextCard, ...prev]);
            if (nextCard.rank === jokerCard.rank) winner = 'BAHAR';
            turn = 'A';
        }
        await new Promise(r => setTimeout(r, 600));
    }

    if (winner && isMounted.current) {
        // Apply House Edge
        let finalWinner = winner;
        if (shouldForceLoss(betAmount, userBalance)) {
            finalWinner = selectedSide === 'ANDAR' ? 'BAHAR' : 'ANDAR';
        }

        const isWin = selectedSide === finalWinner;
        const winAmount = isWin ? betAmount * 1.95 : 0;
        
        setGameState('RESULT');
        if (isWin) { updateBalance(winAmount, 'WIN', 'Andar Bahar Win'); playSound('win'); }
        else playSound('loss');

        setHistory(prev => [finalWinner === 'ANDAR' ? ('A' as const) : ('B' as const), ...prev].slice(0, 15));
        
        onResult({ 
            win: isWin, 
            amount: isWin ? winAmount : betAmount, 
            game: 'Andar Bahar',
            resultDetails: [{label: 'Winning Side', value: finalWinner}]
        });

        addGameHistory('Andar Bahar', betAmount, winAmount, `Match: ${jokerCard.rank} on ${finalWinner}`);

        setTimeout(() => {
            if(isMounted.current) {
                setGameState('BETTING');
                setTimeLeft(15);
                setJoker(null);
                setAndarCards([]);
                setBaharCards([]);
                setSelectedSide(null);
            }
        }, 3500);
    }
  };

  return (
    <div className="bg-[#064e3b] min-h-screen flex flex-col font-sans text-white select-none overflow-x-hidden relative">
      <div className="p-3 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 z-50">
        <button onClick={onBack} className="p-2 bg-slate-800/80 rounded-2xl active:scale-90 transition-all border border-white/10"><ArrowLeft size={18}/></button>
        <div className="text-center">
            <h1 className="text-lg font-black italic gold-text tracking-widest uppercase">ANDAR BAHAR</h1>
            <p className="text-[6px] text-zinc-300 font-bold uppercase tracking-[0.4em]">Fast Cycle Draw</p>
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
            
            <div className="w-24 h-32 rounded-2xl border-4 border-dashed border-yellow-500/30 flex items-center justify-center relative bg-black/30 mt-4 shadow-inner">
                {joker ? (
                    <div className="bg-white rounded-lg flex flex-col items-center justify-center w-20 h-28 border-2 border-yellow-400 shadow-2xl animate-in zoom-in">
                        <span className={`text-2xl font-black ${joker.suit==='♥'||joker.suit==='♦'?'text-red-600':'text-black'}`}>{joker.rank}</span>
                        <span className={`text-xl ${joker.suit==='♥'||joker.suit==='♦'?'text-red-600':'text-black'}`}>{joker.suit}</span>
                    </div>
                ) : <span className="text-yellow-500/20 font-black text-xl tracking-widest">TRUMP</span>}
            </div>
        </div>

        <div className="w-full mt-6 grid grid-cols-2 gap-4 h-48 overflow-hidden pt-4">
            <div className="flex flex-col items-center gap-2">
                 <h4 className="text-[10px] font-black uppercase text-red-400 tracking-widest">Andar</h4>
                 <div className="flex flex-col items-center relative w-full h-full">
                    {andarCards.map((c, i) => (
                        <div key={c.id} className="absolute bg-white rounded-md w-12 h-18 border border-slate-300 flex flex-col items-center justify-center shadow-lg animate-in slide-in-from-top" style={{ top: `${i * 12}px`, zIndex: 100 - i }}>
                             <span className={`text-sm font-black ${c.suit==='♥'||c.suit==='♦'?'text-red-600':'text-black'}`}>{c.rank}</span>
                        </div>
                    ))}
                 </div>
            </div>
            <div className="flex flex-col items-center gap-2">
                 <h4 className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Bahar</h4>
                 <div className="flex flex-col items-center relative w-full h-full">
                    {baharCards.map((c, i) => (
                        <div key={c.id} className="absolute bg-white rounded-md w-12 h-18 border border-slate-300 flex flex-col items-center justify-center shadow-lg animate-in slide-in-from-top" style={{ top: `${i * 12}px`, zIndex: 100 - i }}>
                             <span className={`text-sm font-black ${c.suit==='♥'||c.suit==='♦'?'text-red-600':'text-black'}`}>{c.rank}</span>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
      </div>

      <div className="bg-[#111] p-6 pb-12 border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
        <div className="flex gap-4 mb-6">
             <button onClick={() => initiateBet('ANDAR')} disabled={gameState !== 'BETTING'} className={`flex-1 h-28 rounded-3xl border-b-8 transition-all active:scale-95 flex flex-col items-center justify-center ${selectedSide === 'ANDAR' ? 'bg-red-600 border-red-800 shadow-xl' : 'bg-slate-800 border-slate-900 opacity-60'}`}>
                <span className="text-2xl font-black italic tracking-tighter">ANDAR</span>
                <span className="text-xs font-bold opacity-60">1.95X</span>
             </button>
             <button onClick={() => initiateBet('BAHAR')} disabled={gameState !== 'BETTING'} className={`flex-1 h-28 rounded-3xl border-b-8 transition-all active:scale-95 flex flex-col items-center justify-center ${selectedSide === 'BAHAR' ? 'bg-blue-600 border-blue-800 shadow-xl' : 'bg-slate-800 border-slate-900 opacity-60'}`}>
                <span className="text-2xl font-black italic tracking-tighter">BAHAR</span>
                <span className="text-xs font-bold opacity-60">1.95X</span>
             </button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
            {[10, 100, 500, 1000, 5000].map(a => <button key={a} onClick={() => gameState === 'BETTING' && setBetAmount(a)} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${betAmount === a ? 'bg-yellow-500 text-black shadow-lg scale-105' : 'bg-zinc-900 text-zinc-600'}`}>₹{a}</button>)}
        </div>
      </div>

      {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-md">
              <div className="bg-[#111] w-full max-w-md rounded-t-[3rem] p-10 border-t-2 border-yellow-500/40 animate-in slide-in-from-bottom duration-300">
                  <div className="flex justify-between items-center mb-10">
                      <div>
                          <p className="text-[14px] text-zinc-500 font-black uppercase tracking-widest mb-1">Confirm Stake</p>
                          <h3 className="text-5xl font-black italic gold-text tracking-tighter">{selectedSide}</h3>
                      </div>
                      <button onClick={() => setShowConfirm(false)} className="p-5 bg-zinc-900 rounded-full border border-white/10 active:scale-90 transition-transform"><X size={28}/></button>
                  </div>
                  <div className="bg-zinc-950 p-10 rounded-[3rem] mb-10 flex items-center justify-between border border-white/5 shadow-inner">
                       <div className="flex flex-col"><span className="text-[14px] text-slate-500 uppercase font-black">Bet Amount</span><span className="text-5xl font-black">₹{betAmount}</span></div>
                       <div className="w-20 h-20 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-2xl shadow-2xl ring-4 ring-yellow-400/20">₹{betAmount >= 1000 ? `${betAmount/1000}k` : betAmount}</div>
                  </div>
                  <button onClick={startRound} className="w-full py-8 rounded-[3rem] bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-black uppercase tracking-[0.5em] text-3xl shadow-[0_20px_60px_rgba(234,179,8,0.4)] active:scale-95 transition-all border-t-2 border-white/30">CONFIRM STAKE</button>
              </div>
          </div>
      )}

      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};

export default AndarBahar;
