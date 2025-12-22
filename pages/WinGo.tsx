
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, History as HistoryIcon, X, Wallet, Volume2, VolumeX, HelpCircle, ChevronRight } from 'lucide-react';
import { WinGoGameState, GameResult, GameHistoryItem } from '../types';
import { subscribeToWinGo, updateBalance, stopAllSounds, toggleMute, getMuteStatus, playSound, shouldForceLoss, getGameHistory } from '../services/mockFirebase';

const WinGo: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; onDeposit: () => void; }> = ({ onBack, userBalance, onResult, onDeposit }) => {
  const [gameState, setGameState] = useState<WinGoGameState | null>(null);
  const [activeTab, setActiveTab] = useState<'History' | 'MyBets'>('History');
  const [betDrawerOpen, setBetDrawerOpen] = useState(false);
  const [selectedBetTarget, setSelectedBetTarget] = useState<string | null>(null);
  const [betMoney, setBetMoney] = useState(1);
  const [betMultiplier, setBetMultiplier] = useState(1);
  const [muted, setMuted] = useState(getMuteStatus());
  const [showRules, setShowRules] = useState(false);
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [pendingBets, setPendingBets] = useState<{target: string; amount: number; period: number}[]>([]);
  const [myHistory, setMyHistory] = useState<GameHistoryItem[]>([]);
  
  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    tickAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3');
    setMyHistory(getGameHistory('WinGo').slice(0, 20));
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToWinGo((state) => {
        if (!isMounted.current) return;
        setGameState(state);
        if (!muted && state.timeLeft <= 5 && state.timeLeft > 0 && state.status === 'BETTING') tickAudioRef.current?.play().catch(()=>{});
        if (state.status === 'REVEALING') {
            setBetDrawerOpen(false);
            // Refresh personal history
            setTimeout(() => { if(isMounted.current) setMyHistory(getGameHistory('WinGo').slice(0, 20)); }, 3500);
        }
        if (state.status === 'REVEALING' && state.lastResult) {
            const currentRoundBets = pendingBets.filter(b => b.period.toString() === state.lastResult!.period);
            if (currentRoundBets.length > 0) {
                let totalWin = 0; let totalBet = 0; let win = false;
                currentRoundBets.forEach(bet => {
                    totalBet += bet.amount;
                    let betWin = false, mult = 0;
                    const num = state.lastResult!.number;
                    const isForced = shouldForceLoss(bet.amount, userBalance);
                    if (!isForced) {
                        if (bet.target === 'Green' && [1,3,5,7,9].includes(num)) { betWin = true; mult = num===5?1.5:2; }
                        else if (bet.target === 'Red' && [0,2,4,6,8].includes(num)) { betWin = true; mult = num===0?1.5:2; }
                        else if (bet.target === 'Violet' && [0,5].includes(num)) { betWin = true; mult = 4.5; }
                        else if (bet.target === 'Big' && num >= 5) { betWin = true; mult = 2; }
                        else if (bet.target === 'Small' && num < 5) { betWin = true; mult = 2; }
                        else if (bet.target === num.toString()) { betWin = true; mult = 9; }
                    }
                    if (betWin) { win = true; totalWin += bet.amount * mult; }
                });
                if (totalWin > 0) updateBalance(totalWin, 'WIN', 'WinGo Win');
                onResult({ win, amount: win ? totalWin : totalBet, game: 'WinGo', period: state.lastResult.period, resultDetails: [{ label: 'Number', value: state.lastResult.number.toString() }] });
                setPendingBets(prev => prev.filter(b => b.period.toString() !== state.lastResult!.period));
            }
        }
    });
    return () => unsubscribe();
  }, [pendingBets, muted, userBalance, onResult]);

  const confirmBet = () => {
      const total = betMoney * betMultiplier;
      if (total > userBalance) { setInsufficientBalance(true); setTimeout(() => setInsufficientBalance(false), 400); return; }
      updateBalance(-total);
      setBetDrawerOpen(false);
      setPendingBets(prev => [...prev, { target: selectedBetTarget!, amount: total, period: gameState!.period }]);
      playSound('click');
  };

  if (!gameState) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white italic font-black">SYNCING...</div>;
  
  const isBetLocked = gameState.timeLeft <= 5 || gameState.status === 'REVEALING';
  const getBallColor = (n: number) => n===0?'bg-purple-500':n===5?'bg-purple-500':[1,3,7,9].includes(n)?'bg-green-500':'bg-red-500';

  return (
    <div className="bg-[#0f172a] min-h-screen pb-20 relative font-sans select-none overflow-x-hidden">
      <div className="bg-[#1e293b] p-4 sticky top-0 z-20 flex justify-between items-center border-b border-white/5 shadow-xl">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={20} /></button>
            <h1 className="text-lg font-black italic gold-text uppercase">WINGO 30S</h1>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setShowRules(true)} className="p-2 text-slate-400 active:scale-90"><HelpCircle size={22}/></button>
            <button onClick={()=>{setMuted(toggleMute())}} className="p-2 text-white">
                {muted?<VolumeX size={22}/>:<Volume2 size={22}/>}
            </button>
        </div>
      </div>

      <div className={`bg-gradient-to-r from-blue-700 to-indigo-900 m-4 p-6 rounded-[2rem] flex justify-between items-center shadow-2xl border border-white/10 transition-all ${insufficientBalance ? 'animate-shake-red ring-2 ring-red-500' : ''}`}>
          <div className="flex items-center gap-4">
              <div className="bg-yellow-500 p-4 rounded-3xl text-slate-900 shadow-xl ring-2 ring-white/20"><Wallet size={26} /></div>
              <div>
                  <p className="text-[10px] text-blue-100 font-black uppercase tracking-widest opacity-70">Capital Reserve</p>
                  <h2 className="text-3xl font-black text-white italic tracking-tighter">₹{userBalance.toFixed(2)}</h2>
              </div>
          </div>
          <button onClick={onDeposit} className="px-6 py-2.5 bg-white text-indigo-900 rounded-2xl text-xs font-black uppercase shadow-xl active:scale-95 transition-all">Refill</button>
      </div>
      
      <div className="p-6 bg-slate-900/60 m-4 rounded-[2.5rem] flex flex-col items-center border border-white/5 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]">
         <div className="text-center w-full">
            <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.4em] mb-3">Period: {gameState.period}</div>
            <div className={`text-7xl font-black font-mono tracking-tighter transition-all ${isBetLocked ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {gameState.status==='BETTING' ? `00:${gameState.timeLeft < 10 ? '0'+gameState.timeLeft : gameState.timeLeft}` : 'LOCKED'}
            </div>
            <div className="flex gap-1 justify-center mt-6 overflow-x-auto no-scrollbar pb-2">
                {gameState.history.slice(0, 8).map((h, i) => (
                    <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg shrink-0 ${getBallColor(h.number)}`}>{h.number}</div>
                ))}
            </div>
         </div>
      </div>

      <div className="bg-[#1e293b] rounded-t-[3.5rem] p-8 shadow-[0_-20px_60px_rgba(0,0,0,1)] border-t border-white/5">
          <div className="flex gap-3 mb-8">
              <button disabled={isBetLocked} onClick={()=>{setSelectedBetTarget('Green');setBetDrawerOpen(true)}} className="flex-1 py-5 rounded-2xl bg-green-600 font-black uppercase text-xs text-white shadow-xl active:scale-95 disabled:opacity-30 border-b-4 border-green-800">Green</button>
              <button disabled={isBetLocked} onClick={()=>{setSelectedBetTarget('Violet');setBetDrawerOpen(true)}} className="flex-1 py-5 rounded-2xl bg-purple-600 font-black uppercase text-xs text-white shadow-xl active:scale-95 disabled:opacity-30 border-b-4 border-purple-800">Violet</button>
              <button disabled={isBetLocked} onClick={()=>{setSelectedBetTarget('Red');setBetDrawerOpen(true)}} className="flex-1 py-5 rounded-2xl bg-red-600 font-black uppercase text-xs text-white shadow-xl active:scale-95 disabled:opacity-30 border-b-4 border-red-800">Red</button>
          </div>
          <div className="grid grid-cols-5 gap-4 mb-8 bg-[#0a0f1d] p-6 rounded-[2.5rem] shadow-inner border border-white/5">
              {[0,1,2,3,4,5,6,7,8,9].map(n=><button disabled={isBetLocked} key={n} onClick={()=>{setSelectedBetTarget(n.toString());setBetDrawerOpen(true)}} className={`aspect-square rounded-full flex items-center justify-center text-2xl font-black text-white active:scale-90 transition-all disabled:opacity-30 shadow-lg border-2 border-white/5 ${getBallColor(n)}`}>{n}</button>)}
          </div>
          <div className="flex gap-4 mb-10">
              <button disabled={isBetLocked} onClick={()=>{setSelectedBetTarget('Big');setBetDrawerOpen(true)}} className="flex-1 py-5 rounded-3xl bg-yellow-600 font-black uppercase text-sm text-slate-950 shadow-xl active:scale-95 disabled:opacity-30 border-b-4 border-yellow-800">BIG</button>
              <button disabled={isBetLocked} onClick={()=>{setSelectedBetTarget('Small');setBetDrawerOpen(true)}} className="flex-1 py-5 rounded-3xl bg-blue-600 font-black uppercase text-sm text-white shadow-xl active:scale-95 disabled:opacity-30 border-b-4 border-blue-800">SMALL</button>
          </div>

          {/* HISTORY SECTION */}
          <div className="mt-4">
              <div className="flex bg-[#0a0f1d] p-1 rounded-2xl mb-6">
                  <button onClick={() => setActiveTab('History')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'History' ? 'bg-yellow-500 text-black shadow-lg' : 'text-slate-500'}`}>Game Logs</button>
                  <button onClick={() => setActiveTab('MyBets')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MyBets' ? 'bg-yellow-500 text-black shadow-lg' : 'text-slate-500'}`}>My Record</button>
              </div>

              {activeTab === 'History' ? (
                  <div className="space-y-1">
                      <div className="grid grid-cols-4 px-4 pb-4 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                          <span>Period</span>
                          <span className="text-center">Num</span>
                          <span className="text-center">Size</span>
                          <span className="text-right">Color</span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto no-scrollbar pt-2 space-y-3">
                          {gameState.history.map((h, i) => (
                              <div key={i} className="grid grid-cols-4 px-4 items-center">
                                  <span className="text-[10px] text-slate-400 font-bold font-mono">{h.period}</span>
                                  <div className="flex justify-center">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg ${getBallColor(h.number)}`}>{h.number}</div>
                                  </div>
                                  <span className={`text-[10px] font-black text-center ${h.bigSmall === 'Big' ? 'text-yellow-500' : 'text-blue-400'}`}>{h.bigSmall}</span>
                                  <div className="flex justify-end gap-1 items-center">
                                      <div className={`w-2 h-2 rounded-full ${h.color === 'Green' ? 'bg-green-500' : h.color === 'Red' ? 'bg-red-500' : 'bg-purple-500'}`}></div>
                                      <span className="text-[9px] text-slate-500 font-bold uppercase">{h.color}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ) : (
                  <div className="space-y-3">
                      {myHistory.length > 0 ? myHistory.map((item, i) => (
                          <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                              <div>
                                  <div className="text-[10px] font-black text-white uppercase tracking-tighter">{item.game}</div>
                                  <div className="text-[8px] text-slate-500 font-bold mt-0.5">{item.date}</div>
                              </div>
                              <div className="text-right">
                                  <div className={`text-xs font-black ${item.win > 0 ? 'text-green-500' : 'text-red-500'}`}>{item.win > 0 ? `+₹${item.win.toFixed(2)}` : `-₹${item.amount.toFixed(2)}`}</div>
                                  <div className="text-[7px] text-slate-600 font-black uppercase">{item.details}</div>
                              </div>
                          </div>
                      )) : (
                          <div className="text-center py-20 text-slate-600 font-black uppercase text-[10px] italic">No bets found in archive</div>
                      )}
                  </div>
              )}
          </div>
      </div>

      {betDrawerOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#1e293b] rounded-t-[3.5rem] p-10 shadow-[0_-30px_100px_rgba(0,0,0,1)] animate-in slide-in-from-bottom duration-300 border-t border-white/10">
                <div className="flex justify-between items-center mb-10">
                    <h3 className="text-white font-black text-3xl italic gold-text uppercase">STAKE: {selectedBetTarget}</h3>
                    <button onClick={() => setBetDrawerOpen(false)} className="p-4 bg-slate-800 rounded-full active:scale-90"><X size={26}/></button>
                </div>
                <div className="space-y-8">
                    <div className="grid grid-cols-4 gap-3">
                        {[1, 10, 100, 1000].map(amt => (
                            <button key={amt} onClick={() => setBetMoney(amt)} className={`py-5 rounded-2xl font-black text-sm transition-all border-2 ${betMoney === amt ? 'bg-blue-600 border-white text-white shadow-2xl scale-105' : 'bg-[#0f172a] border-white/5 text-slate-500'}`}>₹{amt}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-6 justify-center">
                        <button onClick={() => setBetMultiplier(Math.max(1, betMultiplier - 1))} className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-3xl border border-white/5 shadow-xl">-</button>
                        <span className="text-3xl font-black text-white italic min-w-[3rem] text-center">{betMultiplier}X</span>
                        <button onClick={() => setBetMultiplier(betMultiplier + 1)} className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-3xl border border-white/5 shadow-xl">+</button>
                    </div>
                    <button onClick={confirmBet} className="w-full py-7 rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all text-xl border-t-2 border-white/20">CONFIRM ₹{betMoney * betMultiplier}</button>
                </div>
            </div>
          </div>
      )}

      {showRules && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
              <div className="bg-slate-900 border-2 border-white/10 w-full max-w-sm p-10 rounded-[3.5rem] shadow-2xl animate-in zoom-in">
                   <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                       <h2 className="text-2xl font-black text-yellow-500 uppercase italic tracking-tighter">GAME RULES</h2>
                       <button onClick={() => setShowRules(false)} className="p-2 bg-slate-800 rounded-full"><X size={20}/></button>
                   </div>
                   <div className="space-y-4 text-sm text-slate-300 leading-relaxed font-medium">
                       <p>1. Predict the outcome of the 30-second color and number draw.</p>
                       <p>2. Colors (Green/Red) pay <span className="text-yellow-500 font-bold">2.0x</span>, Numbers pay <span className="text-yellow-500 font-bold">9.0x</span>.</p>
                       <p>3. Violet (0 or 5) acts as a multiplier boost for combined results.</p>
                       <p>4. Big (5-9) and Small (0-4) pay <span className="text-yellow-500 font-bold">2.0x</span>.</p>
                   </div>
              </div>
          </div>
      )}
    </div>
  );
};
export default WinGo;
