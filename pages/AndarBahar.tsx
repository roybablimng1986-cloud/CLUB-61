
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, Volume2, VolumeX, Timer, X, Play, Users, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, db, auth, subscribeToAndarBahar, subscribeToAndarBaharBets, getClockOffset } from '../services/supabaseService';
import { GameResult, AndarBaharState } from '../types';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, where, addDoc } from 'firebase/firestore';

import AndarBaharResultPopup from '../components/AndarBaharResultPopup';

interface Props {
  onBack: () => void;
  userBalance: number;
  onResult: (r: GameResult) => void;
}

import { useStabilizedTimer } from '../hooks/useTimer';

const AndarBahar: React.FC<Props> = ({ onBack, userBalance, onResult }) => {
  const [gameState, setGameState] = useState<AndarBaharState | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [selectedSide, setSelectedSide] = useState<'ANDAR' | 'BAHAR' | null>(null);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [allBets, setAllBets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
  const [isBettingLocked, setIsBettingLocked] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [abResult, setAbResult] = useState<any | null>(null);
  
  const timeLeft = useStabilizedTimer(gameState?.status === 'BETTING' ? gameState.endTime : undefined);
  
  const isMounted = useRef(true);
  const resultHandledRef = useRef<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    
    const unsubState = subscribeToAndarBahar((state) => {
        if (!isMounted.current) return;
        setGameState(state);

        if (state.status === 'BETTING') {
            setShowCards(false);
            resultHandledRef.current = null;
        } else {
            setIsBettingLocked(true);
        }

        if (state.status === 'RESULT' && resultHandledRef.current !== state.period) {
            resultHandledRef.current = state.period;
            handleRevealingSequence(state);
        }
    });

    const unsubBets = subscribeToAndarBaharBets((bets) => {
        setAllBets(bets);
        if (auth.currentUser) {
            setMyBets(bets.filter((b: any) => b.uid === auth.currentUser?.uid));
        }
    });

    return () => { isMounted.current = false; unsubState(); unsubBets(); stopAllSounds(); };
}, []);

useEffect(() => {
    if (gameState?.status === 'BETTING') {
        setIsBettingLocked(timeLeft <= 3);
        if (timeLeft <= 5 && timeLeft > 0) playSound('wingo_tick');
    }
}, [timeLeft, gameState?.status]);

if (!gameState) return <div className="min-h-screen bg-black flex items-center justify-center font-black gold-text">Syncing Arena...</div>;

// Listen to bets for the current period
// Redundant - now handled by shared listener in first useEffect

  const handleRevealingSequence = async (state: AndarBaharState) => {
    await new Promise(r => setTimeout(r, 1000));
    if (!isMounted.current) return;
    setShowCards(true);
    playSound('dt_card');
    
    await new Promise(r => setTimeout(r, 2000));
    if (isMounted.current) {
        const myCurrentBets = allBets.filter(b => b.uid === auth.currentUser?.uid);
        if (myCurrentBets.length > 0) {
            processMyResult(state, myCurrentBets);
        }
    }
  };

  const processMyResult = (state: AndarBaharState, currentBets: any[]) => {
    const winner = state.winner;
    let totalWin = 0;
    let totalBet = 0;
    
    currentBets.forEach(bet => {
        totalBet += bet.amount;
        if (bet.target === winner) {
            const mult = winner === 'TIE' ? 15 : 1.95;
            totalWin += bet.amount * mult;
        }
    });

    const isWin = totalWin > 0;
    if (isWin) updateBalance(totalWin, 'WIN', 'Andar Bahar Win');
    
    setAbResult({
        win: isWin,
        amount: isWin ? totalWin : totalBet,
        period: state.period,
        winner: winner || '',
        joker: state.joker,
        andarCards: state.andarCards,
        baharCards: state.baharCards,
        target: currentBets.map(b => b.target).join(', ')
    });

    addGameHistory('Andar Bahar', totalBet, totalWin, `Period: ${state.period}`);
  };

  const handlePlaceBet = async () => {
    if (!selectedSide || !auth.currentUser || !gameState) return;
    if (userBalance < betAmount) { alert("Insufficient Balance!"); return; }

    try {
        const betData = {
            target: selectedSide,
            amount: betAmount,
            period: gameState.period,
        };

        await addGameBet('andar_bahar_bets', betData);
        await updateBalance(-betAmount, 'BET', `Andar Bahar on ${selectedSide}`);
        playSound('bet_place');
    } catch (e) {
        console.error("Bet error:", e);
    }
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
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/5 z-50">
        <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
        <h1 className="text-xl font-black italic gold-text tracking-widest uppercase">ANDAR BAHAR</h1>
        <div className="bg-black/50 px-3 py-1.5 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono shadow-inner">₹{userBalance.toFixed(2)}</div>
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
                            {showCards && gameState.andarCards.map((c, i) => <FullCard key={i} card={c} />)}
                        </div>
                    </div>
                    <div className="flex flex-col items-center bg-black/20 rounded-2xl p-3 border border-white/5">
                        <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-3">BAHAR</span>
                        <div className="flex flex-wrap justify-center gap-1">
                            {showCards && gameState.baharCards.map((c, i) => <FullCard key={i} card={c} />)}
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
                    {(activeTab === 'ALL' ? allBets : myBets).map((bet) => (
                        <motion.div 
                            key={bet.id || bet.uid}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${bet.target === 'ANDAR' ? 'bg-red-600' : 'bg-blue-600'}`}>
                                    {bet.target[0]}
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase">{bet.username || 'Player'}</div>
                                    <div className="text-[8px] text-zinc-500">{new Date(bet.timestamp).toLocaleTimeString()}</div>
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
                <span className="font-black italic text-sm">ANDAR</span>
                <span className="text-[8px] font-bold opacity-60">1.95X</span>
                {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={20} className="text-white/20" /></div>}
            </button>
            <button 
                onClick={() => setSelectedSide('TIE' as any)} 
                disabled={isBettingLocked || gameState.status !== 'BETTING'}
                className={`w-20 h-20 rounded-2xl border-b-4 flex flex-col items-center justify-center transition-all relative overflow-hidden ${selectedSide === 'TIE' as any ? 'bg-orange-600 border-orange-800 scale-105 shadow-xl' : 'bg-slate-800 border-slate-900 opacity-60'}`}
            >
                <span className="font-black italic text-sm">TIE</span>
                <span className="text-[8px] font-bold opacity-60">15X</span>
                {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={20} className="text-white/20" /></div>}
            </button>
            <button 
                onClick={() => setSelectedSide('BAHAR')} 
                disabled={isBettingLocked || gameState.status !== 'BETTING'}
                className={`flex-1 h-20 rounded-2xl border-b-4 flex flex-col items-center justify-center transition-all relative overflow-hidden ${selectedSide === 'BAHAR' ? 'bg-blue-600 border-blue-800 scale-105 shadow-xl' : 'bg-slate-800 border-slate-900 opacity-60'}`}
            >
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
            {selectedSide && gameState.status === 'BETTING' && !isBettingLocked && (
                <button onClick={handlePlaceBet} className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-black text-xs uppercase animate-in slide-in-from-right">Place Bet</button>
            )}
        </div>
      </div>
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};
export default AndarBahar;
