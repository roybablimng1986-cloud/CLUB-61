
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, RotateCw, Trash2, Volume2, VolumeX, Timer, History, HelpCircle, X, ShieldCheck } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus } from '../services/mockFirebase';
import { GameResult, RouletteBet } from '../types';

const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const Roulette: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [status, setStatus] = useState<'BETTING' | 'LOCKED' | 'SPINNING' | 'RESULT'>('BETTING');
  const [timeLeft, setTimeLeft] = useState(20);
  const [period, setPeriod] = useState(Date.now().toString().slice(-6));
  const [wheelRotation, setWheelRotation] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [selectedChip, setSelectedChip] = useState(10);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [muted, setMuted] = useState(getMuteStatus());
  const [showPaytable, setShowPaytable] = useState(false);
  const [floating, setFloating] = useState<{ text: string; color: string; id: number } | null>(null);
  const [confirmDrawer, setConfirmDrawer] = useState<{ open: boolean; type: RouletteBet['type']; value: string | number } | null>(null);

  const isMounted = useRef(true);
  const pendingBetsRef = useRef<RouletteBet[]>([]);

  useEffect(() => {
    isMounted.current = true;
    const interval = setInterval(() => {
        if (!isMounted.current) return;
        
        if (status === 'BETTING') {
            if (timeLeft > 0) {
                setTimeLeft(prev => prev - 1);
                if (timeLeft <= 5) playSound('tick');
            } else {
                setStatus('LOCKED');
                setConfirmDrawer(null);
                setTimeLeft(3);
            }
        } else if (status === 'LOCKED') {
            if (timeLeft > 0) setTimeLeft(prev => prev - 1);
            else spin();
        }
    }, 1000);

    return () => { isMounted.current = false; clearInterval(interval); stopAllSounds(); };
  }, [timeLeft, status]);

  const triggerFloating = (text: string, color: string) => {
      setFloating({ text, color, id: Date.now() });
      setTimeout(() => setFloating(null), 3000);
  };

  const spin = () => {
    setStatus('SPINNING');
    playSound('spin');

    const result = WHEEL_ORDER[Math.floor(Math.random() * WHEEL_ORDER.length)];
    const resultIdx = WHEEL_ORDER.indexOf(result);
    const segmentAngle = 360 / WHEEL_ORDER.length;
    
    const extraRots = 360 * 20; 
    const offset = resultIdx * segmentAngle;
    const finalRotation = wheelRotation + extraRots + (360 - (wheelRotation % 360)) - offset;
    
    setWheelRotation(finalRotation);
    setTimeout(() => finalize(result), 5000);
  };

  const finalize = (num: number) => {
    if (!isMounted.current) return;
    setStatus('RESULT');
    setLastResult(num);
    setHistory(prev => [num, ...prev].slice(0, 15));

    const currentBets = [...pendingBetsRef.current];
    let totalWin = 0;
    const isRed = REDS.includes(num);
    const isEven = num !== 0 && num % 2 === 0;

    currentBets.forEach(bet => {
        if (bet.type === 'NUMBER' && bet.value === num) totalWin += bet.amount * 36;
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
    });

    if (totalWin > 0) {
        updateBalance(totalWin, 'WIN', 'Roulette Win');
        playSound('win');
        triggerFloating(`+₹${totalWin.toFixed(2)}`, 'text-yellow-400');
        onResult({ win: true, amount: totalWin, game: 'Mafia Roulette', resultDetails: [{label: 'Number', value: num.toString()}] });
    } else if (currentBets.length > 0) {
        playSound('loss');
        triggerFloating(`-₹${currentBets.reduce((acc,b)=>acc+b.amount,0).toFixed(2)}`, 'text-red-500');
        onResult({ win: false, amount: currentBets.reduce((acc,b)=>acc+b.amount,0), game: 'Mafia Roulette' });
    }

    addGameHistory('Mafia Roulette', currentBets.reduce((acc,b)=>acc+b.amount,0), totalWin, `Period ${period} | Landed ${num}`);
    
    setTimeout(() => {
        if (isMounted.current) {
            setStatus('BETTING');
            setTimeLeft(20);
            setBets([]);
            pendingBetsRef.current = [];
            setPeriod(Date.now().toString().slice(-6));
        }
    }, 5000);
  };

  const openBetConfirm = (type: RouletteBet['type'], value: string | number) => {
    if (status !== 'BETTING') return;
    setConfirmDrawer({ open: true, type, value });
    playSound('click');
  };

  const confirmBet = () => {
    if (!confirmDrawer || status !== 'BETTING') return;
    const { type, value } = confirmDrawer;

    if (userBalance < selectedChip) {
        alert("Insufficient Balance");
        return;
    }
    
    updateBalance(-selectedChip, 'BET', `Roulette: ${value}`);
    playSound('click');
    
    const newBet: RouletteBet = { type, value, amount: selectedChip };
    const existingIdx = bets.findIndex(b => b.type === type && b.value === value);
    
    let updated;
    if (existingIdx > -1) {
        updated = [...bets];
        updated[existingIdx].amount += selectedChip;
    } else {
        updated = [...bets, newBet];
    }
    setBets(updated);
    pendingBetsRef.current = updated;
    setConfirmDrawer(null);
  };

  const clearBets = () => {
    if (status !== 'BETTING') return;
    const total = bets.reduce((a, b) => a + b.amount, 0);
    if (total > 0) {
        updateBalance(total, 'GIFT', 'Roulette Clear');
        setBets([]);
        pendingBetsRef.current = [];
        playSound('click');
    }
  };

  const rows = [];
  for (let i = 0; i < 6; i++) {
    rows.push(Array.from({ length: 6 }, (_, j) => i * 6 + j + 1));
  }

  return (
    <div className="bg-[#050505] min-h-screen flex flex-col font-sans text-white overflow-hidden relative select-none">
      {floating && (
          <div key={floating.id} className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-[300] font-black text-6xl italic pointer-events-none animate-float-up ${floating.color}`} style={{ textShadow: '0 0 40px rgba(0,0,0,1)' }}>
              {floating.text}
          </div>
      )}

      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-[#111] border-b border-yellow-500/20 z-[110] shadow-2xl">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2.5 bg-zinc-900 rounded-2xl active:scale-90 border border-white/5"><ArrowLeft size={20}/></button>
            <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-2xl border border-yellow-500/20 shadow-inner">
                <Wallet size={14} className="text-yellow-500" />
                <span className="text-sm font-black font-mono text-yellow-500">₹{userBalance.toFixed(2)}</span>
            </div>
        </div>
        <h1 className="text-sm font-black gold-text italic tracking-widest uppercase">MAFIA ROULETTE</h1>
        <div className="flex gap-2">
            <button onClick={() => setShowPaytable(true)} className="p-2.5 bg-zinc-900 rounded-2xl border border-white/5"><HelpCircle size={18}/></button>
            <button onClick={() => setMuted(toggleMute())} className="p-2.5 bg-zinc-900 rounded-2xl border border-white/5">
                {muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center py-4 pb-64 gap-8">
          
          <div className="relative w-full max-w-lg aspect-square flex items-center justify-center transition-all px-4 mt-2">
              {/* TOP POINTER */}
              <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center pointer-events-none">
                   <div 
                      className="w-14 h-16 bg-yellow-500 shadow-[0_0_50px_rgba(234,179,8,1)]" 
                      style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
                   ></div>
              </div>

              {/* The Rotating Wheel Disk */}
              <div 
                className="w-full h-full rounded-full border-[14px] border-zinc-900 shadow-[0_0_150px_rgba(0,0,0,1)] transition-transform duration-[5000ms] cubic-bezier(0.1, 0, 0.1, 1) relative bg-zinc-900"
                style={{ 
                    transform: `rotate(${wheelRotation}deg)`,
                }}
              >
                 {/* Conic Gradient for Segment Colors */}
                 <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${WHEEL_ORDER.map((n, i) => `${n===0?'#16a34a':REDS.includes(n)?'#dc2626':'#1a1a1a'} ${i*(360/37)}deg ${(i+1)*(360/37)}deg`).join(', ')})` }}></div>
                 
                 {/* Number Overlay - SHRUNK AND POSITIONED AT EXTREME OUTER RIM */}
                 {WHEEL_ORDER.map((n, i) => (
                     <div 
                        key={i} 
                        className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 origin-bottom flex items-center justify-center pt-1.5" 
                        style={{ transform: `translateX(-50%) rotate(${i*(360/37) + (360/37/2)}deg)` }}
                     >
                        <span className="text-[9px] md:text-[11px] font-black text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-tighter select-none leading-none">
                          {n}
                        </span>
                     </div>
                 ))}

                 {/* Inner rim overlay for realistic wheel depth */}
                 <div className="absolute inset-[12%] rounded-full border-[8px] border-zinc-800/60 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] pointer-events-none"></div>
              </div>

              {/* CENTRAL DISPLAY CORE */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[70]">
                  <div className="w-36 h-36 md:w-52 md:h-52 rounded-full bg-[#0a0a0a] border-[12px] border-zinc-800 shadow-[inset_0_0_80px_rgba(0,0,0,1),0_0_60px_rgba(234,179,8,0.15)] flex flex-col items-center justify-center overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                      <div className="absolute inset-3 rounded-full border border-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.1)]"></div>
                      <div className={`text-7xl md:text-8xl font-black italic tracking-tighter transition-all duration-500 ${status === 'RESULT' ? 'scale-110 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'scale-100'} ${lastResult===0?'text-green-500':REDS.includes(lastResult||-1)?'text-red-500':'text-white'}`}>
                          {lastResult !== null ? lastResult : '?'}
                      </div>
                      <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mt-3">TARGET HIT</div>
                  </div>
              </div>
          </div>

          {/* Game Info Bar */}
          <div className="w-full px-8 flex justify-between items-center bg-zinc-900/60 py-6 border-y border-white/5 backdrop-blur-xl">
              <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest opacity-60">Session State</span>
                  <div className={`text-lg font-black uppercase italic tracking-tighter ${status==='BETTING'?'text-green-500':'text-red-500'}`}>
                      {status === 'BETTING' ? 'Betting Active' : status === 'LOCKED' ? 'Bets Closed' : status === 'SPINNING' ? 'Spooling...' : 'Draw Ready'}
                  </div>
              </div>
              <div className="flex flex-col items-end">
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest opacity-60">Cycle Timer</span>
                  <div className="flex items-center gap-2 text-4xl font-black font-mono text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                    <Timer size={24}/> {timeLeft}s
                  </div>
              </div>
          </div>

          {/* Betting Grid */}
          <div className="w-full px-4 max-w-lg space-y-3">
             <div className="flex gap-2 h-24">
                <button onClick={() => openBetConfirm('NUMBER', 0)} disabled={status !== 'BETTING'} className="flex-[0.5] bg-green-600 rounded-3xl flex items-center justify-center font-black border-2 border-white/20 active:scale-95 text-3xl shadow-2xl disabled:opacity-30">0</button>
                <div className="flex-[2] grid grid-cols-2 gap-2">
                    <OutsideBet label="RED" color="bg-red-600" onClick={() => openBetConfirm('COLOR', 'RED')} bet={bets.find(b=>b.value==='RED')} status={status} />
                    <OutsideBet label="BLACK" color="bg-zinc-950" onClick={() => openBetConfirm('COLOR', 'BLACK')} bet={bets.find(b=>b.value==='BLACK')} status={status} />
                </div>
             </div>

             <div className="bg-zinc-950/80 p-5 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-3">
                {rows.map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-6 gap-3">
                        {row.map(n => {
                            const color = REDS.includes(n) ? 'bg-red-600' : 'bg-zinc-900';
                            const betOnNum = bets.find(b => b.type === 'NUMBER' && b.value === n);
                            return (
                                <button key={n} onClick={() => openBetConfirm('NUMBER', n)} disabled={status !== 'BETTING'} className={`${color} h-18 rounded-2xl flex flex-col items-center justify-center font-black text-2xl relative active:scale-95 border-2 border-white/10 shadow-xl disabled:opacity-30`}>
                                    {n}
                                    {betOnNum && <div className="absolute inset-0 bg-yellow-500 rounded-2xl flex items-center justify-center text-[11px] text-black font-black animate-in zoom-in ring-2 ring-white/50">₹{betOnNum.amount}</div>}
                                </button>
                            );
                        })}
                    </div>
                ))}
             </div>

             <div className="grid grid-cols-2 gap-3">
                <div className="grid grid-cols-2 gap-3">
                    <OutsideBet label="1-18" onClick={() => openBetConfirm('RANGE', '1-18')} bet={bets.find(b=>b.value==='1-18')} status={status} />
                    <OutsideBet label="EVEN" onClick={() => openBetConfirm('ODD_EVEN', 'EVEN')} bet={bets.find(b=>b.value==='EVEN')} status={status} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <OutsideBet label="ODD" onClick={() => openBetConfirm('ODD_EVEN', 'ODD')} bet={bets.find(b=>b.value==='ODD')} status={status} />
                    <OutsideBet label="19-36" onClick={() => openBetConfirm('RANGE', '19-36')} bet={bets.find(b=>b.value==='19-36')} status={status} />
                </div>
             </div>
          </div>
      </div>

      {/* Footer Controls */}
      <div className="fixed bottom-0 left-0 w-full bg-zinc-950/95 backdrop-blur-2xl border-t border-white/10 p-6 pb-10 z-[120] shadow-[0_-30px_80px_rgba(0,0,0,1)]">
          <div className="flex gap-3 overflow-x-auto no-scrollbar mb-6 py-2">
                {[10, 50, 100, 500, 1000, 5000].map(amt => (
                    <button key={amt} onClick={() => setSelectedChip(amt)} className={`flex-shrink-0 w-16 h-16 rounded-full border-4 flex items-center justify-center text-sm font-black transition-all duration-300 ${selectedChip === amt ? 'bg-yellow-500 border-white text-black scale-110 shadow-[0_0_30px_rgba(234,179,8,0.5)]' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white'}`}>₹{amt >= 1000 ? `${amt/1000}k` : amt}</button>
                ))}
          </div>
          <div className="flex justify-between items-center px-6 py-4 rounded-3xl bg-black/50 border border-white/5">
             <button onClick={clearBets} disabled={status !== 'BETTING' || bets.length === 0} className="p-3 bg-red-600/10 text-red-500 rounded-2xl border border-red-500/30 active:scale-90 transition-all disabled:opacity-20 flex items-center gap-2"><Trash2 size={20}/><span className="text-[10px] font-black uppercase">Clear</span></button>
             <div className="flex flex-col text-right">
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Active Stake</span>
                <span className="text-xl font-black text-yellow-500 font-mono italic">₹{bets.reduce((a,b)=>a+b.amount,0).toFixed(2)}</span>
             </div>
          </div>
      </div>

      {confirmDrawer && confirmDrawer.open && (
          <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/85 backdrop-blur-xl">
              <div className="bg-[#0a0a0a] w-full max-w-md rounded-t-[3.5rem] p-10 border-t-2 border-yellow-500/40 animate-in slide-in-from-bottom duration-400">
                  <div className="flex justify-between items-center mb-10">
                      <div>
                          <p className="text-[14px] text-zinc-500 font-black uppercase tracking-widest mb-1">Targeting Arena</p>
                          <h3 className="text-5xl font-black italic gold-text tracking-tighter">Stake: {confirmDrawer.value}</h3>
                      </div>
                      <button onClick={() => setConfirmDrawer(null)} className="p-5 bg-zinc-900 rounded-full border border-white/10 active:scale-90 transition-transform"><X size={28}/></button>
                  </div>
                  <div className="bg-zinc-950 p-10 rounded-[3rem] mb-10 flex items-center justify-between border border-white/5 shadow-inner">
                       <div className="flex flex-col"><span className="text-[14px] text-slate-500 uppercase font-black">Bet Amount</span><span className="text-5xl font-black">₹{selectedChip}</span></div>
                       <div className="w-20 h-20 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-2xl shadow-2xl ring-4 ring-yellow-400/20">₹{selectedChip >= 1000 ? `${selectedChip/1000}k` : selectedChip}</div>
                  </div>
                  <button onClick={confirmBet} className="w-full py-8 rounded-[3rem] bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-black uppercase tracking-[0.5em] text-3xl shadow-[0_20px_60px_rgba(234,179,8,0.4)] active:scale-95 transition-all border-t-2 border-white/30">CONFIRM STAKE</button>
              </div>
          </div>
      )}

      {showPaytable && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
               <div className="bg-zinc-900 border border-yellow-500/30 w-full max-w-sm p-10 rounded-[3.5rem] shadow-2xl animate-in zoom-in duration-300">
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-3xl font-black gold-text italic uppercase tracking-tighter">MAFIA LOGS</h2>
                        <button onClick={() => setShowPaytable(false)} className="p-3 bg-zinc-800 rounded-full hover:bg-slate-700 transition-colors"><X/></button>
                    </div>
                    <div className="space-y-4">
                        <PayoutRow label="Straight Target" mult="36.00X" color="text-yellow-500" />
                        <PayoutRow label="Binary Color" mult="2.00X" color="text-red-500" />
                        <PayoutRow label="Even / Odd" mult="2.00X" color="text-blue-500" />
                        <PayoutRow label="Range Tier" mult="2.00X" color="text-emerald-500" />
                    </div>
                    <div className="mt-10 p-6 bg-black/50 rounded-3xl border border-white/5 text-center">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                            Elite Mafia Rules: Payouts are instant. Minimum target limit applies. Maximum table limit: ₹500,000.
                        </p>
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
            100% { transform: translate(-50%, -200px); opacity: 0; scale: 1.5; }
        }
        .animate-float-up { animation: float-up 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .h-18 { height: 4.5rem; }
      `}</style>
    </div>
  );
};

const OutsideBet = ({ label, color = 'bg-zinc-900', onClick, bet, status }: any) => (
    <button onClick={onClick} disabled={status !== 'BETTING'} className={`h-20 ${color} rounded-3xl border-2 border-white/10 font-black text-xs uppercase flex flex-col items-center justify-center relative active:scale-95 transition-all disabled:opacity-30 shadow-2xl`}>
        <span className="tracking-widest italic">{label}</span>
        {bet && <div className="absolute inset-0 bg-yellow-500 rounded-3xl flex items-center justify-center text-black animate-in zoom-in ring-4 ring-white/30"><span className="font-black text-sm">₹{bet.amount}</span></div>}
    </button>
);

const PayoutRow = ({ label, mult, color }: any) => (
    <div className="flex justify-between items-center p-5 bg-black/60 rounded-[1.5rem] border border-white/5">
        <span className="text-xs font-black text-zinc-400 uppercase tracking-tighter">{label}</span>
        <span className={`text-xl font-black italic ${color}`}>{mult}</span>
    </div>
);

export default Roulette;
