
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const DownloadBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const downloadLink = "https://drive.usercontent.google.com/download?id=10a5XSFgz9qUYaMdlGjvnRHyxOknThJ5f&export=download&authuser=0";

  useEffect(() => {
    const checkEnvironment = () => {
      // 1. Check for PWA Standalone mode (Chrome/Android/Desktop)
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      
      // 2. Check for iOS "Add to Home Screen"
      const isIOSStandalone = (window.navigator as any).standalone === true;
      
      // 3. Check for Common WebView indicators in User Agent
      // Android WebViews often include "wv" or "Version/X.X"
      const ua = navigator.userAgent;
      const isAndroidWebView = /wv|Version\/.*Chrome/i.test(ua) && /Mobile/i.test(ua);
      const isIosWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua);
      
      // 4. Check for URL parameters (Developers often wrap apps with ?mode=app or similar)
      const urlParams = new URLSearchParams(window.location.search);
      const isAppParam = urlParams.get('mode') === 'app' || urlParams.get('app') === 'true';

      // 5. Check for injected bridges (common in some APK wrappers)
      const hasAndroidInterface = (window as any).Android || (window as any).android;
      const hasWebkitInterface = (window as any).webkit && (window as any).webkit.messageHandlers;

      if (isPWA || isIOSStandalone || isAndroidWebView || isIosWebView || isAppParam || hasAndroidInterface || hasWebkitInterface) {
        setIsStandalone(true);
      }
    };

    checkEnvironment();
  }, []);

  // If detected as running inside the app OR manually closed, don't show anything
  if (!isVisible || isStandalone) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 p-3 flex items-center justify-between border-b border-white/10 shadow-2xl animate-in slide-in-from-top duration-500 z-[100] sticky top-0">
      <div className="flex items-center gap-3">
        <div className="bg-yellow-500 p-1.5 rounded-lg shadow-lg shadow-yellow-500/20">
          <Smartphone size={16} className="text-black" />
        </div>
        <div>
          <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Get the Mafia App</h4>
          <p className="text-[8px] text-blue-200 font-bold uppercase opacity-80">Experience elite stakes on mobile</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <a 
          href={downloadLink}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <Download size={12} />
          Download
        </a>
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1.5 text-blue-300 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default DownloadBanner;
