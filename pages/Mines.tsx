

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, HelpCircle, Wallet, VolumeX } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus, getGameHistory } from '../services/mockFirebase';
import { GameResult, GameHistoryItem } from '../types';

// Asset URLs for better visuals
const ASSETS = {
    GEM: "https://cdn-icons-png.flaticon.com/512/2276/2276931.png", // Nice Diamond
    BOMB: "https://cdn-icons-png.flaticon.com/512/112/112683.png", // Cartoon Bomb
    GEM_ICON: "https://cdn-icons-png.flaticon.com/512/2276/2276931.png" 
};

interface MinesProps {
    onBack: () => void;
    userBalance: number;
    onResult: (result: GameResult) => void;
}

const Mines: React.FC<MinesProps> = ({ onBack, userBalance, onResult }) => {
    const [grid, setGrid] = useState<number[]>(Array(25).fill(0)); // 0: hidden, 1: gem, 2: bomb
    const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
    const [betAmount, setBetAmount] = useState(10);
    const [isPlaying, setIsPlaying] = useState(false);
    const [minesCount, setMinesCount] = useState(3);
    const [gemsFound, setGemsFound] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [muted, setMuted] = useState(getMuteStatus());
    const [myHistory, setMyHistory] = useState<GameHistoryItem[]>([]);
    
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        setMyHistory(getGameHistory('Mines').slice(0, 10));
        return () => {
            isMounted.current = false;
            stopAllSounds();
        };
    }, []);

    const handleToggleMute = () => {
        setMuted(toggleMute());
    };

    const startGame = () => {
        if (betAmount > userBalance) {
            alert("Insufficient Balance!");
            return;
        }

        if(isMounted.current) playSound('click');
        updateBalance(-betAmount, 'BET', 'Mines Game');
        setIsPlaying(true);
        setGameOver(false);
        setGemsFound(0);
        setRevealed(Array(25).fill(false));
        
        // Generate mines
        const newGrid = Array(25).fill(1); // Default Gem
        let minesPlaced = 0;
        while(minesPlaced < minesCount) {
            const idx = Math.floor(Math.random() * 25);
            if (newGrid[idx] !== 2) {
                newGrid[idx] = 2; // Bomb
                minesPlaced++;
            }
        }
        setGrid(newGrid);
    };

    const handleTileClick = (index: number) => {
        if (!isPlaying || revealed[index] || gameOver) return;

        if(isMounted.current) playSound('click');
        const newRevealed = [...revealed];
        newRevealed[index] = true;
        setRevealed(newRevealed);

        if (grid[index] === 2) {
            // Hit Mine
            if(isMounted.current) playSound('loss');
            setGameOver(true);
            setIsPlaying(false);
            setRevealed(Array(25).fill(true)); // Reveal all
            addGameHistory('Mines', betAmount, 0, `Hit Mine (Mines: ${minesCount})`);
            updateHistoryLocal();

            onResult({
                win: false,
                amount: betAmount,
                game: 'Mines',
                resultDetails: [{ label: 'Result', value: 'Hit Mine', color: 'bg-red-500' }]
            });
        } else {
            // Found Gem
            if(isMounted.current) playSound('win');
            setGemsFound(prev => prev + 1);
        }
    };

    const cashOut = () => {
        if (!isPlaying || gameOver) return;
        if (gemsFound === 0) {
            alert("You must reveal at least one gem before cashing out!");
            return;
        }

        const multiplier = 1 + (gemsFound * 0.2) + (minesCount * 0.05);
        const winAmount = betAmount * multiplier;
        updateBalance(winAmount, 'WIN', 'Mines Win');
        addGameHistory('Mines', betAmount, winAmount, `Cashed Out @ ${multiplier.toFixed(2)}x`);
        updateHistoryLocal();
        
        setIsPlaying(false);
        setGameOver(true);
        if(isMounted.current) playSound('win');
        setRevealed(Array(25).fill(true)); // Reveal remaining
        
        onResult({
            win: true,
            amount: winAmount,
            game: 'Mines',
            resultDetails: [
                { label: 'Gems', value: gemsFound.toString(), color: 'bg-green-500' },
                { label: 'Multiplier', value: `${multiplier.toFixed(2)}x`, color: 'bg-blue-500' }
            ]
        });
    };

    const updateHistoryLocal = () => {
        setTimeout(() => {
            if (isMounted.current) setMyHistory(getGameHistory('Mines').slice(0, 10));
        }, 500);
    }

    const currentMultiplier = (1 + (gemsFound * 0.2) + (minesCount * 0.05)).toFixed(2);
    // Fix: If gemsFound is 0, visual profit should be 0.
    const currentProfit = gemsFound > 0 ? (betAmount * parseFloat(currentMultiplier)).toFixed(2) : "0.00";

    return (
        <div className="bg-[#0f172a] min-h-screen flex flex-col pb-safe font-sans">
            <div className="bg-[#1e293b] p-4 flex items-center justify-between sticky top-0 z-10 shadow-lg border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <button onClick={onBack}><ArrowLeft className="text-white" /></button>
                    <h1 className="text-lg font-bold flex items-center gap-2">Mines <img src={ASSETS.GEM_ICON} className="w-5 h-5" alt="icon"/></h1>
                </div>
                <div className="flex gap-3 text-slate-400 items-center">
                    <div className="flex items-center gap-2 bg-[#0f172a] px-3 py-1 rounded-full border border-slate-700">
                         <Wallet size={14} className="text-green-500"/>
                         <span className="text-sm font-bold text-white">₹{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={handleToggleMute}>
                        {muted ? <VolumeX size={20} /> : <Volume2 size={20}/>}
                    </button>
                    <HelpCircle size={20}/>
                </div>
            </div>

            <div className="flex-1 p-6 flex flex-col items-center">
                {/* Game Board */}
                <div className="bg-[#1e293b] p-3 rounded-lg shadow-2xl mb-6 relative">
                    <div className="grid grid-cols-5 gap-2">
                        {grid.map((val, idx) => (
                            <button
                                key={idx}
                                disabled={!isPlaying || (revealed[idx] && !gameOver)}
                                onClick={() => handleTileClick(idx)}
                                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center transition-all duration-200 transform ${
                                    !revealed[idx] 
                                        ? 'bg-[#334155] hover:bg-[#475569] shadow-[0_4px_0_#1e293b] active:translate-y-1 active:shadow-none' 
                                        : 'bg-[#0f172a] inset-shadow scale-95'
                                }`}
                            >
                                {revealed[idx] && (
                                    <div className="animate-in zoom-in duration-300 w-full h-full flex items-center justify-center relative">
                                        {val === 2 ? (
                                            <img src={ASSETS.BOMB} alt="Bomb" className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-md animate-pulse relative z-10" />
                                        ) : (
                                            <>
                                                {/* Enhanced Glow Effect for Gem */}
                                                <div className="absolute inset-0 bg-green-500/40 blur-lg rounded-full animate-pulse"></div>
                                                <div className="absolute inset-2 bg-white/20 blur-md rounded-full"></div>
                                                <img 
                                                    src={ASSETS.GEM} 
                                                    alt="Gem" 
                                                    className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)] animate-bounce relative z-10" 
                                                />
                                                {/* Sparkle */}
                                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping opacity-75"></div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Controls */}
                <div className="w-full max-w-md bg-[#1e293b] rounded-xl p-4 space-y-4 shadow-xl border border-slate-700 mb-6">
                    {!isPlaying ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400 font-bold uppercase tracking-wider">Bet Amount</label>
                                <div className="flex items-center gap-2 bg-[#0f172a] p-3 rounded-xl border border-slate-700 focus-within:border-blue-500 transition-colors">
                                    <span className="text-green-500 font-bold">₹</span>
                                    <input 
                                        type="number" 
                                        value={betAmount} 
                                        onChange={(e) => setBetAmount(Number(e.target.value))}
                                        className="bg-transparent w-full outline-none font-bold text-white"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {[10, 100, 500, 1000].map(amt => (
                                        <button key={amt} onClick={() => setBetAmount(amt)} className="flex-1 bg-slate-700 py-1 rounded text-xs text-slate-300 hover:bg-slate-600 transition-colors">{amt}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400 font-bold uppercase tracking-wider">Mines (1-20)</label>
                                <div className="flex justify-between gap-2">
                                    {[1, 3, 5, 10].map(num => (
                                        <button 
                                            key={num}
                                            onClick={() => setMinesCount(num)}
                                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${minesCount === num ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 border border-slate-700'}`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button 
                                onClick={startGame}
                                className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold shadow-lg shadow-blue-900/30 active:scale-95 transition-all text-white"
                            >
                                Start Game
                            </button>
                        </>
                    ) : (
                        <div className="text-center space-y-4 animate-in slide-in-from-bottom duration-300">
                            <div className="flex justify-around bg-[#0f172a] p-4 rounded-xl border border-slate-700">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Gems Found</p>
                                    <p className="font-bold text-green-400 text-xl">{gemsFound}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Current Win</p>
                                    <p className="font-bold text-yellow-400 text-xl">₹{currentProfit}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Multiplier</p>
                                    <p className="font-bold text-white text-xl">{gemsFound > 0 ? currentMultiplier : '1.00'}x</p>
                                </div>
                            </div>
                            <button 
                                onClick={cashOut}
                                disabled={gemsFound === 0}
                                className={`w-full py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all text-white ${gemsFound > 0 ? 'bg-green-600 hover:bg-green-500 shadow-green-900/30' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                            >
                                {gemsFound === 0 ? 'Pick a Tile' : 'Cash Out'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Mines History */}
                <div className="w-full max-w-md">
                     <h3 className="text-slate-400 font-bold mb-3 flex items-center gap-2"><ArrowLeft size={16} className="rotate-180"/> My Recent Orders</h3>
                     <div className="space-y-2">
                         {myHistory.map((item) => (
                             <div key={item.id} className="bg-[#1e293b] p-3 rounded-lg border border-slate-700 flex justify-between items-center text-sm">
                                 <div>
                                     <div className="text-white font-bold">{item.details}</div>
                                     <div className="text-[10px] text-slate-500">{item.date}</div>
                                 </div>
                                 <div className={`font-bold ${item.win > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                     {item.win > 0 ? `+₹${item.win.toFixed(2)}` : `-₹${item.amount.toFixed(2)}`}
                                 </div>
                             </div>
                         ))}
                         {myHistory.length === 0 && <div className="text-center text-slate-600 py-4 text-xs">No history yet</div>}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default Mines;
