
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
    Users, ShieldAlert, Wallet, Gamepad2, Gift, 
    Settings, Trash2, Ban, Search, Plus, 
    Power, CreditCard, LayoutDashboard, 
    ArrowRight, CheckCircle2, X, Terminal,
    Database, Activity, RefreshCw, AlertTriangle
} from 'lucide-react';
import { 
    getAllUsers, adminUpdateUserBalance, adminBlockUser, 
    adminDeleteUser, adminGetSettings, adminUpdateSettings, 
    adminCreateGiftCode, adminGetAllGiftCodes 
} from './services/supabaseService';
import { UserProfile, GiftCode, AppSettings } from './types';

const AdminWebsite = () => {
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'GAMES' | 'GIFTS' | 'PAYMENTS'>('DASHBOARD');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [newGift, setNewGift] = useState({ code: '', amount: 100, limit: 10, minVip: 0 });

    useEffect(() => {
        const unsubSettings = adminGetSettings((s) => setSettings(s));
        getAllUsers(setUsers);
        adminGetAllGiftCodes(setGiftCodes);
        setLoading(false);
        return () => { if (unsubSettings) unsubSettings(); };
    }, []);

    const handleMoneyAction = async (uid: string, amount: number, isGift: boolean) => {
        const label = isGift ? "Gift" : "Deduction";
        if (window.confirm(`Are you sure you want to perform ₹${Math.abs(amount)} ${label}?`)) {
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
        { id: 'GAME_WINGO', name: 'Win Go' }, { id: 'GAME_AVIATOR', name: 'Aviator' },
        { id: 'GAME_MINES', name: 'Mines' }, { id: 'GAME_DRAGON_TIGER', name: 'Dragon Tiger' },
        { id: 'GAME_ROULETTE', name: 'Roulette' }, { id: 'GAME_SICBO', name: 'Sic Bo' },
        { id: 'GAME_BACCARAT', name: 'Baccarat' }, { id: 'GAME_DOG', name: 'Dog Road' }
    ];

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 bg-[#0a0f1d] border-r border-white/5 flex flex-col">
                <div className="p-8 flex items-center gap-3">
                    <Terminal className="text-yellow-500" />
                    <h1 className="text-xl font-black italic gold-text">MASTER COMMAND</h1>
                </div>
                
                <nav className="flex-1 px-4 space-y-2 py-4">
                    <SideNavBtn active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={LayoutDashboard} label="Dashboard" />
                    <SideNavBtn active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} icon={Users} label="User Management" />
                    <SideNavBtn active={activeTab === 'GAMES'} onClick={() => setActiveTab('GAMES')} icon={Gamepad2} label="Game Toggles" />
                    <SideNavBtn active={activeTab === 'GIFTS'} onClick={() => setActiveTab('GIFTS')} icon={Gift} label="Gift Factory" />
                    <SideNavBtn active={activeTab === 'PAYMENTS'} onClick={() => setActiveTab('PAYMENTS')} icon={CreditCard} label="Payment Control" />
                </nav>

                <div className="p-6">
                    <div className="bg-red-600/10 rounded-2xl p-4 border border-red-500/20 text-center">
                        <Activity className="text-red-500 mx-auto mb-2" size={18} />
                        <p className="text-[10px] font-black uppercase text-red-500 tracking-widest">Live Engine Active</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col bg-[#020617] overflow-y-auto no-scrollbar">
                <header className="h-20 bg-[#0a0f1d]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-10 sticky top-0 z-50">
                    <h2 className="text-lg font-bold uppercase tracking-widest text-slate-400">{activeTab}</h2>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Database size={16} className="text-green-500" />
                            <span className="text-xs font-bold text-green-500">DATABASE SYNCED</span>
                        </div>
                        <button onClick={() => window.location.reload()} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white">
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </header>

                <div className="p-10 max-w-7xl mx-auto w-full">
                    {activeTab === 'DASHBOARD' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatCard label="Total Operatives" value={users.length} icon={Users} color="text-blue-500" />
                                <StatCard label="Platform Reserve" value={`₹${users.reduce((a, b) => a + (b.balance || 0), 0).toLocaleString()}`} icon={Wallet} color="text-green-500" />
                                <StatCard label="Active Gifts" value={giftCodes.length} icon={Gift} color="text-yellow-500" />
                                <StatCard label="Offline Games" value={Object.values(settings?.disabledGames || {}).filter(v => v).length} icon={Gamepad2} color="text-red-500" />
                            </div>

                            <div className="bg-[#0a0f1d] border border-white/5 rounded-[2rem] p-10 flex items-center justify-between shadow-2xl">
                                <div>
                                    <h3 className="text-3xl font-black italic mb-2">Welcome Back, Overseer.</h3>
                                    <p className="text-slate-500 max-w-md leading-relaxed">The Mafia Club ecosystem is currently healthy. All 25 servers are responsive. No security breaches detected.</p>
                                </div>
                                <div className="p-6 bg-yellow-500/10 rounded-full border-4 border-yellow-500/20 status-critical">
                                    <Activity size={48} className="text-yellow-500" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'USERS' && (
                        <div className="space-y-6">
                            <div className="bg-[#0a0f1d] p-2 rounded-2xl flex items-center gap-4 border border-white/10 shadow-lg px-6">
                                <Search className="text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="Search by UID, Phone, or Alias..." 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-transparent flex-1 py-4 text-white font-bold outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {filteredUsers.map(user => (
                                    <div key={user.uid} className={`bg-[#0a0f1d] rounded-[2.5rem] p-8 border-l-8 transition-all hover:scale-[1.02] ${user.isBlocked ? 'border-red-600 opacity-60' : 'border-blue-500'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-6">
                                                <img src={user.avatar} className="w-16 h-16 rounded-full border-2 border-white/10" />
                                                <div>
                                                    <h4 className="text-xl font-black">@{user.username}</h4>
                                                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">{user.phone} • LV.{user.vipLevel}</p>
                                                    <code className="text-[10px] text-zinc-600 mt-2 block">{user.uid}</code>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-600 font-black uppercase mb-1">Operative Balance</p>
                                                <p className="text-3xl font-black gold-text italic">₹{user.balance?.toFixed(2)}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mt-10">
                                            <button onClick={() => handleMoneyAction(user.uid, 500, true)} className="py-4 bg-green-500/10 text-green-500 rounded-2xl border border-green-500/20 font-black uppercase text-xs hover:bg-green-500 hover:text-black transition-all">Gift ₹500</button>
                                            <button onClick={() => handleMoneyAction(user.uid, -500, false)} className="py-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 font-black uppercase text-xs hover:bg-red-500 hover:text-black transition-all">Katana ₹500</button>
                                            <button onClick={() => adminBlockUser(user.uid, !user.isBlocked)} className={`py-4 rounded-2xl border font-black uppercase text-xs transition-all ${user.isBlocked ? 'bg-zinc-800 text-white' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                                                {user.isBlocked ? 'Release Hold' : 'Block Access'}
                                            </button>
                                            <button onClick={() => window.confirm("PURGE USER DATA PERMANENTLY?") && adminDeleteUser(user.uid)} className="py-4 bg-slate-900 text-slate-500 rounded-2xl border border-white/5 font-black uppercase text-xs hover:bg-white hover:text-black transition-all">Purge Operative</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'GAMES' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {GAMES_LIST.map(game => {
                                const isOff = settings?.disabledGames?.[game.id] === true;
                                return (
                                    <div key={game.id} className={`p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-6 ${isOff ? 'bg-red-950/20 border-red-600/40' : 'bg-green-950/20 border-green-600/40'}`}>
                                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-2xl ${isOff ? 'bg-red-600/20 text-red-500 grayscale' : 'bg-green-600/20 text-green-500'}`}>
                                            {game.id.includes('WINGO') ? '🎱' : game.id.includes('AVIATOR') ? '✈️' : '🎰'}
                                        </div>
                                        <div className="text-center">
                                            <h4 className="text-lg font-black uppercase tracking-tighter">{game.name}</h4>
                                            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full mt-2 inline-block ${isOff ? 'bg-red-600 text-white' : 'bg-green-600 text-black'}`}>
                                                {isOff ? 'MAINTENANCE' : 'LIVE'}
                                            </span>
                                        </div>
                                        <button onClick={() => toggleGame(game.id)} className={`w-full py-4 rounded-2xl font-black uppercase text-xs transition-all shadow-xl ${isOff ? 'bg-green-600 text-black' : 'bg-red-600 text-white'}`}>
                                            {isOff ? 'LAUNCH SERVER' : 'TERMINATE SERVER'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'GIFTS' && (
                        <div className="space-y-8">
                            <button onClick={() => setShowGiftModal(true)} className="w-full py-8 bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-black uppercase tracking-[0.4em] rounded-[2.5rem] flex items-center justify-center gap-4 shadow-2xl hover:scale-[1.01] transition-all border-t-4 border-white/20">
                                <Plus size={32} /> GENERATE NEW BOUNTY CODE
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {giftCodes.map(code => (
                                    <div key={code.code} className="bg-[#0a0f1d] rounded-[2rem] p-8 border border-white/5 shadow-2xl">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h3 className="text-3xl font-black gold-text italic tracking-widest">{code.code}</h3>
                                                <p className="text-[10px] text-slate-500 font-black uppercase mt-2">Value: ₹{code.amount} | Target VIP: {code.minVip}+</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-600 uppercase font-black">Quota</p>
                                                <p className="text-2xl font-black italic">{code.usedCount} / {code.limit}</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-white/5 p-0.5">
                                            <div className="h-full bg-yellow-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(234,179,8,0.5)]" style={{ width: `${(code.usedCount / code.limit) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'PAYMENTS' && (
                        <div className="max-w-2xl mx-auto space-y-8">
                            <div className="bg-[#0a0f1d] rounded-[3rem] p-10 border border-white/10 shadow-2xl">
                                 <div className="flex items-center gap-4 mb-10">
                                    <div className="p-4 bg-blue-600/20 rounded-3xl text-blue-400">
                                        <CreditCard size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black italic uppercase">Gateway Master</h3>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest">Update universal payment receiver</p>
                                    </div>
                                 </div>
                                 
                                 <div className="space-y-6">
                                     <div className="space-y-2">
                                         <label className="text-[10px] text-slate-600 font-black uppercase ml-2 tracking-widest">Platform UPI ID</label>
                                         <input 
                                            type="text" 
                                            value={settings?.upiId || ''} 
                                            onChange={(e) => setSettings(prev => prev ? { ...prev, upiId: e.target.value } : null)}
                                            className="w-full bg-black border-2 border-white/10 rounded-3xl p-6 text-white font-mono font-bold text-xl outline-none focus:border-yellow-500 transition-all shadow-inner" 
                                         />
                                     </div>
                                     <button 
                                        onClick={() => adminUpdateSettings({ upiId: settings?.upiId })}
                                        className="w-full py-6 bg-blue-600 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-blue-500 active:scale-95 transition-all border-t-2 border-white/10"
                                     >
                                        ACTIVATE NEW GATEWAY
                                     </button>
                                 </div>
                            </div>

                            <div className="p-8 bg-orange-600/10 rounded-[2rem] border border-orange-500/20 flex gap-6 items-center">
                                <AlertTriangle className="text-orange-500 shrink-0" size={32} />
                                <p className="text-xs font-bold text-orange-400 leading-relaxed uppercase tracking-widest">
                                    Warning: Changes to the Payment Gateway are applied globally. Ensure the UPI ID is verified before deployment.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Gift Modal */}
            {showGiftModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6">
                    <div className="bg-[#0a0f1d] w-full max-w-lg rounded-[3rem] p-12 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)]">
                         <div className="flex justify-between items-center mb-12">
                             <h3 className="text-3xl font-black italic gold-text tracking-tighter uppercase">CODE ARCHITECT</h3>
                             <button onClick={() => setShowGiftModal(false)} className="p-4 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X/></button>
                         </div>
                         
                         <div className="space-y-8 mb-12">
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-2">Code String</label>
                                <input type="text" value={newGift.code} onChange={e => setNewGift({...newGift, code: e.target.value.toUpperCase()})} placeholder="e.g. MAFIA99" className="w-full bg-black border-2 border-white/10 rounded-2xl p-5 text-white font-black uppercase tracking-[0.4em] outline-none focus:border-yellow-500 shadow-inner" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-2">Amount (₹)</label>
                                    <input type="number" value={newGift.amount} onChange={e => setNewGift({...newGift, amount: Number(e.target.value)})} className="w-full bg-black border-2 border-white/10 rounded-2xl p-5 text-white font-black outline-none focus:border-yellow-500 shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-2">Max Uses</label>
                                    <input type="number" value={newGift.limit} onChange={e => setNewGift({...newGift, limit: Number(e.target.value)})} className="w-full bg-black border-2 border-white/10 rounded-2xl p-5 text-white font-black outline-none focus:border-yellow-500 shadow-inner" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-2">Requirement (VIP LV)</label>
                                <input type="number" min="0" max="5" value={newGift.minVip} onChange={e => setNewGift({...newGift, minVip: Number(e.target.value)})} className="w-full bg-black border-2 border-white/10 rounded-2xl p-5 text-white font-black outline-none focus:border-yellow-500 shadow-inner" />
                            </div>
                         </div>

                         <button onClick={handleCreateGift} className="w-full py-8 rounded-[2rem] bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-black uppercase tracking-[0.5em] text-2xl shadow-2xl active:scale-95 transition-all border-t-4 border-white/20">DEPLOY BOUNTY</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const SideNavBtn = ({ icon: Icon, label, active, onClick }: any) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center gap-4 p-5 rounded-2xl transition-all group ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20 border-t border-white/20' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
    >
        <Icon size={22} className={active ? 'text-white' : 'text-slate-600 group-hover:text-blue-400'} />
        <span className="font-black text-[11px] uppercase tracking-[0.2em]">{label}</span>
    </button>
);

const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-[#0a0f1d] p-8 rounded-[2rem] border border-white/5 shadow-xl hover:border-white/10 transition-all">
        <div className={`p-4 rounded-2xl bg-white/5 w-fit mb-6 ${color}`}>
            <Icon size={24} />
        </div>
        <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] mb-1">{label}</p>
        <p className="text-2xl font-black italic tracking-tighter">{value}</p>
    </div>
);

const adminRoot = document.getElementById('admin-root');
if (adminRoot) {
    createRoot(adminRoot).render(<AdminWebsite />);
}
