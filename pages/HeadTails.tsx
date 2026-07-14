
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, History, Volume2, VolumeX, Trash2, Coins, HelpCircle } from 'lucide-react';
import { updateBalance, addGameHistory, stopAllSounds, getMuteStatus, toggleMute, db, auth, addGameBet } from '../services/supabaseService';
import { GameResult } from '../types';
import { collection, addDoc } from 'firebase/firestore';

import HeadTailsResultPopup from '../components/HeadTailsResultPopup';
import HowToPlay from '../components/HowToPlay';

// Custom standalone AudioContext Synth class for lag-free professional Head & Tails audio
class HeadTailsSfx {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    this.isMuted = getMuteStatus();
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playBet() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playCoinSpin() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Ascending whoosh / spin sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);
    
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playTick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  playCoinLanding() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Play dual high frequency metal chime rings (the coin landing)
    const playMetalClink = (freq: number, delay: number, dur: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.08, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur);
    };

    playMetalClink(1500, 0, 0.15);
    playMetalClink(1900, 0.05, 0.25);
    playMetalClink(2400, 0.1, 0.12);
  }

  playWin() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.05, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
    });
  }

  playLoss() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.4);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

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
  const [htResult, setHtResult] = useState<any | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [floating, setFloating] = useState<{ text: string; color: string; id: number } | null>(null);

  const sfx = useRef(new HeadTailsSfx());
  const isMounted = useRef(true);

  const handleToggleMute = () => {
    const newMute = toggleMute();
    setMuted(newMute);
    sfx.current.setMuted(newMute);
  };

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopAllSounds();
    };
  }, []);

  const triggerFloating = (text: string, color: string) => {
      setFloating({ text, color, id: Date.now() });
      setTimeout(() => {
          if (isMounted.current) setFloating(null);
      }, 3000);
  };

  const handleFlip = async (sideOverride?: 'HEAD' | 'TAIL') => {
    const playerChoice = sideOverride || selectedSide;
    if (!playerChoice || isFlipping) return;
    if (betAmount > userBalance) {
      triggerFloating("Insufficient Balance!", "text-red-500");
      return;
    }

    // Record bet in Firestore (Non-blocking background call)
    if (auth.currentUser) {
        addGameBet('head_tails_bets', {
            amount: betAmount,
            target: playerChoice
        }).catch(err => console.error("Firestore bet recording failed:", err));
    }
    
    setIsFlipping(true);
    sfx.current.playCoinSpin();
    setHtResult(null);
    updateBalance(-betAmount, 'BET', 'Head & Tails Stake');

    // Immersive sound sequence: Play rapid coin flipping tick sounds during the 3D rotation
    let flipCount = 0;
    const flipInterval = setInterval(() => {
        if (!isMounted.current || flipCount >= 10) {
            clearInterval(flipInterval);
            return;
        }
        sfx.current.playTick();
        flipCount++;
    }, 150);

    // 1. Result Logic (Determined immediately but shown after animation)
    const outcome: 'HEAD' | 'TAIL' = Math.random() > 0.5 ? 'HEAD' : 'TAIL';
    
    // 2. Animation Logic (Must match the outcome)
    const extraRotations = 18 + Math.floor(Math.random() * 6); 
    const targetY = (extraRotations * 360) + (outcome === 'HEAD' ? 0 : 180);
    
    setRotation({ x: Math.random() * 24, y: targetY });

    // 3. Finalization logic after coin stops
    setTimeout(() => {
      if (!isMounted.current) {
        clearInterval(flipInterval);
        return;
      }
      
      clearInterval(flipInterval);
      sfx.current.playCoinLanding(); // Landing slap sound
      
      setIsFlipping(false);
      const isWin = playerChoice === outcome; // Compare with the captured choice
      
      setHistory(prev => [outcome === 'HEAD' ? 'H' : 'T', ...prev].slice(0, 15) as ("H" | "T")[]);

      const winAmt = isWin ? betAmount * 1.98 : 0;
      setHtResult({
          win: isWin,
          amount: isWin ? winAmt : 0,
          outcome: outcome,
          target: playerChoice
      });

      if (isWin) {
        updateBalance(winAmt, 'WIN', 'Head & Tails Win');
        triggerFloating(`+₹${winAmt.toFixed(2)}`, 'text-green-400');
        sfx.current.playWin();
      } else {
        triggerFloating(`-₹${betAmount.toFixed(2)}`, 'text-red-500');
        sfx.current.playLoss();
      }
      addGameHistory('Head & Tails', betAmount, isWin ? betAmount * 1.98 : 0, `Landed ${outcome}`);
    }, 2000);
  };

  const clearBet = () => {
    if (isFlipping) return;
    setSelectedSide(null);
    sfx.current.playClick();
  };

  return (
    <div className="bg-[#0a0f1d] h-screen max-h-screen flex flex-col font-sans text-white relative overflow-hidden select-none">
      <HeadTailsResultPopup result={htResult} onClose={() => setHtResult(null)} />
      <HowToPlay 
          isOpen={showHelp} 
          onClose={() => setShowHelp(false)} 
          title="Head & Tails Rules"
          rules={[
              "Choose either HEADS or TAILS.",
              "The coin is flipped in 3D space using Elite physics simulation.",
              "A correct prediction pays 1.98x your stake.",
              "History bar at the top shows recent landings."
          ]}
          payouts={[
              { label: "Predict Correct", value: "1.98x" }
          ]}
      />
      {floating && (
          <div key={floating.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-[100] font-black text-5xl italic pointer-events-none animate-float-up ${floating.color}`} style={{ textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
              {floating.text}
          </div>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(59,130,246,0.05)_0%,_transparent_60%)] pointer-events-none"></div>

      {/* Header */}
      <div className="p-3 flex justify-between items-center bg-[#111827]/90 backdrop-blur-xl border-b border-white/5 shadow-2xl relative z-50 shrink-0">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 bg-slate-800/80 rounded-xl border border-white/10 active:scale-90 transition-all"><ArrowLeft size={18}/></button>
            <div className="flex flex-col">
                <h1 className="text-xs font-black gold-text italic tracking-widest uppercase leading-none">HEAD & TAILS</h1>
                <span className="text-[7px] text-yellow-500/40 mt-0.5 uppercase font-bold">Binary Wallet</span>
            </div>
        </div>
        <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-xl border border-yellow-500/20 shadow-inner">
                <Wallet size={12} className="text-yellow-500" />
                <span className="text-xs font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
            </div>
            <button onClick={() => setShowHelp(true)} className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20 active:scale-90 transition-all"><HelpCircle className="w-4 h-4"/></button>
        </div>
      </div>

      {/* History Bar */}
      <div className="bg-black/40 p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-white/5 relative z-40 shrink-0">
          <History size={12} className="text-yellow-500 shrink-0 ml-1"/>
          <div className="flex gap-1">
              {history.map((h, i) => (
                  <span key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border border-white/10 shrink-0 ${h === 'H' ? 'bg-blue-600' : 'bg-orange-600'} text-white shadow-lg`}>{h}</span>
              ))}
          </div>
      </div>

      {/* Arena Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 relative overflow-hidden">
        <div className="relative perspective-1000 mb-6 md:mb-8 mt-2">
             <div 
               className="coin-container transition-transform duration-[2000ms] ease-out"
               style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
             >
                {/* Heads Face: Luxury Gold Texture */}
                <div className="coin-face head bg-gradient-to-tr from-[#92400e] via-[#f59e0b] to-[#fef08a] flex items-center justify-center border-[6px] border-amber-500 shadow-[inset_0_4px_10px_rgba(255,255,255,0.6),inset_0_-4px_10px_rgba(0,0,0,0.6),0_12px_24px_rgba(0,0,0,0.6)]">
                   <div className="absolute inset-1 rounded-full border-2 border-dashed border-amber-600/50 flex items-center justify-center">
                       {/* Shiny Gloss Reflection */}
                       <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent rotate-45 transform -translate-y-2 pointer-events-none"></div>
                       {/* Inner core */}
                       <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300 shadow-inner flex flex-col items-center justify-center relative overflow-hidden">
                           <div className="absolute top-1 md:top-2 flex gap-1">
                               <span className="text-[6px] text-amber-200">★</span>
                               <span className="text-[8px] text-amber-100">★</span>
                               <span className="text-[6px] text-amber-200">★</span>
                           </div>
                           <span className="text-4xl md:text-5xl font-black text-amber-950 font-sans tracking-tighter drop-shadow-[0_2px_1px_rgba(255,255,255,0.5)]">H</span>
                           <span className="text-[7px] md:text-[8px] font-black text-amber-950/80 uppercase tracking-widest mt-0.5">HEADS</span>
                           <div className="absolute bottom-1 md:bottom-2 flex gap-1">
                               <span className="text-[6px] text-amber-200">★</span>
                               <span className="text-[8px] text-amber-100">★</span>
                               <span className="text-[6px] text-amber-200">★</span>
                           </div>
                       </div>
                   </div>
                </div>

                {/* Tails Face: Warm Copper/Orange Bronze Texture */}
                <div className="coin-face tail bg-gradient-to-tr from-[#7c2d12] via-[#ea580c] to-[#ffedd5] flex items-center justify-center border-[6px] border-orange-500 shadow-[inset_0_4px_10px_rgba(255,255,255,0.6),inset_0_-4px_10px_rgba(0,0,0,0.6),0_12px_24px_rgba(0,0,0,0.6)]">
                   <div className="absolute inset-1 rounded-full border-2 border-dashed border-orange-700/50 flex items-center justify-center">
                       {/* Shiny Gloss Reflection */}
                       <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent rotate-45 transform -translate-y-2 pointer-events-none"></div>
                       {/* Inner core */}
                       <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 border border-orange-300 shadow-inner flex flex-col items-center justify-center relative overflow-hidden">
                           <div className="absolute top-1 md:top-2 flex gap-1">
                               <span className="text-[6px] text-orange-200">★</span>
                               <span className="text-[8px] text-orange-100">★</span>
                               <span className="text-[6px] text-orange-200">★</span>
                           </div>
                           <span className="text-4xl md:text-5xl font-black text-orange-950 font-sans tracking-tighter drop-shadow-[0_2px_1px_rgba(255,255,255,0.5)]">T</span>
                           <span className="text-[7px] md:text-[8px] font-black text-orange-950/80 uppercase tracking-widest mt-0.5">TAILS</span>
                           <div className="absolute bottom-1 md:bottom-2 flex gap-1">
                               <span className="text-[6px] text-orange-200">★</span>
                               <span className="text-[8px] text-orange-100">★</span>
                               <span className="text-[6px] text-orange-200">★</span>
                           </div>
                       </div>
                   </div>
                </div>
             </div>
             <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/50 blur-xl rounded-[100%] scale-x-150"></div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-sm relative z-20 px-4">
             <button 
               onClick={() => {
                   if (!isFlipping) {
                       setSelectedSide('HEAD');
                       sfx.current.playClick();
                   }
               }}
               className={`h-20 md:h-24 rounded-xl border-b-[4px] flex flex-col items-center justify-center transition-all active:scale-95 ${selectedSide === 'HEAD' ? 'bg-blue-900/40 border-blue-600 scale-105 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-slate-800/40 border-slate-700 opacity-60 grayscale'}`}
             >
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mb-1 border border-blue-500/30">
                    <span className="text-md font-black text-blue-500 italic">H</span>
                </div>
                <span className="text-xs font-black text-white italic">HEADS</span>
                <span className="text-[8px] font-black text-blue-500 mt-0.5">1.98X</span>
             </button>

             <button 
               onClick={() => {
                   if (!isFlipping) {
                       setSelectedSide('TAIL');
                       sfx.current.playClick();
                   }
               }}
               className={`h-20 md:h-24 rounded-xl border-b-[4px] flex flex-col items-center justify-center transition-all active:scale-95 ${selectedSide === 'TAIL' ? 'bg-orange-900/40 border-orange-600 scale-105 shadow-[0_0_15px_rgba(234,88,12,0.3)]' : 'bg-slate-800/40 border-slate-700 opacity-60 grayscale'}`}
             >
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center mb-1 border border-orange-500/30">
                    <span className="text-md font-black text-orange-500 italic">T</span>
                </div>
                <span className="text-xs font-black text-white italic">TAILS</span>
                <span className="text-[8px] font-black text-orange-500 mt-0.5">1.98X</span>
             </button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-[#111827] border-t border-white/5 p-4 shadow-[0_-20px_40px_rgba(0,0,0,0.8)] relative z-50 shrink-0 pb-6">
        <div className="flex justify-between items-end mb-3 px-1">
            <div>
                <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Stake</p>
                <div className="text-2xl font-black text-white italic tracking-tighter">₹{betAmount}</div>
            </div>
            <button 
              onClick={handleToggleMute}
              className="p-2.5 bg-slate-800/80 rounded-xl text-slate-400 border border-white/5 active:scale-90 transition-all"
            >
                {muted ? <VolumeX size={18} className="text-red-500" /> : <Volume2 size={18} className="text-yellow-500" />}
            </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
            <button 
                onClick={clearBet}
                disabled={isFlipping || !selectedSide}
                className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-600/30 text-red-500 flex flex-col items-center justify-center active:scale-90 transition-all disabled:opacity-30 shrink-0"
            >
                <Trash2 size={16} />
                <span className="text-[7px] font-black uppercase mt-0.5">Clear</span>
            </button>

            <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar py-1">
                {[10, 50, 100, 500, 1000].map(amt => (
                    <button 
                        key={amt} 
                        onClick={() => {
                            if (!isFlipping) {
                                setBetAmount(amt);
                                sfx.current.playBet();
                            }
                        }}
                        className={`flex-shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center font-black text-[10px] transition-all duration-300 ${betAmount === amt ? 'bg-yellow-500 border-white text-black scale-105 shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                    >
                        {amt >= 1000 ? `${amt/1000}K` : amt}
                    </button>
                ))}
            </div>
        </div>

        <button 
            onClick={() => handleFlip()}
            disabled={!selectedSide || isFlipping}
            className={`w-full py-5.5 rounded-2xl font-black uppercase tracking-[0.3em] shadow-[0_15px_30px_rgba(59,130,246,0.35)] active:scale-95 transition-all flex items-center justify-center gap-3 text-lg md:text-xl border-t-2 border-white/20 ${!selectedSide || isFlipping ? 'bg-slate-700 text-slate-500 opacity-50 grayscale cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-500 hover:from-blue-400 hover:via-indigo-500 hover:to-blue-400 text-white'}`}
        >
            <Coins size={22} className="animate-bounce" />
            {isFlipping ? 'FLIPPING...' : 'START FLIP'}
        </button>
      </div>

      <style>{`
        .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .perspective-1000 { perspective: 1000px; }
        .coin-container { position: relative; width: 7.5rem; height: 7.5rem; transform-style: preserve-3d; }
        @media (min-width: 768px) {
            .coin-container { width: 9.5rem; height: 9.5rem; }
        }
        .coin-face { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .head { transform: rotateY(0deg); }
        .tail { transform: rotateY(180deg); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes float-up {
            0% { transform: translate(-50%, 0); opacity: 0; scale: 0.5; }
            15% { opacity: 1; scale: 1.2; }
            85% { opacity: 1; scale: 1.2; }
            100% { transform: translate(-50%, -200px); opacity: 0; scale: 1.5; }
        }
        .animate-float-up { animation: float-up 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
    </div>
  );
};

export default HeadTails;
