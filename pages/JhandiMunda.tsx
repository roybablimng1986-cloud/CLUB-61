
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, RotateCw, History } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, shouldForceLoss } from '../services/mockFirebase';
import { GameResult } from '../types';

const SYMBOLS = [
    { id: 'HEART', icon: '♥️', label: 'Heart' },
    { id: 'SPADE', icon: '♠️', label: 'Spade' },
    { id: 'DIAMOND', icon: '♦️', label: 'Diamond' },
    { id: 'CLUB', icon: '♣️', label: 'Club' },
    { id: 'FLAG', icon: '🚩', label: 'Flag' },
    { id: 'FACE', icon: '👤', label: 'Face' }
];

const JhandiMunda: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [selected, setSelected] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [dice, setDice] = useState<string[]>(['🚩','🚩','🚩','🚩','🚩','🚩']);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const roll = () => {
    if (rolling || !selected || userBalance < bet) return;
    updateBalance(-bet, 'BET', 'Jhandi Munda');
    setRolling(true);
    playSound('wheel_spin');

    let count = 0;
    const interval = setInterval(() => {
        setDice(Array.from({length: 6}, () => SYMBOLS[Math.floor(Math.random() * 6)].icon));
        count++;
        if (count > 20) {
            clearInterval(interval);
            if (isMounted.current) finalize();
        }
    }, 100);
  };

  const finalize = () => {
    const outcome = Array.from({length: 6}, () => SYMBOLS[Math.floor(Math.random() * 6)].icon);
    const targetIcon = SYMBOLS.find(s => s.id === selected)!.icon;
    
    let count = outcome.filter(i => i === targetIcon).length;
    
    // Controlled loss
    if (shouldForceLoss(bet, userBalance)) count = 0;

    setDice(outcome);
    setRolling(false);

    const win = count >= 1;
    const mult = count === 1 ? 1.5 : count === 2 ? 3 : count === 3 ? 5 : count >= 4 ? 10 : 0;
    const winAmt = win ? bet * mult : 0;

    if (win) { updateBalance(winAmt, 'WIN', 'Jhandi Win'); playSound('win'); }
    else playSound('loss');

    onResult({ win, amount: win ? winAmt : bet, game: 'Jhandi Munda', resultDetails: [{label: 'Matches', value: count.toString()}] });
    addGameHistory('Jhandi Munda', bet, winAmt, `Matched ${count}`);
    setSelected(null);
  };

  return (
    <div className="bg-[#301934] min-h-screen flex flex-col font-sans text-white select-none">
        <div className="p-4 flex justify-between items-center bg-black/40 border-b border-purple-500/20">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={18}/></button>
            <h1 className="text-xl font-black gold-text italic uppercase">JHANDI MUNDA</h1>
            <div className="text-yellow-500 font-mono text-sm">₹{userBalance.toFixed(2)}</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="grid grid-cols-3 gap-4 mb-16 bg-black/30 p-6 rounded-3xl border border-white/5">
                {dice.map((d, i) => (
                    <div key={i} className={`w-16 h-16 bg-white rounded-xl flex items-center justify-center text-3xl shadow-lg transition-all ${rolling ? 'animate-bounce' : ''}`}>{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-3 gap-3 w-full">
                {SYMBOLS.map(s => (
                    <button key={s.id} onClick={() => !rolling && setSelected(s.id)} className={`py-6 rounded-2xl border-2 transition-all flex flex-col items-center ${selected === s.id ? 'bg-purple-600 border-white scale-105' : 'bg-zinc-900 border-white/5 opacity-60'}`}>
                        <span className="text-2xl">{s.icon}</span>
                        <span className="text-[8px] font-black uppercase mt-1">{s.label}</span>
                    </button>
                ))}
            </div>
        </div>
        <div className="bg-[#111] p-6 pb-12 border-t border-white/10">
            <button onClick={roll} disabled={!selected || rolling} className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl font-black text-xl shadow-xl uppercase">Start Roll</button>
        </div>
    </div>
  );
};
export default JhandiMunda;
