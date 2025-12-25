
import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { Flame, Tv, Volume2, Share2, ShieldAlert, Gift, ChevronRight, X, Sparkles, Trophy, Search } from 'lucide-react';
// FIX: Removed unused 'transactions' import which was causing a build error
import { subscribeToBalance } from '../services/mockFirebase';

interface HomeProps {
  setView: (view: View) => void;
}

type Category = 'Popular' | 'Lottery' | 'Casino' | 'Slots' | 'Originals';

const GAMES = [
    { id: 'GAME_WINGO', title: "Win Go", desc: "30S DRAW", icon: "🎱", color: "bg-red-900/40", category: "Lottery" },
    { id: 'GAME_AVIATOR', title: "Aviator", desc: "CRASH", icon: "✈️", color: "bg-red-600/20", category: "Casino" },
    { id: 'GAME_MINES', title: "Mines", desc: "GRID", icon: "💣", color: "bg-blue-600/20", category: "Originals" },
    { id: 'GAME_DRAGON_TIGER', title: "Dragon Tiger", desc: "CARDS", icon: "🐉", color: "bg-orange-600/20", category: "Casino" },
    { id: 'GAME_ROULETTE', title: "Roulette", desc: "WHEEL", icon: "🎡", color: "bg-green-600/20", category: "Casino" },
    { id: 'GAME_SICBO', title: "Sic Bo", desc: "DICE", icon: "🎲", color: "bg-purple-600/20", category: "Casino" },
    { id: 'GAME_BACCARAT', title: "Baccarat", desc: "ELITE", icon: "🃏", color: "bg-emerald-600/20", category: "Casino" },
    { id: 'GAME_STREET_RACE', title: "Street Race", desc: "MOTORS", icon: "🏍️", color: "bg-rose-600/20", category: "Originals" },
    { id: 'GAME_VAULT', title: "Vault", desc: "BREAK", icon: "🔒", color: "bg-indigo-600/20", category: "Originals" },
    { id: 'GAME_SLOTS', title: "Slots", desc: "ROYAL", icon: "🎰", color: "bg-yellow-600/20", category: "Slots" },
    { id: 'GAME_DOG', title: "Dog Road", desc: "SPRINT", icon: "🐕", color: "bg-amber-600/20", category: "Originals" },
    { id: 'GAME_HEAD_TAILS', title: "Head Tails", desc: "COIN", icon: "🪙", color: "bg-blue-900/40", category: "Originals" },
    { id: 'GAME_LIMBO', title: "Limbo", desc: "FLY", icon: "🚀", color: "bg-cyan-600/20", category: "Originals" },
    { id: 'GAME_PLINKO', title: "Plinko", desc: "DROPS", icon: "🟣", color: "bg-pink-600/20", category: "Originals" },
    { id: 'GAME_HILO', title: "Hi-Lo", desc: "GUESS", icon: "🎴", color: "bg-teal-600/20", category: "Originals" },
    { id: 'GAME_DRAGON_TOWER', title: "Tower", desc: "CLIMB", icon: "🏰", color: "bg-slate-700/40", category: "Originals" },
    { id: 'GAME_KENO', title: "Keno", desc: "LOTTO", icon: "🔢", color: "bg-emerald-900/40", category: "Lottery" },
    { id: 'GAME_ANDAR_BAHAR', title: "Andar Bahar", desc: "CARDS", icon: "♠️", color: "bg-red-800/40", category: "Casino" },
    { id: 'GAME_DICE', title: "Dice Duel", desc: "ROLL", icon: "🎲", color: "bg-blue-500/20", category: "Originals" },
    { id: 'GAME_FRUIT_SLOT', title: "Fruit", desc: "SPIN", icon: "🍎", color: "bg-rose-500/20", category: "Slots" },
    { id: 'GAME_EGYPT_SLOT', title: "Egypt", desc: "GOLD", icon: "🏺", color: "bg-yellow-900/40", category: "Slots" },
    { id: 'GAME_MOTO_RACING', title: "Moto GP", desc: "RACE", icon: "🏍️", color: "bg-blue-600/20", category: "Originals" },
];

