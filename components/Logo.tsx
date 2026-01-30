
import React from 'react';

const Logo: React.FC<{ size?: number; className?: string }> = ({ size = 64, className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#fde68a', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#d97706', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#fde68a', stopOpacity: 1 }} />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5"/>
          </filter>
        </defs>

        {/* Outer Rings (Tiranga Style) */}
        <circle cx="100" cy="100" r="95" stroke="#FF9933" strokeWidth="4" fill="none" opacity="0.8" />
        <circle cx="100" cy="100" r="90" stroke="#FFFFFF" strokeWidth="4" fill="none" opacity="0.9" />
        <circle cx="100" cy="100" r="85" stroke="#128807" strokeWidth="4" fill="none" opacity="0.8" />

        {/* Center Disc */}
        <circle cx="100" cy="100" r="80" fill="#0a0f1d" stroke="url(#goldGrad)" strokeWidth="2" />
        <circle cx="100" cy="100" r="75" fill="#000080" fillOpacity="0.1" />

        {/* Mafia Icon (Crown & Silhouette) */}
        <path 
            d="M60 110 L70 80 L100 95 L130 80 L140 110 H60 Z" 
            fill="url(#goldGrad)" 
            filter="url(#shadow)"
        />
        <circle cx="100" cy="75" r="8" fill="url(#goldGrad)" />
        <circle cx="70" cy="75" r="5" fill="url(#goldGrad)" />
        <circle cx="130" cy="75" r="5" fill="url(#goldGrad)" />
        
        {/* Underworld Silhouette (Fedora Hat Style) */}
        <path d="M75 130 Q100 115 125 130 L125 140 Q100 135 75 140 Z" fill="url(#goldGrad)" />
        <rect x="70" y="140" width="60" height="4" rx="2" fill="url(#goldGrad)" />

        {/* Circular Text Path */}
        <defs>
          <path id="textPath" d="M 30, 100 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0" />
        </defs>
        <text fill="url(#goldGrad)" style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '4px' }}>
          <textPath xlinkHref="#textPath" startOffset="50%" textAnchor="middle">
            MAFIA CLUB • ELITE •
          </textPath>
        </text>
      </svg>
    </div>
  );
};

export default Logo;
