
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, HelpCircle, X, RotateCw, Trophy, Volume2, VolumeX } from 'lucide-react';
import { updateBalance, addGameHistory, stopAllSounds, db, auth, addGameBet, getMuteStatus, toggleMute } from '../services/supabaseService';
import { GameResult } from '../types';
import { collection, addDoc } from 'firebase/firestore';

import KenoResultPopup from '../components/KenoResultPopup';

// Custom high-fidelity standalone AudioContext Synth class for lag-free professional Keno audio
class KenoSfx {
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

  playBallDraw() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playMatch() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.05); // E6
    
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.start(now);
    osc2.start(now + 0.05);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);
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

const Keno: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [gameState, setGameState] = useState<'IDLE' | 'DRAWING' | 'RESULT'>('IDLE');
  const [showRules, setShowRules] = useState(false);
  const [keResult, setKeResult] = useState<any | null>(null);
  const [floating, setFloating] = useState<{ text: string; color: string; id: number } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const [muted, setMuted] = useState(getMuteStatus());
  const sfx = useRef(new KenoSfx());

  const handleToggleMute = () => {
    const newMute = toggleMute();
    setMuted(newMute);
    sfx.current.setMuted(newMute);
  };

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const triggerFloating = (text: string, color: string) => {
      setFloating({ text, color, id: Date.now() });
      setTimeout(() => setFloating(null), 1500);
  };

  const toggleNum = (num: number) => {
    if (gameState !== 'IDLE') return;
    if (selected.includes(num)) {
        setSelected(prev => prev.filter(n => n !== num));
        sfx.current.playClick();
    } else if (selected.length < 10) {
        setSelected(prev => [...prev, num]);
        sfx.current.playClick();
    }
  };

  const startDraw = async () => {
    if (selected.length === 0 || userBalance < bet) return;
    
    // Record bet in Firestore using batched service
    if (auth.currentUser) {
        try {
            await addGameBet('keno_bets', {
                amount: bet,
                target: selected.join(',')
            });
        } catch (e) {}
    }

    updateBalance(-bet, 'BET', 'Keno Elite');
    setKeResult(null);
    setGameState('DRAWING');
    setDrawn([]);
    sfx.current.playBet();

    const results: number[] = [];
    while(results.length < 15) {
        const n = Math.floor(Math.random() * 40) + 1;
        if (!results.includes(n)) {
            results.push(n);
            setDrawn([...results]);
            
            // If the drawn number is one of the selected ones (HIT), play match sound, else normal ball draw tick
            if (selected.includes(n)) {
                sfx.current.playMatch();
            } else {
                sfx.current.playBallDraw();
            }
            await new Promise(r => setTimeout(r, 120));
        }
    }

    const matches = selected.filter(n => results.includes(n)).length;
    let mult = 0;
    if (matches === 1) mult = 1.5;
    else if (matches === 2) mult = 4;
    else if (matches === 3) mult = 10;
    else if (matches === 4) mult = 25;
    else if (matches >= 5) mult = 100;

    const winAmt = bet * mult;
    setKeResult({
        win: winAmt > 0,
        amount: winAmt > 0 ? winAmt : bet,
        matches: matches,
        multiplier: mult
    });

    if (winAmt > 0) {
        updateBalance(winAmt, 'WIN', 'Keno Elite Win');
        triggerFloating(`+₹${winAmt.toFixed(2)}`, 'text-green-400');
        sfx.current.playWin();
    } else {
        triggerFloating(`-₹${bet.toFixed(2)}`, 'text-red-500');
        sfx.current.playLoss();
    }

    addGameHistory('Keno Elite', bet, winAmt, `Matches: ${matches}`);
    setGameState('RESULT');
  };

  const reset = () => {
    setGameState('IDLE');
    setDrawn([]);
    setSelected([]);
  };

  return (
    <div className="bg-[#051515] min-h-screen flex flex-col font-sans text-white relative overflow-hidden">
      <KenoResultPopup result={keResult} onClose={() => setKeResult(null)} />
      {floating && (
          <div key={floating.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-[100] font-black text-5xl italic pointer-events-none animate-float-up ${floating.color}`} style={{ textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
              {floating.text}
          </div>
      )}

      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-emerald-500/20 shadow-2xl relative z-50">
        <button onClick={onBack} className="p-2 bg-zinc-900 rounded-xl"><ArrowLeft size={20}/></button>
        <div className="flex flex-col items-center text-center">
            <h1 className="text-xl font-black gold-text italic tracking-widest uppercase leading-none">KENO ELITE</h1>
            <div className="flex items-center gap-1 mt-1">
                <Wallet size={12} className="text-emerald-500" />
                <span className="text-[10px] font-mono font-black text-emerald-500">₹{userBalance.toFixed(2)}</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={handleToggleMute} className="p-2 bg-zinc-900 rounded-xl text-yellow-500">
                {muted ? <VolumeX size={18} className="text-red-500" /> : <Volume2 size={18} className="text-yellow-500" />}
            </button>
            <button onClick={() => setShowRules(true)} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl"><HelpCircle size={20}/></button>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col items-center justify-center relative">
          <div className="grid grid-cols-8 gap-1.5 w-full max-w-sm mb-6">
              {Array.from({length: 40}).map((_, i) => {
                  const n = i + 1;
                  const isSelected = selected.includes(n);
                  const isDrawn = drawn.includes(n);
                  const isMatch = isSelected && isDrawn;

                  return (
                      <button 
                        key={n} 
                        onClick={() => toggleNum(n)}
                        className={`aspect-square rounded-lg font-black text-[10px] border transition-all duration-300 transform active:scale-90 ${isMatch ? 'bg-yellow-500 border-white text-black scale-110 shadow-lg' : isDrawn ? 'bg-red-500 border-red-400 text-white' : isSelected ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-900/40' : 'bg-zinc-900/60 border-white/5 text-slate-500'}`}
                      >
                          {n}
                      </button>
                  );
              })}
          </div>

          <div className="flex gap-4 w-full max-w-sm">
               <div className="flex-1 bg-black/40 p-3 rounded-xl border border-white/5 text-center">
                   <p className="text-[8px] text-slate-500 uppercase font-black">Selected</p>
                   <p className="text-sm font-black text-emerald-400">{selected.length}/10</p>
               </div>
               <div className="flex-1 bg-black/40 p-3 rounded-xl border border-white/5 text-center">
                   <p className="text-[8px] text-slate-500 uppercase font-black">Matches</p>
                   <p className="text-sm font-black text-yellow-500">{selected.filter(n => drawn.includes(n)).length}</p>
               </div>
          </div>
      </div>

      <div className="bg-[#0a0a0a] p-6 border-t border-white/10 pb-12 z-50 shadow-[0_-10px_40px_rgba(0,0,0,1)]">
          {gameState === 'RESULT' ? (
              <button onClick={reset} className="w-full py-5 bg-zinc-800 rounded-[2rem] font-black text-xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                  <RotateCw size={24}/> RESET BOARD
              </button>
          ) : (
              <div className="space-y-4">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {[10, 100, 500, 1000].map(a => <button key={a} onClick={() => setBet(a)} className={`px-5 py-2 rounded-xl font-black text-xs border transition-all ${bet === a ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}>₹{a}</button>)}
                  </div>
                  <button onClick={startDraw} disabled={selected.length === 0 || gameState === 'DRAWING'} className={`w-full py-6 rounded-[2.5rem] font-black text-2xl uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${selected.length > 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-t-2 border-white/20' : 'bg-slate-800 text-slate-500 opacity-50'}`}>
                      {gameState === 'DRAWING' ? 'DRAWING...' : 'START DRAW'}
                  </button>
              </div>
          )}
      </div>

      {showRules && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
              <div className="bg-[#0a1a1a] border border-emerald-500/30 w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl">
                   <div className="flex justify-between items-center mb-6">
                       <h2 className="text-2xl font-black italic gold-text">KENO GUIDE</h2>
                       <button onClick={() => setShowRules(false)} className="p-2 bg-zinc-900 rounded-full"><X/></button>
                   </div>
                   
                   <div className="bg-zinc-900/60 p-4 rounded-2xl border border-emerald-500/20 text-xs text-zinc-300 leading-relaxed mb-6 shadow-md">
                       <h4 className="font-black text-emerald-400 mb-2 uppercase tracking-widest text-[11px]">How to Play</h4>
                       <p className="space-y-1">
                           <div>1. Select up to 10 numbers on the grid.</div>
                           <div>2. Click "START DRAW" to begin.</div>
                           <div>3. 15 numbers will be randomly drawn.</div>
                           <div>4. Match more numbers to win up to 100x!</div>
                       </p>
                   </div>
                   
                   <div className="space-y-3">
                       <div className="flex justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                           <span className="text-slate-400">5+ Matches</span>
                           <span className="font-black text-yellow-500 text-xl">100X</span>
                       </div>
                       <div className="flex justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                           <span className="text-slate-400">4 Matches</span>
                           <span className="font-black text-emerald-400 text-xl">25X</span>
                       </div>
                       <div className="flex justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                           <span className="text-slate-400">3 Matches</span>
                           <span className="font-black text-emerald-500 text-xl">10X</span>
                       </div>
                       <div className="flex justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                           <span className="text-slate-400">2 Matches</span>
                           <span className="font-black text-emerald-600 text-xl">4X</span>
                       </div>
                       <div className="flex justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                           <span className="text-slate-400">1 Match</span>
                           <span className="font-black text-emerald-700 text-xl">1.5X</span>
                       </div>
                   </div>
              </div>
          </div>
      )}
      <style>{`
          .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          @keyframes float-up {
              0% { transform: translate(-50%, 0); opacity: 0; scale: 0.5; }
              20% { opacity: 1; scale: 1.2; }
              100% { transform: translate(-50%, -150px); opacity: 0; scale: 1.5; }
          }
          .animate-float-up { animation: float-up 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
    </div>
  );
};

export default Keno;
