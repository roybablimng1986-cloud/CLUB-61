
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Zap, ShieldAlert, History, Volume2, VolumeX } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus } from '../services/mockFirebase';
import { GameResult } from '../types';

const CyberBurst: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [gameState, setGameState] = useState<'IDLE' | 'CHARGING' | 'BURST' | 'CAPTURED'>('IDLE');
    const [multiplier, setMultiplier] = useState(1.0);
    const [betAmount, setBetAmount] = useState(10);
    const [muted, setMuted] = useState(getMuteStatus());
    const [history, setHistory] = useState<number[]>([1.5, 2.8, 1.1, 4.5, 0.0]);
    
    const isMounted = useRef(true);
    const burstPoint = useRef(0);
    const frameRef = useRef(0);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; stopAllSounds(); cancelAnimationFrame(frameRef.current); };
    }, []);

    const startCharge = () => {
        if (userBalance < betAmount) { alert("Insufficient Capital"); return; }
        playSound('click');
        updateBalance(-betAmount, 'BET', 'Cyber Burst Charge');
        setGameState('CHARGING');
        setMultiplier(1.0);
        
        // Provably fair generation (simulated)
        const r = Math.random();
        burstPoint.current = Math.max(1, 0.99 / (1 - r));
        
        animate();
    };

    const animate = () => {
        if (!isMounted.current) return;
        setMultiplier(prev => {
            const next = prev * 1.04;
            if (next >= burstPoint.current) {
                handleBurst();
                return burstPoint.current;
            }
            return next;
        });
        frameRef.current = requestAnimationFrame(animate);
    };

    const handleBurst = () => {
        cancelAnimationFrame(frameRef.current);
        setGameState('BURST');
        playSound('plane_crash');
        setHistory(prev => [0, ...prev].slice(0, 10));
        addGameHistory('Cyber Burst', betAmount, 0, `Burst at ${multiplier.toFixed(2)}x`);
        onResult({ win: false, amount: betAmount, game: 'Cyber Burst' });
        setTimeout(() => isMounted.current && setGameState('IDLE'), 2500);
    };

    const capture = () => {
        if (gameState !== 'CHARGING') return;
        cancelAnimationFrame(frameRef.current);
        setGameState('CAPTURED');
        playSound('win');
        
        const winAmt = betAmount * multiplier;
        updateBalance(winAmt, 'WIN', 'Cyber Burst Capture');
        setHistory(prev => [multiplier, ...prev].slice(0, 10));
        
        onResult({ 
            win: true, 
            amount: winAmt, 
            game: 'Cyber Burst',
            resultDetails: [{ label: 'Captured', value: `${multiplier.toFixed(2)}x` }]
        });
        addGameHistory('Cyber Burst', betAmount, winAmt, `Captured ${multiplier.toFixed(2)}x`);
        setTimeout(() => isMounted.current && setGameState('IDLE'), 2500);
    };

    return (
        <div className="bg-black min-h-screen flex flex-col font-sans text-white overflow-hidden relative select-none">
            <div className="p-4 flex justify-between items-center bg-[#111] border-b border-cyan-500/20 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 bg-zinc-900 rounded-xl"><ArrowLeft size={20}/></button>
                    <h1 className="text-xl font-black italic text-cyan-400 tracking-tighter uppercase">CYBER BURST</h1>
                </div>
                <div className="bg-zinc-900 px-4 py-2 rounded-2xl border border-cyan-500/20 text-cyan-400 font-mono shadow-inner flex items-center gap-2">
                    <Wallet size={14} />
                    <span>₹{userBalance.toFixed(2)}</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                <div className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(6,182,212,0.15)_0%,_transparent_70%)] transition-opacity duration-300 ${gameState==='CHARGING'?'opacity-100':'opacity-30'}`}></div>
                
                <div className="relative w-72 h-72 flex items-center justify-center">
                    {/* Pulsing Core */}
                    <div 
                        className={`absolute rounded-full transition-all duration-75 border-4 ${gameState === 'BURST' ? 'bg-red-500/40 border-red-500 scale-150 blur-xl opacity-0' : 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.4)]'}`}
                        style={{ width: `${Math.min(100, (multiplier/2)*20 + 20)}%`, height: `${Math.min(100, (multiplier/2)*20 + 20)}%` }}
                    ></div>
                    
                    <div className="z-10 flex flex-col items-center">
                        <span className={`text-6xl font-black italic tracking-tighter transition-all ${gameState === 'BURST' ? 'text-red-500 scale-150' : 'text-white'}`}>
                            {gameState === 'BURST' ? 'BURST' : multiplier.toFixed(2) + 'x'}
                        </span>
                        {gameState === 'CHARGING' && <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] mt-4 animate-pulse">Energy Surging</span>}
                    </div>
                </div>

                <div className="mt-12 flex gap-2 overflow-x-auto no-scrollbar max-w-full px-4">
                    {history.map((h, i) => (
                        <span key={i} className={`px-4 py-1.5 rounded-full text-[10px] font-black border border-white/5 whitespace-nowrap italic shadow-lg ${h === 0 ? 'bg-red-950/40 text-red-500' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                            {h === 0 ? 'BUST' : h.toFixed(2) + 'x'}
                        </span>
                    ))}
                </div>
            </div>

            <div className="bg-zinc-950 p-6 pb-12 border-t border-white/10 z-50">
                {gameState === 'IDLE' ? (
                    <div className="space-y-6">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {[10, 100, 500, 1000, 5000].map(amt => (
                                <button key={amt} onClick={() => setBetAmount(amt)} className={`px-6 py-3 rounded-2xl font-black text-xs border transition-all ${betAmount === amt ? 'bg-cyan-500 text-black border-white shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-zinc-900 text-zinc-600 border-white/5'}`}>₹{amt}</button>
                            ))}
                        </div>
                        <button onClick={startCharge} className="w-full py-6 rounded-[2.5rem] bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-black text-2xl uppercase tracking-[0.5em] shadow-2xl active:scale-95 transition-all border-t-2 border-white/20">CHARGE CORE</button>
                    </div>
                ) : (
                    <button 
                        onClick={capture} 
                        disabled={gameState !== 'CHARGING'}
                        className={`w-full py-8 rounded-[2.5rem] font-black text-3xl uppercase tracking-[0.4em] shadow-2xl transition-all ${gameState === 'CHARGING' ? 'bg-yellow-500 text-black active:scale-95 animate-bounce' : 'bg-zinc-800 text-zinc-600 opacity-50'}`}
                    >
                        CAPTURE ₹{(betAmount * multiplier).toFixed(2)}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CyberBurst;
