
import React, { useState } from 'react';
import { ArrowLeft, Gift, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { redeemGiftCode, playSound } from '../services/supabaseService';
import { motion, AnimatePresence } from 'motion/react';

const GiftCode: React.FC<{ onBack: () => void; userBalance: number }> = ({ onBack, userBalance }) => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');

  const [showPopup, setShowPopup] = useState(false);

  const playClaimSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;
        
        // Staggered arpeggio (C Major chord: C, E, G, C, E, G, C)
        const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            
            gain.gain.setValueAtTime(0, now + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.6);
        });
    } catch (e) {
        console.warn('Web Audio API not supported', e);
    }
  };

  const handleRedeem = async () => {
    if (!code.trim()) return;
    
    setStatus('LOADING');
    playSound('click');

    const res = await redeemGiftCode(code);
    if (res.success) {
        setStatus('SUCCESS');
        setMessage(res.message);
        setShowPopup(true);
        playClaimSound();
    } else {
        setStatus('ERROR');
        setMessage(res.message);
        playSound('loss');
    }
  };

  return (
    <div className="bg-[#050505] min-h-screen flex flex-col font-sans text-white overflow-hidden relative select-none">
      {/* Success Popup */}
      <AnimatePresence>
          {showPopup && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
                  <motion.div 
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 20 }}
                    className="bg-zinc-900 border-2 border-yellow-500/50 p-10 rounded-[3.5rem] flex flex-col items-center text-center shadow-[0_0_100px_rgba(234,179,8,0.3)] max-w-sm w-full relative"
                  >
                      <div className="absolute -top-16 w-32 h-32 bg-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-8 border-zinc-900">
                          <Gift size={64} className="text-black" />
                      </div>
                      <h2 className="text-4xl font-black gold-text italic mt-8 uppercase tracking-tighter">REWARD CLIMBED!</h2>
                      <div className="my-8 space-y-2">
                         <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">You Received</p>
                         <p className="text-5xl font-black text-white italic">₹{message.split('₹')[1] || 'Reward'}</p>
                      </div>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] mb-10">Success: {message}</p>
                      <button 
                        onClick={() => { setShowPopup(false); onBack(); }}
                        className="w-full py-6 bg-yellow-500 text-black font-black rounded-3xl text-xl shadow-2xl active:scale-95 transition-all uppercase tracking-widest"
                      >
                         AWESOME
                      </button>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
      <div className="p-4 flex items-center gap-4 bg-[#111] border-b border-yellow-500/20 z-50 shadow-2xl">
        <button onClick={onBack} className="p-2.5 bg-zinc-900 rounded-2xl active:scale-90 border border-white/5"><ArrowLeft size={20}/></button>
        <h1 className="text-lg font-black gold-text italic tracking-widest uppercase">REDEEM GIFT</h1>
      </div>

      <div className="flex-1 flex flex-col items-center p-8 pt-12 gap-8">
          <div className="w-32 h-32 rounded-full bg-yellow-500/10 border-2 border-yellow-500/20 flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.1)]">
              <Gift size={64} className="text-yellow-500 animate-bounce" />
          </div>

          <div className="text-center space-y-2">
              <h2 className="text-3xl font-black italic tracking-tighter">Enter Gift Code</h2>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Redeem exclusive rewards instantly</p>
          </div>

          <div className="w-full max-w-sm space-y-6">
              <div className="relative">
                  <input 
                    type="text" 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter code here..."
                    className="w-full bg-zinc-900 border-2 border-white/5 rounded-3xl py-6 px-8 text-xl font-black tracking-widest focus:border-yellow-500/50 focus:outline-none transition-all placeholder:text-zinc-700 uppercase"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-700">
                      <Gift size={24} />
                  </div>
              </div>

              <button 
                onClick={handleRedeem}
                disabled={status === 'LOADING' || !code.trim()}
                className="w-full py-6 rounded-3xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-black uppercase tracking-[0.4em] text-xl shadow-[0_20px_60px_rgba(234,179,8,0.3)] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
              >
                  {status === 'LOADING' ? <Loader2 className="animate-spin" /> : 'REDEEM NOW'}
              </button>
          </div>

          <AnimatePresence>
              {status !== 'IDLE' && status !== 'LOADING' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className={`w-full max-w-sm p-6 rounded-[2.5rem] border-2 flex flex-col items-center gap-4 text-center ${status === 'SUCCESS' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}
                  >
                      {status === 'SUCCESS' ? <CheckCircle2 size={48} className="text-green-500" /> : <XCircle size={48} className="text-red-500" />}
                      <div>
                          <h3 className={`text-xl font-black italic ${status === 'SUCCESS' ? 'text-green-500' : 'text-red-500'}`}>{status === 'SUCCESS' ? 'SUCCESS!' : 'FAILED!'}</h3>
                          <p className="text-sm font-bold text-zinc-400 mt-1">{message}</p>
                      </div>
                      {status === 'SUCCESS' && (
                          <button onClick={onBack} className="mt-2 px-8 py-3 bg-green-500 text-black font-black rounded-full text-xs uppercase tracking-widest">Back to Home</button>
                      )}
                  </motion.div>
              )}
          </AnimatePresence>
      </div>

      <style>{`
        .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      `}</style>
    </div>
  );
};

export default GiftCode;
