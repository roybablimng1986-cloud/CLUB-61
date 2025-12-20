
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
  const [showCSModal, setShowCSModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleRefresh = () => {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleLogout = () => {
      logout();
  }

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
  };
  
  const handleShareApp = () => {
      const shareData = {
          title: 'Tiranga Games',
          text: `Use my invite code ${user.inviteCode} to register and win big!`,
          url: window.location.href
      };
      if (navigator.share) {
          navigator.share(shareData).catch(console.error);
      } else {
          handleCopy(window.location.href);
          alert('Link Copied to Clipboard');
      }
  };

  const handleServiceRedirect = (type: 'TELEGRAM' | 'WHATSAPP') => {
      const number = "919339409219";
      if (type === 'TELEGRAM') {
          window.open(`https://t.me/+${number}`, '_blank');
      } else {
          window.open(`https://wa.me/${number}`, '_blank');
      }
  };

  // Filter financial transactions only
  const financialTransactions = transactions.filter(tx => 
      tx.type === 'DEPOSIT' || 
      tx.type === 'WITHDRAW' || 
      tx.type === 'GIFT' || 
      tx.type === 'COMMISSION' || 
      tx.type === 'BONUS'
  );

  // VIP Logic
  const currentDeposit = user.totalDeposit || 0;
  const getNextVipThreshold = (current: number) => {
      if (current < 500) return 500;
      if (current < 2000) return 2000;
      if (current < 50000) return 50000;
      if (current < 100000) return 100000;
      if (current < 400000) return 400000;
      return current; // Max level
  };

  const nextThreshold = getNextVipThreshold(currentDeposit);
  const progressPercent = nextThreshold > 0 ? Math.min(100, (currentDeposit / nextThreshold) * 100) : 100;

  return (
    <div className="min-h-screen bg-[#0f172a] pb-24 font-sans text-white">
      {/* Toast Notification */}
      {showToast && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 animate-in zoom-in fade-in duration-200">
              <CheckCircle2 className="text-green-500"/> Copied
          </div>
      )}

      {/* Premium Header */}
      <div className="bg-[url('https://img.freepik.com/free-vector/gradient-technological-background_23-2148884155.jpg')] bg-cover bg-center p-6 pb-24 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/80 backdrop-blur-sm"></div>
        
        {/* User Info Bar */}
        <div className="relative z-10 flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
                <div className="relative group">
                    <img src={user.avatar} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-white/20 shadow-lg group-hover:scale-105 transition-transform" />
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full p-1 border border-black shadow-md">
                        <Crown size={12} className="text-black fill-black" />
                    </div>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {user.username || user.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-blue-200 text-xs bg-black/20 px-2 py-0.5 rounded border border-white/10 font-mono">UID: {user.uid}</span>
                        <Copy size={12} className="text-blue-300 cursor-pointer hover:text-white" onClick={() => handleCopy(user.uid)} />
                    </div>
                </div>
           </div>
           <Settings onClick={() => setView('SAFETY')} className="text-blue-200 hover:text-white transition-colors cursor-pointer" />
        </div>

        {/* Wallet Card */}
        <div className="relative z-10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
             <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-blue-200 text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
                        Total Assets <RefreshCw size={12} className={`cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`} onClick={handleRefresh}/>
                    </p>
                    <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-md">₹{(user.balance || 0).toFixed(2)}</h1>
                </div>
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
                    <Wallet size={24} className="text-white" />
                </div>
            </div>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent my-4"></div>
            <div className="flex justify-between gap-4">
                 <button onClick={() => setView('WITHDRAW')} className="flex-1 bg-white/10 hover:bg-white/20 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                     <ArrowDownLeft size={16} className="text-red-400"/> Withdraw
                 </button>
                 <button onClick={() => setView('DEPOSIT')} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
                     <ArrowUpRight size={16}/> Deposit
                 </button>
            </div>
        </div>
      </div>

      {/* Menu Options */}
      <div className="px-4 -mt-10 relative z-20 space-y-4">
        {/* VIP Banner with Progress */}
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-xl p-4 shadow-lg mb-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full blur-2xl -mr-4 -mt-4 group-hover:bg-white/20 transition-all"></div>
            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-3">
                    <Crown className="text-yellow-200" size={24} />
                    <div>
                        <p className="text-sm font-bold text-white">VIP Level {user.vipLevel || 0}</p>
                        <p className="text-[10px] text-yellow-200">Upgrade for more benefits</p>
                    </div>
                </div>
                <ChevronRight className="text-yellow-200" size={16}/>
            </div>
            
            {/* Progress Bar */}
            <div className="relative z-10">
                <div className="flex justify-between text-[10px] text-yellow-100 mb-1 font-mono">
                    <span>Current: ₹{currentDeposit.toFixed(0)}</span>
                    <span>Target: ₹{nextThreshold}</span>
                </div>
                <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 transition-all duration-1000"
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
            </div>
        </div>

        {/* Group 1 */}
        <div className="bg-[#1e293b] rounded-2xl overflow-hidden shadow-lg border border-slate-700/50">
             <div onClick={() => setShowHistoryModal('GAME')}>
                <MenuItem icon={Gamepad2} label="Bet History" color="text-purple-400" bg="bg-purple-500/10" />
             </div>
             <div className="h-[1px] bg-slate-700/50 mx-14"></div>
             <div onClick={() => setShowHistoryModal('TRANSACTION')}>
                <MenuItem icon={History} label="Transactions" color="text-blue-400" bg="bg-blue-500/10" />
             </div>
             <div className="h-[1px] bg-slate-700/50 mx-14"></div>
             <div onClick={() => setView('STATISTICS')}>
                <MenuItem icon={BarChart2} label="Game Statistics" color="text-green-400" bg="bg-green-500/10" />
             </div>
        </div>

        {/* Group 2 */}
        <div className="bg-[#1e293b] rounded-2xl overflow-hidden shadow-lg border border-slate-700/50">
             <div onClick={() => setView('PROMOTION')}>
                <MenuItem icon={Gift} label="Gifts & Promo" color="text-pink-400" bg="bg-pink-500/10" />
             </div>
             <div className="h-[1px] bg-slate-700/50 mx-14"></div>
             <div onClick={handleShareApp}>
                 <MenuItem icon={Share2} label="Share App" color="text-yellow-400" bg="bg-yellow-500/10" />
             </div>
             <div className="h-[1px] bg-slate-700/50 mx-14"></div>
             <div onClick={() => setView('SAFETY')}>
                <MenuItem icon={Shield} label="Security Center" color="text-orange-400" bg="bg-orange-500/10" />
             </div>
             <div className="h-[1px] bg-slate-700/50 mx-14"></div>
             <div onClick={() => setShowCSModal(true)}>
                <MenuItem icon={HelpCircle} label="Customer Service" color="text-cyan-400" bg="bg-cyan-500/10" />
             </div>
        </div>

        <button onClick={handleLogout} className="w-full py-4 rounded-xl text-red-400 font-bold bg-[#1e293b] border border-red-500/20 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 mt-4">
            <LogOut size={18}/> Log Out
        </button>
      </div>

      {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
             <div className="w-full max-w-md bg-[#0f172a] h-[80vh] rounded-t-3xl sm:rounded-2xl flex flex-col relative animate-in slide-in-from-bottom border border-slate-700">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#1e293b] rounded-t-3xl sm:rounded-t-2xl">
                    <h3 className="font-bold text-white">{showHistoryModal === 'GAME' ? 'Game History' : 'Financial Transactions'}</h3>
                    <button onClick={() => setShowHistoryModal(null)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700"><X size={16} className="text-white"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {showHistoryModal === 'GAME' ? (
                        gameHistory.length > 0 ? gameHistory.map((item) => (
                             <div key={item.id} className="bg-[#1e293b] p-3 rounded-xl border border-slate-700/50 flex justify-between items-center shadow-sm">
                                 <div>
                                     <div className="font-bold text-white">{item.game}</div>
                                     <div className="text-[10px] text-slate-400">{item.date}</div>
                                     <div className="text-[10px] text-slate-500">{item.details}</div>
                                 </div>
                                 <div className="text-right">
                                     <div className={`font-bold ${item.win > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                         {item.win > 0 ? `+₹${item.win}` : `-₹${item.amount}`}
                                     </div>
                                     {item.win > 0 && <div className="text-[10px] text-green-500/50 bg-green-500/10 px-2 rounded-full inline-block">Win</div>}
                                 </div>
                             </div>
                        )) : <div className="text-center text-slate-500 mt-10">No game history</div>
                    ) : (
                         financialTransactions.map((tx) => (
                             <div key={tx.id} className="bg-[#1e293b] p-3 rounded-xl border border-slate-700/50 flex justify-between items-center shadow-sm">
                                 <div>
                                     <div className="font-bold text-white">{tx.desc}</div>
                                     <div className="text-[10px] text-slate-400">{tx.date}</div>
                                     {tx.method && <div className="text-[10px] text-blue-400 bg-blue-400/10 px-1 rounded w-fit">{tx.method}</div>}
                                 </div>
                                 <div className="text-right">
                                     <div className={`font-bold ${tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'COMMISSION' || tx.type === 'GIFT' || tx.type === 'BONUS' ? 'text-green-500' : 'text-red-500'}`}>
                                         {tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'COMMISSION' || tx.type === 'GIFT' || tx.type === 'BONUS' ? '+' : '-'}₹{tx.amount}
                                     </div>
                                     <div className={`text-[10px] font-bold uppercase ${
                                         tx.status === 'SUCCESS' ? 'text-green-500' : 
                                         tx.status === 'PROCESSING' ? 'text-yellow-500' : 'text-red-500'
                                     }`}>{tx.status}</div>
                                 </div>
                             </div>
                         )) 
                    )}
                </div>
             </div>
          </div>
      )}

      {showCSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
              <div className="bg-[#1e293b] w-full max-w-sm rounded-2xl p-6 border border-slate-700 relative shadow-2xl">
                  <button onClick={() => setShowCSModal(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-700 rounded-full"><X size={20} className="text-slate-400"/></button>
                  <h3 className="text-xl font-bold text-white mb-6 text-center">Customer Service</h3>
                  
                  <div className="space-y-4">
                      <button 
                        onClick={() => handleServiceRedirect('TELEGRAM')}
                        className="w-full py-4 bg-[#229ED9] hover:bg-[#1f8ebf] rounded-xl flex items-center justify-center gap-3 text-white font-bold shadow-lg transition-transform active:scale-95"
                      >
                          <div className="bg-white/20 p-2 rounded-full"><Phone size={24}/></div>
                          Contact via Telegram
                      </button>

                      <button 
                        onClick={() => handleServiceRedirect('WHATSAPP')}
                        className="w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] rounded-xl flex items-center justify-center gap-3 text-white font-bold shadow-lg transition-transform active:scale-95"
                      >
                          <div className="bg-white/20 p-2 rounded-full"><MessageCircle size={24}/></div>
                          Contact via WhatsApp
                      </button>
                  </div>
                  <p className="text-center text-xs text-slate-500 mt-6">Working Hours: 10:00 AM - 10:00 PM</p>
              </div>
          </div>
      )}
    </div>
  );
};

const MenuItem = ({ icon: Icon, label, subtitle, value, color, bg }: { icon: any, label: string, subtitle?: string, value?: string, color: string, bg: string }) => (
    <div className="flex items-center justify-between p-4 active:bg-slate-700/50 cursor-pointer hover:bg-slate-800/30 transition-colors">
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center`}>
                <Icon size={20} />
            </div>
            <div>
                <div className="text-sm font-bold text-slate-200">{label}</div>
                {subtitle && <div className="text-[10px] text-slate-500">{subtitle}</div>}
            </div>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-xs font-bold text-slate-400">{value}</span>}
            <ChevronRight size={16} className="text-slate-600" />
        </div>
    </div>
);

export default Profile;
