
import React, { useEffect, useState } from 'react';
import { GameResult } from '../types';
import { X, Plane, Bomb, Diamond, RotateCw, Skull, Frown } from 'lucide-react';

interface Props {
    result: GameResult | null;
    onClose: () => void;
}

// Moved Overlay outside to avoid re-creation on render and fix typing issues
const Overlay: React.FC<{ children: React.ReactNode; visible: boolean }> = ({ children, visible }) => (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none ${visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        <div className={`relative pointer-events-auto transform transition-all duration-500 ${visible ? 'scale-100 translate-y-0' : 'scale-50 translate-y-10'}`}>
            {children}
        </div>
    </div>
);

const GameResultPopup: React.FC<Props> = ({ result, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (result) {
            setVisible(true);
            const timer = setTimeout(() => {
                handleClose();
            }, 2000); // 2 Seconds Auto Close
            return () => clearTimeout(timer);
        }
    }, [result]);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 300);
    };

    if (!result && !visible) return null;

    // Common Close Button
    const CloseButton = () => (
         <button onClick={handleClose} className="absolute -bottom-12 left-1/2 -translate-x-1/2 p-2 bg-white/10 rounded-full border border-white/20 text-white hover:bg-white/20 transition-colors pointer-events-auto cursor-pointer">
            <X size={24} />
        </button>
    );

    // 1. AVIATOR POPUP
    if (result?.game === 'Aviator') {
        return (
            <Overlay visible={visible}>
                <div className="w-[90vw] max-w-sm bg-gradient-to-b from-gray-900 to-black border-2 border-red-600 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(220,38,38,0.3)] relative overflow-visible">
                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 rounded-3xl overflow-hidden"></div>
                    
                    <div className="relative z-10">
                        <div className={`w-20 h-20 mx-auto rounded-full border-4 flex items-center justify-center mb-4 ${result.win ? 'border-green-500 bg-green-500/20' : 'border-red-600 bg-red-600/20'}`}>
                            <Plane size={40} className={`transform -rotate-45 ${result.win ? 'text-green-500' : 'text-red-600'}`} />
                        </div>
                        
                        <h2 className={`text-3xl font-black italic tracking-wider mb-2 ${result.win ? 'text-green-500' : 'text-red-600'}`}>
                            {result.win ? 'TOOK OFF!' : 'FLEW AWAY'}
                        </h2>
                        
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
                            <div className="text-xs text-gray-400 font-mono uppercase">Multiplier</div>
                            <div className={`text-4xl font-mono font-bold ${result.win ? 'text-white' : 'text-gray-500'}`}>
                                {result.resultDetails?.find(d => d.label === 'Cashout' || d.label === 'Crash')?.value}
                            </div>
                        </div>

                        {result.win ? (
                            <div className="animate-pulse">
                                <div className="text-xs text-green-400 font-bold uppercase tracking-widest mb-1">Total Win</div>
                                <div className="text-5xl font-black text-white drop-shadow-md">₹{result.amount.toFixed(2)}</div>
                            </div>
                        ) : (
                             <div>
                                <div className="text-xs text-red-400 font-bold uppercase tracking-widest mb-1">Loss Amount</div>
                                <div className="text-3xl font-bold text-gray-400 line-through">₹{result.amount.toFixed(2)}</div>
                            </div>
                        )}
                    </div>
                    <CloseButton />
                </div>
            </Overlay>
        );
    }

    // 2. MINES POPUP
    if (result?.game === 'Mines') {
        return (
            <Overlay visible={visible}>
                <div className="w-[90vw] max-w-sm bg-[#1e293b] border-4 border-blue-500 rounded-2xl p-6 text-center shadow-2xl relative overflow-visible">
                    {/* Decorative Gems */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
                    
                    <div className="relative z-10">
                         {result.win ? (
                             <div className="mb-4">
                                 <img src="https://cdn-icons-png.flaticon.com/512/2276/2276931.png" className="w-24 h-24 mx-auto animate-bounce drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" alt="Win"/>
                             </div>
                         ) : (
                             <div className="mb-4">
                                 <img src="https://cdn-icons-png.flaticon.com/512/112/112683.png" className="w-24 h-24 mx-auto animate-pulse" alt="Lose"/>
                             </div>
                         )}

                         <h2 className={`text-3xl font-black uppercase mb-4 ${result.win ? 'text-blue-400' : 'text-red-500'}`}>
                            {result.win ? 'Gems Found!' : 'Boom!'}
                         </h2>

                         {result.win ? (
                            <div className="bg-blue-900/30 p-4 rounded-xl border border-blue-500/30">
                                <div className="text-sm text-blue-200 uppercase font-bold mb-1">Cash Out</div>
                                <div className="text-5xl font-black text-white">₹{result.amount.toFixed(2)}</div>
                            </div>
                         ) : (
                             <div className="bg-red-900/20 p-4 rounded-xl border border-red-500/20">
                                <div className="text-sm text-red-300 uppercase font-bold mb-1">Detonated</div>
                                <div className="text-2xl font-bold text-red-500">Better luck next time</div>
                            </div>
                         )}
                    </div>
                    <CloseButton />
                </div>
            </Overlay>
        );
    }

    // 3. LUCKY WHEEL POPUP
    if (result?.game === 'Lucky Wheel') {
        return (
            <Overlay visible={visible}>
                <div className={`w-[90vw] max-w-sm border-[6px] rounded-full aspect-square flex flex-col items-center justify-center p-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.5)] relative overflow-visible ${result.win ? 'bg-[#2d1b4e] border-yellow-400' : 'bg-[#1a0b2e] border-gray-700'}`}>
                    
                    {result.win ? (
                         <>
                            {/* Winning Rotating Shine */}
                            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.1),transparent)] animate-[spin_4s_linear_infinite] rounded-full"></div>
                            <div className="relative z-10">
                                <div className="mb-2 animate-spin-slow">
                                    <RotateCw size={48} className="text-yellow-400 mx-auto" />
                                </div>
                                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-sm mb-2">
                                    BIG WIN!
                                </h2>
                                <div className="text-6xl font-black text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
                                    ₹{result.amount.toFixed(0)}
                                </div>
                                <div className="mt-4 px-4 py-1 bg-yellow-500 text-black font-bold rounded-full text-xs uppercase">
                                    {result.resultDetails?.[0]?.value} Multiplier
                                </div>
                            </div>
                         </>
                    ) : (
                        <div className="relative z-10 flex flex-col items-center">
                             <div className="w-20 h-20 rounded-full bg-purple-900/50 flex items-center justify-center mb-4 border-2 border-purple-500/30">
                                <Frown size={40} className="text-purple-400" />
                             </div>
                             <h2 className="text-3xl font-black text-purple-300 mb-2 drop-shadow-md">SO CLOSE!</h2>
                             <p className="text-xs text-purple-400/80 uppercase tracking-widest font-bold mb-4">Better luck next spin</p>
                             <div className="px-6 py-2 bg-purple-900/30 rounded-full border border-purple-500/20 text-xs text-purple-300">
                                 Don't give up!
                             </div>
                        </div>
                    )}
                    <CloseButton />
                </div>
            </Overlay>
        );
    }

    // 4. DOG ROAD POPUP
    if (result?.game === 'Dog Road' || result?.game === 'Frog Road') {
        return (
             <Overlay visible={visible}>
                <div className={`w-[90vw] max-w-sm rounded-3xl p-6 text-center shadow-2xl relative overflow-visible border-4 ${result.win ? 'bg-gradient-to-b from-green-900 to-black border-green-500' : 'bg-gradient-to-b from-red-900 to-black border-red-600'}`}>
                     
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] opacity-30 rounded-3xl"></div>

                     <div className="relative z-10">
                         {result.win ? (
                             <div className="flex flex-col items-center">
                                 <img src="https://cdn-icons-png.flaticon.com/512/616/616554.png" alt="Dog" className="w-24 h-24 object-contain animate-bounce drop-shadow-lg mb-2" />
                                 <h2 className="text-4xl font-black text-green-400 italic tracking-tighter mb-2">VICTORY!</h2>
                                 <div className="bg-black/50 p-4 rounded-xl border border-green-500/50 w-full mb-2">
                                     <div className="text-xs text-green-300 uppercase font-bold">Total Payout</div>
                                     <div className="text-5xl font-black text-white">₹{result.amount.toFixed(0)}</div>
                                 </div>
                                 <span className="text-green-500/80 text-xs font-mono">Reached destination safely</span>
                             </div>
                         ) : (
                              <div className="flex flex-col items-center">
                                 <div className="w-24 h-24 flex items-center justify-center relative mb-4">
                                     <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                                     <Skull size={64} className="text-red-500" />
                                 </div>
                                 <h2 className="text-4xl font-black text-red-500 italic tracking-tighter mb-4">CRASHED!</h2>
                                 <div className="bg-black/50 p-4 rounded-xl border border-red-500/50 w-full">
                                     <div className="text-xs text-red-400 uppercase font-bold">You lost</div>
                                     <div className="text-3xl font-bold text-gray-500 line-through">₹{result.amount.toFixed(0)}</div>
                                 </div>
                             </div>
                         )}
                     </div>
                     <CloseButton />
                </div>
             </Overlay>
        );
    }

    // 5. DEFAULT POPUP (WinGo, etc)
    return (
        <Overlay visible={visible}>
            <div className="w-[90vw] max-w-sm bg-gradient-to-b from-[#FFF5D6] to-[#FFE4B5] rounded-3xl p-6 text-center shadow-2xl relative overflow-visible">
                <div className="mt-4">
                    <h2 className={`text-2xl font-black uppercase tracking-wide mb-1 ${result?.win ? 'text-orange-600' : 'text-slate-600'}`}>
                        {result?.win ? 'Congratulations' : 'Better Luck Next Time'}
                    </h2>
                    
                    {result?.resultDetails && (
                        <div className="flex justify-center gap-2 mb-4 mt-2">
                            {result.resultDetails.map((detail, idx) => (
                                <span key={idx} className={`px-3 py-1 rounded text-xs font-bold text-white shadow-md ${detail.color || 'bg-slate-500'}`}>
                                    {detail.value}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="my-6 relative">
                         <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Bonus</div>
                         <div className={`text-4xl font-black ${result?.win ? 'text-red-600' : 'text-slate-400'}`}>
                             ₹{result?.amount.toFixed(2)}
                         </div>
                         <div className="h-1 w-20 bg-black/10 mx-auto mt-2 rounded-full"></div>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono mb-4">
                        Period: {result?.period || Date.now().toString().slice(0,12)}
                    </div>

                    <div className="text-[10px] text-orange-500 animate-pulse font-bold">
                        Auto closing...
                    </div>
                </div>
                <CloseButton />
            </div>
        </Overlay>
    );
};

export default GameResultPopup;
