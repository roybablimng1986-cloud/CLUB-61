import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Menu, Volume2, VolumeX, Wallet, History, Loader2, TrendingUp, TrendingDown, HelpCircle, X, Check } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus, getGameHistory, shouldForceLoss } from '../services/supabaseService';
import { GameResult } from '../types';

class AviatorSfx {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    this.isMuted = getMuteStatus();
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopEngine();
    }
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startEngine() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    this.stopEngine();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.4);

    osc.start(now);

    this.engineOsc = osc;
    this.engineGain = gain;
  }

  updateEnginePitch(multiplier: number) {
    if (this.isMuted || !this.ctx || !this.engineOsc) return;
    const now = this.ctx.currentTime;
    const targetFreq = Math.min(260, 70 + (multiplier - 1) * 12);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.15);
  }

  stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {}
      this.engineOsc = null;
    }
    if (this.engineGain) {
      try {
        this.engineGain.disconnect();
      } catch {}
      this.engineGain = null;
    }
  }

  playCrash() {
    this.stopEngine();
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(15, now + 0.7);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.7);

    osc.start(now);
    osc.stop(now + 0.7);
  }

  playCashout() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const delay = idx * 0.04;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.05, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);

      osc.start(now + delay);
      osc.stop(now + delay + 0.22);
    });
  }
}

interface AviatorProps {
  onBack: () => void;
  userBalance: number;
  onResult: (result: GameResult) => void;
}

type GamePhase = 'WAITING' | 'FLYING' | 'CRASHED';

interface BetState {
  amount: number;
  isActive: boolean;    // betting in current round (funds deducted)
  isQueued: boolean;    // queued for next round
  autoBet: boolean;     // automatically queue for the next round
  autoCashout: boolean;
  autoCashoutMult: number;
  hasCashedOut: boolean;
  wonAmount: number;
}

