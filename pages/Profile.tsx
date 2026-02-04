
import React, { useState, useEffect } from 'react';
import { UserProfile, View, Transaction, GameHistoryItem } from '../types';
import { Settings, Copy, Wallet, ArrowUpRight, ArrowDownLeft, ChevronRight, Gamepad2, RefreshCw, X, History, Shield, Crown, CheckCircle2, Sparkles, ShieldAlert, Zap, Gift } from 'lucide-react';
import { logout, getGameHistory, getTransactionHistory, claimRebate, playSound } from '../services/mockFirebase';
import AiSupportChat from '../components/AiSupportChat';

interface ProfileProps {
  user: UserProfile;
  setView: (view: any) => void;
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

  const turnoverSinceLastClaim = Math.max(0, (user.totalBet || 0) - (user.rebateLastClaimedBet || 0));
  const pendingRebate = turnoverSinceLastClaim * 0.001;

  const handleClaimRebateAction = async () => {
    if (pendingRebate <= 0) return;
    const res = await claimRebate();
    if (res.success) { playSound('win'); alert(`Success! ₹${res.amount?.toFixed(2)} added.`); setShowRebateModal(false); }
  };

  const getVIPBadge = (lv: number) => (
    <div className="bg-yellow-600 px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/20 shadow-lg">
        <Crown size={12} className="text-white fill-white" />
        <span className="text-[10px] font-black uppercase text-white tracking-tighter">LV.{lv} Elite</span>
    </div>
  );

  // VIP PROGRESS CALCULATION
  const currentReq = user.wagerRequired || 0;
  const initialReq = user.wagerTotal || (user.totalDeposit || 1); 
  const wagerProgress = currentReq <= 0 ? 100 : Math.max(0, Math.min(100, ((initialReq - currentReq) / initialReq) * 100));

