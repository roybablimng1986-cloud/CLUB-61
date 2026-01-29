
import React, { useState, useEffect } from 'react';
import { UserProfile, View, Transaction, GameHistoryItem } from '../types';
import { Settings, Copy, Wallet, ArrowUpRight, ArrowDownLeft, ChevronRight, Gamepad2, RefreshCw, X, History, LogOut, Shield, Crown, CheckCircle2, Sparkles, ShieldAlert, Zap, Star } from 'lucide-react';
import { logout, getGameHistory, getTransactionHistory, claimRebate, playSound } from '../services/mockFirebase';
import AiSupportChat from '../components/AiSupportChat';

interface ProfileProps {
  user: UserProfile;
  setView: (view: View) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, setView }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<'GAME' | 'TRANSACTION' | null>(null);
  const [showAiChat, setShowAiChat] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showRebateModal, setShowRebateModal] = useState(false);
  const [historyData, setHistoryData] = useState<GameHistoryItem[]>([]);
  const [txData, setTxData] = useState<Transaction[]>([]);

  useEffect(() => {
    let unsub: any;
    if (showHistoryModal === 'GAME') unsub = getGameHistory('ALL', (data) => setHistoryData(data));
    if (showHistoryModal === 'TRANSACTION') unsub = getTransactionHistory((data) => setTxData(data));
    return () => { if(unsub) unsub(); };
  }, [showHistoryModal]);

  const handleRefresh = () => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 800); };
  const handleCopy = (text: string) => { navigator.clipboard.writeText(text); setShowToast(true); setTimeout(() => setShowToast(false), 2000); };

  const currentReq = user.wagerRequired || 0;
  const initialReq = (user.totalDeposit || 0) * 5.4;
  
  let wagerScale = 0;
  if (initialReq > 0) {
      const completed = Math.max(0, initialReq - currentReq);
      wagerScale = (completed / initialReq) * 100;
  } else if (currentReq === 0) {
      wagerScale = 100;
  }
  if (currentReq <= 0) wagerScale = 100;

  const pendingRebate = (user.totalBet || 0) * 0.001;

  const handleClaimRebate = async () => {
    if (pendingRebate <= 0) return;
    const res = await claimRebate();
    if (res.success) {
        playSound('win');
        alert(`Claim Success! ₹${res.amount?.toFixed(2)} added to wallet.`);
        setShowRebateModal(false);
    } else {
        alert(res.message);
    }
  };

  const getVIPBadge = (lv: number) => {
      const badges = [
          { name: 'Elite', color: 'bg-zinc-700', icon: Shield },
          { name: 'Bronze', color: 'bg-orange-800', icon: Star },
          { name: 'Silver', color: 'bg-slate-400', icon: Shield },
          { name: 'Gold', color: 'bg-yellow-500', icon: Crown },
          { name: 'Platinum', color: 'bg-blue-400', icon: Sparkles },
          { name: 'Diamond', color: 'bg-purple-600', icon: Zap }
      ];
      const b = badges[lv] || badges[0];
      return (
          <div className={`${b.color} px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/20 shadow-lg`}>
              <b.icon size={12} className="text-white fill-white" />
              <span className="text-[10px] font-black uppercase text-white tracking-tighter">{b.name} Lv.{lv}</span>
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] pb-24 font-sans text-white animate-in fade-in duration-500 select-none">
      {showToast && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-black/90 text-white px-8 py-3 rounded-full font-black text-sm flex items-center gap-3 animate-in zoom-in border border-white/20 shadow-2xl">
              <CheckCircle2 className="text-green-500"/> Copied
          </div>
      )}

      <AiSupportChat isOpen={showAiChat} onClose={() => setShowAiChat(false)} />

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
                    <div className="mb-2">{getVIPBadge(user.vipLevel || 0)}</div>
                    <h2 className="text-2xl font-black text-white italic tracking-tighter">{user.username}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-blue-300 text-[9px] font-bold font-mono">ID: {user.uid ? user.uid.slice(-6) : '......'}</span>
                        <Copy size={12} className="text-blue-400 cursor-pointer" onClick={() => handleCopy(user.uid)} />
                    </div>
                </div>
           </div>
           <div className="flex gap-2">
                <button onClick={() => setView('SAFETY')} className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 text-white active:scale-90"><Settings size={22}/></button>
           </div>
        </div>

        <div className="relative z-10 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
             <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        Total Assets <RefreshCw size={12} className={`cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`} onClick={handleRefresh}/>
                    </p>
                    <h1 className="text-5xl font-black tracking-tighter text-white">₹{user.balance.toFixed(2)}</h1>
                </div>
                <div className="bg-yellow-500 p-4 rounded-3xl shadow-xl shadow-yellow-500/20">
                    <Wallet size={28} className="text-slate-900" />
                </div>
            </div>
            
            <div className="mb-8">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[9px] font-black uppercase text-blue-200 tracking-widest">Withdrawal Turnover</span>
                    <span className={`text-[10px] font-bold ${currentReq <= 0 ? 'text-green-400' : 'text-white'}`}>
                        {currentReq <= 0 ? 'COMPLETED' : `₹${currentReq.toFixed(0)} Left`}
                    </span>
                </div>
                <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/10 shadow-inner">
                    <div 
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all duration-700" 
                        style={{ width: `${wagerScale}%` }}
                    ></div>
                </div>
                <div className="flex justify-between mt-2">
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Progress</p>
                    <p className="text-[8px] text-green-500 font-black uppercase tracking-widest">{wagerScale.toFixed(1)}%</p>
                </div>
            </div>

            <div className="flex justify-between gap-4">
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
        <div className="bg-[#1e293b] rounded-[2rem] p-6 shadow-xl border border-slate-700/50">
            <h3 className="text-xs font-black uppercase tracking-widest text-yellow-500 mb-4 flex items-center gap-2">
                <Star size={14} className="fill-yellow-500" /> VIP Level Privileges
            </h3>
            <div className="space-y-3">
                {[
                    { lv: 1, amount: 500, name: 'Bronze' },
                    { lv: 2, amount: 2000, name: 'Silver' },
                    { lv: 3, amount: 50000, name: 'Gold' },
                    { lv: 4, amount: 100000, name: 'Platinum' },
                    { lv: 5, amount: 400000, name: 'Diamond' }
                ].map((v) => (
                    <div key={v.lv} className={`flex justify-between items-center p-3 rounded-xl border ${user.vipLevel >= v.lv ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-black/20 border-white/5 opacity-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black">LV{v.lv}</div>
                            <span className="text-xs font-bold text-slate-200">{v.name} Elite</span>
                        </div>
                        <span className="text-xs font-mono font-black text-yellow-500">₹{v.amount.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>

        <div onClick={() => setShowRebateModal(true)} className="bg-gradient-to-r from-indigo-900 to-blue-900 rounded-3xl p-6 shadow-2xl border border-white/10 cursor-pointer active:scale-95 transition-all">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-2xl"><Zap size={24} className="text-yellow-400" /></div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-widest text-white">Rebate Center</h4>
                        <p className="text-[9px] text-blue-200 font-bold uppercase mt-0.5">Collect betting dividends</p>
                    </div>
                </div>
                <ChevronRight size={18} className="text-blue-300"/>
            </div>
        </div>

        <div className="bg-[#1e293b] rounded-[2rem] overflow-hidden border border-slate-700/50 shadow-xl">
             <MenuItem onClick={() => setShowHistoryModal('GAME')} icon={Gamepad2} label="Betting History" bg="bg-purple-500/10" color="text-purple-400" />
             <div className="h-[1px] bg-slate-800 mx-10 opacity-30"></div>
             <MenuItem onClick={() => setShowHistoryModal('TRANSACTION')} icon={History} label="Transactions" bg="bg-blue-500/10" color="text-blue-400" />
             <div className="h-[1px] bg-slate-800 mx-10 opacity-30"></div>
             <MenuItem onClick={() => setView('REWARDS_HUB')} icon={Sparkles} label="Rewards Hub" bg="bg-yellow-500/10" color="text-yellow-400" subtitle="Bind bank and upi for rewards" />
        </div>

        <button onClick={() => logout()} className="w-full py-5 rounded-3xl text-red-500 font-black uppercase tracking-widest bg-[#1e293b] border border-red-500/20 transition-all active:scale-95 mb-10">Sign Out Session</button>
      </div>

      {showHistoryModal && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/95 backdrop-blur-md animate-in fade-in">
              <div className="bg-[#1e293b] w-full max-w-md h-[85vh] rounded-t-[3rem] p-6 flex flex-col border-t border-slate-700 shadow-2xl animate-in slide-in-from-bottom duration-500">
                  <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
                      <h3 className="text-white font-black text-sm uppercase tracking-widest gold-text">
                        {showHistoryModal === 'GAME' ? 'Betting Archive' : 'Financial Ledger'}
                      </h3>
                      <button onClick={() => setShowHistoryModal(null)} className="p-3 bg-slate-800 rounded-full"><X size={20} className="text-slate-400"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-10">
                      {showHistoryModal === 'GAME' ? (
                          historyData.length > 0 ? historyData.map((item, i) => (
                              <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                                  <div>
                                      <div className="text-xs font-black text-white uppercase tracking-tighter">{item.game}</div>
                                      <div className="text-[9px] text-slate-500 font-bold mt-0.5">{item.date}</div>
                                  </div>
                                  <div className="text-right">
                                      <div className={`text-sm font-black ${item.win > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                          {item.win > 0 ? `+₹${item.win.toFixed(2)}` : `-₹${item.amount.toFixed(2)}`}
                                      </div>
                                      <div className="text-[8px] text-slate-600 font-black uppercase tracking-tight italic">{item.details}</div>
                                  </div>
                              </div>
                          )) : <div className="text-center py-20 text-slate-600 font-black uppercase text-xs italic tracking-widest">No Logs Found</div>
                      ) : (
                          txData.length > 0 ? txData.map((tx, i) => (
                              <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${['DEPOSIT','WIN','BONUS','GIFT'].includes(tx.type) ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                          {['DEPOSIT','WIN','BONUS','GIFT'].includes(tx.type) ? <ArrowUpRight size={20}/> : <ArrowDownLeft size={20}/>}
                                      </div>
                                      <div>
                                          <div className="text-xs font-black text-white uppercase tracking-tighter">{tx.desc}</div>
                                          <div className="text-[9px] text-slate-500 font-bold mt-0.5">{tx.date}</div>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className={`text-sm font-black ${['DEPOSIT','WIN','BONUS','GIFT'].includes(tx.type) ? 'text-green-500' : 'text-red-500'}`}>
                                          {['DEPOSIT','WIN','BONUS','GIFT'].includes(tx.type) ? '+' : '-'}₹{tx.amount.toFixed(2)}
                                      </div>
                                      <div className={`text-[8px] font-black uppercase tracking-widest ${tx.status === 'SUCCESS' ? 'text-green-500' : 'text-yellow-500'}`}>{tx.status}</div>
                                  </div>
                              </div>
                          )) : <div className="text-center py-20 text-slate-600 font-black uppercase text-xs italic tracking-widest">No Transactions</div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {showRebateModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in zoom-in">
              <div className="bg-[#1e293b] w-full max-w-sm rounded-[3rem] p-8 border-2 border-blue-500/30 shadow-[0_0_80px_rgba(59,130,246,0.3)] text-center relative">
                   <button onClick={() => setShowRebateModal(false)} className="absolute top-6 right-6 p-2 bg-black/20 rounded-full"><X size={18}/></button>
                   <ShieldAlert size={56} className="text-yellow-500 mx-auto mb-6" />
                   <h3 className="text-2xl font-black italic gold-text uppercase mb-2">REBATE CENTER</h3>
                   <p className="text-slate-400 text-xs mb-8">Daily rebate is 0.1% based on total valid betting turnover.</p>
                   
                   <div className="grid grid-cols-2 gap-4 mb-10">
                       <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                           <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Valid Turnover</p>
                           <p className="text-xl font-black">₹{user.totalBet?.toFixed(2)}</p>
                       </div>
                       <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                           <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Rebate (0.1%)</p>
                           <p className="text-xl font-black text-green-400">₹{pendingRebate.toFixed(2)}</p>
                       </div>
                   </div>

                   <button 
                    onClick={handleClaimRebate} 
                    disabled={pendingRebate <= 0}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl border-t-2 border-white/10 transition-all ${pendingRebate > 0 ? 'bg-blue-600 animate-pulse' : 'bg-zinc-800 text-zinc-600 grayscale opacity-50'}`}
                   >
                        CLAIM REBATE
                   </button>
              </div>
          </div>
      )}
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};

const MenuItem = ({ icon: Icon, label, bg, color, onClick, subtitle }: any) => (
    <div onClick={onClick} className="flex items-center justify-between p-5 active:bg-slate-700/50 cursor-pointer group">
        <div className="flex items-center gap-5">
            <div className={`w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
            <div>
                <div className="text-sm font-black uppercase tracking-widest text-slate-200">{label}</div>
                {subtitle && <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{subtitle}</p>}
            </div>
        </div>
        <ChevronRight size={20} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
    </div>
);

export default Profile;
