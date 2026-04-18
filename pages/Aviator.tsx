import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, HelpCircle, Plus, Menu, History, Minus, Wallet, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus, subscribeToAviator, subscribeToAviatorBets, db, auth, addGameBet, getClockOffset } from '../services/supabaseService';
import { collection, addDoc } from 'firebase/firestore';
import { GameResult, AviatorState } from '../types';

import AviatorResultPopup from '../components/AviatorResultPopup';

import { useStabilizedTimer } from '../hooks/useTimer';

const Aviator: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [globalState, setGlobalState] = useState<AviatorState | null>(null);
  const [localMultiplier, setLocalMultiplier] = useState(1.0);
  const localMultiplierRef = useRef(1.0);
  const localTimeLeft = useStabilizedTimer(globalState?.phase === 'WAITING' ? globalState.endTime : undefined);
  const [aviatorResult, setAviatorResult] = useState<any | null>(null);

  useEffect(() => {
    if (!globalState) return;
    
    if (globalState.phase === 'FLYING' && globalState.startTime) {
        const interval = setInterval(() => {
            const elapsed = (Date.now() + getClockOffset() - globalState.startTime!) / 1000;
            const mult = Math.pow(1.1, elapsed);
            setLocalMultiplier(mult);
            localMultiplierRef.current = mult;

            // Auto Cashout Check
            const b1 = bet1Ref.current;
            const b2 = bet2Ref.current;
            if (b1.active && b1.isAuto && mult >= b1.autoValue) {
                handleBetAction(1);
            }
            if (b2.active && b2.isAuto && mult >= b2.autoValue) {
                handleBetAction(2);
            }
        }, 50);
        return () => clearInterval(interval);
    } else {
        setLocalMultiplier(globalState.multiplier);
        localMultiplierRef.current = globalState.multiplier;
    }
  }, [globalState?.phase, globalState?.startTime, globalState?.multiplier]);

  const [bet1, setBet1] = useState({ amount: 10, active: false, isAuto: false, autoValue: 2.0 });
  const [bet2, setBet2] = useState({ amount: 10, active: false, isAuto: false, autoValue: 2.0 });
  const [muted, setMuted] = useState(getMuteStatus());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const isMounted = useRef(true);
  const lastPhaseRef = useRef<string>('WAITING');
  const flickerRef = useRef(0);

  // Mock Round ID and Ping
  const [roundId] = useState(() => Math.floor(19735700 + Math.random() * 1000));
  const [ping] = useState(() => Math.floor(30 + Math.random() * 400));
  const [allBets, setAllBets] = useState<any[]>([]);

  const bet1Ref = useRef(bet1);
  const bet2Ref = useRef(bet2);

  useEffect(() => {
    bet1Ref.current = bet1;
    bet2Ref.current = bet2;
  }, [bet1, bet2]);

  useEffect(() => {
    isMounted.current = true;
    const unsub = subscribeToAviator((state) => {
        if (!isMounted.current) return;
        
        const b1 = bet1Ref.current;
        const b2 = bet2Ref.current;

        if (state.phase === 'CRASHED' && lastPhaseRef.current === 'FLYING') {
            playSound('plane_crash');
            
            // Handle Bet 1
            if (b1.active) {
                setBet1(prev => ({ ...prev, active: false }));
                setAviatorResult({ win: false, amount: b1.amount, multiplier: state.multiplier, game: 'Aviator' });
            }
            // Handle Bet 2
            if (b2.active) {
                setBet2(prev => ({ ...prev, active: false }));
                setAviatorResult({ win: false, amount: b2.amount, multiplier: state.multiplier, game: 'Aviator' });
            }
        }

        if (state.phase === 'FLYING' && lastPhaseRef.current === 'WAITING') {
            playSound('plane_engine');
        }

        if (state.phase === 'FLYING') {
            // Auto Cashout Check handled in multiplier interval
        }

        lastPhaseRef.current = state.phase;
        setGlobalState(state);
    });

    const unsubBets = subscribeToAviatorBets((data) => {
        if (isMounted.current) setAllBets(data);
    });

    return () => { isMounted.current = false; unsub(); unsubBets(); stopAllSounds(); cancelAnimationFrame(animRef.current); };
  }, []);

  const handleBetAction = async (betNum: 1 | 2) => {
      if (!globalState) return;
      const bet = betNum === 1 ? bet1 : bet2;
      const setBet = betNum === 1 ? setBet1 : setBet2;

      if (globalState.phase === 'WAITING' || globalState.phase === 'CRASHED') {
          if (!bet.active) {
              if (bet.amount > userBalance) return;
              
              try {
                  await addGameBet('aviator_bets', {
                      amount: bet.amount,
                      target: 'BET'
                  });
                  
                  setBet(prev => ({ ...prev, active: true }));
                  updateBalance(-bet.amount, 'BET', 'Aviator Stake');
                  playSound('click');
              } catch (e) {
                  console.error("Aviator bet error:", e);
              }
          } else {
              // Cancel bet if still waiting
              setBet(prev => ({ ...prev, active: false }));
              updateBalance(bet.amount, 'WIN', 'Aviator Cancel');
          }
      } else if (globalState.phase === 'FLYING' && bet.active) {
          const currentMult = localMultiplierRef.current;
          const win = bet.amount * currentMult;
          updateBalance(win, 'WIN', 'Aviator Payout');
          setBet(prev => ({ ...prev, active: false }));
          playSound('cash_out');
          setAviatorResult({ win: true, amount: win, multiplier: currentMult, game: 'Aviator' });
          addGameHistory('Aviator', bet.amount, win, `Exited @ ${currentMult.toFixed(2)}x`);
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

          // Background Rays
          ctx.save();
          ctx.translate(cvs.width / 2, cvs.height / 2);
          const rayCount = 12;
          const rayAngle = (Math.PI * 2) / rayCount;
          flickerRef.current += 0.01;
          for (let i = 0; i < rayCount; i++) {
              ctx.rotate(rayAngle);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(cvs.width, -cvs.width / 4);
              ctx.lineTo(cvs.width, cvs.width / 4);
              ctx.closePath();
              ctx.fillStyle = `rgba(255, 0, 0, ${0.03 + Math.sin(flickerRef.current + i) * 0.01})`;
              ctx.fill();
          }
          ctx.restore();

          // Grid
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.lineWidth = 1;
          const gridSize = 40;
          for(let i=0; i<cvs.width; i+=gridSize) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, cvs.height); ctx.stroke(); }
          for(let i=0; i<cvs.height; i+=gridSize) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(cvs.width, i); ctx.stroke(); }

          const padding = 40;
          const startX = padding + 20;
          const startY = cvs.height - padding - 20;

          // Draw Axis Dots
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          const dotCount = 10;
          const dotSpacingX = (cvs.width - startX - padding) / (dotCount - 1);
          for (let i = 0; i < dotCount; i++) {
              ctx.beginPath();
              ctx.arc(startX + i * dotSpacingX, startY + 25, 2.5, 0, Math.PI * 2);
              ctx.fill();
          }
          const dotSpacingY = (startY - padding) / (dotCount - 1);
          for (let i = 0; i < dotCount; i++) {
              ctx.beginPath();
              ctx.arc(startX - 25, startY - i * dotSpacingY, 2.5, 0, Math.PI * 2);
              ctx.fill();
          }

          // Draw Base Line
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(cvs.width - padding, startY);
          ctx.stroke();

          if (phase === 'FLYING' || phase === 'CRASHED') {
              // Adjust progress to lift earlier
              const progress = Math.min(1, (mult - 1) / 10);
              const endX = startX + (cvs.width - startX - padding * 2) * progress;
              
              // Lift immediately and more steeply as requested
              const maxLift = startY - padding * 4.5;
              const liftProgress = Math.min(1, progress * 1.8); 
              const baseCurveY = maxLift * (0.4 + 0.6 * Math.pow(liftProgress, 0.4));
              
              const jitter = phase === 'FLYING' ? Math.sin(Date.now() / 100) * 4 : 0;
              const endY = startY - baseCurveY + jitter;
              
              // Curve Gradient Area
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              // Steeper control point for more direct upward movement
              ctx.quadraticCurveTo(startX + (endX - startX) * 0.1, startY - baseCurveY * 0.2, endX, endY);
              ctx.lineTo(endX, startY);
              ctx.closePath();
              const gradient = ctx.createLinearGradient(0, endY, 0, startY);
              gradient.addColorStop(0, 'rgba(255, 0, 0, 0.6)');
              gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
              ctx.fillStyle = gradient;
              ctx.fill();

              // Curve Line
              ctx.beginPath();
              ctx.lineWidth = 6;
              ctx.lineCap = 'round';
              ctx.strokeStyle = '#ff0000';
              ctx.shadowBlur = 15;
              ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
              ctx.moveTo(startX, startY);
              ctx.quadraticCurveTo(startX + (endX - startX) * 0.4, startY, endX, endY);
              ctx.stroke();
              ctx.shadowBlur = 0;

              // Draw Plane (Detailed Red Silhouette)
              if (phase === 'FLYING') {
                  ctx.save();
                  ctx.translate(endX, endY);
                  // More dynamic rotation based on climb
                  const angle = -Math.atan2(baseCurveY, endX - startX) * 0.8;
                  ctx.rotate(angle);
                  
                  ctx.fillStyle = '#ff0000';
                  ctx.shadowBlur = 15;
                  ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
                  
                  // Fuselage (Sleeker)
                  ctx.beginPath();
                  ctx.ellipse(0, 0, 25, 7, 0, 0, Math.PI * 2);
                  ctx.fill();
                  
                  // Cockpit
                  ctx.fillStyle = '#8b0000';
                  ctx.beginPath();
                  ctx.ellipse(8, -2, 8, 3, 0, 0, Math.PI * 2);
                  ctx.fill();

                  // Wings (More detailed)
                  ctx.fillStyle = '#ff0000';
                  ctx.beginPath();
                  ctx.moveTo(0, -20);
                  ctx.lineTo(15, 0);
                  ctx.lineTo(0, 20);
                  ctx.lineTo(-8, 0);
                  ctx.closePath();
                  ctx.fill();

                  // Tail
                  ctx.beginPath();
                  ctx.moveTo(-18, 0);
                  ctx.lineTo(-28, -12);
                  ctx.lineTo(-28, 12);
                  ctx.closePath();
                  ctx.fill();

                  // Propeller Hub
                  ctx.beginPath();
                  ctx.arc(25, 0, 4, 0, Math.PI * 2);
                  ctx.fill();

                  // Propeller Blades (Spinning effect)
                  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                  ctx.lineWidth = 2;
                  const spin = Date.now() / 15;
                  ctx.beginPath();
                  ctx.moveTo(25, 0);
                  ctx.lineTo(25 + Math.cos(spin) * 15, Math.sin(spin) * 15);
                  ctx.moveTo(25, 0);
                  ctx.lineTo(25 - Math.cos(spin) * 15, -Math.sin(spin) * 15);
                  ctx.stroke();

                  // Exhaust/Smoke Trail
                  ctx.beginPath();
                  const smokeGrad = ctx.createLinearGradient(-30, 0, -60, 0);
                  smokeGrad.addColorStop(0, 'rgba(255, 0, 0, 0.4)');
                  smokeGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
                  ctx.fillStyle = smokeGrad;
                  ctx.arc(-35, 0, 5 + Math.sin(Date.now()/50)*2, 0, Math.PI*2);
                  ctx.fill();

                  ctx.restore();
              }
          }

          animRef.current = requestAnimationFrame(draw);
      };
      animRef.current = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(animRef.current);
  }, [globalState]);

  const getHistoryColor = (val: number) => {
      if (val < 1.2) return 'text-blue-400 bg-blue-400/10';
      if (val < 2.0) return 'text-blue-300 bg-blue-300/10';
      if (val < 10.0) return 'text-purple-400 bg-purple-400/10';
      return 'text-pink-500 bg-pink-500/10';
  };

  if (!globalState) return <div className="min-h-screen bg-[#141516] flex items-center justify-center text-red-600 font-black animate-pulse">Syncing...</div>;

  return (
    <div className="bg-[#141516] min-h-screen text-white flex flex-col font-sans select-none overflow-hidden">
        <AviatorResultPopup result={aviatorResult} onClose={() => setAviatorResult(null)} />
        {/* Header */}
        <div className="px-4 py-2 flex justify-between items-center bg-[#1b1c1d] border-b border-white/5 z-50">
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-1 text-zinc-400 active:scale-90"><ChevronLeft size={24}/></button>
                <div className="flex items-center gap-1">
                    <span className="text-[#e21b22] font-black italic text-xl tracking-tighter uppercase">Aviator</span>
                    <HelpCircle size={16} className="text-zinc-500"/>
                </div>
            </div>
            <div className="flex gap-3 items-center">
                 <div className="flex items-center gap-2 bg-[#2c2d2e] pl-1 pr-3 py-0.5 rounded-full border border-white/5">
                     <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-inner">
                         <Wallet size={12} className="text-yellow-900"/>
                     </div>
                     <span className="text-sm font-bold text-white">₹{userBalance.toFixed(2)}</span>
                     <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center active:scale-90">
                         <Plus size={14}/>
                     </div>
                 </div>
                 <button className="text-zinc-400"><Menu size={24}/></button>
            </div>
        </div>

        {/* History Bar */}
        <div className="bg-[#141516] px-4 py-2 flex items-center justify-between border-b border-white/5">
            <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar">
                {(globalState.history || []).map((h, i) => (
                    <span key={i} className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-white/5 whitespace-nowrap ${getHistoryColor(h)}`}>
                        {h.toFixed(2)}x
                    </span>
                ))}
            </div>
            <button className="ml-2 p-1 text-zinc-500"><History size={16}/></button>
        </div>

        {/* Game Area */}
        <div className="h-[320px] md:h-[400px] relative flex flex-col bg-[#000000] m-2 rounded-2xl overflow-hidden border border-white/5">
            {/* Info Overlay */}
            <div className="absolute top-2 left-4 right-4 flex justify-between items-center z-30 text-[10px] text-zinc-500 font-medium">
                <div className="flex items-center gap-1">
                    <span>Round ID: {roundId}</span>
                    <ChevronLeft size={10} className="-rotate-90"/>
                </div>
                <div className="flex items-center gap-1">
                    <span>Ping: {ping}ms</span>
                </div>
            </div>

            <canvas ref={canvasRef} className="w-full h-full" />
            
            {/* Multiplier Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                <AnimatePresence mode="wait">
                    {globalState.phase === 'FLYING' ? (
                        <motion.div 
                            key="flying"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-6xl md:text-8xl font-black text-white tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        >
                            {localMultiplier.toFixed(2)}x
                        </motion.div>
                    ) : globalState.phase === 'CRASHED' ? (
                        <motion.div 
                            key="crashed"
                            initial={{ scale: 1.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center"
                        >
                            <span className="text-xl font-bold text-white mb-1 uppercase tracking-widest">Flew Away!</span>
                            <span className="text-6xl md:text-8xl font-black text-[#e21b22] tracking-tight drop-shadow-[0_0_30px_rgba(226,27,34,0.4)]">
                                {localMultiplier.toFixed(2)}x
                            </span>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="waiting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center"
                        >
                            <div className="flex flex-col items-center gap-4 scale-90 md:scale-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-black text-4xl italic tracking-tighter uppercase">UFC</span>
                                    <div className="w-[2px] h-8 bg-zinc-700 mx-2" />
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-[#e21b22] font-black italic text-xl tracking-tighter uppercase">Aviator</span>
                                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Official Partners</span>
                                    </div>
                                </div>
                                <div className="bg-[#2c2d2e] px-4 py-2 rounded-xl flex flex-col items-center border border-white/5 w-64">
                                    <div className="flex items-center justify-between w-full mb-2">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Next Round In</span>
                                        <span className="text-sm font-black text-red-500 font-mono">{Math.max(0, localTimeLeft).toFixed(1)}s</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                        <motion.div 
                                            initial={{ width: '100%' }}
                                            animate={{ width: `${(localTimeLeft / 5) * 100}%` }}
                                            transition={{ duration: 0.1, ease: 'linear' }}
                                            className="h-full bg-red-600 shadow-[0_0_10px_rgba(226,27,34,0.5)]"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                            <Plus size={10} className="text-black rotate-45"/>
                                        </div>
                                        <span className="text-[10px] font-bold text-green-500 uppercase">Official Game</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* Betting Area */}
        <div className="px-2 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto no-scrollbar">
            <BetPanel 
                bet={bet1} 
                setBet={setBet1} 
                onAction={() => handleBetAction(1)} 
                phase={globalState.phase} 
                multiplier={localMultiplier}
            />
            <BetPanel 
                bet={bet2} 
                setBet={setBet2} 
                onAction={() => handleBetAction(2)} 
                phase={globalState.phase} 
                multiplier={localMultiplier}
            />

            {/* Live Bets Section */}
            <div className="md:col-span-2 bg-[#141516] rounded-2xl overflow-hidden border border-white/5">
                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Live Bets</span>
                    <span className="text-[10px] font-black text-green-500">{allBets.length} Online</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                    {allBets.map((b, idx) => (
                        <div key={b.id || `avi-bet-${idx}-${b.uid}`} className="px-4 py-2 flex items-center justify-between border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] font-black text-zinc-400">
                                    {b.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <span className="text-[10px] font-bold text-zinc-300">{b.username || 'Anonymous'}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-white">₹{b.amount.toFixed(2)}</span>
                                <div className="w-12 text-right">
                                    {b.cashoutAt ? (
                                        <span className="text-[10px] font-black text-green-500">{b.cashoutAt.toFixed(2)}x</span>
                                    ) : (
                                        <span className="text-[10px] font-black text-zinc-600">-</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

const BetPanel: React.FC<{ 
    bet: { amount: number, active: boolean, isAuto: boolean, autoValue: number }, 
    setBet: React.Dispatch<React.SetStateAction<{ amount: number, active: boolean, isAuto: boolean, autoValue: number }>>,
    onAction: () => void,
    phase: string,
    multiplier: number
}> = ({ bet, setBet, onAction, phase, multiplier }) => {
    return (
        <div className={`p-4 rounded-3xl border-2 transition-all flex flex-col gap-4 shadow-2xl relative overflow-hidden ${
            bet.active && phase === 'FLYING' 
                ? 'bg-[#e21b22]/10 border-[#e21b22]/50' 
                : 'bg-[#1b1c1d] border-white/5'
        }`}>
            {/* Auto Toggle Labels */}
            <div className="flex bg-black/40 rounded-full p-1 self-start">
                <button 
                    onClick={() => setBet(prev => ({ ...prev, isAuto: false }))}
                    className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${!bet.isAuto ? 'bg-[#2c2d2e] text-white shadow-lg' : 'text-zinc-500'}`}
                >
                    Manual
                </button>
                <button 
                    onClick={() => setBet(prev => ({ ...prev, isAuto: true }))}
                    className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${bet.isAuto ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500'}`}
                >
                    Auto
                </button>
            </div>

            <div className="flex gap-4">
                {/* Amount Controls */}
                <div className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center bg-black/60 rounded-2xl border border-white/10 p-1.5 shadow-inner">
                        <button 
                            onClick={() => setBet(prev => ({ ...prev, amount: Math.max(10, prev.amount - 10) }))}
                            className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-zinc-400 active:scale-95 shadow-md border border-white/5"
                        >
                            <Minus size={20}/>
                        </button>
                        <input 
                            type="number" 
                            value={bet.amount}
                            onChange={(e) => setBet(prev => ({ ...prev, amount: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="flex-1 bg-transparent text-center font-black text-2xl outline-none"
                        />
                        <button 
                            onClick={() => setBet(prev => ({ ...prev, amount: prev.amount + 10 }))}
                            className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-zinc-400 active:scale-95 shadow-md border border-white/5"
                        >
                            <Plus size={20}/>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {[100, 200, 500, 1000].map(val => (
                            <button 
                                key={val}
                                onClick={() => setBet(prev => ({ ...prev, amount: val }))}
                                className="bg-black/40 py-2 rounded-xl text-xs font-black text-zinc-400 active:scale-95 border border-white/10"
                            >
                                ₹{val}
                            </button>
                        ))}
                    </div>

                    {bet.isAuto && (
                        <div className="flex items-center bg-blue-900/20 rounded-2xl border border-blue-500/30 p-2 group transition-all">
                            <span className="text-[10px] font-black text-blue-500 uppercase ml-2 tracking-tighter">Auto Cashout:</span>
                            <input 
                                type="number" 
                                step="0.1"
                                value={bet.autoValue}
                                onChange={(e) => setBet(prev => ({ ...prev, autoValue: parseFloat(e.target.value) || 1.1 }))}
                                className="flex-1 bg-transparent text-center font-black text-lg outline-none text-white"
                            />
                            <span className="text-[10px] font-black text-blue-500 uppercase mr-2">X</span>
                        </div>
                    )}
                </div>

                {/* Main Action Button */}
                <button 
                    onClick={onAction}
                    disabled={phase === 'CRASHED' || (phase === 'FLYING' && !bet.active)}
                    className={`flex-1 rounded-[2.5rem] flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-[0_15px_50px_rgba(0,0,0,0.6)] border-b-[10px] group h-32 ${
                        bet.active && phase === 'FLYING' 
                            ? 'bg-gradient-to-br from-[#ff9a00] to-[#e68a00] border-[#995c00] hover:brightness-110' 
                            : bet.active 
                                ? 'bg-gradient-to-br from-[#ff0000] to-[#cc0000] border-[#800000] hover:brightness-110' 
                                : 'bg-gradient-to-br from-[#28a745] to-[#218838] border-[#145523] hover:brightness-110'
                    } disabled:opacity-50 disabled:grayscale`}
                >
                    <span className="text-xl font-black uppercase tracking-tighter group-hover:scale-110 transition-transform">
                        {bet.active && phase === 'FLYING' ? 'CASH OUT' : bet.active ? 'CANCEL' : 'BET'}
                    </span>
                    <span className="text-xs font-black opacity-80 font-mono">
                        {bet.active && phase === 'FLYING' ? `₹${(bet.amount * multiplier).toFixed(2)}` : `₹${bet.amount}`}
                    </span>
                </button>
            </div>
        </div>
    );
};

export default Aviator;
