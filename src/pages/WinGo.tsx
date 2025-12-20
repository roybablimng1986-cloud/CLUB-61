import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, History, HelpCircle, X, Wallet, Volume2, VolumeX } from 'lucide-react';
import { WinGoGameState, GameResult } from '../types';
import { subscribeToWinGo, updateBalance, stopAllSounds, toggleMute, getMuteStatus, playSound } from '../services/mockFirebase';

const WinGo: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; onDeposit: () => void; }> = ({ onBack, userBalance, onResult, onDeposit }) => {
  const [gameState, setGameState] = useState<WinGoGameState | null>(null);
  const [betDrawerOpen, setBetDrawerOpen] = useState(false);
  const [selectedBetTarget, setSelectedBetTarget] = useState<string | null>(null);
  const [betMoney, setBetMoney] = useState(1);
  const [betMultiplier, setBetMultiplier] = useState(1);
  const [muted, setMuted] = useState(getMuteStatus());
  const [winAnimation, setWinAnimation] = useState({amount: 0, show: false, animate: false});
  const [betAnimation, setBetAnimation] = useState({amount: 0, show: false});
  const [pendingBets, setPendingBets] = useState<{target: string; amount: number; period: number}[]>([]);
  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    tickAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3');
    return () => { isMounted.current = false; if(tickAudioRef.current) tickAudioRef.current.pause(); stopAllSounds(); };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToWinGo((state) => {
        if (!isMounted.current) return;
        setGameState(state);
        if (!muted && state.timeLeft <= 5 && state.timeLeft > 0 && state.status === 'BETTING') tickAudioRef.current?.play().catch(()=>{});
        if (state.status === 'REVEALING') setBetDrawerOpen(false);
        if (state.status === 'REVEALING' && state.lastResult) {
            const currentRoundBets = pendingBets.filter(b => b.period.toString() === state.lastResult!.period);
            if (currentRoundBets.length > 0) {
                let totalWin = 0;
                let totalBet = 0;
                let win = false;
                currentRoundBets.forEach(bet => {
                    totalBet += bet.amount;
                    let betWin = false, mult = 0;
                    const num = state.lastResult!.number;
                    if (bet.target === 'Green' && [1,3,5,7,9].includes(num)) { betWin = true; mult = num===5?1.5:2; }
                    else if (bet.target === 'Red' && [0,2,4,6,8].includes(num)) { betWin = true; mult = num===0?1.5:2; }
                    else if (bet.target === 'Violet' && [0,5].includes(num)) { betWin = true; mult = 4.5; }
                    else if (bet.target === 'Big' && num >= 5) { betWin = true; mult = 2; }
                    else if (bet.target === 'Small' && num < 5) { betWin = true; mult = 2; }
                    else if (bet.target === num.toString()) { betWin = true; mult = 9; }
                    if (betWin) { win = true; totalWin += bet.amount * mult; }
                });
                if (totalWin > 0) {
                     updateBalance(totalWin, 'WIN', 'WinGo Win');
                     if (isMounted.current) {
                         setWinAnimation({ amount: totalWin, show: true, animate: false });
                         setTimeout(() => isMounted.current && setWinAnimation({ amount: totalWin, show: true, animate: true }), 50);
                         setTimeout(() => isMounted.current && setWinAnimation({ amount: 0, show: false, animate: false }), 2500);
                     }
                }
                if (isMounted.current) {
                    onResult({ win, amount: win ? totalWin : totalBet, game: 'WinGo', period: state.lastResult.period, resultDetails: [{ label: 'Number', value: state.lastResult.number.toString() }] });
                    setPendingBets(prev => prev.filter(b => b.period.toString() !== state.lastResult!.period));
                }
            }
        }
    });
    return () => unsubscribe();
  }, [pendingBets, muted]);

  if (!gameState) return <div>Loading...</div>;
  const confirmBet = () => {
      const total = betMoney * betMultiplier;
      if (total > userBalance) return alert("Insufficient Balance");
      updateBalance(-total);
      setBetDrawerOpen(false);
      setPendingBets(prev => [...prev, { target: selectedBetTarget!, amount: total, period: gameState.period }]);
      setBetAnimation({ amount: total, show: true });
      setTimeout(() => setBetAnimation({ amount: 0, show: false }), 800);
  };
  const getBallColor = (n: number) => n===0?'bg-purple-500':n===5?'bg-purple-500':[1,3,7,9].includes(n)?'bg-green-500':'bg-red-500';

  return (
    <div className="bg-[#0f172a] min-h-screen pb-20 relative font-sans">
      {betAnimation.show && <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"><div className="animate-ping text-4xl font-black text-red-500">-₹{betAnimation.amount}</div></div>}
      {winAnimation.show && <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"><div className={`flex flex-col items-center transition-all duration-1000 ${winAnimation.animate?'scale-150 opacity-0':''}`}><h1 className="text-6xl text-yellow-400 font-black">+₹{winAnimation.amount.toFixed(2)}</h1></div></div>}
      
      <div className="bg-[#1e293b] p-4 sticky top-0 z-20 flex justify-between items-center"><button onClick={onBack}><ArrowLeft className="text-white"/></button><h1 className="text-white font-bold">Win Go 30s</h1><button onClick={()=>{setMuted(toggleMute())}}>{muted?<VolumeX className="text-white"/>:<Volume2 className="text-white"/>}</button></div>
      <div className="bg-[#0f172a] m-4 p-3 rounded-xl border border-slate-700 flex justify-between items-center"><div className="text-white font-bold">₹{userBalance.toFixed(2)}</div><button onClick={onDeposit} className="bg-blue-600 px-4 py-1 rounded-full text-white text-xs font-bold">Deposit</button></div>
      
      <div className="m-4 h-40 bg-blue-900 rounded-xl relative overflow-hidden flex items-center justify-center text-white">
         <div className="text-center"><div>Period: {gameState.period}</div><div className="text-4xl font-bold font-mono mt-2">{gameState.status==='BETTING'?`00:${gameState.timeLeft}`:'Revealing'}</div></div>
         <div className="absolute bottom-2 right-2 flex gap-1">{gameState.history.slice(0,5).map((h,i)=><div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${getBallColor(h.number)}`}>{h.number}</div>)}</div>
      </div>

      <div className="bg-[#1e293b] rounded-t-3xl p-4 min-h-[500px]">
          <div className="flex gap-2 mb-4">
              <button onClick={()=>{setSelectedBetTarget('Green');setBetDrawerOpen(true)}} className="flex-1 bg-green-600 py-3 rounded-tl-xl rounded-br-xl font-bold text-white">Green</button>
              <button onClick={()=>{setSelectedBetTarget('Violet');setBetDrawerOpen(true)}} className="flex-1 bg-purple-600 py-3 rounded font-bold text-white">Violet</button>
              <button onClick={()=>{setSelectedBetTarget('Red');setBetDrawerOpen(true)}} className="flex-1 bg-red-600 py-3 rounded-tr-xl rounded-bl-xl font-bold text-white">Red</button>
          </div>
          <div className="grid grid-cols-5 gap-2 mb-4">
              {[0,1,2,3,4,5,6,7,8,9].map(n=><button key={n} onClick={()=>{setSelectedBetTarget(n.toString());setBetDrawerOpen(true)}} className={`aspect-square rounded-full font-bold text-white ${getBallColor(n)}`}>{n}</button>)}
          </div>
          <div className="flex gap-2"><button onClick={()=>{setSelectedBetTarget('Big');setBetDrawerOpen(true)}} className="flex-1 bg-yellow-500 py-3 rounded-full font-bold text-black">Big</button><button onClick={()=>{setSelectedBetTarget('Small');setBetDrawerOpen(true)}} className="flex-1 bg-blue-500 py-3 rounded-full font-bold text-white">Small</button></div>
      </div>

      {betDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"><div className="w-full bg-[#1e293b] p-6 rounded-t-3xl animate-in slide-in-from-bottom">
              <h3 className="text-white font-bold mb-4">Bet on {selectedBetTarget}</h3>
              <div className="flex gap-2 mb-4">{[1,10,100,1000].map(a=><button key={a} onClick={()=>setBetMoney(a)} className={`flex-1 py-2 rounded ${betMoney===a?'bg-blue-600 text-white':'bg-slate-800 text-slate-400'}`}>{a}</button>)}</div>
              <div className="flex items-center gap-4 mb-6"><button onClick={()=>setBetMultiplier(Math.max(1,betMultiplier-1))} className="bg-slate-800 p-2 rounded text-white">-</button><span className="text-white font-bold text-xl">{betMultiplier}</span><button onClick={()=>setBetMultiplier(betMultiplier+1)} className="bg-slate-800 p-2 rounded text-white">+</button></div>
              <button onClick={confirmBet} className="w-full bg-blue-600 py-3 rounded-xl font-bold text-white">Bet ₹{betMoney*betMultiplier}</button>
              <button onClick={()=>setBetDrawerOpen(false)} className="w-full mt-2 text-slate-400">Cancel</button>
          </div></div>
      )}
    </div>
  );
};
export default WinGo;