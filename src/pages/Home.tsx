
import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { Flame, Tv, Volume2, Share2 } from 'lucide-react';
import { transactions, subscribeToBalance } from '../services/mockFirebase';

interface HomeProps {
  setView: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ setView }) => {
  const [tickerItems, setTickerItems] = useState<string[]>([]);

  // Generate Fake Data
  const generateFakeWinner = () => {
      const id = Math.floor(10000 + Math.random() * 90000);
      const suffix = Math.floor(10 + Math.random() * 90);
      const amount = (Math.random() * 5000 + 100).toFixed(2);
      const games = ['WinGo', 'Aviator', 'Mines', 'Lucky Wheel', 'Dog Road'];
      const game = games[Math.floor(Math.random() * games.length)];
      return `Member ID: ${id}***${suffix} Won ₹${amount} in ${game}!`;
  };

  useEffect(() => {
      // Initial Population
      const initialItems = Array(5).fill(null).map(generateFakeWinner);
      setTickerItems(initialItems);

      // Subscribe to real transactions to inject them
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
          title: 'Tiranga Games',
          text: 'Join me on Tiranga Games and win big! Play WinGo, Aviator and more.',
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
          alert('App Link copied to clipboard!');
      }
  };

  const GameCard = ({ title, desc, color, onClick, icon }: any) => (
    <div onClick={onClick} className={`bg-[#1e293b] rounded-xl overflow-hidden cursor-pointer group hover:ring-2 hover:ring-${color}-500 transition-all`}>
        <div className={`h-28 bg-${color}-900/50 relative flex items-center justify-center overflow-hidden`}>
           <div className="text-4xl transform group-hover:scale-110 transition-transform duration-300">{icon}</div>
        </div>
        <div className="p-3">
            <h4 className="font-bold text-white">{title}</h4>
            <p className="text-xs text-slate-400">{desc}</p>
        </div>
    </div>
  );

  return (
    <div className="pb-20 font-sans">
      <div className="bg-gradient-to-b from-blue-900 to-[#0f172a] pb-6 rounded-b-[2rem] shadow-2xl relative">
        <div className="p-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold italic tracking-tighter text-white">Tiranga</h1>
            <div className="flex gap-3">
                <div onClick={handleShare} className="bg-blue-800/50 p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                    <Share2 size={20} className="text-blue-200" />
                </div>
                <div className="bg-blue-800/50 p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                    <Tv size={20} className="text-blue-200" />
                </div>
            </div>
        </div>
        
        <div className="mx-4 mt-2 h-40 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/800/400')] bg-cover bg-center opacity-50 group-hover:scale-105 transition-transform duration-700"></div>
            <div className="relative z-10 text-center">
                <h2 className="text-3xl font-black text-white drop-shadow-md">MISSION BONUS</h2>
                <p className="text-sm font-medium text-blue-100 mt-1">Complete Tasks & Win</p>
            </div>
        </div>

        <div className="mx-4 mt-4 bg-[#1e293b] rounded-full py-2 px-4 flex items-center gap-3 overflow-hidden border border-slate-700 shadow-inner h-10">
            <Volume2 size={16} className="text-blue-400 shrink-0 animate-pulse" />
            <div className="flex-1 h-full relative overflow-hidden">
                 <div className="flex flex-col gap-2 animate-[slideUp_10s_linear_infinite]">
                     {tickerItems.slice(0, 3).map((item, i) => (
                         <div key={i} className="text-xs text-slate-300 whitespace-nowrap font-medium">
                             {item}
                         </div>
                     ))}
                 </div>
            </div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-4 p-4 no-scrollbar">
        {['Popular', 'Lottery', 'Casino', 'Slots', 'Sports'].map((cat, i) => (
            <button key={cat} className={`flex-shrink-0 px-6 py-2 rounded-xl text-sm font-bold transition-all ${i === 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-[#1e293b] text-slate-400 hover:text-white'}`}>
                {cat}
            </button>
        ))}
      </div>

      <div className="px-4 pb-4">
        <h3 className="flex items-center gap-2 text-white font-bold mb-4">
            <Flame className="text-orange-500 fill-current" size={20} />
            Platform Recommendation
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
            <GameCard title="Win Go" desc="Color Prediction" color="red" onClick={() => setView('GAME_WINGO')} icon="🎱" />
            <GameCard title="Aviator" desc="Crash Game" color="red" onClick={() => setView('GAME_AVIATOR')} icon="✈️" />
            <GameCard title="Mines" desc="Find Gems" color="blue" onClick={() => setView('GAME_MINES')} icon="💣" />
            <GameCard title="Dog Road" desc="Lane Game" color="orange" onClick={() => setView('GAME_DOG')} icon="🐕" />
            <GameCard title="Lucky Wheel" desc="Spin & Win" color="purple" onClick={() => setView('GAME_VORTEX')} icon="🎡" />
        </div>
      </div>
      
      <style>{`
        @keyframes slideUp {
            0% { transform: translateY(0); }
            100% { transform: translateY(-100%); }
        }
      `}</style>
    </div>
  );
};

export default Home;
