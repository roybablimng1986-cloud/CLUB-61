
import React, { useState, useEffect } from 'react';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import WinGo from './pages/WinGo';
import Aviator from './pages/Aviator';
import Mines from './pages/Mines';
import DogRoad from './pages/DogRoad';
import LuckyWheel from './pages/LuckyWheel';
import DragonTiger from './pages/DragonTiger';
import Plinko from './pages/Plinko';
import HeadTails from './pages/HeadTails';
import MotoRacing from './pages/MotoRacing';
import SlotMachine from './pages/SlotMachine';
import AndarBahar from './pages/AndarBahar';
import HiLo from './pages/HiLo';
import Limbo from './pages/Limbo';
import DragonTower from './pages/DragonTower';
import Keno from './pages/Keno';
import FruitSlot from './pages/FruitSlot';
import EgyptSlot from './pages/EgyptSlot';
import DiceDuel from './pages/DiceDuel';
import Roulette from './pages/Roulette';
import SicBo from './pages/SicBo';
import Baccarat from './pages/Baccarat';
import StreetRace from './pages/StreetRace';
import VaultBreaker from './pages/VaultBreaker';
import BindingRewards from './pages/BindingRewards';
import Profile from './pages/Profile';
import Referral from './pages/Referral';
import Promotion from './pages/Promotion';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Wallet from './pages/Wallet';
import SafetyCenter from './pages/SafetyCenter';
import GameStatistics from './pages/GameStatistics';
import Auth from './pages/Auth';
import GameResultPopup from './components/GameResultPopup';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { View, UserProfile, GameResult } from './types';
import { subscribeToBalance, startWinGoGame, stopAllSounds, startDragonTigerGame } from './services/mockFirebase';

const LoadingScreen = () => (
    <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center p-10 animate-in fade-in duration-700">
        <div className="relative mb-12">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="w-32 h-32 bg-[#111827] rounded-[2.5rem] border-2 border-yellow-500/30 flex items-center justify-center shadow-2xl relative z-10 animate-in zoom-in duration-1000">
                <ShieldAlert size={64} className="text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
            </div>
        </div>
        <h1 className="text-4xl font-black italic tracking-tighter text-white gold-text uppercase mb-2">MAFIA CLUB</h1>
        <p className="text-slate-500 font-black text-[10px] tracking-[0.4em] mb-10 uppercase">Elite High-Stakes Arena</p>
        <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 animate-[loading_2s_ease-in-out_infinite]"></div>
        </div>
        <style>{`
            @keyframes loading {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `}</style>
    </div>
);

export default function App() {
  const [currentView, setCurrentView] = useState<View>('HOME');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { 
      startWinGoGame(); 
      startDragonTigerGame();
      // Artificial delay for loading screen as requested
      const timer = setTimeout(() => setIsLoading(false), 2500);
      return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToBalance((updatedUser) => {
        setUser(updatedUser);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Auth />;

  const renderContent = () => {
    switch (currentView) {
      case 'HOME': return <Home setView={setCurrentView} />;
      case 'REWARDS_HUB': return <BindingRewards onBack={() => setCurrentView('HOME')} />;
      case 'GAME_BACCARAT': return <Baccarat onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_STREET_RACE': return <StreetRace onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_VAULT': return <VaultBreaker onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_ROULETTE': return <Roulette onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_SICBO': return <SicBo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_WINGO': return <WinGo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} onDeposit={() => setCurrentView('DEPOSIT')} />;
      case 'GAME_AVIATOR': return <Aviator onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_MINES': return <Mines onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_DOG': return <DogRoad onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_LUCKY_WHEEL': return <LuckyWheel onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_DRAGON_TIGER': return <DragonTiger onBack={() => setCurrentView('HOME')} userBalance={user.balance} username={user.username} onResult={setGameResult} />;
      case 'GAME_PLINKO': return <Plinko onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_HEAD_TAILS': return <HeadTails onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_MOTO_RACING': return <MotoRacing onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_SLOTS': return <SlotMachine onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_ANDAR_BAHAR': return <AndarBahar onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_HILO': return <HiLo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_LIMBO': return <Limbo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_DRAGON_TOWER': return <DragonTower onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_KENO': return <Keno onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_FRUIT_SLOT': return <FruitSlot onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_EGYPT_SLOT': return <EgyptSlot onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_DICE': return <DiceDuel onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'ACCOUNT': return <Profile user={user} setView={setCurrentView} />;
      case 'REFERRAL': return <Referral user={user} />;
      case 'PROMOTION': return <Promotion />;
      case 'WALLET': return <Wallet setView={setCurrentView} userBalance={user.balance} />;
      case 'DEPOSIT': return <Deposit onBack={() => setCurrentView('HOME')} />;
      case 'WITHDRAW': return <Withdraw onBack={() => setCurrentView('HOME')} userBalance={user.balance} />;
      case 'SAFETY': return <SafetyCenter setView={setCurrentView} user={user} />;
      case 'STATISTICS': return <GameStatistics setView={setCurrentView} />;
      default: return <Home setView={setCurrentView} />;
    }
  };

  const showNavBar = ['HOME', 'REFERRAL', 'PROMOTION', 'WALLET', 'ACCOUNT'].includes(currentView);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0a0f1d] shadow-2xl relative overflow-hidden font-sans">
      {renderContent()}
      <GameResultPopup result={gameResult} onClose={() => setGameResult(null)} />
      {showNavBar && <NavBar currentView={currentView} setView={setCurrentView} />}
    </div>
  );
}
