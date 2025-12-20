
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, History, HelpCircle, Menu, Volume2, VolumeX, Wallet } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus, getGameHistory } from '../services/mockFirebase';
import { GameResult } from '../types';

interface AviatorProps {
  onBack: () => void;
  userBalance: number;
  onResult: (result: GameResult) => void;
}

type GamePhase = 'WAITING' | 'FLYING' | 'CRASHED';

const Aviator: React.FC<AviatorProps> = ({ onBack, userBalance, onResult }) => {
  const [phase, setPhase] = useState<GamePhase>('WAITING');
  const [multiplier, setMultiplier] = useState(1.00);
  const [betAmount, setBetAmount] = useState(10);
  const [muted, setMuted] = useState(getMuteStatus());
  const [history, setHistory] = useState<number[]>([1.22, 2.45, 1.05, 8.12, 1.11, 3.44, 12.01, 1.00]); // Mock init
  
  // Use Ref for betting state to avoid closure staleness in game loop
  const activeBetRef = useRef(false);
  const [activeBet, setActiveBet] = useState(false); 
  
  const nextRoundBetRef = useRef(false);
  const [nextRoundBet, setNextRoundBet] = useState(false);

  const [waitTime, setWaitTime] = useState(5); 

  const crashPointRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    // Load real history if available
    const prevGames = getGameHistory('Aviator');
    if (prevGames.length > 0) {
        const points = prevGames.map(g => {
            const match = g.details.match(/@ ([\d\.]+)x/);
            return match ? parseFloat(match[1]) : 1.00;
        }).slice(0, 15);
        if (points.length > 0) setHistory(points);
    }

    startWaitingPhase();
    return () => {
        isMounted.current = false;
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        stopAllSounds(); // Strictly stop all sounds when leaving
    }
  }, []);

  const handleToggleMute = () => {
      setMuted(toggleMute());
  };

  const startWaitingPhase = () => {
      if (!isMounted.current) return;
      setPhase('WAITING');
      setMultiplier(1.00);
      setWaitTime(5);
      
      // Reset Canvas
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      if (activeBetRef.current) {
          activeBetRef.current = false;
          setActiveBet(false);
      }

      let t = 5;
      const interval = setInterval(() => {
          if (!isMounted.current) {
              clearInterval(interval);
              return;
          }
          t -= 0.1;
          setWaitTime(Math.max(0, t));
          if (t <= 0) {
              clearInterval(interval);
              startFlyingPhase();
          }
      }, 100);
  };

  const startFlyingPhase = () => {
      if (!isMounted.current) return;

      // Transfer next round bet to active bet
      if (nextRoundBetRef.current) {
          if (userBalance < betAmount) {
              nextRoundBetRef.current = false;
              setNextRoundBet(false);
              alert("Insufficient Balance for queued bet!");
          } else {
              activeBetRef.current = true;
              setActiveBet(true);
              nextRoundBetRef.current = false;
              setNextRoundBet(false);
              
              updateBalance(-betAmount, 'BET', 'Aviator');
              playSound('click');
          }
      }

      setPhase('FLYING');
      if (isMounted.current) playSound('plane'); 
      
      const r = Math.random();
      let cp = 1.0;
      if (r < 0.3) cp = 1.0 + Math.random() * 0.5;
      else if (r < 0.6) cp = 1.5 + Math.random();
      else cp = 1.0 + Math.random() * 10; 
      crashPointRef.current = parseFloat(cp.toFixed(2));
      
      startTimeRef.current = Date.now();
      animateGame();
  };

  const animateGame = () => {
    if (!isMounted.current) return;
    const now = Date.now();
    const elapsed = (now - startTimeRef.current) / 1000;
    
    // Growth Logic (Exponential)
    const currentMult = 1 + (elapsed * 0.1) + (Math.pow(elapsed, 2) * 0.08);

    if (currentMult >= crashPointRef.current) {
        handleCrash(crashPointRef.current);
    } else {
        setMultiplier(currentMult);
        drawGraph(currentMult, elapsed, false);
        animationRef.current = requestAnimationFrame(animateGame);
    }
  };

  const handleCrash = (finalMult: number) => {
      if (!isMounted.current) return;
      setPhase('CRASHED');
      setMultiplier(finalMult);
      
      const finalElapsed = (Date.now() - startTimeRef.current) / 1000;
      drawGraph(finalMult, finalElapsed, true);
      
      if(isMounted.current) playSound('loss');
      
      setHistory(prev => [finalMult, ...prev].slice(0, 15));

      if (activeBetRef.current) {
          activeBetRef.current = false;
          setActiveBet(false);
          
          addGameHistory('Aviator', betAmount, 0, `Crashed @ ${finalMult.toFixed(2)}x`);
          onResult({
              win: false,
              amount: betAmount,
              game: 'Aviator',
              period: Date.now().toString(),
              resultDetails: [{label: 'Crash', value: `${finalMult.toFixed(2)}x`, color: 'bg-red-500'}]
          });
      }

      setTimeout(() => {
          if (isMounted.current) startWaitingPhase();
      }, 3000);
  };

  const handleBetAction = () => {
      if (phase === 'WAITING' || phase === 'CRASHED') {
          // Toggle Next Round Bet
          const newState = !nextRoundBetRef.current;
          
          if (newState && betAmount > userBalance) {
              alert("Insufficient Balance!");
              return;
          }

          nextRoundBetRef.current = newState;
          setNextRoundBet(newState);
      } else if (phase === 'FLYING') {
          if (activeBetRef.current) {
              // Cash Out
              const winAmount = betAmount * multiplier;
              updateBalance(winAmount, 'WIN', 'Aviator Win');
              
              activeBetRef.current = false;
              setActiveBet(false);
              
              playSound('win');
              addGameHistory('Aviator', betAmount, winAmount, `Cashed @ ${multiplier.toFixed(2)}x`);
              onResult({
                win: true,
                amount: winAmount,
                game: 'Aviator',
                period: Date.now().toString(),
                resultDetails: [{label: 'Cashout', value: `${multiplier.toFixed(2)}x`, color: 'bg-green-500'}]
            });
          } else {
              // Queue for next round
              const newState = !nextRoundBetRef.current;
              if (newState && betAmount > userBalance) {
                  alert("Insufficient Balance!");
                  return;
              }
              nextRoundBetRef.current = newState;
              setNextRoundBet(newState);
          }
      }
  };

  const drawGraph = (currentMult: number, elapsed: number, isCrash: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = window.innerWidth;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // --- DYNAMIC GRAPH SCALING ---
      // As time passes and multiplier grows, we increase the window size (Scale Out)
      // This keeps the curve visible and "moving" relative to the frame.
      const timeScale = Math.max(5, elapsed * 1.3); 
      const multScale = Math.max(2, currentMult * 1.3);

      const getX = (t: number) => (t / timeScale) * width;
      const getY = (m: number) => height - ((m - 1) / (multScale - 1)) * height;

      // Draw Grid Lines (Background)
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      // Horizontal Lines (Multipliers)
      const step = Math.ceil(multScale / 5);
      for(let i=1; i<multScale; i+=step) {
          const y = getY(i);
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          // Label
          ctx.fillStyle = '#666';
          ctx.font = '10px Arial';
          ctx.fillText(`${i}x`, 5, y - 5);
      }
      ctx.stroke();

      // Start Path Construction
      ctx.beginPath();
      ctx.moveTo(0, height); 

      // Draw curve step by step
      const plotStep = 0.05;
      for (let t = 0; t <= elapsed; t += plotStep) {
          const m = 1 + (t * 0.1) + (Math.pow(t, 2) * 0.08);
          ctx.lineTo(getX(t), getY(m));
      }
      
      // Final point
      const endX = getX(elapsed);
      const endY = getY(currentMult);
      ctx.lineTo(endX, endY);

      // Create Red Gradient Fill
      if (!isCrash) {
        ctx.lineTo(endX, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, endY, 0, height);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.7)'); // Bright Red top
        gradient.addColorStop(1, 'rgba(127, 29, 29, 0.1)'); // Dark fade bottom
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw Red Stroke Line
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let t = 0; t <= elapsed; t += plotStep) {
          const m = 1 + (t * 0.1) + (Math.pow(t, 2) * 0.08);
          ctx.lineTo(getX(t), getY(m));
      }
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#ef4444'; 
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Draw Plane at tip
      if (!isCrash) {
        ctx.save();
        ctx.translate(endX, endY);
        // Calculate angle. Derivative of curve or approximate.
        const prevT = Math.max(0, elapsed - 0.1);
        const prevM = 1 + (prevT * 0.1) + (Math.pow(prevT, 2) * 0.08);
        const dy = getY(currentMult) - getY(prevM);
        const dx = getX(elapsed) - getX(prevT);
        const angle = Math.atan2(dy, dx);
        
        ctx.rotate(angle); 
        
        // Plane Body
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        // Sleek plane shape
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, 8);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, -8);
        ctx.closePath();
        ctx.fill();
        
        // Propeller blur
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(15, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
  };

  return (
    <div className="bg-black min-h-screen flex flex-col font-sans text-white">
       <div className="bg-black p-2 flex items-center justify-between border-b border-gray-800 z-10">
        <div className="flex items-center gap-2">
            <button onClick={onBack}><ArrowLeft className="text-gray-400" /></button>
            <span className="text-red-600 font-bold italic text-2xl tracking-wider">Aviator</span>
        </div>
        <div className="flex gap-4 items-center">
             <div className="flex items-center gap-2 bg-gray-900 px-3 py-1 rounded-full border border-gray-700">
                 <Wallet size={14} className="text-green-500" />
                 <span className="text-sm font-bold">₹{userBalance.toFixed(2)}</span>
             </div>
             <button onClick={handleToggleMute}>
                 {muted ? <VolumeX size={20} className="text-gray-400" /> : <Volume2 size={20} className="text-gray-400" />}
             </button>
             <Menu className="text-gray-400"/>
        </div>
      </div>

      {/* History Strip */}
      <div className="bg-[#1a1a1a] p-1 flex gap-1 overflow-x-auto no-scrollbar border-b border-gray-800">
          <div className="flex px-2 py-1 bg-black rounded-lg text-xs text-gray-500 font-bold items-center mr-2">HISTORY</div>
          {history.map((m, i) => (
              <div key={i} className={`flex-shrink-0 px-3 py-1 rounded text-xs font-bold font-mono bg-gray-800 border border-gray-700 ${m < 2 ? 'text-blue-400' : m < 10 ? 'text-purple-400' : 'text-pink-500'}`}>
                  {m.toFixed(2)}x
              </div>
          ))}
      </div>

      <div className="relative flex-1 bg-black flex flex-col overflow-hidden">
        
        {phase === 'WAITING' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                 <div className="text-xl font-bold uppercase tracking-widest text-gray-400 mb-2">Waiting for next round</div>
                 <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                     <div className="h-full bg-red-600 transition-all duration-100 ease-linear" style={{ width: `${(waitTime / 5) * 100}%` }}></div>
                 </div>
            </div>
        )}

        {(phase === 'FLYING' || phase === 'CRASHED') && (
             <div className="absolute top-[20%] left-1/2 -translate-x-1/2 z-20 text-center">
                 {phase === 'CRASHED' && (
                     <div className="text-red-600 font-black text-2xl uppercase mb-1 tracking-widest animate-in zoom-in duration-200">
                         FLEW AWAY!
                     </div>
                 )}
                 <div className={`text-6xl sm:text-7xl font-black drop-shadow-2xl font-mono ${phase === 'CRASHED' ? 'text-red-600' : 'text-white'}`}>
                     {multiplier.toFixed(2)}x
                 </div>
             </div>
        )}

        <canvas ref={canvasRef} height={400} className="absolute inset-0 z-10 w-full h-full" />
      </div>

      {/* Betting Panel */}
      <div className="bg-[#151515] p-2 sm:p-3 border-t-2 border-red-600 z-30">
          <div className="bg-black rounded-xl p-2 border border-gray-800 relative overflow-hidden">
               <div className="flex flex-row gap-2 h-auto sm:h-16 items-stretch">
                   
                   {/* Amount Input */}
                   <div className="flex-[2] flex flex-col justify-center min-w-0">
                       <div className="flex items-center bg-[#1a1a1a] rounded-md border border-gray-700 h-10 sm:h-12 relative">
                           <button 
                                onClick={() => setBetAmount(Math.max(10, betAmount - 10))}
                                disabled={activeBet || (nextRoundBet && phase !== 'WAITING')}
                                className="w-8 sm:w-10 h-full text-gray-400 text-xl hover:bg-gray-800 rounded-l-md"
                           >-</button>
                           <input 
                                type="number" 
                                value={betAmount}
                                readOnly
                                className="flex-1 bg-transparent text-center text-white font-bold text-sm sm:text-lg outline-none min-w-0"
                           />
                           <button 
                                onClick={() => setBetAmount(betAmount + 10)}
                                disabled={activeBet || (nextRoundBet && phase !== 'WAITING')}
                                className="w-8 sm:w-10 h-full text-gray-400 text-xl hover:bg-gray-800 rounded-r-md"
                           >+</button>
                       </div>
                       {/* Quick Amounts */}
                       <div className="flex gap-1 mt-1">
                           {[100, 500].map(amt => (
                               <button 
                                    key={amt} 
                                    onClick={() => !activeBet && setBetAmount(amt)}
                                    className="flex-1 py-1 bg-[#1a1a1a] rounded text-[9px] sm:text-[10px] text-gray-400 border border-gray-700 hover:border-gray-500"
                               >
                                   {amt}
                               </button>
                           ))}
                       </div>
                   </div>

                   {/* Main Action Button */}
                   <button 
                        onClick={handleBetAction}
                        className={`flex-[2] sm:w-40 rounded-lg flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 px-1 py-2 ${
                            activeBet && phase === 'FLYING'
                            ? 'bg-orange-500 hover:bg-orange-400 shadow-orange-500/20' 
                            : activeBet || nextRoundBet 
                                ? 'bg-red-600 border-2 border-red-500' 
                                : 'bg-green-600 hover:bg-green-500 shadow-green-500/20' 
                        }`}
                   >
                        <span className="text-white font-bold text-xs sm:text-sm uppercase leading-none mb-1">
                            {activeBet && phase === 'FLYING' ? 'CASH OUT' : (activeBet || nextRoundBet ? 'WAITING' : 'BET')}
                        </span>
                        
                        {activeBet && phase === 'FLYING' ? (
                            <span className="text-white font-black text-sm sm:text-lg leading-none">
                                {(betAmount * multiplier).toFixed(2)}
                            </span>
                        ) : (
                            <span className="text-white font-black text-sm sm:text-lg leading-none">
                                {betAmount} INR
                            </span>
                        )}
                   </button>
               </div>
               
               {/* Waiting Overlay */}
               {nextRoundBet && phase !== 'WAITING' && (
                   <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] flex items-center justify-center z-10">
                       <div className="text-red-500 font-bold uppercase tracking-wider text-xs border border-red-500 px-3 py-1 rounded bg-black">
                           Waiting for next round
                       </div>
                   </div>
               )}
          </div>
      </div>
    </div>
  );
};

export default Aviator;
