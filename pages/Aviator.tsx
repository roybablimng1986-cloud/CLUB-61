import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Volume2, VolumeX, History } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus, subscribeToAviator } from '../services/mockFirebase';
import { GameResult, AviatorState } from '../types';

const Aviator: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [globalState, setGlobalState] = useState<AviatorState | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const activeBetRef = useRef(false);
  const [activeBet, setActiveBet] = useState(false);
  const [muted, setMuted] = useState(getMuteStatus());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const isMounted = useRef(true);
  const lastPhaseRef = useRef<string>('WAITING');
  
  const flickerRef = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    const unsub = subscribeToAviator((state) => {
        if (!isMounted.current) return;
        
        if (state.phase === 'CRASHED' && lastPhaseRef.current === 'FLYING') {
            playSound('plane_crash');
            if (activeBetRef.current) {
                activeBetRef.current = false;
                setActiveBet(false);
                onResult({ win: false, amount: betAmount, game: 'Aviator', resultDetails: [{label: 'Crashed', value: `${state.multiplier.toFixed(2)}x`}] });
            }
        }

        if (state.phase === 'FLYING' && lastPhaseRef.current === 'WAITING') {
            playSound('plane_engine');
        }

        lastPhaseRef.current = state.phase;
        setGlobalState(state);
    });

    return () => { isMounted.current = false; unsub(); stopAllSounds(); cancelAnimationFrame(animRef.current); };
  }, [betAmount]);

  const handleAction = () => {
      if (!globalState) return;
      if (globalState.phase === 'WAITING') {
          if (betAmount > userBalance) return alert("Insufficient Balance");
          activeBetRef.current = true; setActiveBet(true);
          updateBalance(-betAmount, 'BET', 'Aviator Stake');
          playSound('click');
      } else if (globalState.phase === 'FLYING' && activeBetRef.current) {
          const win = betAmount * globalState.multiplier;
          updateBalance(win, 'WIN', 'Aviator Payout');
          activeBetRef.current = false; setActiveBet(false);
          playSound('win');
          onResult({ win: true, amount: win, game: 'Aviator', resultDetails: [{label: 'Cashout', value: `${globalState.multiplier.toFixed(2)}x`}] });
          addGameHistory('Aviator', betAmount, win, `Exited @ ${globalState.multiplier.toFixed(2)}x`);
      }
  };

  useEffect(() => {
      const draw = () => {
          if (!isMounted.current || !globalState) return;
          const cvs = canvasRef.current; if (!cvs) return;
          const ctx = cvs.getContext('2d'); if (!ctx) return;
          
          cvs.width = cvs.offsetWidth;
          cvs.height = cvs.offsetHeight;
          ctx.clearRect(0, 0, cvs.width, cvs.height);
          
          const phase = globalState.phase;
          const mult = globalState.multiplier;
          
          ctx.strokeStyle = 'rgba(255,255,255,0.03)';
          ctx.lineWidth = 1;
          for(let i=0; i<cvs.width; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, cvs.height); ctx.stroke(); }
          for(let i=0; i<cvs.height; i+=40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(cvs.width, i); ctx.stroke(); }

          const padding = 60;
          const startX = padding;
          const startY = cvs.height - padding;

          ctx.strokeStyle = 'rgba(255,255,255,0.3)'; 
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(cvs.width, startY); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(startX, 0); ctx.stroke();

          if (phase === 'FLYING' || phase === 'CRASHED') {
              const progress = Math.min(1, (mult - 1) / 8);
              const endX = startX + (cvs.width - padding * 2) * progress;
              const baseCurveY = (cvs.height - padding * 2) * Math.pow(progress, 1.5);
              
              flickerRef.current += 0.2;
              const jitter = phase === 'FLYING' ? Math.sin(flickerRef.current) * 2.5 : 0;
              const endY = startY - baseCurveY + jitter;
              
              const gradient = ctx.createLinearGradient(0, endY, 0, startY);
              gradient.addColorStop(0, phase === 'CRASHED' ? 'rgba(153, 27, 27, 0.2)' : 'rgba(220, 38, 38, 0.3)');
              gradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
              
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.quadraticCurveTo(startX + (endX - startX) * 0.5, startY, endX, endY);
              ctx.lineTo(endX, startY);
              ctx.closePath();
              ctx.fillStyle = gradient;
              ctx.fill();

              ctx.beginPath();
              ctx.lineWidth = 4;
              ctx.lineCap = 'round';
              ctx.strokeStyle = phase === 'CRASHED' ? '#7f1d1d' : '#ef4444';
              ctx.shadowBlur = phase === 'CRASHED' ? 0 : 15;
              ctx.shadowColor = '#ef4444';
              ctx.moveTo(startX, startY);
              ctx.quadraticCurveTo(startX + (endX - startX) * 0.5, startY, endX, endY);
              ctx.stroke();
              ctx.shadowBlur = 0;
          }

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 80px sans-serif';
          ctx.fillStyle = phase === 'CRASHED' ? '#ef4444' : '#ffffff';
          ctx.fillText(`${mult.toFixed(2)}x`, cvs.width/2, cvs.height/2);

          animRef.current = requestAnimationFrame(draw);
      };
      animRef.current = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(animRef.current);
  }, [globalState]);

  if (!globalState) return <div className="min-h-screen bg-black flex items-center justify-center text-red-600 font-black animate-pulse">Syncing...</div>;

  return (
    <div className="bg-black min-h-screen text-white flex flex-col font-sans select-none overflow-hidden">
        <div className="p-4 flex justify-between items-center bg-[#111] border-b border-zinc-900 z-50">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-zinc-900 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
                <span className="text-red-600 font-black italic text-2xl tracking-wider uppercase">AVIATOR</span>
            </div>
            <div className="flex gap-4 items-center">
                 <div className="flex items-center gap-2 bg-zinc-900 px-4 py-1.5 rounded-xl border border-white/5">
                     <Wallet size={16} className="text-green-500"/><span className="text-sm font-black font-mono">₹{userBalance.toFixed(2)}</span>
                 </div>
                 <button onClick={() => setMuted(toggleMute())}>{muted ? <VolumeX size={20} className="text-zinc-500"/> : <Volume2 size={20} className="text-zinc-300"/>}</button>
            </div>
        </div>

        <div className="bg-zinc-950 p-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/5">
            <History size={14} className="text-zinc-700 shrink-0 ml-2"/>
            <div className="flex gap-2">
                {(globalState.history || []).map((h, i) => (
                    <span key={i} className={`px-3 py-1 rounded-full text-[10px] font-black border border-white/5 whitespace-nowrap shadow-md ${h >= 2 ? 'bg-purple-600 text-white' : 'bg-blue-900 text-blue-300'}`}>{h.toFixed(2)}x</span>
                ))}
            </div>
        </div>

        <div className="flex-1 relative flex flex-col items-center justify-center bg-[#050505]">
            <canvas ref={canvasRef} className="w-full h-full pointer-events-none" />
            
            {globalState.phase === 'WAITING' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                    <div className="w-24 h-24 rounded-full border-4 border-yellow-500/30 flex flex-col items-center justify-center bg-black/80 shadow-[0_0_40px_rgba(234,179,8,0.2)]">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Next Run</span>
                        <div className="text-4xl font-black text-yellow-500 font-mono italic">{Math.max(0, Math.ceil(globalState.timeLeft))}s</div>
                    </div>
                </div>
            )}
        </div>

        <div className="bg-[#0a0a0a] p-6 border-t-4 border-red-600 z-[60] shadow-[0_-20px_60px_rgba(0,0,0,1)]">
            <div className="flex gap-4 items-center">
                <div className="flex-1 bg-zinc-900 p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-4">
                        <button onClick={()=>setBetAmount(Math.max(10, betAmount-10))} disabled={activeBet} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-black active:scale-90">-</button>
                        <span className="text-xl font-black font-mono">₹{betAmount}</span>
                        <button onClick={()=>setBetAmount(betAmount+10)} disabled={activeBet} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-black active:scale-90">+</button>
                    </div>
                </div>
                <button onClick={handleAction} disabled={globalState.phase === 'CRASHED' || (globalState.phase === 'FLYING' && !activeBet)} className={`flex-[2] py-6 rounded-2xl font-black text-xl transition-all active:scale-95 border-b-[6px] shadow-2xl ${activeBet && globalState.phase === 'FLYING' ? 'bg-orange-500 border-orange-800' : activeBet ? 'bg-zinc-800 border-black opacity-50' : 'bg-green-600 border-green-800'}`}>
                    {activeBet && globalState.phase === 'FLYING' ? 'CASH OUT' : activeBet ? 'WAITING' : 'BET'}
                </button>
            </div>
        </div>
    </div>
  );
};
export default Aviator;
