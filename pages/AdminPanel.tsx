
import React, { useState, useEffect } from 'react';
import { UserProfile, GiftCode, AppSettings, Transaction } from '../types';
import { getAllUsers, adminUpdateUserBalance, adminBlockUser, adminDeleteUser, adminGetSettings, adminUpdateSettings, adminCreateGiftCode, adminGetAllGiftCodes, getAllPendingTransactions, approveTransaction, rejectTransaction } from '../services/supabaseService';
import { ArrowLeft, Users, Gamepad2, Gift, ShieldCheck, Wallet, Trash2, Ban, Search, CheckCircle2, X, Plus, Power, CreditCard, Clock, CheckCircle } from 'lucide-react';

const AdminPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'REQUESTS' | 'USERS' | 'GAMES' | 'GIFTS' | 'PAYMENTS'>('REQUESTS');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [newGift, setNewGift] = useState({ code: '', amount: 100, limit: 10, minVip: 0 });

    useEffect(() => {
        setLoading(true);
        getAllUsers(setUsers);
        adminGetAllGiftCodes(setGiftCodes);
        getAllPendingTransactions(setPendingRequests);
        const unsub = adminGetSettings(setSettings);
        setLoading(false);
        return unsub;
    }, []);

    const handleMoneyAction = async (uid: string, amount: number, isGift: boolean) => {
        if (window.confirm(isGift ? `Gift ₹${amount}?` : `Deduct ₹${Math.abs(amount)}?`)) {
            await adminUpdateUserBalance(uid, amount, isGift);
        }
    };

    const toggleGame = async (gameId: string) => {
        if (!settings) return;
        const newDisabled = { ...(settings.disabledGames || {}) };
        newDisabled[gameId] = !newDisabled[gameId];
        await adminUpdateSettings({ disabledGames: newDisabled });
    };

    const filteredUsers = users.filter(u => 
        u.username?.toLowerCase().includes(search.toLowerCase()) || 
        u.phone?.includes(search)
    );

    const GAMES_LIST = [
        { id: 'GAME_WINGO', name: 'Win Go' }, { id: 'GAME_AVIATOR', name: 'Aviator' },
        { id: 'GAME_MINES', name: 'Mines' }, { id: 'GAME_DRAGON_TIGER', name: 'Dragon Tiger' },
        { id: 'GAME_ROULETTE', name: 'Roulette' }
    ];

    return (
        <div className="min-h-screen bg-[#0a0f1d] text-white font-sans flex flex-col pb-20">
            <div className="bg-[#111827] p-4 flex items-center justify-between border-b border-yellow-500/20 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={20}/></button>
                    <h1 className="text-lg font-black gold-text uppercase italic">MASTER COMMAND</h1>
                </div>
                <div className="bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20 text-[10px] font-black uppercase text-yellow-500">Live Control</div>
            </div>

            <div className="flex bg-[#111827] border-b border-white/5 overflow-x-auto no-scrollbar">
                <NavBtn label="Requests" active={activeTab === 'REQUESTS'} onClick={() => setActiveTab('REQUESTS')} badge={pendingRequests.length} />
                <NavBtn label="Users" active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} />
                <NavBtn label="Games" active={activeTab === 'GAMES'} onClick={() => setActiveTab('GAMES')} />
                <NavBtn label="Gift" active={activeTab === 'GIFTS'} onClick={() => setActiveTab('GIFTS')} />
                <NavBtn label="Config" active={activeTab === 'PAYMENTS'} onClick={() => setActiveTab('PAYMENTS')} />
            </div>

            <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
                {activeTab === 'REQUESTS' && (
                    <div className="space-y-4">
                        {pendingRequests.length > 0 ? pendingRequests.map(({uid, txId, tx}) => (
                            <div key={txId} className="bg-[#111827] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
                                <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl font-black text-[9px] uppercase ${tx.type === 'DEPOSIT' ? 'bg-blue-600' : 'bg-red-600'}`}>{tx.type}</div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-black text-2xl text-yellow-500">₹{tx.amount.toFixed(2)}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Operative: {uid.slice(-6)}</p>
                                        <p className="text-[10px] text-blue-400 mt-2 font-mono break-all">{tx.utr ? `UTR: ${tx.utr}` : `Method: ${tx.method}`}</p>
                                        {tx.accountDetails && (
                                            <div className="mt-2 p-2 bg-black/40 rounded-lg text-[9px] text-slate-400 font-mono">
                                                {JSON.stringify(tx.accountDetails)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <button onClick={() => approveTransaction(uid, txId)} className="py-3 bg-green-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-green-900/40">APPROVE</button>
                                    <button onClick={() => rejectTransaction(uid, txId)} className="py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-red-900/40">REJECT</button>
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 flex flex-col items-center opacity-20">
                                <Clock size={48} className="mb-4" />
                                <p className="font-black uppercase tracking-widest">No Active Requests</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'USERS' && (
                    <div className="space-y-4">
                        <div className="bg-zinc-900 rounded-2xl p-3 flex items-center gap-3 border border-white/10 mb-6 shadow-inner">
                            <Search size={18} className="text-slate-500" />
                            <input type="text" placeholder="Search operative..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent flex-1 text-sm outline-none text-white font-bold" />
                        </div>
                        {filteredUsers.map(u => (
                            <div key={u.uid} className="bg-[#111827] p-6 rounded-3xl border border-white/5">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <img src={u.avatar} className="w-12 h-12 rounded-full border border-white/10 shadow-lg" />
                                        <div><h3 className="font-black text-sm">@{u.username}</h3><p className="text-[9px] text-slate-500 font-mono">{u.phone}</p></div>
                                    </div>
                                    <div className="text-right"><p className="text-xl font-black gold-text italic">₹{u.balance.toFixed(2)}</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleMoneyAction(u.uid, 500, true)} className="py-3 bg-green-600/10 text-green-500 border border-green-500/20 rounded-xl text-[9px] font-black uppercase shadow-sm">Gift +500</button>
                                    <button onClick={() => handleMoneyAction(u.uid, -500, false)} className="py-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase shadow-sm">Cut -500</button>
                                    <button onClick={() => adminBlockUser(u.uid, !u.isBlocked)} className={`py-3 border rounded-xl text-[9px] font-black uppercase ${u.isBlocked ? 'bg-red-600 text-white' : 'border-slate-700 text-slate-400'}`}>{u.isBlocked ? 'UNBLOCK' : 'BLOCK'}</button>
                                    <button onClick={() => adminDeleteUser(u.uid)} className="py-3 bg-red-900/10 text-red-500 border border-red-900/20 rounded-xl text-[9px] font-black uppercase">PURGE</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'GAMES' && (
                    <div className="grid grid-cols-1 gap-4">
                        {GAMES_LIST.map(game => (
                            <div key={game.id} className="bg-[#111827] p-6 rounded-3xl border border-white/5 flex items-center justify-between shadow-xl">
                                <h4 className="font-black text-sm uppercase italic gold-text tracking-widest">{game.name}</h4>
                                <button onClick={() => toggleGame(game.id)} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase transition-all shadow-lg ${settings?.disabledGames?.[game.id] ? 'bg-red-600 text-white' : 'bg-green-600 text-black'}`}>
                                    {settings?.disabledGames?.[game.id] ? 'OFFLINE' : 'LIVE'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'GIFTS' && (
                    <div className="space-y-4">
                        <button onClick={() => setShowGiftModal(true)} className="w-full py-6 bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-black uppercase rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                            <Plus size={24}/> GENERATE NEW BOUNTY
                        </button>
                        {giftCodes.map(g => (
                            <div key={g.code} className="bg-[#111827] p-5 rounded-2xl border border-white/5 flex justify-between items-center shadow-lg">
                                <div><h3 className="font-black text-yellow-500 italic text-xl uppercase tracking-widest">{g.code}</h3><p className="text-[10px] text-slate-500 uppercase font-black mt-1">₹{g.amount} • {g.usedCount}/{g.limit} Uses</p></div>
                                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-red-500 active:bg-red-500/10 transition-colors"><Trash2 size={20}/></div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'PAYMENTS' && (
                    <div className="space-y-6">
                        <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
                             <h3 className="text-xs font-black uppercase text-yellow-500 mb-6 flex items-center gap-2 italic tracking-widest"><CreditCard size={20} /> GATEWAY CORE</h3>
                             <label className="text-[9px] text-slate-500 font-black uppercase ml-1">Universal Platform UPI ID</label>
                             <input type="text" value={settings?.upiId || ''} onChange={(e) => setSettings(prev => prev ? { ...prev, upiId: e.target.value } : null)} className="w-full bg-[#0a0f1d] border-2 border-slate-700 rounded-2xl p-5 text-white font-mono font-black mt-2 outline-none focus:border-yellow-500 shadow-inner" />
                             <button onClick={() => adminUpdateSettings({ upiId: settings?.upiId })} className="w-full py-5 bg-blue-600 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl mt-8 border-t border-white/20 active:scale-95 transition-all">DEPLOY GATEWAY</button>
                        </div>
                    </div>
                )}
            </div>

            {showGiftModal && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
                    <div className="bg-[#111] w-full max-w-sm rounded-[3rem] p-10 border border-white/10 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-10"><h3 className="font-black italic gold-text uppercase text-xl">CODE FACTORY</h3><button onClick={() => setShowGiftModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X/></button></div>
                        <div className="space-y-6 mb-10">
                            <input type="text" placeholder="CODE STRING" value={newGift.code} onChange={e => setNewGift({...newGift, code: e.target.value.toUpperCase()})} className="w-full bg-black p-5 rounded-2xl border border-white/10 font-black uppercase tracking-widest outline-none focus:border-yellow-500 transition-all" />
                            <input type="number" placeholder="AMOUNT (₹)" value={newGift.amount} onChange={e => setNewGift({...newGift, amount: Number(e.target.value)})} className="w-full bg-black p-5 rounded-2xl border border-white/10 font-black outline-none focus:border-yellow-500 transition-all" />
                            <input type="number" placeholder="LIMIT (USES)" value={newGift.limit} onChange={e => setNewGift({...newGift, limit: Number(e.target.value)})} className="w-full bg-black p-5 rounded-2xl border border-white/10 font-black outline-none focus:border-yellow-500 transition-all" />
                        </div>
                        <button onClick={async () => { await adminCreateGiftCode({...newGift, usedCount: 0, createdAt: Date.now(), minVip: 0}); setShowGiftModal(false); }} className="w-full py-5 bg-yellow-500 text-black font-black uppercase rounded-2xl border-t border-white/40 shadow-xl active:scale-95 transition-all">GENERATE BOUNTY</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const NavBtn = ({ label, active, onClick, badge }: any) => (
    <button onClick={onClick} className={`px-6 py-5 min-w-[110px] font-black text-[10px] uppercase tracking-widest relative transition-all ${active ? 'text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/5' : 'text-slate-500'}`}>
        {label}
        {badge > 0 && <span className="absolute top-3 right-2 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[8px] animate-pulse font-black">{badge}</span>}
    </button>
);
export default AdminPanel;
