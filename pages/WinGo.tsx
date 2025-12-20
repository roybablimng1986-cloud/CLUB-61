
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, History, HelpCircle, X, Wallet, Volume2, VolumeX } from 'lucide-react';
import { WinGoGameState, GameResult } from '../types';
import { subscribeToWinGo, updateBalance, stopAllSounds, toggleMute, getMuteStatus, playSound } from '../services/mockFirebase';

interface WinGoProps {
  onBack: () => void;
  userBalance: number;
  onResult: (result: GameResult) => void;
  onDeposit: () => void;
}

interface PendingBet {
    target: string;
    amount: number;
    period: number;
}

const WinGo: React.FC<WinGoProps> = ({ onBack, userBalance, onResult, onDeposit }) => {
  // Global Game State
  const [gameState, setGameState] = useState<WinGoGameState | null>(null);
  
  // Local UI State
  const [betDrawerOpen, setBetDrawerOpen] = useState(false);
  const [selectedBetTarget, setSelectedBetTarget] = useState<string | null>(null);
  const [betMoney, setBetMoney] = useState(1);
  const [betMultiplier, setBetMultiplier] = useState(1);
  const [muted, setMuted] = useState(getMuteStatus());
  const [winAnimation, setWinAnimation] = useState<{amount: number, show: boolean, animate: boolean}>({amount: 0, show: false, animate: false});
  const [betAnimation, setBetAnimation] = useState<{amount: number, show: boolean}>({amount: 0, show: false});
  
  // Change to array of pending bets
  const [pendingBets, setPendingBets] = useState<PendingBet[]>([]);

  // Audio Refs for robust handling
  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const isMounted = useRef(true);

  // Initialize Audio
  useEffect(() => {
    isMounted.current = true;
    tickAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3');
    tickAudioRef.current.preload = 'auto';
    tickAudioRef.current.volume = 0.5;

    return () => {
        isMounted.current = false;
        if (tickAudioRef.current) {
            tickAudioRef.current.pause();
            tickAudioRef.current.currentTime = 0;
        }
        stopAllSounds();
    };
  }, []);

  // Connect to Global Game Loop
  useEffect(() => {
    const unsubscribe = subscribeToWinGo((state) => {
        if (!isMounted.current) return; 

        setGameState(state);
        
        // Robust Tick Sound Handling
        if (!muted && state.timeLeft <= 5 && state.timeLeft > 0 && state.status === 'BETTING') {
            if (tickAudioRef.current) {
                tickAudioRef.current.currentTime = 0;
                tickAudioRef.current.play().catch(() => {});
            }
        }

        // Auto close drawer when round reveals
        if (state.status === 'REVEALING') {
            setBetDrawerOpen(false);
        }
        
        // CHECK WIN/LOSS Logic
        if (state.status === 'REVEALING' && state.lastResult) {
            const res = state.lastResult;
            
            const currentRoundBets = pendingBets.filter(b => b.period.toString() === res.period);
            
            if (currentRoundBets.length > 0) {
                let totalWin = 0;
                let totalBetAmount = 0;
                let win = false;

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
  }, [pendingBets, muted]); 

  const handleToggleMute = () => {
      const newMute = toggleMute();
      setMuted(newMute);
  };

  if (!gameState) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">Loading...</div>;

  const { timeLeft, period, history, status } = gameState;

  const openBetDrawer = (target: string) => {
      if (status !== 'BETTING') return;
      if (timeLeft < 5) {
          return;
      }
      setSelectedBetTarget(target);
      setBetDrawerOpen(true);
      setBetMoney(1);
      setBetMultiplier(1);
  };

  const confirmBet = () => {
      const totalAmount = betMoney * betMultiplier;
      if (totalAmount > userBalance) {
          alert("Insufficient Balance! Please deposit.");
          return;
      }
      updateBalance(-totalAmount);
      setBetDrawerOpen(false);
      setPendingBets(prev => [...prev, { target: selectedBetTarget!, amount: totalAmount, period: gameState!.period }]);
      
      // Trigger Animation
      setBetAnimation({ amount: totalAmount, show: true });
      setTimeout(() => {
          if (isMounted.current) setBetAnimation({ amount: 0, show: false })
      }, 800);
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
    <div className="bg-[#0f172a] min-h-screen pb-20 relative font-sans">
      {/* Bet Animation Overlay (Ping / Fade Out) */}
      {betAnimation.show && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
              <div className="transform transition-all duration-500 animate-[ping_0.8s_ease-out_1] flex flex-col items-center">
                   <div className="text-4xl font-black text-red-500 drop-shadow-[0_2px_4px_rgba(255,255,255,0.2)]">
                       -₹{betAnimation.amount}
                   </div>
                   <div className="text-sm font-bold text-white mt-2 bg-black/50 px-2 py-1 rounded">Bet Placed</div>
              </div>
          </div>
      )}

      {/* Win Animation Overlay */}
      {winAnimation.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div 
                  className={`flex flex-col items-center transform transition-all duration-1000 ease-out ${
                      winAnimation.animate ? 'scale-150 opacity-0 translate-y-[-50px]' : 'scale-50 opacity-100 translate-y-0'
                  }`}
              >
                   <h1 className="text-6xl font-black text-yellow-400 drop-shadow-[0_4px_8px_rgba(0,0,0,1)] stroke-black" style={{ WebkitTextStroke: '2px black' }}>
                       +₹{winAnimation.amount.toFixed(2)}
                   </h1>
                   <div className="text-yellow-200 font-bold text-2xl uppercase tracking-[0.2em] mt-2 drop-shadow-md">
                       WINNER
                   </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="bg-[#1e293b] p-4 sticky top-0 z-20 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onBack}><ArrowLeft className="text-white" /></button>
            <h1 className="text-lg font-bold">Win Go 30s</h1>
            <div className="flex gap-2">
                <HelpCircle size={20} className="text-slate-400" />
                <button onClick={handleToggleMute}>
                    {muted ? <VolumeX size={20} className="text-slate-400" /> : <Volume2 size={20} className="text-slate-400" />}
                </button>
            </div>
          </div>
          
          {/* Wallet In-Game */}
          <div className="bg-[#0f172a] rounded-xl p-3 flex items-center justify-between border border-slate-700 shadow-inner">
              <div className="flex items-center gap-3">
                  <div className="bg-yellow-500/20 p-2 rounded-full text-yellow-500">
                      <Wallet size={20} />
                  </div>
                  <div>
                      <p className="text-xs text-slate-400">Balance</p>
                      <h2 className="text-xl font-bold text-white">₹{userBalance.toFixed(2)}</h2>
                  </div>
              </div>
              <button 
                onClick={onDeposit}
                className="px-4 py-1.5 bg-blue-600 rounded-full text-xs font-bold text-white shadow-lg shadow-blue-600/30"
              >
                  Deposit
              </button>
          </div>
      </div>

      {/* Timer Section */}
      <div className="p-4 bg-[url('https://picsum.photos/800/200')] bg-cover bg-center m-4 rounded-xl relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-blue-900/80"></div>
        <div className="relative z-10 flex justify-between items-center text-white">
            <div>
                <p className="text-xs text-blue-200 uppercase tracking-wider flex items-center gap-1">
                    <History size={12}/> Period: {period}
                </p>
                <div className="mt-2">
                    {status === 'BETTING' ? (
                        <>
                            <p className="text-xs text-blue-300">Time Remaining</p>
                            <div className="text-4xl font-bold font-mono tracking-widest mt-1">
                                00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                            </div>
                        </>
                    ) : (
                        <div className="text-2xl font-bold text-yellow-400 animate-pulse mt-2">
                            Revealing...
                        </div>
                    )}
                </div>
            </div>
            <div className="flex flex-col items-end">
                <div className="bg-white/10 backdrop-blur px-3 py-1 rounded-full text-xs mb-2 border border-white/10">
                    How to play
                </div>
                <div className="flex gap-1 mt-2">
                    {history.slice(0, 5).map((h, i) => (
                        <div key={i} className={`w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-[10px] shadow-lg ${
                            h.number === 0 ? 'bg-gradient-to-br from-purple-500 to-red-500' :
                            h.number === 5 ? 'bg-gradient-to-br from-green-500 to-purple-500' :
                            [1,3,7,9].includes(h.number) ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                            {h.number}
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Betting Controls */}
      <div className="bg-[#1e293b] rounded-t-3xl p-4 mt-4 shadow-[0_-5px_20px_rgba(0,0,0,0.3)] min-h-[600px] relative z-10">
        
        {/* Color Buttons */}
        <div className="flex justify-between gap-3 mb-6">
            <button 
                onClick={() => openBetDrawer('Green')}
                className="flex-1 py-3 rounded-tr-xl rounded-bl-xl bg-green-600 shadow-lg shadow-green-900/50 font-bold active:scale-95 transition-transform text-white border-b-4 border-green-800"
            >
                Green
            </button>
            <button 
                onClick={() => openBetDrawer('Violet')}
                className="flex-1 py-3 rounded-lg bg-purple-600 shadow-lg shadow-purple-900/50 font-bold active:scale-95 transition-transform text-white border-b-4 border-purple-800"
            >
                Violet
            </button>
            <button 
                onClick={() => openBetDrawer('Red')}
                className="flex-1 py-3 rounded-tl-xl rounded-br-xl bg-red-600 shadow-lg shadow-red-900/50 font-bold active:scale-95 transition-transform text-white border-b-4 border-red-800"
            >
                Red
            </button>
        </div>

        {/* Number Grid */}
        <div className="grid grid-cols-5 gap-3 mb-6 bg-[#0f172a] p-4 rounded-xl shadow-inner border border-slate-700">
            {[0,1,2,3,4,5,6,7,8,9].map((num) => (
                <button 
                    key={num}
                    onClick={() => openBetDrawer(num.toString())}
                    className={`aspect-square rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg active:scale-95 transition-transform border-2 border-white/10 ${getBallColor(num)}`}
                >
                    {num}
                </button>
            ))}
        </div>

        {/* Big/Small */}
        <div className="flex gap-4 mb-8">
            <button 
                onClick={() => openBetDrawer('Big')}
                className="flex-1 py-3 bg-yellow-500 rounded-full font-bold text-black shadow-lg shadow-yellow-900/30 active:scale-95 transition-transform border-b-4 border-yellow-600"
            >
                Big
            </button>
            <button 
                onClick={() => openBetDrawer('Small')}
                className="flex-1 py-3 bg-blue-500 rounded-full font-bold text-white shadow-lg shadow-blue-900/30 active:scale-95 transition-transform border-b-4 border-blue-600"
            >
                Small
            </button>
        </div>
        
        {/* Pending Bets Section */}
        {pendingBets.length > 0 && (
             <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-6 bg-yellow-500 rounded-full"></div>
                    <h3 className="text-white font-bold text-lg">My Bets</h3>
                </div>
                <div className="space-y-2">
                    {pendingBets.map((bet, idx) => (
                        <div key={idx} className="bg-[#0f172a] border border-slate-700 rounded-xl p-3 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`px-3 py-1 rounded text-xs font-bold text-white ${getTargetColor(bet.target)}`}>
                                    {bet.target}
                                </div>
                                <div className="text-xs text-slate-400">
                                    Period: <span className="text-slate-200">{bet.period}</span>
                                </div>
                            </div>
                            <div className="font-bold text-white">₹{bet.amount}</div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* History Table */}
        <div className="mt-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-red-500 rounded-full"></div>
                <h3 className="text-white font-bold text-lg">Game Record</h3>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-700 shadow-xl">
                <table className="w-full text-center text-sm">
                    <thead className="bg-[#2d3748] text-slate-400 uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-3 font-medium">Period</th>
                            <th className="p-3 font-medium">Number</th>
                            <th className="p-3 font-medium">Big/Small</th>
                            <th className="p-3 font-medium">Color</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 bg-[#1e293b]">
                        {history.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                                <td className="p-3 text-slate-300 font-mono">{row.period}</td>
                                <td className={`p-3 font-bold text-xl bg-clip-text text-transparent ${row.number > 4 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-blue-400 to-cyan-500'}`}>{row.number}</td>
                                <td className={`p-3 font-medium ${row.bigSmall === 'Big' ? 'text-yellow-500' : 'text-blue-500'}`}>{row.bigSmall}</td>
                                <td className="p-3">
                                    <div className={`w-3 h-3 rounded-full mx-auto shadow-[0_0_10px_currentColor] ${
                                        row.color === 'Green' ? 'bg-green-500 text-green-500' :
                                        row.color === 'Red' ? 'bg-red-500 text-red-500' : 'bg-purple-500 text-purple-500'
                                    }`}></div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* Betting Drawer (Modal) */}
      {betDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#1e293b] rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className={`absolute top-0 left-0 w-full h-2 rounded-t-3xl ${getTargetColor(selectedBetTarget)}`}></div>
                
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-white font-bold text-xl">Confirm Bet</h3>
                        <div className={`inline-block px-3 py-0.5 rounded text-xs font-bold mt-1 ${getTargetColor(selectedBetTarget)} text-white`}>
                            {selectedBetTarget}
                        </div>
                    </div>
                    <button onClick={() => setBetDrawerOpen(false)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
                        <X size={20} className="text-slate-400"/>
                    </button>
                </div>

                {/* Money Selection */}
                <div className="mb-6">
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-3">Balance Option</p>
                    <div className="flex gap-2">
                        {[1, 10, 100, 1000].map(amt => (
                            <button
                                key={amt}
                                onClick={() => setBetMoney(amt)}
                                className={`flex-1 py-2 rounded-lg font-bold transition-all ${betMoney === amt ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                {amt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quantity Selection */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Multiplier</p>
                        <p className="text-slate-400 text-xs">x{betMultiplier}</p>
                    </div>
                    <div className="flex gap-2 mb-4">
                        <button onClick={() => setBetMultiplier(Math.max(1, betMultiplier - 1))} className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-xl font-bold hover:bg-slate-700">-</button>
                        <div className="flex-1 bg-[#0f172a] rounded-xl flex items-center justify-center font-mono text-2xl font-bold border border-slate-700 text-white">
                            {betMultiplier}
                        </div>
                        <button onClick={() => setBetMultiplier(betMultiplier + 1)} className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-xl font-bold hover:bg-slate-700">+</button>
                    </div>
                </div>

                {/* Total & Action */}
                <div className="flex gap-4">
                    <button 
                        onClick={() => setBetDrawerOpen(false)}
                        className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmBet}
                        className={`flex-[2] py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all ${getTargetColor(selectedBetTarget)}`}
                    >
                        Total amount ₹{betMoney * betMultiplier}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default WinGo;
