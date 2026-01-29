
import React, { useState, useEffect } from 'react';
import { UserProfile, GiftCode, AppSettings } from '../types';
import { getAllUsers, adminUpdateUserBalance, adminBlockUser, adminDeleteUser, adminGetSettings, adminUpdateSettings, adminCreateGiftCode, adminGetAllGiftCodes } from '../services/supabaseService';
import { ArrowLeft, Users, Gamepad2, Gift, ShieldCheck, Wallet, Trash2, Ban, Search, CheckCircle2, X, Plus, Power, CreditCard } from 'lucide-react';

const AdminPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'USERS' | 'GAMES' | 'GIFTS' | 'PAYMENTS'>('USERS');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [newGift, setNewGift] = useState({ code: '', amount: 100, limit: 10, minVip: 0 });

    useEffect(() => {
        setLoading(true);
        getAllUsers(setUsers);
        adminGetAllGiftCodes(setGiftCodes);
        const unsub = adminGetSettings(setSettings);
        setLoading(false);
        return unsub;
    }, []);

    const handleMoneyAction = async (uid: string, amount: number, isGift: boolean) => {
        const confirmMsg = isGift ? `Add ₹${amount} gift to this user?` : `Subtract ₹${Math.abs(amount)} from this user?`;
        if (window.confirm(confirmMsg)) {
            await adminUpdateUserBalance(uid, amount, isGift);
        }
    };

    const toggleGame = async (gameId: string) => {
        if (!settings) return;
        const newDisabled = { ...settings.disabledGames };
        newDisabled[gameId] = !newDisabled[gameId];
        await adminUpdateSettings({ disabledGames: newDisabled });
    };

    const handleCreateGift = async () => {
        if (!newGift.code || newGift.amount <= 0) return;
        await adminCreateGiftCode({ ...newGift, usedCount: 0, createdAt: Date.now() });
        setShowGiftModal(false);
        setNewGift({ code: '', amount: 100, limit: 10, minVip: 0 });
    };

    const filteredUsers = users.filter(u => 
        u.username?.toLowerCase().includes(search.toLowerCase()) || 
        u.phone?.includes(search) || 
        u.uid?.includes(search)
    );

    const GAMES_LIST = [
        'GAME_WINGO', 'GAME_AVIATOR', 'GAME_MINES', 'GAME_DOG', 'GAME_BURST', 'GAME_DRAGON_TIGER',
        'GAME_ROULETTE', 'GAME_SICBO', 'GAME_BACCARAT', 'GAME_STREET_RACE', 'GAME_VORTEX', 'GAME_PENALTY',
        'GAME_CRICKET', 'GAME_TOWER', 'GAME_SLOT_MACHINE', 'GAME_ANDAR_BAHAR', 'GAME_PLINKO', 'GAME_LIMBO',
        'GAME_DRAGON_TOWER', 'GAME_FRUIT_SLOT', 'GAME_EGYPT_SLOT', 'GAME_VAULT', 'GAME_HEAD_TAILS', 'GAME_KENO', 'GAME_DICE'
    ];

    return (
        <div className="min-h-screen bg-[#0a0f1d] text-white font-sans flex flex-col">
            {/* Header */}
            <div className="bg-[#111827] p-4 flex items-center justify-between border-b border-yellow-500/20 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft size={20}/></button>
                    <h1 className="text-lg font-black gold-text uppercase italic">Mafia Command Center</h1>
                </div>
                <div className="bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20 text-[10px] font-black uppercase text-yellow-500">Admin Mode</div>
            </div>

            {/* Sidebar-like Navigation */}
            <div className="flex bg-[#111827] border-b border-white/5 overflow-x-auto no-scrollbar">
                <NavBtn icon={Users} label="Users" active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} />
                <NavBtn icon={Gamepad2} label="Games" active={activeTab === 'GAMES'} onClick={() => setActiveTab('GAMES')} />
                <NavBtn icon={Gift} label="Gift Codes" active={activeTab === 'GIFTS'} onClick={() => setActiveTab('GIFTS')} />
                <NavBtn icon={CreditCard} label="Payments" active={activeTab === 'PAYMENTS'} onClick={() => setActiveTab('PAYMENTS')} />
            </div>

            <div className="flex-1 p-6 overflow-y-auto pb-20">
                {activeTab === 'USERS' && (
                    <div className="space-y-6">
                        <div className="bg-zinc-900 rounded-2xl p-3 flex items-center gap-3 border border-white/10">
                            <Search size={18} className="text-slate-500" />
                            <input 
                                type="text" 
                                placeholder="Search by Username, Phone or UID..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-transparent flex-1 text-sm outline-none text-white font-medium"
                            />
                        </div>

                        <div className="space-y-4">
                            {filteredUsers.map(user => (
                                <div key={user.uid} className={`bg-[#111827] rounded-3xl p-6 border-l-4 transition-all ${user.isBlocked ? 'border-red-600 opacity-50' : 'border-blue-500 shadow-xl'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-4">
                                            <img src={user.avatar} className="w-12 h-12 rounded-full border border-white/10" />
                                            <div>
                                                <h3 className="font-black text-sm">@{user.username}</h3>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">{user.phone} | VIP {user.vipLevel}</p>
                                                <p className="text-[9px] text-zinc-600 mt-1 uppercase font-mono">UID: {user.uid}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] text-slate-500 font-black uppercase">Net Asset</p>
                                            <p className="text-xl font-black gold-text italic">₹{user.balance.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 mt-6">
                                        <button onClick={() => handleMoneyAction(user.uid, 500, true)} className="py-3 bg-green-600/10 text-green-500 rounded-2xl border border-green-500/20 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Gift ₹500</button>
                                        <button onClick={() => handleMoneyAction(user.uid, -500, false)} className="py-3 bg-red-600/10 text-red-500 rounded-2xl border border-red-500/20 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Deduct ₹500</button>
                                        <button onClick={() => adminBlockUser(user.uid, !user.isBlocked)} className={`py-3 rounded-2xl border font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all ${user.isBlocked ? 'bg-zinc-800 text-white' : 'bg-orange-600/10 text-orange-500 border-orange-500/20'}`}>
                                            {user.isBlocked ? 'Unblock Account' : 'Block Account'}
                                        </button>
                                        <button onClick={() => window.confirm("Permanently delete user?") && adminDeleteUser(user.uid)} className="py-3 bg-slate-900 text-slate-500 rounded-2xl border border-white/5 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Delete Records</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'GAMES' && (
                    <div className="grid grid-cols-2 gap-4">
                        {GAMES_LIST.map(gameId => (
                            <div key={gameId} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 ${settings?.disabledGames?.[gameId] ? 'bg-red-950/20 border-red-900/40 grayscale' : 'bg-blue-900/10 border-blue-500/30 shadow-xl'}`}>
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-xl">
                                    {gameId.includes('WINGO') ? '🎱' : gameId.includes('AVIATOR') ? '✈️' : '🎰'}
                                </div>
                                <div className="text-center">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest">{gameId.replace('GAME_', '').replace('_', ' ')}</h4>
                                    <p className={`text-[9px] font-bold mt-1 uppercase ${settings?.disabledGames?.[gameId] ? 'text-red-500' : 'text-green-500'}`}>
                                        {settings?.disabledGames?.[gameId] ? 'Offline' : 'Online'}
                                    </p>
                                </div>
                                <button onClick={() => toggleGame(gameId)} className={`w-full py-2 rounded-xl text-[10px] font-black uppercase transition-all ${settings?.disabledGames?.[gameId] ? 'bg-green-600' : 'bg-red-600'}`}>
                                    {settings?.disabledGames?.[gameId] ? 'OPEN' : 'CLOSE'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'GIFTS' && (
                    <div className="space-y-6">
                        <button onClick={() => setShowGiftModal(true)} className="w-full py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black uppercase tracking-[0.3em] rounded-[2rem] flex items-center justify-center gap-3 shadow-xl active:scale-95 border-t-2 border-white/20">
                            <Plus size={24}/> NEW GIFT CODE
                        </button>

                        <div className="space-y-4">
                            {giftCodes.map(code => (
                                <div key={code.code} className="bg-[#111827] rounded-3xl p-6 border border-white/5 shadow-lg">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-2xl font-black gold-text italic tracking-widest">{code.code}</h3>
                                            <p className="text-[10px] text-slate-500 font-black uppercase mt-1">Value: ₹{code.amount} | Min VIP: {code.minVip}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-zinc-600 uppercase font-black">Usage</p>
                                            <p className="text-lg font-black text-white">{code.usedCount} / {code.limit}</p>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                        <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${(code.usedCount / code.limit) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'PAYMENTS' && (
                    <div className="space-y-8">
                        <div className="bg-[#111827] rounded-3xl p-8 border border-white/10 shadow-2xl">
                             <h3 className="text-xs font-black uppercase tracking-widest text-yellow-500 mb-6 flex items-center gap-2 italic">
                                <ShieldCheck size={18} /> Elite Payment Details
                             </h3>
                             <div className="space-y-4">
                                 <div>
                                     <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Universal UPI Receiver ID</label>
                                     <input 
                                        type="text" 
                                        value={settings?.upiId || ''} 
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, upiId: e.target.value } : null)}
                                        className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-5 text-white font-mono font-black mt-2 text-lg outline-none focus:border-yellow-500 transition-all" 
                                     />
                                 </div>
                                 <button 
                                    onClick={() => adminUpdateSettings({ upiId: settings?.upiId })}
                                    className="w-full py-5 bg-blue-600 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95"
                                 >
                                    UPDATE GATEWAY
                                 </button>
                             </div>
                        </div>

                        <div className="p-6 bg-red-600/10 rounded-3xl border border-red-500/20 text-center">
                            <p className="text-[10px] text-red-500 font-black uppercase tracking-widest leading-relaxed">
                                Caution: All changes in this hub are real-time and affect the live database for all users instantly.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Gift Modal */}
            {showGiftModal && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/85 backdrop-blur-md">
                    <div className="bg-[#111] w-full max-w-md rounded-t-[3.5rem] p-10 border-t-2 border-yellow-500/40 animate-in slide-in-from-bottom">
                         <div className="flex justify-between items-center mb-8">
                             <h3 className="text-3xl font-black italic gold-text tracking-tighter uppercase">Code Architect</h3>
                             <button onClick={() => setShowGiftModal(false)} className="p-4 bg-slate-800 rounded-full"><X/></button>
                         </div>
                         
                         <div className="space-y-6 mb-10">
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Gift Code Text</label>
                                <input type="text" value={newGift.code} onChange={e => setNewGift({...newGift, code: e.target.value.toUpperCase()})} placeholder="e.g. MAFIA100" className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-4 text-white font-black uppercase tracking-widest" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Amount (₹)</label>
                                    <input type="number" value={newGift.amount} onChange={e => setNewGift({...newGift, amount: Number(e.target.value)})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-4 text-white font-black" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase ml-1">Max Users</label>
                                    <input type="number" value={newGift.limit} onChange={e => setNewGift({...newGift, limit: Number(e.target.value)})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-2xl p-4 text-white font-black" />
                                </div>
                            </div>
                         </div>

                         <button onClick={handleCreateGift} className="w-full py-7 rounded-[2.5rem] bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black uppercase tracking-[0.4em] text-2xl shadow-2xl active:scale-95 border-t-2 border-white/30">GENERATE BOUNTY</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const NavBtn = ({ icon: Icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-6 min-w-[100px] transition-all border-b-4 ${active ? 'border-yellow-500 bg-yellow-500/5 text-yellow-500' : 'border-transparent text-slate-600'}`}>
        <Icon size={24} />
        <span className="text-[9px] font-black uppercase mt-2 tracking-widest">{label}</span>
    </button>
);

export default AdminPanel;
