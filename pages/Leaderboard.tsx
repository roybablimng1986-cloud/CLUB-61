
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Crown, Medal, TrendingUp, Sparkles, User, ShieldCheck } from 'lucide-react';
import { getLeaderboard } from '../services/mockFirebase';
import { UserProfile } from '../types';

const Leaderboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [players, setPlayers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsub = getLeaderboard((data) => {
            setPlayers(data);
            setIsLoading(false);
        });
        return unsub;
    }, []);

    if (isLoading) return (
        <div className="bg-[#0a0f1d] min-h-screen flex items-center justify-center">
            <Sparkles className="animate-spin text-yellow-500" size={40} />
        </div>
    );

    const topThree = players.slice(0, 3);
    const rest = players.slice(3);

    return (
        <div className="bg-[#0a0f1d] min-h-screen text-white font-sans flex flex-col pb-20">
            <div className="p-4 bg-[#111827]/80 backdrop-blur-md flex items-center gap-4 border-b border-white/5 sticky top-0 z-50">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
                <h1 className="font-black text-sm uppercase tracking-widest gold-text italic">Hall of Fame</h1>
            </div>

            <div className="p-6 bg-gradient-to-b from-blue-900/20 to-transparent">
                {/* Podium */}
                {topThree.length >= 3 && (
                    <div className="flex items-end justify-center gap-2 mb-12 h-64 mt-10">
                        {/* 2nd Place */}
                        <div className="flex flex-col items-center flex-1">
                            <div className="relative mb-3">
                                <img src={topThree[1].avatar} className="w-14 h-14 rounded-full border-4 border-slate-400 shadow-xl" />
                                <div className="absolute -top-3 -right-2 bg-slate-400 p-1.5 rounded-full"><Medal size={14} className="text-slate-900" /></div>
                            </div>
                            <div className="bg-slate-400/10 w-full h-24 rounded-t-2xl flex flex-col items-center pt-3 border-x border-t border-slate-400/20">
                                <span className="text-[10px] font-black text-slate-300 truncate w-20 text-center">@{topThree[1].username}</span>
                                <span className="text-sm font-black text-white italic">₹{(topThree[1].balance + topThree[1].totalDeposit).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* 1st Place */}
                        <div className="flex flex-col items-center flex-1 z-10 scale-110">
                            <div className="relative mb-4">
                                <img src={topThree[0].avatar} className="w-18 h-18 rounded-full border-4 border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.4)]" />
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2"><Crown size={28} className="text-yellow-500 fill-yellow-500 animate-bounce" /></div>
                            </div>
                            <div className="bg-yellow-500/10 w-full h-36 rounded-t-3xl flex flex-col items-center pt-5 border-x border-t border-yellow-500/30">
                                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-tighter">Legendary</span>
                                <span className="text-xs font-black text-white truncate w-24 text-center mt-1">@{topThree[0].username}</span>
                                <span className="text-lg font-black gold-text italic mt-1">₹{(topThree[0].balance + topThree[0].totalDeposit).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* 3rd Place */}
                        <div className="flex flex-col items-center flex-1">
                            <div className="relative mb-3">
                                <img src={topThree[2].avatar} className="w-14 h-14 rounded-full border-4 border-amber-700" />
                                <div className="absolute -top-3 -right-2 bg-amber-700 p-1.5 rounded-full"><Medal size={14} className="text-slate-900" /></div>
                            </div>
                            <div className="bg-amber-700/10 w-full h-20 rounded-t-2xl flex flex-col items-center pt-3 border-x border-t border-amber-700/20">
                                <span className="text-[10px] font-black text-amber-600 truncate w-20 text-center">@{topThree[2].username}</span>
                                <span className="text-sm font-black text-white italic">₹{(topThree[2].balance + topThree[2].totalDeposit).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* List View */}
                <div className="space-y-3">
                    {rest.map((player, i) => (
                        <div key={player.uid} className="bg-[#111827] p-4 rounded-2xl flex items-center justify-between border border-white/5 shadow-xl transition-all hover:bg-[#1a2233]">
                            <div className="flex items-center gap-4">
                                <span className="font-black text-slate-600 italic text-sm w-4">{i + 4}</span>
                                <img src={player.avatar} className="w-10 h-10 rounded-full border border-white/10" />
                                <div>
                                    <div className="font-black text-white text-xs uppercase tracking-tighter flex items-center gap-1">
                                        @{player.username}
                                        {player.vipLevel > 0 && <ShieldCheck size={10} className="text-yellow-500" />}
                                    </div>
                                    <div className="text-[8px] text-slate-500 font-bold uppercase">VIP LV.{player.vipLevel} Elite</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-black text-green-500 italic">₹{(player.balance + player.totalDeposit).toLocaleString()}</div>
                                <div className="flex items-center justify-end gap-1 text-[8px] text-slate-600 font-black uppercase">
                                    <TrendingUp size={10} /> Lifetime
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
