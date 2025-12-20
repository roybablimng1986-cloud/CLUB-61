
import React, { useState, useEffect } from 'react';
import { Users, Copy, ChevronRight, BarChart3, CreditCard, QrCode, X, Phone, MessageCircle, Share2, FileText, User, CheckCircle2 } from 'lucide-react';
import { referralStats, getSubordinates, getCommissions, subscribeToBalance } from '../services/mockFirebase';

const Referral: React.FC = () => {
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
          title: 'Join my Team!',
          text: `Use my invite code ${referralStats.code} to register on Tiranga Games and win big!`,
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

  const handleServiceRedirect = (type: 'TELEGRAM' | 'WHATSAPP') => {
      const number = "919339409219";
      if (type === 'TELEGRAM') {
          window.open(`https://t.me/+${number}`, '_blank');
      } else {
          window.open(`https://wa.me/${number}`, '_blank');
      }
  };

  return (
    <div className="bg-[#0f172a] min-h-screen pb-24 font-sans relative">
      {/* Toast Notification */}
      {showToast && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 animate-in zoom-in fade-in duration-200">
              <CheckCircle2 className="text-green-500"/> Copied successfully
          </div>
      )}

      {/* Header Area */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 p-6 pt-8 pb-16 rounded-b-[2rem] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 p-20 bg-blue-800/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
        
        <h1 className="text-center font-bold text-lg mb-6 tracking-wide">Agency Center</h1>
        
        <div className="text-center mb-4 relative z-10">
            <h2 className="text-5xl font-bold mb-1 drop-shadow-md">₹{referralStats.yesterdayCommission.toFixed(2)}</h2>
            <p className="text-blue-100 text-xs bg-white/20 inline-block px-4 py-1 rounded-full backdrop-blur-sm">Yesterday's total commission</p>
        </div>
        <p className="text-center text-[10px] text-blue-100 opacity-80">Total Commission: ₹{referralStats.totalCommission.toFixed(2)}</p>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-10 relative z-10">
        <div className="bg-[#1e293b] rounded-xl overflow-hidden shadow-2xl mb-4 border border-slate-700/50">
            {/* Tabs */}
            <div className="flex border-b border-slate-700">
                <button 
                    onClick={() => setActiveTab('DIRECT')}
                    className={`flex-1 p-3 transition-colors ${activeTab === 'DIRECT' ? 'bg-blue-600/10 border-b-2 border-blue-500 text-blue-400' : 'bg-[#1e293b] text-slate-500'}`}
                >
                    <span className="text-xs font-bold">Direct subordinates</span>
                </button>
                <button 
                    onClick={() => setActiveTab('TEAM')}
                    className={`flex-1 p-3 transition-colors ${activeTab === 'TEAM' ? 'bg-blue-600/10 border-b-2 border-blue-500 text-blue-400' : 'bg-[#1e293b] text-slate-500'}`}
                >
                     <span className="text-xs font-bold">Team subordinates</span>
                </button>
            </div>
            
            {/* Data Grid */}
            <div className="grid grid-cols-2 text-center p-6 gap-y-6">
                <div>
                    <div className="text-xl font-bold text-white">
                        {activeTab === 'DIRECT' ? referralStats.directSubordinates : referralStats.teamSubordinates}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Number of register</div>
                </div>
                <div>
                    <div className="text-xl font-bold text-white">
                        {activeTab === 'DIRECT' ? referralStats.totalBetAmount.toFixed(0) : referralStats.totalBetAmount.toFixed(0)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Total Bet Amount</div>
                </div>
                <div>
                    <div className="text-green-500 text-xl font-bold">
                        {activeTab === 'DIRECT' ? '0' : '0'}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Deposit number</div>
                </div>
                 <div>
                    <div className="text-green-500 text-xl font-bold">
                        {activeTab === 'DIRECT' ? '0' : '0'}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">First Deposit</div>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-800">
                    <div className="text-yellow-500 text-xl font-bold">
                        ₹{activeTab === 'DIRECT' ? referralStats.totalDepositAmount.toFixed(2) : referralStats.totalDepositAmount.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Total Deposit amount</div>
                </div>
            </div>
        </div>

        {/* Action Button */}
        <button 
            onClick={handleShare}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 py-3 rounded-full text-white font-bold text-md shadow-lg shadow-blue-500/30 mb-6 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
            <Share2 size={18}/>
            INVITE LINK
        </button>

        {/* Menu Links */}
        <div className="space-y-3">
             <div onClick={() => handleCopy(referralStats.code)} className="bg-[#1e293b] p-4 rounded-xl flex items-center justify-between cursor-pointer active:bg-slate-700 transition-colors border border-slate-700/50 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Copy size={20} />
                    </div>
                    <span className="text-white font-medium text-sm">Copy invitation code</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs font-mono">{referralStats.code}</span>
                    <Copy size={14} className="text-slate-500" />
                </div>
            </div>

            <div onClick={() => setShowSubordinates(true)}>
                <MenuItem icon={BarChart3} label="Subordinate data" />
            </div>
            <div onClick={() => setShowCommissions(true)}>
                <MenuItem icon={CreditCard} label="Commission detail" />
            </div>
            <div onClick={() => setShowRules(true)}>
                <MenuItem icon={FileText} label="Invitation rules" />
            </div>
            <div onClick={() => setShowService(true)}>
                <MenuItem icon={Users} label="Agent line customer service" />
            </div>
        </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
          <FullPageModal title="Invitation Rules" onClose={() => setShowRules(false)}>
              <div className="text-slate-300 text-sm space-y-3">
                  <p>1. The invitee must register through your exclusive link or QR code.</p>
                  <p>2. Earn 50% commission on the deposit amount of your direct subordinates.</p>
                  <div className="bg-slate-800 p-3 rounded">
                      <p className="text-xs text-slate-400 mb-1">Direct Deposit Bonus</p>
                      <p className="font-bold text-green-400">50% of Deposit Amount</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded">
                      <p className="text-xs text-slate-400 mb-1">Betting Commission</p>
                      <p className="font-bold text-green-400">0.6% of Turnover</p>
                  </div>
                  <p>3. Settlements are processed daily.</p>
                  <p>4. Malicious arbitrage will result in account suspension.</p>
              </div>
          </FullPageModal>
      )}

      {/* Subordinate Modal */}
      {showSubordinates && (
          <FullPageModal title="Subordinate Data" onClose={() => setShowSubordinates(false)}>
              <div className="space-y-2">
                  {subordinates.map(sub => (
                      <div key={sub.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center">
                          <div>
                              <div className="flex items-center gap-2">
                                  <User size={14} className="text-blue-400"/>
                                  <span className="font-bold text-white text-sm">UID: {sub.uid}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">Deposit: ₹{sub.depositAmount} | Bet: ₹{sub.betAmount}</div>
                          </div>
                          <div className="text-right">
                              <div className="text-green-400 font-bold text-sm">+₹{sub.commission}</div>
                              <div className="text-[10px] text-slate-500">{sub.date}</div>
                          </div>
                      </div>
                  ))}
                  {subordinates.length === 0 && <div className="text-center text-slate-500 py-10">No subordinates yet.</div>}
              </div>
          </FullPageModal>
      )}

      {/* Commission Modal */}
      {showCommissions && (
          <FullPageModal title="Commission Details" onClose={() => setShowCommissions(false)}>
              <div className="space-y-2">
                  {commissions.map(com => (
                      <div key={com.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center">
                          <div>
                              <div className="font-bold text-white text-sm">{com.type}</div>
                              <div className="text-[10px] text-slate-400 mt-1">From UID: {com.fromUid}</div>
                          </div>
                          <div className="text-right">
                              <div className="text-green-400 font-bold text-sm">+₹{com.amount}</div>
                              <div className="text-[10px] text-slate-500">{com.date}</div>
                          </div>
                      </div>
                  ))}
                  {commissions.length === 0 && <div className="text-center text-slate-500 py-10">No commissions yet.</div>}
              </div>
          </FullPageModal>
      )}

      {/* Service Modal */}
      {showService && (
          <FullPageModal title="Agent Service" onClose={() => setShowService(false)}>
              <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                      <Users size={40} className="text-blue-400"/>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-6">Contact Agent Support</h3>
                  
                  <div className="w-full space-y-3">
                      <button onClick={() => handleServiceRedirect('TELEGRAM')} className="w-full bg-[#229ED9] text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                          <Phone size={18}/> Telegram
                      </button>
                      <button onClick={() => handleServiceRedirect('WHATSAPP')} className="w-full bg-[#25D366] text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                          <MessageCircle size={18}/> WhatsApp
                      </button>
                  </div>

                  <p className="text-slate-500 text-xs text-center mt-6">
                      Working Hours: 10:00 AM - 10:00 PM
                  </p>
              </div>
          </FullPageModal>
      )}
    </div>
  );
};

const MenuItem = ({ icon: Icon, label }: { icon: any, label: string }) => (
    <div className="bg-[#1e293b] p-4 rounded-xl flex items-center justify-between cursor-pointer active:bg-slate-700 transition-colors border border-slate-700/50 shadow-md">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-700/50 text-slate-300 flex items-center justify-center">
                <Icon size={20} />
            </div>
            <span className="text-white font-medium text-sm">{label}</span>
        </div>
        <ChevronRight size={18} className="text-slate-600" />
    </div>
);

const FullPageModal = ({ title, children, onClose }: { title: string, children?: React.ReactNode, onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div className="bg-[#1e293b] w-full max-w-md h-[80vh] rounded-t-2xl sm:rounded-2xl p-4 flex flex-col border-t border-slate-700">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                <h3 className="text-white font-bold">{title}</h3>
                <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full"><X className="text-slate-400"/></button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {children}
            </div>
        </div>
    </div>
);

export default Referral;
