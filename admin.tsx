
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
    Users, ShieldAlert, Wallet, Gamepad2, Gift, 
    Settings, Trash2, Ban, Search, Plus, 
    Power, CreditCard, LayoutDashboard, 
    ArrowRight, CheckCircle2, X, Terminal,
    Database, Activity, RefreshCw, AlertTriangle,
    Key, Calendar, Eye, EyeOff, BarChart3,
    TrendingUp, TrendingDown, Target, Plane, Trophy
} from 'lucide-react';
import { 
    getAllUsers, adminUpdateUserBalance, adminBlockUser, 
    adminDeleteUser, adminGetSettings, adminUpdateSettings, 
    adminCreateGiftCode, adminGetAllGiftCodes, adminDeleteGiftCode,
    adminSetForcedOutcome, adminCreateActivationCode,
    adminGetAllActivationCodes, adminDeleteActivationCode,
    db, adminSetLiveOverride, adminClearLiveOverride, subscribeToLiveOverrides,
    adminGetUserTransactions, getAllPendingTransactions,
    approveTransaction, rejectTransaction
} from './services/supabaseService';
import { UserProfile, GiftCode, AppSettings, ActivationCode, Transaction } from './types';

const AdminWebsite = () => {
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'LICENSES' | 'GAMES' | 'GIFTS' | 'LIVE' | 'TRANSACTIONS'>('DASHBOARD');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUserTransactions, setSelectedUserTransactions] = useState<Transaction[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [liveOverrides, setLiveOverrides] = useState<Record<string, any>>({});
    const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);

    useEffect(() => {
        if (activeTab === 'USERS' && selectedUserId) {
             const unsub = adminGetUserTransactions(selectedUserId, (txs) => {
                 setSelectedUserTransactions([...txs].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)));
             });
             return () => unsub();
        }
    }, [activeTab, selectedUserId]);
    const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);
    const [licenses, setLicenses] = useState<ActivationCode[]>([]);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Modals
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [showLicenseModal, setShowLicenseModal] = useState(false);
    
    // Form States
    const [newGift, setNewGift] = useState({ code: '', amount: 100, limit: 10, minVip: 0, personalUser: '', expiryDate: '' });
    const [newLicense, setNewLicense] = useState({ days: 30, balance: 500 });

    useEffect(() => {
        const unsubSettings = adminGetSettings((s) => setSettings(s));
        const unsubUsers = getAllUsers(setUsers);
        const unsubGifts = adminGetAllGiftCodes(setGiftCodes);
        const unsubLicenses = adminGetAllActivationCodes(setLicenses);
        const unsubOverrides = subscribeToLiveOverrides(setLiveOverrides);
        const unsubPending = getAllPendingTransactions(setPendingTransactions);
        setLoading(false);
        return () => { 
            if (unsubSettings) unsubSettings(); 
            if (unsubUsers) { try { unsubUsers(); } catch(e){} }
            if (unsubGifts) unsubGifts();
            if (unsubLicenses) unsubLicenses();
            if (unsubOverrides) unsubOverrides();
            if (unsubPending) unsubPending();
        };
    }, []);

    const handleMoneyAction = async (uid: string) => {
        const amountStr = window.prompt("Enter amount (positive for gift, negative for cut):");
        if (!amountStr) return;
        const amount = parseFloat(amountStr);
        if (isNaN(amount)) { alert("Invalid amount"); return; }
        const ok = await adminUpdateUserBalance(uid, amount, amount > 0);
        if (ok) alert("Balance updated successfully");
    };

    const handleOutcomeChange = async (uid: string, outcome: 'WIN' | 'LOSS' | null) => {
        const ok = await adminSetForcedOutcome(uid, outcome);
        if (ok) alert(`Outcome locked to ${outcome || 'RANDOM'}`);
    };

    const handleLicenseCreate = async () => {
        const code = await adminCreateActivationCode(newLicense.days, newLicense.balance);
        if (code) {
            alert(`License Generated: ${code}`);
            setShowLicenseModal(false);
        }
    };

    const filteredUsers = users.filter(u => 
        u.username?.toLowerCase().includes(search.toLowerCase()) || 
        u.phone?.includes(search) || 
        u.uid?.includes(search)
    );

    const totalBets = users.reduce((a, b) => a + (b.totalBet || 0), 0);
    const totalBalance = users.reduce((a, b) => a + (b.balance || 0), 0);
    const totalDeposit = users.reduce((a, b) => a + (b.totalDeposit || 0), 0);

    return (
        <div className="flex h-screen overflow-hidden text-slate-200">
            {/* Sidebar */}
            <aside className="w-72 bg-[#0a0f1d] border-r border-white/5 flex flex-col pt-4">
                <div className="p-8 flex items-center gap-3">
                    <Terminal className="text-yellow-500" />
                    <h1 className="text-xl font-black italic gold-text">OVERSEER V2</h1>
                </div>
                
                <nav className="flex-1 px-4 space-y-2 py-4">
                    <SideNavBtn active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={LayoutDashboard} label="Intelligence" />
                    <SideNavBtn active={activeTab === 'LIVE'} onClick={() => setActiveTab('LIVE')} icon={Activity} label="Live Manipulation" />
                    <SideNavBtn active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} icon={Users} label="User Control" />
                    <SideNavBtn active={activeTab === 'LICENSES'} onClick={() => setActiveTab('LICENSES')} icon={Key} label="License Machine" />
                    <SideNavBtn active={activeTab === 'GAMES'} onClick={() => setActiveTab('GAMES')} icon={Gamepad2} label="Risk Algorithms" />
                    <SideNavBtn active={activeTab === 'GIFTS'} onClick={() => setActiveTab('GIFTS')} icon={Gift} label="Gift Codes" />
                    <SideNavBtn active={activeTab === 'TRANSACTIONS'} onClick={() => setActiveTab('TRANSACTIONS')} icon={CreditCard} label="Payments" badge={pendingTransactions.length} />
                </nav>

                <div className="p-6 mt-auto">
                    <div className="bg-green-600/10 rounded-2xl p-4 border border-green-500/20 flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-[10px] font-black uppercase text-green-500">System Online</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col bg-[#020617] overflow-y-auto no-scrollbar pb-20">
                <header className="h-20 bg-[#0a0f1d]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-10 sticky top-0 z-50">
                    <h2 className="text-lg font-bold uppercase tracking-widest text-slate-400">{activeTab}</h2>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase font-black">Admin Mode</p>
                            <p className="text-xs font-bold text-yellow-500">AUTHENTICATED HUB</p>
                        </div>
                        <button onClick={() => window.location.reload()} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-500">
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </header>

                <div className="p-10 max-w-7xl mx-auto w-full">
                    {activeTab === 'TRANSACTIONS' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-4xl font-black italic gold-text mb-2 uppercase">PAYMENT APPROVALS</h2>
                                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Approve or reject manual deposit & withdrawal requests</p>
                                </div>
                            </div>

                            {pendingTransactions.length === 0 ? (
                                <div className="bg-[#0a0f1d] border border-white/5 rounded-[2.5rem] p-16 text-center shadow-xl">
                                    <div className="p-6 bg-emerald-500/10 text-emerald-400 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                                        <CheckCircle2 size={36} />
                                    </div>
                                    <h3 className="text-2xl font-black italic uppercase tracking-wider text-slate-300">All Clear!</h3>
                                    <p className="text-slate-500 text-sm font-black uppercase tracking-wider mt-2">No pending deposit or withdrawal requests</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6">
                                    {pendingTransactions.map((req) => {
                                        const user = users.find(u => u.uid === req.uid);
                                        const isDeposit = req.type === 'DEPOSIT';
                                        
                                        return (
                                            <div 
                                                key={req.txId} 
                                                className={`bg-[#0a0f1d] rounded-[2.5rem] p-8 border-l-8 shadow-2xl transition-all hover:border-white/10 ${
                                                    isDeposit ? 'border-emerald-500' : 'border-amber-500'
                                                }`}
                                            >
                                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                                    {/* Left Section: User info & Transaction Type */}
                                                    <div className="flex gap-6 items-center">
                                                        <div className={`p-5 rounded-[2rem] border ${
                                                            isDeposit 
                                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                                        }`}>
                                                            <CreditCard size={32} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                                    isDeposit 
                                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                                }`}>
                                                                    {req.type}
                                                                </span>
                                                                <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase">
                                                                    {req.date}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-xl font-black text-white flex items-center gap-2">
                                                                {user ? user.username : 'Unknown User'} 
                                                                <span className="text-xs font-medium text-slate-500 font-mono">({req.uid.slice(0, 8)}...)</span>
                                                            </h4>
                                                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 mt-2 text-xs text-slate-400 uppercase font-black tracking-wider">
                                                                <p>Phone: <span className="text-white">{user?.phone || 'N/A'}</span></p>
                                                                <p>Current Balance: <span className="text-yellow-500 font-mono">₹{user?.balance?.toFixed(2) || '0.00'}</span></p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Middle Section: Specific Details (UTR or Bank details) */}
                                                    <div className="flex-1 lg:max-w-md bg-black/30 rounded-2xl p-5 border border-white/5 space-y-2 text-xs uppercase tracking-wider font-bold text-slate-400">
                                                        <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-1">Method: <span className="text-white">{req.method}</span></p>
                                                        {isDeposit ? (
                                                            <div>
                                                                <p>UTR Number:</p>
                                                                <p className="text-white font-mono text-sm tracking-widest select-all bg-zinc-950 p-2.5 rounded-xl border border-white/5 mt-1">{req.utr || 'N/A'}</p>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1 bg-zinc-950 p-3 rounded-xl border border-white/5">
                                                                <p className="text-[10px] text-slate-500 font-black">Account Details:</p>
                                                                {req.accountDetails?.accountName ? (
                                                                    <div className="space-y-0.5 text-slate-300 font-mono text-[11px]">
                                                                        <p>Holder: <span className="text-white font-sans font-black">{req.accountDetails.accountName}</span></p>
                                                                        <p>No: <span className="text-white font-black">{req.accountDetails.accountNo}</span></p>
                                                                        <p>IFSC: <span className="text-white font-black">{req.accountDetails.ifsc}</span></p>
                                                                    </div>
                                                                ) : req.accountDetails?.upiId ? (
                                                                    <p className="text-white font-mono font-black select-all text-xs">UPI: {req.accountDetails.upiId}</p>
                                                                ) : (
                                                                    <p className="text-slate-500 italic">No details available</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Right Section: Actions & Amount */}
                                                    <div className="flex lg:flex-col items-end gap-4 min-w-[200px] w-full lg:w-auto">
                                                        <div className="text-right flex-1 lg:flex-none">
                                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Requested Amount</p>
                                                            <p className={`text-3xl font-black italic tracking-tighter ${isDeposit ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                ₹{req.amount}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-3 w-full lg:w-auto">
                                                            <button 
                                                                onClick={async () => {
                                                                    if (confirm(`Approve this ₹${req.amount} ${req.type}?`)) {
                                                                        await approveTransaction(req.uid, req.txId);
                                                                    }
                                                                }}
                                                                className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-emerald-600 text-black font-black uppercase tracking-wider text-[11px] hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-950/50"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button 
                                                                onClick={async () => {
                                                                    if (confirm(`Reject this ₹${req.amount} ${req.type}?`)) {
                                                                        await rejectTransaction(req.uid, req.txId);
                                                                    }
                                                                }}
                                                                className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-red-600 text-white font-black uppercase tracking-wider text-[11px] hover:bg-red-500 active:scale-95 transition-all shadow-lg shadow-red-950/50"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'GIFTS' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-center mb-12">
                                <div>
                                    <h2 className="text-4xl font-black italic gold-text mb-2 uppercase">GIFT MACHINE</h2>
                                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Generate player rewards</p>
                                </div>
                                <button onClick={() => setShowGiftModal(true)} className="p-6 bg-yellow-500 text-black rounded-[2rem] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl hover:scale-105 transition-all">
                                    <Plus /> Create Gift
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {giftCodes.map((gift, index) => (
                                    <div key={`${gift.code}-${index}`} className="bg-[#111827] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
                                                <Gift className="text-yellow-500" />
                                            </div>
                                            <p className="text-2xl font-black italic gold-text tracking-widest uppercase">{gift.code}</p>
                                        </div>
                                        
                                        <div className="space-y-4 mb-8">
                                            <div className="flex justify-between">
                                                <span className="text-xs font-bold text-slate-500 uppercase">Amount</span>
                                                <span className="text-white font-black italic font-mono text-xl">₹{gift.amount}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs font-bold text-slate-500 uppercase">Usage</span>
                                                <span className="text-white font-black">{gift.usedCount} / {gift.limit}</span>
                                            </div>
                                            <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/5">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]" 
                                                    style={{ width: `${(gift.usedCount / (gift.limit || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>

                                        <button 
                                            onClick={async () => {
                                                if (window.confirm("Delete this gift code?")) {
                                                    const ok = await adminDeleteGiftCode(gift.code);
                                                    if (ok) {
                                                        alert("Gift code deleted successfully");
                                                        adminGetAllGiftCodes(setGiftCodes);
                                                    }
                                                }
                                            }}
                                            className="w-full py-4 bg-red-600/10 text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-red-500/10 group-hover:bg-red-600 group-hover:text-white transition-all"
                                        >
                                            Revoke Code
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'LIVE' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="mb-12">
                            <h2 className="text-4xl font-black italic gold-text mb-2 uppercase">LIVE MANIPULATION ENGINE</h2>
                            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Force next live multiplayer outcomes</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* WinGo Card */}
                            <div className="bg-[#1e293b] rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-pink-500/20 rounded-2xl flex items-center justify-center border border-pink-500/30">
                                            <Activity className="text-pink-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black italic">WinGo 1-Min</h3>
                                            <p className="text-[10px] text-pink-400/80 font-black tracking-widest uppercase">Active Level: {liveOverrides['wingo'] ? `FORCED ${JSON.stringify(liveOverrides['wingo']?.value || liveOverrides['wingo'])}` : 'RNG AUTO'}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-6">Force the exact number, color, or size for the next round draw.</p>
                                    
                                    <div className="grid grid-cols-5 gap-3 mb-4">
                                        {[0,1,2,3,4,5,6,7,8,9].map(n => (
                                            <button 
                                                key={n}
                                                onClick={() => adminSetLiveOverride('wingo', { value: n, type: 'NUMBER' })}
                                                className={`p-3.5 rounded-2xl font-black text-lg transition-all ${liveOverrides['wingo']?.value === n ? 'bg-pink-600 text-white scale-110 shadow-lg shadow-pink-600/30' : 'bg-black/40 text-slate-500 border border-white/5 hover:border-pink-500/50'}`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <button 
                                            onClick={() => adminSetLiveOverride('wingo', { value: 'Big', type: 'SIZE' })}
                                            className={`py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${liveOverrides['wingo']?.value === 'Big' ? 'bg-yellow-600 text-white shadow-lg' : 'bg-black/40 text-slate-500 border border-white/5'}`}
                                        >
                                            Force Big
                                        </button>
                                        <button 
                                            onClick={() => adminSetLiveOverride('wingo', { value: 'Small', type: 'SIZE' })}
                                            className={`py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${liveOverrides['wingo']?.value === 'Small' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-black/40 text-slate-500 border border-white/5'}`}
                                        >
                                            Force Small
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        <button onClick={() => adminSetLiveOverride('wingo', { value: 'Red', type: 'COLOR' })} className={`py-3 rounded-2xl font-black uppercase text-[10px] transition-all ${liveOverrides['wingo']?.value === 'Red' ? 'bg-red-600 text-white shadow-md' : 'bg-black/20 text-red-500/50 border border-red-500/10'}`}>Red</button>
                                        <button onClick={() => adminSetLiveOverride('wingo', { value: 'Green', type: 'COLOR' })} className={`py-3 rounded-2xl font-black uppercase text-[10px] transition-all ${liveOverrides['wingo']?.value === 'Green' ? 'bg-green-600 text-white shadow-md' : 'bg-black/20 text-green-500/50 border border-green-500/10'}`}>Green</button>
                                        <button onClick={() => adminSetLiveOverride('wingo', { value: 'Violet', type: 'COLOR' })} className={`py-3 rounded-2xl font-black uppercase text-[10px] transition-all ${liveOverrides['wingo']?.value === 'Violet' ? 'bg-purple-600 text-white shadow-md' : 'bg-black/20 text-purple-500/50 border border-purple-500/10'}`}>Violet</button>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => adminClearLiveOverride('wingo')}
                                    className="w-full py-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition-all border border-white/5"
                                >
                                    Release System Control
                                </button>
                            </div>

                            {/* Aviator Card */}
                            <div className="bg-[#1e293b] rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                                            <Plane className="text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black italic">Aviator Master</h3>
                                            <p className="text-[10px] text-blue-400/80 font-black tracking-widest uppercase">Active Level: {liveOverrides['aviator'] ? `FORCED ${liveOverrides['aviator']}x` : 'RNG AUTO'}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-6">Set the exact multiplier for the next flight (e.g., 1.05 or 50.0).</p>
                                    <div className="flex gap-4 mb-6">
                                        <input 
                                            type="number" 
                                            id="aviator-mult"
                                            placeholder="Multiplier (x)"
                                            className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-5 text-white font-black outline-none focus:border-blue-500/50"
                                        />
                                        <button 
                                            onClick={() => {
                                                const val = (document.getElementById('aviator-mult') as HTMLInputElement).value;
                                                if (val) adminSetLiveOverride('aviator', parseFloat(val));
                                            }}
                                            className="bg-blue-600 text-white px-8 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                                        >
                                            Set
                                        </button>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => adminClearLiveOverride('aviator')}
                                    className="w-full py-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition-all border border-white/5"
                                >
                                    Clear Aviator Override
                                </button>
                            </div>

                            {/* Seven Up Down Card */}
                            <div className="bg-[#1e293b] rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                                            <Target className="text-emerald-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black italic">7 Up Down</h3>
                                            <p className="text-[10px] text-emerald-400/80 font-black tracking-widest uppercase">Active Level: {liveOverrides['seven_up_down'] || 'RNG AUTO'}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-6">Force the next outcome to fall on Down (2-6), Lucky 7 (TIE), or Up (8-12).</p>
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {['DOWN', 'SEVEN', 'UP'].map(opt => (
                                            <button 
                                                key={opt}
                                                onClick={() => adminSetLiveOverride('seven_up_down', opt)}
                                                className={`py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${liveOverrides['seven_up_down'] === opt ? 'bg-emerald-600 text-white scale-105 shadow-lg' : 'bg-black/40 text-slate-500 border border-white/5 hover:border-emerald-500/50'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => adminClearLiveOverride('seven_up_down')}
                                    className="w-full py-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition-all border border-white/5"
                                >
                                    Clear 7 Up Down Override
                                </button>
                            </div>

                            {/* Dice Duel Card */}
                            <div className="bg-[#1e293b] rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
                                            <RefreshCw className="text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black italic">Dice Duel</h3>
                                            <p className="text-[10px] text-purple-400/80 font-black tracking-widest uppercase">Active Level: {liveOverrides['dice_duel'] || 'RNG AUTO'}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-6">Force the next outcome to fall on Small (2-6), Tie (7), or Big (8-12).</p>
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {['SMALL', 'TIE', 'BIG'].map(opt => (
                                            <button 
                                                key={opt}
                                                onClick={() => adminSetLiveOverride('dice_duel', opt)}
                                                className={`py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${liveOverrides['dice_duel'] === opt ? 'bg-purple-600 text-white scale-105 shadow-lg' : 'bg-black/40 text-slate-500 border border-white/5 hover:border-purple-500/50'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => adminClearLiveOverride('dice_duel')}
                                    className="w-full py-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition-all border border-white/5"
                                >
                                    Clear Dice Duel Override
                                </button>
                            </div>

                            {/* Dragon Tiger Card */}
                            <div className="bg-[#1e293b] rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center border border-orange-500/30">
                                            <Gamepad2 className="text-orange-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black italic">Dragon Tiger</h3>
                                            <p className="text-[10px] text-orange-400/80 font-black tracking-widest uppercase">Active Level: {liveOverrides['dragon_tiger'] || 'RNG AUTO'}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-6">Force the next outcome to land on Dragon, Tiger, or a Tie card draw.</p>
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {[
                                            { id: 'D', label: 'Dragon' },
                                            { id: 'T', label: 'Tiger' },
                                            { id: 'Tie', label: 'Tie' }
                                        ].map(opt => (
                                            <button 
                                                key={opt.id}
                                                onClick={() => adminSetLiveOverride('dragon_tiger', opt.id)}
                                                className={`py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${liveOverrides['dragon_tiger'] === opt.id ? 'bg-orange-600 text-white scale-105 shadow-lg' : 'bg-black/40 text-slate-500 border border-white/5 hover:border-orange-500/50'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => adminClearLiveOverride('dragon_tiger')}
                                    className="w-full py-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition-all border border-white/5"
                                >
                                    Clear Dragon Tiger Override
                                </button>
                            </div>

                            {/* Andar Bahar Card */}
                            <div className="bg-[#1e293b] rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/30">
                                            <ShieldAlert className="text-red-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black italic">Andar Bahar</h3>
                                            <p className="text-[10px] text-red-400/80 font-black tracking-widest uppercase">Active Level: {liveOverrides['andar_bahar'] || 'RNG AUTO'}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-6">Force the next outcome to fall on Andar, Bahar, or Tie.</p>
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {[
                                            { id: 'A', label: 'Andar' },
                                            { id: 'B', label: 'Bahar' },
                                            { id: 'Tie', label: 'Tie' }
                                        ].map(opt => (
                                            <button 
                                                key={opt.id}
                                                onClick={() => adminSetLiveOverride('andar_bahar', opt.id)}
                                                className={`py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${liveOverrides['andar_bahar'] === opt.id ? 'bg-red-600 text-white scale-105 shadow-lg' : 'bg-black/40 text-slate-500 border border-white/5 hover:border-red-500/50'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => adminClearLiveOverride('andar_bahar')}
                                    className="w-full py-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition-all border border-white/5"
                                >
                                    Clear Andar Bahar Override
                                </button>
                            </div>

                            {/* Roulette Card */}
                            <div className="bg-[#1e293b] rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center border border-green-500/30">
                                            <RefreshCw className="text-green-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black italic">Roulette Wheel</h3>
                                            <p className="text-[10px] text-green-400/80 font-black tracking-widest uppercase">Active Level: {liveOverrides['roulette'] || 'RNG AUTO'}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-6">Force the next roulette spin result on Red, Black, or Green.</p>
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {['RED', 'BLACK', 'GREEN'].map(opt => (
                                            <button 
                                                key={opt}
                                                onClick={() => adminSetLiveOverride('roulette', opt)}
                                                className={`py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${liveOverrides['roulette'] === opt ? 'bg-green-600 text-white scale-105 shadow-lg' : 'bg-black/40 text-slate-500 border border-white/5 hover:border-green-500/50'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => adminClearLiveOverride('roulette')}
                                    className="w-full py-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition-all border border-white/5"
                                >
                                    Clear Roulette Override
                                </button>
                            </div>

                            {/* Cricket Hero Card */}
                            <div className="bg-[#1e293b] rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center border border-yellow-500/30">
                                            <Trophy className="text-yellow-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black italic">Cricket Hero</h3>
                                            <p className="text-[10px] text-yellow-400/80 font-black tracking-widest uppercase">Active Level: {liveOverrides['cricket'] || 'RNG AUTO'}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs mb-6">Force the next outcome to a specific run value (1, 2, 3, 4, 6) or Wicket.</p>
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {['1', '2', '3', '4', '6', 'Wicket'].map(opt => (
                                            <button 
                                                key={opt}
                                                onClick={() => adminSetLiveOverride('cricket', opt)}
                                                className={`py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${liveOverrides['cricket'] === opt ? 'bg-yellow-600 text-black scale-105 shadow-lg' : 'bg-black/40 text-slate-500 border border-white/5 hover:border-yellow-500/50'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => adminClearLiveOverride('cricket')}
                                    className="w-full py-4 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition-all border border-white/5"
                                >
                                    Clear Cricket Override
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'DASHBOARD' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatCard label="Total Users" value={users.length} icon={Users} color="text-blue-500" />
                                <StatCard label="Circulating Supply" value={`₹${totalBalance.toLocaleString()}`} icon={Wallet} color="text-green-500" />
                                <StatCard label="All Time Volume" value={`₹${totalBets.toLocaleString()}`} icon={BarChart3} color="text-orange-500" />
                                <StatCard label="Net Revenue" value={`₹${(totalDeposit - totalBalance).toLocaleString()}`} icon={TrendingUp} color="text-emerald-500" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-[#0a0f1d] border border-white/5 rounded-[2.5rem] p-10 flex flex-col gap-6 shadow-2xl">
                                    <div className="flex items-center gap-4">
                                        <Target className="text-red-500" size={32} />
                                        <h3 className="text-2xl font-black italic">Platform Win Rate</h3>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <p className="text-6xl font-black italic">{settings?.globalWinProbability || 0}%</p>
                                        <p className="text-slate-500 font-bold mb-2">PROBABILITY</p>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" max="100" 
                                        value={settings?.globalWinProbability || 0}
                                        onChange={(e) => adminUpdateSettings({ globalWinProbability: Number(e.target.value) })}
                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                    />
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Lowering this value makes games harder for users. Set to 0% to force nearly all outcomes to be losses globally.
                                    </p>
                                </div>

                                <div className="bg-[#0a0f1d] border border-white/5 rounded-[2.5rem] p-10 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
                                     <div className="flex items-center gap-4">
                                        <ShieldAlert className="text-yellow-500" size={32} />
                                        <h3 className="text-2xl font-black italic">Security Status</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                                            <span className="text-sm font-bold uppercase">Blocked Accounts</span>
                                            <span className="font-mono text-red-500 font-black">{users.filter(u => u.isBlocked).length}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                                            <span className="text-sm font-bold uppercase">Active Gift Codes</span>
                                            <span className="font-mono text-yellow-500 font-black">{giftCodes.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                                            <span className="text-sm font-bold uppercase">Pending Withdrawals</span>
                                            <span className="font-mono text-blue-500 font-black">0</span>
                                        </div>
                                    </div>
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
                                    placeholder="Search users..." 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-transparent flex-1 py-4 text-white font-bold outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {filteredUsers.map(user => (
                                    <div key={user.uid} className={`bg-[#0a0f1d] rounded-[2.5rem] p-8 border-l-8 transition-all hover:border-white/20 ${user.isBlocked ? 'border-red-600 opacity-70' : 'border-blue-500'}`}>
                                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                            <div onClick={() => setSelectedUserId(user.uid)} className="flex gap-6 items-center cursor-pointer">
                                                <img src={user.avatar} className="w-16 h-16 rounded-full border-2 border-white/10" />
                                                <div>
                                                    <h4 className="text-xl font-black flex items-center gap-2">
                                                        @{user.username}
                                                        {user.isBlocked && <Ban className="text-red-500" size={16} />}
                                                    </h4>
                                                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">{user.phone} • VIP LV.{user.vipLevel}</p>
                                                    <p className="text-[10px] text-zinc-600 font-mono mt-1">{user.uid}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col items-end">
                                                <p className="text-[10px] text-slate-600 font-black uppercase mb-1">Balance</p>
                                                <p className="text-3xl font-black gold-text italic">₹{user.balance?.toFixed(2)}</p>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full lg:w-auto">
                                                <button onClick={() => setSelectedUserId(user.uid)} className="p-3 bg-white/5 text-white rounded-xl border border-white/10 text-[10px] font-black uppercase hover:bg-white/10">Logs</button>
                                                <button onClick={() => handleMoneyAction(user.uid)} className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl border border-indigo-500/20 text-[10px] font-black uppercase hover:bg-indigo-500 hover:text-black">Modify ₹</button>
                                                <button 
                                                    onClick={() => {
                                                        const choice = prompt("Force outcome? (Type: win, loss, or clear)");
                                                        if (choice === 'win') handleOutcomeChange(user.uid, 'WIN');
                                                        else if (choice === 'loss') handleOutcomeChange(user.uid, 'LOSS');
                                                        else if (choice === 'clear') handleOutcomeChange(user.uid, null);
                                                    }} 
                                                    className={`p-3 rounded-xl border text-[10px] font-black uppercase ${user.forcedOutcome ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-slate-800 text-slate-400 border-white/5'}`}
                                                >
                                                    {user.forcedOutcome ? `Target: ${user.forcedOutcome}` : 'Set Fate'}
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (user.isAdmin || user.email === 'infinityfilms466@gmail.com' || user.uid === 'ADMIN_9339409219') {
                                                            alert("Admin cannot be blocked!");
                                                            return;
                                                        }
                                                        adminBlockUser(user.uid, !user.isBlocked);
                                                    }} 
                                                    className={`p-3 rounded-xl border text-[10px] font-black uppercase ${
                                                        (user.isAdmin || user.email === 'infinityfilms466@gmail.com' || user.uid === 'ADMIN_9339409219')
                                                            ? 'bg-slate-800 text-slate-600 border-white/5 cursor-not-allowed opacity-50' 
                                                            : user.isBlocked 
                                                                ? 'bg-red-600 text-white border-red-600' 
                                                                : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                                    }`}
                                                >
                                                    {(user.isAdmin || user.email === 'infinityfilms466@gmail.com' || user.uid === 'ADMIN_9339409219') ? 'Admin (Locked)' : user.isBlocked ? 'Released' : 'Block User'}
                                                </button>
                                                <button onClick={() => window.confirm("Purge user?") && adminDeleteUser(user.uid)} className="p-3 bg-slate-900 text-slate-500 rounded-xl border border-white/5 text-[10px] font-black uppercase col-span-2 md:col-span-1">Delete</button>
                                            </div>
                                        </div>

                                        {selectedUserId === user.uid && (
                                            <div className="mt-8 pt-8 border-t border-white/5 animate-in slide-in-from-top fade-in">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h5 className="font-black italic text-slate-400 uppercase tracking-widest text-sm flex items-center gap-2">
                                                        <Activity size={16} /> Transaction Ledger
                                                    </h5>
                                                    <button onClick={() => setSelectedUserId(null)} className="text-slate-500 text-xs font-black uppercase">Close Ledger</button>
                                                </div>
                                                <div className="space-y-3 max-h-60 overflow-y-auto pr-4 custom-scrollbar">
                                                    {selectedUserTransactions.length === 0 && <p className="text-center py-10 text-slate-600 font-bold uppercase text-[10px]">No ledger entries found</p>}
                                                    {selectedUserTransactions.map(tx => (
                                                        <div key={tx.id} className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5">
                                                            <div>
                                                                <p className={`text-[10px] font-black uppercase ${tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'GIFT' ? 'text-green-500' : 'text-red-500'}`}>{tx.type}</p>
                                                                <p className="text-xs text-slate-500 font-bold">{tx.desc}</p>
                                                                <p className="text-[10px] text-slate-700 font-mono italic">{tx.date}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`text-lg font-black italic ${tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'GIFT' ? 'text-green-500' : 'text-red-500'}`}>
                                                                    {tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'GIFT' ? '+' : '-'}₹{tx.amount}
                                                                </p>
                                                                <p className="text-[8px] font-black text-slate-600 uppercase">{tx.status}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'LICENSES' && (
                        <div className="space-y-8">
                             <button onClick={() => setShowLicenseModal(true)} className="w-full py-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black uppercase tracking-[0.4em] rounded-[2.5rem] flex items-center justify-center gap-4 shadow-2xl hover:scale-[1.01] transition-all border-t-4 border-white/20">
                                <Key size={32} /> GENERATE ACTIVATION KEY
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {licenses.map(lic => (
                                    <div key={lic.id} className={`bg-[#0a0f1d] rounded-[2rem] p-8 border border-white/5 shadow-xl relative overflow-hidden ${lic.isUsed ? 'opacity-50' : ''}`}>
                                        {!lic.isUsed && <div className="absolute top-0 right-0 p-4"><div className="w-2 h-2 bg-green-500 rounded-full animate-ping" /></div>}
                                        <h4 className="text-2xl font-black mono text-yellow-500 mb-4">{lic.id}</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-xs font-bold uppercase text-slate-500">
                                                <span>Duration:</span>
                                                <span className="text-white">{lic.days} Days</span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold uppercase text-slate-500">
                                                <span>Balance:</span>
                                                <span className="text-white">₹{lic.balance}</span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold uppercase text-slate-500">
                                                <span>Status:</span>
                                                <span className={lic.isUsed ? 'text-red-500' : 'text-green-500'}>{lic.isUsed ? 'USED' : 'ACTIVE'}</span>
                                            </div>
                                            {lic.usedBy && (
                                                <div className="text-[10px] text-zinc-600 mt-4 truncate">Used By: {lic.usedBy}</div>
                                            )}
                                        </div>
                                        <button onClick={() => adminDeleteActivationCode(lic.id)} className="mt-6 w-full p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/10 text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Revoke Key</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'GAMES' && (
                        <div className="space-y-8">
                            <div className="bg-yellow-500/10 p-8 rounded-[2.5rem] border border-yellow-500/20 flex gap-6 items-center mb-10">
                                <AlertTriangle className="text-yellow-500 shrink-0" size={32} />
                                <p className="text-sm font-bold text-yellow-500 leading-relaxed uppercase">
                                    Global risk management settings affect all games including WinGo, Aviator, and Slots. Individual user "Fate" settings override global probability.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-[#0a0f1d] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
                                    <h3 className="text-xl font-black italic uppercase flex items-center gap-3"><Settings size={20} /> Withdrawal Policy</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Min Withdrawal (₹)</label>
                                            <input 
                                                type="number" 
                                                value={settings?.minWithdrawal || 500} 
                                                onChange={(e) => adminUpdateSettings({ minWithdrawal: Number(e.target.value) })}
                                                className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white font-bold mt-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Max Withdrawal (₹)</label>
                                            <input 
                                                type="number" 
                                                value={settings?.maxWithdrawal || 50000} 
                                                onChange={(e) => adminUpdateSettings({ maxWithdrawal: Number(e.target.value) })}
                                                className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white font-bold mt-2"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0a0f1d] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
                                    <h3 className="text-xl font-black italic uppercase flex items-center gap-3"><Eye size={20} /> App Appearance</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase ml-2">App Lobby Banner Image URL</label>
                                            <input 
                                                type="text" 
                                                placeholder="https://images.unsplash.com/photo-..."
                                                value={settings?.bannerImage || ''} 
                                                onChange={(e) => adminUpdateSettings({ bannerImage: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white font-bold mt-2 text-xs"
                                            />
                                        </div>
                                        {settings?.bannerImage && (
                                            <div className="mt-4">
                                                <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Live Preview:</p>
                                                <div className="h-24 rounded-xl overflow-hidden bg-zinc-950 border border-white/10 relative">
                                                    <img src={settings.bannerImage} className="w-full h-full object-cover opacity-60" alt="Banner Preview" referrerPolicy="no-referrer" />
                                                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex items-center p-4">
                                                        <span className="text-xs font-black italic text-white tracking-widest uppercase">Preview Mode</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-[#0a0f1d] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6 flex flex-col">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-black italic uppercase flex items-center gap-3"><Power size={20} /> Game Algorithms ({[
                                            { id: 'GAME_LUDO', label: 'Ludo Arena' },
                                            { id: 'GAME_VORTEX', label: 'VORTEX' },
                                            { id: 'GAME_MINES', label: 'Mines' },
                                            { id: 'GAME_CHICKEN_ROAD', label: 'Dog Road' },
                                            { id: 'GAME_7UP_DOWN', label: '7 Up Down' },
                                            { id: 'GAME_DRAGON_TIGER', label: 'Dragon Tiger' },
                                            { id: 'GAME_ROULETTE', label: 'Roulette' },
                                            { id: 'GAME_LUCKY_WHEEL', label: 'Lucky Wheel' },
                                            { id: 'GAME_CRICKET', label: 'Cricket Hero' },
                                            { id: 'GAME_TOWER', label: 'Tower Climb' },
                                            { id: 'GAME_ANDAR_BAHAR', label: 'Andar Bahar' },
                                            { id: 'GAME_AVIATOR', label: 'Aviator' },
                                            { id: 'GAME_WINGO', label: 'WinGo' },
                                            { id: 'GAME_PLINKO', label: 'Plinko' },
                                            { id: 'GAME_LIMBO', label: 'Limbo' },
                                            { id: 'GAME_FRUIT_SLOT', label: 'Fruit Slot' },
                                            { id: 'GAME_EGYPT_SLOT', label: 'Egypt Slot' },
                                            { id: 'GAME_HEAD_TAILS', label: 'Head & Tails' },
                                            { id: 'GAME_KENO', label: 'Keno Elite' },
                                            { id: 'GAME_DICE', label: 'Dice Duel' },
                                            { id: 'GAME_HILO', label: 'Hi-Lo Elite' },
                                            { id: 'GAME_PUMP', label: 'Pump Up' },
                                            { id: 'GAME_MOLES', label: 'Rat Hunter' },
                                            { id: 'GAME_SCRATCH_CARD', label: 'Scratch Card' }
                                        ].length} Arenas)</h3>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                                        {[
                                            { id: 'GAME_LUDO', label: 'Ludo Arena' },
                                            { id: 'GAME_VORTEX', label: 'VORTEX' },
                                            { id: 'GAME_MINES', label: 'Mines' },
                                            { id: 'GAME_CHICKEN_ROAD', label: 'Dog Road' },
                                            { id: 'GAME_7UP_DOWN', label: '7 Up Down' },
                                            { id: 'GAME_DRAGON_TIGER', label: 'Dragon Tiger' },
                                            { id: 'GAME_ROULETTE', label: 'Roulette' },
                                            { id: 'GAME_LUCKY_WHEEL', label: 'Lucky Wheel' },
                                            { id: 'GAME_CRICKET', label: 'Cricket Hero' },
                                            { id: 'GAME_TOWER', label: 'Tower Climb' },
                                            { id: 'GAME_ANDAR_BAHAR', label: 'Andar Bahar' },
                                            { id: 'GAME_AVIATOR', label: 'Aviator' },
                                            { id: 'GAME_WINGO', label: 'WinGo' },
                                            { id: 'GAME_PLINKO', label: 'Plinko' },
                                            { id: 'GAME_LIMBO', label: 'Limbo' },
                                            { id: 'GAME_FRUIT_SLOT', label: 'Fruit Slot' },
                                            { id: 'GAME_EGYPT_SLOT', label: 'Egypt Slot' },
                                            { id: 'GAME_HEAD_TAILS', label: 'Head & Tails' },
                                            { id: 'GAME_KENO', label: 'Keno Elite' },
                                            { id: 'GAME_DICE', label: 'Dice Duel' },
                                            { id: 'GAME_HILO', label: 'Hi-Lo Elite' },
                                            { id: 'GAME_PUMP', label: 'Pump Up' },
                                            { id: 'GAME_MOLES', label: 'Rat Hunter' },
                                            { id: 'GAME_SCRATCH_CARD', label: 'Scratch Card' }
                                        ].map(game => {
                                            const isOffline = settings?.disabledGames?.[game.id] === true;
                                            return (
                                                <div key={game.id} className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col gap-3 transition-all hover:border-white/10">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">{game.label}</span>
                                                            <span className={`text-[9px] font-bold mt-0.5 tracking-widest ${isOffline ? 'text-red-500' : 'text-green-500'}`}>
                                                                {isOffline ? '● SERVER OFF' : '● SERVER LIVE'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button 
                                                                onClick={() => {
                                                                    const disabled = { ...settings?.disabledGames };
                                                                    disabled[game.id] = !isOffline;
                                                                    adminUpdateSettings({ disabledGames: disabled });
                                                                }}
                                                                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${isOffline ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-red-500/10 hover:text-red-500'}`}
                                                            >
                                                                {isOffline ? 'Turn ON' : 'Turn OFF'}
                                                            </button>
                                                            <span className="text-xs font-mono font-black text-blue-400">
                                                                {settings?.gameProbabilities?.[game.id] ?? settings?.globalWinProbability ?? 40}% Win
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <input 
                                                        type="range" min="0" max="100" 
                                                        value={settings?.gameProbabilities?.[game.id] ?? settings?.globalWinProbability ?? 40}
                                                        onChange={(e) => {
                                                            const probs = { ...settings?.gameProbabilities };
                                                            probs[game.id] = Number(e.target.value);
                                                            adminUpdateSettings({ gameProbabilities: probs });
                                                        }}
                                                        className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            {showLicenseModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
                    <div className="bg-[#0a0f1d] w-full max-w-lg rounded-[3rem] p-12 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)]">
                         <div className="flex justify-between items-center mb-12">
                             <h3 className="text-3xl font-black italic gold-text uppercase">License Creator</h3>
                             <button onClick={() => setShowLicenseModal(false)} className="p-4 bg-white/5 rounded-full"><X/></button>
                         </div>
                         
                         <div className="space-y-8 mb-12">
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 font-black uppercase ml-2">Validity (Days)</label>
                                <input type="number" value={newLicense.days} onChange={e => setNewLicense({...newLicense, days: Number(e.target.value)})} className="w-full bg-black border-2 border-white/10 rounded-2xl p-5 text-white font-black" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 font-black uppercase ml-2">Appended Balance (₹)</label>
                                <input type="number" value={newLicense.balance} onChange={e => setNewLicense({...newLicense, balance: Number(e.target.value)})} className="w-full bg-black border-2 border-white/10 rounded-2xl p-5 text-white font-black" />
                            </div>
                         </div>

                         <button onClick={handleLicenseCreate} className="w-full py-8 rounded-[2rem] bg-blue-600 text-white font-black uppercase tracking-[0.5em] text-xl shadow-2xl transition-all">GENERATE KEY</button>
                    </div>
                </div>
            )}

            {showGiftModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
                    <div className="bg-[#0f172a] w-full max-w-lg rounded-[3rem] p-10 border border-yellow-500/20 shadow-[0_0_100px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto no-scrollbar">
                         <div className="flex justify-between items-center mb-8">
                             <h3 className="text-3xl font-black italic gold-text uppercase">GIFT FORGE</h3>
                             <button onClick={() => setShowGiftModal(false)} className="p-4 bg-white/5 rounded-full"><X/></button>
                         </div>
                         
                         <div className="space-y-6 mb-8">
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 font-black uppercase ml-2">Unique Code</label>
                                <input type="text" value={newGift.code} onChange={e => setNewGift({...newGift, code: e.target.value.toUpperCase()})} placeholder="e.g. MAFIA100" className="w-full bg-black border-2 border-white/10 rounded-2xl p-4 text-white font-black uppercase outline-none focus:border-yellow-500/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 font-black uppercase ml-2">Value (₹)</label>
                                    <input type="number" value={newGift.amount} onChange={e => setNewGift({...newGift, amount: Number(e.target.value)})} className="w-full bg-black border-2 border-white/10 rounded-2xl p-4 text-white font-black outline-none focus:border-yellow-500/50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 font-black uppercase ml-2">Max Uses</label>
                                    <input type="number" value={newGift.limit} onChange={e => setNewGift({...newGift, limit: Number(e.target.value)})} className="w-full bg-black border-2 border-white/10 rounded-2xl p-4 text-white font-black outline-none focus:border-yellow-500/50" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 font-black uppercase ml-2">Min VIP Level</label>
                                    <input type="number" value={newGift.minVip} onChange={e => setNewGift({...newGift, minVip: Number(e.target.value)})} className="w-full bg-black border-2 border-white/10 rounded-2xl p-4 text-white font-black outline-none focus:border-yellow-500/50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 font-black uppercase ml-2">Expiry Date</label>
                                    <input type="date" value={newGift.expiryDate} onChange={e => setNewGift({...newGift, expiryDate: e.target.value})} className="w-full bg-black border-2 border-white/10 rounded-2xl p-4 text-white font-black outline-none focus:border-yellow-500/50 text-slate-300" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 font-black uppercase ml-2">Target Username or UID (Optional for Personal Gift)</label>
                                <input type="text" value={newGift.personalUser} onChange={e => setNewGift({...newGift, personalUser: e.target.value})} placeholder="e.g. user_uid or username" className="w-full bg-black border-2 border-white/10 rounded-2xl p-4 text-white font-black outline-none focus:border-yellow-500/50" />
                            </div>
                         </div>
 
                         <button 
                            onClick={async () => {
                                if (!newGift.code) return;
                                const formattedGift = {
                                    code: newGift.code.trim().toUpperCase(),
                                    amount: Number(newGift.amount),
                                    limit: Number(newGift.limit),
                                    minVip: Number(newGift.minVip),
                                    usedCount: 0,
                                    createdAt: Date.now(),
                                    expiryDate: newGift.expiryDate ? new Date(newGift.expiryDate).getTime() : undefined,
                                    personalUser: newGift.personalUser.trim() || undefined
                                };
                                const success = await adminCreateGiftCode(formattedGift);
                                if (success) {
                                    alert("Gift Code Created");
                                    setShowGiftModal(false);
                                    adminGetAllGiftCodes(setGiftCodes);
                                }
                            }}
                            className="w-full py-6 rounded-[2rem] bg-yellow-500 text-black font-black uppercase tracking-[0.5em] text-lg shadow-2xl transition-all"
                         >
                            FORGE CODE
                         </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const SideNavBtn = ({ icon: Icon, label, active, onClick, badge }: any) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all group ${active ? 'bg-blue-600 text-white shadow-xl border-t border-white/20' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
    >
        <div className="flex items-center gap-4">
            <Icon size={22} className={active ? 'text-white' : 'text-slate-600 group-hover:text-blue-400'} />
            <span className="font-black text-[11px] uppercase tracking-[0.2em]">{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
            <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-md shadow-red-900/50">
                {badge}
            </span>
        )}
    </button>
);

const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-[#0a0f1d] p-8 rounded-[2rem] border border-white/5 shadow-xl">
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
