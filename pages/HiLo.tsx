
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, getMuteStatus, toggleMute } from '../services/mockFirebase';
import { GameResult } from '../types';

interface Props {
  onBack: () => void;
  userBalance: number;
  onResult: (r: GameResult) => void;
}

type Card = { rank: string; suit: string; value: number; id: string };
const SUITS = ['♠', '♣', '♥', '♦'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const createDeck = (): Card[] => {
    let deck: Card[] = [];
    SUITS.forEach(suit => {
        RANKS.forEach((rank, idx) => {
            deck.push({ rank, suit, value: idx + 2, id: `${rank}${suit}-${Math.random()}` });
        });
    });
    return deck.sort(() => Math.random() - 0.5);
};

const HiLo: React.FC<Props> = ({ onBack, userBalance, onResult }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'REVEALING' | 'LOST' | 'WON'>('IDLE');
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState<string[]>([]);
  const [muted, setMuted] = useState(getMuteStatus());
  const [floatingText, setFloatingText] = useState<{ text: string; color: string; id: number } | null>(null);
  
  const isMounted = useRef(true);
  const deckRef = useRef<Card[]>([]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const triggerFloating = (text: string, color: string) => {
      setFloatingText({ text, color, id: Date.now() });
      setTimeout(() => setFloatingText(null), 1500);
  };

  const startGame = () => {
    if (userBalance < betAmount) return;
    updateBalance(-betAmount, 'BET', 'Hi-Lo Stake');
    playSound('click');
    
    deckRef.current = createDeck();
    const firstCard = deckRef.current.pop()!;
    
    setCurrentCard(firstCard);
    setNextCard(null);
    setMultiplier(1.0);
    setGameState('PLAYING');
    setHistory([]);
  };

  const handleGuess = async (guess: 'HI' | 'LO') => {
    if (gameState !== 'PLAYING' || !currentCard) return;

    setGameState('REVEALING');
    // FIX: Changed invalid sound name 'tick' to 'wingo_tick'
    playSound('wingo_tick');

    if (deckRef.current.length < 5) deckRef.current = createDeck();
    const revealedCard = deckRef.current.pop()!;
    setNextCard(revealedCard);

    await new Promise(r => setTimeout(r, 800));

    const isWin = guess === 'HI' ? revealedCard.value >= currentCard.value : revealedCard.value <= currentCard.value;

    if (isWin) {
        playSound('win');
        const increment = revealedCard.value === currentCard.value ? 1.0 : 1.6;
        const potentialWin = betAmount * (multiplier * increment - multiplier);
        triggerFloating(`+₹${potentialWin.toFixed(2)}`, 'text-green-400');
        
        setMultiplier(prev => prev * increment);
        setHistory(prev => [revealedCard.rank + revealedCard.suit, ...prev].slice(0, 8));
        
        setTimeout(() => {
            setCurrentCard(revealedCard);
            setNextCard(null);
            setGameState('PLAYING');
        }, 1000);
    } else {
        playSound('loss');
        triggerFloating(`-₹${(betAmount * multiplier).toFixed(2)}`, 'text-red-500');
        setGameState('LOST');
        addGameHistory('Hi-Lo', betAmount, 0, `Lost at ${multiplier.toFixed(2)}x`);
        
        setTimeout(() => {
            setGameState('IDLE');
            setCurrentCard(null);
            setNextCard(null);
        }, 3000);
    }
  };

  const cashOut = () => {
    if (gameState !== 'PLAYING' || multiplier <= 1.0) return;
    
    const winAmt = betAmount * multiplier;
    updateBalance(winAmt, 'WIN', 'Hi-Lo Cashout');
    playSound('win');
    triggerFloating(`+₹${winAmt.toFixed(2)}`, 'text-yellow-400');
    
    onResult({
        win: true,
        amount: winAmt,
        game: 'Hi-Lo Royale',
        resultDetails: [{ label: 'Final Mult', value: multiplier.toFixed(2) + 'x' }]
    });

    addGameHistory('Hi-Lo', betAmount, winAmt, `Cashed out ${multiplier.toFixed(2)}x`);
    setGameState('IDLE');
    setCurrentCard(null);
  };

  const CardView = ({ card, active = false }: { card: Card, active?: boolean }) => (
    <div className={`bg-white rounded-2xl flex flex-col items-center justify-center border-4 shadow-2xl animate-in zoom-in duration-500 w-32 h-48 sm:w-40 sm:h-56 relative ${active ? 'border-yellow-400' : 'border-slate-300'}`}>
        <span className={`font-black leading-none text-5xl ${card.suit === '♥' || card.suit === '♦' ? 'text-red-600' : 'text-black'}`}>{card.rank}</span>
        <span className={`text-4xl mt-2 ${card.suit === '♥' || card.suit === '♦' ? 'text-red-600' : 'text-black'}`}>{card.suit}</span>
    </div>
  );

  return (
    <div className="bg-[#0f172a] min-h-screen flex flex-col font-sans text-white select-none overflow-hidden relative">
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 z-50">
        <button onClick={onBack} className="p-2.5 bg-slate-800 rounded-2xl active:scale-90"><ArrowLeft size={20}/></button>
        <div className="text-center">
            <h1 className="text-xl font-black italic gold-text tracking-widest uppercase">HI-LO ROYALE</h1>
            <p className="text-[7px] text-zinc-300 font-bold uppercase tracking-[0.4em]">Elite Prediction</p>
        </div>
        <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 shadow-inner">
          <Wallet size={14} className="text-yellow-500" />
          <span className="text-sm font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
        </div>
      </div>

      {/* Floating Animation Layer */}
      {floatingText && (
          <div key={floatingText.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-[100] font-black text-4xl italic pointer-events-none animate-float-up ${floatingText.color}`} style={{ textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
              {floatingText.text}
          </div>
      )}

      {/* Progressive Multiplier Bar */}
      {gameState !== 'IDLE' && (
          <div className="bg-yellow-500/10 p-3 flex flex-col items-center border-b border-yellow-500/20 animate-in slide-in-from-top">
              <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Current Multiplier</span>
              <div className="text-3xl font-black italic gold-text">{multiplier.toFixed(2)}x</div>
          </div>
      )}

      {/* Game Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
          {gameState === 'IDLE' ? (
              <div className="text-center space-y-8">
                  <div className="w-48 h-64 bg-slate-800/50 rounded-3xl border-4 border-dashed border-white/10 flex items-center justify-center">
                       <span className="text-white/10 font-black text-6xl rotate-45">?</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Waiting for Stakes</h3>
              </div>
          ) : (
              <div className="flex flex-col items-center gap-8">
                  <div className="flex gap-4 items-center">
                    <div className={`${nextCard ? 'opacity-40 grayscale blur-sm' : ''} transition-all duration-500`}>
                        {currentCard && <CardView card={currentCard} active={true} />}
                    </div>
                    {nextCard && (
                        <div className="animate-in slide-in-from-right duration-500">
                             <CardView card={nextCard} />
                        </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {history.map((h, i) => (
                        <span key={i} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black">{h}</span>
                    ))}
                  </div>
              </div>
          )}
      </div>

      {/* Betting Zone */}
      <div className="bg-[#111] p-6 pb-12 border-t border-white/5 shadow-2xl z-50">
        {gameState === 'IDLE' ? (
            <div className="space-y-6">
                <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
                    {[10, 50, 100, 500, 1000].map(amt => (
                        <button key={amt} onClick={() => setBetAmount(amt)} className={`flex-shrink-0 px-6 py-3 rounded-2xl font-black text-xs border transition-all ${betAmount === amt ? 'bg-yellow-500 text-black' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}>₹{amt}</button>
                    ))}
                </div>
                <button onClick={startGame} className="w-full py-6 rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-[0.4em] shadow-xl active:scale-95 transition-all text-xl border-t-2 border-white/10">START GAME</button>
            </div>
        ) : (
            <div className="space-y-6">
                <div className="flex gap-4">
                    <button 
                        onClick={() => handleGuess('HI')}
                        disabled={gameState !== 'PLAYING'}
                        className="flex-1 py-6 rounded-3xl bg-green-600 border-b-8 border-green-800 flex flex-col items-center active:scale-95 transition-all disabled:opacity-50"
                    >
                        <ChevronUp size={32} />
                        <span className="font-black text-xl italic">HIGHER</span>
                    </button>
                    <button 
                        onClick={() => handleGuess('LO')}
                        disabled={gameState !== 'PLAYING'}
                        className="flex-1 py-6 rounded-3xl bg-red-600 border-b-8 border-red-800 flex flex-col items-center active:scale-95 transition-all disabled:opacity-50"
                    >
                        <ChevronDown size={32} />
                        <span className="font-black text-xl italic">LOWER</span>
                    </button>
                </div>
                <button 
                    onClick={cashOut}
                    disabled={gameState !== 'PLAYING' || multiplier <= 1.0}
                    className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.4em] shadow-xl transition-all border-t-2 border-white/10 ${multiplier > 1.0 ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-zinc-800 text-zinc-500 opacity-50'}`}
                >
                    {multiplier > 1.0 ? `COLLECT ₹${(betAmount * multiplier).toFixed(2)}` : 'CASHOUT UNAVAILABLE'}
                </button>
            </div>
        )}
      </div>

      <style>{`
        .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        @keyframes float-up {
            0% { transform: translate(-50%, 0); opacity: 0; scale: 0.5; }
            20% { opacity: 1; scale: 1.2; }
            100% { transform: translate(-50%, -150px); opacity: 0; scale: 1.5; }
        }
        .animate-float-up { animation: float-up 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
    </div>
  );
};

export default HiLo;
