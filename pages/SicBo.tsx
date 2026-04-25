import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, RotateCw, Trash2, Volume2, VolumeX, Timer, CheckCircle2, X, Users, Check, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus, db, auth, subscribeToSicBo, subscribeToSicBoBets, getClockOffset, addGameBet } from '../services/supabaseService';
import { GameResult, SicBoState } from '../types';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, where, addDoc } from 'firebase/firestore';

import SicBoResultPopup from '../components/SicBoResultPopup';
import { useStabilizedTimer } from '../hooks/useTimer';
import HowToPlay from '../components/HowToPlay';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const SicBo: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [gameState, setGameState] = useState<SicBoState | null>(null);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [allBets, setAllBets] = useState<any[]>([]);
  const allBetsRef = useRef<any[]>([]);
  useEffect(() => { allBetsRef.current = allBets; }, [allBets]);

  const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
  const [isBettingLocked, setIsBettingLocked] = useState(false);
  const [betAmount, setBetAmount] = useState(10);
  const [muted, setMuted] = useState(getMuteStatus());
  const [floating, setFloating] = useState<{ text: string; color: string; id: number } | null>(null);
  const [confirmBet, setConfirmBet] = useState<{ zone: string; type: string } | null>(null);
  const [sbResult, setSbResult] = useState<any | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const timeLeft = useStabilizedTimer(gameState?.endTime);
  
  const isMounted = useRef(true);
  const resultHandledRef = useRef<string | null>(null);

  function handleResultSequence(state: SicBoState) {
    playSound('wheel_spin');
    
    setTimeout(() => {
        if (!isMounted.current) return;
        const myCurrentBets = allBetsRef.current.filter(b => b.uid === auth.currentUser?.uid);
        if (myCurrentBets.length > 0) {
            processMyResult(state, myCurrentBets);
        }
    }, 3000);
  }

  function processMyResult(state: SicBoState, currentBets: any[]) {
    let totalWin = 0;
    let totalBet = 0;
    const result = state.dice;
    const sum = result.reduce((a, b) => a + b, 0);
    const isBig = sum >= 11 && sum <= 17;
    const isSmall = sum >= 4 && sum <= 10;
    const isTriple = result[0] === result[1] && result[1] === result[2];

    currentBets.forEach(bet => {
        totalBet += bet.amount;
        if (bet.zone === 'BIG' && isBig && !isTriple) totalWin += bet.amount * 1.98;
        if (bet.zone === 'SMALL' && isSmall && !isTriple) totalWin += bet.amount * 1.98;
        if (bet.zone === 'TIE' && isTriple) totalWin += bet.amount * 30;
        if (bet.zone === 'TOTAL' && parseInt(bet.type) === sum) totalWin += bet.amount * 6;
    });

    const isWin = totalWin > 0;
    if (isWin) {
        updateBalance(totalWin, 'WIN', 'Sic Bo Win');
        triggerFloating(`+₹${totalWin.toFixed(2)}`, 'text-yellow-400');
    } else {
        triggerFloating(`-₹${totalBet.toFixed(2)}`, 'text-red-500');
    }

    setSbResult({
        win: isWin,
        amount: isWin ? totalWin : totalBet,
        period: state.period,
        dice: state.dice,
        sum: sum,
        target: currentBets.map(b => `${b.zone} (${b.type})`).join(', ')
    });

    addGameHistory('Sic Bo Elite', totalBet, totalWin, `Period: ${state.period}`);
  }

  useEffect(() => {
    isMounted.current = true;
    
    const unsubState = subscribeToSicBo((state) => {
        if (!isMounted.current) return;
        setGameState(state);

        if (state.status === 'BETTING') {
            resultHandledRef.current = null;
        } else {
            setIsBettingLocked(true);
        }

        if (state.status === 'RESULT' && resultHandledRef.current !== state.period) {
            resultHandledRef.current = state.period;
            handleResultSequence(state);
        }
    });

    const unsubBets = subscribeToSicBoBets((bets) => {
        setAllBets(bets);
        if (auth.currentUser) {
            setMyBets(bets.filter((b: any) => b.uid === auth.currentUser?.uid));
        }
    });

    return () => { isMounted.current = false; unsubState(); unsubBets(); stopAllSounds(); };
  }, []);

  useEffect(() => {
    if (gameState?.status === 'BETTING') {
        setIsBettingLocked(timeLeft <= 5);
        if (timeLeft <= 5 && timeLeft > 0) playSound('wingo_tick');
    }
  }, [timeLeft, gameState?.status]);

  if (!gameState) return <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center font-black gold-text text-xl italic uppercase tracking-widest">Entering Arena...</div>;

  const triggerFloating = (text: string, color: string) => {
      setFloating({ text, color, id: Date.now() });
      setTimeout(() => setFloating(null), 3000);
  };

  const openPlaceBet = (zone: string, type: string) => {
    if (gameState?.status !== 'BETTING' || isBettingLocked) return;
    setConfirmBet({ zone, type });
    playSound('click');
  };

  const handlePlaceConfirm = async () => {
    if (!confirmBet || !auth.currentUser || !gameState) return;
    if (userBalance < betAmount) { alert("Insufficient Balance"); return; }

    try {
        const betData = {
            target: confirmBet.zone,
            betType: confirmBet.type,
            amount: betAmount,
            period: gameState.period,
        };

        await addGameBet('sicbo_bets', betData);
        await updateBalance(-betAmount, 'BET', `SicBo: ${confirmBet.zone}`);
        playSound('bet_place');
        setConfirmBet(null);
    } catch (e) {
        console.error("Bet error:", e);
    }
  };

  return (
    <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white overflow-x-hidden relative select-none">
      <SicBoResultPopup result={sbResult} onClose={() => setSbResult(null)} />
      {floating && (
          <div key={floating.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-[300] font-black text-6xl italic pointer-events-none animate-float-up ${floating.color}`} style={{ textShadow: '0 0 30px rgba(0,0,0,0.8)' }}>
              {floating.text}
          </div>
      )}

      <HowToPlay 
          isOpen={showHelp} 
          onClose={() => setShowHelp(false)} 
          title="Sic Bo Rules"
          rules={[
              "Predict the outcome of 3 dice.",
              "SMALL (4-10), BIG (11-17), or precise SUM.",
              "TIE (Triple) pays 30.0x!",
              "Place your markers before the dome shakes."
          ]}
          payouts={[
              { label: "Big / Small", value: "1.98x" },
              { label: "Triple (Tie)", value: "30x" },
              { label: "Sum Total", value: "6x" }
          ]}
      />

      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-[#111827] border-b border-yellow-500/20 z-50">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={20}/></button>
            <div className="flex flex-col">
                <h1 className="text-xs font-black gold-text italic tracking-widest uppercase leading-none">SIC BO ELITE</h1>
                <span className="text-[8px] text-yellow-500/40 mt-1 uppercase font-bold">Temple Wallet</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono shadow-inner flex items-center gap-2">
                <Wallet size={14} className="text-yellow-500" />
                <span className="font-black">₹{userBalance.toFixed(2)}</span>
            </div>
            <button onClick={() => setShowHelp(true)} className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20 active:scale-90 transition-colors"><HelpCircle size={18}/></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center p-4 gap-8 pb-80 relative">
          {/* Shaking Dome */}
          <div className="relative w-72 h-56 bg-gradient-to-b from-blue-900/60 to-black rounded-full border-[6px] border-white/10 flex items-center justify-center shadow-[0_0_80px_rgba(0,0,0,1)] mt-4">
               <div className="flex gap-4">
                  {gameState.dice.map((d, i) => (
                      <div key={i} className={`text-7xl ${gameState.status === 'LOCKED' ? 'animate-bounce' : 'animate-in zoom-in'} drop-shadow-[0_4px_10px_rgba(0,0,0,1)]`}>
                        {DICE_FACES[d-1]}
                      </div>
                  ))}
               </div>
               {gameState.status === 'BETTING' && (
                   <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center backdrop-blur-[2px]">
                        <Timer size={40} className="text-yellow-500 mb-2 animate-pulse" />
                        <span className="text-4xl font-black font-mono text-yellow-500">{timeLeft}s</span>
                   </div>
               )}
          </div>

          {/* Betting Zones - Big/Small/Tie */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-md px-2">
               <button onClick={() => openPlaceBet('SMALL', '4-10')} disabled={isBettingLocked || gameState.status !== 'BETTING'} className="h-28 bg-blue-950/40 rounded-2xl border-2 border-blue-500/30 flex flex-col items-center justify-center active:scale-95 transition-all shadow-xl disabled:opacity-30 relative overflow-hidden">
                  <span className="text-xl font-black italic gold-text">SMALL</span>
                  <span className="text-[8px] opacity-60 uppercase tracking-widest mt-1">1.98X</span>
                  {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={20} className="text-white/20" /></div>}
               </button>
               <button onClick={() => openPlaceBet('TIE', 'Triple')} disabled={isBettingLocked || gameState.status !== 'BETTING'} className="h-28 bg-orange-950/40 rounded-2xl border-2 border-orange-500/30 flex flex-col items-center justify-center active:scale-95 transition-all shadow-xl disabled:opacity-30 relative overflow-hidden">
                  <span className="text-xl font-black italic gold-text">TIE</span>
                  <span className="text-[8px] opacity-60 uppercase tracking-widest mt-1">30X</span>
                  {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={20} className="text-white/20" /></div>}
               </button>
               <button onClick={() => openPlaceBet('BIG', '11-17')} disabled={isBettingLocked || gameState.status !== 'BETTING'} className="h-28 bg-red-950/40 rounded-2xl border-2 border-red-500/30 flex flex-col items-center justify-center active:scale-95 transition-all shadow-xl disabled:opacity-30 relative overflow-hidden">
                  <span className="text-xl font-black italic gold-text">BIG</span>
                  <span className="text-[8px] opacity-60 uppercase tracking-widest mt-1">1.98X</span>
                  {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={20} className="text-white/20" /></div>}
               </button>
          </div>

          {/* Totals Grid */}
          <div className="w-full max-w-md space-y-3 px-2">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Total Sum Payouts</h3>
              <div className="grid grid-cols-7 gap-2">
                  {Array.from({length: 14}).map((_, i) => {
                      const n = i + 4;
                      return (
                          <button key={n} onClick={() => openPlaceBet('TOTAL', n.toString())} disabled={isBettingLocked || gameState.status !== 'BETTING'} className={`h-20 bg-zinc-900 rounded-2xl flex flex-col items-center justify-center border-b-4 border-white/5 active:scale-95 transition-all disabled:opacity-30 relative overflow-hidden`}>
                              <span className="text-sm font-black italic">{n}</span>
                              <span className="text-[7px] text-zinc-500 uppercase font-bold">Total</span>
                              {isBettingLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={12} className="text-white/20" /></div>}
                          </button>
                      );
                  })}
              </div>
          </div>

          {/* Live Bets Display */}
          <div className="w-full px-4 max-w-lg mt-6 flex flex-col min-h-[300px]">
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
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] bg-black/20 border border-white/5`}>
                                        {bet.zone}
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

      {/* Control Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-[#111] p-6 pb-12 border-t border-white/10 shadow-2xl z-50">
          <div className="flex gap-3 mb-4 overflow-x-auto no-scrollbar py-2">
                {[10, 100, 500, 1000, 5000].map(amt => (
                    <button key={amt} onClick={() => setBetAmount(amt)} className={`flex-shrink-0 w-16 h-16 rounded-full border-4 flex items-center justify-center font-black text-xs transition-all ${betAmount === amt ? 'bg-yellow-500 text-black border-white shadow-lg scale-110' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}>₹{amt >= 1000 ? `${amt/1000}k` : amt}</button>
                ))}
          </div>
          <div className="flex justify-between items-center px-6 py-4 rounded-3xl bg-black/40 border border-white/5">
             <div className="flex items-center gap-2">
                <History size={16} className="text-yellow-500/60"/>
                <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[150px]">
                    {gameState.history.map((h, i) => <span key={i} className="flex-shrink-0 w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-[8px] font-black">{h}</span>)}
                </div>
             </div>
             <div className="flex flex-col text-right">
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Active Period</span>
                <span className="text-sm font-black text-yellow-500 font-mono italic">#{gameState.period}</span>
             </div>
          </div>
      </div>

      {/* Confirmation Drawer */}
      {confirmBet && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/80 backdrop-blur-md">
              <div className="bg-[#111] w-full max-w-md rounded-t-[3rem] p-8 border-t-2 border-yellow-500/30 animate-in slide-in-from-bottom duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Placing Payout Stake</p>
                          <h3 className="text-3xl font-black italic gold-text tracking-tighter">Stake on {confirmBet.type}</h3>
                      </div>
                      <button onClick={() => setConfirmBet(null)} className="p-3 bg-zinc-900 rounded-full border border-white/5"><X size={20}/></button>
                  </div>

                  <div className="bg-zinc-950 p-6 rounded-3xl border border-white/5 mb-8 shadow-inner flex items-center justify-between">
                       <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 font-black uppercase">Selected Chip</span>
                            <span className="text-3xl font-black text-white">₹{betAmount}</span>
                       </div>
                       <div className="w-14 h-14 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black shadow-xl">
                            ₹{betAmount}
                       </div>
                  </div>

                  <button 
                    onClick={handlePlaceConfirm}
                    className="w-full py-6 rounded-[2rem] bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-black uppercase tracking-[0.4em] text-xl shadow-2xl active:scale-95"
                  >
                      CONFIRM STAKE
                  </button>
              </div>
          </div>
      )}

      <style>{`
        .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        @keyframes float-up {
            0% { transform: translate(-50%, 0); opacity: 0; scale: 0.5; }
            15% { opacity: 1; scale: 1.2; }
            85% { opacity: 1; scale: 1.2; }
            100% { transform: translate(-50%, -200px); opacity: 0; scale: 1.5; }
        }
        .animate-float-up { animation: float-up 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
    </div>
  );
};

export default SicBo;
