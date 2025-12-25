
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, RotateCw, Trash2, Volume2, VolumeX, Timer, CheckCircle2, X } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus } from '../services/mockFirebase';
import { GameResult } from '../types';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const SicBo: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [placedBets, setPlacedBets] = useState<{ zone: string; amount: number; type: string }[]>([]);
  const [gameState, setGameState] = useState<'BETTING' | 'SHAKING' | 'RESULT'>('BETTING');
  const [timeLeft, setTimeLeft] = useState(25);
  const [dice, setDice] = useState([1, 1, 1]);
  const [history, setHistory] = useState<number[]>([]);
  const [muted, setMuted] = useState(getMuteStatus());
  const [floating, setFloating] = useState<{ text: string; color: string; id: number } | null>(null);

  // Betting Confirmation
  const [confirmBet, setConfirmBet] = useState<{ zone: string; type: string } | null>(null);

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
              setConfirmBet(null);
              shakeDice();
          }
      }
    }, 1000);
    return () => { isMounted.current = false; clearInterval(interval); stopAllSounds(); };
  }, [timeLeft, gameState]);

  const triggerFloating = (text: string, color: string) => {
      setFloating({ text, color, id: Date.now() });
      setTimeout(() => setFloating(null), 3000);
  };

  const shakeDice = () => {
    setGameState('SHAKING');
    // FIX: Changed invalid sound name 'spin' to 'wheel_spin'
    playSound('wheel_spin');
    
    let count = 0;
    const shakeInterval = setInterval(() => {
        setDice([Math.floor(Math.random()*6)+1, Math.floor(Math.random()*6)+1, Math.floor(Math.random()*6)+1]);
        count++;
        if (count > 20) {
            clearInterval(shakeInterval);
            finalize();
        }
    }, 100);
  };

  const finalize = () => {
    if (!isMounted.current) return;
    const result = [Math.floor(Math.random()*6)+1, Math.floor(Math.random()*6)+1, Math.floor(Math.random()*6)+1];
    setDice(result);
    setGameState('RESULT');
    
    const sum = result.reduce((a, b) => a + b, 0);
    setHistory(prev => [sum, ...prev].slice(0, 15));

    let totalWin = 0;
    const isBig = sum >= 11 && sum <= 17;
    const isSmall = sum >= 4 && sum <= 10;
    const isTriple = result[0] === result[1] && result[1] === result[2];

    placedBets.forEach(bet => {
        if (bet.zone === 'BIG' && isBig && !isTriple) totalWin += bet.amount * 2;
        if (bet.zone === 'SMALL' && isSmall && !isTriple) totalWin += bet.amount * 2;
        if (bet.zone === 'TOTAL' && parseInt(bet.type) === sum) totalWin += bet.amount * 6;
    });

    if (totalWin > 0) {
        updateBalance(totalWin, 'WIN', 'Sic Bo Win');
        playSound('win');
        triggerFloating(`+₹${totalWin.toFixed(2)}`, 'text-yellow-400');
        onResult({ win: true, amount: totalWin, game: 'Sic Bo' });
    } else if (placedBets.length > 0) {
        playSound('loss');
        triggerFloating(`-₹${placedBets.reduce((a,b)=>a+b.amount,0).toFixed(2)}`, 'text-red-500');
        onResult({ win: false, amount: placedBets.reduce((a,b)=>a+b.amount,0), game: 'Sic Bo' });
    }

    addGameHistory('Sic Bo', placedBets.reduce((a,b)=>a+b.amount,0), totalWin, `Dice: ${result.join(',')}`);

    setTimeout(() => {
        if (isMounted.current) {
            setGameState('BETTING');
            setTimeLeft(25);
            setPlacedBets([]);
        }
    }, 5000);
  };

  const openPlaceBet = (zone: string, type: string) => {
    if (gameState !== 'BETTING') return;
    setConfirmBet({ zone, type });
    playSound('click');
  };

  const handlePlaceConfirm = () => {
    if (!confirmBet || gameState !== 'BETTING') return;
    if (userBalance < betAmount) {
        alert("Insufficient Balance");
        return;
    }
    updateBalance(-betAmount, 'BET', `SicBo: ${confirmBet.zone}`);
    playSound('click');
    setPlacedBets(prev => [...prev, { zone: confirmBet.zone, amount: betAmount, type: confirmBet.type }]);
    setConfirmBet(null);
  };

  return (
    <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white overflow-hidden relative select-none">
      {floating && (
          <div key={floating.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-[300] font-black text-6xl italic pointer-events-none animate-float-up ${floating.color}`} style={{ textShadow: '0 0 30px rgba(0,0,0,0.8)' }}>
              {floating.text}
          </div>
      )}

      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-[#111827] border-b border-yellow-500/20 z-50">
        <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={20}/></button>
        <h1 className="text-xl font-black gold-text italic tracking-widest uppercase">SIC BO ELITE</h1>
        <div className="bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono shadow-inner">₹{userBalance.toFixed(2)}</div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center p-4 gap-8 pb-40">
          {/* Shaking Dome */}
          <div className="relative w-72 h-56 bg-gradient-to-b from-blue-900/60 to-black rounded-full border-[6px] border-white/10 flex items-center justify-center shadow-[0_0_80px_rgba(0,0,0,1)] mt-4">
               <div className="flex gap-4">
                  {dice.map((d, i) => (
                      <div key={i} className={`text-7xl ${gameState === 'SHAKING' ? 'animate-bounce' : 'animate-in zoom-in'} drop-shadow-[0_4px_10px_rgba(0,0,0,1)]`}>
                        {DICE_FACES[d-1]}
                      </div>
                  ))}
               </div>
               {gameState === 'BETTING' && (
                   <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center backdrop-blur-[2px]">
                        <Timer size={40} className="text-yellow-500 mb-2 animate-pulse" />
                        <span className="text-4xl font-black font-mono text-yellow-500">{timeLeft}s</span>
                   </div>
               )}
          </div>

          {/* Betting Zones - Big/Small */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-md px-2">
               <button onClick={() => openPlaceBet('SMALL', '4-10')} disabled={gameState !== 'BETTING'} className="h-28 bg-blue-950/40 rounded-[2rem] border-2 border-blue-500/30 flex flex-col items-center justify-center active:scale-95 transition-all shadow-xl disabled:opacity-30">
                  <span className="text-2xl font-black italic gold-text">SMALL</span>
                  <span className="text-[10px] opacity-60 uppercase tracking-widest mt-1">Sum 4-10 (1.98X)</span>
                  {placedBets.filter(b=>b.zone==='SMALL').length > 0 && <div className="mt-2 bg-yellow-500 text-black px-4 py-1 rounded-full text-[11px] font-black animate-in zoom-in shadow-lg">₹{placedBets.filter(b=>b.zone==='SMALL').reduce((a,b)=>a+b.amount,0)}</div>}
               </button>
               <button onClick={() => openPlaceBet('BIG', '11-17')} disabled={gameState !== 'BETTING'} className="h-28 bg-red-950/40 rounded-[2rem] border-2 border-red-500/30 flex flex-col items-center justify-center active:scale-95 transition-all shadow-xl disabled:opacity-30">
                  <span className="text-2xl font-black italic gold-text">BIG</span>
                  <span className="text-[10px] opacity-60 uppercase tracking-widest mt-1">Sum 11-17 (1.98X)</span>
                  {placedBets.filter(b=>b.zone==='BIG').length > 0 && <div className="mt-2 bg-yellow-500 text-black px-4 py-1 rounded-full text-[11px] font-black animate-in zoom-in shadow-lg">₹{placedBets.filter(b=>b.zone==='BIG').reduce((a,b)=>a+b.amount,0)}</div>}
               </button>
          </div>

          {/* Totals Grid - NEW 2-ROW LAYOUT */}
          <div className="w-full max-w-md space-y-3 px-2">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Total Sum Payouts</h3>
              <div className="grid grid-cols-7 gap-2">
                  {Array.from({length: 14}).map((_, i) => {
                      const n = i + 4;
                      const betOnThis = placedBets.filter(b=>b.zone==='TOTAL' && b.type===n.toString()).reduce((a,b)=>a+b.amount,0);
                      return (
                          <button key={n} onClick={() => openPlaceBet('TOTAL', n.toString())} disabled={gameState !== 'BETTING'} className={`h-20 bg-zinc-900 rounded-2xl flex flex-col items-center justify-center border-b-4 border-white/5 active:scale-95 transition-all disabled:opacity-30 ${betOnThis > 0 ? 'bg-zinc-800 border-yellow-500' : ''}`}>
                              <span className="text-sm font-black italic">{n}</span>
                              <span className="text-[7px] text-zinc-500 uppercase font-bold">Total</span>
                              {betOnThis > 0 && <div className="mt-1 bg-yellow-500 text-black px-1.5 py-0.5 rounded-full text-[7px] font-black animate-in zoom-in">₹{betOnThis}</div>}
                          </button>
                      );
                  })}
              </div>
          </div>

          {/* Recent History */}
          <div className="w-full max-w-md px-2 mt-2">
             <div className="flex items-center gap-2 mb-3 text-zinc-500">
                <History size={14} className="text-yellow-500/50"/>
                <span className="text-[8px] font-black uppercase tracking-widest">History Log</span>
             </div>
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {history.map((h, i) => <span key={i} className="flex-shrink-0 w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center text-[10px] font-black border border-white/5">{h}</span>)}
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
          <div className="text-center py-2 bg-black/40 rounded-2xl border border-white/5">
             <p className="text-[8px] text-slate-500 uppercase font-black">STAKING ₹{placedBets.reduce((a,b)=>a+b.amount,0).toFixed(2)}</p>
          </div>
      </div>

      {/* Confirmation Drawer (Place Option) */}
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
                  <p className="text-center text-[9px] text-zinc-600 mt-4 uppercase font-bold italic">All stakes are final once confirmed</p>
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
