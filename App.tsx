
import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import WinGo from './pages/WinGo';
import Aviator from './pages/Aviator';
import Mines from './pages/Mines';
import DragonTiger from './pages/DragonTiger';
import Roulette from './pages/Roulette';
import SicBo from './pages/SicBo';
import Baccarat from './pages/Baccarat';
import VaultBreaker from './pages/VaultBreaker';
import HeadTails from './pages/HeadTails';
import Limbo from './pages/Limbo';
import Plinko from './pages/Plinko';
import HiLo from './pages/HiLo';
import DragonTower from './pages/DragonTower';
import Keno from './pages/Keno';
import DiceDuel from './pages/DiceDuel';
import FruitSlot from './pages/FruitSlot';
import EgyptSlot from './pages/EgyptSlot';
import Cricket from './pages/Cricket';
import Tower from './pages/Tower';
import Profile from './pages/Profile';
import Referral from './pages/Referral';
import Promotion from './pages/Promotion';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Wallet from './pages/Wallet';
import SafetyCenter from './pages/SafetyCenter';
import GameStatistics from './pages/GameStatistics';
import BindingRewards from './pages/BindingRewards';
import Auth from './pages/Auth';
import Leaderboard from './pages/Leaderboard';
import CyberBurst from './pages/CyberBurst';
import LiveChat from './pages/LiveChat';
import Vortex from './pages/Vortex';
import LuckyWheel from './pages/LuckyWheel';
import SlotMachine from './pages/SlotMachine';
import AndarBahar from './pages/AndarBahar';
import SevenUpDown from './pages/SevenUpDown';
import SpaceRaid from './pages/SpaceRaid';
import JhandiMunda from './pages/JhandiMunda';
import GiftCode from './pages/GiftCode';
import GameResultPopup from './components/GameResultPopup';
import { View, UserProfile, GameResult } from './types';
import { subscribeToBalance, stopAllSounds, adminCreateGiftCode, db } from './services/supabaseService';
import { doc, getDoc } from 'firebase/firestore';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('HOME');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { 
      // Create ₹500 Gift Code
      const initializeGiftCode = async () => {
        const giftRef = doc(db, 'gift_codes', 'MAFIA500');
        const snap = await getDoc(giftRef);
        if (!snap.exists()) {
          adminCreateGiftCode({
            code: 'MAFIA500',
            amount: 500,
            limit: 1000,
            usedCount: 0,
            minVip: 0,
            createdAt: Date.now()
          });
        }
      };
      initializeGiftCode();
  }, []);

  useEffect(() => { 
      stopAllSounds(); 
  }, [currentView]);

  useEffect(() => {
    const unsubscribe = subscribeToBalance((updatedUser) => {
        setUser(updatedUser);
        setIsLoading(false);
    }, (err) => {
        setError(err);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (error) {
    const isApiDisabled = error.includes('firestore.googleapis.com') || error.includes('disabled');
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-6 text-center">
        <div className="bg-slate-900 border border-red-500/30 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="text-red-500" size={32} />
          </div>
          <h2 className="text-xl font-black text-white mb-4 uppercase italic">Database Error</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            {isApiDisabled 
              ? "The Cloud Firestore API is not enabled in your Firebase project. This is required for the app to function."
              : "We encountered a problem connecting to the database. Please check your connection or configuration."}
          </p>
          {isApiDisabled && (
            <a 
              href="https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=sikka92-ab1dc" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all mb-3"
            >
              ENABLE API NOW
            </a>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all"
          >
            RETRY
          </button>
          <p className="mt-4 text-[10px] text-slate-600 font-mono break-all">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user && currentView !== 'LOGIN' && currentView !== 'REGISTER') {
    return <Auth />;
  }

  const renderContent = () => {
    if (!user) return <Auth />;
    
    switch (currentView) {
      case 'HOME': return <Home setView={setCurrentView} />;
      case 'GAME_WINGO': return <WinGo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} setView={setCurrentView} />;
      case 'GAME_AVIATOR': return <Aviator onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_MINES': return <Mines onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_DRAGON_TIGER': return <DragonTiger onBack={() => setCurrentView('HOME')} userBalance={user.balance} username={user.username} onResult={setGameResult} />;
      case 'GAME_ROULETTE': return <Roulette onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_SICBO': return <SicBo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_BACCARAT': return <Baccarat onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_VAULT': return <VaultBreaker onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_FRUIT_SLOT': return <FruitSlot onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_EGYPT_SLOT': return <EgyptSlot onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_DICE': return <DiceDuel onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_PLINKO': return <Plinko onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_LIMBO': return <Limbo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_HILO': return <HiLo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_DRAGON_TOWER': return <DragonTower onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_KENO': return <Keno onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_HEAD_TAILS': return <HeadTails onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_BURST': return <CyberBurst onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_VORTEX': return <Vortex onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_LUCKY_WHEEL': return <LuckyWheel onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_CRICKET': return <Cricket onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_TOWER': return <Tower onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_SLOT_MACHINE': return <SlotMachine onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_ANDAR_BAHAR': return <AndarBahar onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_7UP_DOWN': return <SevenUpDown onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
    case 'GAME_SPACE_RAID': return <SpaceRaid onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_JHANDI_MUNDA': return <JhandiMunda onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GIFT_CODE': return <GiftCode onBack={() => setCurrentView('HOME')} userBalance={user.balance} />;
      case 'LEADERBOARD': return <Leaderboard onBack={() => setCurrentView('HOME')} />;
      case 'CHAT': return <LiveChat onBack={() => setCurrentView('HOME')} />;
      case 'ACCOUNT': return <Profile user={user} setView={setCurrentView} />;
      case 'REFERRAL': return <Referral user={user} />;
      case 'PROMOTION': return <Promotion />;
      case 'WALLET': return <Wallet setView={setCurrentView} userBalance={user.balance} />;
      case 'DEPOSIT': return <Deposit onBack={() => setCurrentView('WALLET')} />;
      case 'WITHDRAW': return <Withdraw onBack={() => setCurrentView('WALLET')} userBalance={user.balance} />;
      case 'SAFETY': return <SafetyCenter setView={setCurrentView} user={user} />;
      case 'STATISTICS': return <GameStatistics setView={setCurrentView} />;
      case 'REWARDS_HUB': return <BindingRewards onBack={() => setCurrentView('ACCOUNT')} />;
      default: return <Home setView={setCurrentView} />;
    }
  };

  const showNavBar = ['HOME', 'REFERRAL', 'PROMOTION', 'WALLET', 'ACCOUNT'].includes(currentView);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0a0f1d] shadow-2xl relative overflow-hidden font-sans border-x border-white/5">
      {renderContent()}
      <GameResultPopup result={gameResult} onClose={() => setGameResult(null)} />
      {showNavBar && <NavBar currentView={currentView as View} setView={setCurrentView} />}
    </div>
  );
}
