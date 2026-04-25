
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, Zap, ShieldAlert, History, Volume2, VolumeX, HelpCircle } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus, db, auth, addGameBet, shouldForceLoss } from '../services/supabaseService';
import { GameResult } from '../types';
import { collection, addDoc } from 'firebase/firestore';

import CyberBurstResultPopup from '../components/CyberBurstResultPopup';
import HowToPlay from '../components/HowToPlay';

const CyberBurst: React.FC<{ onBack: () => void; userBalance: number; onResult: (r: GameResult) => void; }> = ({ onBack, userBalance, onResult }) => {
    const [gameState, setGameState] = useState<'IDLE' | 'CHARGING' | 'BURST' | 'CAPTURED'>('IDLE');
    const [multiplier, setMultiplier] = useState(1.0);
    const [betAmount, setBetAmount] = useState(10);
    const [muted, setMuted] = useState(getMuteStatus());
    const [history, setHistory] = useState<number[]>([1.5, 2.8, 1.1, 4.5, 0.0]);
    const [cbResult, setCbResult] = useState<any | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    
    const isMounted = useRef(true);
    const burstPoint = useRef(0);
    const frameRef = useRef(0);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; stopAllSounds(); cancelAnimationFrame(frameRef.current); };
    }, []);

    const startCharge = async () => {
        if (userBalance < betAmount) { alert("Insufficient Capital"); return; }
        
        // Record bet in Firestore removed to save quota for instant games
        // addGameHistory will still record the result for the user

        playSound('bet_place');
        updateBalance(-betAmount, 'BET', 'Cyber Burst Charge');
        setCbResult(null);
        setGameState('CHARGING');
        setMultiplier(1.0);
        
        // Provably fair generation (simulated)
        const forced = shouldForceLoss(betAmount, userBalance);
        const r = forced ? Math.random() * 0.4 : Math.random(); 
        burstPoint.current = Math.max(1, forced ? (1.0 + Math.random() * 0.4) : (0.99 / (1 - r)));
        
        animate();
    };

    const animate = () => {
        if (!isMounted.current) return;
        setMultiplier(prev => {
            const next = prev * 1.015; // Slower, more suspenseful climb
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
        setCbResult({
            win: false,
            amount: betAmount,
            multiplier: 0,
            burstAt: burstPoint.current
        });
        addGameHistory('Cyber Burst', betAmount, 0, `Burst at ${burstPoint.current.toFixed(2)}x`);
        setTimeout(() => isMounted.current && setGameState('IDLE'), 2500);
    };

    const capture = () => {
        if (gameState !== 'CHARGING') return;
        cancelAnimationFrame(frameRef.current);
        setGameState('CAPTURED');
        
        const winAmt = betAmount * multiplier;
        updateBalance(winAmt, 'WIN', 'Cyber Burst Capture');
        setHistory(prev => [multiplier, ...prev].slice(0, 10));
        
        setCbResult({
            win: true,
            amount: winAmt,
            multiplier: multiplier
        });
        addGameHistory('Cyber Burst', betAmount, winAmt, `Captured ${multiplier.toFixed(2)}x`);
        setTimeout(() => isMounted.current && setGameState('IDLE'), 2500);
    };

    return (
        <div className="bg-black min-h-screen flex flex-col font-sans text-white overflow-hidden relative select-none">
            <CyberBurstResultPopup result={cbResult} onClose={() => setCbResult(null)} />
            <HowToPlay 
                isOpen={showHelp} 
                onClose={() => setShowHelp(false)} 
                title="Cyber Burst Rules"
                rules={[
                    "Set your stake and click 'CHARGE CORE' to begin.",
                    "The multiplier will continuously grow as energy charges.",
                    "Click 'CAPTURE' to secure your current winnings.",
                    "The core can BURST at any moment. If it bursts before you capture, you lose your stake.",
                    "The higher the multiplier moves, the greater the risk of a burst."
                ]}
                payouts={[
                    { label: "Capture Success", value: "Stake × Multiplier" },
                    { label: "Core Burst", value: "0" }
                ]}
            />
            <div className="p-4 flex justify-between items-center bg-[#111] border-b border-cyan-500/20 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 bg-zinc-900 rounded-2xl active:scale-90 transition-all"><ArrowLeft size={18}/></button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black italic text-cyan-400 tracking-tighter uppercase leading-none">CYBER BURST</h1>
                        <span className="text-[8px] text-cyan-500/40 mt-1 uppercase font-bold">Quantum Wallet</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-zinc-900 px-4 py-2 rounded-2xl border-2 border-cyan-500/40 text-cyan-400 font-mono shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center gap-2">
                        <Wallet size={14} />
                        <span className="font-black">₹{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setShowHelp(true)} className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20 active:scale-90 transition-all"><HelpCircle size={18}/></button>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                <div className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(6,182,212,0.15)_0%,_transparent_70%)] transition-opacity duration-300 ${gameState==='CHARGING'?'opacity-100':'opacity-30'}`}></div>
                
                {gameState === 'IDLE' && (
                    <div className="absolute top-4 left-4 right-4 bg-zinc-900/50 p-4 rounded-2xl border border-cyan-500/10 text-[10px] text-zinc-400 leading-relaxed">
                        <h4 className="font-black text-cyan-400 mb-1 uppercase">How to Play</h4>
                        <p>1. Choose your bet amount below.<br/>2. Click "CHARGE CORE" to start the energy surge.<br/>3. The multiplier increases as the core charges.<br/>4. Click "CAPTURE" before the core BURSTS to win!</p>
                    </div>
                )}
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

            <div className="bg-zinc-950 p-6 pb-12 border-t-2 border-cyan-500/30 z-50 shadow-[0_-20px_100px_rgba(0,0,0,1)]">
                {gameState === 'IDLE' ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-4 gap-2">
                            {[10, 50, 100, 500, 1000, 2000, 5000, 10000].map(amt => (
                                <button key={amt} onClick={() => setBetAmount(amt)} className={`py-4 rounded-2xl font-black text-[10px] border transition-all ${betAmount === amt ? 'bg-cyan-500 text-black border-white shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-105' : 'bg-zinc-900 text-zinc-600 border-white/5'}`}>₹{amt >= 1000 ? (amt/1000)+'K' : amt}</button>
                            ))}
                        </div>
                        <button onClick={startCharge} className="w-full py-7 rounded-[2.5rem] bg-gradient-to-r from-cyan-600 via-blue-700 to-cyan-600 text-white font-black text-2xl uppercase tracking-[0.5em] shadow-2xl active:scale-95 transition-all border-t-2 border-white/20">CHARGE CORE</button>
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
