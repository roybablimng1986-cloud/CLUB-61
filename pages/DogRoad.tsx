
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Wallet, HelpCircle, X, ChevronUp, RotateCcw, TrendingUp, AlertTriangle } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds } from '../services/supabaseService';
import { GameResult } from '../types';

const MULTIPLIERS = [1.2, 1.5, 1.8, 2.4, 3.2, 4.5, 6.5, 9.5, 15.0, 25.0, 50.0, 100.0];

const DogRoad: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [currentLane, setCurrentLane] = useState(0); // 0 is start
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'LOST' | 'CASHED'>('IDLE');
  const [showHelp, setShowHelp] = useState(false);
  const [winAmt, setWinAmt] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [crashType, setCrashType] = useState<'CAR' | 'TRUCK' | 'NONE'>('NONE');

  const containerRef = useRef<HTMLDivElement>(null);

  const start = () => {
    if (userBalance < bet) {
        playSound('loss');
        return;
    }
    updateBalance(-bet, 'BET', 'Dog Road');
    playSound('bet_place');
    setGameState('PLAYING');
    setCurrentLane(0); 
    setWinAmt(0);
    setCrashType('NONE');
  };

  const jump = () => {
    if (gameState !== 'PLAYING' || isJumping || currentLane >= MULTIPLIERS.length) return;
    
    setIsJumping(true);
    playSound('tower_step');
    
    setTimeout(() => {
        // Classic logic: chance decreases as you go higher
        const successChance = 0.90 - (currentLane * 0.03);
        const isSuccess = Math.random() < successChance;

        if (isSuccess) {
            playSound('win');
            setCurrentLane(prev => prev + 1);
            setIsJumping(false);
            
            if (currentLane + 1 === MULTIPLIERS.length) {
                cashout();
            }
        } else {
            playSound('loss');
            setCrashType(Math.random() > 0.5 ? 'CAR' : 'TRUCK');
            setGameState('LOST');
            setIsJumping(false);
            onResult({ win: false, amount: bet, game: 'Dog Road' });
            addGameHistory('Dog Road', bet, 0, `Crash Lane ${currentLane + 1}`);
        }
    }, 300);
  };

  const cashout = () => {
    if (currentLane <= 0 || gameState !== 'PLAYING') return;
    const mult = MULTIPLIERS[currentLane - 1];
    const amount = bet * mult;
    updateBalance(amount, 'WIN', 'Dog Road Cashout');
    setWinAmt(amount);
    setGameState('CASHED');
    onResult({ 
        win: true, 
        amount: amount, 
        game: 'Dog Road', 
        resultDetails: [{ label: 'Score', value: `Lane ${currentLane}` }, { label: 'Mult', value: `${mult}x` }] 
    });
    addGameHistory('Dog Road', bet, amount, `Win ${mult}x`);
  };

  return (
    <div className="bg-[#05070a] min-h-screen text-white flex flex-col font-sans select-none overflow-hidden relative">
      <HowToPlay 
          isOpen={showHelp} 
          onClose={() => setShowHelp(false)} 
          title="Dog Road Master"
          rules={[
              "Choose your bet and start the run.",
              "Tap JUMP to move the dog to the next lane.",
              "Each lane increases your prize multiplier.",
              "CASH OUT at any time to keep your winnings.",
              "If the dog is hit by a car, you lose your bet!"
          ]}
          payouts={MULTIPLIERS.map((m, i) => ({ label: `Lane ${i+1}`, value: `${m}x` }))}
      />

      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-[#0a0f1d] border-b border-white/5 z-[60] shadow-xl">
        <div className="flex items-center gap-3">
            <button onClick={onBack} disabled={gameState === 'PLAYING'} className="p-2 bg-slate-800 rounded-xl active:scale-90 disabled:opacity-50 border border-white/5"><ArrowLeft size={20}/></button>
            <h1 className="text-xl font-black italic text-yellow-500 tracking-tighter uppercase drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">DOG ROAD</h1>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setShowHelp(true)} className="p-2 bg-slate-800 rounded-xl text-yellow-500 border border-white/5"><HelpCircle size={20}/></button>
            <div className="bg-slate-900 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                <Wallet size={14} className="text-yellow-500" />
                <span className="text-xs font-black font-mono">₹{userBalance.toFixed(2)}</span>
            </div>
        </div>
      </div>

      {/* Main Game Viewport - Vertical Orientation */}
      <div className="flex-1 relative bg-[#0f172a] overflow-hidden flex flex-col-reverse items-center justify-end">
          {/* Moving Road World */}
          <motion.div 
            ref={containerRef}
            animate={{ y: (currentLane * 100) }} // Scroll the road down as dog moves up
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="w-full relative flex flex-col-reverse items-center"
            style={{ minHeight: '1000%' }}
          >
              {/* Start Zone */}
              <div className="h-64 w-full bg-gradient-to-t from-emerald-900/20 to-transparent border-t-4 border-emerald-500/30 flex items-center justify-center">
                   <div className="italic text-xs font-black text-emerald-500/40 tracking-widest uppercase">Start Zone</div>
              </div>

              {/* Lanes */}
              {MULTIPLIERS.map((m, i) => (
                  <div key={i} className={`h-[100px] w-full border-t border-white/5 flex items-center justify-between px-8 relative ${currentLane === i + 1 ? 'bg-white/[0.02]' : ''}`}>
                      {/* Asphalt Texture */}
                      <div className="absolute inset-x-0 h-[2px] bg-white/5 top-1/2 -translate-y-1/2 opacity-20"></div>

                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Lane {i+1}</div>
                      
                      <div className="flex flex-col items-center">
                          <div className={`text-xl font-black italic ${currentLane >= i + 1 ? 'text-yellow-400' : 'text-slate-700'}`}>{m}x</div>
                      </div>

                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">₹{(bet * m).toFixed(0)}</div>

                      {/* Moving Traffic */}
                      <AnimatePresence>
                          {gameState === 'PLAYING' && (
                              <TrafficLane delay={i * 0.2} speed={3 + Math.random() * 2} direction={i % 2 === 0 ? 1 : -1} />
                          )}
                      </AnimatePresence>
                  </div>
              ))}

              {/* End Area */}
              <div className="h-96 w-full bg-gradient-to-b from-yellow-500/20 to-transparent border-b-4 border-yellow-500/30 flex items-center justify-center overflow-hidden">
                   <div className="text-4xl font-black italic gold-text tracking-tighter uppercase opacity-20 rotate-12">Finish Line</div>
              </div>
          </motion.div>

          {/* Dog Character (Always centered vertically in viewport) */}
          <div className="absolute left-1/2 bottom-[25%] -translate-x-1/2 z-50">
               <motion.div 
                 animate={{ 
                   y: isJumping ? -100 : 0,
                   scale: isJumping ? 1.3 : 1,
                   rotate: isJumping ? [-5, 5, -5, 0] : 0
                 }}
                 className="text-7xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
               >
                   {gameState === 'LOST' ? '💥' : isJumping ? '🐕' : '🐕'}
                   {/* We can use 🐕 for normal, and maybe a flash when jumping */}
               </motion.div>
          </div>

          {/* Crash Incident Overlay */}
          <AnimatePresence>
              {gameState === 'LOST' && (
                  <motion.div 
                    initial={{ y: -300, opacity: 0 }}
                    animate={{ y: -50, opacity: 1 }}
                    className="absolute left-1/2 -translate-x-1/2 z-50 text-8xl"
                  >
                      {crashType === 'CAR' ? '🚓' : '🚕'}
                  </motion.div>
              )}
          </AnimatePresence>
      </div>

      {/* Betting & Control Panel */}
      <div className="bg-[#0a0f1d] p-6 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/5 z-[70]">
          <AnimatePresence mode="wait">
              {gameState !== 'PLAYING' ? (
                  <motion.div key="pre" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Amount</span>
                          <span className="text-xs font-black text-yellow-500 italic">Target: {MULTIPLIERS[0]}x</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                          {[10, 50, 100, 500, 1000].map(amt => (
                              <button 
                                key={amt} 
                                onClick={() => setBet(amt)} 
                                className={`flex-shrink-0 px-6 py-3 rounded-2xl font-black text-xs border-2 transition-all ${bet === amt ? 'bg-yellow-500 border-white text-black scale-105 shadow-xl' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                              >
                                  ₹{amt}
                              </button>
                          ))}
                      </div>
                      <button 
                        onClick={start} 
                        className="w-full py-5 bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-black text-xl rounded-[2rem] shadow-2xl active:scale-95 transition-all uppercase tracking-widest border-b-4 border-orange-800"
                      >
                          PLAY NOW
                      </button>
                  </motion.div>
              ) : (
                  <motion.div key="act" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                      <div className="flex gap-4">
                          <button 
                            onClick={jump} 
                            disabled={isJumping}
                            className="flex-[2] py-6 bg-gradient-to-b from-blue-500 to-blue-700 text-white font-black text-3xl rounded-[2rem] shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 border-b-4 border-blue-900"
                          >
                              <ChevronUp size={36} strokeWidth={4} /> JUMP
                          </button>
                          
                          <button 
                            onClick={cashout} 
                            disabled={currentLane <= 1 || isJumping}
                            className={`flex-1 py-6 rounded-[2rem] font-black transition-all flex flex-col items-center justify-center shadow-xl active:scale-95 border-b-4 ${currentLane <= 1 ? 'bg-slate-800 text-slate-600 border-slate-900' : 'bg-gradient-to-b from-green-500 to-green-700 text-white border-green-900'}`}
                          >
                              <span className="text-[10px] tracking-widest leading-none mb-1">CASH OUT</span>
                              <span className="text-xl">₹{(bet * (currentLane > 0 ? MULTIPLIERS[currentLane - 1] : 0)).toFixed(0)}</span>
                          </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/40 px-6 py-3 rounded-2xl border border-white/5 text-center">
                              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Multiplier</div>
                              <div className="text-lg font-black text-yellow-500 italic">{currentLane > 0 ? MULTIPLIERS[currentLane-1] : 0}x</div>
                          </div>
                          <div className="bg-black/40 px-6 py-3 rounded-2xl border border-white/5 text-center">
                              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Target</div>
                              <div className="text-lg font-black text-white italic">{currentLane < MULTIPLIERS.length ? MULTIPLIERS[currentLane] : 'MAX'}x</div>
                          </div>
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>
      </div>

      {/* Win/Loss Screens */}
      {gameState === 'LOST' && (
          <div className="absolute inset-0 bg-red-950/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8 animate-in zoom-in duration-300">
                <div className="text-8xl mb-6">💥</div>
                <h2 className="text-6xl font-black text-white italic uppercase tracking-tighter mb-2 text-center leading-none">CRASH!</h2>
                <p className="text-red-400 font-bold uppercase text-[10px] tracking-widest mb-10">You were hit in Lane {currentLane + 1}</p>
                <button 
                    onClick={() => setGameState('IDLE')} 
                    className="w-full max-w-xs py-5 bg-white text-black font-black rounded-full uppercase tracking-widest active:scale-95 shadow-2xl flex items-center justify-center gap-2 border-b-4 border-slate-300"
                >
                    <RotateCcw size={20} /> TRY AGAIN
                </button>
          </div>
      )}

      {gameState === 'CASHED' && (
          <div className="absolute inset-0 bg-green-950/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8 animate-in zoom-in duration-300">
                <div className="w-32 h-32 rounded-full bg-yellow-500 flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.5)] mb-6">
                    <TrendingUp size={64} className="text-black" />
                </div>
                <h2 className="text-6xl font-black text-white italic uppercase tracking-tighter mb-2">WINNER!</h2>
                <div className="text-7xl font-black text-yellow-400 mb-10 italic">₹{winAmt.toFixed(0)}</div>
                <button 
                    onClick={() => setGameState('IDLE')} 
                    className="w-full max-w-xs py-5 bg-yellow-500 text-black font-black rounded-full uppercase tracking-widest active:scale-95 shadow-2xl border-b-4 border-yellow-700"
                >
                    COLLECT CASH
                </button>
          </div>
      )}

      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; } .no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
};

const TrafficLane: React.FC<{ speed: number; direction: 1 | -1; delay: number }> = ({ speed, direction, delay }) => {
    return (
        <motion.div 
            initial={{ x: direction === 1 ? -400 : 400 }}
            animate={{ x: direction === 1 ? 400 : -400 }}
            transition={{ duration: speed, repeat: Infinity, ease: 'linear', delay: delay }}
            className="absolute text-5xl opacity-40 grayscale pointer-events-none"
        >
            {direction === 1 ? '🚓' : '🚕'}
        </motion.div>
    );
};

const HowToPlay: React.FC<{ isOpen: boolean; onClose: () => void; title: string; rules: string[]; payouts: { label: string; value: string }[] }> = ({ isOpen, onClose, title, rules, payouts }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/95 backdrop-blur-md">
            <motion.div initial={{ y: 200 }} animate={{ y: 0 }} className="w-full max-w-md bg-[#0a0f1d] rounded-t-[3rem] p-8 border-t border-white/10 shadow-2xl overflow-y-auto max-h-[85vh]">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-black italic text-yellow-500 uppercase leading-none">{title}</h2>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-2xl text-slate-400 active:scale-90"><X size={24}/></button>
                </div>
                <div className="space-y-5 mb-8">
                    {rules.map((r, i) => (
                        <div key={i} className="flex gap-4">
                            <div className="w-6 h-6 rounded-full bg-yellow-500 text-black flex items-center justify-center text-xs font-black shrink-0">{i+1}</div>
                            <p className="text-sm text-slate-300 font-medium italic">{r}</p>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-3 pb-10">
                    {payouts.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{p.label}</span>
                            <span className="text-sm font-black text-yellow-500 italic">{p.value}</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default DogRoad;
