
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Volume2, VolumeX, PlayCircle, HelpCircle, X } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, getMuteStatus, toggleMute, db, auth, addGameBet } from '../services/supabaseService';
import { GameResult } from '../types';
import { collection, addDoc } from 'firebase/firestore';

interface Ball {
  id: string; x: number; y: number; row: number; col: number; bet: number;
  status: 'DROPPING' | 'DONE'; targetX: number; targetY: number; progress: number;
  startPos: { x: number; y: number };
}

const MULTIPLIERS = [10, 5, 2, 1.2, 0.5, 1.2, 2, 5, 10];
const ROWS = 9; const PIN_RADIUS = 5; const BALL_RADIUS = 8;
const CANVAS_WIDTH = 380; const CANVAS_HEIGHT = 540;

import PlinkoResultPopup from '../components/PlinkoResultPopup';
import HowToPlay from '../components/HowToPlay';

const Plinko: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [muted, setMuted] = useState(getMuteStatus());
  const [showRules, setShowRules] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const pulsesRef = useRef<{row: number, col: number, startTime: number}[]>([]);
  const requestRef = useRef<number>(0);
  const [floatingResults, setFloatingResults] = useState<{ id: string; mult: number; amount: number }[]>([]);

  const startY = 110; const rowSpacing = 40; const colSpacing = 36;

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const animate = () => { updatePhysics(); draw(ctx); requestRef.current = requestAnimationFrame(animate); };
    requestRef.current = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(requestRef.current); stopAllSounds(); };
  }, []);

  const getPinCoords = (row: number, col: number) => {
    const pinsInRow = row + 1; const rowWidth = (pinsInRow - 1) * colSpacing;
    const startX = (CANVAS_WIDTH - rowWidth) / 2;
    return { x: startX + col * colSpacing, y: startY + row * rowSpacing };
  };

  const updatePhysics = () => {
    const slotY = startY + ROWS * rowSpacing + 20; const speed = 0.12; 
    ballsRef.current = ballsRef.current.map(ball => {
      if (ball.status === 'DONE') return ball;
      ball.progress += speed;
      if (ball.progress >= 1) {
        ball.x = ball.targetX; ball.y = ball.targetY; ball.progress = 0; ball.startPos = { x: ball.x, y: ball.y };
        if (ball.row < ROWS - 1) {
          pulsesRef.current.push({ row: ball.row, col: ball.col, startTime: Date.now() });
          playSound('wingo_tick');
          const nextRow = ball.row + 1; const moveRight = Math.random() > 0.49 ? 1 : 0;
          const nextCol = ball.col + moveRight; const coords = getPinCoords(nextRow, nextCol);
          return { ...ball, row: nextRow, col: nextCol, targetX: coords.x, targetY: coords.y } as Ball;
        } else {
          if (ball.y < slotY) { playSound('wingo_tick'); return { ...ball, targetY: slotY + 25, targetX: ball.x, row: ROWS } as Ball; }
          else { handleBallLand(ball); return { ...ball, status: 'DONE' } as Ball; }
        }
      }
      const t = ball.progress; const arcHeight = 10; 
      ball.x = ball.startPos.x + (ball.targetX - ball.startPos.x) * t;
      const linearY = ball.startPos.y + (ball.targetY - ball.startPos.y) * t;
      ball.y = linearY - (-4 * arcHeight * t * (t - 1));
      return ball;
    }).filter(b => b.status === 'DROPPING') as Ball[];
    pulsesRef.current = pulsesRef.current.filter(p => Date.now() - p.startTime < 400);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    for (let r = 0; r < ROWS; r++) {
      const pinsInRow = r + 1; const rowWidth = (pinsInRow - 1) * colSpacing;
      const startX = (CANVAS_WIDTH - rowWidth) / 2;
      for (let p = 0; p < pinsInRow; p++) {
        const px = startX + p * colSpacing; const py = startY + r * rowSpacing;
        const pulse = pulsesRef.current.find(pulse => pulse.row === r && pulse.col === p);
        const scale = pulse ? 1 + 0.5 * Math.sin((Date.now() - pulse.startTime) / 40) : 1;
        ctx.beginPath(); ctx.arc(px, py, PIN_RADIUS * scale, 0, Math.PI * 2);
        ctx.fillStyle = pulse ? '#60A5FA' : 'rgba(203, 213, 225, 0.8)'; ctx.fill();
      }
    }
    const slotY = startY + ROWS * rowSpacing + 20; const totalSlotWidth = MULTIPLIERS.length * colSpacing;
    const slotStartX = (CANVAS_WIDTH - totalSlotWidth + 4) / 2;
    MULTIPLIERS.forEach((m, i) => {
      const sx = slotStartX + i * colSpacing;
      ctx.fillStyle = m >= 5 ? '#ef4444' : m >= 1 ? '#22c55e' : '#3b82f6';
      ctx.beginPath(); ctx.roundRect(sx, slotY, colSpacing - 4, 40, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${m}x`, sx + (colSpacing - 4) / 2, slotY + 25);
    });
    ballsRef.current.forEach(ball => {
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24'; ctx.shadowBlur = 15; ctx.shadowColor = '#f59e0b'; ctx.fill(); ctx.shadowBlur = 0;
    });
  };

  const handleBallLand = (ball: Ball) => {
    const slotIdx = Math.min(Math.max(ball.col, 0), MULTIPLIERS.length - 1);
    const multiplier = MULTIPLIERS[slotIdx];
    const winAmount = ball.bet * multiplier;
    
    const isWin = multiplier >= 1;

    if (isWin) {
        updateBalance(winAmount, 'WIN', `Plinko ${multiplier}x`);
        playSound('win');
    }
    
    const rid = Math.random().toString(36).substr(2, 5);
    setFloatingResults(prev => [...prev, { id: rid, mult: multiplier, amount: winAmount }]);
    setTimeout(() => { setFloatingResults(prev => prev.filter(res => res.id !== rid)); }, 2000);
    addGameHistory('Plinko', ball.bet, winAmount, `Hit ${multiplier}x`);
  };

  const dropBall = async () => {
    if (userBalance < betAmount) { playSound('loss'); return; }
    
    // Record bet in Firestore removed to save quota for instant games
    // addGameHistory will still record the result for the user

    updateBalance(-betAmount, 'BET', 'Plinko Stake');
    const startCoords = getPinCoords(0, 0);
    ballsRef.current.push({
      id: Math.random().toString(36).substr(2, 9), x: CANVAS_WIDTH / 2, y: 30, row: 0, col: 0, bet: betAmount,
      status: 'DROPPING', targetX: startCoords.x, targetY: startCoords.y, progress: 0, startPos: { x: CANVAS_WIDTH / 2, y: 30 }
    });
    playSound('bet_place');
  };

  return (
    <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white relative overflow-hidden">
      <HowToPlay 
          isOpen={showRules} 
          onClose={() => setShowRules(false)} 
          title="Plinko Rules"
          rules={[
              "Choose your stake and drop the ball from the top.",
              "The ball will bounce off pins until it lands in a multiplier slot.",
              "Multipliers on the edges have higher values (up to 10x).",
              "Multipliers in the center have lower values (as low as 0.2x).",
              "Your win is calculated as stake × multiplier."
          ]}
          payouts={[
              { label: "Center Slots", value: "0.2x - 1x" },
              { label: "Mid Slots", value: "2x - 5x" },
              { label: "Edge Slots", value: "10x" }
          ]}
      />
      {floatingResults.map(res => (
          <div key={res.id} className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[100] w-full px-12 pointer-events-none animate-in fade-in slide-in-from-top-10 duration-500">
               <div className={`py-3 px-6 rounded-2xl border-2 shadow-2xl flex items-center justify-center gap-4 backdrop-blur-2xl ${res.mult >= 1 ? 'bg-green-600/90 border-green-400' : 'bg-red-600/90 border-red-400'}`}>
                   <div className="flex flex-col items-center">
                       <span className="text-[7px] font-black uppercase opacity-60">Win</span>
                       <span className="font-black italic text-xl">₹{res.amount.toFixed(2)}</span>
                   </div>
                   <div className="w-[1px] h-6 bg-white/20"></div>
                   <div className="flex flex-col items-center">
                       <span className="text-[7px] font-black uppercase opacity-60">Mult</span>
                       <span className="font-black text-xl">{res.mult}x</span>
                   </div>
               </div>
          </div>
      ))}
      <div className="p-4 flex justify-between items-center bg-[#111827]/95 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2.5 bg-slate-800 rounded-2xl active:scale-90 transition-all"><ArrowLeft size={20}/></button>
            <div className="flex flex-col">
                <h1 className="text-sm font-black gold-text italic tracking-widest uppercase leading-none">PLINKO</h1>
                <span className="text-[8px] text-yellow-500/40 mt-1 uppercase font-bold">Arcade Wallet</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 shadow-inner flex items-center gap-2">
              <Wallet size={14} className="text-yellow-500" />
              <span className="text-sm font-black text-yellow-500">₹{userBalance.toFixed(2)}</span>
            </div>
            <button onClick={() => setShowRules(true)} className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-2xl border border-yellow-500/20 active:scale-90 transition-all"><HelpCircle size={20}/></button>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="max-w-full rounded-[2.5rem] bg-[#111827]/60 border border-white/10 shadow-2xl" />
      </div>
      <div className="bg-[#111827] border-t border-white/5 p-6 pb-12 z-50 focus-within:ring-0">
        <div className="flex justify-between items-end mb-6">
            <div className="text-2xl font-black italic gold-text">STAKE: ₹{betAmount}</div>
            <button onClick={() => setMuted(toggleMute())} className="p-3 bg-zinc-800 rounded-2xl active:scale-95 transition-all border border-white/5">{muted ? <VolumeX size={22}/> : <Volume2 size={22}/>}</button>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-8">
            {[10, 50, 100, 500].map(amt => <button key={amt} onClick={() => setBetAmount(amt)} className={`py-4 rounded-2xl font-black text-xs border transition-all ${betAmount === amt ? 'bg-yellow-500 text-slate-950 border-white shadow-[0_0_20px_rgba(234,179,8,0.4)] scale-105' : 'bg-zinc-800/40 border-white/5 text-slate-400 hover:text-white'}`}>₹{amt}</button>)}
        </div>
        <button onClick={dropBall} className="w-full py-6 rounded-[2.5rem] bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 text-slate-950 font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95 flex items-center justify-center gap-4 text-lg border-t-2 border-white/20"><PlayCircle size={28}/> DROP BALL</button>
      </div>
    </div>
  );
};
export default Plinko;
