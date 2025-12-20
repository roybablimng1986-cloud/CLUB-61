
import React from 'react';
import { Home, Users, Gift, Wallet, User } from 'lucide-react';
import { View } from '../types';

interface NavBarProps {
  currentView: View;
  setView: (view: View) => void;
}

const NavBar: React.FC<NavBarProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: 'HOME', icon: Home, label: 'Home' },
    { id: 'REFERRAL', icon: Users, label: 'Referral' },
    { id: 'PROMOTION', icon: Gift, label: 'Promo' },
    { id: 'WALLET', icon: Wallet, label: 'Wallet' },
    { id: 'ACCOUNT', icon: User, label: 'Account' },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#1e293b] border-t border-slate-700 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={24} className={isActive ? 'fill-current' : ''} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NavBar;
