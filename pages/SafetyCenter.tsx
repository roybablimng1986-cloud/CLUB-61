
import React, { useState } from 'react';
import { ArrowLeft, Key, ShieldCheck, ChevronRight, LogOut, X, Smartphone, Laptop } from 'lucide-react';
import { View, UserProfile } from '../types';
import { setWithdrawalPassword } from '../services/mockFirebase';

interface SafetyProps {
    setView: (view: View) => void;
    user: UserProfile;
}

const SafetyCenter: React.FC<SafetyProps> = ({ setView, user }) => {
    // Modals
    const [showWithdrawPasswordModal, setShowWithdrawPasswordModal] = useState(false);
    const [showLoginPasswordModal, setShowLoginPasswordModal] = useState(false);
    const [showDeviceModal, setShowDeviceModal] = useState(false);

    // Withdraw Password State
    const [newWithdrawPassword, setNewWithdrawPassword] = useState('');
    const [confirmWithdrawPassword, setConfirmWithdrawPassword] = useState('');
    const [msg, setMsg] = useState('');

    const isWithdrawPasswordSet = !!user.withdrawalPassword;

    // Device Management Dummy State
    const [devices, setDevices] = useState([
        { id: 1, name: 'Current Session', type: 'mobile', status: 'Online', lastActive: 'Now' },
        { id: 2, name: 'Chrome - Linux', type: 'laptop', status: 'Offline', lastActive: '3 hours ago' }
    ]);

    /* Fix: Update handleSetWithdrawPassword to be async to handle the database update */
    const handleSetWithdrawPassword = async () => {
        if (newWithdrawPassword.length !== 6 || !/^\d{6}$/.test(newWithdrawPassword)) {
            setMsg('PIN must be exactly 6 digits.');
            return;
        }
        if (newWithdrawPassword !== confirmWithdrawPassword) {
            setMsg('Passwords do not match.');
            return;
        }
        /* Fix: Await the setWithdrawalPassword call */
        const success = await setWithdrawalPassword(newWithdrawPassword);
        if (success) {
            setMsg('Security PIN set successfully!');
            setTimeout(() => {
                setShowWithdrawPasswordModal(false);
                setMsg('');
                setNewWithdrawPassword('');
                setConfirmWithdrawPassword('');
            }, 1500);
        } else {
            setMsg('Failed to update PIN. Please try again.');
        }
    };

    const handleRemoveDevice = (id: number) => {
        setDevices(devices.filter(d => d.id !== id));
    };

    return (
        <div className="bg-[#0f172a] min-h-screen font-sans text-white">
            <div className="bg-[#1e293b] p-4 flex items-center gap-4 border-b border-slate-700 shadow-lg">
                <button onClick={() => setView('ACCOUNT')} className="p-2 bg-slate-800 rounded-xl"><ArrowLeft className="text-white" /></button>
                <h1 className="text-lg font-black uppercase gold-text italic tracking-widest">Safety Hub</h1>
            </div>

            <div className="p-4 space-y-4">
                <div className="bg-[#1e293b] rounded-xl overflow-hidden border border-slate-700/50 shadow-lg">
                    <div onClick={() => setShowLoginPasswordModal(true)}>
                        <MenuItem icon={Key} label="Login Credentials" subtitle="Active account security key" />
                    </div>
                    <div className="h-[1px] bg-slate-700/50 mx-14"></div>
                    <div onClick={() => setShowWithdrawPasswordModal(true)}>
                        <MenuItem 
                            icon={ShieldCheck} 
                            label="Withdrawal PIN" 
                            subtitle={isWithdrawPasswordSet ? "Security PIN is active" : "Verification required for cashouts"} 
                            value={isWithdrawPasswordSet ? "SECURED" : "SETUP"}
                            color={isWithdrawPasswordSet ? "text-green-500" : "text-yellow-500"}
                        />
                    </div>
                </div>

                <div className="bg-[#1e293b] rounded-xl overflow-hidden border border-slate-700/50">
                     <div onClick={() => setShowDeviceModal(true)}>
                        <MenuItem icon={Smartphone} label="Connected Devices" subtitle="Session and device management" />
                     </div>
                </div>
            </div>

            {/* Withdraw Password Modal */}
            {showWithdrawPasswordModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
                    <div className="bg-[#1e293b] w-full max-w-sm rounded-[2rem] p-8 border border-slate-700 shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-white font-black text-sm uppercase tracking-widest gold-text">Setup Secure PIN</h3>
                            <button onClick={() => setShowWithdrawPasswordModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X className="text-slate-400" size={18}/></button>
                        </div>
                        
                        {isWithdrawPasswordSet ? (
                            <div className="text-center py-6">
                                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/30">
                                    <ShieldCheck size={40} className="text-green-500"/>
                                </div>
                                <h4 className="text-white font-black text-xl mb-3">Verified Active</h4>
                                <p className="text-slate-400 text-sm leading-relaxed px-4">
                                    Your withdrawal PIN is encrypted and active. It will be required for all future cashouts.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">New 6-Digit PIN</label>
                                    <input 
                                        type="tel" 
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        value={newWithdrawPassword}
                                        onChange={(e) => setNewWithdrawPassword(e.target.value.replace(/\D/g,''))}
                                        className="w-full bg-[#0a0f1d] h-14 rounded-2xl border border-slate-700 text-white text-center text-3xl font-bold tracking-[0.5em] outline-none focus:border-blue-500 shadow-inner"
                                        placeholder="000000"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Verify PIN</label>
                                    <input 
                                        type="tel" 
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        value={confirmWithdrawPassword}
                                        onChange={(e) => setConfirmWithdrawPassword(e.target.value.replace(/\D/g,''))}
                                        className="w-full bg-[#0a0f1d] h-14 rounded-2xl border border-slate-700 text-white text-center text-3xl font-bold tracking-[0.5em] outline-none focus:border-blue-500 shadow-inner"
                                        placeholder="000000"
                                    />
                                </div>

                                {msg && <p className={`text-[10px] font-black uppercase text-center tracking-widest ${msg.includes('success') ? 'text-green-500' : 'text-red-500'}`}>{msg}</p>}
                                
                                <button 
                                    onClick={handleSetWithdrawPassword}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-4"
                                >
                                    Activate Security PIN
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showLoginPasswordModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
                    <div className="bg-[#1e293b] w-full max-w-sm rounded-[2rem] p-8 border border-slate-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-white font-black text-sm uppercase tracking-widest gold-text">Security Vault</h3>
                            <button onClick={() => setShowLoginPasswordModal(false)} className="p-2 hover:bg-slate-800 rounded-full"><X className="text-slate-400" size={18}/></button>
                        </div>
                        <div className="bg-[#0f172a] p-8 rounded-3xl border border-slate-800 text-center shadow-inner">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Your Login Password</p>
                            <h2 className="text-3xl font-mono font-black text-blue-400 tracking-wider">{user.password}</h2>
                        </div>
                    </div>
                </div>
            )}

            {showDeviceModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] animate-in fade-in">
                    <div className="bg-[#1e293b] w-full max-w-md h-[70vh] rounded-t-[3rem] flex flex-col border-t border-slate-700 shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#1e293b] rounded-t-[3rem]">
                            <h3 className="font-black text-sm uppercase tracking-widest text-white gold-text">Active Sessions</h3>
                            <button onClick={() => setShowDeviceModal(false)} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700"><X size={20} className="text-slate-400"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {devices.map(device => (
                                <div key={device.id} className="bg-[#0f172a] p-5 rounded-2xl border border-slate-700 flex justify-between items-center shadow-md">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${device.status === 'Online' ? 'bg-green-500/10 text-green-500' : 'bg-slate-700 text-slate-400'}`}>
                                            {device.type === 'mobile' ? <Smartphone size={24}/> : <Laptop size={24}/>}
                                        </div>
                                        <div>
                                            <div className="font-black text-sm text-white flex items-center gap-2">
                                                {device.name}
                                                {device.status === 'Online' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">{device.status} • {device.lastActive}</div>
                                        </div>
                                    </div>
                                    {device.status !== 'Online' && (
                                        <button 
                                            onClick={() => handleRemoveDevice(device.id)}
                                            className="px-4 py-2 bg-red-600/10 text-red-500 text-[10px] font-black uppercase rounded-xl border border-red-500/20 active:scale-90"
                                        >
                                            Sign Out
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MenuItem = ({ icon: Icon, label, subtitle, value, color }: { icon: any, label: string, subtitle?: string, value?: string, color?: string }) => (
    <div className="flex items-center justify-between p-5 active:bg-slate-700/50 cursor-pointer hover:bg-slate-800/30 transition-colors group">
        <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                <Icon size={24} />
            </div>
            <div>
                <div className="text-sm font-black uppercase tracking-widest text-slate-200 group-hover:text-blue-200 transition-colors">{label}</div>
                {subtitle && <div className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">{subtitle}</div>}
            </div>
        </div>
        <div className="flex items-center gap-3">
            {value && <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-black/20 ${color || 'text-slate-400'}`}>{value}</span>}
            <ChevronRight size={18} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
        </div>
    </div>
);

export default SafetyCenter;
