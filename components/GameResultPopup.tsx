
import React, { useEffect, useState } from 'react';
import { GameResult } from '../types';
import { X, Trophy, Frown, Sparkles, Star, Rocket, Bomb, Target, Skull, Zap } from 'lucide-react';
import { playSound } from '../services/supabaseService';

const Overlay: React.FC<{ children: React.ReactNode; visible: boolean }> = ({ children, visible }) => (
    <div className={`fixed inset-0 z-[100] flex justify-center pt-10 pointer-events-none ${visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div className={`relative pointer-events-auto transform transition-all duration-500 ${visible ? 'scale-100 translate-y-0' : 'scale-50 -translate-y-10'}`}>{children}</div>
    </div>
);

const GameResultPopup: React.FC<{ result: GameResult | null; onClose: () => void; }> = ({ result, onClose }) => {
    const [visible, setVisible] = useState(false);
    
    useEffect(() => { 
        if (result) { 
            setVisible(true); 
            if (result.win) playSound('win');
            else playSound('loss');
            const t = setTimeout(handleClose, 2000); 
            return () => clearTimeout(t); 
        } 
    }, [result]);

    const handleClose = () => { 
        setVisible(false); 
        setTimeout(onClose, 300); 
    };

    if (!result && !visible) return null;

    const renderStyledPopup = () => {
        if (result?.win) {
            switch(result.game) {
                case 'Mines':
                    return (
                        <div className="w-[65vw] max-w-[220px] bg-[#1e293b] border border-blue-500/30 rounded-2xl p-4 text-center shadow-2xl relative">
                            <button onClick={handleClose} className="absolute top-2 right-2 p-1 bg-slate-800 rounded-full text-slate-400"><X size={10}/></button>
                            <h2 className="text-sm font-black text-blue-400 uppercase italic mb-1">SAFE PASSAGE</h2>
                            <div className="bg-black/40 py-2 rounded-xl border border-blue-900 shadow-inner"><span className="text-xl font-black text-white italic">₹{result.amount.toFixed(2)}</span></div>
                        </div>
                    );
                case 'Aviator':
                    return (
                        <div className="w-[65vw] max-w-[220px] bg-red-600 rounded-2xl p-4 text-center shadow-xl relative">
                            <button onClick={handleClose} className="absolute top-2 right-2 p-1 bg-black/20 rounded-full text-white/50"><X size={10}/></button>
                            <h2 className="text-sm font-black text-white italic tracking-tighter uppercase mb-1">TAKEOFF SUCCESS</h2>
                            <div className="bg-black/50 py-2 rounded-xl"><span className="text-2xl font-black text-yellow-400 italic">₹{result.amount.toFixed(2)}</span></div>
                        </div>
                    );
                case 'WinGo':
                    return (
                        <div className="w-[65vw] max-w-[220px] bg-indigo-800 rounded-2xl p-4 text-center border border-white/10 shadow-2xl relative">
                            <button onClick={handleClose} className="absolute top-2 right-2 p-1 bg-black/20 rounded-full text-white/50"><X size={10}/></button>
                            <h2 className="text-xs font-black text-white uppercase italic tracking-widest mb-1">ELEGANT WIN</h2>
                            <div className="text-2xl font-black text-white mb-1">₹{result.amount.toFixed(2)}</div>
                            <div className="flex justify-center gap-1">
                                {result.resultDetails?.slice(0, 2).map((d, i) => (
                                    <span key={i} className={`${d.color} px-2 py-0.5 rounded-full text-[7px] font-black uppercase text-white border border-white/10`}>{d.value}</span>
                                ))}
                            </div>
                        </div>
                    );
                case 'Plinko':
                    return (
                        <div className="w-[65vw] max-w-[200px] bg-green-600 rounded-2xl p-3 text-center shadow-lg relative border-t-2 border-white/20">
                            <button onClick={handleClose} className="absolute top-2 right-2 p-1 bg-black/20 rounded-full text-white/50"><X size={10}/></button>
                            <h2 className="text-xs font-black text-white uppercase tracking-tighter mb-1">PLINKO WIN</h2>
                            <div className="bg-black/40 py-2 rounded-xl border border-white/10"><span className="text-xl font-black text-white">₹{result.amount.toFixed(2)}</span></div>
                        </div>
                    );
                case 'Chicken Road':
                case 'Dog Road':
                    return (
                        <div className="w-[70vw] max-w-[240px] bg-black border-2 border-yellow-500 rounded-[2rem] p-6 text-center shadow-2xl relative">
                            <button onClick={handleClose} className="absolute top-4 right-4 p-1.5 bg-slate-800 rounded-full text-yellow-500"><X size={12}/></button>
                            <div className="text-4xl mb-3">🐔</div>
                            <h2 className="text-xl font-black gold-text italic uppercase mb-2 leading-none">FINISHED</h2>
                            <div className="text-2xl font-black text-white italic tracking-tighter">₹{result.amount.toFixed(2)}</div>
                        </div>
                    );
                default:
                    return (
                        <div className="w-[70vw] max-w-[240px] bg-gradient-to-b from-[#fcd34d] to-[#d97706] rounded-[2rem] p-0.5 shadow-2xl relative">
                            <div className="bg-[#111827] rounded-[1.9rem] p-6 text-center border border-white/10 overflow-hidden relative">
                                <button onClick={handleClose} className="absolute top-4 right-4 p-1 bg-slate-800 rounded-full text-yellow-500"><X size={12}/></button>
                                <div className="flex justify-center mb-3"><Trophy size={40} className="text-yellow-500" /></div>
                                <h2 className="text-xl font-black italic gold-text uppercase mb-1 leading-none">CONGRATS</h2>
                                <div className="bg-[#0a0f1d] py-3 rounded-2xl border border-slate-800 shadow-inner mt-2"><div className="text-2xl font-black text-yellow-400 italic">₹{result.amount.toFixed(2)}</div></div>
                            </div>
                        </div>
                    );
            }
        } else {
            return (
                <div className="w-[70vw] max-w-[240px] bg-[#1e293b] rounded-[2rem] p-6 text-center border-t-2 border-slate-600 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
                    <button onClick={handleClose} className="absolute top-4 right-4 p-1.5 bg-slate-800 rounded-full border border-white/5 text-slate-400"><X size={12}/></button>
                    <div className="flex justify-center mb-4">
                        {result?.game === 'Mines' ? <Bomb size={40} className="text-red-500" /> : <Frown size={36} className="text-slate-500" />}
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2 leading-none italic">DEFEAT</h2>
                    <div className="bg-[#0f172a] p-3 rounded-2xl border border-slate-800 flex justify-between items-center shadow-inner">
                        <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Stake Lost</span>
                        <span className="text-lg font-black text-slate-400 italic">₹{result?.amount.toFixed(2)}</span>
                    </div>
                </div>
            );
        }
    };

    return (
        <Overlay visible={visible}>
            {renderStyledPopup()}
        </Overlay>
    );
};

export default GameResultPopup;
