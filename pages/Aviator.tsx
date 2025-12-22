
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Volume2, VolumeX, History } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus, shouldForceLoss } from '../services/mockFirebase';
import { GameResult } from '../types';

const Aviator: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [phase, setPhase] = useState<'WAITING' | 'FLYING' | 'CRASHED'>('WAITING');
  const [multiplier, setMultiplier] = useState(1.00);
  const [betAmount, setBetAmount] = useState(10);
  const [betAmount2, setBetAmount2] = useState(10);
  const [muted, setMuted] = useState(getMuteStatus());
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [history, setHistory] = useState<number[]>([1.45, 2.10, 1.02, 5.67, 1.15, 3.40, 12.01, 1.00]);
  
  const [floatingResult, setFloatingResult] = useState<{ amount: number; isWin: boolean; id: number } | null>(null);

  const activeBetRef = useRef(false);
  const activeBetRef2 = useRef(false);
  const [activeBet, setActiveBet] = useState(false);
  const [activeBet2, setActiveBet2] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const crashPointRef = useRef(0);
  const startTimeRef = useRef(0);
  const animRef = useRef(0);
  const isMounted = useRef(true);
  const planeImg = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    isMounted.current = true;
    planeImg.current = new Image();
    // High quality red plane icon
    planeImg.current.src = "https://cdn-icons-png.flaticon.com/512/3122/3122330.png";
    startWaiting();
    return () => { isMounted.current = false; cancelAnimationFrame(animRef.current); stopAllSounds(); };
  }, []);

  const triggerLocalResult = (amount: number, isWin: boolean) => {
      setFloatingResult({ amount, isWin, id: Date.now() });
      setTimeout(() => setFloatingResult(null), 2500);
  };

  const startWaiting = () => {
      if (!isMounted.current) return;
      setPhase('WAITING'); 
      setMultiplier(1.00);
      setTimeLeft(10);
      const timer = setInterval(() => {
          setTimeLeft(prev => {
              if (prev <= 1) { clearInterval(timer); startFlying(); return 0; }
              return prev - 1;
          });
      }, 1000);
  };

  const startFlying = () => {
      if (!isMounted.current) return;
      setPhase('FLYING'); 
      playSound('plane');
      let cp = 1.0;
      const totalBet = (activeBetRef.current ? betAmount : 0) + (activeBetRef2.current ? betAmount2 : 0);
      
      // Risk Management: Force crash early if high stakes are detected
      if (totalBet > 0 && shouldForceLoss(totalBet, userBalance)) cp = 1.0 + Math.random() * 0.18;
      else cp = 1.0 + Math.random() * 10;
      
      crashPointRef.current = parseFloat(cp.toFixed(2));
      startTimeRef.current = Date.now();
      animLoop();
  };

  const animLoop = () => {
      if (!isMounted.current) return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      // Exponential curve for multiplier growth
      const cur = 1 + (elapsed * 0.1) + (Math.pow(elapsed, 2) * 0.06);
      
      if (cur >= crashPointRef.current) {
          handleCrash(crashPointRef.current);
      } else {
          setMultiplier(cur);
          drawCanvas(cur, elapsed);
          animRef.current = requestAnimationFrame(animLoop);
      }
  };

  const drawCanvas = (cur: number, elapsed: number) => {
      const cvs = canvasRef.current; if(!cvs) return;
      const ctx = cvs.getContext('2d'); if(!ctx) return;
      cvs.width = cvs.offsetWidth; cvs.height = cvs.offsetHeight;
      ctx.clearRect(0,0,cvs.width,cvs.height);
      
      const padding = 50;
      const w = cvs.width - padding * 2;
      const h = cvs.height - padding * 2;
      
      // Logic for curve: quadratic path representing the flight
      // We normalize elapsed time to 0-1 over a standard 10s flight window
      const progress = Math.min(1, elapsed / 8);
      const startX = padding;
      const startY = cvs.height - padding;
      const endX = startX + progress * w;
      const endY = startY - (Math.pow(progress, 2) * h);
      
      // Draw Grid for "Graph" feel
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < cvs.width; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cvs.height); ctx.stroke(); }
      for (let y = 0; y < cvs.height; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cvs.width, y); ctx.stroke(); }

      // 1. Draw Fill Area Under Curve (Gradient)
      const gradient = ctx.createLinearGradient(0, endY, 0, startY);
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(cvs.width / 2, startY, endX, endY);
      ctx.lineTo(endX, startY);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // 2. Draw Solid Red Curve Line
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(cvs.width / 2, startY, endX, endY);
      ctx.stroke();

      // 3. Draw Plane
      if (planeImg.current?.complete) {
          ctx.save();
          ctx.translate(endX, endY);
          // Tilt plane upwards slightly
          ctx.rotate(-Math.PI / 12);
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
          ctx.drawImage(planeImg.current, -25, -25, 50, 50);
          ctx.restore();
      }
  };

  const handleCrash = (final: number) => {
      setPhase('CRASHED');
      setMultiplier(final);
      playSound('loss');
      setHistory(prev => [final, ...prev].slice(0, 15));
      
      if (activeBetRef.current) { 
          activeBetRef.current = false; 
          setActiveBet(false); 
          triggerLocalResult(betAmount, false); 
      }
      if (activeBetRef2.current) { 
          activeBetRef2.current = false; 
          setActiveBet2(false); 
          triggerLocalResult(betAmount2, false); 
      }
      
      setTimeout(() => { if (isMounted.current) startWaiting(); }, 3000);
  };

  const handleAction = (deck: 1 | 2) => {
      const amt = deck === 1 ? betAmount : betAmount2;
      const ref = deck === 1 ? activeBetRef : activeBetRef2;
      const set = deck === 1 ? setActiveBet : setActiveBet2;
      
      if (phase === 'WAITING') {
          if (amt > userBalance) { 
              setInsufficientBalance(true); 
              setTimeout(() => setInsufficientBalance(false), 400); 
              return; 
          }
          ref.current = true; 
          set(true); 
          updateBalance(-amt, 'BET', 'Aviator Stake'); 
          playSound('click');
      } else if (phase === 'FLYING' && ref.current) {
          const win = amt * multiplier; 
          updateBalance(win, 'WIN', 'Aviator Cashout');
          ref.current = false; 
          set(false); 
          playSound('win');
          triggerLocalResult(win, true);
          addGameHistory('Aviator', amt, win, `Won @ ${multiplier.toFixed(2)}x`);
      }
  };

  return (
    <div className="bg-black min-h-screen flex flex-col font-sans text-white relative select-none">
       {/* FLOATING RESULT ANIMATION */}
       {floatingResult && (
           <div key={floatingResult.id} className="fixed top-1/2 left-1/2 -translate-x-1/2 z-[200] pointer-events-none animate-in fade-in zoom-in duration-300">
               <div className={`py-4 px-10 rounded-full border-4 shadow-[0_0_80px_rgba(0,0,0,0.8)] flex items-center justify-center gap-6 backdrop-blur-xl ${floatingResult.isWin ? 'bg-green-600 border-green-400 shadow-green-500/40' : 'bg-red-600 border-red-400 shadow-red-500/40'} animate-bounce`}>
                    <span className="font-black text-4xl italic tracking-tighter">
                        {floatingResult.isWin ? '+' : '-'}₹{floatingResult.amount.toFixed(2)}
                    </span>
               </div>
           </div>
       )}

       <div className="p-4 flex items-center justify-between border-b border-zinc-900 bg-black z-[110] shadow-2xl">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2.5 bg-zinc-900 rounded-2xl active:scale-90 border border-white/5"><ArrowLeft size={18}/></button>
            <span className="text-red-600 font-black italic text-3xl tracking-wider uppercase">AVIATOR</span>
        </div>
        <div className="flex gap-4 items-center">
             <div className={`flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-2xl border border-white/5 transition-all ${insufficientBalance ? 'animate-shake-red' : ''}`}>
                 <Wallet size={16} className="text-green-500"/>
                 <span className="text-sm font-black font-mono">₹{userBalance.toFixed(2)}</span>
             </div>
             <button onClick={() => setMuted(toggleMute())} className="p-1">
                 {muted ? <VolumeX size={24} className="text-zinc-500"/> : <Volume2 size={24} className="text-zinc-300"/>}
             </button>
        </div>
      </div>

      {/* HISTORY BAR */}
      <div className="bg-zinc-950 p-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/5 relative z-40">
          <History size={14} className="text-zinc-700 shrink-0 ml-2"/>
          <div className="flex gap-2">
              {history.map((h, i) => (
                  <span key={i} className={`px-3 py-1 rounded-full text-[10px] font-black border border-white/5 whitespace-nowrap shadow-lg ${h >= 2 ? 'bg-purple-600 text-white border-purple-400' : 'bg-blue-900 text-blue-300 border-blue-700'}`}>{h.toFixed(2)}x</span>
              ))}
          </div>
      </div>

      <div className="relative flex-1 bg-[#050505] flex flex-col items-center justify-center overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-80 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
              <div className={`text-8xl md:text-9xl font-black font-mono tracking-tighter transition-all duration-300 ${phase === 'CRASHED' ? 'text-red-600 scale-110 drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]' : 'text-white'}`}>
                  {multiplier.toFixed(2)}x
              </div>
              {phase === 'WAITING' && (
                <div className="mt-8 flex flex-col items-center gap-2 bg-black/40 p-4 rounded-3xl backdrop-blur-md border border-white/5">
                    <div className="text-[10px] font-black uppercase tracking-[0.6em] text-zinc-500 animate-pulse">Wait for Round...</div>
                    <div className="text-3xl font-black text-yellow-500 font-mono italic">{timeLeft}s</div>
                </div>
              )}
              {phase === 'CRASHED' && (
                <div className="mt-4 bg-red-600 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest animate-bounce shadow-[0_0_20px_rgba(220,38,38,0.6)]">Flew Away!</div>
              )}
          </div>
      </div>

      <div className="bg-[#0a0a0a] p-4 border-t-4 border-red-600 z-[120] shadow-[0_-20px_60px_rgba(0,0,0,1)] flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
                {[1, 2].map(deckIdx => {
                    const amt = deckIdx === 1 ? betAmount : betAmount2;
                    const set = deckIdx === 1 ? setBetAmount : setBetAmount2;
                    const isActive = deckIdx === 1 ? activeBet : activeBet2;
                    return (
                        <div key={deckIdx} className="bg-zinc-950 p-4 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden">
                            <div className="flex items-center justify-center gap-2 mb-4 bg-black/60 py-3 rounded-2xl border border-white/5">
                                <button onClick={()=>set(Math.max(10, amt-10))} disabled={isActive} className="w-10 text-2xl font-black text-red-500 active:scale-90">-</button>
                                <span className="text-xl font-black font-mono min-w-[4rem] text-center">₹{amt}</span>
                                <button onClick={()=>set(amt+10)} disabled={isActive} className="w-10 text-2xl font-black text-green-500 active:scale-90">+</button>
                            </div>
                            <button onClick={() => handleAction(deckIdx as 1|2)} className={`w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 border-b-[8px] shadow-2xl ${isActive && phase === 'FLYING' ? 'bg-orange-500 border-orange-800' : isActive ? 'bg-zinc-800 border-black opacity-50' : 'bg-green-600 border-green-800'}`}>
                                {isActive && phase === 'FLYING' ? 'CASH OUT' : isActive ? 'STAKED' : 'BET'}
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
