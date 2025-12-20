
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Coins, Volume2, VolumeX, ArrowDown } from 'lucide-react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, toggleMute, getMuteStatus } from '../services/mockFirebase';
import { GameResult } from '../types';

interface VortexProps {
    onBack: () => void;
    userBalance: number;
    onResult: (result: GameResult) => void;
}

// Wheel Configuration
// Visual Order: Clockwise starting from Top (0 degrees)
const SEGMENTS = [
    { label: '50X', value: 50, bg: '#E11D48', text: 'white' }, // Pink/Red - Top
    { label: 'LOSE', value: 0, bg: '#1E293B', text: '#94A3B8' }, 
    { label: '2X', value: 2, bg: '#F59E0B', text: 'black' }, // Amber - Right
    { label: 'LOSE', value: 0, bg: '#1E293B', text: '#94A3B8' },
    { label: '10X', value: 10, bg: '#10B981', text: 'white' }, // Emerald - Bottom
    { label: 'LOSE', value: 0, bg: '#1E293B', text: '#94A3B8' },
    { label: '5X', value: 5, bg: '#3B82F6', text: 'white' }, // Blue - Left
    { label: 'LOSE', value: 0, bg: '#1E293B', text: '#94A3B8' },
];

const Spinner: React.FC<VortexProps> = ({ onBack, userBalance, onResult }) => {
    const [betAmount, setBetAmount] = useState(10);
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0); 
    const [muted, setMuted] = useState(getMuteStatus());
    const [lastWinIndex, setLastWinIndex] = useState<number | null>(null);
    
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            stopAllSounds();
        };
    }, []);

    const handleToggleMute = () => {
        setMuted(toggleMute());
    };

    const startSpin = () => {
        if (isSpinning) return;
        if (betAmount > userBalance) {
            alert("Insufficient Balance");
            return;
        }

        if(isMounted.current) playSound('click');
        if(isMounted.current) playSound('spin'); 
        updateBalance(-betAmount, 'BET', 'Lucky Wheel');
        setIsSpinning(true);
        setLastWinIndex(null);

        // 1. Determine Result Probability
        const rand = Math.random();
        let targetIndex = 0;

        // Weights
        if (rand < 0.5) { // 50% Lose
             const loseIndices = [1, 3, 5, 7];
             targetIndex = loseIndices[Math.floor(Math.random() * loseIndices.length)];
        } else if (rand < 0.8) { // 30% 2x (Index 2)
             targetIndex = 2;
        } else if (rand < 0.9) { // 10% 5x (Index 6)
             targetIndex = 6;
        } else if (rand < 0.98) { // 8% 10x (Index 4)
             targetIndex = 4;
        } else { // 2% 50x (Index 0)
             targetIndex = 0;
        }

        // 2. Calculate Exact Rotation
        // Segment 0 starts at Top (0 deg).
        // To land on targetIndex, we need that segment to be at Top (0 deg) after rotation.
        // Current Angle of targetIndex is `targetIndex * 45`.
        // To bring it to 0, we must subtract `targetIndex * 45` from the total rotation.
        
        const segmentAngle = 360 / SEGMENTS.length; // 45 degrees
        const spins = 5; // Minimum full spins
        
        const currentRot = rotation;
        const minSpin = 360 * spins;
        const targetAngle = -(targetIndex * segmentAngle); 
        
        // Calculate the next value: value < currentRot - minSpin AND value % 360 == targetAngle
        const nextRot = Math.floor((currentRot - minSpin - targetAngle) / 360) * 360 + targetAngle;

        setRotation(nextRot);

        setTimeout(() => {
            if (!isMounted.current) return;
            setIsSpinning(false);
            stopAllSounds();
            handleResult(SEGMENTS[targetIndex]);
            setLastWinIndex(targetIndex);
        }, 4000); 
    };

    const handleResult = (segment: typeof SEGMENTS[0]) => {
        if (!isMounted.current) return;
        const winAmount = betAmount * segment.value;
        if (winAmount > 0) {
            playSound('win');
            updateBalance(winAmount, 'WIN', 'Wheel Win');
            onResult({
                win: true,
                amount: winAmount,
                game: 'Lucky Wheel',
                resultDetails: [{ label: 'Multiplier', value: segment.label, color: 'bg-green-500' }]
            });
            addGameHistory('Lucky Wheel', betAmount, winAmount, `Hit ${segment.label}`);
        } else {
            playSound('loss');
            onResult({
                win: false,
                amount: betAmount,
                game: 'Lucky Wheel',
                resultDetails: [{ label: 'Result', value: 'Loss', color: 'bg-red-500' }]
            });
            addGameHistory('Lucky Wheel', betAmount, 0, `Hit Lose`);
        }
    };

    return (
        <div className="bg-[#1e1136] min-h-screen flex flex-col font-sans text-white overflow-hidden">
             {/* Header */}
             <div className="p-4 flex items-center justify-between z-10 bg-[#2d1b4e] border-b border-purple-900">
                <div className="flex items-center gap-4">
                    <button onClick={onBack}><ArrowLeft className="text-purple-300" /></button>
                    <h1 className="text-lg font-bold italic tracking-wider">LUCKY <span className="text-yellow-400">WHEEL</span></h1>
                </div>
                <div className="flex items-center gap-3">
                     <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-purple-700">
                         <Coins size={14} className="text-yellow-500"/>
                         <span className="text-sm font-bold text-white">₹{userBalance.toFixed(2)}</span>
                    </div>
                    <button onClick={handleToggleMute}>
                        {muted ? <VolumeX size={20} className="text-purple-300"/> : <Volume2 size={20} className="text-purple-300"/>}
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                
                {/* BIG RED POINTER */}
                <div className="absolute top-[50%] left-1/2 -translate-x-1/2 z-40 mt-[-185px] md:mt-[-215px] filter drop-shadow-lg pointer-events-none">
                     <ArrowDown size={64} className="text-red-600 fill-red-600 stroke-[3px] stroke-white"/>
                </div>

                {/* Outer Rim */}
                <div className="relative w-[320px] h-[320px] md:w-[380px] md:h-[380px] rounded-full p-4 bg-gradient-to-b from-[#FCD34D] via-[#B45309] to-[#FCD34D] shadow-[0_0_50px_rgba(255,215,0,0.3)] flex items-center justify-center">
                    
                    {/* Lights on Rim */}
                    <div className="absolute inset-0 rounded-full animate-spin-slow">
                        {[...Array(12)].map((_, i) => (
                            <div 
                                key={i} 
                                className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]"
                                style={{ 
                                    top: '50%', left: '50%',
                                    transform: `rotate(${i * 30}deg) translate(150px) md:translate(180px)`
                                }}
                            ></div>
                        ))}
                    </div>

                    {/* Wheel Container */}
                    <div className="relative w-full h-full rounded-full bg-black overflow-hidden border-4 border-black shadow-inner">
                        <div 
                            className="w-full h-full rounded-full"
                            style={{ 
                                transform: `rotate(${rotation}deg)`,
                                transition: isSpinning ? 'transform 4s cubic-bezier(0.2, 0, 0.2, 1)' : 'none'
                            }}
                        >
                            {/* Colorful Segments */}
                            <div 
                                className="absolute inset-0 w-full h-full rounded-full"
                                style={{
                                    background: `conic-gradient(from -22.5deg,
                                        ${SEGMENTS.map((s, i) => `${s.bg} ${i * 45}deg ${(i + 1) * 45}deg`).join(', ')}
                                    )`
                                }}
                            ></div>

                            {/* Labels Layer */}
                            {SEGMENTS.map((seg, i) => {
                                const angle = 360 / SEGMENTS.length;
                                const rotationAngle = angle * i;
                                return (
                                    <div 
                                        key={i}
                                        className="absolute w-full h-full top-0 left-0 flex justify-center pt-6"
                                        style={{ transform: `rotate(${rotationAngle}deg)` }}
                                    >
                                        <div className="text-center transform origin-bottom">
                                            <span 
                                                className="block font-black text-xl md:text-2xl drop-shadow-md tracking-tighter"
                                                style={{ color: seg.text }}
                                            >
                                                {seg.label}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Center Hub */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full border-4 border-white shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center z-20">
                        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center border-2 border-red-800">
                             <span className="text-white font-black text-xs">SPIN</span>
                        </div>
                    </div>
                </div>
                
                {lastWinIndex !== null && !isSpinning && (
                    <div className="mt-8 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black px-8 py-3 rounded-full shadow-[0_0_20px_rgba(255,165,0,0.5)] animate-bounce border-2 border-white">
                        RESULT: {SEGMENTS[lastWinIndex].label}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="bg-[#2d1b4e] p-6 rounded-t-3xl border-t border-purple-700 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
                <div className="flex justify-center mb-6">
                    <div className="text-center">
                        <p className="text-purple-300 text-[10px] font-bold uppercase tracking-wider mb-1">Bet Amount</p>
                        <p className="text-3xl font-black text-white">₹{betAmount}</p>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-6">
                    {[10, 50, 100, 500].map(amt => (
                        <button 
                            key={amt}
                            onClick={() => !isSpinning && setBetAmount(amt)}
                            className={`py-3 rounded-xl font-bold text-xs border transition-all ${betAmount === amt ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg' : 'bg-[#1a0b2e] text-purple-400 border-purple-800'}`}
                        >
                            {amt}
                        </button>
                    ))}
                </div>

                <div className="flex justify-center items-center gap-6">
                    <button onClick={() => !isSpinning && setBetAmount(Math.max(10, betAmount - 10))} className="w-12 h-12 rounded-full bg-[#1a0b2e] border border-purple-700 text-purple-300 font-bold hover:text-white">-</button>
                    
                    <button 
                        onClick={startSpin}
                        disabled={isSpinning}
                        className={`w-full max-w-[200px] py-4 rounded-full font-black text-xl uppercase tracking-widest shadow-lg transition-transform active:scale-95 ${isSpinning ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-orange-500/30'}`}
                    >
                        {isSpinning ? 'Spinning...' : 'SPIN NOW'}
                    </button>

                    <button onClick={() => !isSpinning && setBetAmount(betAmount + 10)} className="w-12 h-12 rounded-full bg-[#1a0b2e] border border-purple-700 text-purple-300 font-bold hover:text-white">+</button>
                </div>
            </div>
        </div>
    );
};

export default Spinner;
