import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { updateBalance, playSound, getMuteStatus, toggleMute } from '../services/supabaseService';

interface CustomGameWrapperProps {
  game: {
    id: string;
    name: string;
    banner: string;
    link: string;
  };
  onBack: () => void;
  userBalance: number;
  userId?: string;
  username?: string;
}

const CustomGameWrapper: React.FC<CustomGameWrapperProps> = ({ game, onBack, userBalance, userId, username }) => {
  const [muted, setMuted] = useState(getMuteStatus());
  const [showSimulator, setShowSimulator] = useState(true);
  const [simWinAmount, setSimWinAmount] = useState('100');
  const [simBetAmount, setSimBetAmount] = useState('50');
  const [logs, setLogs] = useState<string[]>(['Gateway initialized. Listening for real-time events...']);

  const [iframeUrl] = useState(() => {
    try {
      const url = new URL(game.link);
      url.searchParams.set('balance', String(userBalance));
      if (userId) {
        url.searchParams.set('userId', userId);
        url.searchParams.set('uid', userId);
      }
      if (username) {
        url.searchParams.set('username', username);
      }
      return url.toString();
    } catch (e) {
      const separator = game.link.includes('?') ? '&' : '?';
      let finalLink = game.link;
      if (!finalLink.includes('balance=')) {
        finalLink += `${separator}balance=${userBalance}`;
      }
      if (userId && !finalLink.includes('userId=') && !finalLink.includes('uid=')) {
        finalLink += `&userId=${userId}&uid=${userId}`;
      }
      if (username && !finalLink.includes('username=')) {
        finalLink += `&username=${encodeURIComponent(username)}`;
      }
      return finalLink;
    }
  });

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  };

  // Sound toggle handler
  const handleToggleMute = () => {
    const nextMute = toggleMute();
    setMuted(nextMute);
    playSound('click');
  };

  // Real-time Event Listener for external postMessage integrations
  useEffect(() => {
    const handleMessageEvent = async (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      // Handle balance request from iframe
      if (
        data.type === 'CLUB99_GET_BALANCE' || 
        data.type === 'GET_BALANCE' || 
        data.type === 'REQUEST_BALANCE' ||
        data.action === 'get_balance' ||
        data.action === 'getBalance'
      ) {
        addLog("Iframe requested balance - Sending current balance");
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
          const payloads = [
            { type: 'CLUB99_BALANCE_UPDATE', balance: userBalance },
            { type: 'UPDATE_BALANCE', balance: userBalance },
            { type: 'BALANCE_UPDATE', balance: userBalance },
            { type: 'setBalance', balance: userBalance },
            { balance: userBalance }
          ];
          payloads.forEach(p => iframe.contentWindow!.postMessage(p, '*'));
        }
      }

      // Handle win events
      if (
        data.type === 'CLUB99_GAME_WIN' || 
        data.type === 'ADD_BALANCE' || 
        data.type === 'GAME_WIN' || 
        data.action === 'win'
      ) {
        const amount = Number(data.amount || data.val || 0);
        if (amount > 0) {
          addLog(`Real-time WIN detected: +₹${amount}`);
          playSound('win');
          await updateBalance(amount, 'WIN', `Custom Game: ${game.name} Win`);
        }
      }

      // Handle bet/deduct events
      if (
        data.type === 'CLUB99_GAME_BET' || 
        data.type === 'DEDUCT_BALANCE' || 
        data.type === 'GAME_BET' || 
        data.action === 'bet'
      ) {
        const amount = Number(data.amount || data.val || 0);
        if (amount > 0) {
          addLog(`Real-time BET detected: -₹${amount}`);
          playSound('bet_place');
          await updateBalance(-amount, 'BET', `Custom Game: ${game.name} Bet`);
        }
      }
    };

    window.addEventListener('message', handleMessageEvent);
    return () => window.removeEventListener('message', handleMessageEvent);
  }, [game.name, userBalance]);

  // Synchronize balance updates to the iframe in real-time
  useEffect(() => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      const payloads = [
        { type: 'CLUB99_BALANCE_UPDATE', balance: userBalance },
        { type: 'UPDATE_BALANCE', balance: userBalance },
        { type: 'BALANCE_UPDATE', balance: userBalance },
        { type: 'setBalance', balance: userBalance },
        { balance: userBalance }
      ];
      payloads.forEach(p => iframe.contentWindow!.postMessage(p, '*'));
    }
  }, [userBalance]);

  // Handle simulated win
  const triggerSimulatedWin = async () => {
    const amount = parseFloat(simWinAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid win amount');
      return;
    }
    playSound('win');
    addLog(`Simulated Win of ₹${amount} sent to App Balance`);
    await updateBalance(amount, 'WIN', `Custom Game: ${game.name} Win`);
  };

  // Handle simulated bet/loss
  const triggerSimulatedBet = async () => {
    const amount = parseFloat(simBetAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }
    if (amount > userBalance) {
      alert('Insufficient Balance for this simulation');
      return;
    }
    playSound('loss');
    addLog(`Simulated Bet of ₹${amount} deducted from App Balance`);
    await updateBalance(-amount, 'BET', `Custom Game: ${game.name} Bet`);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0f1d] overflow-hidden relative">
      {/* Top Header */}
      <div className="bg-[#111827] p-4 flex items-center justify-between border-b border-yellow-500/20 shadow-lg z-50">
        <div className="flex items-center gap-3">
          <button 
            id="custom-game-back"
            onClick={onBack} 
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl active:scale-90 transition-all text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-black gold-text uppercase leading-none">{game.name}</h1>
            <span className="text-[8px] text-green-400 mt-1 uppercase font-bold tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Live Gateway Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle Emoji Button */}
          <button 
            id="custom-game-sound-toggle"
            onClick={handleToggleMute}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-2xl text-base active:scale-90 transition-all flex items-center gap-1 select-none"
            title={muted ? 'Unmute game sound' : 'Mute game sound'}
          >
            <span>{muted ? '🔇' : '🔊'}</span>
          </button>

          {/* Wallet Balance Display */}
          <div className="flex items-center gap-2 bg-[#0f172a] px-3 py-1.5 rounded-2xl border border-yellow-500/20 shadow-inner">
            <Wallet size={14} className="text-yellow-500" />
            <span className="text-sm font-black text-white">₹{userBalance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Main Iframe Container styled to clip Lovable watermark and footers */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <iframe 
          src={iframeUrl} 
          title={game.name}
          className="absolute inset-x-0 top-0 w-full border-0 bg-slate-900"
          style={{ height: 'calc(100% + 56px)', marginBottom: '-56px' }}
          allow="autoplay; clipboard-write; encrypted-media"
          referrerPolicy="no-referrer"
          onLoad={() => {
            const iframe = document.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
              const sendBalance = (bal: number) => {
                const payloads = [
                  { type: 'CLUB99_BALANCE_UPDATE', balance: bal },
                  { type: 'UPDATE_BALANCE', balance: bal },
                  { type: 'BALANCE_UPDATE', balance: bal },
                  { type: 'setBalance', balance: bal },
                  { balance: bal }
                ];
                payloads.forEach(p => iframe.contentWindow!.postMessage(p, '*'));
              };
              sendBalance(userBalance);
              addLog("Iframe loaded - Synchronized current balance");
            }
          }}
        />
      </div>
    </div>
  );
};

export default CustomGameWrapper;