const Aviator: React.FC<AviatorProps> = ({ onBack, userBalance, onResult }) => {
  const sfx = useRef(new AviatorSfx());
  const [phase, setPhase] = useState<GamePhase>('WAITING');
  const [multiplier, setMultiplier] = useState(1.00);
  const [muted, setMuted] = useState(getMuteStatus());
  const [history, setHistory] = useState<number[]>([1.22, 2.45, 1.05, 8.12, 1.11, 3.44, 12.01, 1.00]);
  const [showRules, setShowRules] = useState(false);
  
  // Two separate bets state
  const [bets, setBetsState] = useState<[BetState, BetState]>([
    { amount: 10, isActive: false, isQueued: false, autoBet: false, autoCashout: false, autoCashoutMult: 2.0, hasCashedOut: false, wonAmount: 0 },
    { amount: 10, isActive: false, isQueued: false, autoBet: false, autoCashout: false, autoCashoutMult: 2.0, hasCashedOut: false, wonAmount: 0 }
  ]);

  const betsRef = useRef<[BetState, BetState]>(bets);

  const setBets = (newBets: [BetState, BetState] | ((prev: [BetState, BetState]) => [BetState, BetState])) => {
      setBetsState(prev => {
          const next = typeof newBets === 'function' ? newBets(prev) : newBets;
          betsRef.current = next;
          return next;
      });
  };

  const [localResult, setLocalResult] = useState<{ win: boolean; amount: number; text: string } | null>(null);
  const [waitTime, setWaitTime] = useState(5); 

  const crashPointRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isMounted = useRef(true);
  const waitingIntervalRef = useRef<any>(null);
  const crashTimeoutRef = useRef<any>(null);

  // Sync refs to avoid stale closures in animation loops
  const phaseRef = useRef<GamePhase>('WAITING');
  const userBalanceRef = useRef<number>(userBalance);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    betsRef.current = bets;
  }, [bets]);

  useEffect(() => {
    userBalanceRef.current = userBalance;
  }, [userBalance]);

  useEffect(() => {
    isMounted.current = true;
    sfx.current.setMuted(muted);
    const unsub = getGameHistory('Aviator', (prevGames) => {
        if (prevGames && prevGames.length > 0) {
            const points = prevGames.map(g => {
                const match = g.details.match(/@ ([\d\.]+)x/);
                return match ? parseFloat(match[1]) : 1.00;
            }).slice(0, 15);
            if (points.length > 0) setHistory(points);
        }
    });

    startWaitingPhase();
    return () => {
        isMounted.current = false;
        if (typeof unsub === 'function') unsub();
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (waitingIntervalRef.current) clearInterval(waitingIntervalRef.current);
        if (crashTimeoutRef.current) clearTimeout(crashTimeoutRef.current);
        sfx.current.stopEngine();
        stopAllSounds();
    }
  }, []);

  const handleToggleMute = () => {
      const nextMuted = toggleMute();
      setMuted(nextMuted);
      sfx.current.setMuted(nextMuted);
  };

  const showLocalToast = (message: string, isWin: boolean = false) => {
      setLocalResult({ win: isWin, amount: 0, text: message });
      setTimeout(() => {
          if (isMounted.current) {
              setLocalResult(prev => prev && prev.text === message ? null : prev);
          }
      }, 2500);
  };

  const startWaitingPhase = () => {
      if (!isMounted.current) return;
      if (crashTimeoutRef.current) {
          clearTimeout(crashTimeoutRef.current);
          crashTimeoutRef.current = null;
      }
      setPhase('WAITING');
      phaseRef.current = 'WAITING';
      setMultiplier(1.00);
      setWaitTime(5);
      setLocalResult(null);
      
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Reset bets that were active in the last round
      setBets(prev => {
          const updated = [...prev] as [BetState, BetState];
          for (let i = 0; i < 2; i++) {
              updated[i].isActive = false;
              updated[i].hasCashedOut = false;
              updated[i].wonAmount = 0;
              if (updated[i].autoBet) {
                  updated[i].isQueued = true;
              }
          }
          return updated;
      });

      if (waitingIntervalRef.current) {
          clearInterval(waitingIntervalRef.current);
      }

      let t = 5;
      waitingIntervalRef.current = setInterval(() => {
          if (!isMounted.current) {
              if (waitingIntervalRef.current) clearInterval(waitingIntervalRef.current);
              return;
          }
          t -= 0.1;
          setWaitTime(Math.max(0, t));
          if (t <= 0) {
              if (waitingIntervalRef.current) clearInterval(waitingIntervalRef.current);
              startFlyingPhase();
          } else {
              // Play countdown click/tick sound on whole numbers when t <= 3
              const rounded = Math.ceil(t);
              if (rounded <= 3 && Math.abs(t - rounded) < 0.05) {
                  playSound('tick');
              }
          }
      }, 100);
  };

  const startFlyingPhase = () => {
      if (!isMounted.current) return;

      if (waitingIntervalRef.current) {
          clearInterval(waitingIntervalRef.current);
      }

      let totalDeductions = 0;
      const currentBets = [...betsRef.current] as [BetState, BetState];
      let anyActive = false;

      // Handle queued bets activation
      for (let i = 0; i < 2; i++) {
          if (currentBets[i].isQueued) {
              if (userBalanceRef.current - totalDeductions < currentBets[i].amount) {
                  currentBets[i].isQueued = false;
                  showLocalToast(`Low Balance for Slot ${i + 1}!`);
              } else {
                  currentBets[i].isActive = true;
                  currentBets[i].isQueued = false;
                  currentBets[i].hasCashedOut = false;
                  totalDeductions += currentBets[i].amount;
                  anyActive = true;
              }
          }
      }

      if (totalDeductions > 0) {
          updateBalance(-totalDeductions, 'BET', 'Aviator Stake');
          playSound('bet_place');
      }

      setBets(currentBets);
      betsRef.current = currentBets;
      setPhase('FLYING');
      phaseRef.current = 'FLYING';
      playSound('plane'); 
      sfx.current.startEngine();

      // Risk management calculation
      let maxActiveBet = 0;
      for (let i = 0; i < 2; i++) {
          if (currentBets[i].isActive) {
              maxActiveBet = Math.max(maxActiveBet, currentBets[i].amount);
          }
      }

      let cp = 1.0;
      if (anyActive && shouldForceLoss(maxActiveBet, userBalanceRef.current)) {
          cp = 1.0 + Math.random() * 0.15; // crash very early
      } else {
          const r = Math.random();
          if (r < 0.35) cp = 1.01 + Math.random() * 0.49; // early crash
          else if (r < 0.7) cp = 1.5 + Math.random() * 1.5;
          else cp = 2.0 + Math.random() * 6.0; 
      }

      crashPointRef.current = parseFloat(cp.toFixed(2));
      startTimeRef.current = Date.now();
      
      if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
      }
      animateGame();
  };

  const animateGame = () => {
    if (!isMounted.current || phaseRef.current !== 'FLYING') return;
    const now = Date.now();
    const elapsed = (now - startTimeRef.current) / 1000;
    const currentMult = 1 + (elapsed * 0.1) + (Math.pow(elapsed, 2) * 0.08);

    // Auto Cashout check (evaluated before crash, using the lesser of current and crash point)
    let cashoutOccurred = false;
    const currentBets = [...betsRef.current] as [BetState, BetState];
    const maxReachedMult = Math.min(currentMult, crashPointRef.current);

    for (let i = 0; i < 2; i++) {
        if (currentBets[i].isActive && !currentBets[i].hasCashedOut && currentBets[i].autoCashout) {
            if (Number(maxReachedMult) >= Number(currentBets[i].autoCashoutMult)) {
                // Trigger Auto Cashout!
                const winAmount = Number(currentBets[i].amount) * Number(currentBets[i].autoCashoutMult);
                updateBalance(winAmount, 'WIN', `Aviator Auto Cashout ${i + 1}`);
                currentBets[i].hasCashedOut = true;
                currentBets[i].isActive = false;
                currentBets[i].wonAmount = winAmount;
                playSound('cash_out');
                sfx.current.playCashout();
                addGameHistory('Aviator', currentBets[i].amount, winAmount, `Auto Cashed @ ${currentBets[i].autoCashoutMult.toFixed(2)}x`);
                
                setLocalResult({ win: true, amount: winAmount, text: `Slot ${i + 1} Auto Cashed @ ${currentBets[i].autoCashoutMult.toFixed(2)}x` });
                onResult({
                    win: true,
                    amount: winAmount,
                    game: 'Aviator',
                    period: Date.now().toString(),
                    resultDetails: [{label: `Slot ${i+1} Auto`, value: `${currentBets[i].autoCashoutMult.toFixed(2)}x`, color: 'text-green-500'}]
                });

                cashoutOccurred = true;
            }
        }
    }

    if (cashoutOccurred) {
        setBets(currentBets);
        betsRef.current = currentBets;
    }

    if (currentMult >= crashPointRef.current) {
        handleCrash(crashPointRef.current);
    } else {
        setMultiplier(currentMult);
        drawGraph(currentMult, elapsed, false);
        sfx.current.updateEnginePitch(currentMult);
        animationRef.current = requestAnimationFrame(animateGame);
    }
  };

  const handleCrash = (finalMult: number) => {
      if (!isMounted.current) return;
      if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = 0;
      }
      setPhase('CRASHED');
      phaseRef.current = 'CRASHED';
      setMultiplier(finalMult);
      const finalElapsed = (Date.now() - startTimeRef.current) / 1000;
      drawGraph(finalMult, finalElapsed, true);
      playSound('plane_crash');
      sfx.current.playCrash();
      setHistory(prev => [finalMult, ...prev].slice(0, 15));

      const currentBets = [...betsRef.current] as [BetState, BetState];
      let lostAny = false;
      let totalLoss = 0;

      for (let i = 0; i < 2; i++) {
          if (currentBets[i].isActive && !currentBets[i].hasCashedOut) {
              currentBets[i].isActive = false;
              addGameHistory('Aviator', currentBets[i].amount, 0, `Slot ${i + 1} Crashed @ ${finalMult.toFixed(2)}x`);
              lostAny = true;
              totalLoss += currentBets[i].amount;
          }
      }

      if (lostAny) {
          setLocalResult({ win: false, amount: totalLoss, text: `Flews away at ${finalMult.toFixed(2)}x` });
          onResult({
              win: false,
              amount: totalLoss,
              game: 'Aviator',
              period: Date.now().toString(),
              resultDetails: [{label: 'Crash', value: `${finalMult.toFixed(2)}x`, color: 'text-red-500'}]
          });
      }

      setBets(currentBets);

      if (crashTimeoutRef.current) clearTimeout(crashTimeoutRef.current);
      crashTimeoutRef.current = setTimeout(() => {
          if (isMounted.current) startWaitingPhase();
      }, 3000);
  };

  const placeOrCancelBet = (index: number) => {
      playSound('click');
      const currentBets = [...bets] as [BetState, BetState];
      const bet = currentBets[index];

      if (phase === 'WAITING' || phase === 'CRASHED') {
          // Can queue or cancel queue
          if (bet.isQueued) {
              bet.isQueued = false;
              bet.autoBet = false;
          } else {
              if (bet.amount > userBalance) {
                  showLocalToast("Insufficient Balance!");
                  return;
              }
              bet.isQueued = true;
          }
      } else if (phase === 'FLYING') {
          // Game is flying
          if (bet.isActive && !bet.hasCashedOut) {
              // Active cash out
              const winAmount = bet.amount * multiplier;
              updateBalance(winAmount, 'WIN', `Aviator Cashout Slot ${index + 1}`);
              bet.hasCashedOut = true;
              bet.isActive = false;
              bet.wonAmount = winAmount;
              playSound('cash_out');
              sfx.current.playCashout();
              addGameHistory('Aviator', bet.amount, winAmount, `Cashed @ ${multiplier.toFixed(2)}x`);
              
              setLocalResult({ win: true, amount: winAmount, text: `Slot ${index + 1} Cashed @ ${multiplier.toFixed(2)}x!` });
              onResult({
                win: true,
                amount: winAmount,
                game: 'Aviator',
                period: Date.now().toString(),
                resultDetails: [{label: `Slot ${index+1} Cash`, value: `${multiplier.toFixed(2)}x`, color: 'text-green-500'}]
              });
          } else if (bet.isQueued) {
              // Cancel queued bet
              bet.isQueued = false;
              bet.autoBet = false;
          } else {
              // Queue for next round
              if (bet.amount > userBalance) {
                  showLocalToast("Insufficient Balance!");
                  return;
              }
              bet.isQueued = true;
          }
      }

      setBets(currentBets);
  };

  const drawGraph = (currentMult: number, elapsed: number, isCrash: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Make canvas size perfectly match container client size! This prevents huge viewport overflow on desktop
      const parent = canvas.parentElement;
      const width = parent?.clientWidth || 360;
      const height = parent?.clientHeight || 280;

      if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);
      const timeScale = Math.max(5, elapsed * 1.3); 
      const multScale = Math.max(2, currentMult * 1.3);

      const getX = (t: number) => (t / timeScale) * width;
      const getY = (m: number) => height - ((m - 1) / Math.max(0.001, multScale - 1)) * height;

      ctx.strokeStyle = '#222';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      const step = Math.max(1, Math.ceil(multScale / 5));
      for(let i=1; i<multScale; i+=step) {
          const y = getY(i);
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.fillStyle = '#555';
          ctx.font = '10px Arial';
          ctx.fillText(`${i}x`, 10, y - 5);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, height); 
      const plotStep = 0.05;
      for (let t = 0; t <= elapsed; t += plotStep) {
          const m = 1 + (t * 0.1) + (Math.pow(t, 2) * 0.08);
          ctx.lineTo(getX(t), getY(m));
      }
      
      const endX = getX(elapsed);
      const endY = getY(currentMult);
      ctx.lineTo(endX, endY);

      if (!isCrash) {
        ctx.lineTo(endX, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, endY, 0, height);
        gradient.addColorStop(0, 'rgba(220, 38, 38, 0.4)');
        gradient.addColorStop(1, 'rgba(220, 38, 38, 0.01)');
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let t = 0; t <= elapsed; t += plotStep) {
          const m = 1 + (t * 0.1) + (Math.pow(t, 2) * 0.08);
          ctx.lineTo(getX(t), getY(m));
      }
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#ef4444'; 
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Plane icon
      if (!isCrash) {
        ctx.save();
        ctx.translate(endX, endY);
        const prevT = Math.max(0, elapsed - 0.1);
        const prevM = 1 + (prevT * 0.1) + (Math.pow(prevT, 2) * 0.08);
        const dy = getY(currentMult) - getY(prevM);
        const dx = getX(elapsed) - getX(prevT);
        const angle = Math.atan2(dy, dx);
        ctx.rotate(angle); 
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(16, 0); 
        ctx.lineTo(-10, 8); 
        ctx.lineTo(-4, 0); 
        ctx.lineTo(-10, -8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
  };

  const adjustAmount = (index: number, diff: number) => {
      playSound('click');
      setBets(prev => {
          const updated = [...prev] as [BetState, BetState];
          updated[index].amount = Math.max(1, updated[index].amount + diff);
          return updated;
      });
  };

  const setFixedAmount = (index: number, val: number) => {
      playSound('click');
      setBets(prev => {
          const updated = [...prev] as [BetState, BetState];
          updated[index].amount = val;
          return updated;
      });
  };

  const toggleAutoCashoutSetting = (index: number) => {
      playSound('click');
      setBets(prev => {
          const updated = [...prev] as [BetState, BetState];
          updated[index].autoCashout = !updated[index].autoCashout;
          return updated;
      });
  };

  const toggleAutoBetSetting = (index: number) => {
      playSound('click');
      setBets(prev => {
          const updated = [...prev] as [BetState, BetState];
          const newAutoBet = !updated[index].autoBet;
          updated[index].autoBet = newAutoBet;
          
          if (newAutoBet) {
              if (!updated[index].isActive && !updated[index].isQueued) {
                  updated[index].isQueued = true;
              }
          } else {
              if (updated[index].isQueued) {
                  updated[index].isQueued = false;
              }
          }
          return updated;
      });
  };

  const changeAutoCashoutMult = (index: number, diff: number) => {
      playSound('click');
      setBets(prev => {
          const updated = [...prev] as [BetState, BetState];
          updated[index].autoCashoutMult = parseFloat(Math.max(1.01, updated[index].autoCashoutMult + diff).toFixed(2));
          return updated;
      });
  };

  return (
    <div className="bg-[#0c0d12] min-h-screen flex flex-col font-sans text-white relative">
       {localResult && (
           <div className="absolute top-16 left-0 w-full z-[100] px-4 pointer-events-none animate-in slide-in-from-top duration-300">
               <div className={`flex items-center justify-between p-4 rounded-2xl shadow-2xl border backdrop-blur-md ${localResult.win ? 'bg-emerald-600/95 border-emerald-400 shadow-emerald-900/40' : 'bg-red-600/95 border-red-400 shadow-red-900/40'}`}>
                   <div className="flex items-center gap-3">
                       <div className="bg-white/20 p-2 rounded-full">
                           {localResult.win ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
                       </div>
                       <div>
                           <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{localResult.win ? 'CASHOUT SUCCESS' : 'ROUND FINISHED'}</p>
                           <h4 className="text-sm font-black italic">{localResult.text}</h4>
                       </div>
                   </div>
                   <div className="text-right">
                       <p className="text-[9px] font-black uppercase opacity-60">Result</p>
                       <p className="text-lg font-black font-mono">₹{localResult.amount.toFixed(2)}</p>
                   </div>
               </div>
           </div>
       )}

       <div className="bg-black p-3 flex items-center justify-between border-b border-gray-900 z-10">
         <div className="flex items-center gap-2">
             <button onClick={onBack} className="p-2.5 bg-zinc-900 rounded-xl hover:bg-slate-800"><ArrowLeft className="text-gray-400" size={16}/></button>
             <span className="text-red-500 font-black italic text-xl tracking-wider uppercase">Aviator Elite</span>
         </div>
         <div className="flex gap-2 items-center">
              <div className="flex items-center gap-2 bg-zinc-900 px-3.5 py-1.5 rounded-full border border-white/5 shadow-inner">
                  <Wallet size={12} className="text-red-500"/>
                  <span className="text-xs font-black font-mono text-red-400">₹{userBalance.toFixed(2)}</span>
              </div>
              <button onClick={() => setShowRules(true)} className="p-2 hover:bg-zinc-900 rounded-full"><HelpCircle size={18} className="text-gray-400"/></button>
              <button onClick={handleToggleMute} className="p-2 hover:bg-zinc-900 rounded-full">
                  {muted ? <VolumeX size={18} className="text-gray-400" /> : <Volume2 size={18} className="text-gray-400" />}
              </button>
         </div>
       </div>

       {/* Previous Multipliers History Bar */}
       <div className="bg-[#111217] p-2 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-gray-900">
           {history.map((m, i) => (
               <div key={i} className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[10px] font-black font-mono bg-zinc-900 border border-white/5 ${m < 2.0 ? 'text-blue-400' : m < 10.0 ? 'text-purple-400' : 'text-pink-500'}`}>
                   {m.toFixed(2)}x
               </div>
           ))}
       </div>

       {/* Flying Arena Panel */}
       <div className="relative flex-1 bg-[#090a0f] flex flex-col justify-center overflow-hidden border-b border-zinc-900 min-h-[220px]">
         {phase === 'WAITING' && (
             <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-[2px]">
                  <div className="text-base font-black uppercase tracking-[0.25em] text-gray-400 mb-3 animate-pulse text-center px-4">
                     Waiting for next round
                  </div>
                  <div className="w-56 h-2 bg-gray-800 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
                      <div className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(220,38,38,0.7)]" style={{ width: `${(waitTime / 5) * 100}%` }}></div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-2 uppercase font-bold tracking-widest font-mono">
                      Starting in {waitTime.toFixed(1)}s
                  </div>
             </div>
         )}

         {(phase === 'FLYING' || phase === 'CRASHED') && (
              <div className="absolute top-[25%] left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
                  {phase === 'CRASHED' && <div className="text-red-500 font-black text-lg uppercase mb-1 tracking-widest animate-pulse">FLEW AWAY!</div>}
                  <div className={`text-6xl font-black drop-shadow-[0_4px_15px_rgba(0,0,0,0.8)] font-mono tracking-tighter ${phase === 'CRASHED' ? 'text-red-600' : 'text-white'}`}>
                      {multiplier.toFixed(2)}x
                  </div>
              </div>
         )}

         <canvas ref={canvasRef} className="absolute inset-0 z-10 w-full h-full" />
       </div>

       {/* Main Dual Betting Area */}
       <div className="bg-[#12131a] p-3 sm:p-4 border-t-2 border-red-600 z-30 shadow-[0_-15px_40px_rgba(0,0,0,0.8)] max-h-[360px] overflow-y-auto no-scrollbar pb-6 space-y-3.5">
          {/* Bet Slots */}
          {[0, 1].map((idx) => {
              const bet = bets[idx];
              const isBetActiveInFlying = bet.isActive && phase === 'FLYING' && !bet.hasCashedOut;
              
              return (
                  <div key={idx} className="bg-[#191a21] rounded-2xl p-3 border border-white/5 flex flex-col gap-3 relative overflow-hidden">
                      {/* Tabs: Bet Controller Header */}
                      <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                              BET PANEL {idx + 1}
                          </span>
                          
                          {/* Auto Bet & Cashout options */}
                          <div className="flex items-center gap-2">
                              <button 
                                  onClick={() => toggleAutoBetSetting(idx)}
                                  className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all border ${
                                      bet.autoBet 
                                      ? 'bg-emerald-600/25 text-emerald-400 border-emerald-600/50 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                                      : 'bg-zinc-900 text-zinc-500 border-transparent'
                                  }`}
                              >
                                  AUTO BET
                              </button>
                              <button 
                                  onClick={() => !isBetActiveInFlying && toggleAutoCashoutSetting(idx)}
                                  disabled={isBetActiveInFlying}
                                  className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all border ${
                                      bet.autoCashout 
                                      ? 'bg-red-600/20 text-red-400 border-red-600/50 shadow-[0_0_10px_rgba(220,38,38,0.15)]' 
                                      : 'bg-zinc-900 text-zinc-500 border-transparent'
                                  }`}
                              >
                                  AUTO CASHOUT
                              </button>
                          </div>
                      </div>

                      {/* Prominent Auto Cashout Selector Block */}
                      {bet.autoCashout && (
                          <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex flex-col gap-2 transition-all">
                              <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cashout Multiplier</span>
                                  <div className="flex items-center bg-zinc-950 rounded-lg border border-white/10 h-8 px-1.5 shadow-inner">
                                      <button 
                                          onClick={() => !isBetActiveInFlying && changeAutoCashoutMult(idx, -0.1)}
                                          disabled={isBetActiveInFlying}
                                          className="w-6 h-full text-zinc-400 hover:text-white font-extrabold text-sm active:scale-90"
                                      >
                                          -
                                      </button>
                                      <input 
                                          type="number" step="0.01" min="1.01" disabled={isBetActiveInFlying} 
                                          value={bet.autoCashoutMult}
                                          onChange={(e) => {
                                              const val = parseFloat(e.target.value);
                                              if (!isNaN(val)) {
                                                  setBets(prev => {
                                                      const updated = [...prev] as [BetState, BetState];
                                                      updated[idx].autoCashoutMult = parseFloat(val.toFixed(2));
                                                      return updated;
                                                  });
                                              }
                                          }}
                                          className="w-16 bg-transparent text-center text-xs text-white font-black outline-none font-mono" 
                                      />
                                      <button 
                                          onClick={() => !isBetActiveInFlying && changeAutoCashoutMult(idx, 0.1)}
                                          disabled={isBetActiveInFlying}
                                          className="w-6 h-full text-zinc-400 hover:text-white font-extrabold text-sm active:scale-90"
                                      >
                                          +
                                      </button>
                                  </div>
                              </div>
                              {/* Multiplier Presets */}
                              <div className="grid grid-cols-5 gap-1.5">
                                  {[1.5, 2.0, 3.0, 5.0, 10.0].map(mult => (
                                      <button
                                          key={mult}
                                          type="button"
                                          onClick={() => {
                                              if (!isBetActiveInFlying) {
                                                  setBets(prev => {
                                                      const updated = [...prev] as [BetState, BetState];
                                                      updated[idx].autoCashoutMult = mult;
                                                      return updated;
                                                  });
                                              }
                                          }}
                                          disabled={isBetActiveInFlying}
                                          className={`py-1.5 rounded-lg text-[10px] font-bold tracking-tight font-mono transition-all border ${
                                              Math.abs(bet.autoCashoutMult - mult) < 0.01
                                              ? 'bg-red-600 text-white border-red-500 shadow-md scale-105'
                                              : 'bg-[#1e1f29] text-zinc-400 border-white/5 hover:text-zinc-200'
                                          }`}
                                      >
                                          {mult.toFixed(1)}x
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* Controls and Bet Trigger Column */}
                      <div className="grid grid-cols-5 gap-3 items-stretch">
                          {/* Col 1-3: Stake Selectors */}
                          <div className="col-span-3 flex flex-col justify-between">
                              {/* Amount input block with close +/- buttons */}
                              <div className="bg-black/40 rounded-xl flex items-center h-10 px-1.5 border border-white/5 shadow-inner">
                                  <button 
                                      onClick={() => !isBetActiveInFlying && adjustAmount(idx, -10)} 
                                      disabled={isBetActiveInFlying}
                                      className="w-8 h-8 rounded-lg bg-zinc-900/60 text-zinc-500 hover:text-white text-base font-black flex items-center justify-center transition-all disabled:opacity-30 active:scale-90"
                                  >
                                      -
                                  </button>
                                  <input 
                                      type="number" 
                                      value={bet.amount === 0 ? '' : bet.amount} 
                                      disabled={isBetActiveInFlying}
                                      onChange={(e) => {
                                          const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                          if (!isNaN(val)) {
                                              setBets(prev => {
                                                  const updated = [...prev] as [BetState, BetState];
                                                  updated[idx].amount = val;
                                                  return updated;
                                              });
                                          }
                                      }}
                                      onBlur={() => {
                                          if (bet.amount < 1) {
                                              setBets(prev => {
                                                  const updated = [...prev] as [BetState, BetState];
                                                  updated[idx].amount = 1;
                                                  return updated;
                                              });
                                          }
                                      }}
                                      className="flex-1 bg-transparent text-center text-white font-black text-sm outline-none font-mono w-16" 
                                  />
                                  <button 
                                      onClick={() => !isBetActiveInFlying && adjustAmount(idx, 10)} 
                                      disabled={isBetActiveInFlying}
                                      className="w-8 h-8 rounded-lg bg-zinc-900/60 text-zinc-500 hover:text-white text-base font-black flex items-center justify-center transition-all disabled:opacity-30 active:scale-90"
                                  >
                                      +
                                  </button>
                              </div>

                              {/* Amount Select quick tiles - fits perfectly */}
                              <div className="grid grid-cols-3 gap-1 mt-1.5">
                                  {[100, 500, 1000].map(amt => (
                                      <button 
                                          key={amt} 
                                          onClick={() => !isBetActiveInFlying && setFixedAmount(idx, amt)}
                                          disabled={isBetActiveInFlying}
                                          className="py-1 bg-[#25262e] rounded-lg text-[9px] font-black text-zinc-400 border border-white/5 hover:text-white active:scale-95 transition-all disabled:opacity-30"
                                      >
                                          ₹{amt}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          {/* Col 4-5: Main Bet Button */}
                          <div className="col-span-2">
                              <button 
                                   onClick={() => placeOrCancelBet(idx)}
                                   className={`w-full h-full rounded-xl flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 py-2.5 px-2 border-b-4 ${
                                       isBetActiveInFlying
                                       ? 'bg-gradient-to-r from-orange-500 to-amber-500 border-amber-700 hover:brightness-110' 
                                       : (bet.isQueued || bet.isActive) 
                                           ? 'bg-red-700 border-red-900 hover:bg-red-600' 
                                           : 'bg-green-600 border-green-800 hover:bg-green-500' 
                                   }`}
                              >
                                   <span className="text-white font-black text-[10px] uppercase leading-none tracking-widest mb-1">
                                       {isBetActiveInFlying ? 'CASH OUT' : ((bet.isQueued || bet.isActive) ? 'CANCEL' : 'BET')}
                                   </span>
                                   
                                   {isBetActiveInFlying ? (
                                       <span className="text-white font-black text-sm leading-none font-mono animate-pulse">
                                           ₹{(bet.amount * multiplier).toFixed(1)}
                                       </span>
                                   ) : (
                                       <span className="text-white/80 font-black text-[11px] leading-none font-mono">
                                           ₹{bet.amount}
                                       </span>
                                   )}
                              </button>
                          </div>
                      </div>
                      
                      {/* State Badges inside container */}
                      {bet.isQueued && phase !== 'WAITING' && (
                          <div className="absolute inset-0 bg-black/90 backdrop-blur-[1px] flex items-center justify-center z-10 animate-in fade-in duration-200">
                              <div className="text-red-500 font-black uppercase tracking-[0.25em] text-[10px] border border-red-500/50 px-5 py-2 rounded-full bg-zinc-950 flex items-center gap-1.5 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                  <Loader2 size={12} className="animate-spin" /> Queued for next round
                              </div>
                              <button 
                                  onClick={() => placeOrCancelBet(idx)}
                                  className="absolute bottom-3 right-3 p-1.5 bg-red-600/20 text-red-500 border border-red-500/30 rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-90"
                              >
                                  CANCEL
                              </button>
                          </div>
                      )}

                      {bet.hasCashedOut && (
                          <div className="absolute inset-0 bg-black/85 backdrop-blur-[1px] flex items-center justify-center z-10 animate-in fade-in duration-200">
                              <div className="text-emerald-500 font-black uppercase tracking-[0.25em] text-xs border border-emerald-500/30 px-5 py-2.5 rounded-full bg-zinc-950 flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                  <Check size={14} /> CASHED OUT ₹{bet.wonAmount.toFixed(1)}
                              </div>
                          </div>
                      )}
                  </div>
              );
          })}
       </div>

       {showRules && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
              <div className="bg-[#121318] border border-red-500/30 w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in">
                   <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                        <h2 className="text-2xl font-black italic text-red-500 uppercase">Aviator Rules</h2>
                        <button onClick={() => setShowRules(false)} className="p-2.5 bg-zinc-900 rounded-full hover:bg-zinc-800"><X size={18}/></button>
                   </div>
                   <div className="space-y-4 text-xs text-slate-400 leading-relaxed font-black uppercase tracking-wider">
                       <p>1. Place your stake in one or <span className="text-red-500">both</span> panels before take-off.</p>
                       <p>2. Multiplier climbs continuously as the plane flies.</p>
                       <p>3. Tap <span className="text-green-500">CASH OUT</span> on each panel to claim winnings based on current multiplier.</p>
                       <p>4. Set <span className="text-red-400">AUTO CASHOUT</span> to execute payout automatically at your target multiplier rate.</p>
                       <p>5. If the plane flies away before cash out, your stake in that panel is lost.</p>
                   </div>
              </div>
          </div>
       )}
    </div>
  );
};

export default Aviator;
