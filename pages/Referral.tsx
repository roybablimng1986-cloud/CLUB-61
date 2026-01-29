
import React, { useState, useEffect } from 'react';
import { Users, Copy, ChevronRight, BarChart3, CreditCard, QrCode, X, Phone, MessageCircle, Share2, FileText, User, CheckCircle2, Crown, Lock, Send, ShieldAlert, AlertCircle, TrendingUp, Zap, Wallet } from 'lucide-react';
import { referralStats, getSubordinates, getCommissions, subscribeToBalance, claimCommission, playSound } from '../services/mockFirebase';
import { UserProfile, SubordinateItem, CommissionItem } from '../types';

interface ReferralProps {
    user: UserProfile;
}

const Referral: React.FC<ReferralProps> = ({ user }) => {
  const [showRules, setShowRules] = useState(false);
  const [showSubordinates, setShowSubordinates] = useState(false);
  const [showCommissions, setShowCommissions] = useState(false);
  const [activeTab, setActiveTab] = useState<'DIRECT' | 'TEAM'>('DIRECT');
  const [subordinateList, setSubordinateList] = useState<SubordinateItem[]>([]);
  const [commissionList, setCommissionList] = useState<CommissionItem[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  useEffect(() => {
      const unsubBalance = subscribeToBalance(() => {});
      const unsubSubs = getSubordinates((data) => setSubordinateList(data));
      const unsubComs = getCommissions((data) => setCommissionList(data));
      return () => { unsubBalance(); unsubSubs(); unsubComs(); };
  }, []);

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      playSound('click');
  };

  const handleShare = async () => {
      const shareData = {
          title: 'Join MAFIA CLUB!',
          text: `Join the elite MAFIA CLUB network. Register using my link ${referralStats.link} to win high rewards!`,
          url: referralStats.link
      };
      if (navigator.share) {
          try { await navigator.share(shareData); } catch (err) {}
      } else handleCopy(referralStats.link);
  };

  const handleClaim = async () => {
      if (referralStats.totalCommission <= 0) return;
      setClaimLoading(true);
      playSound('click');
      const res = await claimCommission();
      setClaimLoading(false);
      if (res.success) {
          alert(`Successfully claimed ₹${res.message || 'Assets'} to your wallet!`);
          playSound('win');
      } else alert(res.message);
  };

  const directDepositCount = subordinateList.filter(s => s.depositAmount > 0).length;

  return (
    <div className="bg-[#0a0f1d] min-h-screen pb-32 font-sans relative select-none">
      {showToast && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[300] bg-black/95 text-white px-10 py-4 rounded-full font-black text-xs flex items-center gap-3 border border-yellow-500/20 animate-in zoom-in duration-200 shadow-2xl">
              <CheckCircle2 className="text-green-500" size={18}/> COPIED TO CLIPBOARD
          </div>
      )}

      <div className="bg-gradient-to-br from-[#1e293b] to-[#0a0f1d] p-6 pt-10 pb-20 rounded-b-[4rem] text-white shadow-xl relative overflow-hidden border-b border-yellow-500/20">
        <div className="absolute top-0 right-0 p-32 bg-yellow-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="flex flex-col items-center relative z-10">
            <Crown className="text-yellow-500 mb-2 fill-yellow-500" size={32} />
            <h1 className="text-center font-black text-sm mb-10 tracking-[0.3em] uppercase gold-text">AGENCY COMMAND CENTER</h1>
            <div className="text-center mb-8">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Unclaimed Agency Assets</p>
                <h2 className="text-7xl font-black mb-1 drop-shadow-2xl gold-text tracking-tighter italic">₹{referralStats.totalCommission.toFixed(2)}</h2>
                <div className="mt-6 flex gap-4 justify-center">
                    <div className="bg-yellow-500/10 px-4 py-2 rounded-2xl border border-yellow-500/20 backdrop-blur-sm">
                        <p className="text-[8px] text-slate-500 font-black uppercase">Yesterday</p>
                        <p className="text-sm font-black text-white">₹{referralStats.yesterdayCommission.toFixed(2)}</p>
                    </div>
                    <button 
                        onClick={handleClaim}
                        disabled={referralStats.totalCommission <= 0 || claimLoading}
                        className={`flex items-center gap-2 px-8 py-2 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 ${referralStats.totalCommission > 0 ? 'bg-yellow-500 text-black shadow-xl' : 'bg-slate-800 text-slate-600 grayscale cursor-not-allowed'}`}
                    >
                        <Wallet size={14}/> {claimLoading ? 'Processing...' : 'Claim to Wallet'}
                    </button>
                </div>
            </div>
        </div>
      </div>

      <div className="px-4 -mt-14 relative z-10 space-y-6">
        <div className="bg-[#111827] rounded-[2rem] p-6 border-2 border-yellow-500/20 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-500/20">
                    <QrCode size={28} className="text-yellow-500" />
                </div>
                <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">My Referral Code</p>
                    <p className="text-2xl font-black text-white font-mono tracking-tighter">{referralStats.code}</p>
                </div>
            </div>
            <button onClick={() => handleCopy(referralStats.code)} className="p-4 bg-slate-800 rounded-2xl border border-white/5 active:scale-90 transition-all text-yellow-500"><Copy size={20}/></button>
        </div>

        <div className="bg-[#111827] rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-800">
            <div className="flex border-b border-slate-800">
                <button 
                    onClick={() => setActiveTab('DIRECT')}
                    className={`flex-1 p-5 transition-all duration-300 ${activeTab === 'DIRECT' ? 'bg-yellow-500/10 border-b-4 border-yellow-500 text-yellow-500' : 'text-slate-500'}`}
                >
                    <span className="text-[11px] font-black uppercase tracking-widest italic">Direct Elite</span>
                </button>
                <button 
                    onClick={() => setActiveTab('TEAM')}
                    className={`flex-1 p-5 transition-all duration-300 ${activeTab === 'TEAM' ? 'bg-yellow-500/10 border-b-4 border-yellow-500 text-yellow-500' : 'text-slate-500'}`}
                >
                     <span className="text-[11px] font-black uppercase tracking-widest italic">Global Network</span>
                </button>
            </div>
            <div className="p-8">
                <div className="grid grid-cols-2 gap-y-10 text-center">
                    <div className="border-r border-slate-800">
                        <div className="text-3xl font-black text-white italic tracking-tighter">
                            {activeTab === 'DIRECT' ? referralStats.directSubordinates : referralStats.teamSubordinates}
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-2">Registers</div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-green-500 italic tracking-tighter">
                            {activeTab === 'DIRECT' ? directDepositCount : Math.floor(directDepositCount * 1.3)}
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-2">Deposited</div>
                    </div>
                    <div className="border-r border-slate-800">
                        <div className="text-3xl font-black text-yellow-500 italic tracking-tighter">
                            ₹{activeTab === 'DIRECT' ? referralStats.totalDepositAmount.toFixed(0) : (referralStats.totalDepositAmount * 1.2).toFixed(0)}
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-2">Dep. Assets</div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-blue-400 italic tracking-tighter">
                            ₹{activeTab === 'DIRECT' ? referralStats.totalBetAmount.toFixed(0) : (referralStats.totalBetAmount * 1.5).toFixed(0)}
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-2">Bet Volume</div>
                    </div>
                </div>
            </div>
        </div>

        <button 
            onClick={handleShare}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 py-6 rounded-3xl text-black font-black text-lg shadow-[0_20px_50px_rgba(234,179,8,0.2)] mb-8 transition-all active:scale-95 flex items-center justify-center gap-4 uppercase tracking-[0.3em] border-t-2 border-white/20"
        >
            <Share2 size={24}/>
            COPY INVITE LINK
        </button>

        <div className="grid grid-cols-1 gap-4">
            <MenuItem onClick={() => setShowSubordinates(true)} icon={BarChart3} label="Subordinate data" subtitle="View individual contribution" />
            <MenuItem onClick={() => setShowCommissions(true)} icon={CreditCard} label="Commission detail" subtitle="Trace asset flow" />
            <MenuItem onClick={() => setShowRules(true)} icon={FileText} label="Elite Rules & Policies" subtitle="Commission rates and tiers" />
            <MenuItem onClick={() => window.open('https://t.me/mafialottery', '_blank')} icon={MessageCircle} label="Executive Support" subtitle="Direct agent hotline" />
        </div>
      </div>

      {showRules && (
          <FullPageModal title="Elite Network Policies" onClose={() => setShowRules(false)}>
              <div className="text-slate-300 text-sm space-y-8 font-medium leading-relaxed pb-10">
                  <div className="bg-yellow-500/10 p-6 rounded-[2rem] border border-yellow-500/20">
                      <h4 className="text-yellow-500 font-black uppercase text-xs mb-4 flex items-center gap-2 italic tracking-widest">
                        <Zap size={16} className="fill-yellow-500"/> Direct Deposit Reward
                      </h4>
                      <p className="text-xs italic text-slate-400 leading-relaxed">
                        Earn an instant <span className="text-white font-black">10% Commission Bonus</span> on every deposit of every direct subordinate. 
                      </p>
                  </div>
              </div>
          </FullPageModal>
      )}

      {showSubordinates && (
          <FullPageModal title="Network Personnel" onClose={() => setShowSubordinates(false)}>
              <div className="space-y-4">
                  {subordinateList.length > 0 ? subordinateList.map(sub => (
                      <div key={sub.id} className="bg-zinc-950 p-6 rounded-3xl flex justify-between items-center border border-slate-800 shadow-xl">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-black text-lg border border-yellow-500/20 shadow-inner">M</div>
                              <div>
                                  <div className="font-black text-white text-sm uppercase tracking-tighter italic">UID: {sub.uid.slice(-6)}</div>
                                  <div className="text-[10px] text-slate-500 mt-1 font-bold uppercase">Vol: ₹{sub.betAmount}</div>
                              </div>
                          </div>
                          <div className="text-right">
                              <p className="text-[9px] text-slate-600 font-black uppercase mb-1">Contribution</p>
                              <div className="text-green-500 font-black text-lg italic">₹{sub.commission.toFixed(2)}</div>
                          </div>
                      </div>
                  )) : <div className="text-center text-slate-700 py-32 font-black uppercase tracking-widest text-xs opacity-50 italic">No personnel found</div>}
              </div>
          </FullPageModal>
      )}

      {showCommissions && (
          <FullPageModal title="Agency Ledger" onClose={() => setShowCommissions(false)}>
              <div className="space-y-4">
                  {commissionList.length > 0 ? commissionList.map(item => (
                      <div key={item.id} className="bg-zinc-950 p-6 rounded-3xl flex justify-between items-center border border-slate-800">
                          <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center border border-green-500/20 shadow-inner">
                                  <TrendingUp size={24} />
                              </div>
                              <div>
                                  <div className="font-black text-white text-sm uppercase italic tracking-tighter">{item.type}</div>
                                  <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">{item.date}</div>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="text-green-500 font-black text-xl italic tracking-tighter">+₹{item.amount.toFixed(2)}</div>
                              <div className="text-[8px] text-slate-700 font-black uppercase tracking-widest mt-1">Verified</div>
                          </div>
                      </div>
                  )) : <div className="text-center text-slate-700 py-32 font-black uppercase tracking-widest text-xs opacity-50 italic">No asset flow recorded</div>}
              </div>
          </FullPageModal>
      )}
    </div>
  );
};