  return (
    <div className="min-h-screen bg-[#0f172a] pb-24 font-sans text-white select-none">
      {showToast && <div className="fixed top-1/2 left-1/2 -translate-x-1/2 z-[100] bg-black/90 text-white px-8 py-3 rounded-full font-black text-sm flex items-center gap-3 border border-white/20 shadow-2xl animate-in zoom-in"><CheckCircle2 className="text-green-500"/> Copied</div>}

      <AiSupportChat isOpen={showAiChat} onClose={() => setShowAiChat(false)} />

      <div className="bg-gradient-to-b from-blue-700 to-indigo-900 p-8 pb-28 rounded-b-[4rem] relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://img.freepik.com/free-vector/gradient-technological-background_23-2148884155.jpg')] bg-cover opacity-20 mix-blend-overlay"></div>
        <div className="relative z-10 flex items-center justify-between mb-10">
           <div className="flex items-center gap-5">
                <div className="relative"><img src={user.avatar} className="w-20 h-20 rounded-full border-4 border-white/20 shadow-2xl" alt="P" /><div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1.5 border-2 border-slate-900"><Crown size={14} className="text-slate-900 fill-slate-900" /></div></div>
                <div>{getVIPBadge(user.vipLevel || 0)}<h2 className="text-2xl font-black italic tracking-tighter mt-1">{user.username}</h2><div className="flex items-center gap-2 mt-1"><span className="text-blue-300 text-[9px] font-bold font-mono">ID: {user.uid?.slice(-6)}</span><Copy size={12} className="text-blue-400 cursor-pointer" onClick={() => handleCopy(user.uid)} /></div></div>
           </div>
           <button onClick={() => setView('SAFETY')} className="p-3 bg-white/10 rounded-2xl backdrop-blur-md active:scale-90"><Settings size={22}/></button>
        </div>

        <div className="relative z-10 bg-white/15 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
             <div className="flex justify-between items-start mb-6">
                <div><p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">Total Assets <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} onClick={handleRefresh}/></p><h1 className="text-5xl font-black italic">₹{user.balance.toFixed(2)}</h1></div>
                <div className="bg-yellow-500 p-4 rounded-3xl shadow-xl"><Wallet size={28} className="text-slate-900" /></div>
            </div>

            {/* RESTORED WAGER PROGRESS */}
            <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[9px] font-black uppercase text-blue-200 tracking-widest">Withdrawal Turnover</span>
                    <span className={`text-[10px] font-bold ${currentReq <= 0 ? 'text-green-400' : 'text-white'}`}>
                        {currentReq <= 0 ? 'COMPLETED' : `₹${currentReq.toFixed(0)} Left`}
                    </span>
                </div>
                <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all duration-1000" style={{ width: `${wagerProgress}%` }}></div>
                </div>
            </div>

            <div className="flex justify-between gap-4">
                 <button onClick={() => setView('WITHDRAW')} className="flex-1 bg-white/10 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"><ArrowDownLeft size={16} className="text-red-400"/> Withdraw</button>
                 <button onClick={() => setView('DEPOSIT')} className="flex-1 bg-blue-600 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"><ArrowUpRight size={16}/> Deposit</button>
            </div>
        </div>
      </div>

      <div className="px-5 -mt-12 relative z-20 space-y-5">
        {/* DAILY REBATE CARD */}
        <div onClick={() => setShowRebateModal(true)} className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-3xl p-6 shadow-2xl border border-white/10 cursor-pointer active:scale-95 transition-all">
            <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 bg-white/10 rounded-2xl text-white"><Zap size={24} /></div><div><h4 className="font-black text-sm uppercase tracking-widest text-white">Daily Rebate</h4><p className="text-[9px] text-purple-100 font-bold uppercase mt-0.5">Claim ₹{pendingRebate.toFixed(2)} Now</p></div></div><ChevronRight size={18} className="text-purple-200"/></div>
        </div>

        <div onClick={() => setShowAiChat(true)} className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-3xl p-6 shadow-2xl border border-white/10 cursor-pointer active:scale-95 transition-all">
            <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 bg-white/10 rounded-2xl text-white"><ShieldAlert size={24} /></div><div><h4 className="font-black text-sm uppercase tracking-widest text-white">Live Support</h4><p className="text-[9px] text-green-100 font-bold uppercase mt-0.5">24/7 Official Assistance</p></div></div><ChevronRight size={18} className="text-green-200"/></div>
        </div>

        <div className="bg-[#1e293b] rounded-[2rem] overflow-hidden border border-slate-700/50 shadow-xl">
             <MenuItem onClick={() => setShowHistoryModal('GAME')} icon={Gamepad2} label="Betting History" bg="bg-purple-500/10" color="text-purple-400" />
             <div className="h-[1px] bg-slate-800 mx-10 opacity-30"></div>
             <MenuItem onClick={() => setShowHistoryModal('TRANSACTION')} icon={History} label="Financial Ledger" bg="bg-blue-500/10" color="text-blue-400" />
             <div className="h-[1px] bg-slate-800 mx-10 opacity-30"></div>
             <MenuItem onClick={() => setView('PROMOTION')} icon={Gift} label="Gift Center" bg="bg-pink-500/10" color="text-pink-400" subtitle="Redeem bounty codes" />
             <div className="h-[1px] bg-slate-800 mx-10 opacity-30"></div>
             <MenuItem onClick={() => setView('REWARDS_HUB')} icon={Sparkles} label="Rewards Hub" bg="bg-yellow-500/10" color="text-yellow-400" subtitle="Bind bank and upi" />
        </div>

        <button onClick={() => logout()} className="w-full py-5 rounded-3xl text-red-500 font-black uppercase tracking-widest bg-[#1e293b] border border-red-500/20 active:scale-95 transition-all mb-10 shadow-xl">Sign Out Session</button>
      </div>

      {showRebateModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
              <div className="bg-[#1e293b] w-full max-w-sm rounded-[3rem] p-8 border border-white/10 shadow-2xl relative animate-in zoom-in">
                  <button onClick={() => setShowRebateModal(false)} className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full"><X size={20}/></button>
                  <div className="text-center mb-8"><div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-purple-500/30"><Zap size={40} className="text-purple-400 fill-purple-400" /></div><h3 className="text-2xl font-black italic gold-text uppercase">ELITE REBATE</h3><p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-widest">Daily turnover payout</p></div>
                  <div className="bg-black/40 p-6 rounded-3xl border border-white/5 text-center mb-8"><p className="text-[10px] text-slate-500 font-black uppercase mb-1">Available Bounty</p><p className="text-4xl font-black text-white italic">₹{pendingRebate.toFixed(2)}</p></div>
                  <button onClick={handleClaimRebateAction} disabled={pendingRebate <= 0} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl active:scale-95 transition-all ${pendingRebate > 0 ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-500 grayscale cursor-not-allowed'}`}>CLAIM REBATE</button>
              </div>
          </div>
      )}

      {showHistoryModal && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/95 backdrop-blur-md animate-in fade-in">
              <div className="bg-[#1e293b] w-full max-w-md h-[85vh] rounded-t-[3rem] p-6 flex flex-col border-t border-slate-700 shadow-2xl animate-in slide-in-from-bottom duration-500">
                  <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6"><h3 className="text-white font-black text-sm uppercase tracking-widest gold-text">{showHistoryModal === 'GAME' ? 'Betting Archive' : 'Financial Ledger'}</h3><button onClick={() => setShowHistoryModal(null)} className="p-3 bg-slate-800 rounded-full"><X size={20} className="text-slate-400"/></button></div>
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-10">
                      {showHistoryModal === 'GAME' ? (
                          historyData.length > 0 ? historyData.map((item, i) => (
                              <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5 flex justify-between items-center"><div><div className="text-xs font-black text-white uppercase tracking-tighter">{item.game}</div><div className="text-[9px] text-slate-500 font-bold mt-0.5">{item.date}</div></div><div className="text-right"><div className={`text-sm font-black ${item.win > 0 ? 'text-green-500' : 'text-red-500'}`}>{item.win > 0 ? `+₹${item.win.toFixed(2)}` : `-₹${item.amount.toFixed(2)}`}</div></div></div>
                          )) : <div className="text-center py-20 text-slate-600 font-black uppercase text-xs italic tracking-widest">No Logs</div>
                      ) : (
                          txData.length > 0 ? txData.map((tx, i) => (
                              <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5 flex justify-between items-center"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${['DEPOSIT','WIN','BONUS','GIFT'].includes(tx.type) ? 'bg-green-500/10 text-green-500' : 'bg-red-600/10 text-red-500'}`}>{['DEPOSIT','WIN','BONUS','GIFT'].includes(tx.type) ? <ArrowUpRight size={20}/> : <ArrowDownLeft size={20}/>}</div><div><div className="text-xs font-black text-white uppercase tracking-tighter">{tx.desc}</div><div className="text-[9px] text-slate-500 font-bold mt-0.5">{tx.date}</div></div></div><div className="text-right"><div className={`text-sm font-black ${['DEPOSIT','WIN','BONUS','GIFT'].includes(tx.type) ? 'text-green-500' : 'text-red-500'}`}>{['DEPOSIT','WIN','BONUS','GIFT'].includes(tx.type) ? '+' : '-'}₹{tx.amount.toFixed(2)}</div><div className={`text-[8px] font-black uppercase tracking-widest ${tx.status === 'SUCCESS' ? 'text-green-500' : 'text-yellow-500'}`}>{tx.status}</div></div></div>
                          )) : <div className="text-center py-20 text-slate-600 font-black uppercase text-xs italic tracking-widest">No Transactions</div>
                      )}
                  </div>
              </div>
          </div>
      )}
      <style>{`.gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
    </div>
  );
};

const MenuItem = ({ icon: Icon, label, bg, color, onClick, subtitle }: any) => (
    <div onClick={onClick} className="flex items-center justify-between p-5 active:bg-slate-700/50 cursor-pointer group">
        <div className="flex items-center gap-5"><div className={`w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}><Icon size={24} /></div><div><div className="text-sm font-black uppercase tracking-widest text-slate-200">{label}</div>{subtitle && <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{subtitle}</p>}</div></div>
        <ChevronRight size={20} className="text-slate-600 transition-all group-hover:translate-x-1" />
    </div>
);
export default Profile;
