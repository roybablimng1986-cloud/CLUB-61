
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, Volume2, VolumeX, Timer, X, Play, Users, Check, HelpCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, addGameHistory, stopAllSounds, db, auth, subscribeToAndarBahar, subscribeToAndarBaharBets, getClockOffset, addGameBet, shouldForceLoss, getMuteStatus, toggleMute } from '../services/supabaseService';
import { GameResult, AndarBaharState } from '../types';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, where, addDoc } from 'firebase/firestore';

import AndarBaharResultPopup from '../components/AndarBaharResultPopup';
import HowToPlay from '../components/HowToPlay';

// Custom standalone AudioContext Synth class for lag-free professional Andar Bahar audio
class AndarBaharSfx {
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

  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playBet() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playTick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, now);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playCut() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playCardFlip() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.exponentialRampToValueAtTime(400, now + 0.08);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now);
    osc2.frequency.exponentialRampToValueAtTime(200, now + 0.08);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.08);
    osc2.stop(now + 0.08);
  }

  playWin() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.05, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
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
    osc.frequency.linearRampToValueAtTime(100, now + 0.4);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

interface Props {
  onBack: () => void;
  userBalance: number;
  onResult: (r: GameResult) => void;
}

import { useStabilizedTimer } from '../hooks/useTimer';

const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const createDeck = () => {
    let deck: { rank: string; suit: string }[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ rank, suit });
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

