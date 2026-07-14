
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Minus, Info, HelpCircle, Check, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, addGameHistory, stopAllSounds, subscribeToSevenUpDown, subscribeToSevenUpDownBets, getClockOffset, addGameBet, shouldForceLoss, getMuteStatus, toggleMute } from '../services/supabaseService';
import { GameResult } from '../types';
import { db, auth } from '../services/supabaseService';
import { doc, onSnapshot, setDoc, getDoc, collection, query, where, limit, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';

// Custom standalone AudioContext Synth class for lag-free professional 7 Up Down audio
class SevenUpDownSfx {
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
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.12);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playTick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.03, now);
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
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playDiceRattle() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    
    // Play a sequence of short low thuds to simulate rattle
    const now = this.ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      const delay = i * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180 + Math.random() * 80, now + delay);
      gain.gain.setValueAtTime(0.04, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.08);
    }
  }

  playDiceRoll() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Hard dice bounce thuds
    [0, 0.1].forEach((delay) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now + delay);
      osc.frequency.exponentialRampToValueAtTime(50, now + delay + 0.12);
      gain.gain.setValueAtTime(0.08, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.12);
    });
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

const CYCLE_DURATION = 40000; // 40s total
const BETTING_TIME = 25000;   // 25s to bet
const LOCKOUT_TIME = 5000;    // 5s lockout
const ROLLING_TIME = 5000;    // 5s rolling animation
const RESULT_TIME = 5000;     // 5s result display

import SevenUpDownResultPopup from '../components/SevenUpDownResultPopup';
import { useStabilizedTimer } from '../hooks/useTimer';
import HowToPlay from '../components/HowToPlay';

