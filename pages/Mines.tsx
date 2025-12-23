
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, HelpCircle, Wallet, VolumeX, X } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus, getGameHistory, shouldForceLoss } from '../services/mockFirebase';
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
    const [showRules, setShowRules] = useState(false);
    const [myHistory, setMyHistory] = useState<GameHistoryItem[]>([]);
    
    const isMounted = useRef(true);

    /* Fixed getGameHistory call: it requires a callback and returns an unsubscribe function */
    useEffect(() => {
        isMounted.current = true;
        const unsubHistory = getGameHistory('Mines', (data) => {
            if(isMounted.current) setMyHistory(data.slice(0, 10));
        });
        return () => {
            isMounted.current = false;
            unsubHistory();
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

        // Forced loss logic check for high-risk bets after first gem
        const forced = gemsFound >= 1 && shouldForceLoss(betAmount, userBalance);

        if (grid[index] === 2 || forced) {
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
                resultDetails: [{ label: 'Result', value: 'Explosion!', color: 'text-red-500' }]
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
            alert("Reveal at least one gem first!");
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
        setRevealed(Array(25).fill(true)); 
        
        onResult({
            win: true,
            amount: winAmount,
            game: 'Mines',
            resultDetails: [
                { label: 'Gems', value: gemsFound.toString(), color: 'text-green-500' },
                { label: 'Multiplier', value: `${multiplier.toFixed(2)}x`, color: 'text-blue-500' }
            ]
        });
    };

    /* Fixed updateHistoryLocal: Real-time listeners in mockFirebase now handle syncing automatically. */
    const updateHistoryLocal = () => {
        // Automatically handled by getGameHistory snapshot listener in useEffect
    }

    const currentMultiplier = (1 + (gemsFound * 0.2) + (minesCount * 0.05)).toFixed(2);
    const currentProfit = gemsFound > 0 ? (betAmount * parseFloat(currentMultiplier)).toFixed(2) : "0.00";

    return (
        <div className="bg-[#0f172a] min-h-screen flex flex-col pb-safe font-sans">
            <div className="bg-[#1e293b] p-4 flex items-center justify-between sticky top-0 z-10 shadow-lg border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <button onClick={onBack}><ArrowLeft className="text-white" /></button>
                    <h1 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tighter gold-text">Mines</h1>
                </div>
                <div className="flex gap-3 text-slate-400 items-center">
                    <div className="flex items-center gap-2 bg-[#0f172a] px-3 py-1 rounded-full border border-slate-700">
                         <Wallet size={14} className="text-green-500"/>
                         <span className="text-sm font-bold text-white">₹{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setShowRules(true)} className="p-1"><HelpCircle size={20} /></button>
                    <button onClick={handleToggleMute}>
                        {muted ? <VolumeX size={20} /> : <Volume2 size={20}/>}
                    </button>
                </div>
            </div>

            <div className="flex-1 p-6 flex flex-col items-center">
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
                                                <div className="absolute inset-0 bg-green-500/40 blur-lg rounded-full animate-pulse"></div>
                                                <img 
                                                    src={ASSETS.GEM} 
                                                    alt="Gem" 
                                                    className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)] animate-bounce relative z-10" 
                                                />
                                            </>
                                        )}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full max-w-md bg-[#1e293b] rounded-xl p-4 space-y-4 shadow-xl border border-slate-700 mb-6">
                    {!isPlaying ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400 font-bold uppercase tracking-wider">Stake Amount</label>
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
                                <label className="text-sm text-slate-400 font-bold uppercase tracking-wider">Mines Count</label>
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
                                className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold shadow-lg shadow-blue-900/30 active:scale-95 transition-all text-white border-t-2 border-white/10"
                            >
                                START MINE HUNT
                            </button>
                        </>
                    ) : (
                        <div className="text-center space-y-4 animate-in slide-in-from-bottom duration-300">
                            <div className="flex justify-around bg-[#0f172a] p-4 rounded-xl border border-slate-700 shadow-inner">
                                <div><p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Gems</p><p className="font-bold text-green-400 text-xl">{gemsFound}</p></div>
                                <div><p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Win Potential</p><p className="font-bold text-yellow-400 text-xl">₹{currentProfit}</p></div>
                                <div><p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Mult.</p><p className="font-bold text-white text-xl">{gemsFound > 0 ? currentMultiplier : '1.00'}x</p></div>
                            </div>
                            <button 
                                onClick={cashOut}
                                disabled={gemsFound === 0}
                                className={`w-full py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all text-white border-t-2 border-white/20 ${gemsFound > 0 ? 'bg-green-600 hover:bg-green-500 shadow-green-900/30' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                            >
                                {gemsFound === 0 ? 'Pick a Tile' : 'COLLECT EARNINGS'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showRules && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
                    <div className="bg-[#1e293b] border-2 border-blue-500/30 w-full max-w-sm p-8 rounded-[3rem] shadow-2xl animate-in zoom-in">
                         <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                             <h2 className="text-2xl font-black text-blue-400 italic uppercase">HOW TO PLAY</h2>
                             <button onClick={() => setShowRules(false)} className="p-2 bg-slate-800 rounded-full"><X size={20}/></button>
                         </div>
                         <div className="space-y-4 text-sm text-slate-300 font-medium leading-relaxed">
                             <p>1. Select your <span className="text-white font-bold">Stake</span> and the number of <span className="text-red-500 font-bold">Mines</span> (1-20).</p>
                             <p>2. Tap tiles to reveal <span className="text-green-500 font-bold">Gems</span>. Each gem increases your total win multiplier.</p>
                             <p>3. <span className="text-yellow-500 font-bold">COLLECT</span> anytime after finding at least one gem.</p>
                             <p>4. If you hit a <span className="text-red-500 font-bold">MINE</span>, the game ends and your stake is lost.</p>
                             <p className="text-xs text-blue-400 italic">Strategy: More mines = Higher multipliers per gem found!</p>
                         </div>
                    </div>
                </div>
            )}
            <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
        </div>
    );
};

export default Mines;
