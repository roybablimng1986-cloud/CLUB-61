
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { X, Send, Bot, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const AiSupportChat: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your official MAFIA CLUB AI Assistant. How can I help you with deposits, withdrawals, or gameplay today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          systemInstruction: `You are the Official MAFIA CLUB Support Bot. 
          MAFIA CLUB is an elite gaming platform. 
          Rules:
          1. Deposits: Min ₹20. Takes 5-10 mins.
          2. Withdrawals: Min ₹110. Takes 10-30 mins.
          3. VIP levels 1-5 offer special bonuses.
          Be professional and concise.`,
        }
      });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "Connection error." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Service unavailable." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#1e293b] w-full max-w-md h-[85vh] rounded-t-[3rem] flex flex-col border-t border-slate-700 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400"><Bot size={24} /></div>
             <div>
                <h3 className="text-white font-black text-sm uppercase tracking-widest">AI Concierge</h3>
                <span className="text-[9px] text-green-500 font-bold uppercase">Online</span>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:bg-slate-700 transition-colors"><X size={20}/></button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-xl' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>{m.text}</div>
            </div>
          ))}
          {loading && <div className="bg-slate-800 p-3 rounded-xl w-fit flex items-center gap-2"><Loader2 size={16} className="animate-spin text-blue-400"/><span className="text-xs text-slate-400">Typing...</span></div>}
        </div>

        <div className="p-6 bg-[#1e293b] border-t border-slate-800 pb-10">
          <div className="flex items-center gap-3 bg-[#0a0f1d] rounded-2xl p-2 border border-slate-700 focus-within:border-blue-500/50 transition-all">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask anything..." className="flex-1 bg-transparent text-white px-3 py-2 outline-none text-sm"/>
            <button onClick={handleSend} disabled={!input.trim() || loading} className="p-3 bg-blue-600 text-white rounded-xl active:scale-90 transition-all hover:bg-blue-500 disabled:opacity-50"><Send size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AiSupportChat;
