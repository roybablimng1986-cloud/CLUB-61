import React, { useState } from 'react';
import { UserProfile, View } from '../types';
import { Settings, Copy, Wallet, ArrowUpRight, ArrowDownLeft, ChevronRight, BarChart2, Gamepad2, Gift, RefreshCw, X, History, HelpCircle, LogOut, Shield, Crown, CheckCircle2, Phone, MessageCircle, Share2 } from 'lucide-react';
import { transactions, gameHistory, logout } from '../services/mockFirebase';

interface ProfileProps {
  user: UserProfile;
  setView: (view: View) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, setView }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<'GAME' | 'TRANSACTION' | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleRefresh = () => {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
  };

  const financialTransactions = transactions.filter(tx => 
      ['DEPOSIT', 'WITHDRAW', 'GIFT', 'COMMISSION', 'BONUS'].includes(tx.type)
  );

  const nextThreshold = user.totalDeposit < 500 ? 500 : user.totalDeposit < 2000 ? 2000 : 50000;
  const progressPercent = Math.min(100, (user.totalDeposit / nextThreshold) * 100);

  return (
    <div className="min-h-screen bg-[#0f172a] pb-24 font-sans text-white animate-in fade-in duration-500">
      {showToast && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-black/90 text-white px-8 py-3 rounded-full font-black text-sm flex items-center gap-3 animate-in zoom-in border border-white/20">
              <CheckCircle2 className="text-green-500"/> Copied
          </div>
      )}

      <div className="bg-gradient-to-b from-blue-700 to-indigo-900 p-8 pb-28 rounded-b-[4rem] shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://img.freepik.com/free-vector/gradient-technological-background_23-2148884155.jpg')] bg-cover opacity-20 mix-blend-overlay"></div>
        
        <div className="relative z-10 flex items-center justify-between mb-10">
           <div className="flex items-center gap-5">
                <div className="relative">
                    <img src={user.avatar} className="w-20 h-20 rounded-full border-4 border-white/20 shadow-2xl" alt="P" />
                    <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1.5 border-2 border-slate-900 shadow-lg">
                        <Crown size={14} className="text-slate-900 fill-slate-900" />
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white italic tracking-tighter">{user.username}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-blue-100 text-[10px] font-black bg-black/30 px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest">UID: {user.uid.slice(-8)}</span>
                        <Copy size={12} className="text-blue-300 cursor-pointer" onClick={() => handleCopy(user.uid)} />
                    </div>
                </div>
           </div>
           <button onClick={() => setView('SAFETY')} className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 text-white"><Settings size={22}/></button>
        </div>

        <div className="relative z-10 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
             <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        Total Balance <RefreshCw size={12} className={`cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`} onClick={handleRefresh}/>
                    </p>
                    <h1 className="text-5xl font-black tracking-tighter text-white">₹{user.balance.toFixed(2)}</h1>
                </div>
                <div className="bg-yellow-500 p-4 rounded-3xl shadow-xl shadow-yellow-500/20">
                    <Wallet size={28} className="text-slate-900" />
                </div>
            </div>
            <div className="flex justify-between gap-4 mt-8">
                 <button onClick={() => setView('WITHDRAW')} className="flex-1 bg-white/10 hover:bg-white/20 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                     <ArrowDownLeft size={16} className="text-red-400"/> Withdraw
                 </button>
                 <button onClick={() => setView('DEPOSIT')} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
                     <ArrowUpRight size={16}/> Deposit
                 </button>
            </div>
        </div>
      </div>

      <div className="px-5 -mt-12 relative z-20 space-y-5">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Crown className="text-yellow-500" size={24} />
                    <span className="text-sm font-black uppercase tracking-widest">VIP Level {user.vipLevel}</span>
                </div>
                <ChevronRight size={18} className="text-slate-600"/>
            </div>
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <p className="text-[9px] text-slate-500 mt-3 font-bold uppercase tracking-widest text-center">₹{user.totalDeposit} / ₹{nextThreshold} TO NEXT VIP</p>
        </div>

        <div className="bg-[#1e293b] rounded-[2rem] overflow-hidden border border-slate-700/50 shadow-xl">
             <MenuItem onClick={() => setShowHistoryModal('GAME')} icon={Gamepad2} label="Game History" bg="bg-purple-500/10" color="text-purple-400" />
             <div className="h-[1px] bg-slate-800 mx-10"></div>
             <MenuItem onClick={() => setShowHistoryModal('TRANSACTION')} icon={History} label="Transactions" bg="bg-blue-500/10" color="text-blue-400" />
             <div className="h-[1px] bg-slate-800 mx-10"></div>
             <MenuItem onClick={() => setView('STATISTICS')} icon={BarChart2} label="Statistics" bg="bg-green-500/10" color="text-green-400" />
        </div>

        <div className="bg-[#1e293b] rounded-[2rem] overflow-hidden border border-slate-700/50 shadow-xl">
             <MenuItem onClick={() => setView('PROMOTION')} icon={Gift} label="Gift Code" bg="bg-pink-500/10" color="text-pink-400" />
             <div className="h-[1px] bg-slate-800 mx-10"></div>
             <MenuItem onClick={() => setView('SAFETY')} icon={Shield} label="Safety Center" bg="bg-orange-500/10" color="text-orange-400" />
        </div>

        <button onClick={() => logout()} className="w-full py-5 rounded-3xl text-red-500 font-black uppercase tracking-widest bg-[#1e293b] border border-red-500/20 hover:bg-red-500/5 transition-all flex items-center justify-center gap-3 mt-4">
            <LogOut size={20}/> Log Out
        </button>
      </div>

      {showHistoryModal && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/90 backdrop-blur-md animate-in fade-in">
             <div className="w-full max-w-md bg-[#0f172a] h-[85vh] rounded-t-[3rem] flex flex-col border-t border-slate-800 animate-in slide-in-from-bottom duration-500">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#1e293b] rounded-t-[3rem]">
                    <h3 className="font-black text-sm uppercase tracking-widest text-white">{showHistoryModal === 'GAME' ? 'Game Record' : 'Transactions'}</h3>
                    <button onClick={() => setShowHistoryModal(null)} className="p-2 bg-slate-800 rounded-full text-white"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3 no-scrollbar">
                    {showHistoryModal === 'GAME' ? (
                        gameHistory.map(item => (
                             <div key={item.id} className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/50 flex justify-between items-center">
                                 <div>
                                     <div className="font-black text-white text-sm uppercase tracking-tighter">{item.game}</div>
                                     <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">{item.date}</div>
                                 </div>
                                 <div className="text-right">
                                     <div className={`font-black text-sm ${item.win > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                         {item.win > 0 ? `+₹${item.win.toFixed(2)}` : `-₹${item.amount.toFixed(2)}`}
                                     </div>
                                     {item.win > 0 && <span className="text-[9px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded uppercase">Winner</span>}
                                 </div>
                             </div>
                        ))
                    ) : (
                         financialTransactions.map(tx => (
                             <div key={tx.id} className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/50 flex justify-between items-center">
                                 <div>
                                     <div className="font-black text-white text-xs uppercase tracking-tight">{tx.desc}</div>
                                     <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">{tx.date}</div>
                                 </div>
                                 <div className="text-right">
                                     <div className="font-black text-sm text-white">₹{tx.amount.toFixed(2)}</div>
                                     <div className={`text-[9px] font-black uppercase ${tx.status === 'SUCCESS' ? 'text-green-500' : 'text-yellow-500'}`}>{tx.status}</div>
                                 </div>
                             </div>
                         )) 
                    )}
                </div>
             </div>
          </div>
      )}
    </div>
  );
};

const MenuItem = ({ icon: Icon, label, bg, color, onClick }: any) => (
    <div onClick={onClick} className="flex items-center justify-between p-5 active:bg-slate-700/50 cursor-pointer transition-colors group">
        <div className="flex items-center gap-5">
            <div className={`w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
            <div className="text-sm font-black uppercase tracking-widest text-slate-200">{label}</div>
        </div>
        <ChevronRight size={20} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
    </div>
);

export default Profile;