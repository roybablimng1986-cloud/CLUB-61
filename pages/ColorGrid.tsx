
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, RotateCw, History } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, shouldForceLoss } from '../services/mockFirebase';
import { GameResult } from '../types';

const COLORS = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'];

const ColorGrid: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [grid, setGrid] = useState<number[]>(Array(9).fill(0));
  const [shuffling, setShuffling] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const start = () => {
    if (shuffling || selectedColor === null || userBalance < bet) return;
    updateBalance(-bet, 'BET', 'Color Grid');
    setShuffling(true);
    playSound('click');

    let count = 0;
    const interval = setInterval(() => {
        setGrid(Array.from({length: 9}, () => Math.floor(Math.random() * 4)));
        count++;
        if (count > 15) {
            clearInterval(interval);
            if (isMounted.current) finalize();
        }
    }, 100);
  };

  const finalize = () => {
    const outcome = Array.from({length: 9}, () => Math.floor(Math.random() * 4));
    
    // Force loss logic
    if (shouldForceLoss(bet, userBalance)) {
        const target = selectedColor;
        outcome.forEach((v, i) => { if(v === target) outcome[i] = (v + 1) % 4; });
    }

    setGrid(outcome);
    setShuffling(false);

    const matches = outcome.filter(c => c === selectedColor).length;
    const win = matches >= 3;
    const winAmt = win ? bet * (matches === 3 ? 2 : matches === 4 ? 4 : 10) : 0;

    if (win) { updateBalance(winAmt, 'WIN', 'Color Match Win'); playSound('win'); }
    else playSound('loss');

    onResult({ win, amount: win ? winAmt : bet, game: 'Color Grid', resultDetails: [{label: 'Matches', value: matches.toString()}] });
    addGameHistory('Color Grid', bet, winAmt, `Matched ${matches} tiles`);
    setSelectedColor(null);
  };

  return (
    <div className="bg-[#1e1136] min-h-screen flex flex-col font-sans text-white select-none">
        <div className="p-4 flex justify-between items-center bg-black/40 border-b border-purple-500/20">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={18}/></button>
            <h1 className="text-xl font-black gold-text italic uppercase">COLOR GRID</h1>
            <div className="text-yellow-500 font-mono text-sm">₹{userBalance.toFixed(2)}</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="grid grid-cols-3 gap-3 mb-16 bg-black/40 p-4 rounded-3xl border border-white/10">
                {grid.map((c, i) => (
                    <div key={i} className={`w-20 h-20 rounded-2xl shadow-lg transition-all duration-300 ${COLORS[c]} ${shuffling ? 'scale-90 opacity-50' : 'scale-100'}`}></div>
                ))}
            </div>
            <div className="flex gap-4">
                {COLORS.map((c, i) => (
                    <button key={i} onClick={() => !shuffling && setSelectedColor(i)} className={`w-14 h-14 rounded-full border-4 transition-all ${c} ${selectedColor === i ? 'border-white scale-125 shadow-2xl' : 'border-transparent opacity-40'}`}></button>
                ))}
            </div>
        </div>
        <div className="bg-[#111] p-6 pb-12 border-t border-white/10">
            <button onClick={start} disabled={selectedColor === null || shuffling} className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl font-black text-xl shadow-xl uppercase">Spin Grid</button>
        </div>
    </div>
  );
};
export default ColorGrid;