const SevenUpDown: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [muted, setMuted] = useState(getMuteStatus());
  const sfx = useRef(new SevenUpDownSfx());

  const handleToggleMute = () => {
    const newMute = toggleMute();
    setMuted(newMute);
    sfx.current.setMuted(newMute);
  };

  const [gameState, setGameState] = useState<any>({
    status: 'BETTING',
    period: new Date().getTime().toString().slice(-6),
    endTime: Date.now() + 12000,
    dice: [1, 1],
    history: [2, 7, 5, 12, 10]
  });
  const [betAmount, setBetAmount] = useState(100);
  const [selectedTarget, setSelectedTarget] = useState<'DOWN' | 'SEVEN' | 'UP' | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [dice, setDice] = useState([1, 1]);
  const [history, setHistory] = useState<number[]>([]);
  const [suResult, setSuResult] = useState<any | null>(null);
  
  const timeLeft = useStabilizedTimer(gameState.endTime);
  const [isLocked, setIsLocked] = useState(false);
  
  const [lockSoundPlayed, setLockSoundPlayed] = useState(false);
  const [fakeBets, setFakeBets] = useState<any[]>([]);

  const FAKE_NAMES = [
    'Rahul S.', 'Aman K.', 'Priya M.', 'Vikram R.', 'Rajesh G.', 
    'Sunil D.', 'Ankit P.', 'Rohan J.', 'Sanjay T.', 'Karan W.', 
    'Deepak L.', 'Vijay B.', 'Abhishek N.', 'Ravi C.', 'Amit H.',
    'Nisha V.', 'Preeti Y.', 'Siddharth F.', 'Arjun Z.', 'Varun Q.'
  ];

  useEffect(() => {
    setIsLocked(gameState.status !== 'BETTING' || timeLeft <= 5);
    
    // Play precise local real-time tick sound
    if (gameState.status === 'BETTING' && timeLeft <= 5 && timeLeft > 0 && timeLeft !== lastTickRef.current) {
      sfx.current.playTick();
      lastTickRef.current = timeLeft;
    }

    // Play lock sound once when round locks
    if (gameState.status === 'BETTING' && timeLeft === 5 && !lockSoundPlayed) {
      sfx.current.playLock(); // Heavy slam sound
      setLockSoundPlayed(true);
    }
  }, [timeLeft, gameState.status, lockSoundPlayed]);

  // Fake bets simulation during betting window
  useEffect(() => {
    if (gameState.status !== 'BETTING' || timeLeft <= 5) {
      return;
    }

    if (timeLeft > 20) {
      setFakeBets([]);
    }

    const interval = setInterval(() => {
      if (Math.random() > 0.45) return; // 45% chance every interval to spawn a fake bet

      const randomName = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)] + ' ' + Math.floor(100 + Math.random() * 900);
      const randomTarget = ['DOWN', 'SEVEN', 'UP'][Math.floor(Math.random() * 3)];
      const possibleAmounts = [10, 10, 10, 50, 100, 100, 500, 1000]; // high chance of ₹10 as requested
      const randomAmount = possibleAmounts[Math.floor(Math.random() * possibleAmounts.length)];

      const newFakeBet = {
        id: `fake_${Date.now()}_${Math.random()}`,
        username: randomName,
        target: randomTarget,
        amount: randomAmount,
        uid: 'fake-user'
      };

      setFakeBets(prev => [newFakeBet, ...prev].slice(0, 30));
    }, 1200);

    return () => clearInterval(interval);
  }, [gameState.status, timeLeft, gameState.period]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
  const [allBets, setAllBets] = useState<any[]>([]);
  const [myBets, setMyBets] = useState<any[]>([]);
  const myBetsRef = useRef<any[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string>(gameState.period);
  const currentRoundRef = useRef<string>('');
  const [localUserBets, setLocalUserBets] = useState<any[]>([]);
  const localUserBetsRef = useRef<any[]>([]);
  const updateLocalUserBets = (newBets: any[]) => {
      setLocalUserBets(newBets);
      localUserBetsRef.current = newBets;
  };
  const [phase, setPhase] = useState<'BETTING' | 'RESULT' | 'ROLLING'>('BETTING');
  const [showHelp, setShowHelp] = useState(false);
  const [isBetting, setIsBetting] = useState(false);
  
  const isMounted = useRef(true);
  const lastEvaluatedPeriod = useRef<string>('');
  const lastTickRef = useRef<number>(-1);

  useEffect(() => {
    isMounted.current = true;
    
    const unsubscribe = subscribeToSevenUpDown((state) => {
      if (!isMounted.current) return;

      if (state.status === 'BETTING' && currentRoundRef.current !== state.period) {
        currentRoundRef.current = state.period;
        setCurrentRoundId(state.period);
        updateLocalUserBets([]);
        setMyBets([]);
        myBetsRef.current = [];
        setAllBets([]);
        setSuResult(null);
        setLockSoundPlayed(false); // Reset lock sound
      }

      setGameState(state);
      setHistory(state.history.map((h: any) => h.sum));

      const list = state.betsList || [];
      const listWithoutUser = list.filter((b: any) => b.uid !== auth.currentUser?.uid);

      setAllBets([...localUserBetsRef.current, ...listWithoutUser]);
      setMyBets(localUserBetsRef.current);
      myBetsRef.current = localUserBetsRef.current;

      setIsLocked(state.status !== 'BETTING' || state.timeLeft <= 5);
      setPhase(state.status === 'BETTING' ? 'BETTING' : 'RESULT');

      // Check if there is a new result to animate and evaluate
      if (state.status === 'REVEALING' && state.lastResult && state.period !== lastEvaluatedPeriod.current) {
        lastEvaluatedPeriod.current = state.period;
        handleRollSequence(state.lastResult, state.period);
      }
    });

    return () => {
      isMounted.current = false;
      unsubscribe();
      stopAllSounds();
    };
  }, []);

  async function handleRollSequence(result: any, roundPeriod: string) {
    setIsRolling(true);
    sfx.current.playDiceRattle();

    const finalD1 = result.dice[0];
    const finalD2 = result.dice[1];
    const sum = result.sum;
    const outcome = result.outcome;

    // Dice randomization animation
    let rollCount = 0;
    const rollInterval = setInterval(() => {
      if (isMounted.current) {
        setDice([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
      }
      rollCount++;
      if (rollCount >= 10) {
        clearInterval(rollInterval);
        if (isMounted.current) {
          setDice([finalD1, finalD2]);
        }
      }
    }, 100);

    await new Promise(r => setTimeout(r, 1200));
    if (!isMounted.current) return;

    setDice([finalD1, finalD2]);
    setIsRolling(false);
    setPhase('RESULT');
    sfx.current.playDiceRoll();

    processResult(sum, outcome, [finalD1, finalD2], roundPeriod);
  }

  function processResult(sum: number, outcome: string, finalDice: number[], roundPeriod: string) {
    let totalWin = 0;
    let totalBet = 0;
    
    const activeBets = myBetsRef.current;
    
    activeBets.forEach(bet => {
        totalBet += bet.amount;
        if (bet.target === outcome) {
            const mult = outcome === 'SEVEN' ? 5 : 1.95; // Pay 5x on SEVEN, 1.95x on Small/Big as per rules
            totalWin += bet.amount * mult;
        }
    });

    if (totalWin > 0) {
        updateBalance(totalWin, 'WIN', '7 Up Down Win');
        sfx.current.playWin();
    } else if (totalBet > 0) {
        sfx.current.playLoss();
    }

    if (totalBet > 0) {
        setSuResult({
            win: totalWin > 0,
            amount: totalWin,
            period: roundPeriod,
            dice: finalDice,
            sum: sum,
            target: activeBets.map(b => b.target).join(', ')
        });
        addGameHistory('7 Up Down', totalBet, totalWin, `Landed ${sum} | Period: ${roundPeriod}`);
    }
  }

    const handleConfirmBet = async () => {
        if (!selectedTarget || isLocked || betAmount > userBalance || phase !== 'BETTING' || isBetting) return;
        
        setIsBetting(true);
        try {
            const betData = {
                amount: betAmount,
                target: selectedTarget,
                period: gameState.period,
                uid: auth.currentUser?.uid,
                username: 'You',
                id: Date.now()
            };
            const updated = [...localUserBetsRef.current, betData];
            updateLocalUserBets(updated);
            
            // Immediately update the display states as well for instant responsiveness
            setMyBets(updated);
            myBetsRef.current = updated;
            
            const listWithoutUser = allBets.filter((b: any) => b.uid !== auth.currentUser?.uid);
            setAllBets([...updated, ...listWithoutUser]);
            
            await addGameBet('seven_up_down_bets', {
                target: selectedTarget,
                amount: betAmount,
                period: gameState.period
            });

            await updateBalance(-betAmount, 'BET', `7 Up Down: ${selectedTarget}`);
            sfx.current.playBet();
        } catch (e) {
            console.error(e);
        } finally {
            setIsBetting(false);
        }
    };

    const handleCancelLastBet = async () => {
        if (localUserBetsRef.current.length === 0 || isLocked || phase !== 'BETTING') return;
        const lastBet = localUserBetsRef.current[localUserBetsRef.current.length - 1];
        const updated = localUserBetsRef.current.slice(0, -1);
        updateLocalUserBets(updated);
        
        setMyBets(updated);
        myBetsRef.current = updated;
        
        const listWithoutUser = allBets.filter((b: any) => b.id !== lastBet.id);
        setAllBets([...updated, ...listWithoutUser]);

        await updateBalance(lastBet.amount, 'WIN', 'Bet Cancelled');
        sfx.current.playClick();
    };

    const adjustBet = (amt: number) => {
    if (isLocked) return;
    setBetAmount(prev => Math.max(10, prev + amt));
    sfx.current.playClick();
  };

  const handleManualBetChange = (val: string) => {
    if (isLocked) return;
    const num = parseInt(val.replace(/[^0-9]/g, '')) || 0;
    setBetAmount(num);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-white select-none relative overflow-x-hidden pb-10" 
         style={{ 
            backgroundColor: '#4a0404',
            backgroundImage: `radial-gradient(circle at center, #800000 0%, #4a0404 100%), url("https://www.transparenttextures.com/patterns/damask.png")`,
            backgroundBlendMode: 'overlay'
         }}>
        <SevenUpDownResultPopup result={suResult} onClose={() => setSuResult(null)} />
        <HowToPlay 
            isOpen={showHelp} 
            onClose={() => setShowHelp(false)} 
            title="7 Up Down Rules"
            rules={[
                "Two dice are rolled. Predict if the sum will be UNDER 7 (2-6), EQUAL to 7, or OVER 7 (8-12).",
                "Winner payout: Under 7 pays 2x, Over 7 pays 2x, 7 pays 9x.",
                "Place your bets while the dice are sitting idle."
            ]}
            payouts={[
                { label: "Under 7 (2-6)", value: "2x" },
                { label: "Over 7 (8-12)", value: "2x" },
                { label: "Exactly 7", value: "9x" }
            ]}
        />
        
        {/* Header */}
        <div className="p-4 flex justify-between items-center relative z-10 shrink-0">
            <button onClick={onBack} className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center border border-white/10 active:scale-90 shadow-lg">
                <ArrowLeft size={20} />
            </button>
            <div className="flex gap-4">
                <button onClick={handleToggleMute} className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center border border-white/10 active:scale-90 shadow-lg">
                    {muted ? <VolumeX size={18} className="text-red-500" /> : <Volume2 size={18} className="text-yellow-500" />}
                </button>
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
                    <img src="https://cdn-icons-png.flaticon.com/512/2489/2489756.png" className="w-4 h-4" alt="coins" referrerPolicy="no-referrer" />
                    <span className="text-xs font-black">{userBalance.toLocaleString()}</span>
                </div>
            </div>
        </div>

        {/* Game Content */}
        <div className="w-full flex-1 flex flex-col items-center justify-start p-4 pt-0 relative z-10">
            
            {/* History (Scrollable) */}
            <div className="w-full mb-5 shrink-0 overflow-x-auto no-scrollbar">
                <div className="flex gap-3 justify-start px-2 min-w-max flex-row-reverse">
                    {history.map((h, i) => {
                        const isTie = h === 7;
                        const isBig = h > 7;
                        const label = isTie ? 'SEV' : isBig ? 'UP' : 'DWN';
                        const colorClass = isTie 
                            ? 'from-yellow-500 to-amber-600 border-yellow-400 text-white shadow-[0_4px_10px_rgba(234,179,8,0.3)]' 
                            : isBig 
                                ? 'from-red-500 to-rose-600 border-red-400 text-white shadow-[0_4px_10px_rgba(239,68,68,0.3)]' 
                                : 'from-blue-500 to-cyan-600 border-blue-400 text-white shadow-[0_4px_10px_rgba(59,130,246,0.3)]';
                        return (
                            <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                                <span className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-black border-2 bg-gradient-to-b shadow-lg transition-all ${colorClass}`}>
                                    {h}
                                </span>
                                <span className={`text-[8px] font-black uppercase tracking-wider ${isTie ? 'text-yellow-400/80' : isBig ? 'text-red-400/80' : 'text-blue-400/80'}`}>{label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Timer Display */}
            <div className="mb-4 flex flex-col items-center shrink-0">
                <div className={`text-4xl font-black italic tracking-tighter ${(phase === 'BETTING' && isLocked) ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
                    00:{(timeLeft || 0).toString().padStart(2, '0')}
                </div>
                <div className={`text-[10px] uppercase font-black tracking-[0.2em] ${phase === 'BETTING' && isLocked ? 'text-red-500 animate-pulse' : 'text-white/40'}`}>
                    {phase === 'BETTING' ? (isLocked ? 'BETS LOCKED' : 'Betting Open') : 'Waiting for Result'}
                </div>
            </div>

            {/* Dice Table */}
            <div className="relative w-44 h-44 md:w-52 md:h-52 rounded-full bg-[#800000] border-[8px] border-[#4a2c2c] shadow-[inset_0_0_40px_rgba(0,0,0,0.8),0_15px_30px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden mb-6 shrink-0 group">
                <div className="absolute inset-0 opacity-10 bg-black/40" />
                <div className="flex gap-4 relative z-10">
                    <motion.div 
                        animate={isRolling ? { 
                            rotate: [0, 90, 180, 270, 360], 
                            x: [0, 15, -15, 10, 0],
                            y: [0, -10, 10, -5, 0],
                        } : {}}
                        transition={isRolling ? { repeat: Infinity, duration: 0.3 } : {}}
                    >
                        <DiceIcon value={dice[0]} size={45} />
                    </motion.div>
                    <motion.div 
                        animate={isRolling ? { 
                            rotate: [0, -90, -180, -270, -360], 
                            x: [0, -15, 15, -10, 0],
                            y: [0, 10, -10, 5, 0],
                        } : {}}
                        transition={isRolling ? { repeat: Infinity, duration: 0.3 } : {}}
                    >
                        <DiceIcon value={dice[1]} size={45} />
                    </motion.div>
                </div>
            </div>

            {/* Betting Targets */}
            <div className="grid grid-cols-3 gap-2.5 w-full max-w-sm mb-4 transition-all shrink-0">
                {/* DOWN */}
                <div className="relative">
                    <button 
                        onClick={() => setSelectedTarget('DOWN')}
                        disabled={isLocked && phase !== 'RESULT'}
                        className={`w-full flex flex-col items-center justify-center py-5 rounded-2xl border-b-4 transition-all ${
                            selectedTarget === 'DOWN' ? 'bg-blue-600 border-blue-800 scale-105 shadow-xl text-white' : 'bg-black/40 border-black/60 text-white/60 hover:bg-black/60'
                        } ${
                            isLocked && phase !== 'RESULT' ? 'opacity-40 grayscale pointer-events-none' : ''
                        } ${
                            phase === 'RESULT' && gameState.lastResult?.outcome === 'DOWN' ? 'ring-4 ring-yellow-400 border-yellow-500 scale-110 shadow-[0_0_25px_rgba(250,204,21,0.9)] z-20 bg-blue-500 text-white font-black' : ''
                        }`}
                    >
                        <span className="text-[10px] font-black uppercase mb-1">Down</span>
                        <span className="text-xl font-black italic">2 - 6</span>
                        <span className="text-[10px] font-bold opacity-60">Payout 2x</span>
                    </button>

                    {/* Active Bet Chip/Tile for user on DOWN */}
                    {myBets.filter(b => b.target === 'DOWN').length > 0 && (
                        <motion.div 
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="absolute -bottom-1.5 -left-1.5 w-10 h-10 rounded-full bg-gradient-to-tr from-blue-700 via-blue-500 to-blue-400 border-2 border-dashed border-white flex items-center justify-center text-white font-black text-[9px] shadow-[0_4px_10px_rgba(0,0,0,0.6)] z-20 animate-bounce"
                            style={{ backgroundImage: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.15) 41%)' }}
                        >
                            <div className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center font-black">
                                ₹{myBets.filter(b => b.target === 'DOWN').reduce((acc, curr) => acc + curr.amount, 0)}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* LUCKY 7 */}
                <div className="relative">
                    <button 
                        onClick={() => setSelectedTarget('SEVEN')}
                        disabled={isLocked && phase !== 'RESULT'}
                        className={`w-full flex flex-col items-center justify-center py-5 rounded-2xl border-b-4 transition-all ${
                            selectedTarget === 'SEVEN' ? 'bg-yellow-600 border-yellow-800 scale-105 shadow-xl text-white' : 'bg-black/40 border-black/60 text-white/60 hover:bg-black/60'
                        } ${
                            isLocked && phase !== 'RESULT' ? 'opacity-40 grayscale pointer-events-none' : ''
                        } ${
                            phase === 'RESULT' && gameState.lastResult?.outcome === 'SEVEN' ? 'ring-4 ring-yellow-400 border-yellow-500 scale-110 shadow-[0_0_25px_rgba(250,204,21,0.9)] z-20 bg-yellow-500 text-black font-black' : ''
                        }`}
                    >
                        <span className="text-[10px] font-black uppercase mb-1">Lucky</span>
                        <span className="text-xl font-black italic">7</span>
                        <span className="text-[10px] font-bold opacity-60">Payout 9x</span>
                    </button>

                    {/* Active Bet Chip/Tile for user on SEVEN */}
                    {myBets.filter(b => b.target === 'SEVEN').length > 0 && (
                        <motion.div 
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="absolute -bottom-1.5 -left-1.5 w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-600 via-amber-500 to-yellow-400 border-2 border-dashed border-white flex items-center justify-center text-black font-black text-[9px] shadow-[0_4px_10px_rgba(0,0,0,0.6)] z-20 animate-bounce"
                            style={{ backgroundImage: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.15) 41%)' }}
                        >
                            <div className="w-7 h-7 rounded-full border border-black/10 flex items-center justify-center font-black">
                                ₹{myBets.filter(b => b.target === 'SEVEN').reduce((acc, curr) => acc + curr.amount, 0)}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* UP */}
                <div className="relative">
                    <button 
                        onClick={() => setSelectedTarget('UP')}
                        disabled={isLocked && phase !== 'RESULT'}
                        className={`w-full flex flex-col items-center justify-center py-5 rounded-2xl border-b-4 transition-all ${
                            selectedTarget === 'UP' ? 'bg-red-600 border-red-800 scale-105 shadow-xl text-white' : 'bg-black/40 border-black/60 text-white/60 hover:bg-black/60'
                        } ${
                            isLocked && phase !== 'RESULT' ? 'opacity-40 grayscale pointer-events-none' : ''
                        } ${
                            phase === 'RESULT' && gameState.lastResult?.outcome === 'UP' ? 'ring-4 ring-yellow-400 border-yellow-500 scale-110 shadow-[0_0_25px_rgba(250,204,21,0.9)] z-20 bg-red-500 text-white font-black' : ''
                        }`}
                    >
                        <span className="text-[10px] font-black uppercase mb-1">Up</span>
                        <span className="text-xl font-black italic">8 - 12</span>
                        <span className="text-[10px] font-bold opacity-60">Payout 2x</span>
                    </button>

                    {/* Active Bet Chip/Tile for user on UP */}
                    {myBets.filter(b => b.target === 'UP').length > 0 && (
                        <motion.div 
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="absolute -bottom-1.5 -left-1.5 w-10 h-10 rounded-full bg-gradient-to-tr from-red-700 via-rose-500 to-red-400 border-2 border-dashed border-white flex items-center justify-center text-white font-black text-[9px] shadow-[0_4px_10px_rgba(0,0,0,0.6)] z-20 animate-bounce"
                            style={{ backgroundImage: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.15) 41%)' }}
                        >
                            <div className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center font-black">
                                ₹{myBets.filter(b => b.target === 'UP').reduce((acc, curr) => acc + curr.amount, 0)}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Bet Controls and Button Area */}
            <div className="bg-[#1a0101] w-full p-4 border-t border-white/10 mt-auto shrink-0 space-y-4">
                <div className={`w-full max-w-sm mx-auto space-y-4 ${isLocked ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 py-1">
                        {[10, 50, 100, 500, 1000, 5000].map(amt => (
                            <button 
                                key={amt}
                                onClick={() => { setBetAmount(amt); sfx.current.playClick(); }}
                                className={`flex-shrink-0 w-11 h-11 rounded-full border-2 font-black text-[10px] transition-all flex items-center justify-center shadow-lg active:scale-90 ${betAmount === amt ? 'bg-yellow-500 text-black border-white' : 'bg-black/60 text-yellow-500 border-yellow-500/20'}`}
                            >
                                {amt >= 1000 ? (amt/1000)+'K' : amt}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <button 
                            onClick={handleConfirmBet}
                            disabled={!selectedTarget || isBetting}
                            className={`flex-1 py-5 rounded-2xl font-black text-xl uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale ${selectedTarget ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black' : 'bg-white/10 text-white/40'}`}
                        >
                            {isBetting ? '...' : `BET ₹${betAmount}`}
                        </button>
                        {myBets.length > 0 && !isLocked && phase === 'BETTING' && (
                            <button 
                                onClick={handleCancelLastBet}
                                className="px-6 bg-red-600/20 border border-red-500/30 rounded-2xl text-[10px] font-black uppercase text-red-500 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={16} /> RETURN
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Bets List */}
            <div className="w-full max-w-md bg-black/40 rounded-2xl border border-white/5 flex flex-col mt-6 overflow-hidden">
                <div className="flex border-b border-white/5 shrink-0 bg-black/20">
                    <button 
                        onClick={() => setActiveTab('ALL')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ALL' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-white/5' : 'text-white/40'}`}
                    >
                        Live Bets ({myBets.length + fakeBets.length + allBets.filter(b => b.uid !== auth.currentUser?.uid).length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('MY')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MY' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-white/5' : 'text-white/40'}`}
                    >
                        My Round Activity ({myBets.length})
                    </button>
                </div>
                
                <div className="h-64 overflow-y-scroll p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-yellow-500/50 scrollbar-track-transparent pr-1 touch-pan-y">
                    {(activeTab === 'ALL' ? [...myBets, ...fakeBets, ...allBets.filter(b => b.uid !== auth.currentUser?.uid)] : myBets).map((b, idx) => (
                        <motion.div 
                            key={b.id || `bet-${idx}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                                    {b.uid === auth.currentUser?.uid ? 'YOU' : (b.username?.charAt(0) || 'U')}
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-white/90">{b.uid === auth.currentUser?.uid ? 'You' : b.username}</div>
                                    <div className={`text-[8px] font-bold ${b.target === 'DOWN' ? 'text-blue-400' : b.target === 'UP' ? 'text-red-400' : 'text-yellow-400'}`}>
                                        Target: {b.target}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <img src="https://cdn-icons-png.flaticon.com/512/2489/2489756.png" className="w-3 h-3" alt="coins" referrerPolicy="no-referrer" />
                                <span className="text-[12px] font-black text-yellow-500">₹{b.amount.toLocaleString()}</span>
                            </div>
                        </motion.div>
                    ))}
                    {(activeTab === 'MY' && myBets.length === 0) && (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                            <Plus size={32} />
                            <p className="text-[10px] uppercase font-black tracking-widest mt-2">No Bets Placed</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Result Overlay */}
        <AnimatePresence>
            {suResult && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none"
                >
                    {/* Falling Coins Animation */}
                    {suResult.win && <FallingCoins />}

                    <motion.div
                        initial={{ scale: 0.5, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        className="flex flex-col items-center"
                    >
                        <h2 className={`text-5xl md:text-7xl font-black italic tracking-tighter mb-4 ${suResult.win ? 'text-yellow-400' : 'text-zinc-400'} drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]`}>
                            {suResult.win ? 'YOU WIN!' : 'YOU LOST!'}
                        </h2>
                        
                        {suResult.win && (
                            <div className="flex items-center gap-3 bg-black/60 px-8 py-3 rounded-full border border-yellow-500/30 mb-8 shadow-2xl">
                                <img src="https://cdn-icons-png.flaticon.com/512/2489/2489756.png" className="w-8 h-8" alt="coin" referrerPolicy="no-referrer" />
                                <span className="text-3xl font-black text-white">{suResult.amount.toLocaleString()}</span>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

const BetOption = ({ label, targetStr, mult, active, onClick, bets }: any) => {
    const total = bets.reduce((acc: number, b: any) => acc + b.amount, 0);
    return (
        <button 
            onClick={onClick} 
            className={`relative flex flex-col items-center justify-center py-3 rounded-2xl border-b-8 transition-all h-32 overflow-hidden active:scale-95 ${
                active 
                ? 'bg-yellow-500 border-yellow-400 scale-105 z-10 text-black' 
                : 'bg-[#2a0202]/80 border-[#1a0101] text-white'
            }`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${active ? 'text-black/60' : 'text-white/40'}`}>{targetStr}</span>
            <span className={`text-2xl font-black italic tracking-tighter mb-1`}>{label}</span>
            <div className={`text-[10px] font-black px-3 py-1 rounded-full ${active ? 'bg-black/90 text-yellow-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                {mult}
            </div>
            {total > 0 && (
                <div className="absolute top-2 right-2 bg-white text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.4)] animate-in zoom-in">
                    ₹{total}
                </div>
            )}
        </button>
    );
};

const DiceIcon = ({ value, size }: { value: number; size: number }) => {
    const dots = {
        1: [[50, 50]],
        2: [[25, 25], [75, 75]],
        3: [[25, 25], [50, 50], [75, 75]],
        4: [[25, 25], [25, 75], [75, 25], [75, 75]],
        5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
        6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]]
    };

    return (
        <div 
            className="bg-white rounded-lg shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.2),2px_2px_4px_rgba(0,0,0,0.3)] relative"
            style={{ width: size, height: size }}
        >
            {(dots[value as keyof typeof dots] || []).map(([x, y], idx) => (
                <div 
                    key={`${value}-dot-${idx}`} 
                    className="absolute bg-zinc-900 rounded-full shadow-inner"
                    style={{ 
                        width: size * 0.18, 
                        height: size * 0.18, 
                        left: `${x}%`, 
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                />
            ))}
        </div>
    );
};

const FallingCoins = () => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
                <motion.img
                    key={i}
                    src="https://cdn-icons-png.flaticon.com/512/2489/2489756.png"
                    className="absolute w-8 h-8"
                    initial={{ 
                        top: -50, 
                        left: `${Math.random() * 100}%`,
                        rotate: 0,
                        opacity: 1
                    }}
                    animate={{ 
                        top: '120%', 
                        rotate: 360 * 2,
                        left: `${(Math.random() * 20 - 10) + (i * 5)}%`
                    }}
                    transition={{ 
                        duration: 2 + Math.random() * 2, 
                        repeat: Infinity,
                        delay: Math.random() * 2
                    }}
                    referrerPolicy="no-referrer"
                />
            ))}
        </div>
    );
};

export default SevenUpDown;
