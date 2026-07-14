
import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { Flame, Gift, Search, BarChart3, MessageCircle, X, Trophy, Dice5 } from 'lucide-react';
import Logo from '../components/Logo';
import { adminGetSettings } from '../services/supabaseService';

interface HomeProps {
  setView: (view: View) => void;
}

type Category = 'Popular' | 'Lottery' | 'Casino' | 'Originals' | 'Slots';

const GAMES = [
    { id: 'GAME_VORTEX', title: "VORTEX", desc: "", image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-blue-900/40", category: "Originals" },
    { id: 'GAME_MINES', title: "Mines", desc: "", image: "https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-indigo-600/20", category: "Originals" },
    { id: 'GAME_CHICKEN_ROAD', title: "Dog Road", desc: "", image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-yellow-600/20", category: "Originals" },
    { id: 'GAME_7UP_DOWN', title: "7 Up Down", desc: "", image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-emerald-600/20", category: "Originals" },
    { id: 'GAME_DRAGON_TIGER', title: "Dragon Tiger", desc: "", image: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-orange-600/20", category: "Casino" },
    { id: 'GAME_ROULETTE', title: "Roulette", desc: "", image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-green-600/20", category: "Casino" },
    { id: 'GAME_LUCKY_WHEEL', title: "Lucky Wheel", desc: "", image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-purple-600/20", category: "Originals" },
    { id: 'GAME_ANDAR_BAHAR', title: "Andar Bahar", desc: "", image: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-red-500/20", category: "Casino" },
    { id: 'GAME_AVIATOR', title: "Aviator", desc: "", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-red-600/20", category: "Originals" },
    { id: 'GAME_WINGO', title: "WinGo", desc: "", image: "https://images.unsplash.com/photo-1518623489648-a173ef7824f3?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-emerald-600/20", category: "Lottery" },
    { id: 'GAME_PLINKO', title: "Plinko", desc: "", image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-pink-600/20", category: "Originals" },
    { id: 'GAME_LIMBO', title: "Limbo", desc: "", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-cyan-600/20", category: "Originals" },
    { id: 'GAME_FRUIT_SLOT', title: "Fruit Slot", desc: "", image: "https://images.unsplash.com/photo-1519098901909-b1553a1190af?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-rose-500/20", category: "Slots" },
    { id: 'GAME_EGYPT_SLOT', title: "Egypt Slot", desc: "", image: "https://images.unsplash.com/photo-1503174971373-b1f69850bded?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-yellow-900/40", category: "Slots" },
    { id: 'GAME_HEAD_TAILS', title: "Head & Tails", desc: "", image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-yellow-600/20", category: "Originals" },
    { id: 'GAME_SUPER_SIC_BO', title: "Super Sic Bo", desc: "Live Casino Dice", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-amber-600/20", category: "Casino" },
    { id: 'GAME_KENO', title: "Keno Elite", desc: "", image: "https://images.unsplash.com/photo-1518623489648-a173ef7824f3?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-emerald-600/20", category: "Lottery" },
    { id: 'GAME_DICE', title: "Dice Duel", desc: "", image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-purple-600/20", category: "Originals" },
    { id: 'GAME_HILO', title: "Hi-Lo Elite", desc: "", image: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-indigo-600/20", category: "Originals" },
    { id: 'GAME_PUMP', title: "Pump Up", desc: "", image: "https://images.unsplash.com/photo-1533230393619-3f8e58383e5f?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-red-600/20", category: "Originals" },
    { id: 'GAME_MOLES', title: "Rat Hunter", desc: "", image: "https://images.unsplash.com/photo-1563968743333-24a18274720e?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-yellow-600/20", category: "Originals" },
    { id: 'GAME_SCRATCH_CARD', title: "Scratch card", desc: "", image: "https://images.unsplash.com/photo-1518623489648-a173ef7824f3?q=80&w=400&h=400&auto=format&fit=crop", color: "bg-emerald-600/20", category: "Lottery" },
];

const Home: React.FC<HomeProps> = ({ setView }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('Popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);

  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const unsub = adminGetSettings(setSettings);
    return unsub;
  }, []);

  const bannerImages = (settings?.bannerImages && settings.bannerImages.length > 0)
    ? settings.bannerImages
    : [settings?.bannerImage || 'https://images.unsplash.com/photo-1611195974226-a679be9dd763?q=80&w=800&auto=format&fit=crop'];

  const bannerLinks = (settings?.bannerLinks && settings.bannerLinks.length > 0)
    ? settings.bannerLinks
    : [settings?.bannerLink || ''];

  useEffect(() => {
    if (bannerImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIdx((prev) => (prev + 1) % bannerImages.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [bannerImages]);

  useEffect(() => {
    if (currentBannerIdx >= bannerImages.length) {
      setCurrentBannerIdx(0);
    }
  }, [bannerImages.length]);

  const allGames = [
    ...GAMES,
    ...(settings?.customGames || []).map((cg: any) => ({
      id: `CUSTOM_GAME_${cg.id}`,
      title: cg.name,
      desc: "Custom Web Game",
      image: cg.banner || "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&h=400&auto=format&fit=crop",
      color: "bg-amber-600/20",
      category: "Slots" // Dynamically put it in Slots & Popular
    }))
  ];

  const filteredGames = allGames.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Popular' || game.category === activeCategory || game.id.startsWith('CUSTOM_GAME_');
    const isAlwaysVisible = ['GAME_VORTEX', 'GAME_7UP_DOWN', 'GAME_DRAGON_TIGER'].includes(game.id);
    const isNotDisabled = isAlwaysVisible || !settings?.disabledGames?.[game.id];
    return matchesSearch && matchesCategory && isNotDisabled;
  });

  return (
    <div className="pb-28 font-sans animate-in fade-in duration-500 bg-[#0a0f1d] min-h-screen">
      <div className="bg-gradient-to-b from-[#1a1c2e] to-[#0a0f1d] pb-6 rounded-b-[3rem] shadow-2xl relative">
        <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Logo size={48} />
                <h1 className="text-2xl font-black italic tracking-tighter text-white gold-text uppercase">CLUB 99</h1>
            </div>
            <div className="flex gap-2">
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

        <div 
            onClick={() => {
              const activeLink = bannerLinks[currentBannerIdx] || settings?.bannerLink || '';
              if (activeLink) {
                window.open(activeLink, '_blank');
              }
            }}
            className={`mx-4 min-h-[11rem] bg-indigo-950 rounded-[2rem] flex flex-col justify-between p-6 shadow-2xl relative overflow-hidden group border border-yellow-500/20 ${bannerLinks[currentBannerIdx] || settings?.bannerLink ? 'cursor-pointer hover:border-yellow-400' : ''}`}
        >
            <div className="absolute inset-0 bg-cover bg-center opacity-35 group-hover:scale-105 transition-all duration-1000" style={{ backgroundImage: `url('${bannerImages[currentBannerIdx]}')` }}></div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent"></div>
            
            {/* Carousel indicator dots */}
            {bannerImages.length > 1 && (
              <div className="absolute bottom-4 right-6 flex gap-1.5 z-20">
                {bannerImages.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentBannerIdx(idx);
                    }}
                    className={`w-2.5 h-1 rounded-full transition-all duration-300 ${currentBannerIdx === idx ? 'bg-yellow-500 w-4 shadow-[0_0_8px_rgba(234,179,8,0.8)]' : 'bg-white/20'}`}
                  />
                ))}
              </div>
            )}

            <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                <div>
                    <div className="bg-yellow-500/20 px-3 py-0.5 rounded-full inline-flex items-center gap-1.5 border border-yellow-500/30 mb-2">
                        <Trophy size={11} className="text-yellow-500" />
                        <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Live Arena Active • {currentBannerIdx + 1}/{bannerImages.length}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter uppercase drop-shadow-lg gold-text">CLUB 99 ROYALE</h2>
                    <p className="text-[8px] font-black text-blue-200 uppercase tracking-widest max-w-xs leading-relaxed">EXPERIENCE BHAGIRATH ELITE MULTIPLAYER VIBE AT YOUR OWN PACE</p>
                </div>
                
                <button 
                  onClick={(e) => {
                    const activeLink = bannerLinks[currentBannerIdx] || settings?.bannerLink || '';
                    if (activeLink) {
                      e.stopPropagation();
                      window.open(activeLink, '_blank');
                    } else {
                      setView('GAME_MINES');
                    }
                  }}
                  className="self-start bg-gradient-to-r from-red-600 to-amber-500 text-white font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-2 shadow-[0_4px_20px_rgba(220,38,38,0.4)] active:scale-95 transition-all hover:brightness-110 border-b-2 border-red-800"
                >
                    <Flame size={14} className="animate-bounce" /> Play Mines Arena
                </button>
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
                    className="relative aspect-[3/4] rounded-[2rem] overflow-hidden cursor-pointer group transition-all border border-white/5 shadow-2xl active:scale-95"
                >
                    <img src={settings?.gameBanners?.[game.id] || game.image} alt={game.title} className="absolute inset-0 w-full h-full object-contain bg-[#111827] group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                    
                    <div className="absolute inset-0 p-4 flex flex-col justify-end items-start">
                        <h4 className="font-black text-white text-lg uppercase tracking-tighter italic leading-tight group-hover:text-yellow-400 transition-colors">{game.title}</h4>
                        <div className="flex items-center gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <span className="text-[7px] font-bold text-white uppercase tracking-widest opacity-40">Elite</span>
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
