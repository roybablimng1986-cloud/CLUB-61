
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Volume2, VolumeX, History } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus, subscribeToAviator } from '../services/mockFirebase';
import { GameResult, AviatorState } from '../types';

const Aviator: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [globalState, setGlobalState] = useState<AviatorState | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [betAmount2, setBetAmount2] = useState(10);
  const [muted, setMuted] = useState(getMuteStatus());
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  
  const [floatingResult, setFloatingResult] = useState<{ amount: number; isWin: boolean; id: number } | null>(null);

  const activeBetRef = useRef(false);
  const activeBetRef2 = useRef(false);
  const [activeBet, setActiveBet] = useState(false);
  const [activeBet2, setActiveBet2] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMounted = useRef(true);
  const animFrame = useRef<number>(0);

  useEffect(() => {
    isMounted.current = true;
    const unsub = subscribeToAviator((state) => {
        if (!isMounted.current) return;
        
        // Handle crash event for local bets
        if (globalState?.phase === 'FLYING' && state.phase === 'CRASHED') {
            if (activeBetRef.current) { 
                activeBetRef.current = false; setActiveBet(false); 
                triggerLocalResult(betAmount, false); 
            }
            if (activeBetRef2.current) { 
                activeBetRef2.current = false; setActiveBet2(false); 
                triggerLocalResult(betAmount2, false); 
            }
            playSound('loss');
        }

        if (state.phase === 'FLYING' && globalState?.phase === 'WAITING') playSound('plane');

        setGlobalState(state);
    });

    return () => { 
        isMounted.current = false; 
        cancelAnimationFrame(animFrame.current);
        stopAllSounds(); 
        unsub(); 
    };
  }, [globalState?.phase]);

  // Smooth drawing loop
  useEffect(() => {
    const drawLoop = () => {
        if (!isMounted.current) return;
        if (globalState?.phase === 'FLYING') {
            const elapsed = (Date.now() - globalState.startTime!) / 1000;
            const cur = 1 + (elapsed * 0.1) + (Math.pow(elapsed, 2) * 0.05);
            drawCanvas(Math.min(cur, globalState.crashPoint));
        } else {
            clearCanvas();
        }
        animFrame.current = requestAnimationFrame(drawLoop);
    };
    animFrame.current = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(animFrame.current);
  }, [globalState?.phase, globalState?.startTime, globalState?.crashPoint]);

  const triggerLocalResult = (amount: number, isWin: boolean) => {
      setFloatingResult({ amount, isWin, id: Date.now() });
      setTimeout(() => setFloatingResult(null), 2500);
  };

  const clearCanvas = () => {
      const cvs = canvasRef.current; if(!cvs) return;
      const ctx = cvs.getContext('2d'); if(!ctx) return;
      ctx.clearRect(0,0,cvs.width,cvs.height);
  };

  const drawCanvas = (cur: number) => {
      const cvs = canvasRef.current; if(!cvs) return;
      const ctx = cvs.getContext('2d'); if(!ctx) return;
      cvs.width = cvs.offsetWidth; cvs.height = cvs.offsetHeight;
      ctx.clearRect(0,0,cvs.width,cvs.height);
      
      const padding = 40;
      const w = cvs.width - padding * 2;
      const h = cvs.height - padding * 2;
      
      // Simple upward mapping
      const progressX = Math.min(1, (cur - 1) / 4);
      const progressY = Math.pow(progressX, 1.2);

      const startX = padding;
      const startY = cvs.height - padding;
      const endX = startX + progressX * w;
      const endY = startY - progressY * h;
      
      // Draw Simple Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < cvs.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cvs.height); ctx.stroke(); }
      for (let y = 0; y < cvs.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cvs.width, y); ctx.stroke(); }

      // Trajectory Path (Smooth Red Line)
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Plane Image or Triangle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - 15, endY + 5);
      ctx.lineTo(endX - 10, endY - 10);
      ctx.closePath();
      ctx.fill();

      // Shadow Fill
      const grad = ctx.createLinearGradient(0, endY, 0, startY);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.1)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.lineTo(endX, startY); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
  };

  const handleAction = (deck: 1 | 2) => {
      if (!globalState) return;
      const amt = deck === 1 ? betAmount : betAmount2;
      const betRef = deck === 1 ? activeBetRef : activeBetRef2;
      const setter = deck === 1 ? setActiveBet : setActiveBet2;
      
      if (globalState.phase === 'WAITING') {
          if (amt > userBalance) { setInsufficientBalance(true); setTimeout(() => setInsufficientBalance(false), 400); return; }
          betRef.current = true; setter(true); 
          updateBalance(-amt, 'BET', 'Aviator Stake'); 
          playSound('click');
      } else if (globalState.phase === 'FLYING' && betRef.current) {
          const win = amt * globalState.multiplier; 
          updateBalance(win, 'WIN', 'Aviator Payout');
          betRef.current = false; setter(false); 
          playSound('win');
          triggerLocalResult(win, true);
          addGameHistory('Aviator', amt, win, `Exited @ ${globalState.multiplier.toFixed(2)}x`);
      }
  };

  if (!globalState) return <div className="min-h-screen bg-black flex items-center justify-center text-red-600 font-black italic tracking-widest animate-pulse uppercase">Syncing...</div>;

  return (
    <div className="bg-black min-h-screen flex flex-col font-sans text-white relative select-none">
       {floatingResult && (
           <div key={floatingResult.id} className="fixed top-1/2 left-1/2 -translate-x-1/2 z-[200] pointer-events-none animate-in fade-in zoom-in duration-300">
               <div className={`py-4 px-10 rounded-full border-4 shadow-2xl flex items-center justify-center gap-6 backdrop-blur-xl ${floatingResult.isWin ? 'bg-green-600 border-green-400' : 'bg-red-600 border-red-400'} animate-bounce`}>
                    <span className="font-black text-4xl italic tracking-tighter">{floatingResult.isWin ? '+' : '-'}₹{floatingResult.amount.toFixed(2)}</span>
               </div>
           </div>
       )}

       <div className="p-4 flex items-center justify-between border-b border-zinc-900 bg-black z-[110] shadow-2xl">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2.5 bg-zinc-900 rounded-2xl border border-white/10 active:scale-90 transition-all"><ArrowLeft size={18}/></button>
            <span className="text-red-600 font-black italic text-3xl tracking-wider uppercase">AVIATOR</span>
        </div>
        <div className="flex gap-4 items-center">
             <div className={`flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-2xl border border-white/5 transition-all ${insufficientBalance ? 'animate-shake-red' : ''}`}>
                 <Wallet size={16} className="text-green-500"/><span className="text-sm font-black font-mono">₹{userBalance.toFixed(2)}</span>
             </div>
             <button onClick={() => setMuted(toggleMute())} className="p-1">{muted ? <VolumeX size={24} className="text-zinc-500"/> : <Volume2 size={24} className="text-zinc-300"/>}</button>
        </div>
      </div>

      <div className="bg-zinc-950 p-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/5 relative z-40">
          <History size={14} className="text-zinc-700 shrink-0 ml-2"/>
          <div className="flex gap-2">
              {(globalState.history || []).map((h, i) => (
                  <span key={i} className={`px-3 py-1 rounded-full text-[10px] font-black border border-white/5 whitespace-nowrap shadow-lg ${h >= 2 ? 'bg-purple-600 text-white' : 'bg-blue-900 text-blue-300'}`}>{h.toFixed(2)}x</span>
              ))}
          </div>
      </div>

      <div className="relative flex-1 bg-[#050505] flex flex-col items-center justify-center overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-90 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
              <div className={`text-8xl md:text-9xl font-black font-mono tracking-tighter transition-all duration-300 ${globalState.phase === 'CRASHED' ? 'text-red-600 scale-110' : 'text-white'}`}>
                  {globalState.multiplier.toFixed(2)}x
              </div>
              {globalState.phase === 'WAITING' && (
                <div className="mt-8 flex flex-col items-center gap-2 bg-black/40 p-4 rounded-3xl backdrop-blur-md border border-white/5">
                    <div className="text-[10px] font-black uppercase tracking-[0.6em] text-zinc-500 animate-pulse">Wait for Round...</div>
                    <div className="text-3xl font-black text-yellow-500 font-mono italic">{globalState.timeLeft}s</div>
                </div>
              )}
              {globalState.phase === 'CRASHED' && (
                <div className="mt-4 bg-red-600 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest animate-bounce shadow-[0_0_20px_rgba(220,38,38,0.6)]">Flew Away!</div>
              )}
          </div>
      </div>

      <div className="bg-[#0a0a0a] p-4 border-t-4 border-red-600 z-[120] shadow-[0_-20px_60px_rgba(0,0,0,1)] flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
                {[1, 2].map(idx => {
                    const amt = idx === 1 ? betAmount : betAmount2;
                    const setter = idx === 1 ? setBetAmount : setBetAmount2;
                    const isActive = idx === 1 ? activeBet : activeBet2;
                    return (
                        <div key={idx} className="bg-zinc-950 p-4 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden">
                            <div className="flex items-center justify-center gap-2 mb-4 bg-black/60 py-3 rounded-2xl border border-white/5">
                                <button onClick={()=>setter(Math.max(10, amt-10))} disabled={isActive} className="w-10 text-2xl font-black text-red-500 active:scale-90">-</button>
                                <span className="text-xl font-black font-mono min-w-[4rem] text-center">₹{amt}</span>
                                <button onClick={()=>setter(amt+10)} disabled={isActive} className="w-10 text-2xl font-black text-green-500 active:scale-90">+</button>
                            </div>
                            <button onClick={() => handleAction(idx as 1|2)} disabled={globalState.phase === 'CRASHED' || (globalState.phase === 'FLYING' && !isActive)} className={`w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 border-b-[8px] shadow-2xl ${isActive && globalState.phase === 'FLYING' ? 'bg-orange-500 border-orange-800' : isActive ? 'bg-zinc-800 border-black opacity-50' : 'bg-green-600 border-green-800'}`}>
                                {isActive && globalState.phase === 'FLYING' ? 'CASH OUT' : isActive ? 'WAITING' : 'BET'}
                            </button>
                        </div>
                    );
                })}
            </div>
      </div>
    </div>
  );
};
export default Aviator;
