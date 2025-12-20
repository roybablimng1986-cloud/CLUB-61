import React, { useEffect, useState } from 'react';
import { GameResult } from '../types';
import { X, Plane, Bomb, RotateCw, Skull, Frown } from 'lucide-react';

const Overlay: React.FC<{ children: React.ReactNode; visible: boolean }> = ({ children, visible }) => (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none ${visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        <div className={`relative pointer-events-auto transform transition-all duration-500 ${visible ? 'scale-100 translate-y-0' : 'scale-50 translate-y-10'}`}>{children}</div>
    </div>
);

const GameResultPopup: React.FC<{ result: GameResult | null; onClose: () => void; }> = ({ result, onClose }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => { if (result) { setVisible(true); const t = setTimeout(handleClose, 2000); return () => clearTimeout(t); } }, [result]);
    const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };
    if (!result && !visible) return null;
    const CloseButton = () => <button onClick={handleClose} className="absolute -bottom-12 left-1/2 -translate-x-1/2 p-2 bg-white/10 rounded-full border border-white/20 text-white"><X size={24} /></button>;

    if (result?.game === 'Aviator') return (
        <Overlay visible={visible}>
            <div className="w-[90vw] max-w-sm bg-gradient-to-b from-gray-900 to-black border-2 border-red-600 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(220,38,38,0.3)] relative">
                <h2 className={`text-3xl font-black italic mb-2 ${result.win ? 'text-green-500' : 'text-red-600'}`}>{result.win ? 'TOOK OFF!' : 'FLEW AWAY'}</h2>
                <div className="text-4xl font-mono font-bold text-white mb-4">{result.resultDetails?.find(d => d.label === 'Cashout' || d.label === 'Crash')?.value}</div>
                <div className={`text-5xl font-black ${result.win ? 'text-green-400' : 'text-gray-500 line-through'}`}>₹{result.amount.toFixed(2)}</div>
                <CloseButton />
            </div>
        </Overlay>
    );
    if (result?.game === 'Mines') return (
        <Overlay visible={visible}>
            <div className="w-[90vw] max-w-sm bg-[#1e293b] border-4 border-blue-500 rounded-2xl p-6 text-center shadow-2xl relative">
                <h2 className={`text-3xl font-black uppercase mb-4 ${result.win ? 'text-blue-400' : 'text-red-500'}`}>{result.win ? 'Gems Found!' : 'Boom!'}</h2>
                <div className={`text-5xl font-black ${result.win ? 'text-white' : 'text-red-500'}`}>₹{result.amount.toFixed(2)}</div>
                <CloseButton />
            </div>
        </Overlay>
    );
    if (result?.game === 'Lucky Wheel') return (
        <Overlay visible={visible}>
            <div className={`w-[90vw] max-w-sm border-[6px] rounded-full aspect-square flex flex-col items-center justify-center p-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.5)] relative ${result.win ? 'bg-[#2d1b4e] border-yellow-400' : 'bg-[#1a0b2e] border-gray-700'}`}>
                {result.win ? <><RotateCw size={48} className="text-yellow-400 animate-spin-slow mb-2"/><h2 className="text-4xl font-black text-yellow-400 mb-2">BIG WIN!</h2><div className="text-6xl font-black text-white">₹{result.amount.toFixed(0)}</div></> : <><Frown size={40} className="text-purple-400 mb-2"/><h2 className="text-3xl font-black text-purple-300">SO CLOSE!</h2></>}
                <CloseButton />
            </div>
        </Overlay>
    );
    if (result?.game === 'Dog Road' || result?.game === 'Frog Road') return (
        <Overlay visible={visible}>
            <div className={`w-[90vw] max-w-sm rounded-3xl p-6 text-center border-4 ${result.win ? 'bg-black border-green-500' : 'bg-black border-red-600'}`}>
                <h2 className={`text-4xl font-black italic mb-2 ${result.win ? 'text-green-400' : 'text-red-500'}`}>{result.win ? 'VICTORY!' : 'CRASHED!'}</h2>
                <div className={`text-5xl font-black ${result.win ? 'text-white' : 'text-gray-500 line-through'}`}>₹{result.amount.toFixed(0)}</div>
                <CloseButton />
            </div>
        </Overlay>
    );
    return (
        <Overlay visible={visible}>
            <div className="w-[90vw] max-w-sm bg-gradient-to-b from-[#FFF5D6] to-[#FFE4B5] rounded-3xl p-6 text-center shadow-2xl relative">
                <h2 className={`text-2xl font-black uppercase mb-1 ${result?.win ? 'text-orange-600' : 'text-slate-600'}`}>{result?.win ? 'Congratulations' : 'Better Luck Next Time'}</h2>
                <div className={`text-4xl font-black mb-2 ${result?.win ? 'text-red-600' : 'text-slate-400'}`}>₹{result?.amount.toFixed(2)}</div>
                <CloseButton />
            </div>
        </Overlay>
    );
};
export default GameResultPopup;