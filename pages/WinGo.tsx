import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, History as HistoryIcon, X, Wallet, Volume2, VolumeX, HelpCircle, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { WinGoGameState, GameResult, GameHistoryItem, WinGoHistory } from '../types';
import { subscribeToWinGo, updateBalance, stopAllSounds, toggleMute, getMuteStatus, playSound, shouldForceLoss, getGameHistory, addGameHistory } from '../services/mockFirebase';

const WinGo: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; setView: (v: any) => void; }> = ({ onBack, userBalance, onResult, setView }) => {
  const [gameState, setGameState] = useState<WinGoGameState | null>(null);
  const [activeTab, setActiveTab] = useState<'History' | 'MyBets'>('History');
  const [betDrawerOpen, setBetDrawerOpen] = useState(false);
  const [selectedBetTarget, setSelectedBetTarget] = useState<string | null>(null);
  const [betMoney, setBetMoney] = useState(1);
  const [betMultiplier, setBetMultiplier] = useState(1);
  const [muted, setMuted] = useState(getMuteStatus());
  const [showBalanceError, setShowBalanceError] = useState(false);
  const [pendingBets, setPendingBets] = useState<{target: string; amount: number; period: number}[]>([]);
  const [myHistory, setMyHistory] = useState<GameHistoryItem[]>([]);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const unsubHistory = getGameHistory('WinGo', (data) => {
        if(isMounted.current) setMyHistory(data);
    });
    return () => { isMounted.current = false; stopAllSounds(); unsubHistory(); };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToWinGo((state) => {
        if (!isMounted.current) return;
        
        // Pre-generate fake history if empty to ensure table is always populated
        let finalState = { ...state };
        if (!finalState.history || finalState.history.length === 0) {
            const fakeHistory: WinGoHistory[] = [];
            for (let i = 0; i < 15; i++) {
                const n = Math.floor(Math.random() * 10);
                fakeHistory.push({
                    period: (state.period - 1 - i).toString(),
                    number: n,
                    bigSmall: n >= 5 ? 'Big' : 'Small',
                    color: n === 0 || n === 5 ? 'Violet' : [1, 3, 7, 9].includes(n) ? 'Green' : 'Red'
                });
            }
            finalState.history = fakeHistory;
        }

        setGameState(finalState);
        
        if (finalState.timeLeft <= 5 && finalState.timeLeft > 0 && finalState.status === 'BETTING') {
            playSound('wingo_tick');
        }

        if (finalState.timeLeft === 30 && finalState.lastResult) {
            playSound('wingo_draw');
            const finishedPeriod = finalState.lastResult.period;
            const currentRoundBets = pendingBets.filter(b => b.period.toString() === finishedPeriod);
            
            if (currentRoundBets.length > 0) {
                let totalWin = 0; let totalBet = 0; let hasWin = false;
                const num = finalState.lastResult.number;
                const bS = finalState.lastResult.bigSmall;

                currentRoundBets.forEach(bet => {
                    totalBet += bet.amount;
                    let betWin = false, mult = 0;
                    const forcedLoss = shouldForceLoss(bet.amount, userBalance);
                    
                    if (!forcedLoss) {
                        if (bet.target === 'Green' && [1,3,5,7,9].includes(num)) { betWin = true; mult = num===5?1.5:2; }
                        else if (bet.target === 'Red' && [0,2,4,6,8].includes(num)) { betWin = true; mult = num===0?1.5:2; }
                        else if (bet.target === 'Violet' && [0,5].includes(num)) { betWin = true; mult = 4.5; }
                        else if (bet.target === 'Big' && bS === 'Big') { betWin = true; mult = 2; }
                        else if (bet.target === 'Small' && bS === 'Small') { betWin = true; mult = 2; }
                        else if (bet.target === num.toString()) { betWin = true; mult = 9; }
                    }

                    if (betWin) { hasWin = true; totalWin += bet.amount * mult; }
                    addGameHistory('WinGo', bet.amount, betWin ? bet.amount * mult : 0, `P:${finishedPeriod} | Target:${bet.target} | Result:${num}`);
                });

                if (totalWin > 0) updateBalance(totalWin, 'WIN', 'WinGo Win');
                onResult({ 
                    win: hasWin, 
                    amount: hasWin ? totalWin : totalBet, 
                    game: 'WinGo', 
                    period: finishedPeriod, 
                    resultDetails: [
                        { label: 'Number', value: num.toString(), color: num%2===0?'bg-red-500':'bg-green-500' },
                        { label: 'Size', value: bS, color: bS==='Big'?'bg-yellow-500':'bg-blue-500' }
                    ] 
                });
                setPendingBets(prev => prev.filter(b => b.period.toString() !== finishedPeriod));
            }
        }
    });
    return () => unsubscribe();
  }, [pendingBets, userBalance]);

  const confirmBet = () => {
      const total = betMoney * betMultiplier;
      if (total > userBalance) { 
          setShowBalanceError(true); 
          setTimeout(() => setShowBalanceError(false), 3000); 
          return; 
      }
      updateBalance(-total, 'BET', `WinGo Stake: ${selectedBetTarget}`);
      setBetDrawerOpen(false);
      setPendingBets(prev => [...prev, { target: selectedBetTarget!, amount: total, period: gameState!.period }]);
      playSound('click');
  };

  if (!gameState) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white italic font-black uppercase tracking-widest">Entering Arena...</div>;
  
  const isBetLocked = gameState.timeLeft <= 5;
  const getBallColor = (n: number) => n===0?'bg-purple-500':n===5?'bg-purple-500':[1,3,7,9].includes(n)?'bg-green-500':'bg-red-500';

  return (
    <div className="bg-[#0f172a] min-h-screen pb-24 relative font-sans select-none overflow-x-hidden">
      {/* Insufficient Balance Popup */}
      {showBalanceError && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-red-600 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-red-400 animate-in slide-in-from-top-4">
              <AlertCircle className="text-white" size={20}/>
              <span className="font-black text-xs uppercase tracking-widest">Insufficient Balance!</span>
          </div>
      )}

      <div className="bg-[#1e293b] p-4 sticky top-0 z-20 flex justify-between items-center border-b border-white/5 shadow-xl">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={20} /></button>
            <h1 className="text-lg font-black italic gold-text uppercase">WINGO 30S</h1>
        </div>
        <button onClick={()=>{setMuted(toggleMute())}} className="p-2 bg-slate-800 rounded-xl">
            {muted?<VolumeX size={20} className="text-slate-400"/>:<Volume2 size={20} className="text-slate-400"/>}
        </button>
      </div>

      <div className="bg-[#1e293b] m-4 p-5 rounded-[2rem] flex justify-between items-center shadow-xl border border-white/5">
          <div className="flex items-center gap-4">
              <div className="bg-yellow-500 p-3 rounded-2xl text-slate-900 shadow-lg"><Wallet size={24} /></div>
              <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Balance</p>
                  <h2 className="text-2xl font-black text-white italic">₹{userBalance.toFixed(2)}</h2>
              </div>
          </div>
          <button onClick={() => setView('DEPOSIT')} className="px-5 py-2 bg-blue-600 rounded-xl text-[10px] font-black uppercase text-white shadow-lg active:scale-95 transition-all">Deposit</button>
      </div>
      
      <div className="p-6 bg-gradient-to-br from-blue-900 to-[#0f172a] m-4 rounded-[2.5rem] flex flex-col items-center border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-20 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
         <div className="text-center w-full relative z-10">
            <div className="text-[10px] text-blue-200 uppercase font-black tracking-[0.3em] mb-4">Period: {gameState.period}</div>
            <div className={`text-6xl font-black font-mono tracking-tighter flex justify-center gap-2 ${isBetLocked ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                <span className="bg-black/40 px-3 py-1 rounded-xl">0</span>
                <span className="bg-black/40 px-3 py-1 rounded-xl">0</span>
                <span className="text-blue-500">:</span>
                <span className="bg-black/40 px-3 py-1 rounded-xl">{gameState.timeLeft < 10 ? '0' : Math.floor(gameState.timeLeft/10)}</span>
                <span className="bg-black/40 px-3 py-1 rounded-xl">{gameState.timeLeft % 10}</span>
            </div>
            <div className="flex gap-1.5 justify-center mt-6 overflow-x-auto no-scrollbar">
                {(gameState.history || []).slice(0, 8).map((h, i) => (
                    <div key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-lg shrink-0 ${getBallColor(h.number)}`}>{h.number}</div>
                ))}
            </div>
         </div>
      </div>

      <div className="bg-[#1e293b] rounded-t-[3.5rem] p-8 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] border-t border-white/5 min-h-[600px]">
          <div className="flex gap-3 mb-8">
              <button disabled={isBetLocked} onClick={()=>{setSelectedBetTarget('Green');setBetDrawerOpen(true)}} className="flex-1 py-4 rounded-2xl bg-green-600 font-black uppercase text-xs text-white shadow-lg active:scale-95 disabled:opacity-30">Green</button>
              <button disabled={isBetLocked} onClick={()=>{setSelectedBetTarget('Violet');setBetDrawerOpen(true)}} className="flex-1 py-4 rounded-2xl bg-purple-600 font-black uppercase text-xs text-white shadow-lg active:scale-95 disabled:opacity-30">Violet</button>
              <button disabled={isBetLocked} onClick={()=>{setSelectedBetTarget('Red');setBetDrawerOpen(true)}} className="flex-1 py-4 rounded-2xl bg-red-600 font-black uppercase text-xs text-white shadow-lg active:scale-95 disabled:opacity-30">Red</button>
          </div>
          <div className="grid grid-cols-5 gap-4 mb-8 bg-[#0a0f1d] p-6 rounded-[2.5rem] shadow-inner border border-white/5">
              {[0,1,2,3,4,5,6,7,8,9].map(n=><button disabled={isBetLocked} key={n} onClick={()=>{setSelectedBetTarget(n.toString());setBetDrawerOpen(true)}} className={`aspect-square rounded-full flex items-center justify-center text-xl font-black text-white active:scale-90 transition-all disabled:opacity-30 shadow-lg border-2 border-white/5 ${getBallColor(n)}`}>{n}</button>)}
          </div>
          <div className="flex gap-4 mb-10">
              <button disabled={isBetLocked} onClick={()=>{setSelectedBetTarget('Big');setBetDrawerOpen(true)}} className="flex-1 py-4 rounded-2xl bg-yellow-500 font-black uppercase text-xs text-slate-900 shadow-lg active:scale-95 disabled:opacity-30">BIG</button>
              <button disabled={isBetLocked} onClick={()=>{setSelectedBetTarget('Small');setBetDrawerOpen(true)}} className="flex-1 py-4 rounded-2xl bg-blue-600 font-black uppercase text-xs text-white shadow-lg active:scale-95 disabled:opacity-30">SMALL</button>
          </div>

          <div className="mt-4">
              <div className="flex bg-[#0a0f1d] p-1 rounded-2xl mb-8 border border-white/5">
                  <button onClick={() => setActiveTab('History')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'History' ? 'bg-yellow-500 text-black shadow-lg' : 'text-slate-500'}`}>Game Logs</button>
                  <button onClick={() => setActiveTab('MyBets')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MyBets' ? 'bg-yellow-500 text-black shadow-lg' : 'text-slate-500'}`}>My Record</button>
              </div>

              {activeTab === 'History' ? (
                  <div className="bg-[#0a0f1d] rounded-3xl overflow-hidden border border-white/5">
                      <table className="w-full text-[11px]">
                          <thead className="bg-[#1e293b] text-slate-400 font-black uppercase">
                              <tr>
                                  <th className="py-3 pl-4 text-left">Period</th>
                                  <th className="py-3 text-center">Num</th>
                                  <th className="py-3 text-center">Size</th>
                                  <th className="py-3 pr-4 text-right">Color</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                              {(gameState.history || []).map((h, i) => (
                                  <tr key={i} className="hover:bg-white/5">
                                      <td className="py-3 pl-4 text-slate-500 font-mono">{h.period}</td>
                                      <td className="py-3 text-center">
                                          <div className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-white shadow-md ${getBallColor(h.number)}`}>
                                              {h.number}
                                          </div>
                                      </td>
                                      <td className="py-3 text-center">
                                          <span className={`font-black uppercase ${h.bigSmall === 'Big' ? 'text-yellow-500' : 'text-blue-500'}`}>
                                              {h.bigSmall.charAt(0)}
                                          </span>
                                      </td>
                                      <td className="py-3 pr-4 text-right">
                                          <div className="flex justify-end gap-1">
                                              {h.color === 'Violet' ? (
                                                  <><div className="w-2 h-2 rounded-full bg-purple-500"></div><div className="w-2 h-2 rounded-full bg-red-500"></div></>
                                              ) : (
                                                  <div className={`w-2 h-2 rounded-full ${h.color === 'Green' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                              )}
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              ) : (
                  <div className="space-y-4">
                      {pendingBets.map((pb, i) => (
                          <div key={`p-${i}`} className="bg-blue-600/10 p-5 rounded-[1.5rem] border border-blue-500/20 flex justify-between items-center animate-pulse">
                              <div>
                                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Period: {pb.period}</div>
                                  <div className="text-[8px] text-slate-500 font-bold mt-1 uppercase">Target: {pb.target}</div>
                              </div>
                              <div className="text-right">
                                  <div className="text-lg font-black text-yellow-500">₹{pb.amount}</div>
                                  <div className="text-[8px] text-yellow-500/50 font-black uppercase">Staking...</div>
                              </div>
                          </div>
                      ))}
                      
                      {(myHistory || []).length > 0 ? myHistory.map((item, i) => (
                          <div key={i} className="bg-black/20 p-5 rounded-[1.5rem] border border-white/5 flex justify-between items-center">
                              <div>
                                  <div className="text-[10px] font-black text-white uppercase tracking-tighter italic">{item.details.split(' | ')[0]}</div>
                                  <div className="text-[9px] text-slate-600 font-bold mt-1">{item.date}</div>
                              </div>
                              <div className="text-right">
                                  <div className={`text-lg font-black ${item.win > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {item.win > 0 ? `+₹${item.win.toFixed(2)}` : `-₹${item.amount.toFixed(2)}`}
                                  </div>
                                  <div className="text-[8px] text-slate-700 font-black uppercase">{item.win > 0 ? 'Success' : 'Settled'}</div>
                              </div>
                          </div>
                      )) : pendingBets.length === 0 && (
                          <div className="text-center py-20 text-slate-700 font-black uppercase text-[10px] italic tracking-widest">Empty Archives</div>
                      )}
                  </div>
              )}
          </div>
      </div>

      {betDrawerOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#1e293b] rounded-t-[3.5rem] p-10 shadow-2xl animate-in slide-in-from-bottom border-t border-white/10">
                <div className="flex justify-between items-center mb-10">
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Confirming Stake</p>
                      <h3 className="text-white font-black text-3xl italic gold-text uppercase">ON {selectedBetTarget}</h3>
                    </div>
                    <button onClick={() => setBetDrawerOpen(false)} className="p-4 bg-slate-800 rounded-full active:scale-90"><X size={26}/></button>
                </div>
                <div className="space-y-8">
                    <div className="grid grid-cols-4 gap-3">
                        {[1, 10, 100, 1000].map(amt => (
                            <button key={amt} onClick={() => setBetMoney(amt)} className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${betMoney === amt ? 'bg-blue-600 border-white text-white shadow-xl scale-105' : 'bg-[#0f172a] border-white/5 text-slate-500'}`}>₹{amt}</button>
                        ))}
                    </div>
                    <div className="bg-[#0f172a] p-6 rounded-[2rem] flex items-center justify-between border border-white/5 shadow-inner">
                        <button onClick={() => setBetMultiplier(Math.max(1, betMultiplier - 1))} className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-2xl border border-white/5">-</button>
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Multiplier</p>
                            <span className="text-3xl font-black text-white italic">{betMultiplier}X</span>
                        </div>
                        <button onClick={() => setBetMultiplier(betMultiplier + 1)} className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-2xl border border-white/5">+</button>
                    </div>
                    <button onClick={confirmBet} className="w-full py-6 rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all text-xl border-t-2 border-white/20">CONFIRM ₹{betMoney * betMultiplier}</button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};
export default WinGo;