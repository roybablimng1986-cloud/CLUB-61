
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, Volume2, VolumeX, Timer, X, Play, Users, Check, HelpCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, db, auth, subscribeToAndarBahar, subscribeToAndarBaharBets, getClockOffset, addGameBet } from '../services/supabaseService';
import { GameResult, AndarBaharState } from '../types';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, where, addDoc } from 'firebase/firestore';

import AndarBaharResultPopup from '../components/AndarBaharResultPopup';
import HowToPlay from '../components/HowToPlay';

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

  const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
  const [isBettingLocked, setIsBettingLocked] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [abResult, setAbResult] = useState<any | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  const timeLeft = useStabilizedTimer(gameState.endTime);
  
  const isMounted = useRef(true);

  // Initial Logic
  useEffect(() => {
    const mainInterval = setInterval(() => {
        if (gameState.status === 'BETTING') {
            if (Date.now() >= gameState.endTime) {
                setGameState(prev => ({ ...prev, status: 'RESULT' }));
                handleRevealingSequence();
            } else if (timeLeft <= 3) {
                setIsBettingLocked(true);
            }
            if (timeLeft <= 5 && timeLeft > 0) playSound('wingo_tick');
        }
    }, 1000);
    return () => clearInterval(mainInterval);
  }, [gameState.status, gameState.endTime, timeLeft]);

    const [visibleAndar, setVisibleAndar] = useState<any[]>([]);
    const [visibleBahar, setVisibleBahar] = useState<any[]>([]);
    
    async function handleRevealingSequence() {
        if (!isMounted.current) return;
        
        // Local Deal Logic
        const deck = createDeck();
        const joker = deck.pop()!;
        let andar: any[] = [];
        let bahar: any[] = [];
        let winner: 'ANDAR' | 'BAHAR' | 'TIE' | null = null;
    
        // Simulate dealing
        let turn: 'ANDAR' | 'BAHAR' = 'ANDAR';
        while (!winner && deck.length > 0) {
            const card = deck.pop()!;
            if (turn === 'ANDAR') {
                andar.push(card);
                if (card.rank === joker.rank) {
                    winner = andar.length === 1 ? 'TIE' : 'ANDAR';
                }
                turn = 'BAHAR';
            } else {
                bahar.push(card);
                if (card.rank === joker.rank) {
                    winner = 'BAHAR';
                }
                turn = 'ANDAR';
            }
            if (andar.length + bahar.length > 40) break; // safety
        }
        if (!winner) winner = 'ANDAR'; // fallback
    
        setGameState(prev => ({ ...prev, joker, winner }));
    
        // Animated dealing simulation - one by one
        setShowCards(true);
        const maxToShow = Math.max(andar.length, bahar.length);
        
        for (let i = 0; i < maxToShow; i++) {
            if (!isMounted.current) return;
            
            if (andar[i]) {
                setVisibleAndar(prev => [...prev, andar[i]]);
                playSound('dt_card');
                await new Promise(r => setTimeout(r, 600));
                if (andar[i].rank === joker.rank) break; 
            }
            
            if (bahar[i]) {
                setVisibleBahar(prev => [...prev, bahar[i]]);
                playSound('dt_card');
                await new Promise(r => setTimeout(r, 600));
                if (bahar[i].rank === joker.rank) break;
            }
        }
        
        if (isMounted.current) {
            processMyResult(winner, joker, andar, bahar);
            
            await new Promise(r => setTimeout(r, 5000));
            if (isMounted.current) {
                setGameState(prev => ({
                    status: 'BETTING',
                    period: (parseInt(prev.period) + 1).toString(),
                    endTime: Date.now() + 25000,
                    history: [winner!.charAt(0) as 'A' | 'B' | 'T', ...prev.history].slice(0, 20),
                    joker: null,
                    andarCards: [],
                    baharCards: [],
                    winner: null,
                    timeLeft: 25
                }));
                setShowCards(false);
                setVisibleAndar([]);
                setVisibleBahar([]);
                setMyBets([]);
                setAllBets([]);
                setIsBettingLocked(false);
                setAbResult(null);
                setSelectedSide(null);
            }
        }
    }

  function processMyResult(winner: 'ANDAR' | 'BAHAR' | 'TIE', joker: any, andar: any[], bahar: any[]) {
    let totalWin = 0;
    let totalBet = 0;
    
    myBets.forEach(bet => {
        totalBet += bet.amount;
        if (bet.target === winner) {
            const mult = winner === 'TIE' ? 15 : 1.95;
            totalWin += bet.amount * mult;
        }
    });

    const isWin = totalWin > 0;
    if (isWin) updateBalance(totalWin, 'WIN', 'Andar Bahar Win');
    
    if (totalBet > 0) {
        setAbResult({
            win: isWin,
            amount: isWin ? totalWin : 0,
            period: gameState.period,
            winner: winner,
            joker: joker,
            andarCards: andar,
            baharCards: bahar,
            target: myBets.map(b => b.target).join(', ')
        });
        addGameHistory('Andar Bahar', totalBet, totalWin, `Period: ${gameState.period}`);
    }
  }

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

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
        await updateBalance(-betAmount, 'BET', `Andar Bahar on ${selectedSide}`);
        playSound('bet_place');
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
    playSound('click');
  };

  const FullCard: React.FC<{ card: any }> = ({ card }) => (
      <motion.div 
        initial={{ scale: 0.5, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-12 h-18 sm:w-14 sm:h-20 bg-white rounded-lg flex flex-col items-center justify-center border border-slate-300 shadow-lg relative overflow-hidden shrink-0"
      >
          <div className={`absolute top-0.5 left-1 font-black text-[10px] ${['♥','♦'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>{card.rank}</div>
          <div className={`text-xl ${['♥','♦'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>{card.suit}</div>
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
              "Predict which side (Andar or Bahar) will receive a card matching the Joker.",
              "Winning on Andar or Bahar pays roughly 1.95x.",
              "If the card matches the joker on the very first card drawn for Andar, it's a TIE (rare) and pays 15x.",
              "Cards are dealt alternately until a match is found."
          ]}
          payouts={[
              { label: "Andar / Bahar", value: "1.95x" },
              { label: "Tie", value: "15x" }
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
                    <span key={i} className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg border border-white/10 ${h==='A'?'bg-red-600':'bg-blue-600'}`}>{h}</span>
                ))}
            </div>
        </div>

        {/* Table Layout */}
        <div className="w-full max-w-md px-4 mt-4">
            <div className="bg-[#064e3b] rounded-[3rem] p-8 border-4 border-[#065f46] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                
                <div className="flex flex-col items-center mb-8">
                    <div className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center font-black shadow-2xl bg-black/60 ${gameState.status === 'BETTING' ? (isBettingLocked ? 'border-orange-500 text-orange-500' : 'border-green-500 text-green-500') : 'border-red-600 text-red-600 animate-pulse'}`}>
                        <span className="text-xl font-mono leading-none">{timeLeft}</span>
                    </div>
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest mt-2">{gameState.status}</span>
                </div>

                <div className="flex justify-center mb-8">
                    <div className="text-center">
                        <span className="text-[8px] font-black uppercase text-yellow-500/60 tracking-[0.4em] block mb-2">Joker Card</span>
                        <div className="flex justify-center h-24">
                          {gameState.joker ? <FullCard card={gameState.joker} /> : <div className="w-14 h-20 bg-black/40 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-xl text-white/5">?</div>}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full min-h-[120px]">
                    <div className="flex flex-col items-center bg-black/20 rounded-2xl p-3 border border-white/5">
                        <span className="text-[9px] font-black uppercase text-red-400 tracking-widest mb-3">ANDAR</span>
                        <div className="flex flex-wrap justify-center gap-1">
                            {showCards && visibleAndar.slice(-3).map((c, i) => <FullCard key={i} card={c} />)}
                        </div>
                    </div>
                    <div className="flex flex-col items-center bg-black/20 rounded-2xl p-3 border border-white/5">
                        <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-3">BAHAR</span>
                        <div className="flex flex-wrap justify-center gap-1">
                            {showCards && visibleBahar.slice(-3).map((c, i) => <FullCard key={i} card={c} />)}
                        </div>
                    </div>
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
                {allBets.some(b => b.target === 'ANDAR') && (
                    <div className="absolute top-1 right-2 bg-yellow-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                        ₹{allBets.filter(b => b.target === 'ANDAR').reduce((acc, curr) => acc + curr.amount, 0)}
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
                {allBets.some(b => b.target === 'TIE') && (
                    <div className="absolute top-1 right-2 bg-yellow-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                        ₹{allBets.filter(b => b.target === 'TIE').reduce((acc, curr) => acc + curr.amount, 0)}
                    </div>
                )}
                <span className="font-black italic text-sm">TIE</span>
                <span className="text-[8px] font-bold opacity-60">15X</span>
                {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={20} className="text-white/20" /></div>}
            </button>
            <button 
                onClick={() => setSelectedSide('BAHAR')} 
                disabled={isBettingLocked || gameState.status !== 'BETTING'}
                className={`flex-1 h-20 rounded-2xl border-b-4 flex flex-col items-center justify-center transition-all relative overflow-hidden ${selectedSide === 'BAHAR' ? 'bg-blue-600 border-blue-800 scale-105 shadow-xl' : 'bg-slate-800 border-slate-900 opacity-60'}`}
            >
                {allBets.some(b => b.target === 'BAHAR') && (
                    <div className="absolute top-1 right-2 bg-yellow-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                        ₹{allBets.filter(b => b.target === 'BAHAR').reduce((acc, curr) => acc + curr.amount, 0)}
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
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};
export default AndarBahar;
