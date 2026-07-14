
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, Volume2, VolumeX, ChevronUp, ChevronDown, HelpCircle } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, getMuteStatus, toggleMute, db, auth, addGameBet } from '../services/supabaseService';
import { GameResult } from '../types';
import { collection, addDoc } from 'firebase/firestore';
import HiLoResultPopup from '../components/HiLoResultPopup';
import HowToPlay from '../components/HowToPlay';

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

// Custom standalone AudioContext Synth class for lag-free professional Hi-Lo audio
class HiLoSfx {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    this.isMuted = getMuteStatus();
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBet() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.1);
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playFlip() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.15);
    
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playWinStep() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Quick success high double-ding
    const notes = [659.25, 880.00]; // E5, A5
    notes.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.04, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  playLoss() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.45);
    
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.45);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playCashout() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Arpeggio celebrating money collection
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.07);
      gain.gain.setValueAtTime(0.04, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.35);
    });
  }

  playError() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }
}

const HiLo: React.FC<Props> = ({ onBack, userBalance, onResult }) => {
  const sfx = useRef(new HiLoSfx());
  const [betAmount, setBetAmount] = useState(10);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'REVEALING' | 'LOST' | 'WON'>('IDLE');
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState<string[]>([]);
  const [muted, setMuted] = useState(getMuteStatus());
  const [hlResult, setHlResult] = useState<any | null>(null);
  const [floatingText, setFloatingText] = useState<{ text: string; color: string; id: number } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  const isMounted = useRef(true);
  const deckRef = useRef<Card[]>([]);

  useEffect(() => {
    sfx.current.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const triggerFloating = (text: string, color: string) => {
      setFloatingText({ text, color, id: Date.now() });
      setTimeout(() => setFloatingText(null), 1500);
  };

  const startGame = async () => {
    if (userBalance < betAmount) {
        sfx.current.playError();
        return;
    }
    
    // Record bet in Firestore
    if (auth.currentUser) {
        try {
            await addGameBet('hilo_bets', {
                amount: betAmount,
                target: 'BET'
            });
        } catch (e) {}
    }

    updateBalance(-betAmount, 'BET', 'Hi-Lo Stake');
    sfx.current.playBet();
    setHlResult(null);
    
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
    sfx.current.playFlip();

    if (deckRef.current.length < 5) deckRef.current = createDeck();
    const revealedCard = deckRef.current.pop()!;
    setNextCard(revealedCard);

    await new Promise(r => setTimeout(r, 800));

    const isWin = guess === 'HI' ? revealedCard.value >= currentCard.value : revealedCard.value <= currentCard.value;

    if (isWin) {
        sfx.current.playWinStep();
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
        sfx.current.playLoss();
        setHlResult({
            win: false,
            amount: betAmount * multiplier,
            multiplier: multiplier,
            finalCard: { rank: revealedCard.rank, suit: revealedCard.suit }
        });
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
    sfx.current.playCashout();
    triggerFloating(`+₹${winAmt.toFixed(2)}`, 'text-yellow-400');
    
    setHlResult({
        win: true,
        amount: winAmt,
        multiplier: multiplier,
        finalCard: { rank: currentCard!.rank, suit: currentCard!.suit }
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
      <HiLoResultPopup result={hlResult} onClose={() => setHlResult(null)} />
      <HowToPlay 
          isOpen={showHelp} 
          onClose={() => setShowHelp(false)} 
          title="Hi-Lo Rules"
          rules={[
              "Predict if the next card will be Higher or Lower than the current one.",
              "Ace is the high/low flexible card depending on comparison.",
              "Correct predictions increase your multiplier.",
              "You can cash out at any time after the first correct guess.",
              "If you guess wrong, you lose your stake."
          ]}
          payouts={[
              { label: "Predict Correct", value: "Increases Multiplier" }
          ]}
      />
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2.5 bg-slate-800 rounded-2xl border border-white/10 active:scale-90 transition-all"><ArrowLeft size={20}/></button>
            <div className="flex flex-col">
                <h1 className="text-sm font-black gold-text italic tracking-widest uppercase leading-none">HI-LO ELITE</h1>
                <span className="text-[8px] text-yellow-500/40 mt-1 uppercase font-bold">Prediction Wallet</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 shadow-inner flex items-center gap-2">
                <Wallet size={14} className="text-yellow-500" />
                <span className="text-sm font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
            </div>
            <button onClick={() => setShowHelp(true)} className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-2xl border border-yellow-500/20 active:scale-90 transition-all"><HelpCircle size={18}/></button>
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
