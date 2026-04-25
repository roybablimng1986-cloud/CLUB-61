
import React from 'react';
import { X, Info } from 'lucide-react';

interface HowToPlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  rules: string[];
  payouts?: { label: string; value: string }[];
}

const HowToPlay: React.FC<HowToPlayProps> = ({ isOpen, onClose, title, rules, payouts }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-[#111] border border-white/10 w-full max-w-sm rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[80vh]">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 rounded-t-[2.5rem]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-xl text-yellow-500">
              <Info size={20} />
            </div>
            <h2 className="text-2xl font-black italic gold-text tracking-tighter uppercase">{title}</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors text-zinc-400">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar text-sm leading-relaxed text-zinc-300">
           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">How to Win</h3>
              <ul className="space-y-3">
                {rules.map((rule, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0"></span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
           </div>

           {payouts && payouts.length > 0 && (
             <div className="space-y-4">
                <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Winning Multipliers</h3>
                <div className="grid grid-cols-1 gap-2">
                  {payouts.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-zinc-500 font-bold uppercase text-[10px]">{p.label}</span>
                      <span className="font-black gold-text italic text-lg">{p.value}</span>
                    </div>
                  ))}
                </div>
             </div>
           )}
        </div>
        
        <div className="p-6 bg-zinc-900/30">
          <button onClick={onClose} className="w-full py-4 bg-yellow-500 text-black font-black uppercase tracking-widest rounded-2xl text-xs active:scale-95 transition-all shadow-lg">Got it!</button>
        </div>
      </div>
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};

export default HowToPlay;
