import React, { useState } from 'react';
import { ArrowLeft, ArrowDown } from 'lucide-react';
import { updateBalance, playSound } from '../services/mockFirebase';
import { GameResult } from '../types';

const SEGMENTS = [
    { label: '50X', value: 50, bg: '#E11D48' }, { label: 'LOSE', value: 0, bg: '#1E293B' }, 
    { label: '2X', value: 2, bg: '#F59E0B' }, { label: 'LOSE', value: 0, bg: '#1E293B' },
    { label: '10X', value: 10, bg: '#10B981' }, { label: 'LOSE', value: 0, bg: '#1E293B' },
    { label: '5X', value: 5, bg: '#3B82F6' }, { label: 'LOSE', value: 0, bg: '#1E293B' },
];

const Vortex: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [bet, setBet] = useState(10);
    const [rot, setRot] = useState(0);
    const [spinning, setSpinning] = useState(false);

    const spin = () => {
        if (spinning) return;
        if (bet > userBalance) return alert("Insufficient Balance");
        updateBalance(-bet, 'BET', 'Lucky Wheel');
        setSpinning(true); playSound('spin');
        
        const rand = Math.random();
        let idx = rand < 0.5 ? 1 : rand < 0.8 ? 2 : rand < 0.9 ? 6 : rand < 0.98 ? 4 : 0;
        const targetDeg = -(idx * 45);
        const nextRot = Math.floor((rot - 1800 - targetDeg) / 360) * 360 + targetDeg;
        
        setRot(nextRot);
        setTimeout(() => {
            setSpinning(false);
            const win = bet * SEGMENTS[idx].value;
            if (win > 0) { updateBalance(win, 'WIN', 'Wheel'); playSound('win'); onResult({ win: true, amount: win, game: 'Lucky Wheel' }); }
            else { playSound('loss'); onResult({ win: false, amount: bet, game: 'Lucky Wheel' }); }
        }, 4000);
    };

    return (
        <div className="bg-[#1e1136] min-h-screen text-white font-sans flex flex-col items-center">
            <div className="w-full p-4 flex justify-between"><button onClick={onBack}><ArrowLeft/></button><span>Lucky Wheel</span><span>₹{userBalance.toFixed(2)}</span></div>
            <div className="relative mt-10">
                <ArrowDown className="absolute -top-6 left-1/2 -translate-x-1/2 text-red-500 z-20" size={48} />
                <div className="w-80 h-80 rounded-full overflow-hidden border-4 border-yellow-500 relative">
                    <div className="w-full h-full transition-transform duration-[4000ms] ease-out" style={{ transform: `rotate(${rot}deg)`, background: `conic-gradient(from -22.5deg, ${SEGMENTS.map((s,i)=>`${s.bg} ${i*45}deg ${(i+1)*45}deg`).join(', ')})` }}></div>
                </div>
            </div>
            <div className="p-4 w-full max-w-sm mt-10">
                <div className="flex justify-center gap-2 mb-4">{[10,50,100].map(a=><button key={a} onClick={()=>setBet(a)} className={`p-2 rounded ${bet===a?'bg-yellow-500 text-black':'bg-slate-800'}`}>{a}</button>)}</div>
                <button onClick={spin} disabled={spinning} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 py-4 rounded-full font-black text-black">SPIN</button>
            </div>
        </div>
    );
};
export default Vortex;