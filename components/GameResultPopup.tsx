
import React, { useEffect, useState } from 'react';
import { GameResult } from '../types';
import { X, Trophy, Frown, Sparkles } from 'lucide-react';

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
            const t = setTimeout(handleClose, 4000); 
            return () => clearTimeout(t); 
        } 
    }, [result]);

    const handleClose = () => { 
        setVisible(false); 
        setTimeout(onClose, 300); 
    };

    if (!result && !visible) return null;

    const CloseButton = () => (
        <button 
            onClick={handleClose} 
            className="absolute -bottom-16 left-1/2 -translate-x-1/2 p-3 bg-white/10 rounded-full border border-white/20 text-white hover:bg-white/20 transition-all active:scale-90"
        >
            <X size={28} />
        </button>
    );

    if (result?.win) {
        return (
            <Overlay visible={visible}>
                <div className="w-[85vw] max-w-sm bg-gradient-to-b from-[#fcd34d] to-[#d97706] rounded-[2.5rem] p-1 shadow-[0_0_80px_rgba(217,119,6,0.5)] relative">
                    <div className="bg-[#111827] rounded-[2.4rem] p-8 text-center border border-white/10 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                            <Sparkles className="absolute top-4 left-4 text-yellow-400 animate-pulse" size={24}/>
                            <Sparkles className="absolute bottom-4 right-4 text-yellow-400 animate-bounce" size={20}/>
                        </div>
                        <div className="flex justify-center mb-4">
                            <div className="bg-yellow-500/20 p-4 rounded-full border border-yellow-500/30">
                                <Trophy size={48} className="text-yellow-500 fill-yellow-500/10 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black italic tracking-tighter gold-text uppercase mb-1">Congratulations</h2>
                        <div className="bg-[#0a0f1d] py-5 rounded-2xl border border-slate-800 shadow-inner mt-6">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Winning Amount</p>
                            <div className="text-5xl font-black text-yellow-400 drop-shadow-lg tracking-tighter">
                                ₹{result.amount.toFixed(2)}
                            </div>
                        </div>
                        {result.resultDetails && (
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {result.resultDetails.map((detail, idx) => (
                                    <div key={idx} className="bg-slate-800/50 p-2 rounded-xl flex items-center justify-center gap-2">
                                        <span className="text-[9px] text-slate-400 uppercase font-black">{detail.label}</span>
                                        <span className={`text-xs font-black px-2 py-0.5 rounded ${detail.color || 'text-white'}`}>{detail.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <CloseButton />
                </div>
            </Overlay>
        );
    }

    return (
        <Overlay visible={visible}>
            <div className="w-[85vw] max-w-sm bg-[#1e293b] rounded-[2.5rem] p-8 text-center border-t-4 border-slate-600 shadow-2xl relative">
                <div className="flex justify-center mb-6">
                    <div className="bg-slate-700/50 p-5 rounded-full border border-slate-600">
                        <Frown size={48} className="text-slate-400" />
                    </div>
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Better Luck Next Time</h2>
                <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 mb-2 flex justify-between items-center mt-6">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Stake amount</span>
                    <span className="text-lg font-black text-slate-300">₹{result?.amount.toFixed(2)}</span>
                </div>
                <CloseButton />
            </div>
        </Overlay>
    );
};

export default GameResultPopup;
