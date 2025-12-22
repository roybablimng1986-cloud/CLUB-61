
import React, { useState, useEffect } from 'react';
import { Users, Copy, ChevronRight, BarChart3, CreditCard, QrCode, X, Phone, MessageCircle, Share2, FileText, User, CheckCircle2, Crown, Lock, Send, ShieldAlert, AlertCircle } from 'lucide-react';
import { referralStats, getSubordinates, getCommissions, subscribeToBalance } from '../services/mockFirebase';
import { UserProfile } from '../types';

interface ReferralProps {
    user: UserProfile;
}

const Referral: React.FC<ReferralProps> = ({ user }) => {
  const [showRules, setShowRules] = useState(false);
  const [showSubordinates, setShowSubordinates] = useState(false);
  const [showCommissions, setShowCommissions] = useState(false);
  const [showService, setShowService] = useState(false);
  const [activeTab, setActiveTab] = useState<'DIRECT' | 'TEAM'>('DIRECT');
  const [, setTick] = useState(0); 
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
      const unsub = subscribeToBalance(() => {
          setTick(t => t + 1);
      });
      return unsub;
  }, []);

  const subordinates = getSubordinates();
  const commissions = getCommissions();

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
  };

  const handleShare = async () => {
      const shareData = {
          title: 'Join MAFIA CLUB!',
          text: `Join the elite MAFIA CLUB network. Register using my link to win high rewards!`,
          url: referralStats.link
      };

      if (navigator.share) {
          try {
              await navigator.share(shareData);
          } catch (err) {
              console.log(err);
          }
      } else {
          handleCopy(referralStats.link);
      }
  };

  return (
    <div className="bg-[#0a0f1d] min-h-screen pb-24 font-sans relative">
      {showToast && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[300] bg-black/90 text-white px-8 py-3 rounded-full font-black text-xs flex items-center gap-3 border border-yellow-500/20 animate-in zoom-in duration-200">
              <CheckCircle2 className="text-green-500" size={16}/> LINK COPIED
          </div>
      )}

      <div className="bg-gradient-to-br from-[#1e293b] to-[#0a0f1d] p-6 pt-10 pb-20 rounded-b-[3rem] text-white shadow-xl relative overflow-hidden border-b border-yellow-500/20">
        <div className="absolute top-0 right-0 p-32 bg-yellow-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="flex flex-col items-center relative z-10">
            <Crown className="text-yellow-500 mb-2 fill-yellow-500" size={24} />
            <h1 className="text-center font-black text-sm mb-8 tracking-[0.2em] uppercase gold-text">Agency Center</h1>
            <div className="text-center mb-4">
                <h2 className="text-6xl font-black mb-1 drop-shadow-2xl gold-text tracking-tighter">₹{referralStats.yesterdayCommission.toFixed(2)}</h2>
                <p className="text-yellow-100 text-[10px] font-black uppercase tracking-widest bg-yellow-500/10 inline-block px-5 py-1.5 rounded-full border border-yellow-500/20 backdrop-blur-sm">Yesterday Bonus</p>
            </div>
            <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Commission: ₹{referralStats.totalCommission.toFixed(2)}</p>
        </div>
      </div>

      <div className="px-4 -mt-12 relative z-10">
        <div className="bg-[#111827] rounded-3xl overflow-hidden shadow-2xl mb-6 border border-slate-800">
            <div className="flex border-b border-slate-800">
                <button 
                    onClick={() => setActiveTab('DIRECT')}
                    className={`flex-1 p-4 transition-all duration-300 ${activeTab === 'DIRECT' ? 'bg-yellow-500/5 border-b-2 border-yellow-500 text-yellow-500' : 'text-slate-500'}`}
                >
                    <span className="text-[10px] font-black uppercase tracking-widest">Direct subordinates</span>
                </button>
                <button 
                    onClick={() => setActiveTab('TEAM')}
                    className={`flex-1 p-4 transition-all duration-300 ${activeTab === 'TEAM' ? 'bg-yellow-500/5 border-b-2 border-yellow-500 text-yellow-500' : 'text-slate-500'}`}
                >
                     <span className="text-[10px] font-black uppercase tracking-widest">Team subordinates</span>
                </button>
            </div>
            <div className="grid grid-cols-2 text-center p-8 gap-y-10">
                <div className="border-r border-slate-800">
                    <div className="text-2xl font-black text-white">
                        {activeTab === 'DIRECT' ? referralStats.directSubordinates : referralStats.teamSubordinates}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-2">Number of register</div>
                </div>
                <div className="border-l border-slate-800">
                    <div className="text-2xl font-black text-white">
                        ₹{referralStats.totalBetAmount.toFixed(0)}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-2">Total Bet Amount</div>
                </div>
            </div>
        </div>

        <button 
            onClick={handleShare}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 py-4 rounded-2xl text-black font-black text-sm shadow-xl shadow-yellow-900/20 mb-8 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest"
        >
            <Share2 size={20}/>
            INVITE LINK
        </button>

        <div className="space-y-4">
            <MenuItem onClick={() => setShowSubordinates(true)} icon={BarChart3} label="Subordinate data" />
            <MenuItem onClick={() => setShowCommissions(true)} icon={CreditCard} label="Commission detail" />
            <MenuItem onClick={() => setShowRules(true)} icon={FileText} label="Club policies" />
            <MenuItem onClick={() => window.open('https://t.me/mafialottery', '_blank')} icon={MessageCircle} label="Customer Service" />
        </div>
      </div>

      {showRules && (
          <FullPageModal title="Club Policies" onClose={() => setShowRules(false)}>
              <div className="text-slate-300 text-sm space-y-6 font-medium leading-relaxed pb-10">
                  <div className="bg-yellow-500/10 p-5 rounded-[1.5rem] border border-yellow-500/20">
                      <h4 className="text-yellow-500 font-black uppercase text-xs mb-3 flex items-center gap-2">
                        <ShieldAlert size={14}/> General Terms
                      </h4>
                      <p className="text-xs italic">Earn assets by building your team. Note: All commissions are subject to a 5x turnover requirement before withdrawal.</p>
                  </div>
                  <div className="space-y-3">
                      <h4 className="text-white font-black uppercase text-xs tracking-widest ml-1">1. Multi-Tier Commission</h4>
                      <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                          <span className="text-xs text-slate-400">Direct Commission</span>
                          <span className="text-green-500 font-black">20.0% Bonus</span>
                      </div>
                  </div>
              </div>
          </FullPageModal>
      )}

      {showSubordinates && (
          <FullPageModal title="Subordinate Data" onClose={() => setShowSubordinates(false)}>
              <div className="space-y-3">
                  {subordinates.length > 0 ? subordinates.map(sub => (
                      <div key={sub.id} className="bg-[#0a0f1d] p-4 rounded-2xl flex justify-between items-center border border-slate-800">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-black text-xs">M</div>
                              <div>
                                  <div className="font-black text-white text-xs uppercase">UID: {sub.uid.slice(-6)}</div>
                                  <div className="text-[9px] text-slate-600 mt-1 uppercase">Volume: ₹{sub.betAmount}</div>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="text-yellow-500 font-black text-sm">+₹{sub.commission.toFixed(2)}</div>
                              <div className="text-[9px] text-slate-700 font-bold uppercase">{sub.date}</div>
                          </div>
                      </div>
                  )) : <div className="text-center text-slate-700 py-20 font-black uppercase tracking-widest text-xs opacity-50 italic">Empty Network</div>}
              </div>
          </FullPageModal>
      )}
    </div>
  );
};

