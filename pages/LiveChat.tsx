
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, MessageCircle, ShieldCheck, User, Sparkles } from 'lucide-react';
import { subscribeToChat, sendChatMessage, subscribeToBalance } from '../services/mockFirebase';
import { ChatMessage, UserProfile } from '../types';

const LiveChat: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [user, setUser] = useState<UserProfile | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubUser = subscribeToBalance(u => setUser(u));
        const unsubChat = subscribeToChat(setMessages);
        return () => { unsubUser(); unsubChat(); };
    }, []);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !user) return;
        await sendChatMessage(input);
        setInput('');
    };

    return (
        <div className="bg-[#0a0f1d] min-h-screen flex flex-col font-sans text-white">
            <div className="p-4 bg-[#111827] flex items-center justify-between border-b border-white/5 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl active:scale-90"><ArrowLeft size={18}/></button>
                    <div>
                        <h1 className="font-black text-sm uppercase tracking-widest gold-text italic">Global Lounge</h1>
                        <p className="text-[8px] text-slate-500 uppercase font-black">Elite Community Active</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[8px] font-black text-green-500">LIVE</span>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-80">
                {messages.length > 0 ? messages.map((m) => (
                    <div key={m.id} className={`flex gap-3 ${m.uid === user?.uid ? 'flex-row-reverse' : ''}`}>
                        <img src={m.avatar} className="w-10 h-10 rounded-xl border border-white/10 shadow-lg shrink-0" />
                        <div className={`max-w-[75%] ${m.uid === user?.uid ? 'items-end' : ''} flex flex-col`}>
                            <div className="flex items-center gap-1.5 mb-1 px-1">
                                <span className={`text-[10px] font-black uppercase tracking-tighter ${m.uid === user?.uid ? 'text-blue-400' : 'text-slate-500'}`}>{m.username}</span>
                                {m.vip > 0 && <ShieldCheck size={10} className="text-yellow-500" />}
                            </div>
                            <div className={`p-4 rounded-2xl shadow-xl text-sm leading-relaxed ${m.uid === user?.uid ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-[#111827] text-slate-300 rounded-tl-none border border-white/5'}`}>
                                {m.text}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                        <MessageCircle size={64} className="mb-4" />
                        <p className="font-black uppercase tracking-widest text-xs">Awaiting Elite Dialogue...</p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-[#111827] border-t border-white/5 pb-10">
                <div className="flex items-center gap-3 bg-[#0a0f1d] rounded-2xl p-2 border border-slate-700 focus-within:border-blue-500/50 transition-all">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Join the conversation..."
                        className="flex-1 bg-transparent text-white px-3 py-2 outline-none text-sm font-medium"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="p-3 bg-blue-600 text-white rounded-xl shadow-lg disabled:opacity-50 disabled:grayscale transition-all active:scale-90"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveChat;
