
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Volume2, VolumeX } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, getMuteStatus, toggleMute } from '../services/mockFirebase';
import { GameResult } from '../types';

interface Props {
  onBack: () => void;
  userBalance: number;
  onResult: (r: GameResult) => void;
}

const POCKETS = [
    { mult: 50, color: '#facc15' }, { mult: 0, color: '#1e293b' }, { mult: 2, color: '#3b82f6' }, 
    { mult: 0, color: '#1e293b' }, { mult: 5, color: '#10b981' }, { mult: 0, color: '#1e293b' }, 
    { mult: 10, color: '#ef4444' }, { mult: 0, color: '#1e293b' }, { mult: 2, color: '#3b82f6' }, 
    { mult: 0, color: '#1e293b' }, { mult: 5, color: '#10b981' }, { mult: 0, color: '#1e293b' }
];

const Vortex: React.FC<Props> = ({ onBack, userBalance, onResult }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [gameState, setGameState] = useState<'IDLE' | 'SPINNING' | 'LOCKED'>('IDLE');
  const [muted, setMuted] = useState(getMuteStatus());
  const [history, setHistory] = useState<string[]>(['10X', '0X', '5X', '2X', '0X']);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const isMounted = useRef(true);

  // Advanced Physics State
  const ringRotation = useRef(0);
  const ballAngle = useRef(0);
  const ballRadius = useRef(165); 
  const ballAngularVel = useRef(0);
  const spiralPhase = useRef(0); // 0: outer orbit, 1: spiraling, 2: drop

  useEffect(() => {
    isMounted.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
        updatePhysics();
        draw(ctx);
        requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      isMounted.current = false;
      cancelAnimationFrame(requestRef.current);
      stopAllSounds();
    };
  }, [gameState]);

  const updatePhysics = () => {
    // Ring always spins slowly
    ringRotation.current += 0.015;
    
    if (gameState === 'SPINNING') {
        ballAngle.current += ballAngularVel.current;
        
        if (spiralPhase.current === 0) {
            // Ball is losing speed due to rim friction
            ballAngularVel.current *= 0.993; 
            if (ballAngularVel.current < 0.08) spiralPhase.current = 1;
        } else if (spiralPhase.current === 1) {
            // Ball starts spiraling inward towards pockets
            ballRadius.current -= 1.8;
            ballAngularVel.current *= 0.985;
            if (ballRadius.current <= 85) finalizeVortex();
        }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const w = 400, h = 400;
    ctx.clearRect(0, 0, w, h);
    const cx = w/2, cy = h/2;

    // Draw Bowl Outer Edge (Depth Effect)
    const grad = ctx.createRadialGradient(cx, cy, 50, cx, cy, 180);
    grad.addColorStop(0, '#020617');
    grad.addColorStop(0.6, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.beginPath();
    ctx.arc(cx, cy, 180, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw Rotating Center Pocket Ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ringRotation.current);
    POCKETS.forEach((p, i) => {
        const angle = (Math.PI * 2 / POCKETS.length) * i;
        ctx.save();
        ctx.rotate(angle);
        
        // Pocket box
        ctx.beginPath();
        ctx.moveTo(45, -18); ctx.lineTo(85, -25); ctx.lineTo(85, 25); ctx.lineTo(45, 18);
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff20';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.fillStyle = p.mult > 0 ? '#fff' : '#475569';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.mult === 50 ? 'JP' : p.mult + 'X', 65, 5);
        ctx.restore();
    });
    ctx.restore();

    // Center Cap
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#fbbf2440';
    ctx.stroke();

    // Draw Ball (Physics based)
    if (gameState === 'SPINNING') {
        const bx = cx + Math.cos(ballAngle.current) * ballRadius.current;
        const by = cy + Math.sin(ballAngle.current) * ballRadius.current;
        
        // Ball Shadow
        ctx.beginPath();
        ctx.arc(bx + 4, by + 4, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();

        // Ball Body
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        const ballGrad = ctx.createRadialGradient(bx-2, by-2, 1, bx, by, 7);
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = ballGrad;
        ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
  };

  const launch = () => {
    if (gameState !== 'IDLE' || userBalance < betAmount) return;
    setGameState('SPINNING');
    updateBalance(-betAmount, 'BET', 'Vortex Launch');
    playSound('click'); playSound('spin');
    
    ballAngle.current = Math.random() * Math.PI * 2;
    ballRadius.current = 168;
    ballAngularVel.current = 0.28 + Math.random() * 0.08;
    spiralPhase.current = 0;
  };

  const finalizeVortex = () => {
    if (gameState !== 'SPINNING') return;
    setGameState('LOCKED');

    // Pocket match logic: find which pocket is under the ball's final angle
    const relativeAngle = (ballAngle.current - ringRotation.current) % (Math.PI * 2);
    const normalized = relativeAngle < 0 ? relativeAngle + Math.PI * 2 : relativeAngle;
    const idx = Math.floor( (normalized / (Math.PI * 2)) * POCKETS.length ) % POCKETS.length;
    
    const result = POCKETS[idx];
    const winAmt = betAmount * result.mult;

    setTimeout(() => {
        if (!isMounted.current) return;
        if (winAmt > 0) { updateBalance(winAmt, 'WIN', 'Vortex Win'); playSound('win'); } else { playSound('loss'); }
        setHistory(prev => [result.mult + 'X', ...prev].slice(0, 10));
        onResult({ 
            win: winAmt > 0, 
            amount: winAmt > 0 ? winAmt : betAmount, 
            game: 'Vortex',
            resultDetails: [{ label: 'Pocket', value: result.mult + 'X', color: result.mult > 0 ? 'text-yellow-400' : 'text-slate-500' }]
        });
        setGameState('IDLE');
    }, 1200);
  };

  return (
    <div className="bg-black min-h-screen flex flex-col font-sans text-white select-none overflow-hidden relative">
      <div className="p-4 flex justify-between items-center bg-[#111827] border-b border-white/5 z-50 shadow-2xl">
        <button onClick={onBack} className="p-2.5 bg-slate-800 rounded-2xl border border-white/10 active:scale-90"><ArrowLeft size={20}/></button>
        <h1 className="text-xl font-black italic gold-text tracking-widest uppercase">THE VORTEX</h1>
        <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 shadow-inner">
          <Wallet size={14} className="text-yellow-500" />
          <span className="text-sm font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-[#020617]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#1e293b_0%,_transparent_70%)] opacity-30 pointer-events-none"></div>
        <canvas ref={canvasRef} width={400} height={400} className="max-w-full drop-shadow-[0_0_100px_rgba(0,0,0,1)]" />
        
        <div className="mt-8 flex gap-2 overflow-x-auto no-scrollbar max-w-full px-4">
            {history.map((h, i) => (
                <span key={i} className={`px-4 py-1.5 rounded-full text-[10px] font-black border border-white/5 whitespace-nowrap italic shadow-lg ${h === '0X' ? 'bg-slate-900 text-slate-500' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>{h}</span>
            ))}
        </div>
      </div>

      <div className="bg-[#0a0a0a] p-6 pb-12 border-t border-white/5 shadow-[0_-20px_60px_rgba(0,0,0,1)] z-50">
          <div className="flex justify-between items-end mb-8 px-2">
              <div className="flex gap-2">
                  {[10, 50, 100, 500].map(amt => (
                      <button key={amt} onClick={() => gameState === 'IDLE' && setBetAmount(amt)} className={`w-14 h-12 rounded-2xl font-black text-xs border transition-all ${betAmount === amt ? 'bg-yellow-500 text-black border-white shadow-lg scale-105' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}>₹{amt}</button>
                  ))}
              </div>
              <button onClick={() => setMuted(toggleMute())} className="p-3.5 bg-zinc-900 rounded-2xl text-zinc-400 border border-white/5">
                  {muted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
              </button>
          </div>

          <button onClick={launch} disabled={gameState !== 'IDLE'} className={`w-full py-6 rounded-[2.5rem] font-black uppercase tracking-[0.5em] shadow-2xl active:scale-95 transition-all text-xl border-t-2 border-white/10 ${gameState !== 'IDLE' ? 'bg-zinc-800 text-zinc-600' : 'bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 text-black shadow-yellow-900/40'}`}>
            {gameState === 'IDLE' ? 'LAUNCH BALL' : 'SPINNING...'}
          </button>
      </div>
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};

export default Vortex;
