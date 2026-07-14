import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Volume2, VolumeX, History, HelpCircle, X, Check, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, addGameHistory, stopAllSounds, toggleMute, getMuteStatus, auth, shouldForceLoss } from '../services/supabaseService';
import { GameResult, RouletteBet, RouletteState } from '../types';
import RouletteResultPopup from '../components/RouletteResultPopup';
import { useStabilizedTimer } from '../hooks/useTimer';
import { RouletteWheelArena } from '../components/RouletteWheelArena';

const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

// Custom high-fidelity sound generator for roulette (No external assets required!)
class RouletteSfx {
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

  playChip() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Plastic chip rattle click sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.04);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playLock() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Metallic heavy block clang sound
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(100, now);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(200, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  playTick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  playBallBounce() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // High-pitched wood-plastic bounce clink
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350 + Math.random() * 150, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }
}

// Interactive custom roulette chips array
const CHIP_VALUES = [
  { value: 1, label: '1', color: 'from-cyan-500 to-blue-600 border-cyan-300 ring-cyan-500/20 shadow-cyan-500/30' },
  { value: 5, label: '5', color: 'from-gray-500 to-slate-600 border-gray-300 ring-slate-500/20 shadow-slate-500/30' },
  { value: 10, label: '10', color: 'from-purple-500 to-indigo-600 border-purple-300 ring-purple-500/20 shadow-purple-500/30' },
  { value: 25, label: '25', color: 'from-orange-500 to-amber-600 border-orange-300 ring-orange-500/20 shadow-orange-500/30' },
  { value: 50, label: '50', color: 'from-red-500 to-rose-600 border-red-300 ring-red-500/20 shadow-red-500/30' },
  { value: 100, label: '100', color: 'from-teal-500 to-emerald-600 border-teal-300 ring-teal-500/20 shadow-teal-500/30' },
  { value: 500, label: '500', color: 'from-pink-500 to-fuchsia-600 border-pink-300 ring-pink-500/20 shadow-pink-500/30' },
  { value: 1000, label: '1K', color: 'from-yellow-500 to-amber-600 border-yellow-300 ring-yellow-500/20 shadow-yellow-500/30' }
];

