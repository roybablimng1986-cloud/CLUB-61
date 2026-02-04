
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Zap, ShieldAlert, Rocket } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, shouldForceLoss } from '../services/mockFirebase';
import { GameResult } from '../types';

const SpaceRaid: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [gameState, setGameState] = useState<'IDLE' | 'WARPING' | 'EXPLODED' | 'CAPTURED'>('IDLE');
    const [multiplier, setMultiplier] = useState(1.0);
    const [bet, setBet] = useState(10);
    const isMounted = useRef(true);
    const limit = useRef(0);
    const frame = useRef(0);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; cancelAnimationFrame(frame.current); stopAllSounds(); };
    }, []);

    const start = () => {
        if (userBalance < bet) return;
        updateBalance(-bet, 'BET', 'Space Raid');
        setGameState('WARPING');
        setMultiplier(1.0);
        
        const r = Math.random();
        limit.current = Math.max(1, 0.99 / (1 - r));
        animate();
    };

    const animate = () => {
        if (!isMounted.current) return;
        setMultiplier(prev => {
            const next = prev * 1.05;
            if (next >= limit.current) {
                explode();
                return limit.current;
            }
            return next;
        });
        frame.current = requestAnimationFrame(animate);
    };

    const explode = () => {
        cancelAnimationFrame(frame.current);
        setGameState('EXPLODED');
        playSound('plane_crash');
        onResult({ win: false, amount: bet, game: 'Space Raid' });
        addGameHistory('Space Raid', bet, 0, `Destroyed at ${multiplier.toFixed(2)}x`);
        setTimeout(() => isMounted.current && setGameState('IDLE'), 2000);
    };

    const capture = () => {
        if (gameState !== 'WARPING') return;
        cancelAnimationFrame(frame.current);
        setGameState('CAPTURED');
        playSound('win');
        
        const winAmt = bet * multiplier;
        updateBalance(winAmt, 'WIN', 'Space Raid Win');
        onResult({ win: true, amount: winAmt, game: 'Space Raid', resultDetails: [{label: 'Multi', value: multiplier.toFixed(2)+'x'}] });
        addGameHistory('Space Raid', bet, winAmt, `Captured ${multiplier.toFixed(2)}x`);
        setTimeout(() => isMounted.current && setGameState('IDLE'), 2000);
    };

    return (
        <div className="bg-[#00001a] min-h-screen flex flex-col font-sans text-white overflow-hidden relative select-none">
            <div className="p-4 flex justify-between items-center bg-black/40 border-b border-cyan-500/20 z-50">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={18}/></button>
                <h1 className="text-xl font-black italic text-cyan-400">SPACE RAID</h1>
                <div className="text-cyan-500 font-mono text-sm">₹{userBalance.toFixed(2)}</div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                <div className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(6,182,212,0.1)_0%,_transparent_70%)] ${gameState==='WARPING'?'animate-pulse':''}`}></div>
                <div className={`text-6xl font-black italic transition-all ${gameState==='EXPLODED'?'text-red-600 scale-150':'text-white'}`}>
                    {gameState === 'EXPLODED' ? 'BOOM' : multiplier.toFixed(2) + 'x'}
                </div>
                <div className={`mt-10 transition-all duration-300 ${gameState==='WARPING'?'scale-150 animate-bounce':''}`}>
                    <Rocket size={80} className="text-cyan-400 -rotate-45" />
                </div>
            </div>
            <div className="bg-[#111] p-6 pb-12 border-t border-white/10 z-50">
                {gameState === 'IDLE' ? (
                    <button onClick={start} className="w-full py-6 bg-cyan-600 text-white font-black text-2xl rounded-2xl shadow-xl uppercase">Launch Raid</button>
                ) : (
                    <button onClick={capture} disabled={gameState !== 'WARPING'} className="w-full py-8 bg-yellow-500 text-black font-black text-3xl rounded-2xl shadow-xl animate-pulse">EXTRACT</button>
                )}
            </div>
        </div>
    );
};
export default SpaceRaid;
