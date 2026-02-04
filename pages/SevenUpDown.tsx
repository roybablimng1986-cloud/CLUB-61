
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, RotateCw, History } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, shouldForceLoss } from '../services/mockFirebase';
import { GameResult } from '../types';

const SevenUpDown: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
  const [bet, setBet] = useState(10);
  const [target, setTarget] = useState<'UP' | 'DOWN' | 'SEVEN' | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [dice, setDice] = useState([1, 1]);
  const [history, setHistory] = useState<number[]>([]);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; stopAllSounds(); };
  }, []);

  const roll = () => {
    if (isRolling || !target || userBalance < bet) return;
    updateBalance(-bet, 'BET', '7 Up Down');
    setIsRolling(true);
    playSound('wheel_spin');

    let count = 0;
    const interval = setInterval(() => {
        setDice([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
        count++;
        if (count > 15) {
            clearInterval(interval);
            if (isMounted.current) finalize();
        }
    }, 80);
  };

  const finalize = () => {
    let d1 = Math.floor(Math.random() * 6) + 1;
    let d2 = Math.floor(Math.random() * 6) + 1;
    let sum = d1 + d2;
    
    // Controlled loss logic
    if (shouldForceLoss(bet, userBalance)) {
        if (target === 'UP') sum = 5;
        else if (target === 'DOWN') sum = 9;
        else sum = 10;
        d1 = Math.floor(sum/2); d2 = sum - d1;
    }

    setDice([d1, d2]);
    setIsRolling(false);

    const outcome = sum < 7 ? 'DOWN' : sum > 7 ? 'UP' : 'SEVEN';
    const isWin = target === outcome;
    const mult = outcome === 'SEVEN' ? 5 : 2;
    const winAmt = isWin ? bet * mult : 0;

    if (isWin) { updateBalance(winAmt, 'WIN', '7 Up Down Win'); playSound('win'); }
    else playSound('loss');

    setHistory(prev => [sum, ...prev].slice(0, 10));
    onResult({ win: isWin, amount: isWin ? winAmt : bet, game: '7 Up Down', resultDetails: [{label: 'Sum', value: sum.toString()}] });
    addGameHistory('7 Up Down', bet, winAmt, `Landed ${sum}`);
    setTarget(null);
  };

  return (
    <div className="bg-[#051c14] min-h-screen flex flex-col font-sans text-white select-none">
        <div className="p-4 flex justify-between items-center bg-black/40 border-b border-yellow-500/20">
            <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={18}/></button>
            <h1 className="text-xl font-black gold-text italic">7 UP DOWN</h1>
            <div className="text-yellow-500 font-mono text-sm">₹{userBalance.toFixed(2)}</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="flex gap-6 mb-16">
                {dice.map((v, i) => (
                    <div key={i} className={`w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-5xl text-black shadow-2xl transition-all ${isRolling ? 'animate-bounce' : ''}`}>{v}</div>
                ))}
            </div>
            <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                <TargetBtn label="DOWN" range="2-6" mult="2X" active={target==='DOWN'} onClick={()=>setTarget('DOWN')} color="bg-blue-600" />
                <TargetBtn label="SEVEN" range="7" mult="5X" active={target==='SEVEN'} onClick={()=>setTarget('SEVEN')} color="bg-yellow-600" />
                <TargetBtn label="UP" range="8-12" mult="2X" active={target==='UP'} onClick={()=>setTarget('UP')} color="bg-red-600" />
            </div>
        </div>
        <div className="bg-[#111] p-6 pb-12 border-t border-white/10">
            <button onClick={roll} disabled={!target || isRolling} className="w-full py-5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black rounded-2xl shadow-xl uppercase tracking-widest text-lg active:scale-95 transition-all">Roll Dice</button>
        </div>
    </div>
  );
};

const TargetBtn = ({ label, range, mult, active, onClick, color }: any) => (
    <button onClick={onClick} className={`py-6 rounded-2xl border-b-8 flex flex-col items-center justify-center transition-all ${active ? color + ' border-white/20 scale-105' : 'bg-zinc-900 border-zinc-950 opacity-40'}`}>
        <span className="font-black text-xs">{label}</span>
        <span className="text-[10px] opacity-60">{range}</span>
        <span className="text-xs font-black mt-2">{mult}</span>
    </button>
);
export default SevenUpDown;
