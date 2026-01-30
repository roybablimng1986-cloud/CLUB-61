
import React, { useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const DownloadBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const downloadLink = "https://drive.usercontent.google.com/download?id=10a5XSFgz9qUYaMdlGjvnRHyxOknThJ5f&export=download&authuser=0";

  if (!isVisible) return null;

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