const MenuItem = ({ icon: Icon, label, onClick }: any) => (
    <div onClick={onClick} className={`bg-[#111827] p-5 rounded-2xl flex items-center justify-between cursor-pointer active:bg-slate-800 transition-all border border-slate-800 group shadow-md`}>
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-[#0a0f1d] text-slate-600 flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-black transition-all shadow-inner`}>
                <Icon size={22} />
            </div>
            <span className={`font-black text-xs uppercase tracking-widest text-white`}>{label}</span>
        </div>
        <ChevronRight size={18} className="text-slate-700 group-hover:text-yellow-500 transition-all" />
    </div>
);

const FullPageModal = ({ title, children, onClose }: any) => (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/90 backdrop-blur-md animate-in fade-in">
        <div className="bg-[#111827] w-full max-w-md h-[85vh] rounded-t-[3rem] p-6 flex flex-col border-t border-slate-800 shadow-2xl animate-in slide-in-from-bottom duration-500 relative">
            <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                    <ShieldAlert size={20} className="text-yellow-500" />
                    <h3 className="text-white font-black text-sm uppercase tracking-widest gold-text">{title}</h3>
                </div>
                <button onClick={onClose} type="button" className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-all active:scale-90 z-[210] relative cursor-pointer">
                    <X className="text-slate-400" size={20}/>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                {children}
            </div>
        </div>
    </div>
);

export default Referral;
