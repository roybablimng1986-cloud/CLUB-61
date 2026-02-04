
import React, { useState } from 'react';
import { View } from '../types';
import { Flame, Gift, Search, BarChart3, MessageCircle, X, Trophy } from 'lucide-react';
import Logo from '../components/Logo';

interface HomeProps {
  setView: (view: View) => void;
}

type Category = 'Popular' | 'Lottery' | 'Casino' | 'Originals' | 'Slots';

const GAMES = [
    { id: 'GAME_WINGO', title: "Win Go", desc: "30S DRAW", icon: "🎱", color: "bg-red-900/40", category: "Lottery" },
    { id: 'GAME_AVIATOR', title: "Aviator", desc: "CRASH", icon: "✈️", color: "bg-blue-600/20", category: "Casino" },
    { id: 'GAME_MINES', title: "Mines", desc: "GRID", icon: "💣", color: "bg-indigo-600/20", category: "Originals" },
    { id: 'GAME_7UP_DOWN', title: "7 Up Down", desc: "DICE", icon: "🎲", color: "bg-emerald-600/20", category: "Originals" },
    { id: 'GAME_CAR_ROULETTE', title: "Car Roulette", desc: "LUXURY", icon: "🏎️", color: "bg-zinc-600/20", category: "Casino" },
    { id: 'GAME_JHANDI_MUNDA', title: "Jhandi Munda", desc: "TRADITION", icon: "🔱", color: "bg-amber-600/20", category: "Originals" },
    { id: 'GAME_HORSE_RACING', title: "Horse Racing", desc: "DERBY", icon: "🐎", color: "bg-green-600/20", category: "Originals" },
    { id: 'GAME_SPACE_RAID', title: "Space Raid", desc: "BOOST", icon: "🚀", color: "bg-cyan-600/20", category: "Originals" },
    { id: 'GAME_COLOR_GRID', title: "Color Grid", desc: "PUZZLE", icon: "🌈", color: "bg-pink-600/20", category: "Originals" },
    { id: 'GAME_DOG', title: "Dog Road", desc: "SPRINT", icon: "🐕", color: "bg-amber-600/20", category: "Originals" },
    { id: 'GAME_BURST', title: "Cyber Burst", desc: "EXPAND", icon: "💥", color: "bg-cyan-600/20", category: "Originals" },
    { id: 'GAME_DRAGON_TIGER', title: "Dragon Tiger", desc: "CARDS", icon: "🐉", color: "bg-orange-600/20", category: "Casino" },
    { id: 'GAME_ROULETTE', title: "Roulette", desc: "WHEEL", icon: "🎡", color: "bg-green-600/20", category: "Casino" },
    { id: 'GAME_SICBO', title: "Sic Bo", desc: "DICE", icon: "🎲", color: "bg-purple-600/20", category: "Casino" },
    { id: 'GAME_BACCARAT', title: "Baccarat", desc: "ELITE", icon: "🃏", color: "bg-emerald-600/20", category: "Casino" },
    { id: 'GAME_STREET_RACE', title: "Street Race", desc: "MOTORS", icon: "🏍️", color: "bg-rose-600/20", category: "Originals" },
    { id: 'GAME_VORTEX', title: "Circle Spin", desc: "SPIN", icon: "🌀", color: "bg-blue-900/30", category: "Originals" },
    { id: 'GAME_PENALTY', title: "Penalty King", desc: "GOAL", icon: "⚽", color: "bg-green-700/20", category: "Originals" },
    { id: 'GAME_CRICKET', title: "Cricket Hero", desc: "RUNS", icon: "🏏", color: "bg-blue-500/20", category: "Originals" },
    { id: 'GAME_TOWER', title: "Tower Climb", desc: "LEVELS", icon: "🏗️", color: "bg-slate-500/20", category: "Originals" },
    { id: 'GAME_SLOT_MACHINE', title: "Royal Slots", desc: "SPIN", icon: "🎰", color: "bg-yellow-600/20", category: "Slots" },
    { id: 'GAME_ANDAR_BAHAR', title: "Andar Bahar", desc: "DRAW", icon: "🃏", color: "bg-red-500/20", category: "Casino" },
    { id: 'GAME_PLINKO', title: "Plinko", desc: "DROPS", icon: "🟣", color: "bg-pink-600/20", category: "Originals" },
    { id: 'GAME_LIMBO', title: "Limbo", desc: "FLY", icon: "🚀", color: "bg-cyan-600/20", category: "Originals" },
    { id: 'GAME_DRAGON_TOWER', title: "D. Tower", desc: "CLIMB", icon: "🏰", color: "bg-slate-700/40", category: "Originals" },
    { id: 'GAME_FRUIT_SLOT', title: "Fruit Slot", desc: "SPIN", icon: "🍎", color: "bg-rose-500/20", category: "Slots" },
    { id: 'GAME_EGYPT_SLOT', title: "Egypt Slot", desc: "GOLD", icon: "🏺", color: "bg-yellow-900/40", category: "Slots" },
    { id: 'GAME_VAULT', title: "Vault Breaker", desc: "CRACK", icon: "🔐", color: "bg-blue-900/40", category: "Originals" },
    { id: 'GAME_HEAD_TAILS', title: "Head & Tails", desc: "FLIP", icon: "🪙", color: "bg-yellow-600/20", category: "Originals" },
    { id: 'GAME_KENO', title: "Keno Elite", desc: "LOTTO", icon: "🎱", color: "bg-emerald-600/20", category: "Lottery" },
    { id: 'GAME_DICE', title: "Dice Duel", desc: "ROLL", icon: "🎲", color: "bg-purple-600/20", category: "Originals" },
];

