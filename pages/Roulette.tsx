import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, RotateCw, Trash2, Volume2, VolumeX, Timer, History, HelpCircle, X, ShieldCheck, Users, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus, db, auth, subscribeToRoulette, subscribeToRouletteBets, getClockOffset, addGameBet } from '../services/supabaseService';
import { GameResult, RouletteBet, RouletteState } from '../types';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, where } from 'firebase/firestore';

import RouletteResultPopup from '../components/RouletteResultPopup';

const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const Roulette: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [gameState, setGameState] = useState<RouletteState | null>(null);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [allBets, setAllBets] = useState<any[]>([]);
  const allBetsRef = useRef<any[]>([]);
  useEffect(() => { allBetsRef.current = allBets; }, [allBets]);

  const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
  const [isBettingLocked, setIsBettingLocked] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [selectedChip, setSelectedChip] = useState(10);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [muted, setMuted] = useState(getMuteStatus());
  const [showPaytable, setShowPaytable] = useState(false);
  const [floating, setFloating] = useState<{ text: string; color: string; id: number } | null>(null);
  const [confirmDrawer, setConfirmDrawer] = useState<{ open: boolean; type: RouletteBet['type']; value: string | number } | null>(null);
  const [rlResult, setRlResult] = useState<any | null>(null);

  const [timeLeft, setTimeLeft] = useState(0);
  
  const isMounted = useRef(true);
  const resultHandledRef = useRef<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    
    const unsubState = subscribeToRoulette((state) => {
        if (!isMounted.current) return;
        setGameState(state);

        if (state.status === 'BETTING') {
            setLastResult(null);
            resultHandledRef.current = null;
        } else {
            setIsBettingLocked(true);
        }

        if (state.status === 'RESULT' && resultHandledRef.current !== state.period) {
            resultHandledRef.current = state.period;
            handleSpinSequence(state);
        }
    });

    const unsubBets = subscribeToRouletteBets((bets) => {
        setAllBets(bets);
        if (auth.currentUser) {
            setMyBets(bets.filter((b: any) => b.uid === auth.currentUser?.uid));
        }
    });

    return () => { isMounted.current = false; unsubState(); unsubBets(); stopAllSounds(); };
}, []);

useEffect(() => {
    const timer = setInterval(() => {
        if (gameState?.endTime) {
            const remaining = Math.max(0, Math.floor((gameState.endTime - (Date.now() + getClockOffset())) / 1000));
            setTimeLeft(remaining);
            if (gameState.status === 'BETTING') {
                setIsBettingLocked(remaining <= 5);
                if (remaining <= 5 && remaining > 0) playSound('wingo_tick');
            }
        }
    }, 1000);
    return () => clearInterval(timer);
}, [gameState?.endTime, gameState?.status]);

if (!gameState) return <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center font-black gold-text text-xl italic uppercase tracking-widest">Entering Arena...</div>;

