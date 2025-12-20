import React, { useState } from 'react';
import { Lock, Smartphone, User, Mail } from 'lucide-react';
import { login, register } from '../services/mockFirebase';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    if (isLogin) {
        const res = await login(phone, password);
        if (!res.success) setError(res.message || 'Invalid credentials');
    } else {
        if (!username) { setError('Username is required'); setLoading(false); return; }
        const res = await register(phone, password, inviteCode, username);
        if (!res.success) setError(res.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-600/20 to-transparent"></div>
        <div className="w-full max-w-md bg-[#1e293b] rounded-3xl p-8 shadow-2xl relative z-10 border border-slate-700">
            <h1 className="text-3xl font-black text-white italic text-center mb-8">Tiranga</h1>
            <div className="flex bg-[#0f172a] p-1 rounded-full mb-6">
                <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 rounded-full text-sm font-bold ${isLogin ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Log In</button>
                <button onClick={() => setIsLogin(false)} className={`flex-1 py-3 rounded-full text-sm font-bold ${!isLogin ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Register</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-[#0f172a] rounded-xl flex items-center px-4 py-3 border border-slate-700"><Smartphone size={18} className="text-slate-500 mr-3"/><input type="tel" className="bg-transparent text-white w-full outline-none" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)}/></div>
                {!isLogin && <div className="bg-[#0f172a] rounded-xl flex items-center px-4 py-3 border border-slate-700"><User size={18} className="text-slate-500 mr-3"/><input type="text" className="bg-transparent text-white w-full outline-none" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}/></div>}
                <div className="bg-[#0f172a] rounded-xl flex items-center px-4 py-3 border border-slate-700"><Lock size={18} className="text-slate-500 mr-3"/><input type="password" className="bg-transparent text-white w-full outline-none" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}/></div>
                {!isLogin && <div className="bg-[#0f172a] rounded-xl flex items-center px-4 py-3 border border-slate-700"><Mail size={18} className="text-slate-500 mr-3"/><input type="text" className="bg-transparent text-white w-full outline-none" placeholder="Invite Code (Optional)" value={inviteCode} onChange={e => setInviteCode(e.target.value)}/></div>}
                {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg mt-6">{loading ? 'Processing...' : (isLogin ? 'Log In' : 'Register')}</button>
            </form>
        </div>
    </div>
  );
};
export default Auth;