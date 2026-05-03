import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, History as HistoryIcon, X, Wallet, Volume2, VolumeX, HelpCircle, Clock, ChevronRight, AlertCircle, RotateCcw } from 'lucide-react';
import { WinGoGameState, GameResult, GameHistoryItem, WinGoHistory } from '../types';
import { subscribeToWinGo, updateBalance, stopAllSounds, toggleMute, getMuteStatus, playSound, shouldForceLoss, getGameHistory, addGameHistory, subscribeToWinGoBets, db, auth, addGameBet, getClockOffset } from '../services/supabaseService';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import WinGoResultPopup from '../components/WinGoResultPopup';
import HowToPlay from '../components/HowToPlay';
import { useStabilizedTimer } from '../hooks/useTimer';

const WinGo: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; setView: (v: any) => void; }> = ({ onBack, userBalance, onResult, setView }) => {
  const [gameState, setGameState] = useState<WinGoGameState>({
    status: 'BETTING',
    period: new Date().getTime().toString().slice(-6),
    endTime: Date.now() + 30000,
    history: []
  });
  const localTimeLeft = useStabilizedTimer(gameState.endTime);
  const [activeTab, setActiveTab] = useState<'History' | 'MyBets' | 'AllBets'>('History');
  const [winGoResult, setWinGoResult] = useState<any | null>(null);

  const [betDrawerOpen, setBetDrawerOpen] = useState(false);
  const [selectedBetTarget, setSelectedBetTarget] = useState<string | null>(null);
  const [betMoney, setBetMoney] = useState(1);
  const [betMultiplier, setBetMultiplier] = useState(1);
  const [muted, setMuted] = useState(getMuteStatus());
  const [showBalanceError, setShowBalanceError] = useState(false);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [myHistory, setMyHistory] = useState<GameHistoryItem[]>([]);
  const [allBets, setAllBets] = useState<any[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const isMounted = useRef(true);

  // Initial Fake History
  useEffect(() => {
    const fakeHistory: WinGoHistory[] = [];
    for (let i = 0; i < 20; i++) {
        const n = Math.floor(Math.random() * 10);
        fakeHistory.push({
            period: (parseInt(gameState.period) - i - 1).toString(),
            number: n,
            bigSmall: n >= 5 ? 'Big' : 'Small',
            color: n === 0 || n === 5 ? 'Violet' : [1, 3, 7, 9].includes(n) ? 'Green' : 'Red'
        });
    }
    setGameState(prev => ({ ...prev, history: fakeHistory }));

    const unsubHistory = getGameHistory('WinGo', (data) => {
        if(isMounted.current) setMyHistory(data);
    });
    return () => { isMounted.current = false; unsubHistory(); stopAllSounds(); };
  }, []);

  // Local Game Engine
  useEffect(() => {
    const interval = setInterval(() => {
        const now = Date.now();
        if (gameState.status === 'BETTING') {
            if (now >= gameState.endTime - 5000) {
                // LOCK BETS / REVEALING
                setGameState(prev => ({ ...prev, status: 'REVEALING' }));
                handleRevealing();
            } else if (localTimeLeft <= 5 && localTimeLeft > 0) {
                playSound('wingo_tick');
            }
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.status, gameState.endTime, localTimeLeft]);

  async function handleRevealing() {
    playSound('wingo_draw');
    await new Promise(r => setTimeout(r, 2000));
    if (!isMounted.current) return;

    const num = Math.floor(Math.random() * 10);
    const bigSmall = num >= 5 ? 'Big' : 'Small';
    const colorFinal = num === 0 || num === 5 ? 'Violet' : [1, 3, 7, 9].includes(num) ? 'Green' : 'Red';

    const result: WinGoHistory = {
        period: gameState.period,
        number: num,
        bigSmall,
        color: colorFinal
    };

    processUserResult(result);

    // Reset for next round
    setGameState(prev => ({
        status: 'BETTING',
        period: (parseInt(prev.period) + 1).toString(),
        endTime: Date.now() + 30000,
        history: [result, ...prev.history].slice(0, 50)
    }));
    setMyBets([]);
    setAllBets([]);
  }

  function processUserResult(result: any) {
    const num = result.number;
    const bS = result.bigSmall;
    let totalWin = 0;
    let totalBet = 0;
    let hasWin = false;

    // Fixed Win/Loss features - ensure all checks are robust
    myBets.forEach(bet => {
        totalBet += bet.amount;
        let betWin = false, mult = 0;
        
        const isNum0 = num === 0;
        const isNum5 = num === 5;

        // Color Logic
        if (bet.target === 'Green') {
            if ([1, 3, 7, 9].includes(num)) { betWin = true; mult = 2; }
            else if (isNum5) { betWin = true; mult = 1.5; }
        }
        else if (bet.target === 'Red') {
            if ([2, 4, 6, 8].includes(num)) { betWin = true; mult = 2; }
            else if (isNum0) { betWin = true; mult = 1.5; }
        }
        else if (bet.target === 'Violet') {
            if ([0, 5].includes(num)) { betWin = true; mult = 4.5; }
        }
        // Size Logic
        else if (bet.target === 'Big' && bS === 'Big') { betWin = true; mult = 2; }
        else if (bet.target === 'Small' && bS === 'Small') { betWin = true; mult = 2; }
        // Number Logic
        else if (bet.target === num.toString()) { betWin = true; mult = 9; }

        if (betWin) {
            hasWin = true;
            totalWin += bet.amount * mult;
        }
    });

    if (totalWin > 0) {
        updateBalance(totalWin, 'WIN', 'WinGo Win');
        playSound('win');
    }
    if (totalBet > 0) {
        addGameHistory('WinGo', totalBet, totalWin, `P:${result.period} | Result:${num}`);
        setWinGoResult({
            win: hasWin,
            amount: hasWin ? totalWin : 0,
            period: result.period,
            number: num,
            bigSmall: bS,
            color: result.color,
            target: myBets.map(b => b.target).join(', ')
        });
        
        // Trigger result popup with delay for impact
        setTimeout(() => {
            onResult({ 
                win: hasWin, 
                amount: totalWin, 
                game: 'WinGo',
                resultDetails: [
                    { label: 'Period', value: result.period },
                    { label: 'Result', value: `${num} (${bS})`, color: result.color === 'Green' ? 'text-green-500' : result.color === 'Red' ? 'text-red-500' : 'text-purple-500' }
                ]
            });
        }, 300);
    }
  }

  const confirmBet = async () => {
      const total = betMoney * betMultiplier;
      if (total > userBalance) { 
          setShowBalanceError(true); 
          setTimeout(() => setShowBalanceError(false), 3000); 
          return; 
      }
      
      try {
          const betData = {
              target: selectedBetTarget,
              amount: total,
              period: gameState.period,
              id: Date.now(),
              username: 'You',
              timestamp: Date.now()
          };
          
          setMyBets(prev => [betData, ...prev]);
          setAllBets(prev => [betData, ...prev]);
          updateBalance(-total, 'BET', `WinGo Stake: ${selectedBetTarget}`);
          setBetDrawerOpen(false);
          playSound('bet_place');
      } catch (e) {
          console.error("WinGo bet error:", e);
      }
  };

  const cancelLastBet = async () => {
      if (myBets.length === 0 || isBetLocked) return;
      const lastBet = myBets[0];
      setMyBets(prev => prev.slice(1));
      setAllBets(prev => prev.filter(b => b.id !== lastBet.id));
      updateBalance(lastBet.amount, 'WIN', 'Bet Cancelled');
      playSound('click');
  };

  if (!gameState) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white italic font-black uppercase tracking-widest">Entering Arena...</div>;
  
  const isBetLocked = localTimeLeft <= 5;
  const getBallColor = (n: number) => n===0?'bg-purple-500':n===5?'bg-purple-500':[1,3,7,9].includes(n)?'bg-green-500':'bg-red-500';

  return (
    <div className="bg-[#0f172a] min-h-screen pb-24 relative font-sans select-none overflow-x-hidden">
      <WinGoResultPopup result={winGoResult} onClose={() => setWinGoResult(null)} />
      <HowToPlay 
          isOpen={showHelp} 
          onClose={() => setShowHelp(false)} 
          title="WinGo Rules"
          rules={[
              "Predict the number (0-9), size (Big/Small), or color (Red/Green/Violet).",
              "Green: 1, 3, 7, 9. Red: 2, 4, 6, 8. Violet: 0, 5.",
              "Small: 0-4. Big: 5-9.",
              "Bets are locked when the timer reaches 5 seconds.",
              "Calculated based on standard lottery rules."
          ]}
          payouts={[
              { label: "Number (0-9)", value: "9.0x" },
              { label: "Big / Small", value: "2.0x" },
              { label: "Color (R/G)", value: "2.0x" },
              { label: "Violet (0/5)", value: "4.5x" }
          ]}
      />
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
        <div className="flex gap-2">
            <button onClick={() => setShowHelp(true)} className="p-2 bg-slate-800 rounded-xl text-yellow-500">
                <HelpCircle size={20} />
            </button>
            <button onClick={()=>{setMuted(toggleMute())}} className="p-2 bg-slate-800 rounded-xl">
                {muted?<VolumeX size={20} className="text-slate-400"/>:<Volume2 size={20} className="text-slate-400"/>}
            </button>
        </div>
      </div>

      <div className="bg-[#1e293b] m-4 p-5 rounded-[2rem] flex justify-between items-center shadow-xl border border-white/5">
          <div className="flex items-center gap-4">
              <div className="bg-yellow-500 p-3 rounded-2xl text-slate-900 shadow-lg"><Wallet size={24} /></div>
              <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Balance</p>
                  <h2 className="text-2xl font-black text-white italic">₹{userBalance.toFixed(2)}</h2>
              </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView('DEPOSIT')} className="px-5 py-2 bg-blue-600 rounded-xl text-[10px] font-black uppercase text-white shadow-lg active:scale-95 transition-all">Deposit</button>
          </div>
      </div>
      
      <div className="p-6 bg-gradient-to-br from-blue-900 to-[#0f172a] m-4 rounded-[2.5rem] flex flex-col items-center border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-20 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
         <div className="text-center w-full relative z-10">
            <div className="text-[10px] text-blue-200 uppercase font-black tracking-[0.3em] mb-4">Period: {gameState.period}</div>
            <div className={`text-6xl font-black font-mono tracking-tighter flex justify-center gap-2 ${(isBetLocked || (localTimeLeft === 0 && gameState.status === 'BETTING')) ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                <span className="bg-black/40 px-3 py-1 rounded-xl">0</span>
                <span className="bg-black/40 px-3 py-1 rounded-xl">0</span>
                <span className="text-blue-500">:</span>
                <span className="bg-black/40 px-3 py-1 rounded-xl">{localTimeLeft < 10 ? '0' : Math.floor(localTimeLeft/10)}</span>
                <span className="bg-black/40 px-3 py-1 rounded-xl">{localTimeLeft % 10}</span>
            </div>
            {localTimeLeft === 0 && gameState.status === 'BETTING' && (
                <div className="text-[10px] text-red-500 font-black uppercase mt-2 animate-bounce">Calculating Result...</div>
            )}
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

          <div className="mt-4 pb-20">
              <div className="flex bg-[#0a0f1d] p-1 rounded-2xl mb-8 border border-white/5 relative">
                  <button onClick={() => setActiveTab('History')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'History' ? 'bg-yellow-500 text-black shadow-lg' : 'text-slate-500'}`}>Game Logs</button>
                  <button onClick={() => setActiveTab('AllBets')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'AllBets' ? 'bg-yellow-500 text-black shadow-lg' : 'text-slate-500'}`}>All Bets</button>
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
              ) : activeTab === 'AllBets' ? (
                  <div className="space-y-3">
                      {allBets.map((b, i) => (
                          <div key={b.id || `wingo-all-${i}-${b.uid}`} className="bg-[#111827] p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                                      {b.username?.charAt(0).toUpperCase() || 'U'}
                                  </div>
                                  <div>
                                      <div className="text-[10px] font-black text-white uppercase tracking-tighter italic">{b.username || 'Anonymous'}</div>
                                      <div className="text-[8px] text-slate-500 font-bold uppercase">Bet on {b.target}</div>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="text-sm font-black text-yellow-500">₹{b.amount}</div>
                                  <div className="text-[8px] text-slate-600 font-bold uppercase">{new Date(b.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</div>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="space-y-4">
                      {myBets.map((pb, i) => (
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
                      )) : myBets.length === 0 && (
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

      {myBets.length > 0 && !isBetLocked && (
          <button 
              onClick={cancelLastBet} 
              className="fixed bottom-10 right-6 w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all border-2 border-white/20 z-50 animate-bounce"
              title="Return Last Bet"
          >
              <RotateCcw size={28} className="text-white" />
          </button>
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
};
export default WinGo;