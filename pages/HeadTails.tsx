
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, Volume2, VolumeX, Trash2, Coins } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, getMuteStatus, toggleMute } from '../services/mockFirebase';
import { GameResult } from '../types';

interface Props {
  onBack: () => void;
  userBalance: number;
  onResult: (r: GameResult) => void;
}

const HeadTails: React.FC<Props> = ({ onBack, userBalance, onResult }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [selectedSide, setSelectedSide] = useState<'HEAD' | 'TAIL' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [history, setHistory] = useState<('H' | 'T')[]>(['H', 'T', 'H', 'H', 'T']);
  const [muted, setMuted] = useState(getMuteStatus());
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopAllSounds();
    };
  }, []);

  const handleFlip = () => {
    if (!selectedSide || isFlipping) return;
    if (betAmount > userBalance) {
      alert("Insufficient Balance!");
      return;
    }

    // IMPORTANT: Capture the exact side the user bet on NOW
    const playerChoice = selectedSide; 
    
    setIsFlipping(true);
    playSound('click');
    // FIX: Changed invalid sound name 'spin' to 'wheel_spin'
    playSound('wheel_spin');
    updateBalance(-betAmount, 'BET', 'Head & Tails Stake');

    // 1. Result Logic (Determined immediately but shown after animation)
    const outcome: 'HEAD' | 'TAIL' = Math.random() > 0.5 ? 'HEAD' : 'TAIL';
    
    // 2. Animation Logic (Must match the outcome)
    const extraRotations = 10 + Math.floor(Math.random() * 5); 
    const targetY = (extraRotations * 360) + (outcome === 'HEAD' ? 0 : 180);
    
    setRotation({ x: Math.random() * 15, y: targetY });

    // 3. Finalization logic after coin stops
    setTimeout(() => {
      if (!isMounted.current) return;
      
      setIsFlipping(false);
      const isWin = playerChoice === outcome; // Compare with the captured choice
      
      setHistory(prev => [outcome === 'HEAD' ? 'H' : 'T', ...prev].slice(0, 15));

      if (isWin) {
        const winAmt = betAmount * 1.98;
        updateBalance(winAmt, 'WIN', 'Head & Tails Win');
        playSound('win');
        onResult({
          win: true,
          amount: winAmt,
          game: 'Head & Tails',
          resultDetails: [{ label: 'Landed', value: outcome === 'HEAD' ? 'Heads' : 'Tails' }]
        });
      } else {
        playSound('loss');
        onResult({
          win: false,
          amount: betAmount,
          game: 'Head & Tails',
          resultDetails: [{ label: 'Landed', value: outcome === 'HEAD' ? 'Heads' : 'Tails', color: 'text-red-500' }]
        });
      }
      addGameHistory('Head & Tails', betAmount, isWin ? betAmount * 1.98 : 0, `Landed ${outcome}`);
    }, 2100);
  };

  const clearBet = () => {
    if (isFlipping) return;
    setSelectedSide(null);
    playSound('click');
  };

  return (
    <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white relative overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(59,130,246,0.05)_0%,_transparent_60%)] pointer-events-none"></div>

      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-[#111827]/90 backdrop-blur-xl border-b border-white/5 shadow-2xl relative z-50">
        <button onClick={onBack} className="p-2.5 bg-slate-800/80 rounded-2xl border border-white/10 active:scale-90 transition-all"><ArrowLeft size={20}/></button>
        <div className="text-center">
            <h1 className="text-xl font-black italic gold-text tracking-widest uppercase">HEAD & TAILS</h1>
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">Binary Fortune Arena</p>
        </div>
        <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 shadow-inner">
          <Wallet size={14} className="text-yellow-500" />
          <span className="text-sm font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
        </div>
      </div>

      {/* History Bar */}
      <div className="bg-black/40 p-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/5 relative z-40">
          <History size={14} className="text-yellow-500 shrink-0 ml-2"/>
          <div className="flex gap-1.5">
              {history.map((h, i) => (
                  <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border border-white/10 shrink-0 ${h === 'H' ? 'bg-blue-600' : 'bg-orange-600'} text-white shadow-lg`}>{h}</span>
              ))}
          </div>
      </div>

      {/* Arena Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="relative perspective-1000 mb-20">
             <div 
               className="coin-container w-48 h-48 transition-transform duration-[2000ms] ease-out"
               style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
             >
                <div className="coin-face head bg-[#facc15] flex items-center justify-center border-8 border-[#ca8a04] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                   <div className="w-32 h-32 rounded-full border-4 border-[#ca8a04]/40 flex flex-col items-center justify-center">
                       <span className="text-6xl font-black text-[#ca8a04] italic">H</span>
                       <span className="text-[10px] font-black text-[#ca8a04] uppercase mt-1">Heads</span>
                   </div>
                </div>
                <div className="coin-face tail bg-[#ea580c] flex items-center justify-center border-8 border-[#9a3412] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                    <div className="w-32 h-32 rounded-full border-4 border-[#9a3412]/40 flex flex-col items-center justify-center">
                        <span className="text-6xl font-black text-[#9a3412] italic">T</span>
                        <span className="text-[10px] font-black text-[#9a3412] uppercase mt-1">Tails</span>
                    </div>
                </div>
             </div>
             <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-32 h-6 bg-black/40 blur-xl rounded-[100%] scale-x-150"></div>
        </div>

        <div className="grid grid-cols-2 gap-6 w-full max-w-sm relative z-20">
             <button 
               onClick={() => !isFlipping && setSelectedSide('HEAD')}
               className={`h-36 rounded-3xl border-b-[8px] flex flex-col items-center justify-center transition-all active:scale-95 ${selectedSide === 'HEAD' ? 'bg-blue-900/40 border-blue-600 scale-105 shadow-[0_0_30px_rgba(37,99,235,0.3)]' : 'bg-slate-800/40 border-slate-700 opacity-60 grayscale'}`}
             >
                <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mb-3 border border-blue-500/30">
                    <span className="text-2xl font-black text-blue-500 italic">H</span>
                </div>
                <span className="text-lg font-black text-white italic">HEADS</span>
                <span className="text-[9px] font-black text-blue-500 mt-1">1.98X</span>
             </button>

             <button 
               onClick={() => !isFlipping && setSelectedSide('TAIL')}
               className={`h-36 rounded-3xl border-b-[8px] flex flex-col items-center justify-center transition-all active:scale-95 ${selectedSide === 'TAIL' ? 'bg-orange-900/40 border-orange-600 scale-105 shadow-[0_0_30px_rgba(234,88,12,0.3)]' : 'bg-slate-800/40 border-slate-700 opacity-60 grayscale'}`}
             >
                <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center mb-3 border border-orange-500/30">
                    <span className="text-2xl font-black text-orange-500 italic">T</span>
                </div>
                <span className="text-lg font-black text-white italic">TAILS</span>
                <span className="text-[9px] font-black text-orange-500 mt-1">1.98X</span>
             </button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-[#111827] border-t border-white/5 p-6 shadow-[0_-20px_60px_rgba(0,0,0,1)] relative z-50 pb-10">
        <div className="flex justify-between items-end mb-6 px-2">
            <div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">Stake</p>
                <div className="text-3xl font-black text-white italic tracking-tighter">₹{betAmount}</div>
            </div>
            <button 
              onClick={() => setMuted(toggleMute())}
              className="p-3.5 bg-slate-800/80 rounded-2xl text-slate-400 border border-white/5 active:scale-90 transition-all"
            >
                {muted ? <VolumeX size={22}/> : <Volume2 size={22}/>}
            </button>
        </div>

        <div className="flex items-center gap-4 mb-8">
            <button 
                onClick={clearBet}
                disabled={isFlipping || !selectedSide}
                className="w-16 h-16 rounded-2xl bg-red-600/10 border-2 border-red-600/30 text-red-500 flex flex-col items-center justify-center active:scale-90 transition-all disabled:opacity-30"
            >
                <Trash2 size={20} />
                <span className="text-[8px] font-black uppercase mt-1">Clear</span>
            </button>

            <div className="flex-1 flex gap-2.5 overflow-x-auto no-scrollbar py-2">
                {[10, 50, 100, 500, 1000].map(amt => (
                    <button 
                        key={amt} 
                        onClick={() => !isFlipping && setBetAmount(amt)}
                        className={`flex-shrink-0 w-14 h-14 rounded-full border-4 flex items-center justify-center font-black text-xs transition-all duration-300 ${betAmount === amt ? 'bg-yellow-500 border-white text-black scale-110 shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                    >
                        {amt >= 1000 ? `${amt/1000}K` : amt}
                    </button>
                ))}
            </div>
        </div>

        <button 
            onClick={handleFlip}
            disabled={!selectedSide || isFlipping}
            className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 text-lg border-t-2 border-white/20 ${!selectedSide || isFlipping ? 'bg-slate-700 text-slate-500 opacity-50 grayscale cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-500 text-white'}`}
        >
            <Coins size={28} className="animate-bounce" />
            {isFlipping ? 'FLIPPING...' : 'START FLIP'}
        </button>
      </div>

      <style>{`
        .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .perspective-1000 { perspective: 1000px; }
        .coin-container { position: relative; width: 12rem; height: 12rem; transform-style: preserve-3d; }
        .coin-face { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .head { transform: rotateY(0deg); }
        .tail { transform: rotateY(180deg); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default HeadTails;
