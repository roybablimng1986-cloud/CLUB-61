
import React, { useState, useEffect } from 'react';
import NavBar from './components/NavBar';
import DownloadBanner from './components/DownloadBanner';
import Home from './pages/Home';
import WinGo from './pages/WinGo';
import Aviator from './pages/Aviator';
import Mines from './pages/Mines';
import DragonTiger from './pages/DragonTiger';
import Roulette from './pages/Roulette';
import SicBo from './pages/SicBo';
import Baccarat from './pages/Baccarat';
import StreetRace from './pages/StreetRace';
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
import MotoRacing from './pages/MotoRacing';
import Penalty from './pages/Penalty';
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
import DogRoad from './pages/DogRoad';
import LiveChat from './pages/LiveChat';
import Vortex from './pages/Vortex';
import SlotMachine from './pages/SlotMachine';
import AndarBahar from './pages/AndarBahar';
import GameResultPopup from './components/GameResultPopup';
import { View, UserProfile, GameResult } from './types';
import { subscribeToBalance, startGlobalEngines, stopAllSounds } from './services/mockFirebase';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('HOME');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { 
      startGlobalEngines(); 
  }, []);

  useEffect(() => { 
      stopAllSounds(); 
  }, [currentView]);

  useEffect(() => {
    const unsubscribe = subscribeToBalance((updatedUser) => {
        setUser(updatedUser);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
      case 'GAME_STREET_RACE': return <StreetRace onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_VAULT': return <VaultBreaker onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_FRUIT_SLOT': return <FruitSlot onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_EGYPT_SLOT': return <EgyptSlot onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_DICE': return <DiceDuel onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_MOTO_RACING': return <MotoRacing onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_PLINKO': return <Plinko onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_LIMBO': return <Limbo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_HILO': return <HiLo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_DRAGON_TOWER': return <DragonTower onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_KENO': return <Keno onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_HEAD_TAILS': return <HeadTails onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_BURST': return <CyberBurst onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_DOG': return <DogRoad onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_VORTEX': return <Vortex onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_PENALTY': return <Penalty onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_CRICKET': return <Cricket onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_TOWER': return <Tower onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_SLOT_MACHINE': return <SlotMachine onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_ANDAR_BAHAR': return <AndarBahar onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
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
      {showNavBar && <DownloadBanner />}
      {renderContent()}
      <GameResultPopup result={gameResult} onClose={() => setGameResult(null)} />
      {showNavBar && <NavBar currentView={currentView} setView={setCurrentView} />}
    </div>
  );
}
