import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Swords, Sparkles } from 'lucide-react';
import { getMuteStatus } from '../services/supabaseService';

interface DragonTigerResultPopupProps {
  result: {
    win: boolean;
    amount: number;
    period: string;
    winner: string;
    dragonCards: any[];
    tigerCards: any[];
    target: string;
  } | null;
  onClose: () => void;
}

// Custom Synth Sound Player for high-fidelity casino popup feedback
class PopupSfx {
  private static ctx: AudioContext | null = null;

  private static init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  static playWin() {
    if (getMuteStatus()) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Upward bright casino chord
    const notes = [329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.06 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.35);
    });
  }

  static playLoss() {
    if (getMuteStatus()) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Sad sliding metallic sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.5);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.5);

    osc.start(now);
    osc.stop(now + 0.5);
  }
}

const DragonTigerResultPopup: React.FC<DragonTigerResultPopupProps> = ({ result, onClose }) => {
  React.useEffect(() => {
    if (result) {
      if (result.win) {
        PopupSfx.playWin();
      } else {
        PopupSfx.playLoss();
      }

      // Auto dismiss after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [result, onClose]);

  if (!result) return null;

  const getCardRank = (val: number) => {
    if (val === 1) return 'A';
    if (val === 11) return 'J';
    if (val === 12) return 'Q';
    if (val === 13) return 'K';
    return val.toString();
  };

  // Generate 12 beautiful particles for floating background effects
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100 - 50,
    y: Math.random() * 100 - 50,
    size: Math.random() * 6 + 4,
    delay: Math.random() * 0.5,
    duration: Math.random() * 1.5 + 1.5,
  }));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        {/* Particle Overlay */}
        {result.win && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0, x: 0, y: 150 }}
                animate={{
                  opacity: [0, 0.9, 0],
                  scale: [0.5, 1.2, 0.5],
                  x: p.x * 3,
                  y: -150 + p.y,
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                className="absolute left-1/2 top-1/2 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-300 shadow-[0_0_10px_#f59e0b]"
                style={{ width: p.size, height: p.size }}
              />
            ))}
          </div>
        )}

        <motion.div 
          initial={{ scale: 0.85, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, y: -40, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 220 }}
          className={`w-[340px] rounded-[2.5rem] overflow-hidden border-2 shadow-[0_0_50px_rgba(0,0,0,0.9)] relative ${
            result.win 
              ? 'bg-gradient-to-b from-[#0e2d1d] via-[#091f13] to-[#040c08] border-emerald-500/60 shadow-emerald-500/20' 
              : 'bg-gradient-to-b from-[#311111] via-[#1d0a0a] to-[#0d0404] border-red-500/60 shadow-red-500/20'
          }`}
        >
          {/* Holographic Glowing Radiance */}
          <div className={`absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full filter blur-[60px] opacity-40 pointer-events-none ${
            result.win ? 'bg-emerald-400' : 'bg-red-500'
          }`} />

          <div className="p-6 text-center relative z-10">
            {/* Close Button */}
            <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-white/5 hover:bg-white/15 rounded-full transition-all active:scale-90">
              <X size={15} className="text-white/80" />
            </button>

            {/* Icon Banner */}
            <motion.div 
              initial={{ scale: 0.3, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.15, stiffness: 260, damping: 15 }}
              className={`mb-4 inline-flex p-4 rounded-full bg-black/50 border relative ${
                result.win ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'border-red-500/40'
              }`}
            >
              {result.win ? (
                <>
                  <Trophy size={42} className="text-yellow-400 drop-shadow-[0_0_10px_#f59e0b] animate-bounce" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                    className="absolute -inset-1 rounded-full border border-dashed border-yellow-500/40 pointer-events-none"
                  />
                </>
              ) : (
                <Swords size={42} className="text-red-500 animate-pulse" />
              )}
            </motion.div>

            {/* Title Banner */}
            {result.winner === 'Tie' ? (
              <motion.h2 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-3xl font-black italic tracking-tighter uppercase mb-0.5 text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] font-sans"
              >
                👑 EPIC TIE 9X!
              </motion.h2>
            ) : (
              <h2 className={`text-3xl font-black italic tracking-tighter uppercase mb-0.5 font-sans ${
                result.win ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]'
              }`}>
                {result.win ? 'VICTORY!' : 'DEFEAT'}
              </h2>
            )}
            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.25em] mb-5">PERIOD: {result.period}</p>

            {/* VIP Card Display */}
            <div className="bg-black/60 p-4 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden mb-4">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
              
              <div className="flex justify-between items-center relative z-10 gap-3">
                {/* Dragon Card Container */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-sans">DRAGON</span>
                  <div className="flex gap-1 justify-center">
                    {result.dragonCards.map((c, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ rotateY: 90, scale: 0.8 }}
                        animate={{ rotateY: 0, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.5, type: 'spring' }}
                        className="w-14 h-20 bg-gradient-to-b from-[#18181b] to-[#09090b] rounded-xl flex flex-col items-center justify-between p-2 border-[2px] border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.4)] relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent)] pointer-events-none" />
                        <span className={`self-start text-xs font-black leading-none font-sans ${['♥', '♦'].includes(c.suit) ? 'text-red-500' : 'text-blue-400'}`}>
                          {getCardRank(c.rank)}
                        </span>
                        <span className={`text-2xl leading-none ${['♥', '♦'].includes(c.suit) ? 'text-red-500' : 'text-blue-400'} drop-shadow-[0_0_4px_currentColor]`}>
                          {c.suit}
                        </span>
                        <span className="text-[6px] font-black tracking-widest text-blue-500/50 uppercase leading-none font-sans">VIP</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {/* VS Indicator */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 p-[1px] shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                      <span className="text-[10px] font-black italic text-yellow-400">VS</span>
                    </div>
                  </div>
                </div>
                
                {/* Tiger Card Container */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest font-sans">TIGER</span>
                  <div className="flex gap-1 justify-center">
                    {result.tigerCards.map((c, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ rotateY: 90, scale: 0.8 }}
                        animate={{ rotateY: 0, scale: 1 }}
                        transition={{ delay: 0.4 + i * 0.1, duration: 0.5, type: 'spring' }}
                        className="w-14 h-20 bg-gradient-to-b from-[#18181b] to-[#09090b] rounded-xl flex flex-col items-center justify-between p-2 border-[2px] border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)] relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.15),transparent)] pointer-events-none" />
                        <span className={`self-start text-xs font-black leading-none font-sans ${['♥', '♦'].includes(c.suit) ? 'text-red-500' : 'text-orange-400'}`}>
                          {getCardRank(c.rank)}
                        </span>
                        <span className={`text-2xl leading-none ${['♥', '♦'].includes(c.suit) ? 'text-red-500' : 'text-orange-400'} drop-shadow-[0_0_4px_currentColor]`}>
                          {c.suit}
                        </span>
                        <span className="text-[6px] font-black tracking-widest text-orange-500/50 uppercase leading-none font-sans">VIP</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Winner Label bar */}
              <div className="mt-3.5 bg-black/40 py-2 px-4 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest font-sans">WINNING TARGET</span>
                <span className={`text-[11px] font-black italic uppercase tracking-wider font-sans ${
                  result.winner === 'D' ? 'text-blue-400' : result.winner === 'T' ? 'text-orange-400' : 'text-emerald-400'
                }`}>
                  {result.winner === 'D' ? '🔥 DRAGON' : result.winner === 'T' ? '⚡ TIGER' : '👑 TIE'}
                </span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className={`py-4 px-5 rounded-3xl border-2 mb-5 relative overflow-hidden shadow-md ${
              result.win 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/2 to-transparent pointer-events-none" />
              <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1 font-sans">
                {result.win ? 'TOTAL PAYOUT' : 'TOTAL AMOUNT LOST'}
              </p>
              <h3 className={`text-3xl font-black italic tracking-tight font-sans ${
                result.win ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-white/40'
              }`}>
                {result.win ? `+₹${result.amount.toFixed(2)}` : `-₹${result.amount.toFixed(2)}`}
              </h3>
            </div>

            <button 
              onClick={onClose}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.25em] text-[10px] shadow-lg active:scale-95 transition-all font-sans ${
                result.win 
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-600 hover:to-amber-600 text-black shadow-yellow-500/30' 
                  : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
              }`}
            >
              CONTINUE BATTLE
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DragonTigerResultPopup;
