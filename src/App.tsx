import React, { useState, useEffect } from 'react';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import WinGo from './pages/WinGo';
import Aviator from './pages/Aviator';
import Mines from './pages/Mines';
import DogRoad from './pages/DogRoad';
import Vortex from './pages/Vortex';
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
import { View, UserProfile, GameResult } from './types';
import { subscribeToBalance, startWinGoGame, checkAuth, stopAllSounds } from './services/mockFirebase';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('HOME');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { startWinGoGame(); }, []);
  useEffect(() => { stopAllSounds(); }, [currentView]);

  useEffect(() => {
    const unsubscribe = subscribeToBalance((updatedUser) => {
        setUser(updatedUser);
        setIsLoading(false);
    });
    const timer = setTimeout(() => { if (isLoading && !checkAuth()) setIsLoading(false); }, 3000);
    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);

  if (isLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user && currentView !== 'LOGIN' && currentView !== 'REGISTER') return <Auth />;

  const renderContent = () => {
    switch (currentView) {
      case 'HOME': return <Home setView={setCurrentView} />;
      case 'GAME_WINGO': return <WinGo onBack={() => setCurrentView('HOME')} userBalance={user!.balance} onResult={setGameResult} onDeposit={() => setCurrentView('DEPOSIT')} />;
      case 'GAME_AVIATOR': return <Aviator onBack={() => setCurrentView('HOME')} userBalance={user!.balance} onResult={setGameResult} />;
      case 'GAME_MINES': return <Mines onBack={() => setCurrentView('HOME')} userBalance={user!.balance} onResult={setGameResult} />;
      case 'GAME_DOG': return <DogRoad onBack={() => setCurrentView('HOME')} userBalance={user!.balance} onResult={setGameResult} />;
      case 'GAME_VORTEX': return <Vortex onBack={() => setCurrentView('HOME')} userBalance={user!.balance} onResult={setGameResult} />;
      case 'ACCOUNT': return <Profile user={user!} setView={setCurrentView} />;
      case 'REFERRAL': return <Referral />;
      case 'PROMOTION': return <Promotion />;
      case 'WALLET': return <Wallet setView={setCurrentView} userBalance={user!.balance} />;
      case 'DEPOSIT': return <Deposit onBack={() => setCurrentView('WALLET')} />;
      case 'WITHDRAW': return <Withdraw onBack={() => setCurrentView('WALLET')} userBalance={user!.balance} />;
      case 'SAFETY': return <SafetyCenter setView={setCurrentView} user={user!} />;
      case 'STATISTICS': return <GameStatistics setView={setCurrentView} />;
      default: return <Home setView={setCurrentView} />;
    }
  };

  const showNavBar = ['HOME', 'REFERRAL', 'PROMOTION', 'WALLET', 'ACCOUNT'].includes(currentView);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0f172a] shadow-2xl relative overflow-hidden font-sans">
      {renderContent()}
      <GameResultPopup result={gameResult} onClose={() => setGameResult(null)} />
      {showNavBar && <NavBar currentView={currentView} setView={setCurrentView} />}
    </div>
  );
}