// Listen to bets for the current period
// Redundant - now handled by shared listener in first useEffect

  const handleSpinSequence = (state: RouletteState) => {
    playSound('wheel_spin');
    const result = state.winningNumber!;
    const resultIdx = WHEEL_ORDER.indexOf(result);
    const segmentAngle = 360 / WHEEL_ORDER.length;
    
    const extraRots = 360 * 10; 
    const offset = resultIdx * segmentAngle;
    const finalRotation = wheelRotation + extraRots + (360 - (wheelRotation % 360)) - offset;
    
    setWheelRotation(finalRotation);
    
    setTimeout(() => {
        if (!isMounted.current) return;
        setLastResult(result);
        const myCurrentBets = allBetsRef.current.filter(b => b.uid === auth.currentUser?.uid);
        if (myCurrentBets.length > 0) {
            processMyResult(state, myCurrentBets);
        }
    }, 5000);
  };

  const processMyResult = (state: RouletteState, currentBets: any[]) => {
    let totalWin = 0;
    let totalBet = 0;
    const num = state.winningNumber!;
    const isRed = REDS.includes(num);
    const isEven = num !== 0 && num % 2 === 0;

    currentBets.forEach(bet => {
        totalBet += bet.amount;
        if (bet.type === 'NUMBER' && bet.value === num) totalWin += bet.amount * 36;
        if (bet.type === 'COLOR') {
            if (bet.value === 'RED' && isRed) totalWin += bet.amount * 2;
            if (bet.value === 'BLACK' && !isRed && num !== 0) totalWin += bet.amount * 2;
        }
        if (bet.type === 'ODD_EVEN') {
            if (bet.value === 'EVEN' && isEven) totalWin += bet.amount * 2;
            if (bet.value === 'ODD' && !isEven && num !== 0) totalWin += bet.amount * 2;
        }
        if (bet.type === 'RANGE') {
            if (bet.value === '1-18' && num >= 1 && num <= 18) totalWin += bet.amount * 2;
            if (bet.value === '19-36' && num >= 19 && num <= 36) totalWin += bet.amount * 2;
        }
    });

    const isWin = totalWin > 0;
    if (isWin) {
        updateBalance(totalWin, 'WIN', 'Roulette Win');
        triggerFloating(`+₹${totalWin.toFixed(2)}`, 'text-yellow-400');
    } else {
        triggerFloating(`-₹${totalBet.toFixed(2)}`, 'text-red-500');
    }

    setRlResult({
        win: isWin,
        amount: isWin ? totalWin : totalBet,
        period: state.period,
        winningNumber: num,
        isRed: isRed,
        target: currentBets.map(b => `${b.type}: ${b.value}`).join(', ')
    });

    addGameHistory('Mafia Roulette', totalBet, totalWin, `Period: ${state.period}`);
  };

  const triggerFloating = (text: string, color: string) => {
      setFloating({ text, color, id: Date.now() });
      setTimeout(() => setFloating(null), 3000);
  };

  const openBetConfirm = (type: RouletteBet['type'], value: string | number) => {
    if (gameState?.status !== 'BETTING' || isBettingLocked) return;
    setConfirmDrawer({ open: true, type, value });
    playSound('click');
  };

  const handlePlaceBet = async () => {
    if (!confirmDrawer || !auth.currentUser || !gameState) return;
    if (userBalance < selectedChip) { alert("Insufficient Balance"); return; }

    try {
        const betData = {
            type: confirmDrawer.type,
            value: confirmDrawer.value,
            amount: selectedChip,
            period: gameState.period,
        };

        await addGameBet('roulette_bets', betData);
        await updateBalance(-selectedChip, 'BET', `Roulette: ${confirmDrawer.value}`);
        playSound('bet_place');
        setConfirmDrawer(null);
    } catch (e) {
        console.error("Bet error:", e);
    }
  };

  if (!gameState) return <div className="min-h-screen bg-black flex items-center justify-center font-black gold-text">Entering Casino...</div>;

  const rows = [];
  for (let i = 0; i < 6; i++) {
    rows.push(Array.from({ length: 6 }, (_, j) => i * 6 + j + 1));
  }

  return (
    <div className="bg-[#050505] min-h-screen flex flex-col font-sans text-white overflow-x-hidden relative select-none">
      <RouletteResultPopup result={rlResult} onClose={() => setRlResult(null)} />
      {floating && (
          <div key={floating.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-[300] font-black text-6xl italic pointer-events-none animate-float-up ${floating.color}`} style={{ textShadow: '0 0 40px rgba(0,0,0,1)' }}>
              {floating.text}
          </div>
      )}

      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-[#111] border-b border-yellow-500/20 z-[110] shadow-2xl">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2.5 bg-zinc-900 rounded-2xl active:scale-90 border border-white/5"><ArrowLeft size={20}/></button>
            <div className="flex flex-col">
                <h1 className="text-xs font-black gold-text italic tracking-widest uppercase leading-none">MAFIA ROULETTE</h1>
                <span className="text-[8px] text-yellow-500/40 mt-1 uppercase font-bold">Casino Wallet</span>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-black/80 px-4 py-2 rounded-2xl border-2 border-yellow-500/40 text-yellow-500 font-mono shadow-[0_0_15px_rgba(234,179,8,0.2)] flex items-center gap-2">
                <Wallet size={14} className="text-yellow-500" />
                <span className="font-black">₹{userBalance.toFixed(2)}</span>
            </div>
            <div className="flex gap-1">
                <button onClick={() => setShowPaytable(true)} className="p-2.5 bg-zinc-900 rounded-2xl border border-white/5 text-yellow-500"><HelpCircle size={18}/></button>
                <button onClick={() => setMuted(toggleMute())} className="p-2.5 bg-zinc-900 rounded-2xl border border-white/5 text-yellow-500">
                    {muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                </button>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center py-2 pb-80 gap-4">
          
          <div className="relative w-full max-w-[280px] sm:max-w-lg aspect-square flex items-center justify-center transition-all px-4 mt-1">
              <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center pointer-events-none">
                   <div 
                      className="w-10 h-12 bg-yellow-500 shadow-[0_0_30px_rgba(234,179,8,1)]" 
                      style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
                   ></div>
              </div>

              <div 
                className="w-full h-full rounded-full border-[8px] sm:border-[14px] border-zinc-900 shadow-[0_0_100px_rgba(0,0,0,1)] relative bg-zinc-900"
                style={{ 
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: 'transform 4s cubic-bezier(0.1, 0, 0.1, 1)'
                }}
              >
                 <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${WHEEL_ORDER.map((n, i) => `${n===0?'#16a34a':REDS.includes(n)?'#dc2626':'#1a1a1a'} ${i*(360/37)}deg ${(i+1)*(360/37)}deg`).join(', ')})` }}></div>
                 {WHEEL_ORDER.map((n, i) => (
                     <div 
                        key={i} 
                        className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 origin-bottom flex items-center justify-center pt-1.5" 
                        style={{ transform: `translateX(-50%) rotate(${i*(360/37) + (360/37/2)}deg)` }}
                     >
                        <span className="text-[9px] md:text-[11px] font-black text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-tighter select-none leading-none">
                          {n}
                        </span>
                     </div>
                 ))}
                 <div className="absolute inset-[12%] rounded-full border-[8px] border-zinc-800/60 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] pointer-events-none"></div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[70]">
                  <div className="w-24 h-24 sm:w-52 sm:h-52 rounded-full bg-[#0a0a0a] border-[8px] sm:border-[12px] border-zinc-800 shadow-[inset_0_0_80px_rgba(0,0,0,1),0_0_60px_rgba(234,179,8,0.15)] flex flex-col items-center justify-center overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                      <div className={`text-4xl sm:text-8xl font-black italic tracking-tighter transition-all duration-500 ${lastResult!==null ? 'scale-110 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'scale-100'} ${lastResult===0?'text-green-500':REDS.includes(lastResult||-1)?'text-red-500':'text-white'}`}>
                          {lastResult !== null ? lastResult : timeLeft}
                      </div>
                      <div className="text-[7px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mt-1 sm:mt-3">{gameState.status === 'BETTING' ? 'TIME' : 'HIT'}</div>
                  </div>
              </div>
          </div>

          <div className="w-full px-4 max-w-lg space-y-3">

             <div className="flex gap-2 h-20">
                <button onClick={() => openBetConfirm('NUMBER', 0)} disabled={isBettingLocked || gameState.status !== 'BETTING'} className="flex-[0.5] bg-green-600 rounded-2xl flex items-center justify-center font-black border-2 border-white/20 active:scale-95 text-2xl shadow-2xl disabled:opacity-30">0</button>
                <div className="flex-[2] grid grid-cols-2 gap-2">
                    <OutsideBet label="RED" color="bg-red-600" onClick={() => openBetConfirm('COLOR', 'RED')} status={gameState.status} isLocked={isBettingLocked} />
                    <OutsideBet label="BLACK" color="bg-zinc-950" onClick={() => openBetConfirm('COLOR', 'BLACK')} status={gameState.status} isLocked={isBettingLocked} />
                </div>
             </div>

             <div className="bg-zinc-950/80 p-2 sm:p-3 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 shadow-2xl space-y-1 sm:space-y-2">
                {rows.map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-6 gap-1 sm:gap-2">
                        {row.map(n => {
                            const color = REDS.includes(n) ? 'bg-red-600' : 'bg-zinc-900';
                            return (
                                <button key={n} onClick={() => openBetConfirm('NUMBER', n)} disabled={isBettingLocked || gameState.status !== 'BETTING'} className={`${color} h-10 sm:h-12 rounded-lg sm:rounded-xl flex flex-col items-center justify-center font-black text-sm sm:text-lg relative active:scale-95 border border-white/10 shadow-xl disabled:opacity-30`}>
                                    {n}
                                </button>
                            );
                        })}
                    </div>
                ))}
             </div>

             <div className="grid grid-cols-2 gap-2">
                <div className="grid grid-cols-2 gap-2">
                    <OutsideBet label="1-18" onClick={() => openBetConfirm('RANGE', '1-18')} status={gameState.status} isLocked={isBettingLocked} />
                    <OutsideBet label="EVEN" onClick={() => openBetConfirm('ODD_EVEN', 'EVEN')} status={gameState.status} isLocked={isBettingLocked} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <OutsideBet label="ODD" onClick={() => openBetConfirm('ODD_EVEN', 'ODD')} status={gameState.status} isLocked={isBettingLocked} />
                    <OutsideBet label="19-36" onClick={() => openBetConfirm('RANGE', '19-36')} status={gameState.status} isLocked={isBettingLocked} />
                </div>
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
                                        {bet.value}
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

      {/* Footer Controls */}
      <div className="fixed bottom-0 left-0 w-full bg-zinc-950/95 backdrop-blur-2xl border-t border-white/10 p-6 pb-10 z-[120] shadow-[0_-30px_80px_rgba(0,0,0,1)]">
          <div className="flex gap-3 overflow-x-auto no-scrollbar mb-6 py-2">
                {[10, 50, 100, 500, 1000, 5000].map(amt => (
                    <button key={amt} onClick={() => setSelectedChip(amt)} className={`flex-shrink-0 w-16 h-16 rounded-full border-4 flex items-center justify-center text-sm font-black transition-all duration-300 ${selectedChip === amt ? 'bg-yellow-500 border-white text-black scale-110 shadow-[0_0_30px_rgba(234,179,8,0.5)]' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white'}`}>₹{amt >= 1000 ? `${amt/1000}k` : amt}</button>
                ))}
          </div>
          <div className="flex justify-between items-center px-6 py-4 rounded-3xl bg-black/50 border border-white/5">
             <div className="flex items-center gap-2">
                <History size={16} className="text-yellow-500/60"/>
                <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[150px]">
                    {gameState.history.map((h, i) => <span key={i} className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black ${h===0?'bg-green-600':REDS.includes(h)?'bg-red-600':'bg-zinc-800'}`}>{h}</span>)}
                </div>
             </div>
             <div className="flex flex-col text-right">
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Active Period</span>
                <span className="text-sm font-black text-yellow-500 font-mono italic">#{gameState.period}</span>
             </div>
          </div>
      </div>

      {confirmDrawer && confirmDrawer.open && (
          <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/85 backdrop-blur-xl">
              <div className="bg-[#0a0a0a] w-full max-w-md rounded-t-[3.5rem] p-10 border-t-2 border-yellow-500/40 animate-in slide-in-from-bottom duration-400">
                  <div className="flex justify-between items-center mb-10">
                      <div>
                          <p className="text-[14px] text-zinc-500 font-black uppercase tracking-widest mb-1">Targeting Arena</p>
                          <h3 className="text-5xl font-black italic gold-text tracking-tighter">Stake: {confirmDrawer.value}</h3>
                      </div>
                      <button onClick={() => setConfirmDrawer(null)} className="p-5 bg-zinc-900 rounded-full border border-white/10 active:scale-90 transition-transform"><X size={28}/></button>
                  </div>
                  <div className="bg-zinc-950 p-10 rounded-[3rem] mb-10 flex items-center justify-between border border-white/5 shadow-inner">
                       <div className="flex flex-col"><span className="text-[14px] text-slate-500 uppercase font-black">Bet Amount</span><span className="text-5xl font-black">₹{selectedChip}</span></div>
                       <div className="w-20 h-20 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-2xl shadow-2xl ring-4 ring-yellow-400/20">₹{selectedChip >= 1000 ? `${selectedChip/1000}k` : selectedChip}</div>
                  </div>
                  <button onClick={handlePlaceBet} className="w-full py-8 rounded-[3rem] bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-black uppercase tracking-[0.5em] text-3xl shadow-[0_20px_60px_rgba(234,179,8,0.4)] active:scale-95 transition-all border-t-2 border-white/30">CONFIRM STAKE</button>
              </div>
          </div>
      )}

      {showPaytable && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
               <div className="bg-zinc-900 border border-yellow-500/30 w-full max-w-sm p-10 rounded-[3.5rem] shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[80vh]">
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-3xl font-black gold-text italic uppercase tracking-tighter">CASINO RULES</h2>
                        <button onClick={() => setShowPaytable(false)} className="p-3 bg-zinc-800 rounded-full hover:bg-slate-700 transition-colors"><X/></button>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-[10px] text-zinc-400">
                           <p>• Pick your lucky number or bet on Red/Black/Odd/Even.</p>
                           <p>• Straight bets on 0-36 pay 36x your stake.</p>
                           <p>• Outside bets (Red/Black etc) pay 2x your stake.</p>
                           <p>• Bets are locked when 5 seconds remain on the clock.</p>
                        </div>
                        <div className="space-y-4">
                            <PayoutRow label="Straight Target" mult="36.00X" color="text-yellow-500" />
                            <PayoutRow label="Binary Color" mult="2.00X" color="text-red-500" />
                            <PayoutRow label="Even / Odd" mult="2.00X" color="text-blue-500" />
                            <PayoutRow label="Range Tier" mult="2.00X" color="text-emerald-500" />
                        </div>
                    </div>
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .h-18 { height: 4.5rem; }
      `}</style>
    </div>
  );
};

const OutsideBet = ({ label, color = 'bg-zinc-900', onClick, status, isLocked }: any) => (
    <button onClick={onClick} disabled={status !== 'BETTING' || isLocked} className={`h-20 ${color} rounded-3xl border-2 border-white/10 font-black text-xs uppercase flex flex-col items-center justify-center relative active:scale-95 transition-all disabled:opacity-30 shadow-2xl`}>
        <span className="tracking-widest italic">{label}</span>
        {isLocked && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check size={16} className="text-white/20" /></div>}
    </button>
);

const PayoutRow = ({ label, mult, color }: any) => (
    <div className="flex justify-between items-center p-5 bg-black/60 rounded-[1.5rem] border border-white/5">
        <span className="text-xs font-black text-zinc-400 uppercase tracking-tighter">{label}</span>
        <span className={`text-xl font-black italic ${color}`}>{mult}</span>
    </div>
);

export default Roulette;
