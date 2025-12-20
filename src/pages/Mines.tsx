import React, { useState } from 'react';
import { ArrowLeft, Wallet } from 'lucide-react';
import { updateBalance, playSound } from '../services/mockFirebase';
import { GameResult } from '../types';

const Mines: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [grid, setGrid] = useState<number[]>(Array(25).fill(0));
    const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
    const [bet, setBet] = useState(10);
    const [playing, setPlaying] = useState(false);
    const [mines, setMines] = useState(3);
    const [gems, setGems] = useState(0);

    const start = () => {
        if (bet > userBalance) return alert("Insufficient Balance");
        updateBalance(-bet, 'BET', 'Mines');
        setPlaying(true); setGems(0); setRevealed(Array(25).fill(false));
        const newGrid = Array(25).fill(1);
        let placed = 0;
        while(placed < mines) { const i = Math.floor(Math.random()*25); if(newGrid[i]!==2) { newGrid[i]=2; placed++; } }
        setGrid(newGrid);
    };

    const click = (i: number) => {
        if (!playing || revealed[i]) return;
        const rev = [...revealed]; rev[i] = true; setRevealed(rev);
        if (grid[i] === 2) {
            setPlaying(false); playSound('loss'); onResult({ win: false, amount: bet, game: 'Mines', resultDetails: [{label: 'Result', value: 'Boom'}] });
        } else {
            playSound('win'); setGems(g => g + 1);
        }
    };

    const cashout = () => {
        const win = bet * (1 + (gems * 0.2) + (mines * 0.05));
        updateBalance(win, 'WIN', 'Mines');
        setPlaying(false); playSound('win');
        onResult({ win: true, amount: win, game: 'Mines', resultDetails: [{label: 'Gems', value: gems.toString()}] });
    };

    return (
        <div className="bg-[#0f172a] min-h-screen text-white font-sans">
            <div className="p-4 flex justify-between"><button onClick={onBack}><ArrowLeft/></button><span>Mines</span><span>₹{userBalance.toFixed(2)}</span></div>
            <div className="p-4 grid grid-cols-5 gap-2">
                {grid.map((v, i) => (
                    <button key={i} onClick={()=>click(i)} disabled={!playing || revealed[i]} className={`aspect-square rounded ${revealed[i] ? 'bg-[#0f172a]' : 'bg-slate-700'}`}>
                        {revealed[i] && (v===2 ? '💣' : '💎')}
                    </button>
                ))}
            </div>
            <div className="p-4">
                {!playing ? (
                    <><input type="number" value={bet} onChange={e=>setBet(Number(e.target.value))} className="w-full bg-slate-800 p-3 mb-2 text-white"/><button onClick={start} className="w-full bg-blue-600 py-3 rounded font-bold">Start</button></>
                ) : (
                    <button onClick={cashout} className="w-full bg-green-600 py-3 rounded font-bold">Cash Out</button>
                )}
            </div>
        </div>
    );
};
export default Mines;