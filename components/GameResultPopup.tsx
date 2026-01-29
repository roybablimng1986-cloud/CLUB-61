
import React, { useEffect, useState } from 'react';
import { GameResult } from '../types';
import { X, Trophy, Frown, Sparkles, Star, Rocket, Bomb, Target, Skull, Zap } from 'lucide-react';

const Overlay: React.FC<{ children: React.ReactNode; visible: boolean }> = ({ children, visible }) => (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none ${visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md"></div>
        <div className={`relative pointer-events-auto transform transition-all duration-500 ${visible ? 'scale-100 translate-y-0' : 'scale-50 translate-y-10'}`}>{children}</div>
    </div>
);

const GameResultPopup: React.FC<{ result: GameResult | null; onClose: () => void; }> = ({ result, onClose }) => {
    const [visible, setVisible] = useState(false);
    
    useEffect(() => { 
        if (result) { 
            setVisible(true); 
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
                        <div className="w-[85vw] max-w-sm bg-[#1e293b] border-4 border-blue-500 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(59,130,246,0.5)] relative">
                            <button onClick={handleClose} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400"><X size={16}/></button>
                            <div className="flex justify-center mb-6"><div className="p-4 bg-blue-500/20 rounded-full border-2 border-blue-500/30"><Target size={60} className="text-blue-400" /></div></div>
                            <h2 className="text-3xl font-black text-blue-400 uppercase italic mb-2">SAFE PASSAGE</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Mines Cleared Successfully</p>
                            <div className="bg-black/40 py-6 rounded-2xl border border-blue-900 shadow-inner"><span className="text-5xl font-black text-white italic">₹{result.amount.toFixed(2)}</span></div>
                        </div>
                    );
                case 'Aviator':
                    return (
                        <div className="w-[85vw] max-w-sm bg-gradient-to-b from-red-600 to-red-900 rounded-3xl p-8 text-center shadow-[0_0_80px_rgba(220,38,38,0.6)] relative">
                            <button onClick={handleClose} className="absolute top-4 right-4 p-2 bg-black/20 rounded-full text-white/50"><X size={16}/></button>
                            <div className="flex justify-center mb-6"><Rocket size={70} className="text-white animate-bounce" /></div>
                            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-4">TAKEOFF SUCCESS</h2>
                            <div className="bg-black/50 py-5 rounded-2xl border border-white/20"><span className="text-5xl font-black text-yellow-400 italic">₹{result.amount.toFixed(2)}</span></div>
                        </div>
                    );
                case 'WinGo':
                    return (
                        <div className="w-[85vw] max-w-sm bg-gradient-to-br from-purple-600 to-indigo-800 rounded-3xl p-8 text-center border-4 border-white/10 shadow-2xl relative">
                            <button onClick={handleClose} className="absolute top-4 right-4 p-2 bg-black/20 rounded-full text-white/50"><X size={16}/></button>
                            <div className="absolute top-0 right-0 p-10 bg-white/10 rounded-full blur-3xl"></div>
                            <h2 className="text-2xl font-black text-white uppercase italic tracking-widest mb-1">ELEGANT WIN</h2>
                            <p className="text-[10px] text-purple-200 opacity-60 mb-6">Period {result.period} Settled</p>
                            <div className="text-6xl font-black text-white drop-shadow-lg mb-4">₹{result.amount.toFixed(2)}</div>
                            <div className="flex justify-center gap-2">
                                {result.resultDetails?.map((d, i) => (
                                    <span key={i} className={`${d.color} px-3 py-1 rounded-full text-[10px] font-black uppercase text-white border border-white/20`}>{d.value}</span>
                                ))}
                            </div>
                        </div>
                    );
                case 'Dog Road':
                    return (
                        <div className="w-[85vw] max-w-sm bg-black border-4 border-yellow-500 rounded-[3rem] p-10 text-center shadow-[0_0_100px_rgba(234,179,8,0.3)] relative">
                            <button onClick={handleClose} className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-yellow-500"><X size={20}/></button>
                            <div className="text-7xl mb-6">🐕</div>
                            <h2 className="text-4xl font-black gold-text italic uppercase mb-6">FINISHED</h2>
                            <div className="text-5xl font-black text-white italic tracking-tighter">₹{result.amount.toFixed(2)}</div>
                        </div>
                    );
                default:
                    return (
                        <div className="w-[85vw] max-w-sm bg-gradient-to-b from-[#fcd34d] to-[#d97706] rounded-[2.5rem] p-1 shadow-[0_0_100px_rgba(217,119,6,0.6)] relative">
                            <div className="bg-[#111827] rounded-[2.4rem] p-8 text-center border border-white/10 overflow-hidden relative">
                                <button onClick={handleClose} className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-yellow-500"><X size={18}/></button>
                                <div className="flex justify-center mb-6"><Trophy size={64} className="text-yellow-500" /></div>
                                <h2 className="text-3xl font-black italic gold-text uppercase mb-1">CONGRATS</h2>
                                <div className="bg-[#0a0f1d] py-6 rounded-3xl border border-slate-800 shadow-inner mt-4"><div className="text-5xl font-black text-yellow-400 italic">₹{result.amount.toFixed(2)}</div></div>
                            </div>
                        </div>
                    );
            }
        } else {
            return (
                <div className="w-[85vw] max-w-sm bg-[#1e293b] rounded-[3rem] p-10 text-center border-t-4 border-slate-600 shadow-[0_30px_100px_rgba(0,0,0,1)] relative">
                    <button onClick={handleClose} className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full border border-white/5 text-slate-400"><X size={18}/></button>
                    <div className="flex justify-center mb-8">
                        {result?.game === 'Mines' ? <Bomb size={60} className="text-red-500" /> : <Frown size={56} className="text-slate-500" />}
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-3 italic">DEFEAT</h2>
                    <div className="bg-[#0f172a] p-5 rounded-3xl border border-slate-800 mb-6 flex justify-between items-center shadow-inner">
                        <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Assets Lost</span>
                        <span className="text-2xl font-black text-slate-400 italic">₹{result?.amount.toFixed(2)}</span>
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
