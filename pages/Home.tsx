
import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { Flame, Tv, Volume2, Share2, Crown } from 'lucide-react';
import { transactions, subscribeToBalance } from '../services/mockFirebase';

interface HomeProps {
  setView: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ setView }) => {
  const [tickerItems, setTickerItems] = useState<string[]>([]);

  const generateFakeWinner = () => {
      const id = Math.floor(10000 + Math.random() * 90000);
      const suffix = Math.floor(10 + Math.random() * 90);
      const amount = (Math.random() * 5000 + 100).toFixed(2);
      const games = ['WinGo', 'Aviator', 'Mines', 'Lucky Wheel', 'Dog Road'];
      const game = games[Math.floor(Math.random() * games.length)];
      return `Member ID: ${id}***${suffix} Won ₹${amount} in ${game}!`;
  };

  useEffect(() => {
      const initialItems = Array(5).fill(null).map(generateFakeWinner);
      setTickerItems(initialItems);

      const unsub = subscribeToBalance(() => {
           const recentWithdrawal = transactions.find(t => t.type === 'WITHDRAW' && t.status === 'PROCESSING');
           if (recentWithdrawal) {
               const realMsg = `Member ID: YOU Won ₹${recentWithdrawal.amount} Withdrawal!`;
               setTickerItems(prev => [realMsg, ...prev].slice(0, 20));
           }
      });

      const interval = setInterval(() => {
          setTickerItems(prev => {
              const newItem = generateFakeWinner();
              const newArray = [newItem, ...prev];
              if (newArray.length > 20) newArray.pop();
              return newArray;
          });
      }, 3000);

      return () => {
          clearInterval(interval);
          unsub();
      }
  }, []);

  const handleShare = async () => {
      const shareData = {
          title: 'CLUB 61',
          text: 'Join the elite CLUB 61 and win big! Play WinGo, Aviator and more.',
          url: window.location.href
      };

      if (navigator.share) {
          try {
              await navigator.share(shareData);
          } catch (err) {
              console.log('Error sharing:', err);
          }
      } else {
          navigator.clipboard.writeText(window.location.href);
          alert('Club Invite link copied!');
      }
  };

  const GameCard = ({ title, desc, color, onClick, icon }: any) => (
    <div onClick={onClick} className={`bg-[#1e293b] rounded-2xl overflow-hidden cursor-pointer group hover:ring-2 hover:ring-yellow-500 transition-all border border-slate-700/50 shadow-lg`}>
        <div className={`h-28 bg-${color}-900/50 relative flex items-center justify-center overflow-hidden`}>
           <div className="text-5xl transform group-hover:scale-110 transition-transform duration-300 drop-shadow-2xl">{icon}</div>
        </div>
        <div className="p-3">
            <h4 className="font-bold text-white text-sm">{title}</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-medium">{desc}</p>
        </div>
    </div>
  );

  return (
    <div className="pb-24 font-sans animate-in fade-in duration-500">
      <div className="bg-gradient-to-b from-[#1a1c2e] to-[#0a0f1d] pb-6 rounded-b-[2.5rem] shadow-2xl relative">
        <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Crown size={24} className="text-yellow-500 fill-yellow-500" />
                <h1 className="text-2xl font-black italic tracking-tighter text-white gold-text">CLUB 61</h1>
            </div>
            <div className="flex gap-2">
                <button onClick={handleShare} className="bg-yellow-500/10 p-2 rounded-full text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors">
                    <Share2 size={18} />
                </button>
                <div className="bg-slate-800/50 p-2 rounded-full text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors">
                    <Tv size={18} />
                </div>
            </div>
        </div>
        
        <div className="mx-4 mt-2 h-44 bg-gradient-to-br from-[#1e293b] to-[#0a0f1d] rounded-[1.5rem] flex items-center justify-center shadow-xl relative overflow-hidden group border border-yellow-500/20">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center opacity-30 group-hover:scale-105 transition-transform duration-1000"></div>
            <div className="relative z-10 text-center px-4">
                <h2 className="text-4xl font-black text-white drop-shadow-2xl italic tracking-tighter gold-text">ELITE REWARDS</h2>
                <p className="text-xs font-bold text-yellow-100 mt-2 bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full border border-yellow-500/20 uppercase tracking-widest">Join the Club Experience</p>
            </div>
        </div>

        <div className="mx-4 mt-4 bg-[#111827] rounded-full py-2.5 px-5 flex items-center gap-3 overflow-hidden border border-slate-800 shadow-inner h-11">
            <Volume2 size={16} className="text-yellow-500 shrink-0 animate-pulse" />
            <div className="flex-1 h-full relative overflow-hidden">
                 <div className="flex flex-col gap-3 animate-[slideUp_15s_linear_infinite]">
                     {tickerItems.map((item, i) => (
                         <div key={i} className="text-xs text-slate-300 whitespace-nowrap font-bold tracking-tight">
                             {item}
                         </div>
                     ))}
                 </div>
            </div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-3 p-4 no-scrollbar">
        {['Popular', 'Lottery', 'Casino', 'Slots', 'Sports'].map((cat, i) => (
            <button key={cat} className={`flex-shrink-0 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${i === 0 ? 'bg-yellow-600 text-black shadow-lg shadow-yellow-500/20' : 'bg-[#1e293b] text-slate-400 border border-slate-700/50'}`}>
                {cat}
            </button>
        ))}
      </div>

      <div className="px-4 pb-4">
        <h3 className="flex items-center gap-2 text-white font-black text-sm mb-4 uppercase tracking-widest">
            <Flame className="text-orange-500 fill-orange-500" size={18} />
            Hot Recommendations
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
            <GameCard title="Win Go" desc="Elite Prediction" color="red" onClick={() => setView('GAME_WINGO')} icon="🎱" />
            <GameCard title="Aviator" desc="High Stakes Crash" color="blue" onClick={() => setView('GAME_AVIATOR')} icon="✈️" />
            <GameCard title="Mines" desc="Treasure Hunt" color="indigo" onClick={() => setView('GAME_MINES')} icon="💣" />
            <GameCard title="Dog Road" desc="Lane Sprint" color="orange" onClick={() => setView('GAME_DOG')} icon="🐕" />
            <GameCard title="Lucky Wheel" desc="Premium Spin" color="purple" onClick={() => setView('GAME_VORTEX')} icon="🎡" />
        </div>
      </div>
    </div>
  );
};

export default Home;
