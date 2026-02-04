
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, RotateCw, History } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, shouldForceLoss } from '../services/mockFirebase';
import { GameResult } from '../types';

const BRANDS = [
    { id: 'FERRARI', icon: '🏎️', mult: 40, color: 'bg-red-600' },
    { id: 'LAMBO', icon: '🐂', mult: 30, color: 'bg-yellow-600' },
    { id: 'BMW', icon: '🔹', mult: 5, color: 'bg-blue-600' },
    { id: 'BENZ', icon: '🔱', mult: 5, color: 'bg-zinc-600' },
    { id: 'AUDI', icon: '⭕', mult: 5, color: 'bg-zinc-800' },
    { id: 'TESLA', icon: '⚡', mult: 5, color: 'bg-red-800' }
];

const CarRoulette: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [selected, setSelected] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const spin = () => {
    if (spinning || !selected || userBalance < bet) return;
    updateBalance(-bet, 'BET', 'Car Roulette');
    setSpinning(true);
    playSound('wheel_spin');

    let current = activeIdx;
    let speed = 50;
    const finalIdx = Math.floor(Math.random() * BRANDS.length);
    let rounds = 30 + finalIdx;

    const run = () => {
        if (!isMounted.current) return;
        setActiveIdx(current % BRANDS.length);
        current++;
        rounds--;
        if (rounds > 0) {
            speed += 5;
            setTimeout(run, speed);
        } else finalize(finalIdx);
    };
    run();
  };

  const finalize = (idx: number) => {
    let resultIdx = idx;
    if (shouldForceLoss(bet, userBalance)) {
        resultIdx = (BRANDS.findIndex(b => b.id === selected) + 1) % BRANDS.length;
    }
    
    setActiveIdx(resultIdx);
    setSpinning(false);
    const win = selected === BRANDS[resultIdx].id;
    const winAmt = win ? bet * BRANDS[resultIdx].mult : 0;

    if (win) { updateBalance(winAmt, 'WIN', 'Car Win'); playSound('win'); }
    else playSound('loss');

    onResult({ win, amount: win ? winAmt : bet, game: 'Car Roulette', resultDetails: [{label: 'Brand', value: BRANDS[resultIdx].id}] });
    addGameHistory('Car Roulette', bet, winAmt, `Hit ${BRANDS[resultIdx].id}`);
    setSelected(null);
  };

  return (
    <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white select-none">
        <div className="p-4 flex justify-between items-center bg-[#111] border-b border-zinc-800">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={18}/></button>
            <h1 className="text-xl font-black gold-text italic">CAR ROULETTE</h1>
            <div className="text-yellow-500 font-mono text-sm">₹{userBalance.toFixed(2)}</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="grid grid-cols-3 gap-3 mb-10 w-full">
                {BRANDS.map((b, i) => (
                    <div key={b.id} className={`h-24 rounded-2xl border-4 transition-all flex flex-col items-center justify-center ${activeIdx === i ? 'bg-yellow-500 border-white scale-110 shadow-2xl' : 'bg-zinc-900 border-white/5 opacity-40'}`}>
                        <span className="text-3xl">{b.icon}</span>
                        <span className="text-[10px] font-black mt-1">{b.mult}X</span>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-3 gap-3 w-full">
                {BRANDS.map(b => (
                    <button key={b.id + 'bet'} onClick={() => !spinning && setSelected(b.id)} className={`py-4 rounded-xl font-black text-[10px] border-2 transition-all ${selected === b.id ? 'bg-blue-600 border-white' : 'bg-slate-800 border-white/5 opacity-60'}`}>{b.id}</button>
                ))}
            </div>
        </div>
        <div className="bg-[#111] p-6 pb-12 border-t border-white/10">
            <button onClick={spin} disabled={!selected || spinning} className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-black text-xl shadow-xl uppercase">Start Engine</button>
        </div>
    </div>
  );
};
export default CarRoulette;
