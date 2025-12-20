
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
        { id: 1, name: 'Current Device', type: 'mobile', status: 'Online', lastActive: 'Now' },
        { id: 2, name: 'Android 13 - Chrome', type: 'mobile', status: 'Offline', lastActive: '2 days ago' }
    ]);

    const handleSetWithdrawPassword = () => {
        if (newWithdrawPassword.length !== 6 || isNaN(Number(newWithdrawPassword))) {
            setMsg('Password must be 6 digits.');
            return;
        }
        if (newWithdrawPassword !== confirmWithdrawPassword) {
            setMsg('Passwords do not match.');
            return;
        }
        const success = setWithdrawalPassword(newWithdrawPassword);
        if (success) {
            setMsg('Password set successfully!');
            setTimeout(() => {
                setShowWithdrawPasswordModal(false);
                setMsg('');
                setNewWithdrawPassword('');
                setConfirmWithdrawPassword('');
            }, 1500);
        }
    };

    const handleRemoveDevice = (id: number) => {
        setDevices(devices.filter(d => d.id !== id));
    };

    return (
        <div className="bg-[#0f172a] min-h-screen font-sans text-white">
            <div className="bg-[#1e293b] p-4 flex items-center gap-4 border-b border-slate-700">
                <button onClick={() => setView('ACCOUNT')}><ArrowLeft className="text-white" /></button>
                <h1 className="text-lg font-bold text-white">Safety Center</h1>
            </div>

            <div className="p-4 space-y-4">
                <div className="bg-[#1e293b] rounded-xl overflow-hidden border border-slate-700/50">
                    <div onClick={() => setShowLoginPasswordModal(true)}>
                        <MenuItem icon={Key} label="Login Password" subtitle="View your login credentials" />
                    </div>
                    <div className="h-[1px] bg-slate-700/50 mx-14"></div>
                    <div onClick={() => setShowWithdrawPasswordModal(true)}>
                        <MenuItem 
                            icon={ShieldCheck} 
                            label="Withdraw Password" 
                            subtitle={isWithdrawPasswordSet ? "Password already set" : "Set password for withdrawals"} 
                            value={isWithdrawPasswordSet ? "Set" : "Unset"}
                            color={isWithdrawPasswordSet ? "text-green-500" : "text-yellow-500"}
                        />
                    </div>
                </div>

                <div className="bg-[#1e293b] rounded-xl overflow-hidden border border-slate-700/50">
                     <div onClick={() => setShowDeviceModal(true)}>
                        <MenuItem icon={Smartphone} label="Device Management" subtitle="Manage logged in devices" />
                     </div>
                </div>
            </div>

            {/* Withdraw Password Modal */}
            {showWithdrawPasswordModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-[#1e293b] w-full max-w-sm rounded-2xl p-6 border border-slate-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white font-bold">Set Withdrawal Password</h3>
                            <button onClick={() => setShowWithdrawPasswordModal(false)}><X className="text-slate-400"/></button>
                        </div>
                        
                        {isWithdrawPasswordSet ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                                    <ShieldCheck size={32} className="text-green-500"/>
                                </div>
                                <h4 className="text-white font-bold text-lg mb-2">Password Set</h4>
                                <p className="text-slate-400 text-sm">
                                    You have already set your withdrawal password. For security reasons, it cannot be changed manually.
                                </p>
                                <p className="text-slate-500 text-xs mt-4">Contact customer support if you need assistance.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative">
                                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                                        <span>6-Digit PIN</span>
                                        <span>{newWithdrawPassword.length}/6</span>
                                    </div>
                                    <input 
                                        type="password" 
                                        maxLength={6}
                                        value={newWithdrawPassword}
                                        onChange={(e) => setNewWithdrawPassword(e.target.value.replace(/\D/g,''))}
                                        className="w-full bg-[#0f172a] h-14 rounded-xl border border-slate-600 text-white text-center text-3xl font-bold tracking-[0.5em] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-700"
                                        placeholder="••••••"
                                    />
                                </div>
                                
                                <div className="relative">
                                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                                        <span>Confirm PIN</span>
                                        <span>{confirmWithdrawPassword.length}/6</span>
                                    </div>
                                    <input 
                                        type="password" 
                                        maxLength={6}
                                        value={confirmWithdrawPassword}
                                        onChange={(e) => setConfirmWithdrawPassword(e.target.value.replace(/\D/g,''))}
                                        className="w-full bg-[#0f172a] h-14 rounded-xl border border-slate-600 text-white text-center text-3xl font-bold tracking-[0.5em] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-700"
                                        placeholder="••••••"
                                    />
                                </div>

                                {msg && <p className={`text-xs font-bold text-center ${msg.includes('success') ? 'text-green-500' : 'text-red-500'}`}>{msg}</p>}
                                
                                <button 
                                    onClick={handleSetWithdrawPassword}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold mt-2 shadow-lg active:scale-95 transition-transform"
                                >
                                    Save Password
                                </button>
                                <p className="text-center text-xs text-slate-500 mt-2">Note: You can only set this once.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Login Password View Modal */}
            {showLoginPasswordModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-[#1e293b] w-full max-w-sm rounded-2xl p-6 border border-slate-700 shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white font-bold">My Login Password</h3>
                            <button onClick={() => setShowLoginPasswordModal(false)}><X className="text-slate-400"/></button>
                        </div>
                        <div className="bg-[#0f172a] p-6 rounded-xl border border-slate-600 text-center">
                            <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Current Password</p>
                            <h2 className="text-3xl font-mono font-bold text-blue-400 tracking-wider">{user.password}</h2>
                        </div>
                        <p className="text-center text-xs text-slate-500 mt-4">This is the password you set during registration.</p>
                    </div>
                </div>
            )}

            {/* Device Management Modal */}
            {showDeviceModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-in fade-in">
                    <div className="bg-[#1e293b] w-full max-w-md h-[70vh] rounded-t-2xl sm:rounded-2xl flex flex-col border-t sm:border border-slate-700 shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#1e293b] rounded-t-2xl">
                            <h3 className="font-bold text-white">Device Management</h3>
                            <button onClick={() => setShowDeviceModal(false)} className="p-2 hover:bg-slate-700 rounded-full"><X size={20} className="text-slate-400"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {devices.map(device => (
                                <div key={device.id} className="bg-[#0f172a] p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${device.status === 'Online' ? 'bg-green-500/10 text-green-500' : 'bg-slate-700 text-slate-400'}`}>
                                            {device.type === 'mobile' ? <Smartphone size={20}/> : <Laptop size={20}/>}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-white flex items-center gap-2">
                                                {device.name}
                                                {device.status === 'Online' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                                            </div>
                                            <div className="text-xs text-slate-400">Status: {device.status} • {device.lastActive}</div>
                                        </div>
                                    </div>
                                    {device.status !== 'Online' && (
                                        <button 
                                            onClick={() => handleRemoveDevice(device.id)}
                                            className="px-3 py-1.5 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg border border-red-500/20 hover:bg-red-500/20"
                                        >
                                            Log Out
                                        </button>
                                    )}
                                </div>
                            ))}
                            {devices.length === 1 && (
                                <p className="text-center text-slate-500 text-xs pt-4">No other devices logged in.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MenuItem = ({ icon: Icon, label, subtitle, value, color }: { icon: any, label: string, subtitle?: string, value?: string, color?: string }) => (
    <div className="flex items-center justify-between p-4 active:bg-slate-700/50 cursor-pointer hover:bg-slate-800/30 transition-colors group">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Icon size={20} />
            </div>
            <div>
                <div className="text-sm font-bold text-white group-hover:text-blue-200 transition-colors">{label}</div>
                {subtitle && <div className="text-[10px] text-slate-500 group-hover:text-slate-400">{subtitle}</div>}
            </div>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className={`text-xs font-bold ${color || 'text-slate-400'}`}>{value}</span>}
            <ChevronRight size={16} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
        </div>
    </div>
);

export default SafetyCenter;
