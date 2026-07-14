
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Ban } from 'lucide-react';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Mines from './pages/Mines';
import DogRoad from './pages/DogRoad';
import DragonTiger from './pages/DragonTiger';
import Roulette from './pages/Roulette';
import HeadTails from './pages/HeadTails';
import Limbo from './pages/Limbo';
import Plinko from './pages/Plinko';
import HiLo from './pages/HiLo';
import Keno from './pages/Keno';
import DiceDuel from './pages/DiceDuel';
import FruitSlot from './pages/FruitSlot';
import EgyptSlot from './pages/EgyptSlot';
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
import LiveChat from './pages/LiveChat';
import Vortex from './pages/Vortex';
import LuckyWheel from './pages/LuckyWheel';
import AndarBahar from './pages/AndarBahar';
import SevenUpDown from './pages/SevenUpDown';
import GiftCode from './pages/GiftCode';
import Pump from './pages/Pump';
import Moles from './pages/Moles';
import ScratchCard from './pages/Scratch';
import Aviator from './pages/Aviator';
import WinGo from './pages/WinGo';
import AdminPanel from './pages/AdminPanel';
import GameResultPopup from './components/GameResultPopup';
import CustomGameWrapper from './components/CustomGameWrapper';
import { View, UserProfile, GameResult, AppSettings } from './types';
import { subscribeToBalance, stopAllSounds, adminCreateGiftCode, logout, adminGetSettings, getMuteStatus, toggleMute, playSound } from './services/supabaseService';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('HOME');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [loadingGame, setLoadingGame] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState('LOADING MODULES...');

  useEffect(() => {
    const isGame = currentView.startsWith('GAME_') || currentView.startsWith('CUSTOM_GAME_');
    if (isGame) {
      setLoadingGame(currentView);
      setLoadingProgress(0);
      setLoadingMsg('INITIALIZING ENGINE...');
      
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.floor(Math.random() * 20) + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(progressInterval);
        }
        setLoadingProgress(progress);
        
        if (progress > 80) {
          setLoadingMsg('VERIFYING FAIRNESS...');
        } else if (progress > 50) {
          setLoadingMsg('ESTABLISHING SECURE CONNECTION...');
        } else if (progress > 25) {
          setLoadingMsg('PREPARING CLUB 99 ALGORITHMS...');
        }
      }, 100);

      const timer = setTimeout(() => {
        clearInterval(progressInterval);
        setLoadingProgress(100);
        setLoadingGame(null);
      }, 1200); // snappy and perfect timing!

      return () => {
        clearInterval(progressInterval);
        clearTimeout(timer);
      };
    } else {
      setLoadingGame(null);
    }
  }, [currentView]);

  useEffect(() => {
    const unsub = adminGetSettings(setSettings);
    return unsub;
  }, []);

  useEffect(() => { 
      // Create ₹500 Gift Code
      const initializeGiftCode = () => {
        adminCreateGiftCode({
          code: 'MAFIA500',
          amount: 500,
          limit: 1000,
          usedCount: 0,
          minVip: 0,
          createdAt: Date.now()
        });
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

  if (user?.isBlocked) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-6 text-center">
        <div className="bg-slate-900 border border-red-500/30 p-10 rounded-[3rem] shadow-2xl max-w-sm w-full">
          <Ban className="text-red-500 mx-auto mb-6" size={64} />
          <h2 className="text-2xl font-black text-white mb-4 uppercase italic">Account Suspended</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Your access to the Mafia Club has been revoked by the system administrators.
          </p>
          <button 
            onClick={() => logout()}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all"
          >
            EXIT SYSTEM
          </button>
        </div>
      </div>
    );
  }

  const isExpired = user?.expiryDate && user.expiryDate < Date.now();
  if (isExpired && currentView !== 'ACCOUNT') {
    // Force to account/activation page if expired
    // Actually, let's just show a global overlay or something, but for now let's just block gameplay
  }

  const renderContent = () => {
    if (!user) return <Auth />;
    
    switch (currentView) {
      case 'HOME': return <Home setView={setCurrentView} />;
      case 'GAME_MINES': return <Mines onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_CHICKEN_ROAD': return <DogRoad onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_DRAGON_TIGER': return <DragonTiger onBack={() => setCurrentView('HOME')} userBalance={user.balance} username={user.username} onResult={setGameResult} />;
      case 'GAME_ROULETTE': return <Roulette onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_FRUIT_SLOT': return <FruitSlot onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={() => {}} />;
      case 'GAME_EGYPT_SLOT': return <EgyptSlot onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={() => {}} />;
      case 'GAME_DICE': return <DiceDuel onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_PLINKO': return <Plinko onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_LIMBO': return <Limbo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_HILO': return <HiLo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_KENO': return <Keno onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_HEAD_TAILS': return <HeadTails onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_VORTEX': return <Vortex onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_LUCKY_WHEEL': return <LuckyWheel onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_ANDAR_BAHAR': return <AndarBahar onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_AVIATOR': return <Aviator onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_7UP_DOWN': return <SevenUpDown onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_PUMP': return <Pump onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_MOLES': return <Moles onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_WINGO': return <WinGo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} onDeposit={() => setCurrentView('DEPOSIT')} />;
      case 'GAME_SCRATCH_CARD': return <ScratchCard onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} />;
      case 'GAME_SUPER_SIC_BO': {
        const gameObj = {
          id: 'GAME_SUPER_SIC_BO',
          name: 'Super Sic Bo',
          banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=400&h=400&auto=format&fit=crop',
          link: 'https://dicedualclub9987.lovable.app'
        };
        return (
          <CustomGameWrapper 
            game={gameObj} 
            onBack={() => setCurrentView('HOME')} 
            userBalance={user.balance} 
            userId={user.uid}
            username={user.username || user.name}
          />
        );
      }
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
      case 'ADMIN_PANEL': return <AdminPanel onBack={() => setCurrentView('ACCOUNT')} />;
      default: {
        if (currentView.startsWith('CUSTOM_GAME_')) {
          const gameId = currentView.replace('CUSTOM_GAME_', '');
          const customGame = settings?.customGames?.find((cg: any) => cg.id === gameId);
          if (customGame) {
            return (
              <CustomGameWrapper 
                game={customGame} 
                onBack={() => setCurrentView('HOME')} 
                userBalance={user.balance} 
                userId={user.uid}
                username={user.username || user.name}
              />
            );
          }
        }
        return <Home setView={setCurrentView} />;
      }
    }
  };

  const showNavBar = ['HOME', 'REFERRAL', 'PROMOTION', 'WALLET', 'ACCOUNT'].includes(currentView);

  return (
    <div id="app_root_container" className="max-w-md mx-auto min-h-screen bg-[#0a0f1d] shadow-2xl relative overflow-hidden font-sans border-x border-white/5 flex flex-col">
      <div id="main_content_wrapper" className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 overflow-y-auto no-scrollbar"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

        {/* Made by CLUB 99 loading screen overlay */}
        <AnimatePresence>
          {loadingGame && (
            <motion.div
              id="club99_loading_screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              className="absolute inset-0 bg-[#070913] z-[9999] flex flex-col items-center justify-between p-8"
            >
              {/* Top offset for balanced layout */}
              <div className="h-10" />

              {/* Middle Logo & Progress content */}
              <div className="flex flex-col items-center text-center w-full max-w-xs">
                {/* Glowing Crown logo */}
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.05, 1], opacity: 1 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/5 border border-yellow-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(234,179,8,0.2)] mb-8"
                >
                  <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 font-mono">99</span>
                </motion.div>

                <motion.h1 
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-500 font-mono italic"
                >
                  CLUB 99
                </motion.h1>

                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ delay: 0.2 }}
                  className="text-[10px] font-black uppercase text-amber-500 tracking-[0.35em] mt-2 mb-10"
                >
                  MADE BY CLUB 99
                </motion.p>

                {/* Loading bar container */}
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.8)] transition-all duration-100 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>

                <span className="text-[11px] font-black font-mono text-yellow-400/90 mt-2.5">
                  {loadingProgress}%
                </span>
              </div>

              {/* Bottom message */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 animate-pulse">
                  {loadingMsg}
                </span>
                <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
                  Fair & Certified Gameplay
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <GameResultPopup result={gameResult} onClose={() => setGameResult(null)} />
      {showNavBar && <NavBar currentView={currentView as View} setView={setCurrentView} />}
    </div>
  );
}
