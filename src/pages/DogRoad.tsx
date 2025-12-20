import React, { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { updateBalance, playSound } from '../services/mockFirebase';
import { GameResult } from '../types';

const DogRoad: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [bet, setBet] = useState(10);
    const [lane, setLane] = useState(-1);
    const [playing, setPlaying] = useState(false);
    const MULTIPLIERS = [1.3, 1.7, 2.3, 3.2, 4.4];

    const start = () => { if (bet > userBalance) return; updateBalance(-bet); setPlaying(true); setLane(-1); };
    const next = () => {
        if (!playing) return;
        if (Math.random() < 0.2) {
            setPlaying(false); playSound('loss'); onResult({ win: false, amount: bet, game: 'Dog Road' });
        } else {
            setLane(l => l + 1); playSound('win');
            if (lane + 1 >= 4) cashout(true);
        }
    };
    const cashout = (forced=false) => {
        const win = bet * MULTIPLIERS[lane + (forced?0:0)];
        updateBalance(win); setPlaying(false); onResult({ win: true, amount: win, game: 'Dog Road' });
    };

    return (
        <div className="bg-[#1a1c20] min-h-screen text-white">
            <div className="p-4 flex justify-between"><button onClick={onBack}><ArrowLeft/></button><span>Dog Road</span><span>₹{userBalance.toFixed(2)}</span></div>
            <div className="flex overflow-hidden h-64 bg-slate-800 relative">
                 {[0,1,2,3,4].map(i => <div key={i} className={`flex-1 border-r border-slate-600 flex items-center justify-center ${lane===i?'bg-slate-700':''}`}>{lane===i ? '🐕' : `${MULTIPLIERS[i]}x`}</div>)}
            </div>
            <div className="p-4">
                {!playing ? <button onClick={start} className="w-full bg-green-500 py-4 rounded font-bold text-black">PLAY</button> : 
                <div className="flex gap-2"><button onClick={()=>cashout()} className="flex-1 bg-orange-500 py-4 rounded font-bold">Cash Out</button><button onClick={next} className="flex-1 bg-green-500 py-4 rounded font-bold text-black flex justify-center items-center gap-2">GO <ArrowRight/></button></div>}
            </div>
        </div>
    );
};
export default DogRoad;