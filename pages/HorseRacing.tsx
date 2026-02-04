
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Trophy, History } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, shouldForceLoss } from '../services/mockFirebase';
import { GameResult } from '../types';

const HORSES = [
    { id: 1, name: 'Stallion', color: 'bg-red-500' },
    { id: 2, name: 'Midnight', color: 'bg-blue-500' },
    { id: 3, name: 'Apollo', color: 'bg-yellow-500' },
    { id: 4, name: 'Storm', color: 'bg-emerald-500' }
];

const HorseRacing: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [selected, setSelected] = useState<number | null>(null);
  const [racing, setRacing] = useState(false);
  const [progress, setProgress] = useState<number[]>([0,0,0,0]);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const start = () => {
    if (racing || !selected || userBalance < bet) return;
    updateBalance(-bet, 'BET', 'Horse Racing');
    setRacing(true);
    playSound('race_rev');

    const interval = setInterval(() => {
        if (!isMounted.current) { clearInterval(interval); return; }
        setProgress(prev => {
            const next = prev.map(p => p + Math.random() * 2);
            const wonIdx = next.findIndex(p => p >= 100);
            if (wonIdx !== -1) {
                clearInterval(interval);
                finalize(wonIdx + 1);
            }
            return next;
        });
    }, 50);
  };

  const finalize = (wonId: number) => {
    let resultId = wonId;
    if (shouldForceLoss(bet, userBalance)) {
        resultId = (selected % 4) + 1;
    }

    setRacing(false);
    const win = selected === resultId;
    const winAmt = win ? bet * 3.8 : 0;

    if (win) { updateBalance(winAmt, 'WIN', 'Horse Derby Win'); playSound('win'); }
    else playSound('loss');

    onResult({ win, amount: win ? winAmt : bet, game: 'Horse Racing', resultDetails: [{label: 'Winner', value: `Horse #${resultId}`}] });
    addGameHistory('Horse Racing', bet, winAmt, `Winner: #${resultId}`);
    setSelected(null);
    setProgress([0,0,0,0]);
  };

  return (
    <div className="bg-[#1a3c1a] min-h-screen flex flex-col font-sans text-white select-none overflow-hidden">
        <div className="p-4 flex justify-between items-center bg-black/40 border-b border-emerald-500/20">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={18}/></button>
            <h1 className="text-xl font-black gold-text italic uppercase">HORSE DERBY</h1>
            <div className="text-yellow-500 font-mono text-sm">₹{userBalance.toFixed(2)}</div>
        </div>
        <div className="flex-1 p-6 flex flex-col justify-center gap-6 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]">
            {HORSES.map((h, i) => (
                <div key={h.id} className="h-16 bg-black/40 rounded-xl relative border border-white/10 overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-emerald-500/10" style={{ width: `${progress[i]}%` }}></div>
                    <div className="h-full flex items-center px-4 relative z-10">
                        <span className="w-8 font-black">#{h.id}</span>
                        <div className="flex-1 relative">
                            <div className="absolute transition-all duration-75" style={{ left: `calc(${progress[i]}% - 30px)` }}>
                                <span className={`text-3xl ${racing ? 'animate-bounce' : ''}`}>🐎</span>
                            </div>
                        </div>
                        <div className="h-full w-2 bg-red-600 absolute right-0"></div>
                    </div>
                </div>
            ))}
        </div>
        <div className="bg-[#111] p-6 pb-12 border-t border-white/10">
            <div className="grid grid-cols-4 gap-2 mb-6">
                {HORSES.map(h => (
                    <button key={h.id} onClick={() => !racing && setSelected(h.id)} className={`py-4 rounded-xl font-black text-xs border-2 transition-all ${selected === h.id ? 'bg-emerald-600 border-white scale-105' : 'bg-zinc-900 border-white/5 opacity-60'}`}>#{h.id}</button>
                ))}
            </div>
            <button onClick={start} disabled={!selected || racing} className="w-full py-5 bg-gradient-to-r from-emerald-600 to-green-700 rounded-2xl font-black text-xl shadow-xl uppercase">Start Derby</button>
        </div>
    </div>
  );
};
export default HorseRacing;