const Home: React.FC<HomeProps> = ({ setView }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('Popular');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = GAMES.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Popular' || game.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pb-28 font-sans animate-in fade-in duration-500 bg-[#0a0f1d] min-h-screen">
      <div className="bg-gradient-to-b from-[#1a1c2e] to-[#0a0f1d] pb-6 rounded-b-[3rem] shadow-2xl relative">
        <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Logo size={48} />
                <h1 className="text-2xl font-black italic tracking-tighter text-white gold-text uppercase">MAFIA CLUB</h1>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setView('CHAT')} className="bg-blue-500/10 p-2 rounded-full text-blue-400 border border-blue-500/20 shadow-lg active:scale-90"><MessageCircle size={18} /></button>
                <button onClick={() => setView('LEADERBOARD')} className="bg-purple-500/10 p-2 rounded-full text-purple-400 border border-purple-500/20 shadow-lg active:scale-90"><BarChart3 size={18} /></button>
                <button onClick={() => setView('REWARDS_HUB')} className="bg-yellow-500/10 p-2 rounded-full text-yellow-500 border border-yellow-500/20 shadow-lg active:scale-90"><Gift size={18} /></button>
            </div>
        </div>
        
        <div className="mx-4 mb-4 bg-zinc-900/50 rounded-2xl p-3 flex items-center gap-3 border border-white/10">
            <Search size={18} className="text-slate-500" />
            <input 
              type="text" 
              placeholder="Search Elite Arena..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent flex-1 text-sm outline-none text-white font-medium"
            />
            {searchQuery && <X size={16} onClick={() => setSearchQuery('')} className="text-slate-500 cursor-pointer" />}
        </div>

        <div className="mx-4 h-44 bg-indigo-900 rounded-[2rem] flex items-center justify-center shadow-2xl relative overflow-hidden group border border-yellow-500/20">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/800/400?blur=2')] bg-cover opacity-40"></div>
            <div className="relative z-10 text-center px-6">
                <div className="bg-yellow-500/20 px-4 py-1 rounded-full inline-flex items-center gap-2 mb-2 border border-yellow-500/30">
                    <Trophy size={14} className="text-yellow-500" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Leaderboard Active</span>
                </div>
                <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase drop-shadow-lg gold-text">MAFIA ROYALE</h2>
                <p className="text-[9px] font-black text-blue-100 mt-1 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full">EVERY SINGLE ELITE GAME IS NOW LIVE</p>
            </div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-3 p-4 no-scrollbar">
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
            <Flame className="text-orange-500 fill-orange-500" size={18} />
            <h3 className="text-white font-black text-xs uppercase tracking-widest">{activeCategory} Arena</h3>
            <div className="h-[1px] flex-1 bg-white/5"></div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
            {filteredGames.map((game) => (
                <div key={game.id} onClick={() => setView(game.id as View)} className="bg-[#1e293b] rounded-2xl overflow-hidden cursor-pointer group transition-all border border-white/5 shadow-xl active:scale-95 hover:border-yellow-500/50">
                    <div className={`h-24 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-300 ${game.color}`}>
                       {game.icon}
                    </div>
                    <div className="p-2 text-center bg-black/20">
                        <h4 className="font-black text-white text-[10px] uppercase tracking-tighter truncate">{game.title}</h4>
                        <p className="text-[7px] text-slate-500 uppercase font-bold tracking-tighter">{game.desc}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
