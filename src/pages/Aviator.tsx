import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/mockFirebase';
import { GameResult } from '../types';

const Aviator: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [phase, setPhase] = useState<'WAITING'|'FLYING'|'CRASHED'>('WAITING');
  const [multiplier, setMultiplier] = useState(1.00);
  const [betAmount, setBetAmount] = useState(10);
  const activeBetRef = useRef(false);
  const [activeBet, setActiveBet] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const crashPointRef = useRef(0);
  const startTimeRef = useRef(0);
  const animRef = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    startWaiting();
    return () => { isMounted.current = false; cancelAnimationFrame(animRef.current); stopAllSounds(); };
  }, []);

  const startWaiting = () => {
      setPhase('WAITING'); setMultiplier(1.00);
      if (activeBetRef.current) setActiveBet(false);
      setTimeout(() => { if (isMounted.current) startFlying(); }, 5000);
  };

  const startFlying = () => {
      setPhase('FLYING'); playSound('plane');
      crashPointRef.current = 1 + Math.random() * 5; 
      startTimeRef.current = Date.now();
      animLoop();
  };

  const animLoop = () => {
      if (!isMounted.current) return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const cur = 1 + (elapsed * 0.1) + (Math.pow(elapsed, 2) * 0.08);
      if (cur >= crashPointRef.current) handleCrash(crashPointRef.current);
      else {
          setMultiplier(cur);
          draw(cur, elapsed, false);
          animRef.current = requestAnimationFrame(animLoop);
      }
  };

  const handleCrash = (final: number) => {
      setPhase('CRASHED'); setMultiplier(final); draw(final, 0, true); playSound('loss');
      if (activeBetRef.current) {
          activeBetRef.current = false; setActiveBet(false);
          onResult({ win: false, amount: betAmount, game: 'Aviator', resultDetails: [{label: 'Crash', value: `${final.toFixed(2)}x`}] });
      }
      setTimeout(() => { if (isMounted.current) startWaiting(); }, 3000);
  };

  const handleAction = () => {
      if (phase === 'WAITING' || phase === 'CRASHED') {
          if (betAmount > userBalance) return alert("Insufficient Balance");
          activeBetRef.current = true; setActiveBet(true);
          updateBalance(-betAmount, 'BET', 'Aviator');
      } else if (phase === 'FLYING' && activeBetRef.current) {
          const win = betAmount * multiplier;
          updateBalance(win, 'WIN', 'Aviator');
          activeBetRef.current = false; setActiveBet(false);
          playSound('win');
          onResult({ win: true, amount: win, game: 'Aviator', resultDetails: [{label: 'Cashout', value: `${multiplier.toFixed(2)}x`}] });
      }
  };

  const draw = (mult: number, time: number, crash: boolean) => {
      const cvs = canvasRef.current; if (!cvs) return;
      const ctx = cvs.getContext('2d'); if (!ctx) return;
      cvs.width = window.innerWidth; cvs.height = 300;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      // Simple drawing for brevity
      ctx.fillStyle = crash ? 'red' : 'white';
      ctx.font = '50px Arial';
      ctx.fillText(`${mult.toFixed(2)}x`, cvs.width/2 - 50, cvs.height/2);
  };

  return (
    <div className="bg-black min-h-screen text-white flex flex-col">
        <div className="p-4 flex justify-between"><button onClick={onBack}><ArrowLeft/></button><span>Aviator</span><span>₹{userBalance.toFixed(2)}</span></div>
        <div className="flex-1 relative"><canvas ref={canvasRef} className="w-full h-full"/></div>
        <div className="p-4 bg-slate-900 border-t border-slate-700">
            <div className="flex gap-4">
                <div className="flex-1 border border-slate-600 rounded flex items-center justify-center"><button onClick={()=>setBetAmount(Math.max(10, betAmount-10))}>-</button><span className="mx-4">{betAmount}</span><button onClick={()=>setBetAmount(betAmount+10)}>+</button></div>
                <button onClick={handleAction} className={`flex-[2] py-4 rounded font-bold ${activeBet && phase === 'FLYING' ? 'bg-orange-500' : activeBet ? 'bg-red-500' : 'bg-green-600'}`}>
                    {activeBet && phase === 'FLYING' ? 'CASH OUT' : activeBet ? 'WAITING' : 'BET'}
                </button>
            </div>
        </div>
    </div>
  );
};
export default Aviator;