const MenuItem = ({ icon: Icon, label, subtitle, onClick }: any) => (
    <div onClick={onClick} className={`bg-[#111827] p-6 rounded-[2rem] flex items-center justify-between cursor-pointer active:bg-slate-800 transition-all border border-slate-800 group shadow-lg`}>
        <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl bg-[#0a0f1d] text-slate-600 flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-black transition-all shadow-inner border border-white/5`}>
                <Icon size={24} />
            </div>
            <div>
                <span className={`font-black text-[13px] uppercase tracking-widest text-white block`}>{label}</span>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-tight">{subtitle}</p>
            </div>
        </div>
        <ChevronRight size={20} className="text-slate-700 group-hover:text-yellow-500 transition-all group-hover:translate-x-1" />
    </div>
);

const FullPageModal = ({ title, children, onClose }: any) => (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/95 backdrop-blur-md animate-in fade-in">
        <div className="bg-[#111827] w-full max-w-md h-[85vh] rounded-t-[4rem] p-8 flex flex-col border-t-2 border-yellow-500/20 shadow-2xl animate-in slide-in-from-bottom duration-500 relative">
            <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-8">
                <div className="flex items-center gap-4">
                    <ShieldAlert size={24} className="text-yellow-500" />
                    <h3 className="text-white font-black text-sm uppercase tracking-[0.2em] gold-text">{title}</h3>
                </div>
                <button onClick={onClose} type="button" className="p-4 bg-slate-800 rounded-full border border-white/5 shadow-lg">
                    <X className="text-slate-400" size={24}/>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-12 px-2">
                {children}
            </div>
        </div>
    </div>
);

export default Referral;