const AndarBahar: React.FC<Props> = ({ onBack, userBalance, onResult }) => {
  const [muted, setMuted] = useState(getMuteStatus());
  const sfx = useRef(new AndarBaharSfx());

  const handleToggleMute = () => {
    const newMute = toggleMute();
    setMuted(newMute);
    sfx.current.setMuted(newMute);
  };

  const [gameState, setGameState] = useState<AndarBaharState>({
    status: 'BETTING',
    period: new Date().getTime().toString().slice(-6),
    endTime: Date.now() + 25000,
    history: ['A', 'B', 'A', 'A'],
    joker: null,
    andarCards: [],
    baharCards: [],
    winner: null,
    timeLeft: 25
  });
  const [betAmount, setBetAmount] = useState(10);
  const [selectedSide, setSelectedSide] = useState<'ANDAR' | 'BAHAR' | 'TIE' | null>(null);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [allBets, setAllBets] = useState<any[]>([]);
  const myBetsRef = useRef<any[]>([]);

  const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
  const [isBettingLocked, setIsBettingLocked] = useState(false);
  const [isCutting, setIsCutting] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [abResult, setAbResult] = useState<any | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  const timeLeft = useStabilizedTimer(gameState.endTime);
  
  useEffect(() => {
    setIsBettingLocked(gameState.status !== 'BETTING' || timeLeft <= 5);

    // Play precise local real-time tick sound
    if (gameState.status === 'BETTING' && timeLeft <= 5 && timeLeft > 0 && timeLeft !== lastTickRef.current) {
      sfx.current.playTick();
      lastTickRef.current = timeLeft;
    }
  }, [timeLeft, gameState.status]);
  
  const isMounted = useRef(true);

  const [jokerFaceUp, setJokerFaceUp] = useState(false);
  const [andarFaceUp, setAndarFaceUp] = useState(false);
  const [baharFaceUp, setBaharFaceUp] = useState(false);

  const [visibleAndar, setVisibleAndar] = useState<any[]>([]);
  const [visibleBahar, setVisibleBahar] = useState<any[]>([]);

  const lastEvaluatedPeriod = useRef<string>('');
  const lastResetPeriodRef = useRef<string>('');
  const lastTickRef = useRef<number>(-1);

  useEffect(() => {
    isMounted.current = true;
    
    const unsubscribe = subscribeToAndarBahar((state) => {
      if (!isMounted.current) return;

      setGameState(prev => ({
        ...prev,
        status: state.status === 'BETTING' ? 'BETTING' : 'RESULT',
        period: state.period,
        endTime: state.endTime,
        timeLeft: state.timeLeft,
        history: state.history.map((h: any) => h.outcome ? h.outcome.charAt(0) : 'A')
      }));

      if (state.betsList) {
        setAllBets(state.betsList);
        const mine = state.betsList.filter((b: any) => b.uid === auth.currentUser?.uid);
        setMyBets(mine);
        myBetsRef.current = mine;
      }

      setIsBettingLocked(state.status !== 'BETTING' || state.timeLeft <= 5);

      // Check if there is a new result to animate and evaluate
      if (state.status === 'REVEALING' && state.lastResult && state.period !== lastEvaluatedPeriod.current) {
        lastEvaluatedPeriod.current = state.period;
        handleRevealingSequence(state.lastResult, state.period);
      }

      // If we went back to betting round, reset bets for next round
      if (state.status === 'BETTING' && lastResetPeriodRef.current !== state.period) {
        lastResetPeriodRef.current = state.period;
        setShowCards(false);
        setVisibleAndar([]);
        setVisibleBahar([]);
        setJokerFaceUp(false);
        setAndarFaceUp(false);
        setBaharFaceUp(false);
        setMyBets([]);
        myBetsRef.current = [];
        setAllBets([]);
        setAbResult(null);
        setSelectedSide(null);
      }
    });

    return () => {
      isMounted.current = false;
      unsubscribe();
      stopAllSounds();
    };
  }, []);

  async function handleRevealingSequence(result: any, roundPeriod: string) {
    if (!isMounted.current) return;

    setIsCutting(true);
    for(let c=0; c<3; c++) {
        sfx.current.playCut();
        await new Promise(r => setTimeout(r, 200));
    }
    setIsCutting(false);
    
    const andarCard = result.andarCard;
    const baharCard = result.baharCard;
    const winner: 'ANDAR' | 'BAHAR' | 'TIE' = result.outcome === 'A' ? 'ANDAR' : result.outcome === 'B' ? 'BAHAR' : 'TIE';

    if (isMounted.current) {
        setGameState(prev => ({ 
            ...prev, 
            winner,
            joker: andarCard, // can fallback joker field
            andarCards: [andarCard],
            baharCards: [baharCard]
        }));
    }

    setShowCards(true);
    setVisibleAndar([]);
    setVisibleBahar([]);
    setAndarFaceUp(false);
    setBaharFaceUp(false);

    // 1. Deal & Flip Andar Card with beautiful animation
    await new Promise(r => setTimeout(r, 300));
    if (isMounted.current) {
      setVisibleAndar([andarCard]);
      setAndarFaceUp(true);
      sfx.current.playCardFlip();
    }
    
    // 2. Deal & Flip Bahar Card with beautiful animation
    await new Promise(r => setTimeout(r, 800));
    if (isMounted.current) {
      setVisibleBahar([baharCard]);
      setBaharFaceUp(true);
      sfx.current.playCardFlip();
    }

    // 3. Pause for suspense before showing the winner popup and adding history
    await new Promise(r => setTimeout(r, 1200));

    if (isMounted.current) {
        processMyResult(winner, andarCard, baharCard, roundPeriod);
    }
  }

  function processMyResult(winner: 'ANDAR' | 'BAHAR' | 'TIE', andarCard: any, baharCard: any, roundPeriod: string) {
    let totalWin = 0;
    let totalBet = 0;
    
    // Use myBetsRef.current to get the actual up-to-date bets, resolving stale React state closures
    const activeBets = myBetsRef.current;
    
    activeBets.forEach(bet => {
        totalBet += bet.amount;
        if (bet.target === winner) {
            const mult = winner === 'TIE' ? 9 : 1.95;
            totalWin += bet.amount * mult;
        }
    });

    const isWin = totalWin > 0;
    if (isWin) {
        updateBalance(totalWin, 'WIN', 'Andar Bahar Win');
        sfx.current.playWin();
    } else if (totalBet > 0) {
        sfx.current.playLoss();
    }
    
    if (totalBet > 0) {
        setAbResult({
            win: isWin,
            amount: isWin ? totalWin : 0,
            period: roundPeriod,
            winner: winner,
            joker: andarCard,
            andarCards: [andarCard],
            baharCards: [baharCard],
            target: activeBets.map(b => b.target).join(', ')
        });
        addGameHistory('Andar Bahar', totalBet, totalWin, `Period: ${roundPeriod}`);
    }
  }

  const handlePlaceBet = async () => {
    if (!selectedSide || !auth.currentUser || gameState.status !== 'BETTING' || isBettingLocked) return;
    if (userBalance < betAmount) { alert("Insufficient Balance!"); return; }

    try {
        const betData = {
            target: selectedSide,
            amount: betAmount,
            period: gameState.period,
            uid: auth.currentUser.uid,
            username: 'You',
            timestamp: Date.now(),
            id: Date.now()
        };

        setMyBets(prev => [...prev, betData]);
        setAllBets(prev => [betData, ...prev]);

        await addGameBet('andar_bahar_bets', {
            target: selectedSide,
            amount: betAmount,
            period: gameState.period
        });

        await updateBalance(-betAmount, 'BET', `Andar Bahar on ${selectedSide}`);
        sfx.current.playBet();
    } catch (e) {
        console.error("Bet error:", e);
    }
  };

  const handleCancelLastBet = async () => {
    if (myBets.length === 0 || gameState.status !== 'BETTING' || isBettingLocked) return;
    const lastBet = myBets[myBets.length - 1];
    setMyBets(prev => prev.slice(0, -1));
    setAllBets(prev => prev.filter(b => b.id !== lastBet.id));
    await updateBalance(lastBet.amount, 'WIN', 'Bet Cancelled');
    sfx.current.playClick();
  };

  const FlipCard: React.FC<{ card: any; faceUp: boolean; large?: boolean }> = ({ card, faceUp, large }) => (
      <motion.div 
        initial={{ scale: 0.8, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className={`${large ? 'w-20 h-28' : 'w-14 h-20'} card-perspective relative shrink-0`}
      >
          <div className={`card-inner w-full h-full relative transform-style-3d ${faceUp ? 'flipped' : ''}`}>
              {/* Back of Card */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-red-700 to-rose-900 rounded-xl flex items-center justify-center border-2 border-white/20 shadow-md backface-hidden z-10">
                  <div className={`border border-white/10 rounded-md flex items-center justify-center bg-red-800/40 ${large ? 'w-14 h-22' : 'w-10 h-16'}`}>
                      <span className={`text-white/15 font-black ${large ? 'text-2xl' : 'text-lg'}`}>♦</span>
                  </div>
              </div>

              {/* Front of Card */}
              <div className="absolute inset-0 w-full h-full bg-white rounded-xl flex flex-col items-center justify-center border border-slate-300 shadow-md backface-hidden rotate-y-180 z-20">
                  <div className={`absolute top-1 left-2 font-black ${large ? 'text-sm' : 'text-xs'} ${['♥','♦'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>{card.rank}</div>
                  <div className={`${large ? 'text-4xl' : 'text-2xl'} ${['♥','♦'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>{card.suit}</div>
                  <div className={`absolute bottom-1 right-2 font-black rotate-180 ${large ? 'text-sm' : 'text-xs'} ${['♥','♦'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>{card.rank}</div>
              </div>
          </div>
      </motion.div>
  );

  return (
    <div className="bg-[#064e3b] min-h-screen flex flex-col font-sans text-white select-none overflow-x-hidden relative">
      <AndarBaharResultPopup result={abResult} onClose={() => setAbResult(null)} />
      <HowToPlay 
          isOpen={showHelp} 
          onClose={() => setShowHelp(false)} 
          title="Andar Bahar Rules"
          rules={[
              "Exactly 1 card is dealt to Andar and 1 card is dealt to Bahar.",
              "The side that receives the card with the higher power (higher rank) wins.",
              "Rank power order: Ace (14) > King (13) > Queen (12) > Jack (11) > 10 > ... > 2.",
              "If both sides draw cards of equal rank value, it's a TIE, paying a spectacular 9x payout!"
          ]}
          payouts={[
              { label: "Andar / Bahar", value: "1.95x" },
              { label: "Tie (Equal Ranks)", value: "9x" }
          ]}
      />
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
            <div className="flex flex-col">
                <h1 className="text-xs font-black gold-text italic tracking-widest uppercase leading-none">ANDAR BAHAR</h1>
                <span className="text-[8px] text-yellow-500/40 mt-1 uppercase font-bold">Palace Wallet</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={handleToggleMute} className="p-2 bg-slate-800 rounded-xl active:scale-90 text-yellow-500">
                {muted ? <VolumeX size={18} className="text-red-500" /> : <Volume2 size={18} className="text-yellow-500" />}
            </button>
            <div className="bg-black/50 px-3 py-1.5 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono shadow-inner flex items-center gap-2">
                <Wallet size={14} className="text-yellow-500" />
                <span className="font-black">₹{userBalance.toFixed(2)}</span>
            </div>
            <button onClick={() => setShowHelp(true)} className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20 active:scale-90"><HelpCircle size={18}/></button>
        </div>
      </div>

      {/* Game Content */}
      <div className="flex-1 casino-gradient flex flex-col items-center p-4 relative overflow-y-auto no-scrollbar pb-96">
        
        {/* History (Top) */}
        <div className="w-full mb-4">
            <div className="flex gap-1 overflow-x-auto no-scrollbar py-2 bg-black/20 rounded-full px-3 border border-white/5">
                {gameState.history.map((h, i) => (
                    <span key={i} className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg border border-white/10 ${h==='A'?'bg-red-600':h==='T'?'bg-orange-600':'bg-blue-600'}`}>{h}</span>
                ))}
            </div>
        </div>

        {/* Table Layout */}
        <div className="w-full max-w-md px-4 mt-2">
            <div className="bg-[#064e3b] rounded-[3rem] p-6 border-4 border-[#065f46] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                
                {/* Timer and Status Header */}
                <div className="flex flex-col items-center mb-6 h-16 justify-center">
                    {isCutting ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center"
                        >
                            <div className="flex gap-2">
                                <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.4 }} className="w-4 h-6 bg-yellow-500 rounded-sm shadow-lg"></motion.div>
                                <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.4, delay: 0.1 }} className="w-4 h-6 bg-yellow-500 rounded-sm shadow-lg"></motion.div>
                                <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.4, delay: 0.2 }} className="w-4 h-6 bg-yellow-500 rounded-sm shadow-lg"></motion.div>
                            </div>
                            <span className="text-[10px] font-black gold-text uppercase tracking-[0.3em] mt-2 animate-pulse">Cutting Deck...</span>
                        </motion.div>
                    ) : (
                        <>
                            <div className={`w-12 h-12 rounded-full border-4 flex flex-col items-center justify-center font-black shadow-2xl bg-black/60 ${gameState.status === 'BETTING' ? (isBettingLocked ? 'border-red-600 text-red-500 animate-pulse' : 'border-green-500 text-green-500') : 'border-red-600 text-red-600 animate-pulse'}`}>
                                <span className="text-lg font-mono leading-none">{timeLeft}</span>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest mt-1.5 ${gameState.status === 'BETTING' && isBettingLocked ? 'text-red-500 animate-pulse' : 'text-white/40'}`}>
                                {gameState.status === 'BETTING' && isBettingLocked ? 'LOCKED' : gameState.status}
                            </span>
                        </>
                    )}
                </div>

                {/* Majestic High Card Battle Section */}
                <div className="relative grid grid-cols-2 gap-8 items-center justify-center p-4 bg-black/30 rounded-[2rem] border border-white/5 min-h-[170px]">
                    {/* Andar Card Slot */}
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black tracking-widest text-red-500 uppercase mb-3">ANDAR</span>
                        <motion.div
                          animate={gameState.winner === 'ANDAR' && showCards && andarFaceUp ? {
                              scale: [1, 1.08, 1],
                              boxShadow: ["0px 0px 0px rgba(220,38,38,0)", "0px 0px 25px rgba(220,38,38,0.8)", "0px 0px 0px rgba(220,38,38,0)"],
                          } : {}}
                          transition={{ repeat: gameState.winner === 'ANDAR' ? Infinity : 0, duration: 1.5 }}
                          className={`w-24 h-32 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 relative ${gameState.winner === 'ANDAR' && showCards && andarFaceUp ? 'border-yellow-500 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'border-white/10 bg-black/40'}`}
                        >
                            {gameState.winner === 'ANDAR' && showCards && andarFaceUp && (
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest animate-bounce shadow-lg z-50">WINNER</div>
                            )}
                            {showCards && visibleAndar[0] ? (
                                <FlipCard card={visibleAndar[0]} faceUp={andarFaceUp} large />
                            ) : (
                                <span className="text-xs text-white/10 font-bold uppercase tracking-widest">Wait...</span>
                            )}
                        </motion.div>
                    </div>

                    {/* VS Circle Badge */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-40">
                        <div className="w-10 h-10 rounded-full bg-yellow-500 text-black border-4 border-[#064e3b] font-black italic text-xs flex items-center justify-center shadow-lg">
                            VS
                        </div>
                    </div>

                    {/* Bahar Card Slot */}
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase mb-3">BAHAR</span>
                        <motion.div
                          animate={gameState.winner === 'BAHAR' && showCards && baharFaceUp ? {
                              scale: [1, 1.08, 1],
                              boxShadow: ["0px 0px 0px rgba(59,130,246,0)", "0px 0px 25px rgba(59,130,246,0.8)", "0px 0px 0px rgba(59,130,246,0)"],
                          } : {}}
                          transition={{ repeat: gameState.winner === 'BAHAR' ? Infinity : 0, duration: 1.5 }}
                          className={`w-24 h-32 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 relative ${gameState.winner === 'BAHAR' && showCards && baharFaceUp ? 'border-yellow-500 bg-blue-950/20 shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'border-white/10 bg-black/40'}`}
                        >
                            {gameState.winner === 'BAHAR' && showCards && baharFaceUp && (
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest animate-bounce shadow-lg z-50">WINNER</div>
                            )}
                            {showCards && visibleBahar[0] ? (
                                <FlipCard card={visibleBahar[0]} faceUp={baharFaceUp} large />
                            ) : (
                                <span className="text-xs text-white/10 font-bold uppercase tracking-widest">Wait...</span>
                            )}
                        </motion.div>
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <span className="text-[8px] font-black tracking-[0.3em] uppercase text-yellow-500/50">Higher Card Power Wins • Ties Pay 9x</span>
                </div>
            </div>
        </div>

        {/* Live Bets Display */}
        <div className="w-full mt-6 flex-1 flex flex-col min-h-[300px]">
            <div className="flex border-b border-white/5">
                <button onClick={() => setActiveTab('ALL')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ALL' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-zinc-500'}`}>All Bets ({allBets.length})</button>
                <button onClick={() => setActiveTab('MY')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MY' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-zinc-500'}`}>My Bets ({myBets.length})</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                <AnimatePresence mode="popLayout">
                    {(activeTab === 'ALL' ? allBets : myBets).map((bet, idx) => (
                        <motion.div 
                            key={bet.id || `ab-bet-${idx}-${bet.uid}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-[8px] border-2 border-white/20 shadow-lg ${bet.target === 'ANDAR' ? 'bg-red-600' : bet.target === 'TIE' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                                    {bet.target}
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase text-zinc-100">{bet.username || 'Player'}</div>
                                    <div className="text-[8px] text-zinc-500 font-bold">{new Date(bet.timestamp).toLocaleTimeString()}</div>
                                </div>
                            </div>
                            <div className="text-sm font-black text-yellow-500">₹{bet.amount}</div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
      </div>

      {/* Betting Controls */}
      <div className="fixed bottom-0 left-0 w-full bg-[#111] p-4 pb-10 border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,1)] z-[60]">
        <div className="flex gap-2 mb-4">
            <button 
                onClick={() => setSelectedSide('ANDAR')} 
                disabled={isBettingLocked || gameState.status !== 'BETTING'}
                className={`flex-1 h-20 rounded-2xl border-b-4 flex flex-col items-center justify-center transition-all relative overflow-hidden ${selectedSide === 'ANDAR' ? 'bg-red-600 border-red-800 scale-105 shadow-xl' : 'bg-slate-800 border-slate-900 opacity-60'}`}
            >
                {myBets.some(b => b.target === 'ANDAR') && (
                    <div className="absolute top-1 right-2 bg-yellow-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                        ₹{myBets.filter(b => b.target === 'ANDAR').reduce((acc, curr) => acc + curr.amount, 0)}
                    </div>
                )}
                <span className="font-black italic text-sm">ANDAR</span>
                <span className="text-[8px] font-bold opacity-60">1.95X</span>
                {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={20} className="text-white/20" /></div>}
            </button>
            <button 
                onClick={() => setSelectedSide('TIE' as any)} 
                disabled={isBettingLocked || gameState.status !== 'BETTING'}
                className={`w-20 h-20 rounded-2xl border-b-4 flex flex-col items-center justify-center transition-all relative overflow-hidden ${selectedSide === 'TIE' as any ? 'bg-orange-600 border-orange-800 scale-105 shadow-xl' : 'bg-slate-800 border-slate-900 opacity-60'}`}
            >
                {myBets.some(b => b.target === 'TIE') && (
                    <div className="absolute top-1 right-2 bg-yellow-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                        ₹{myBets.filter(b => b.target === 'TIE').reduce((acc, curr) => acc + curr.amount, 0)}
                    </div>
                )}
                <span className="font-black italic text-sm">TIE</span>
                <span className="text-[8px] font-bold opacity-60">9X</span>
                {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={20} className="text-white/20" /></div>}
            </button>
            <button 
                onClick={() => setSelectedSide('BAHAR')} 
                disabled={isBettingLocked || gameState.status !== 'BETTING'}
                className={`flex-1 h-20 rounded-2xl border-b-4 flex flex-col items-center justify-center transition-all relative overflow-hidden ${selectedSide === 'BAHAR' ? 'bg-blue-600 border-blue-800 scale-105 shadow-xl' : 'bg-slate-800 border-slate-900 opacity-60'}`}
            >
                {myBets.some(b => b.target === 'BAHAR') && (
                    <div className="absolute top-1 right-2 bg-yellow-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                        ₹{myBets.filter(b => b.target === 'BAHAR').reduce((acc, curr) => acc + curr.amount, 0)}
                    </div>
                )}
                <span className="font-black italic text-sm">BAHAR</span>
                <span className="text-[8px] font-bold opacity-60">1.95X</span>
                {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={20} className="text-white/20" /></div>}
            </button>
        </div>
        
        <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 flex-1">
                {[10, 50, 100, 500, 1000, 5000].map(a => (
                    <button 
                        key={a} 
                        onClick={() => setBetAmount(a)} 
                        className={`flex-shrink-0 w-14 h-14 rounded-full border-4 flex flex-col items-center justify-center font-black text-[9px] transition-all relative overflow-hidden ${betAmount === a ? 'bg-yellow-500 border-white text-black scale-110 shadow-[0_0_20px_rgba(234,179,8,0.6)]' : 'bg-zinc-900 border-white/10 text-zinc-500'}`}
                    >
                        <div className={`absolute inset-0 opacity-20 bg-[radial-gradient(circle,transparent_40%,black_100%)]`} />
                        <span className="z-10">₹{a >= 1000 ? (a/1000)+'K' : a}</span>
                        <div className="w-full h-1 bg-white/20 absolute bottom-2" />
                    </button>
                ))}
            </div>
            {selectedSide && gameState.status === 'BETTING' && !isBettingLocked ? (
                <button onClick={handlePlaceBet} className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-black text-xs uppercase animate-in slide-in-from-right">Place Bet</button>
            ) : myBets.length > 0 && gameState.status === 'BETTING' && !isBettingLocked ? (
                <button onClick={handleCancelLastBet} className="bg-red-600/20 border border-red-500/30 px-6 py-3 rounded-xl font-black text-[10px] uppercase text-red-500 active:scale-95 flex items-center gap-2">
                    <RotateCcw size={14} /> RETURN
                </button>
            ) : null}
        </div>
      </div>
      <style>{`
        .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .card-perspective { perspective: 1000px; }
        .card-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.6s; }
        .card-inner.flipped { transform: rotateY(180deg); }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .transform-style-3d { transform-style: preserve-3d; }
      `}</style>
    </div>
  );
};
export default AndarBahar;
