
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Volume2, VolumeX, History, Trophy, RotateCw } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, getMuteStatus, toggleMute } from '../services/mockFirebase';
import { GameResult } from '../types';

interface Props {
  onBack: () => void;
  userBalance: number;
  onResult: (r: GameResult) => void;
}

const SEGMENTS = [
  { label: '10X', val: 10, color: '#ef4444' },
  { label: '2X', val: 2, color: '#3b82f6' },
  { label: '5X', val: 5, color: '#10b981' },
  { label: '0.5X', val: 0.5, color: '#6366f1' },
  { label: '20X', val: 20, color: '#f59e0b' },
  { label: '1.5X', val: 1.5, color: '#ec4899' },
  { label: 'JACKPOT', val: 50, color: '#8b5cf6' },
  { label: '0.1X', val: 0.1, color: '#64748b' },
];

const LuckyWheel: React.FC<Props> = ({ onBack, userBalance, onResult }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [history, setHistory] = useState<string[]>(['10X', '2X', '5X', '0.5X']);
  const [muted, setMuted] = useState(getMuteStatus());
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopAllSounds();
    };
  }, []);

  const handleSpin = () => {
    if (isSpinning) return;
    if (userBalance < betAmount) {
        alert("Insufficient Balance!");
        return;
    }

    setIsSpinning(true);
    // FIX: Changed invalid sound name 'spin' to 'wheel_spin'
    playSound('wheel_spin');
    // Instant Deduction
    updateBalance(-betAmount, 'BET', 'Lucky Wheel Stake');

    const totalSegments = SEGMENTS.length;
    const segmentAngle = 360 / totalSegments;
    const randomSegment = Math.floor(Math.random() * totalSegments);
    
    // Calculate rotation: multiple full turns + offset to land on segment
    const extraTurns = 1800 + Math.random() * 1800;
    const targetRotation = rotation + extraTurns + (randomSegment * segmentAngle);
    
    setRotation(targetRotation);

    setTimeout(() => {
      if (!isMounted.current) return;
      
      setIsSpinning(false);
      const normalizedRotation = (targetRotation % 360);
      const landedIdx = Math.floor(((360 - (normalizedRotation % 360)) % 360) / segmentAngle);
      const result = SEGMENTS[landedIdx];

      const winAmount = betAmount * result.val;
      if (winAmount > 0) {
        updateBalance(winAmount, 'WIN', 'Lucky Wheel Win');
        playSound('win');
      } else {
        playSound('loss');
      }

      setHistory(prev => [result.label, ...prev].slice(0, 10));
      onResult({
        win: result.val >= 1,
        amount: winAmount,
        game: 'Lucky Wheel',
        resultDetails: [{ label: 'Landed', value: result.label, color: result.val >= 1 ? 'text-green-400' : 'text-red-400' }]
      });

      addGameHistory('Lucky Wheel', betAmount, winAmount, `Hit ${result.label}`);
    }, 4000);
  };

  return (
    <div className="bg-[#0f0a1f] min-h-screen flex flex-col font-sans text-white relative overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(139,92,246,0.1)_0%,_transparent_70%)] pointer-events-none"></div>

      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 z-50">
        <button onClick={onBack} className="p-2.5 bg-zinc-900 rounded-2xl active:scale-90 border border-white/5"><ArrowLeft size={20}/></button>
        <div className="text-center">
            <h1 className="text-xl font-black italic gold-text tracking-widest uppercase">LUCKY SPIN</h1>
            <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-[0.4em]">Premium Fortune Wheel</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/80 px-4 py-2 rounded-2xl border border-yellow-500/20">
          <Wallet size={14} className="text-yellow-500" />
          <span className="text-sm font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
        </div>
      </div>

      {/* History Bar */}
      <div className="bg-black/20 p-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/5 z-40">
          <History size={14} className="text-purple-400 shrink-0 ml-2"/>
          <div className="flex gap-2">
              {history.map((h, i) => (
                  <span key={i} className="px-3 py-1 bg-zinc-800/50 rounded-full text-[10px] font-black border border-white/5 whitespace-nowrap text-zinc-400 uppercase tracking-tighter italic">{h}</span>
              ))}
          </div>
      </div>

      {/* Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        
        {/* NEW IMPROVED TOP POINTER (Arrow) */}
        <div className="absolute top-[4%] left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center pointer-events-none">
             <div 
                className="w-10 h-12 bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.8)]" 
                style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
             ></div>
             <div className="w-1 h-4 bg-gradient-to-b from-yellow-500 to-transparent -mt-1 opacity-50"></div>
        </div>

        {/* The Wheel */}
        <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">
            {/* Outer Glow Ring */}
            <div className="absolute inset-[-10px] rounded-full bg-purple-600/10 blur-3xl animate-pulse"></div>
            
            <div 
                className="w-full h-full rounded-full border-[10px] border-zinc-800 shadow-[0_0_80px_rgba(0,0,0,1)] relative transition-transform duration-[4000ms] cubic-bezier(0.1, 0, 0.1, 1)"
                style={{ 
                    transform: `rotate(${rotation}deg)`,
                    background: `conic-gradient(${SEGMENTS.map((s, i) => `${s.color} ${i * (360/SEGMENTS.length)}deg ${(i+1) * (360/SEGMENTS.length)}deg`).join(', ')})`
                }}
            >
                {/* Segment Labels */}
                {SEGMENTS.map((s, i) => (
                    <div 
                        key={i} 
                        className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 origin-bottom flex flex-col items-center justify-start pt-6"
                        style={{ transform: `translateX(-50%) rotate(${i * (360/SEGMENTS.length) + (360/SEGMENTS.length/2)}deg)` }}
                    >
                        <span className="text-white font-black text-sm italic tracking-tighter drop-shadow-md select-none">{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Center Core */}
            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                <div className="w-24 h-24 rounded-full bg-zinc-900 border-4 border-zinc-800 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent"></div>
                    <RotateCw size={32} className={`text-yellow-500 ${isSpinning ? 'animate-spin' : ''}`} />
                </div>
            </div>
        </div>

        {/* Bottom Label */}
        <div className="mt-10 text-center">
            <h2 className="text-2xl font-black italic gold-text tracking-tighter uppercase mb-1">MEGA FORTUNE</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em]">Spin your destiny tonight</p>
        </div>
      </div>

      {/* Control Board */}
      <div className="bg-[#0a0a0a] border-t border-white/5 p-6 pb-12 z-50">
          <div className="flex justify-between items-end mb-6 px-2">
              <div className="flex flex-col gap-2">
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Select Bet</span>
                  <div className="flex gap-2">
                      {[10, 50, 100, 500].map(amt => (
                          <button 
                            key={amt}
                            onClick={() => !isSpinning && setBetAmount(amt)}
                            className={`w-14 h-11 rounded-xl font-black text-xs border transition-all ${betAmount === amt ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_20px_rgba(139,92,246,0.4)]' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}
                          >
                            ₹{amt}
                          </button>
                      ))}
                  </div>
              </div>
              <button 
                onClick={() => setMuted(toggleMute())}
                className="p-3.5 bg-zinc-900 rounded-2xl text-zinc-400 border border-white/5 active:scale-90 transition-all"
              >
                  {muted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
              </button>
          </div>

          <button 
            onClick={handleSpin}
            disabled={isSpinning}
            className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 text-xl border-t-2 border-white/10 ${isSpinning ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white'}`}
          >
            <Trophy size={28} className={isSpinning ? '' : 'animate-bounce'} />
            {isSpinning ? 'SPINNING...' : 'SPIN NOW'}
          </button>
      </div>

      <style>{`
        .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default LuckyWheel;
