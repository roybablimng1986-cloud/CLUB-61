
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, HelpCircle, Wallet, VolumeX, X } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus, getGameHistory, shouldForceLoss } from '../services/mockFirebase';
import { GameResult, GameHistoryItem } from '../types';

const ASSETS = {
    GEM: "https://cdn-icons-png.flaticon.com/512/2276/2276931.png",
    BOMB: "https://cdn-icons-png.flaticon.com/512/112/112683.png",
};

interface MinesProps {
    onBack: () => void;
    userBalance: number;
    onResult: (result: GameResult) => void;
}

const Mines: React.FC<MinesProps> = ({ onBack, userBalance, onResult }) => {
    const [grid, setGrid] = useState<number[]>(Array(25).fill(0));
    const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
    const [betAmount, setBetAmount] = useState(10);
    const [isPlaying, setIsPlaying] = useState(false);
    const [minesCount, setMinesCount] = useState(3);
    const [gemsFound, setGemsFound] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [muted, setMuted] = useState(getMuteStatus());
    
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; stopAllSounds(); };
    }, []);

    const startGame = () => {
        if (betAmount > userBalance) { alert("Insufficient Balance!"); return; }
        playSound('click');
        updateBalance(-betAmount, 'BET', 'Mines Game');
        setIsPlaying(true); setGameOver(false); setGemsFound(0); setRevealed(Array(25).fill(false));
        const newGrid = Array(25).fill(1);
        let minesPlaced = 0;
        while(minesPlaced < minesCount) {
            const idx = Math.floor(Math.random() * 25);
            if (newGrid[idx] !== 2) { newGrid[idx] = 2; minesPlaced++; }
        }
        setGrid(newGrid);
    };

    const handleTileClick = (index: number) => {
        if (!isPlaying || revealed[index] || gameOver) return;

        const newRevealed = [...revealed];
        newRevealed[index] = true;
        setRevealed(newRevealed);

        const forced = gemsFound >= 1 && shouldForceLoss(betAmount, userBalance);

        if (grid[index] === 2 || forced) {
            playSound('mine_bomb');
            setGameOver(true); setIsPlaying(false);
            setRevealed(Array(25).fill(true));
            addGameHistory('Mines', betAmount, 0, `Hit Mine`);
            onResult({ win: false, amount: betAmount, game: 'Mines' });
        } else {
            playSound('mine_reveal');
            setGemsFound(prev => prev + 1);
        }
    };

    const cashOut = () => {
        if (!isPlaying || gameOver) return;
        const multiplier = 1 + (gemsFound * 0.2) + (minesCount * 0.05);
        const winAmount = betAmount * multiplier;
        updateBalance(winAmount, 'WIN', 'Mines Win');
        addGameHistory('Mines', betAmount, winAmount, `Cashed Out @ ${multiplier.toFixed(2)}x`);
        setIsPlaying(false); setGameOver(true);
        playSound('win');
        setRevealed(Array(25).fill(true)); 
        onResult({ win: true, amount: winAmount, game: 'Mines', resultDetails: [{ label: 'Multiplier', value: `${multiplier.toFixed(2)}x` }] });
    };

    return (
        <div className="bg-[#0f172a] min-h-screen flex flex-col pb-safe font-sans select-none">
            <div className="bg-[#1e293b] p-4 flex items-center justify-between border-b border-slate-700 shadow-lg">
                <div className="flex items-center gap-4">
                    <button onClick={onBack}><ArrowLeft className="text-white" /></button>
                    <h1 className="text-lg font-bold gold-text uppercase">Mines</h1>
                </div>
                <div className="flex gap-3 text-slate-400 items-center">
                    <div className="flex items-center gap-2 bg-[#0f172a] px-3 py-1 rounded-full border border-slate-700">
                         <Wallet size={14} className="text-green-500"/>
                         <span className="text-sm font-bold text-white">₹{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setMuted(toggleMute())}>{muted ? <VolumeX size={20} /> : <Volume2 size={20}/>}</button>
                </div>
            </div>

            <div className="flex-1 p-6 flex flex-col items-center justify-center">
                <div className="grid grid-cols-5 gap-2 mb-8">
                    {grid.map((val, idx) => (
                        <button
                            key={idx}
                            disabled={!isPlaying || (revealed[idx] && !gameOver)}
                            onClick={() => handleTileClick(idx)}
                            className={`w-14 h-14 rounded-lg flex items-center justify-center transition-all ${!revealed[idx] ? 'bg-[#334155] shadow-[0_4px_0_#1e293b]' : 'bg-[#0f172a] inset-shadow scale-95'}`}
                        >
                            {revealed[idx] && (
                                <img src={val === 2 ? ASSETS.BOMB : ASSETS.GEM} className="w-10 h-10 animate-in zoom-in" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="w-full max-w-md bg-[#1e293b] rounded-2xl p-5 space-y-5 shadow-2xl border border-slate-700">
                    {!isPlaying ? (
                        <>
                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] text-slate-500 font-black uppercase ml-1">Stake Amount</p>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                    {[10, 50, 100, 500, 1000].map(amt => (
                                        <button key={amt} onClick={() => setBetAmount(amt)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black border transition-all ${betAmount === amt ? 'bg-blue-600 border-white text-white' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>₹{amt}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] text-slate-500 font-black uppercase ml-1">Mines Count</p>
                                <div className="flex gap-2">
                                    {[1, 3, 5, 10, 20].map(num => (
                                        <button key={num} onClick={() => setMinesCount(num)} className={`flex-1 py-3 rounded-xl font-bold text-xs ${minesCount === num ? 'bg-red-600 text-white border-white border' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>{num}</button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={startGame} className="w-full bg-blue-600 py-4 rounded-xl font-black text-white shadow-lg active:scale-95 transition-all uppercase tracking-widest text-lg">START HUNT</button>
                        </>
                    ) : (
                        <button onClick={cashOut} disabled={gemsFound === 0} className={`w-full py-5 rounded-xl font-black shadow-lg text-white transition-all active:scale-95 text-xl ${gemsFound > 0 ? 'bg-green-600 animate-pulse' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}>
                            {gemsFound === 0 ? 'FIND GEMS' : `CASHOUT ₹${(betAmount * (1 + (gemsFound * 0.2) + (minesCount * 0.05))).toFixed(2)}`}
                        </button>
                    )}
                </div>
            </div>
            <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
        </div>
    );
};
export default Mines;
