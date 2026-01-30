
import React, { useState } from 'react';
import { Lock, Smartphone, User, Mail } from 'lucide-react';
import { login, register } from '../services/mockFirebase';
import Logo from '../components/Logo';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    
    if (!phone || !email || !password) {
        setError('Phone, Email and Password are required');
        setLoading(false);
        return;
    }

    if (isLogin) {
        const res = await login(phone, email, password);
        if (!res.success) setError(res.message || 'Invalid credentials');
    } else {
        if (!username) { setError('Username is required'); setLoading(false); return; }
        const res = await register(phone, email, password, inviteCode, username);
        if (!res.success) setError(res.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-yellow-500/10 to-transparent"></div>
        
        <div className="w-full max-w-md bg-[#111827] rounded-3xl p-8 shadow-2xl relative z-10 border border-slate-800">
            <div className="flex flex-col items-center mb-8">
                <Logo size={100} className="mb-4" />
                <h1 className="text-3xl font-black text-white italic tracking-tighter gold-text uppercase">MAFIA CLUB</h1>
                <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-[0.3em]">The Elite Underworld Arena</p>
            </div>

            <div className="flex bg-[#0a0f1d] p-1 rounded-full mb-6 border border-slate-800">
                <button 
                    onClick={() => setIsLogin(true)} 
                    className={`flex-1 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${isLogin ? 'bg-yellow-600 text-black shadow-lg shadow-yellow-500/20' : 'text-slate-500'}`}
                >
                    Log In
                </button>
                <button 
                    onClick={() => setIsLogin(false)} 
                    className={`flex-1 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${!isLogin ? 'bg-yellow-600 text-black shadow-lg shadow-yellow-500/20' : 'text-slate-500'}`}
                >
                    Register
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-[#0a0f1d] rounded-xl flex items-center px-4 py-3 border border-slate-800 focus-within:border-yellow-500/50 transition-all">
                    <Smartphone size={18} className="text-slate-500 mr-3"/>
                    <span className="text-slate-500 mr-2 text-sm font-bold">+91</span>
                    <input 
                        type="tel" 
                        className="bg-transparent text-white w-full outline-none font-bold" 
                        placeholder="Phone Number" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)}
                    />
                </div>

                <div className="bg-[#0a0f1d] rounded-xl flex items-center px-4 py-3 border border-slate-800 focus-within:border-yellow-500/50 transition-all">
                    <Mail size={18} className="text-slate-500 mr-3"/>
                    <input 
                        type="email" 
                        className="bg-transparent text-white w-full outline-none font-bold" 
                        placeholder="Email Address" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)}
                    />
                </div>

                {!isLogin && (
                    <div className="bg-[#0a0f1d] rounded-xl flex items-center px-4 py-3 border border-slate-800 focus-within:border-yellow-500/50 transition-all">
                        <User size={18} className="text-slate-500 mr-3"/>
                        <input 
                            type="text" 
                            className="bg-transparent text-white w-full outline-none font-bold" 
                            placeholder="Username" 
                            value={username} 
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>
                )}

                <div className="bg-[#0a0f1d] rounded-xl flex items-center px-4 py-3 border border-slate-800 focus-within:border-yellow-500/50 transition-all">
                    <Lock size={18} className="text-slate-500 mr-3"/>
                    <input 
                        type="password" 
                        className="bg-transparent text-white w-full outline-none font-bold" 
                        placeholder="Password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>

                {!isLogin && (
                    <div className="bg-[#0a0f1d] rounded-xl flex items-center px-4 py-3 border border-slate-800 focus-within:border-yellow-500/50 transition-all">
                        <Mail size={18} className="text-slate-500 mr-3"/>
                        <input 
                            type="text" 
                            className="bg-transparent text-white w-full outline-none font-bold" 
                            placeholder="Invite Code (Optional)" 
                            value={inviteCode} 
                            onChange={e => setInviteCode(e.target.value)}
                        />
                    </div>
                )}

                {error && <p className="text-red-500 text-[10px] text-center font-black uppercase tracking-widest">{error}</p>}

                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black py-4 rounded-xl shadow-xl shadow-yellow-500/10 mt-6 active:scale-95 transition-all uppercase tracking-widest text-sm"
                >
                    {loading ? 'Authenticating...' : (isLogin ? 'Enter Club' : 'Join Club')}
                </button>
            </form>
            
            <p className="text-center text-[10px] text-slate-600 mt-8 uppercase font-bold tracking-widest">Mafia Access Only</p>
        </div>
    </div>
  );
};
export default Auth;
