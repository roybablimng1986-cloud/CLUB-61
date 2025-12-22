
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Volume2, VolumeX, PlayCircle, HelpCircle, X } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, getMuteStatus, toggleMute } from '../services/mockFirebase';
import { GameResult } from '../types';

interface Ball {
  id: string; x: number; y: number; row: number; col: number; bet: number;
  status: 'DROPPING' | 'DONE'; targetX: number; targetY: number; progress: number;
  startPos: { x: number; y: number };
}

const MULTIPLIERS = [10, 5, 2, 1.2, 0.5, 1.2, 2, 5, 10];
const ROWS = 9; const PIN_RADIUS = 5; const BALL_RADIUS = 8;
const CANVAS_WIDTH = 380; const CANVAS_HEIGHT = 540;

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
          playSound('tick');
          const nextRow = ball.row + 1; const moveRight = Math.random() > 0.49 ? 1 : 0;
          const nextCol = ball.col + moveRight; const coords = getPinCoords(nextRow, nextCol);
          return { ...ball, row: nextRow, col: nextCol, targetX: coords.x, targetY: coords.y };
        } else {
          if (ball.y < slotY) { playSound('tick'); return { ...ball, targetY: slotY + 25, targetX: ball.x, row: ROWS }; }
          else { handleBallLand(ball); return { ...ball, status: 'DONE' }; }
        }
      }
      const t = ball.progress; const arcHeight = 10; 
      ball.x = ball.startPos.x + (ball.targetX - ball.startPos.x) * t;
      const linearY = ball.startPos.y + (ball.targetY - ball.startPos.y) * t;
      ball.y = linearY - (-4 * arcHeight * t * (t - 1));
      return ball;
    }).filter(b => b.status === 'DROPPING');
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
    updateBalance(winAmount, 'WIN', `Plinko ${multiplier}x`);
    playSound(multiplier >= 1 ? 'win' : 'click');
    const rid = Math.random().toString(36).substr(2, 5);
    setFloatingResults(prev => [...prev, { id: rid, mult: multiplier, amount: winAmount }]);
    setTimeout(() => { setFloatingResults(prev => prev.filter(res => res.id !== rid)); }, 2500);
    addGameHistory('Plinko', ball.bet, winAmount, `Hit ${multiplier}x`);
  };

  const dropBall = () => {
    if (userBalance < betAmount) { playSound('loss'); return; }
    updateBalance(-betAmount, 'BET', 'Plinko Stake');
    const startCoords = getPinCoords(0, 0);
    ballsRef.current.push({
      id: Math.random().toString(36).substr(2, 9), x: CANVAS_WIDTH / 2, y: 30, row: 0, col: 0, bet: betAmount,
      status: 'DROPPING', targetX: startCoords.x, targetY: startCoords.y, progress: 0, startPos: { x: CANVAS_WIDTH / 2, y: 30 }
    });
    playSound('click');
  };

  return (
    <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white relative overflow-hidden">
      {floatingResults.map(res => (
          <div key={res.id} className="fixed top-[40%] left-1/2 -translate-x-1/2 z-[100] w-full px-10 pointer-events-none animate-in fade-in zoom-in duration-300">
               <div className={`py-4 px-8 rounded-full border-4 shadow-2xl flex items-center justify-center gap-6 backdrop-blur-xl ${res.mult >= 1 ? 'bg-green-600/90 border-green-400' : 'bg-red-600/90 border-red-400'}`}>
                   <span className="font-black italic text-3xl">{res.mult}x</span>
                   <div className="w-[2px] h-10 bg-white/20"></div>
                   <span className="font-black text-4xl">₹{res.amount.toFixed(2)}</span>
               </div>
          </div>
      ))}
      <div className="p-4 flex justify-between items-center bg-[#111827]/95 backdrop-blur-xl border-b border-white/5 z-50">
        <button onClick={onBack} className="p-2.5 bg-slate-800 rounded-2xl active:scale-90"><ArrowLeft size={20}/></button>
        <h1 className="text-xl font-black italic gold-text tracking-widest uppercase">PLINKO</h1>
        <div className="flex gap-2">
            <button onClick={() => setShowRules(true)} className="p-2.5 bg-slate-800 rounded-xl active:scale-90"><HelpCircle size={20}/></button>
            <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20">
              <Wallet size={14} className="text-yellow-500" />
              <span className="text-sm font-black text-yellow-500">₹{userBalance.toFixed(2)}</span>
            </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="max-w-full rounded-[2.5rem] bg-[#111827]/60 border border-white/10 shadow-2xl" />
      </div>
      <div className="bg-[#111827] border-t border-white/5 p-6 pb-12 z-50">
        <div className="flex justify-between items-end mb-6">
            <div className="text-2xl font-black italic">₹{betAmount}</div>
            <button onClick={() => setMuted(toggleMute())} className="p-3 bg-slate-800 rounded-2xl">{muted ? <VolumeX size={22}/> : <Volume2 size={22}/>}</button>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-8">
            {[10, 50, 100, 500].map(amt => <button key={amt} onClick={() => setBetAmount(amt)} className={`py-4 rounded-2xl font-black text-xs border transition-all ${betAmount === amt ? 'bg-yellow-500 text-slate-950 border-white' : 'bg-slate-800/40 border-white/5 text-slate-400'}`}>₹{amt}</button>)}
        </div>
        <button onClick={dropBall} className="w-full py-6 rounded-[2rem] bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 text-slate-950 font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95 flex items-center justify-center gap-4 text-lg border-t-2 border-white/20"><PlayCircle size={28}/> DROP BALL</button>
      </div>
      {showRules && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90">
              <div className="bg-slate-900 border-2 border-white/10 w-full max-w-sm p-10 rounded-[3.5rem] shadow-2xl">
                   <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                       <h2 className="text-2xl font-black text-blue-500 italic uppercase">RULES</h2>
                       <button onClick={() => setShowRules(false)} className="p-2 bg-slate-800 rounded-full"><X size={20}/></button>
                   </div>
                   <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                       <p>1. Set your stake and drop the ball.</p>
                       <p>2. The multiplier slot the ball lands in determines your win.</p>
                       <p>3. High multipliers are on the edges.</p>
                   </div>
              </div>
          </div>
      )}
    </div>
  );
};
export default Plinko;
