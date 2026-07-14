
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, History, HelpCircle, X, Wallet, Volume2, VolumeX, ChevronRight, RotateCcw, Trash2 } from 'lucide-react';
import { WinGoGameState, GameResult } from '../types';
import { subscribeToWinGo, updateBalance, stopAllSounds, toggleMute, getMuteStatus, playSound } from '../services/supabaseService';

interface WinGoProps {
  onBack: () => void;
  userBalance: number;
  onResult: (result: GameResult) => void;
  onDeposit: () => void;
}

interface PendingBet {
    id: string;
    target: string;
    amount: number;
    period: number;
}

const WinGo: React.FC<WinGoProps> = ({ onBack, userBalance, onResult, onDeposit }) => {
  const [gameState, setGameState] = useState<WinGoGameState | null>(null);
  const [betDrawerOpen, setBetDrawerOpen] = useState(false);
  const [selectedBetTarget, setSelectedBetTarget] = useState<string | null>(null);
  const [betMoney, setBetMoney] = useState(1);
  const [betMultiplier, setBetMultiplier] = useState(1);
  const [customAmount, setCustomAmount] = useState('');
  const [muted, setMuted] = useState(getMuteStatus());
  const [winAnimation, setWinAnimation] = useState<{amount: number, show: boolean, animate: boolean}>({amount: 0, show: false, animate: false});
  const [betAnimation, setBetAnimation] = useState<{amount: number, show: boolean}>({amount: 0, show: false});
  const [pendingBets, setPendingBets] = useState<PendingBet[]>([]);
  
  const isMounted = useRef(true);
  const lastTickRef = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    return () => {
        isMounted.current = false;
        stopAllSounds();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToWinGo((state) => {
        if (!isMounted.current) return; 

        setGameState(state);
        
        if (state.timeLeft <= 5 && state.timeLeft > 0 && state.status === 'BETTING' && state.timeLeft !== lastTickRef.current) {
            playSound('tick');
            lastTickRef.current = state.timeLeft;
        }

        if (state.status === 'REVEALING') {
            setBetDrawerOpen(false);
        }
        
        if (state.status === 'REVEALING' && state.lastResult) {
            const res = state.lastResult;
            const currentRoundBets = pendingBets.filter(b => b.period.toString() === res.period);
            
            if (currentRoundBets.length > 0) {
                let totalWin = 0;
                let totalBetAmount = 0;
                let win = false;
                const details: any[] = [];

                currentRoundBets.forEach(bet => {
                    const { target, amount } = bet;
                    totalBetAmount += amount;
                    let betWin = false;
                    let multiplier = 0;

                    if (target === 'Green') {
                        if ([1, 3, 5, 7, 9].includes(res.number)) {
                            betWin = true;
                            multiplier = res.number === 5 ? 1.5 : 2; 
                        }
                    } 
                    else if (target === 'Red') {
                        if ([0, 2, 4, 6, 8].includes(res.number)) {
                            betWin = true;
                            multiplier = res.number === 0 ? 1.5 : 2; 
                        }
                    }
                    else if (target === 'Violet') {
                        if ([0, 5].includes(res.number)) {
                            betWin = true;
                            multiplier = 4.5;
                        }
                    }
                    else if (target === 'Big' && res.bigSmall === 'Big') {
                        betWin = true;
                        multiplier = 2;
                    }
                    else if (target === 'Small' && res.bigSmall === 'Small') {
                        betWin = true;
                        multiplier = 2;
                    }
                    else if (target === res.number.toString()) {
                        betWin = true;
                        multiplier = 9;
                    }

                    if (betWin) {
                        win = true;
                        totalWin += amount * multiplier;
                    }
                });

                if (totalWin > 0) {
                     updateBalance(totalWin, 'WIN', 'WinGo Win');
                     if (isMounted.current) {
                         setWinAnimation({ amount: totalWin, show: true, animate: false });
                         setTimeout(() => {
                            if(isMounted.current) setWinAnimation({ amount: totalWin, show: true, animate: true });
                         }, 50);
                         
                         setTimeout(() => {
                             if(isMounted.current) setWinAnimation({ amount: 0, show: false, animate: false })
                         }, 2500);
                     }
                }

                if (isMounted.current) {
                    onResult({
                        win: win,
                        amount: win ? totalWin : totalBetAmount, 
                        game: 'WinGo',
                        period: res.period.toString(),
                        resultDetails: [
                            { label: 'Number', value: res.number.toString(), color: getBallColor(res.number).split(' ')[0] },
                            { label: 'Size', value: res.bigSmall, color: res.bigSmall === 'Big' ? 'bg-yellow-500' : 'bg-blue-500' }
                        ]
                    });
                    setPendingBets(prev => prev.filter(b => b.period.toString() !== res.period));
                }
            }
        }
    });
    return () => unsubscribe();
  }, [pendingBets]); 

  if (!gameState) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white font-black animate-pulse uppercase tracking-widest">Syncing Casino State...</div>;

  const { timeLeft, period, history, status } = gameState;

  const openBetDrawer = (target: string) => {
      if (status !== 'BETTING') return;
      if (timeLeft < 5) return;
      setSelectedBetTarget(target);
      setBetDrawerOpen(true);
      setBetMoney(1);
      setBetMultiplier(1);
      setCustomAmount('');
  };

  const confirmBet = () => {
      let baseAmount = betMoney;
      if (customAmount && !isNaN(parseFloat(customAmount))) {
          baseAmount = parseFloat(customAmount);
      }
      
      const totalAmount = baseAmount * betMultiplier;
      if (totalAmount > userBalance) {
          alert("Insufficient Balance!");
          return;
      }
      if (totalAmount <= 0) return;

      updateBalance(-totalAmount);
      setBetDrawerOpen(false);
      setPendingBets(prev => [...prev, { 
          id: Math.random().toString(36).substr(2, 9),
          target: selectedBetTarget!, 
          amount: totalAmount, 
          period: gameState!.period 
      }]);
      setBetAnimation({ amount: totalAmount, show: true });
      setTimeout(() => {
          if (isMounted.current) setBetAnimation({ amount: 0, show: false })
      }, 800);
  };

  const cancelBet = (betId: string) => {
      const bet = pendingBets.find(b => b.id === betId);
      if (bet) {
          updateBalance(bet.amount, 'GIFT', 'Bet Refund'); // Refund as gift/balance
          setPendingBets(prev => prev.filter(b => b.id !== betId));
          playSound('click');
      }
  };

  const getBallColor = (num: number) => {
      if (num === 0) return 'bg-gradient-to-br from-purple-500 to-red-500'; 
      if (num === 5) return 'bg-gradient-to-br from-green-500 to-purple-500'; 
      if ([1,3,7,9].includes(num)) return 'bg-green-500';
      return 'bg-red-500';
  }

  const getTargetColor = (target: string | null) => {
      if (!target) return 'bg-blue-600';
      if (target === 'Green') return 'bg-green-600';
      if (target === 'Red') return 'bg-red-600';
      if (target === 'Violet') return 'bg-purple-600';
      if (target === 'Big') return 'bg-yellow-500';
      if (target === 'Small') return 'bg-blue-500';
      if (!isNaN(Number(target))) return getBallColor(Number(target));
      return 'bg-blue-600';
  };

  return (
    <div className="bg-[#0f172a] min-h-screen pb-24 relative font-sans w-full max-w-md mx-auto border-x border-slate-800/80 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
      {/* HUD Overlays */}
      {betAnimation.show && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
              <div className="transform transition-all duration-500 animate-[ping_0.8s_ease-out_1] flex flex-col items-center">
                   <div className="text-5xl font-black text-red-500 drop-shadow-lg">-₹{betAnimation.amount}</div>
              </div>
          </div>
      )}

      {winAnimation.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className={`flex flex-col items-center transform transition-all duration-1000 ease-out ${winAnimation.animate ? 'scale-150 opacity-0 translate-y-[-50px]' : 'scale-50 opacity-100 translate-y-0'}`}>
                   <h1 className="text-7xl font-black text-yellow-400" style={{ WebkitTextStroke: '2px black' }}>+₹{winAnimation.amount.toFixed(2)}</h1>
                   <div className="text-yellow-200 font-bold text-2xl uppercase tracking-[0.2em] mt-2 bg-black/40 px-6 py-1 rounded-full backdrop-blur-sm">WINNER</div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="bg-[#1e293b] p-4 sticky top-0 z-20 shadow-lg flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><ArrowLeft className="text-white" size={20} /></button>
            <h1 className="text-lg font-black italic tracking-tighter text-white">Win Go 30s</h1>
          </div>
          <button onClick={() => setMuted(toggleMute())} className="p-2 bg-slate-800 rounded-full">
            {muted ? <VolumeX className="text-slate-400" size={18}/> : <Volume2 className="text-slate-400" size={18}/>}
          </button>
      </div>

      {/* Balance Bar */}
      <div className="bg-[#1e293b] m-4 p-4 rounded-2xl border border-slate-700 flex justify-between items-center shadow-xl">
          <div className="flex items-center gap-4">
              <div className="bg-yellow-500 p-2.5 rounded-xl text-slate-900 shadow-lg shadow-yellow-500/20"><Wallet size={20} /></div>
              <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Balance</p>
                  <h2 className="text-2xl font-black text-white">₹{userBalance.toFixed(2)}</h2>
              </div>
          </div>
          <button onClick={onDeposit} className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl text-xs font-black uppercase text-white shadow-lg active:scale-95 transition-transform">Deposit</button>
      </div>

      {/* Timer Card */}
      <div className="p-6 bg-gradient-to-br from-blue-900 to-[#0f172a] m-4 rounded-3xl relative overflow-hidden shadow-2xl flex flex-col justify-center items-center text-white min-h-[160px] border border-white/5">
          <div className="absolute top-0 right-0 p-20 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <p className="text-[10px] text-blue-200 uppercase font-black tracking-[0.3em] mb-4">Period ID: {period}</p>
          {status === 'BETTING' ? (
              <div className="text-6xl font-black font-mono tracking-tighter flex gap-2">
                <span className="bg-black/40 px-3 py-1 rounded-xl">0</span>
                <span className="bg-black/40 px-3 py-1 rounded-xl">0</span>
                <span className="text-blue-500">:</span>
                <span className="bg-black/40 px-3 py-1 rounded-xl">{timeLeft < 10 ? `0` : Math.floor(timeLeft/10)}</span>
                <span className="bg-black/40 px-3 py-1 rounded-xl">{timeLeft % 10}</span>
              </div>
          ) : (
              <div className="text-3xl font-black text-yellow-400 animate-pulse tracking-widest uppercase">REVEALING...</div>
          )}
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-60">
              {history.slice(0, 8).map((h, i) => (
                  <div key={i} className={`w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black shadow-lg ${getBallColor(h.number)}`}>{h.number}</div>
              ))}
          </div>
      </div>

      {/* Betting Zone */}
      <div className="bg-[#1e293b] rounded-t-[3rem] p-6 mt-6 shadow-[0_-10px_40px_rgba(0,0,0,0.4)] border-t border-slate-700/50 relative z-10 pb-12">
        <div className="flex justify-between gap-3 mb-8">
            <button onClick={() => openBetDrawer('Green')} className="flex-1 py-4 rounded-2xl bg-green-600 font-black uppercase text-xs text-white shadow-lg active:scale-95 transition-all shadow-green-900/40">Green</button>
            <button onClick={() => openBetDrawer('Violet')} className="flex-1 py-4 rounded-2xl bg-purple-600 font-black uppercase text-xs text-white shadow-lg active:scale-95 transition-all shadow-purple-900/40">Violet</button>
            <button onClick={() => openBetDrawer('Red')} className="flex-1 py-4 rounded-2xl bg-red-600 font-black uppercase text-xs text-white shadow-lg active:scale-95 transition-all shadow-red-900/40">Red</button>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-8 bg-[#0f172a] p-6 rounded-[2rem] shadow-inner border border-slate-700/30">
            {[0,1,2,3,4,5,6,7,8,9].map((num) => (
                <button key={num} onClick={() => openBetDrawer(num.toString())} className={`aspect-square rounded-full flex items-center justify-center text-xl font-black text-white border-2 border-white/5 active:scale-90 transition-all shadow-lg ${getBallColor(num)}`}>{num}</button>
            ))}
        </div>

        <div className="flex gap-4 mb-10">
            <button onClick={() => openBetDrawer('Big')} className="flex-1 py-4 bg-yellow-500 rounded-2xl font-black uppercase text-sm text-slate-900 shadow-lg active:scale-95 transition-all shadow-yellow-900/20">Big</button>
            <button onClick={() => openBetDrawer('Small')} className="flex-1 py-4 bg-blue-500 rounded-2xl font-black uppercase text-sm text-white shadow-lg active:scale-95 transition-all shadow-blue-900/20">Small</button>
        </div>
        
        {/* Active Bets Section (Refund enabled) */}
        {pendingBets.length > 0 && (
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-white font-black text-sm uppercase tracking-widest mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                    My Current Stakes
                  </div>
                  <span className="text-[9px] text-slate-500 italic">Cancellable during betting phase</span>
                </h3>
                <div className="space-y-3">
                    {pendingBets.map((bet) => (
                        <div key={bet.id} className="bg-[#0f172a] border border-slate-700/50 rounded-2xl p-4 flex justify-between items-center shadow-md">
                            <div className="flex items-center gap-4">
                                <div className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase text-white shadow-md ${getTargetColor(bet.target)}`}>{bet.target}</div>
                                <div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">Period: {bet.period}</div>
                                    <div className="font-black text-white">₹{bet.amount}</div>
                                </div>
                            </div>
                            <button 
                                onClick={() => cancelBet(bet.id)}
                                className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all active:scale-90"
                                title="Cancel Bet"
                            >
                                <RotateCcw size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Original Detailed History Table */}
        <div className="mb-20">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <History size={18} className="text-yellow-500"/>
                Game Record
              </h3>
              <div className="text-slate-500 text-[10px] font-black uppercase flex items-center gap-1">Details <ChevronRight size={12}/></div>
            </div>
            
            <div className="bg-[#0f172a] rounded-3xl overflow-hidden border border-slate-700/50 shadow-inner">
                <table className="w-full text-[11px]">
                    <thead className="bg-[#1e293b] text-slate-400 font-black uppercase border-b border-slate-700">
                        <tr>
                            <th className="py-3 pl-4 text-left">Period</th>
                            <th className="py-3 text-center">Number</th>
                            <th className="py-3 text-center">Size</th>
                            <th className="py-3 pr-4 text-right">Color</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {history.slice(0, 15).map((h, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="py-3 pl-4 text-slate-500 font-mono">{h.period}</td>
                                <td className="py-3 text-center">
                                    <div className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-white shadow-md ${getBallColor(h.number)}`}>
                                        {h.number}
                                    </div>
                                </td>
                                <td className="py-3 text-center">
                                    <span className={`font-black uppercase ${h.bigSmall === 'Big' ? 'text-yellow-500' : 'text-blue-500'}`}>
                                        {h.bigSmall === 'Big' ? 'B' : 'S'}
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
        </div>
      </div>

      {/* Bet Confirm Modal with Custom Amount */}
      {betDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#1e293b] rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 border-t border-slate-700">
                <div className="flex justify-between items-center mb-8">
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Confirming Stake</p>
                      <h3 className="text-white font-black text-2xl italic tracking-tighter">Stake on {selectedBetTarget}</h3>
                    </div>
                    <button onClick={() => setBetDrawerOpen(false)} className="p-3 bg-slate-800 rounded-full border border-slate-700 hover:bg-slate-700 transition-colors"><X size={20} className="text-slate-400"/></button>
                </div>

                <div className="space-y-6">
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3 ml-1">Select Unit</p>
                      <div className="flex gap-2 mb-4">
                          {[1, 10, 100, 1000].map(amt => (
                              <button key={amt} onClick={() => { setBetMoney(amt); setCustomAmount(''); }} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all border ${betMoney === amt && !customAmount ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-[#0f172a] border-slate-800 text-slate-500 hover:text-slate-300'}`}>₹{amt}</button>
                          ))}
                      </div>
                      
                      <div className="relative">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest absolute -top-2 left-4 bg-[#1e293b] px-2">Custom Amount</label>
                          <input 
                            type="number"
                            placeholder="Enter custom stake amount"
                            value={customAmount}
                            onChange={(e) => {
                                setCustomAmount(e.target.value);
                                setBetMoney(0);
                            }}
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white font-black text-lg focus:border-blue-500 outline-none shadow-inner"
                          />
                      </div>
                    </div>

                    <div className="bg-[#0f172a] p-6 rounded-3xl flex items-center justify-between border border-slate-800 shadow-inner">
                        <button onClick={() => setBetMultiplier(Math.max(1, betMultiplier - 1))} className="bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-black border border-slate-700 active:scale-90 transition-transform">-</button>
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Multiplier</p>
                            <span className="text-white font-black text-3xl font-mono">{betMultiplier}x</span>
                        </div>
                        <button onClick={() => setBetMultiplier(betMultiplier + 1)} className="bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-black border border-slate-700 active:scale-90 transition-transform">+</button>
                    </div>

                    <button 
                      onClick={confirmBet} 
                      className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all active:scale-95 ${getTargetColor(selectedBetTarget)}`}
                    >
                      Confirm Stake ₹{((customAmount ? parseFloat(customAmount) : betMoney) * betMultiplier) || 0}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default WinGo;