const Roulette: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const sfxRef = useRef(new RouletteSfx());
  
  const [gameState, setGameState] = useState<RouletteState>({
    status: 'BETTING',
    period: new Date().getTime().toString().slice(-6),
    endTime: Date.now() + 30000,
    history: [32, 15, 19, 4, 21, 2, 25, 17, 34, 6],
    timeLeft: 30,
    winningNumber: null
  });

  const [myBets, setMyBets] = useState<any[]>([]);
  const [lastRoundBets, setLastRoundBets] = useState<any[]>([]);
  const [isBettingLocked, setIsBettingLocked] = useState(false);
  const [selectedChip, setSelectedChip] = useState(10);
  const [lastWin, setLastWin] = useState<number>(0);
  const [muted, setMuted] = useState(getMuteStatus());
  const [showPaytable, setShowPaytable] = useState(false);
  const [floating, setFloating] = useState<{ text: string; color: string; id: number } | null>(null);
  const [rlResult, setRlResult] = useState<any | null>(null);
  const [showCameraArena, setShowCameraArena] = useState(false);

  const lastTickRef = useRef<number>(-1);
  const isMounted = useRef(true);
  const timeLeft = useStabilizedTimer(gameState.endTime);

  // Sync volume with database
  useEffect(() => {
    isMounted.current = true;
    sfxRef.current.setMuted(muted);
    return () => {
      isMounted.current = false;
      stopAllSounds();
    };
  }, [muted]);

  // Lock status trigger
  useEffect(() => {
    const isLocked = gameState.status !== 'BETTING' || timeLeft <= 5;
    setIsBettingLocked(isLocked);

    if (gameState.status === 'BETTING' && timeLeft <= 5 && timeLeft > 0 && timeLeft !== lastTickRef.current) {
      if (timeLeft === 5) {
        sfxRef.current.playLock();
      } else {
        sfxRef.current.playTick();
      }
      lastTickRef.current = timeLeft;
    }
  }, [timeLeft, gameState.status]);

  // Round loop controller
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState.status === 'BETTING') {
        if (Date.now() >= (gameState.endTime || 0)) {
          setGameState(prev => ({ ...prev, status: 'LOCKED' }));
          setIsBettingLocked(true);
          triggerSpinSequence();
        } else if (timeLeft <= 5) {
          setIsBettingLocked(true);
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [gameState.status, gameState.endTime, timeLeft, myBets]);

  // Trigger physics wheel simulation
  const triggerSpinSequence = () => {
    const totalStake = myBets.reduce((a, b) => a + b.amount, 0);
    const isForcedLoss = shouldForceLoss(totalStake, userBalance);

    // Random pocket selection
    let num = WHEEL_ORDER[Math.floor(Math.random() * WHEEL_ORDER.length)];

    if (isForcedLoss && myBets.length > 0) {
      let found = false;
      let safety = 0;
      while (!found && safety < 120) {
        const potential = WHEEL_ORDER[Math.floor(Math.random() * WHEEL_ORDER.length)];
        let canProtect = true;
        const isRed = REDS.includes(potential);
        const isEven = potential !== 0 && potential % 2 === 0;

        for (const bet of myBets) {
          if (bet.type === 'NUMBER' && bet.value === potential) { canProtect = false; break; }
          if (bet.type === 'COLOR') {
            if (bet.value === 'RED' && isRed) { canProtect = false; break; }
            if (bet.value === 'BLACK' && !isRed && potential !== 0) { canProtect = false; break; }
          }
          if (bet.type === 'ODD_EVEN') {
            if (bet.value === 'EVEN' && isEven) { canProtect = false; break; }
            if (bet.value === 'ODD' && !isEven && potential !== 0) { canProtect = false; break; }
          }
          if (bet.type === 'RANGE') {
            if (bet.value === '1-18' && potential >= 1 && potential <= 18) { canProtect = false; break; }
            if (bet.value === '19-36' && potential >= 19 && potential <= 36) { canProtect = false; break; }
          }
          if (bet.type === 'DOZEN') {
            if (bet.value === '1st 12' && potential >= 1 && potential <= 12) { canProtect = false; break; }
            if (bet.value === '2nd 12' && potential >= 13 && potential <= 24) { canProtect = false; break; }
            if (bet.value === '3rd 12' && potential >= 25 && potential <= 36) { canProtect = false; break; }
          }
          if (bet.type === 'COLUMN') {
            const modVal = potential !== 0 ? potential % 3 : -1;
            if (bet.value === 1 && modVal === 1) { canProtect = false; break; } // Row 3
            if (bet.value === 2 && modVal === 2) { canProtect = false; break; } // Row 2
            if (bet.value === 3 && modVal === 0 && potential !== 0) { canProtect = false; break; } // Row 1
          }
        }
        if (canProtect) {
          num = potential;
          found = true;
        }
        safety++;
      }
    }

    setGameState(prev => ({
      ...prev,
      status: 'RESULT',
      winningNumber: num
    }));

    // Trigger full camera zoom simulation overlay
    setShowCameraArena(true);
  };

  // Called when ball settles inside a pocket in RouletteWheelArena
  const handleSettleOutcome = () => {
    setShowCameraArena(false);
    const winningNum = gameState.winningNumber ?? 0;
    processMyResult(winningNum);
  };

  const processMyResult = (num: number) => {
    let totalWin = 0;
    let totalBet = 0;
    const isRed = REDS.includes(num);
    const isEven = num !== 0 && num % 2 === 0;

    myBets.forEach(bet => {
      totalBet += bet.amount;
      if (bet.type === 'NUMBER' && bet.value === num) {
        totalWin += bet.amount * 36;
      }
      if (bet.type === 'COLOR') {
        if (bet.value === 'RED' && isRed) totalWin += bet.amount * 2;
        if (bet.value === 'BLACK' && !isRed && num !== 0) totalWin += bet.amount * 2;
      }
      if (bet.type === 'ODD_EVEN') {
        if (bet.value === 'EVEN' && isEven) totalWin += bet.amount * 2;
        if (bet.value === 'ODD' && !isEven && num !== 0) totalWin += bet.amount * 2;
      }
      if (bet.type === 'RANGE') {
        if (bet.value === '1-18' && num >= 1 && num <= 18) totalWin += bet.amount * 2;
        if (bet.value === '19-36' && num >= 19 && num <= 36) totalWin += bet.amount * 2;
      }
      if (bet.type === 'DOZEN') {
        if (bet.value === '1st 12' && num >= 1 && num <= 12) totalWin += bet.amount * 3;
        if (bet.value === '2nd 12' && num >= 13 && num <= 24) totalWin += bet.amount * 3;
        if (bet.value === '3rd 12' && num >= 25 && num <= 36) totalWin += bet.amount * 3;
      }
      if (bet.type === 'COLUMN') {
        const modVal = num !== 0 ? num % 3 : -1;
        if (bet.value === 1 && modVal === 1) totalWin += bet.amount * 3; // Row 3
        if (bet.value === 2 && modVal === 2) totalWin += bet.amount * 3; // Row 2
        if (bet.value === 3 && modVal === 0 && num !== 0) totalWin += bet.amount * 3; // Row 1
      }
    });

    const isWin = totalWin > 0;
    setLastWin(totalWin);

    if (isWin) {
      updateBalance(totalWin, 'WIN', 'Roulette Win');
      triggerFloating(`+₹${totalWin.toFixed(1)}`, 'text-emerald-400 font-mono');
    } else if (totalBet > 0) {
      triggerFloating(`-₹${totalBet.toFixed(1)}`, 'text-red-500 font-mono');
    }

    if (totalBet > 0) {
      setRlResult({
        win: isWin,
        amount: isWin ? totalWin : 0,
        period: gameState.period,
        winningNumber: num,
        isRed: isRed,
        target: myBets.map(b => `${b.type}: ${b.value}`).join(', ')
      });
      addGameHistory('Fun Roulette', totalBet, totalWin, `Landed ${num}`);
    }

    setLastRoundBets(myBets);

    // Soft reset for next period
    setTimeout(() => {
      if (!isMounted.current) return;
      setGameState(prev => ({
        status: 'BETTING',
        period: new Date().getTime().toString().slice(-6),
        endTime: Date.now() + 30000,
        history: [num, ...prev.history].slice(0, 15),
        timeLeft: 30,
        winningNumber: null
      }));
      setMyBets([]);
      setIsBettingLocked(false);
    }, 4500);
  };

  const triggerFloating = (text: string, color: string) => {
    setFloating({ text, color, id: Date.now() });
    setTimeout(() => setFloating(null), 3000);
  };

  const handlePlaceBet = async (type: 'NUMBER' | 'COLOR' | 'ODD_EVEN' | 'RANGE' | 'DOZEN' | 'COLUMN', value: string | number) => {
    if (gameState.status !== 'BETTING' || isBettingLocked) return;
    if (userBalance < selectedChip) {
      triggerFloating("Low Balance", "text-red-500");
      return;
    }

    const currentIdx = myBets.findIndex(b => b.type === type && b.value === value);
    if (currentIdx > -1) {
      const updated = [...myBets];
      updated[currentIdx].amount += selectedChip;
      setMyBets(updated);
    } else {
      setMyBets(prev => [...prev, { type, value, amount: selectedChip }]);
    }

    await updateBalance(-selectedChip, 'BET', `Roulette: ${value}`);
    sfxRef.current.playChip();
  };

  // Bottom Buttons: Clear, Rebet, Double
  const handleClearBets = async () => {
    if (isBettingLocked || myBets.length === 0) return;
    const refundSum = myBets.reduce((acc, b) => acc + b.amount, 0);
    setMyBets([]);
    await updateBalance(refundSum, 'WIN', 'Cleared Active Bets');
    sfxRef.current.playChip();
    triggerFloating("Bets Cleared", "text-amber-500");
  };

  const handleRebetLast = async () => {
    if (isBettingLocked || lastRoundBets.length === 0) return;
    const required = lastRoundBets.reduce((acc, b) => acc + b.amount, 0);
    if (userBalance < required) {
      triggerFloating("Low Balance", "text-red-500");
      return;
    }
    setMyBets(lastRoundBets);
    await updateBalance(-required, 'BET', 'Rebet Previous Stakes');
    sfxRef.current.playChip();
    triggerFloating("Rebet Placed", "text-teal-400");
  };

  const handleDoubleStakes = async () => {
    if (isBettingLocked || myBets.length === 0) return;
    const required = myBets.reduce((acc, b) => acc + b.amount, 0);
    if (userBalance < required) {
      triggerFloating("Low Balance", "text-red-500");
      return;
    }
    const doubled = myBets.map(b => ({ ...b, amount: b.amount * 2 }));
    setMyBets(doubled);
    await updateBalance(-required, 'BET', 'Doubled active stakes');
    sfxRef.current.playChip();
    triggerFloating("Stakes Doubled", "text-cyan-400");
  };

  const handleToggleMuted = () => {
    const n = toggleMute();
    setMuted(n);
  };

  // Helpers to fetch specific bets for table chips rendering
  const getCellBetAmount = (type: string, value: string | number) => {
    return myBets.filter(b => b.type === type && b.value === value).reduce((acc, b) => acc + b.amount, 0);
  };

  const totalCurrentBet = myBets.reduce((acc, b) => acc + b.amount, 0);

  // Layout configuration matching standard roulette grid rows
  const row1 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
  const row2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
  const row3 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

  return (
    <div className="bg-[#0e0c0a] min-h-screen w-full flex flex-col font-sans text-white overflow-x-hidden relative select-none">
      
      {/* Result Top Popup */}
      <RouletteResultPopup result={rlResult} onClose={() => setRlResult(null)} />

      {/* Camera zoom simulation view */}
      {showCameraArena && (
        <RouletteWheelArena 
          winningNumber={gameState.winningNumber ?? 0} 
          onSettle={handleSettleOutcome} 
          sfx={sfxRef.current} 
        />
      )}

      {/* Floating alert indicators */}
      {floating && (
        <div key={floating.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] font-black text-4xl italic pointer-events-none animate-float-up ${floating.color}`} style={{ textShadow: '0 0 20px rgba(0,0,0,1)' }}>
          {floating.text}
        </div>
      )}

      {/* LUXURY WOOD TOP BAR */}
      <div className="relative px-4 py-3 bg-gradient-to-b from-[#3b1c0c] to-[#1a0b04] border-b border-yellow-600/30 flex justify-between items-center z-40 shadow-[0_6px_20px_rgba(0,0,0,0.6)]">
        
        {/* Title branding mimicking 'Fun Roulette' calligraphy */}
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-black/40 hover:bg-black/60 rounded-xl active:scale-95 transition-all border border-yellow-600/20 text-yellow-500">
            <ArrowLeft size={18}/>
          </button>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-wide bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-200 bg-clip-text text-transparent italic shadow-sm" style={{ fontFamily: 'Georgia, serif' }}>
              Fun Roulette
            </span>
            <span className="text-[7px] text-yellow-600 font-bold uppercase tracking-[0.2em] -mt-0.5">Classic Table</span>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <div className="bg-black/60 px-3.5 py-1.5 rounded-2xl border border-yellow-500/20 text-yellow-400 font-mono text-xs flex items-center gap-2 shadow-inner">
            <Wallet size={13} className="text-yellow-500" />
            <span className="font-extrabold text-yellow-400">₹{userBalance.toFixed(1)}</span>
          </div>
          <button onClick={() => setShowPaytable(true)} className="p-2 bg-black/40 border border-yellow-600/20 rounded-xl text-yellow-500 hover:text-white transition-colors">
            <HelpCircle size={16}/>
          </button>
          <button onClick={handleToggleMuted} className="p-2 bg-black/40 border border-yellow-600/20 rounded-xl text-yellow-500 hover:text-white transition-colors">
            {muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
          </button>
        </div>
      </div>

      {/* CORE INTERACTIVE DASHBOARD SECTION */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-3 flex flex-col gap-4 overflow-y-auto">

        {/* TOP LAYOUT SECTION: Left Score Plate | Center Mini Wheel | Right Progress Timer */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* LEFT BOARD - SCORE PLATE */}
          <div className="md:col-span-3 bg-gradient-to-br from-[#2c1308] to-[#120703] border-2 border-yellow-600/30 p-3.5 rounded-2xl shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),_0_8px_16px_rgba(0,0,0,0.4)] flex flex-col justify-between h-[155px]">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs border-b border-yellow-600/10 pb-1">
                <span className="font-black text-zinc-400 uppercase tracking-widest text-[10px]">Score :</span>
                <span className="font-extrabold text-yellow-500 font-mono">₹{userBalance.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-yellow-600/10 pb-1">
                <span className="font-black text-zinc-400 uppercase tracking-widest text-[10px]">Win :</span>
                <span className="font-extrabold text-emerald-400 font-mono">₹{lastWin.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-1">
                <span className="font-black text-zinc-400 uppercase tracking-widest text-[10px]">Bet :</span>
                <span className="font-extrabold text-cyan-400 font-mono">₹{totalCurrentBet.toFixed(1)}</span>
              </div>
            </div>

            {/* QUICK ACTIONS ROW */}
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              <button 
                onClick={handleDoubleStakes} 
                disabled={isBettingLocked || totalCurrentBet === 0}
                className="py-2 rounded-xl bg-gradient-to-b from-amber-600 to-amber-800 text-[9px] font-black uppercase tracking-wider text-yellow-100 hover:brightness-110 active:scale-95 border border-yellow-600/30 disabled:opacity-30 shadow-md"
              >
                Double
              </button>
              <button 
                onClick={handleRebetLast} 
                disabled={isBettingLocked || lastRoundBets.length === 0}
                className="py-2 rounded-xl bg-gradient-to-b from-amber-600 to-amber-800 text-[9px] font-black uppercase tracking-wider text-yellow-100 hover:brightness-110 active:scale-95 border border-yellow-600/30 disabled:opacity-30 shadow-md"
              >
                Rebet
              </button>
              <button 
                onClick={handleClearBets} 
                disabled={isBettingLocked || totalCurrentBet === 0}
                className="py-2 rounded-xl bg-gradient-to-b from-red-700 to-red-900 text-[9px] font-black uppercase tracking-wider text-white hover:brightness-110 active:scale-95 border border-red-600/20 disabled:opacity-30 shadow-md"
              >
                Clear
              </button>
            </div>
          </div>

          {/* CENTER - STATS MINI WHEEL DISPLAY */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
            <div className="relative w-36 h-36 flex items-center justify-center bg-black/60 rounded-full border-4 border-[#5b2d16] shadow-[0_10px_25px_rgba(0,0,0,0.8),_inset_0_4px_16px_rgba(0,0,0,0.9)] overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.04)_0%,transparent_70%)] pointer-events-none" />
              
              {/* Golden metallic brass central element */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#1c0e07] to-[#2c1308] border-2 border-yellow-500/80 shadow-lg flex flex-col items-center justify-center relative z-10">
                {gameState.status === 'BETTING' ? (
                  <>
                    <span className="text-2xl font-black font-mono leading-none text-yellow-400">{timeLeft}</span>
                    <span className="text-[6px] tracking-widest text-yellow-500/50 uppercase font-black mt-1">SECONDS</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-black tracking-widest text-red-500 leading-none">LOCK</span>
                    <span className="text-[5px] text-red-500/50 uppercase font-bold mt-1">NO MORE</span>
                  </>
                )}
              </div>

              {/* Surrounding concentric green slots */}
              <div className="absolute inset-2 border border-yellow-500/20 rounded-full animate-[spin_40s_linear_infinite]" style={{ borderStyle: 'dashed' }} />
            </div>
          </div>

          {/* RIGHT BOARD - DRAW TIME PROGRESS RING & HISTORIC STRIP */}
          <div className="md:col-span-4 flex gap-4 items-center h-[155px]">
            
            {/* Draw Time Gauge Circular Progress */}
            <div className="flex-1 bg-gradient-to-br from-[#2c1308] to-[#120703] border-2 border-yellow-600/30 p-3.5 rounded-2xl shadow-xl h-full flex flex-col justify-between items-center text-center">
              <div>
                <span className="text-[8px] font-black tracking-widest text-zinc-400 uppercase">DRAW TIME</span>
                <span className="block text-sm font-black font-mono text-yellow-500 mt-0.5">
                  00:{timeLeft < 10 ? '0' + timeLeft : timeLeft}
                </span>
              </div>

              {/* Circular Ring Progress representation */}
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="28" cy="28" r="23" stroke="#1f120c" strokeWidth="4" fill="transparent" />
                  <circle 
                    cx="28" 
                    cy="28" 
                    r="23" 
                    stroke={timeLeft > 5 ? '#10b981' : '#ef4444'} 
                    strokeWidth="4" 
                    fill="transparent" 
                    strokeDasharray="144" 
                    strokeDashoffset={144 - (144 * timeLeft) / 30}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-sm font-black font-mono">{timeLeft}</span>
              </div>

              <div className="text-[8px] text-zinc-500 font-bold uppercase">
                {isBettingLocked ? 'Lock Status' : 'Accepting Chips'}
              </div>
            </div>

            {/* LAST DATA Strip (vertical ordered recent lists) */}
            <div className="bg-gradient-to-br from-[#120703] to-[#0a0402] border-2 border-yellow-600/20 px-2.5 py-2 rounded-2xl h-full flex flex-col justify-between items-center text-center">
              <span className="text-[7px] font-black text-yellow-600 uppercase tracking-widest border-b border-yellow-600/10 pb-0.5 w-full">LAST DATA</span>
              
              <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar py-1.5 h-full w-full">
                {gameState.history.slice(0, 5).map((num, i) => {
                  const isRed = REDS.includes(num);
                  return (
                    <span 
                      key={i} 
                      className={`w-6 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shadow-md ${
                        num === 0 
                          ? 'bg-green-700 text-white border border-green-500' 
                          : isRed 
                            ? 'bg-red-600 text-white border border-red-500' 
                            : 'bg-zinc-800 text-white border border-zinc-700'
                      }`}
                    >
                      {num}
                    </span>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* CHIP SELECTION PANEL */}
        <div className="bg-[#1f1008] border border-yellow-600/20 py-2.5 px-4 rounded-2xl shadow-xl flex items-center justify-between gap-3">
          <span className="text-[8px] font-black text-yellow-500/50 tracking-widest uppercase">Select Chips:</span>
          
          <div className="flex-1 flex gap-2 justify-center overflow-x-auto no-scrollbar px-2">
            {CHIP_VALUES.map(chip => (
              <button 
                key={chip.value}
                onClick={() => setSelectedChip(chip.value)}
                className={`relative w-11 h-11 rounded-full bg-gradient-to-br ${chip.color} border-[3px] font-black text-[10px] tracking-tight flex items-center justify-center shadow-lg transition-all duration-300 ${
                  selectedChip === chip.value 
                    ? 'scale-115 ring-2 ring-white z-10 shadow-2xl shadow-yellow-500/35 border-white' 
                    : 'opacity-65 hover:opacity-100'
                }`}
              >
                {/* Authentic striped outer chip ring */}
                <div className="absolute inset-0.5 rounded-full border-2 border-dashed border-white/45 opacity-40 pointer-events-none" />
                <span className="relative drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.6)] text-white">{chip.label}</span>
              </button>
            ))}
          </div>

          <button onClick={() => setShowPaytable(true)} className="p-2 bg-black/40 border border-yellow-600/25 text-yellow-500 hover:text-white rounded-full transition-all">
            <Check size={14} />
          </button>
        </div>

        {/* COMPREHENSIVE GREEN CASINO FELT BETTING GRID */}
        <div className="bg-[#0b2915] border-4 border-[#3b1d0c] rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.8),_inset_0_4px_30px_rgba(0,0,0,0.9)] p-3 relative flex flex-col gap-2 overflow-hidden">
          
          {/* Green felt noise & subtle gradient background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_85%)] pointer-events-none" />

          {/* NUMBERS ROW COMBINATION */}
          <div className="flex gap-1 items-stretch">
            
            {/* Zero Cell Block (Left Green Arc) */}
            <button 
              onClick={() => handlePlaceBet('NUMBER', 0)}
              disabled={isBettingLocked}
              className="w-14 bg-[#14532d] hover:bg-[#15803d] border border-emerald-500/30 rounded-l-2xl flex flex-col items-center justify-center relative font-black text-xl transition-all active:scale-95 disabled:opacity-30"
            >
              <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">0</span>
              {getCellBetAmount('NUMBER', 0) > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                    ₹{getCellBetAmount('NUMBER', 0)}
                  </div>
                </div>
              )}
            </button>

            {/* Main 3x12 Grid Numbers */}
            <div className="flex-1 flex flex-col gap-1">
              
              {/* Row 1 (Top): 3, 6, 9... */}
              <div className="grid grid-cols-12 gap-1 flex-1">
                {row1.map(num => {
                  const isRed = REDS.includes(num);
                  const betAmt = getCellBetAmount('NUMBER', num);
                  return (
                    <button 
                      key={num}
                      onClick={() => handlePlaceBet('NUMBER', num)}
                      disabled={isBettingLocked}
                      className={`h-11 rounded-lg border border-emerald-500/10 flex flex-col items-center justify-center font-black text-sm relative transition-all active:scale-95 disabled:opacity-30 ${
                        isRed 
                          ? 'bg-gradient-to-br from-red-600 to-red-800 hover:brightness-110 shadow-md shadow-red-950/20' 
                          : 'bg-gradient-to-br from-zinc-800 to-zinc-900 hover:brightness-110 shadow-md shadow-black/20'
                      }`}
                    >
                      <span className="drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.5)]">{num}</span>
                      
                      {betAmt > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                            ₹{betAmt}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Row 2 (Middle): 2, 5, 8... */}
              <div className="grid grid-cols-12 gap-1 flex-1">
                {row2.map(num => {
                  const isRed = REDS.includes(num);
                  const betAmt = getCellBetAmount('NUMBER', num);
                  return (
                    <button 
                      key={num}
                      onClick={() => handlePlaceBet('NUMBER', num)}
                      disabled={isBettingLocked}
                      className={`h-11 rounded-lg border border-emerald-500/10 flex flex-col items-center justify-center font-black text-sm relative transition-all active:scale-95 disabled:opacity-30 ${
                        isRed 
                          ? 'bg-gradient-to-br from-red-600 to-red-800 hover:brightness-110 shadow-md' 
                          : 'bg-gradient-to-br from-zinc-800 to-zinc-900 hover:brightness-110 shadow-md'
                      }`}
                    >
                      <span className="drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.5)]">{num}</span>
                      
                      {betAmt > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                            ₹{betAmt}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Row 3 (Bottom): 1, 4, 7... */}
              <div className="grid grid-cols-12 gap-1 flex-1">
                {row3.map(num => {
                  const isRed = REDS.includes(num);
                  const betAmt = getCellBetAmount('NUMBER', num);
                  return (
                    <button 
                      key={num}
                      onClick={() => handlePlaceBet('NUMBER', num)}
                      disabled={isBettingLocked}
                      className={`h-11 rounded-lg border border-emerald-500/10 flex flex-col items-center justify-center font-black text-sm relative transition-all active:scale-95 disabled:opacity-30 ${
                        isRed 
                          ? 'bg-gradient-to-br from-red-600 to-red-800 hover:brightness-110 shadow-md' 
                          : 'bg-gradient-to-br from-zinc-800 to-zinc-900 hover:brightness-110 shadow-md'
                      }`}
                    >
                      <span className="drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.5)]">{num}</span>
                      
                      {betAmt > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                            ₹{betAmt}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Column Bets 2 to 1 on the Right */}
            <div className="w-14 flex flex-col gap-1 justify-between">
              <button 
                onClick={() => handlePlaceBet('COLUMN', 3)}
                disabled={isBettingLocked}
                className="flex-1 rounded-r-2xl bg-black/40 hover:bg-black/60 border border-emerald-500/20 text-[9px] font-extrabold text-zinc-300 flex items-center justify-center relative transition-all active:scale-95 disabled:opacity-30"
              >
                2 to 1
                {getCellBetAmount('COLUMN', 3) > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                      ₹{getCellBetAmount('COLUMN', 3)}
                    </div>
                  </div>
                )}
              </button>
              <button 
                onClick={() => handlePlaceBet('COLUMN', 2)}
                disabled={isBettingLocked}
                className="flex-1 rounded-r-2xl bg-black/40 hover:bg-black/60 border border-emerald-500/20 text-[9px] font-extrabold text-zinc-300 flex items-center justify-center relative transition-all active:scale-95 disabled:opacity-30"
              >
                2 to 1
                {getCellBetAmount('COLUMN', 2) > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                      ₹{getCellBetAmount('COLUMN', 2)}
                    </div>
                  </div>
                )}
              </button>
              <button 
                onClick={() => handlePlaceBet('COLUMN', 1)}
                disabled={isBettingLocked}
                className="flex-1 rounded-r-2xl bg-black/40 hover:bg-black/60 border border-emerald-500/20 text-[9px] font-extrabold text-zinc-300 flex items-center justify-center relative transition-all active:scale-95 disabled:opacity-30"
              >
                2 to 1
                {getCellBetAmount('COLUMN', 1) > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                      ₹{getCellBetAmount('COLUMN', 1)}
                    </div>
                  </div>
                )}
              </button>
            </div>

          </div>

          {/* DOZEN OUTSIDE BLOCKS */}
          <div className="flex gap-1 items-stretch pl-14 pr-14">
            <button 
              onClick={() => handlePlaceBet('DOZEN', '1st 12')}
              disabled={isBettingLocked}
              className="flex-1 h-9 rounded-xl bg-[#0f3d1f] hover:bg-[#14532d] border border-emerald-500/25 font-black text-[10px] uppercase tracking-widest relative active:scale-95 disabled:opacity-30"
            >
              1st 12
              {getCellBetAmount('DOZEN', '1st 12') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                    ₹{getCellBetAmount('DOZEN', '1st 12')}
                  </div>
                </div>
              )}
            </button>
            <button 
              onClick={() => handlePlaceBet('DOZEN', '2nd 12')}
              disabled={isBettingLocked}
              className="flex-1 h-9 rounded-xl bg-[#0f3d1f] hover:bg-[#14532d] border border-emerald-500/25 font-black text-[10px] uppercase tracking-widest relative active:scale-95 disabled:opacity-30"
            >
              2nd 12
              {getCellBetAmount('DOZEN', '2nd 12') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                    ₹{getCellBetAmount('DOZEN', '2nd 12')}
                  </div>
                </div>
              )}
            </button>
            <button 
              onClick={() => handlePlaceBet('DOZEN', '3rd 12')}
              disabled={isBettingLocked}
              className="flex-1 h-9 rounded-xl bg-[#0f3d1f] hover:bg-[#14532d] border border-emerald-500/25 font-black text-[10px] uppercase tracking-widest relative active:scale-95 disabled:opacity-30"
            >
              3rd 12
              {getCellBetAmount('DOZEN', '3rd 12') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                    ₹{getCellBetAmount('DOZEN', '3rd 12')}
                  </div>
                </div>
              )}
            </button>
          </div>

          {/* LOWER BINARY HIGH/LOW, EVEN/ODD, RED/BLACK DIAMONDS */}
          <div className="flex gap-1 items-stretch pl-14 pr-14">
            <button 
              onClick={() => handlePlaceBet('RANGE', '1-18')}
              disabled={isBettingLocked}
              className="flex-1 h-9 rounded-xl bg-[#072413] hover:bg-[#0b3d20] border border-emerald-500/20 font-bold text-[9px] uppercase tracking-wider relative active:scale-95 disabled:opacity-30"
            >
              1 to 18
              {getCellBetAmount('RANGE', '1-18') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                    ₹{getCellBetAmount('RANGE', '1-18')}
                  </div>
                </div>
              )}
            </button>
            <button 
              onClick={() => handlePlaceBet('ODD_EVEN', 'EVEN')}
              disabled={isBettingLocked}
              className="flex-1 h-9 rounded-xl bg-[#072413] hover:bg-[#0b3d20] border border-emerald-500/20 font-bold text-[9px] uppercase tracking-wider relative active:scale-95 disabled:opacity-30"
            >
              EVEN
              {getCellBetAmount('ODD_EVEN', 'EVEN') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                    ₹{getCellBetAmount('ODD_EVEN', 'EVEN')}
                  </div>
                </div>
              )}
            </button>
            
            {/* Red Diamond segment */}
            <button 
              onClick={() => handlePlaceBet('COLOR', 'RED')}
              disabled={isBettingLocked}
              className="flex-1 h-9 rounded-xl bg-[#7f1d1d] hover:bg-[#991b1b] border border-red-500/30 flex items-center justify-center gap-1 font-bold text-[9px] uppercase tracking-wider relative active:scale-95 disabled:opacity-30 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]"
            >
              <span className="w-3.5 h-3.5 rotate-45 bg-gradient-to-br from-red-400 to-red-600 block shadow-inner rounded-sm" />
              {getCellBetAmount('COLOR', 'RED') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                    ₹{getCellBetAmount('COLOR', 'RED')}
                  </div>
                </div>
              )}
            </button>

            {/* Black Diamond segment */}
            <button 
              onClick={() => handlePlaceBet('COLOR', 'BLACK')}
              disabled={isBettingLocked}
              className="flex-1 h-9 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-700/30 flex items-center justify-center gap-1 font-bold text-[9px] uppercase tracking-wider relative active:scale-95 disabled:opacity-30 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]"
            >
              <span className="w-3.5 h-3.5 rotate-45 bg-gradient-to-br from-zinc-700 to-zinc-950 block shadow-inner rounded-sm" />
              {getCellBetAmount('COLOR', 'BLACK') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                    ₹{getCellBetAmount('COLOR', 'BLACK')}
                  </div>
                </div>
              )}
            </button>

            <button 
              onClick={() => handlePlaceBet('ODD_EVEN', 'ODD')}
              disabled={isBettingLocked}
              className="flex-1 h-9 rounded-xl bg-[#072413] hover:bg-[#0b3d20] border border-emerald-500/20 font-bold text-[9px] uppercase tracking-wider relative active:scale-95 disabled:opacity-30"
            >
              ODD
              {getCellBetAmount('ODD_EVEN', 'ODD') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                    ₹{getCellBetAmount('ODD_EVEN', 'ODD')}
                  </div>
                </div>
              )}
            </button>
            <button 
              onClick={() => handlePlaceBet('RANGE', '19-36')}
              disabled={isBettingLocked}
              className="flex-1 h-9 rounded-xl bg-[#072413] hover:bg-[#0b3d20] border border-emerald-500/20 font-bold text-[9px] uppercase tracking-wider relative active:scale-95 disabled:opacity-30"
            >
              19 to 36
              {getCellBetAmount('RANGE', '19-36') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center border-2 border-dashed border-white shadow-lg animate-bounce">
                    ₹{getCellBetAmount('RANGE', '19-36')}
                  </div>
                </div>
              )}
            </button>
          </div>

        </div>

        {/* BOTTOM HUD FOOTER SUMMARY */}
        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1 px-1">
          <span>GAME ID : OS4P7WPLBFNV</span>
          <span className="text-yellow-500/60 font-black animate-pulse">Place your chips</span>
        </div>

      </div>

      {/* COMPACT PAYTABLE MODAL */}
      {showPaytable && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
          <div className="bg-[#1f1008] border border-yellow-600/30 w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black gold-text italic uppercase tracking-tighter">CASINO RULES</h2>
              <button onClick={() => setShowPaytable(false)} className="p-2 bg-black/40 border border-yellow-600/20 rounded-full hover:bg-zinc-800 text-yellow-500 transition-colors">
                <X size={18}/>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2 text-[10px] text-zinc-400">
                <p>• Straight guess on a number (0-36) pays <strong className="text-yellow-400">36x</strong>.</p>
                <p>• Outside binary guesses (Red/Black, Even/Odd, Range) pay <strong className="text-yellow-400">2x</strong>.</p>
                <p>• Outside tier guesses (Dozen, Column) pay <strong className="text-yellow-400">3x</strong>.</p>
                <p>• Betting locks exactly <strong className="text-red-400">5 seconds</strong> before time expires.</p>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between p-2.5 bg-black/50 border border-white/5 rounded-xl">
                  <span className="text-zinc-400">Straight Bet</span>
                  <span className="font-extrabold text-yellow-500">36.00X</span>
                </div>
                <div className="flex justify-between p-2.5 bg-black/50 border border-white/5 rounded-xl">
                  <span className="text-zinc-400">Color / Binary</span>
                  <span className="font-extrabold text-red-500">2.00X</span>
                </div>
                <div className="flex justify-between p-2.5 bg-black/50 border border-white/5 rounded-xl">
                  <span className="text-zinc-400">Tiers & Dozens</span>
                  <span className="font-extrabold text-emerald-500">3.00X</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        @keyframes float-up {
          0% { transform: translate(-50%, 0); opacity: 0; scale: 0.5; }
          15% { opacity: 1; scale: 1.2; }
          85% { opacity: 1; scale: 1.2; }
          100% { transform: translate(-50%, -100px); opacity: 0; scale: 1.4; }
        }
        .animate-float-up { animation: float-up 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

    </div>
  );
};

export default Roulette;
