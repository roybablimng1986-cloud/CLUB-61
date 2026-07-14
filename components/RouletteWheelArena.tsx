import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

interface RouletteWheelArenaProps {
  winningNumber: number;
  onSettle: () => void;
  sfx: {
    playBallBounce: () => void;
    playLock: () => void;
    playTick: () => void;
  };
}

export const RouletteWheelArena: React.FC<RouletteWheelArenaProps> = ({ winningNumber, onSettle, sfx }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastCrossedPocketRef = useRef<number>(-1);

  // Constants
  const SLICE_ANGLE = (2 * Math.PI) / 37;
  const OUTSIDE_R = 125;
  const POCKET_R = 85;

  useEffect(() => {
    startTimeRef.current = Date.now();
    lastCrossedPocketRef.current = -1;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high DPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 360 * dpr;
    canvas.height = 360 * dpr;
    canvas.style.width = '360px';
    canvas.style.height = '360px';
    ctx.scale(dpr, dpr);

    // Starting velocities & angles
    const wheelStartAngle = Math.random() * Math.PI * 2;
    const ballStartAngle = Math.random() * Math.PI * 2;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      ctx.clearRect(0, 0, 360, 360);

      // 1. Calculate speeds and rotations
      // Wheel spins clockwise, slowly decelerates
      let wheelOmega = 0.05; // Base speed
      if (elapsed > 4000) {
        wheelOmega = Math.max(0.012, 0.05 - (elapsed - 4000) * 0.000025);
      }
      const wheelAngle = wheelStartAngle + wheelOmega * (elapsed / 16.67);

      // Target pocket index
      const targetIdx = WHEEL_ORDER.indexOf(winningNumber);
      const targetRelativeAngle = targetIdx * SLICE_ANGLE;

      let ballR = OUTSIDE_R;
      let ballAngle = 0;

      if (elapsed < 2800) {
        // Phase 1: Ball spinning fast around the outer rim counter-clockwise
        const ballOmega = -0.16 + (elapsed * 0.00002); // slowly decel
        ballAngle = ballStartAngle + ballOmega * (elapsed / 16.67);
        ballR = OUTSIDE_R;
      } else if (elapsed >= 2800 && elapsed < 4200) {
        // Phase 2: Ball falls inwards from outer rim to pockets
        const progress = (elapsed - 2800) / 1400; // 0 to 1
        const ballOmega = -0.104 + progress * 0.08; // slowing down towards wheel velocity
        ballAngle = ballStartAngle + (-0.16 * 168) + ballOmega * ((elapsed - 2800) / 16.67);
        ballR = OUTSIDE_R - progress * (OUTSIDE_R - POCKET_R);

        // Sound effect on crossing slots
        const relativeAngle = (ballAngle - wheelAngle) % (2 * Math.PI);
        const normalizedRel = (relativeAngle + Math.PI * 2) % (Math.PI * 2);
        const currentPocket = Math.floor(normalizedRel / SLICE_ANGLE);
        if (currentPocket !== lastCrossedPocketRef.current) {
          sfx.playBallBounce();
          lastCrossedPocketRef.current = currentPocket;
        }
      } else {
        // Phase 3 & 4: Ball bouncing & settling relative to target pocket
        const relativeTarget = targetRelativeAngle + SLICE_ANGLE / 2; // Center of pocket
        let bounceOffset = 0;

        if (elapsed < 5400) {
          // Bouncing damping sine wave
          const bounceProgress = (elapsed - 4200) / 1200; // 0 to 1
          const amplitude = 1.6 * Math.pow(1 - bounceProgress, 2);
          bounceOffset = Math.sin((elapsed - 4200) * 0.016) * amplitude;

          // Play rattle clicking during bounce
          const currentPocketOffset = Math.floor(bounceOffset / SLICE_ANGLE);
          if (currentPocketOffset !== lastCrossedPocketRef.current) {
            sfx.playBallBounce();
            lastCrossedPocketRef.current = currentPocketOffset;
          }
        } else {
          // Fully settled in the pocket center
          bounceOffset = 0;
        }

        const ballRelAngle = relativeTarget + bounceOffset;
        ballAngle = wheelAngle + ballRelAngle;
        ballR = POCKET_R;
      }

      // 2. Draw Wheel Graphics
      const cx = 180;
      const cy = 180;

      // Draw Mahogany outer wood cabinet
      const woodGrad = ctx.createRadialGradient(cx, cy, 110, cx, cy, 175);
      woodGrad.addColorStop(0, '#2e1107'); // dark red wood
      woodGrad.addColorStop(0.3, '#451a03'); // mahogany
      woodGrad.addColorStop(0.85, '#78350f'); // warm amber
      woodGrad.addColorStop(1, '#1c1917'); // outer black shadow

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 170, 0, Math.PI * 2);
      ctx.fillStyle = woodGrad;
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 10;
      ctx.fill();
      ctx.restore();

      // Outer gold metallic ring
      ctx.beginPath();
      ctx.arc(cx, cy, 155, 0, Math.PI * 2);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner Wheel rotor assembly (rotates with wheelAngle)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(wheelAngle);

      // Draw the core cylinder of pockets
      ctx.beginPath();
      ctx.arc(0, 0, 140, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a0a';
      ctx.fill();

      // Draw each colorful pocket
      for (let i = 0; i < 37; i++) {
        const startRad = i * SLICE_ANGLE;
        const endRad = startRad + SLICE_ANGLE;
        const num = WHEEL_ORDER[i];

        let pocketColor = '#18181b'; // Black
        if (num === 0) pocketColor = '#15803d'; // Green
        else if (REDS.includes(num)) pocketColor = '#dc2626'; // Red

        // Fill segment pocket color
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 138, startRad, endRad);
        ctx.closePath();
        ctx.fillStyle = pocketColor;
        ctx.fill();

        // Slice borders (gilded dividers)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(startRad) * 138, Math.sin(startRad) * 138);
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)'; // elegant brass separator
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw Pocket Number Text
        ctx.save();
        ctx.rotate(startRad + SLICE_ANGLE / 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = '950 11px font-mono, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Position number nicely inside the pocket ring
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 2;
        ctx.fillText(num.toString(), 115, 0);
        ctx.restore();
      }

      // Metallic pocket inner separator rim
      ctx.beginPath();
      ctx.arc(0, 0, 98, 0, Math.PI * 2);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Brass center turret/cone
      const turretGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
      turretGrad.addColorStop(0, '#fde68a'); // gold shiny tip
      turretGrad.addColorStop(0.4, '#b45309'); // bronze body
      turretGrad.addColorStop(0.85, '#78350f'); // gold edge shadow
      turretGrad.addColorStop(1, '#451a03');

      ctx.beginPath();
      ctx.arc(0, 0, 65, 0, Math.PI * 2);
      ctx.fillStyle = turretGrad;
      ctx.fill();

      // Golden spinner handles
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#d97706';
      ctx.lineCap = 'round';
      for (let arm = 0; arm < 4; arm++) {
        const armAngle = arm * (Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(armAngle) * 55, Math.sin(armAngle) * 55);
        ctx.stroke();

        // Spindle brass tip
        ctx.beginPath();
        ctx.arc(Math.cos(armAngle) * 55, Math.sin(armAngle) * 55, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Core cap
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.stroke();

      ctx.restore();

      // 3. Draw the Rolling White Ball (World space)
      const ballX = cx + Math.cos(ballAngle) * ballR;
      const ballY = cy + Math.sin(ballAngle) * ballR;

      ctx.save();
      // Shiny realistic ball 3D gradient
      const ballGrad = ctx.createRadialGradient(ballX - 3, ballY - 3, 1, ballX, ballY, 7);
      ballGrad.addColorStop(0, '#ffffff'); // bright light shine
      ballGrad.addColorStop(0.7, '#e4e4e7'); // zinc white
      ballGrad.addColorStop(1, '#a1a1aa'); // gray shaded bottom

      ctx.beginPath();
      ctx.arc(ballX, ballY, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = ballGrad;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 4;
      ctx.fill();
      ctx.restore();

      // 4. Continue animation loop or finish
      if (elapsed < 6500) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onSettle();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [winningNumber, onSettle, sfx]);

  const winIsRed = REDS.includes(winningNumber);
  const winColorText = winningNumber === 0 
    ? 'text-green-500' 
    : winIsRed 
      ? 'text-red-500 shadow-red-500/20' 
      : 'text-zinc-300 shadow-zinc-500/20';

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
      
      {/* Zoom Camera Heading */}
      <motion.div 
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-5 z-20"
      >
        <span className="text-[9px] font-black tracking-[0.3em] uppercase text-yellow-500/60 flex items-center justify-center gap-1">
          <Sparkles size={10} className="animate-pulse" /> LIVE CAMERA ARENA <Sparkles size={10} className="animate-pulse" />
        </span>
        <h2 className="text-2xl font-black italic gold-text mt-1 uppercase tracking-tight">Roulette Spinning</h2>
      </motion.div>

      {/* Main Wheel Canvas with luxury gold frame shadow border */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        className="relative bg-zinc-950 p-4 rounded-[3.5rem] border-4 border-yellow-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.8),_0_0_50px_rgba(245,158,11,0.15)] flex items-center justify-center overflow-hidden"
      >
        {/* Ambient surrounding glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.06)_0%,transparent_70%)] pointer-events-none" />
        
        <canvas ref={canvasRef} className="block relative z-10" />
      </motion.div>

      {/* Floating Dynamic Payout Outcome banner */}
      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 4.8, type: 'spring' }}
        className="mt-6 z-20 flex flex-col items-center justify-center"
      >
        <div className="bg-zinc-950/90 border border-yellow-500/30 px-8 py-3.5 rounded-3xl shadow-2xl flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl font-black italic border-2 shadow-inner shadow-black/85 ${
            winningNumber === 0 
              ? 'bg-green-700 border-green-400 text-white' 
              : winIsRed 
                ? 'bg-red-600 border-red-400 text-white' 
                : 'bg-zinc-800 border-zinc-500 text-white'
          }`}>
            {winningNumber}
          </div>
          <div>
            <span className="block text-[8px] font-black tracking-widest text-zinc-500 uppercase">WINNING RESULT</span>
            <span className={`text-xl font-black italic tracking-wide uppercase ${winColorText}`}>
              {winningNumber === 0 ? 'Zero Green' : winIsRed ? 'Red Diamond' : 'Black Diamond'}
            </span>
          </div>
        </div>
      </motion.div>

    </div>
  );
};
