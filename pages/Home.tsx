
import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { Flame, Gift, Search, BarChart3, MessageCircle, X, Trophy } from 'lucide-react';
import Logo from '../components/Logo';
import { adminGetSettings } from '../services/supabaseService';

interface HomeProps {
  setView: (view: View) => void;
}

type Category = 'Popular' | 'Lottery' | 'Casino' | 'Originals' | 'Slots';

const GAMES = [
    { id: 'GAME_WINGO', title: "Win Go", desc: "30S DRAW", image: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-red-900/40", category: "Lottery" },
    { id: 'GAME_AVIATOR', title: "Aviator", desc: "CRASH", image: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-red-600/20", category: "Casino" },
    { id: 'GAME_MINES', title: "Mines", desc: "GRID", image: "https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-indigo-600/20", category: "Originals" },
    { id: 'GAME_7UP_DOWN', title: "7 Up Down", desc: "DICE", image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-emerald-600/20", category: "Originals" },
    { id: 'GAME_SPACE_RAID', title: "Space Raid", desc: "BOOST", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-cyan-600/20", category: "Originals" },
    { id: 'GAME_BURST', title: "Cyber Burst", desc: "EXPAND", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-cyan-600/20", category: "Originals" },
    { id: 'GAME_DRAGON_TIGER', title: "Dragon Tiger", desc: "CARDS", image: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-orange-600/20", category: "Casino" },
    { id: 'GAME_ROULETTE', title: "Roulette", desc: "WHEEL", image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-green-600/20", category: "Casino" },
    { id: 'GAME_SICBO', title: "Sic Bo", desc: "DICE", image: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-purple-600/20", category: "Casino" },
    { id: 'GAME_BACCARAT', title: "Baccarat", desc: "ELITE", image: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-emerald-600/20", category: "Casino" },
    { id: 'GAME_VORTEX', title: "Vortex Spin", desc: "ELITE", image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-blue-900/40", category: "Originals" },
    { id: 'GAME_LUCKY_WHEEL', title: "Lucky Wheel", desc: "JACKPOT", image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-purple-600/20", category: "Originals" },
    { id: 'GAME_CRICKET', title: "Cricket Hero", desc: "RUNS", image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-blue-500/20", category: "Originals" },
    { id: 'GAME_TOWER', title: "Tower Climb", desc: "LEVELS", image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-slate-500/20", category: "Originals" },
    { id: 'GAME_SLOT_MACHINE', title: "Royal Slots", desc: "SPIN", image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-yellow-600/20", category: "Slots" },
    { id: 'GAME_ANDAR_BAHAR', title: "Andar Bahar", desc: "DRAW", image: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-red-500/20", category: "Casino" },
    { id: 'GAME_PLINKO', title: "Plinko", desc: "DROPS", image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-pink-600/20", category: "Originals" },
    { id: 'GAME_LIMBO', title: "Limbo", desc: "FLY", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-cyan-600/20", category: "Originals" },
    { id: 'GAME_DRAGON_TOWER', title: "D. Tower", desc: "CLIMB", image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-slate-700/40", category: "Originals" },
    { id: 'GAME_FRUIT_SLOT', title: "Fruit Slot", desc: "SPIN", image: "https://images.unsplash.com/photo-1519098901909-b1553a1190af?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-rose-500/20", category: "Slots" },
    { id: 'GAME_EGYPT_SLOT', title: "Egypt Slot", desc: "GOLD", image: "https://images.unsplash.com/photo-1503174971373-b1f69850bded?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-yellow-900/40", category: "Slots" },
    { id: 'GAME_VAULT', title: "Vault Breaker", desc: "CRACK", image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-blue-900/40", category: "Originals" },
    { id: 'GAME_HEAD_TAILS', title: "Head & Tails", desc: "FLIP", image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-yellow-600/20", category: "Originals" },
    { id: 'GAME_KENO', title: "Keno Elite", desc: "LOTTO", image: "https://images.unsplash.com/photo-1518623489648-a173ef7824f3?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-emerald-600/20", category: "Lottery" },
    { id: 'GAME_DICE', title: "Dice Duel", desc: "ROLL", image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-purple-600/20", category: "Originals" },
    { id: 'GAME_HILO', title: "Hi-Lo Elite", desc: "CARDS", image: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-indigo-600/20", category: "Originals" },
];

const Home: React.FC<HomeProps> = ({ setView }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('Popular');
  const [searchQuery, setSearchQuery] = useState('');

  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const unsub = adminGetSettings(setSettings);
    return unsub;
  }, []);

  const filteredGames = GAMES.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Popular' || game.category === activeCategory;
    const isNotDisabled = !settings?.disabledGames?.[game.id];
    return matchesSearch && matchesCategory && isNotDisabled;
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
                <button onClick={() => setView('GIFT_CODE')} className="bg-yellow-500/10 p-2 rounded-full text-yellow-500 border border-yellow-500/20 shadow-lg active:scale-90"><Gift size={18} /></button>
                <button onClick={() => setView('CHAT')} className="bg-blue-500/10 p-2 rounded-full text-blue-400 border border-blue-500/20 shadow-lg active:scale-90"><MessageCircle size={18} /></button>
                <button onClick={() => setView('LEADERBOARD')} className="bg-purple-500/10 p-2 rounded-full text-purple-400 border border-purple-500/20 shadow-lg active:scale-90"><BarChart3 size={18} /></button>
                <button onClick={() => setView('REWARDS_HUB')} className="bg-emerald-500/10 p-2 rounded-full text-emerald-400 border border-emerald-500/20 shadow-lg active:scale-90"><Gift size={18} /></button>
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
        
        <div className="grid grid-cols-2 gap-4">
            {filteredGames.map((game) => (
                <div 
                    key={game.id} 
                    onClick={() => setView(game.id as View)} 
                    className="relative h-44 rounded-[2rem] overflow-hidden cursor-pointer group transition-all border border-white/5 shadow-2xl active:scale-95"
                >
                    <img src={game.image} alt={game.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                    
                    <div className="absolute inset-0 p-4 flex flex-col justify-end items-start">
                        <div className="bg-yellow-500/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-yellow-500/30 mb-1.5">
                            <span className="text-[7px] font-black text-yellow-500 uppercase tracking-widest">{game.desc}</span>
                        </div>
                        <h4 className="font-black text-white text-lg uppercase tracking-tighter italic leading-tight group-hover:text-yellow-400 transition-colors">{game.title}</h4>
                        <div className="flex items-center gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[7px] font-bold text-white uppercase tracking-widest">Live</span>
                        </div>
                    </div>
                    
                    <div className="absolute top-3 right-3 w-8 h-8 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                        <Flame size={16} className="text-yellow-500" />
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