const Home: React.FC<HomeProps> = ({ setView }) => {
  const [tickerItems, setTickerItems] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('Popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('welcome_popup_seen');
    if (!hasSeen) setTimeout(() => setShowWelcomePopup(true), 1000);
  }, []);

  const closePopup = () => { setShowWelcomePopup(false); sessionStorage.setItem('welcome_popup_seen', 'true'); };

  useEffect(() => {
      const generateFakeWinner = () => {
          const id = Math.floor(10000 + Math.random() * 90000);
          const amount = (Math.random() * 5000 + 100).toFixed(2);
          const games = ['WinGo', 'Aviator', 'Mines', 'Baccarat'];
          const game = games[Math.floor(Math.random() * games.length)];
          return `ID: ${id}*** Won ₹${amount} in ${game}!`;
      };
      setTickerItems(Array(5).fill(null).map(generateFakeWinner));
      const tickerInterval = setInterval(() => { setTickerItems(prev => [generateFakeWinner(), ...prev].slice(0, 20)); }, 3000);
      return () => clearInterval(tickerInterval);
  }, []);

  const filteredGames = GAMES.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Popular' || game.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pb-28 font-sans animate-in fade-in duration-500 bg-[#0a0f1d] min-h-screen">
      {showWelcomePopup && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-lg p-6">
              <div className="w-full max-w-sm bg-[#1e293b] rounded-[3rem] p-10 shadow-2xl relative border border-white/10 animate-in zoom-in duration-500 text-center">
                   <button onClick={closePopup} className="absolute top-6 right-6 p-2 bg-black/40 rounded-full text-white/50 hover:text-white transition-all"><X size={20}/></button>
                   <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white/10">
                            <Gift size={40} className="text-slate-900" />
                        </div>
                   </div>
                   <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-2 gold-text">MAFIA GIFT</h2>
                   <p className="text-slate-400 text-sm mb-8">First deposit reward: 25% Instant Bonus Asset. Min 500 INR.</p>
                   <button onClick={() => { closePopup(); setView('DEPOSIT'); }} className="w-full py-5 bg-yellow-500 text-slate-950 font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all">DEPOSIT NOW</button>
              </div>
          </div>
      )}

      <div className="bg-gradient-to-b from-[#1a1c2e] to-[#0a0f1d] pb-6 rounded-b-[3rem] shadow-2xl relative">
        <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <ShieldAlert size={20} className="text-yellow-500" />
                <h1 className="text-2xl font-black italic tracking-tighter text-white gold-text uppercase">MAFIA CLUB</h1>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setView('REWARDS_HUB')} className="bg-blue-600 p-2 rounded-full text-white shadow-lg"><Gift size={18} /></button>
                <button className="bg-white/5 p-2 rounded-full text-slate-400 border border-white/5"><Share2 size={18} /></button>
            </div>
        </div>
        
        <div className="mx-4 mb-4 bg-zinc-900/50 rounded-2xl p-3 flex items-center gap-3 border border-white/10 focus-within:border-blue-500/50 transition-all">
            <Search size={18} className="text-slate-500" />
            <input 
              type="text" 
              placeholder="Search Elite Games..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent flex-1 text-sm outline-none text-white font-medium"
            />
            {searchQuery && <X size={16} onClick={() => setSearchQuery('')} className="text-slate-500 cursor-pointer" />}
        </div>

        <div className="mx-4 h-40 bg-indigo-900 rounded-[2rem] flex items-center justify-center shadow-2xl relative overflow-hidden group border border-white/5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-80"></div>
            <div className="relative z-10 text-center px-6">
                <div className="bg-yellow-500/20 px-3 py-1 rounded-full inline-flex items-center gap-2 mb-2 border border-yellow-500/30">
                    <Trophy size={12} className="text-yellow-500" />
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">JACKPOT ACTIVE</span>
                </div>
                <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase drop-shadow-lg">STAKE ELITE</h2>
                <p className="text-[9px] font-black text-blue-100 mt-1 uppercase tracking-widest">JOIN THE UNDERWORLD OF GAMING</p>
            </div>
        </div>

        <div className="mx-4 mt-4 bg-zinc-950/60 rounded-full py-2 px-4 flex items-center gap-3 overflow-hidden border border-white/5 h-10 backdrop-blur-xl">
            <Volume2 size={14} className="text-yellow-500 shrink-0" />
            <div className="flex-1 h-full relative overflow-hidden">
                 <div className="flex flex-col gap-3 animate-[slideUp_15s_linear_infinite]">
                     {tickerItems.map((item, i) => (
                         <div key={i} className="text-[11px] text-slate-400 font-bold italic truncate">{item}</div>
                     ))}
                 </div>
            </div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-3 p-4 no-scrollbar relative z-20">
        {(['Popular', 'Lottery', 'Casino', 'Slots', 'Originals'] as Category[]).map((cat) => (
            <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${activeCategory === cat ? 'bg-yellow-600 text-slate-950 border-white shadow-lg scale-105' : 'bg-[#1e293b] text-slate-500 border-white/5'}`}
            >
                {cat}
            </button>
        ))}
      </div>

      <div className="px-4 pb-10">
        <div className="flex items-center gap-2 mb-6">
            <h3 className="text-white font-black text-xs uppercase tracking-widest">
                {activeCategory} ARENA
            </h3>
            <div className="h-[1px] flex-1 bg-white/5"></div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
            {filteredGames.length > 0 ? filteredGames.map((game) => (
                <div key={game.id} onClick={() => setView(game.id as View)} className="bg-[#1e293b] rounded-2xl overflow-hidden cursor-pointer group transition-all border border-white/5 shadow-xl active:scale-95">
                    <div className={`h-24 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-300 ${game.color}`}>
                       {game.icon}
                    </div>
                    <div className="p-2 text-center">
                        <h4 className="font-black text-white text-[10px] uppercase tracking-tighter">{game.title}</h4>
                        <p className="text-[7px] text-slate-500 uppercase font-bold">{game.desc}</p>
                    </div>
                </div>
            )) : (
                <div className="col-span-3 text-center py-20 text-slate-500 font-black uppercase tracking-widest text-xs opacity-50 italic">No matches found</div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Home;
