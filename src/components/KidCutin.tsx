import React, { useEffect, useRef } from 'react';

interface KidCutinProps {
  power: number; // 0 to 1
  onComplete: () => void;
}

export const KidCutin: React.FC<KidCutinProps> = ({ power, onComplete }) => {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Auto dismiss after cutin plays (guaranteed single timer)
    const timer = setTimeout(() => {
      onCompleteRef.current();
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  const isSuper = power >= 0.85;

  return (
    <div
      id="kid-cutin-overlay"
      onClick={() => onCompleteRef.current()}
      className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden bg-black/35 backdrop-blur-[2px] transition-all animate-in fade-in duration-100 select-none"
    >
      {/* Radiating Anime Speedlines */}
      <div className="absolute inset-0 speedlines-bg opacity-70 animate-spin" style={{ animationDuration: '6s' }} />

      {/* Fiery aura if super kick */}
      {isSuper && (
        <div className="absolute inset-0 bg-radial from-red-600/40 via-amber-500/20 to-transparent animate-pulse" />
      )}

      {/* Main Manga Panel */}
      <div className="relative w-full max-w-md h-72 mx-3 bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 border-4 border-black rounded-2xl shadow-[8px_8px_0px_#000] overflow-hidden flex items-center justify-between p-4 transform animate-in fade-in zoom-in-95 duration-200 pointer-events-auto cursor-pointer">
        {/* Background Comic halftone / stripes */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#000_2px,transparent_2px)] [background-size:12px_12px]" />

        {/* Left Side: Manga Character (Spirited Elementary Kid) */}
        <div className="relative z-10 w-44 h-full flex items-center justify-center">
          <svg viewBox="0 0 160 180" className="w-full h-full drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
            <defs>
              <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffdbac" />
                <stop offset="100%" stopColor="#f1c27d" />
              </linearGradient>
              <linearGradient id="jerseyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fef08a" />
              </linearGradient>
            </defs>

            {/* Aura Flames behind kid if super */}
            {isSuper && (
              <g className="animate-pulse">
                <path d="M10,90 Q40,10 70,80 Q90,5 110,75 Q130,20 150,90 Z" fill="url(#flameGrad)" opacity="0.8" />
              </g>
            )}

            {/* Kid body: Kicking soccer posture */}
            {/* Torso & Blue Jersey #10 */}
            <path d="M50,85 L105,75 L115,130 L45,130 Z" fill="url(#jerseyGrad)" stroke="#000" strokeWidth="3.5" strokeLinejoin="round" />
            <text x="75" y="112" fontSize="24" fontFamily="Impact, Arial Black" fill="#fff" stroke="#000" strokeWidth="1" textAnchor="middle">10</text>
            
            {/* White collar & stripes */}
            <path d="M68,82 L82,80 L88,95 L65,95 Z" fill="#ffffff" stroke="#000" strokeWidth="2" />

            {/* Left leg planting */}
            <path d="M55,130 L45,160 L60,165 L70,130 Z" fill="#1e293b" stroke="#000" strokeWidth="3" />
            {/* Left cleat */}
            <path d="M35,160 L65,165 L60,175 L30,172 Z" fill="#ffffff" stroke="#000" strokeWidth="3" />

            {/* Right leg WINDING UP A FEROCIOUS KICK */}
            <path d="M105,125 L145,110 L155,125 L115,135 Z" fill="#1e293b" stroke="#000" strokeWidth="3" />
            {/* Kicking Cleat with speed swoosh */}
            <path d="M142,105 L165,95 L168,115 L145,125 Z" fill="#ef4444" stroke="#000" strokeWidth="3.5" />
            <path d="M130,90 Q155,80 170,95" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />

            {/* Head & Neck */}
            <path d="M72,70 L85,70 L85,82 L72,82 Z" fill="url(#skinGrad)" stroke="#000" strokeWidth="2.5" />
            <circle cx="78" cy="55" r="28" fill="url(#skinGrad)" stroke="#000" strokeWidth="3.5" />

            {/* Backward Cap (Red & Yellow) */}
            <path d="M50,48 Q78,25 106,48 L104,36 Q78,18 52,36 Z" fill="#dc2626" stroke="#000" strokeWidth="3" />
            {/* Visor turned backward */}
            <path d="M40,50 L52,42 L56,54 Z" fill="#fbbf24" stroke="#000" strokeWidth="2.5" />

            {/* Hair bangs */}
            <path d="M56,48 L62,56 L70,47 L78,56 L86,48 L94,56 L100,48" fill="#18181b" stroke="#000" strokeWidth="2" />

            {/* Anime Eyes (Intense Fire) */}
            <ellipse cx="68" cy="54" rx="5" ry="7" fill="#000" />
            <ellipse cx="88" cy="53" rx="5" ry="7" fill="#000" />
            {/* Fiery sparkle highlights */}
            <circle cx="69" cy="52" r="2.5" fill="#fef08a" />
            <circle cx="89" cy="51" r="2.5" fill="#fef08a" />
            {/* Determined angry eyebrows */}
            <path d="M60,45 L74,49" stroke="#000" strokeWidth="3" strokeLinecap="round" />
            <path d="M96,44 L82,48" stroke="#000" strokeWidth="3" strokeLinecap="round" />

            {/* Shouting Open Mouth */}
            <path d="M70,64 Q78,60 86,64 Q78,82 70,64 Z" fill="#991b1b" stroke="#000" strokeWidth="2.5" />
            <path d="M73,65 Q78,67 83,65" fill="#fff" stroke="#000" strokeWidth="1" />
            {/* Tongue */}
            <path d="M74,74 Q78,70 82,74" fill="#f43f5e" />

            {/* Cheek blush / sweat bead of determination */}
            <circle cx="58" cy="60" r="3" fill="#f87171" opacity="0.6" />
            <circle cx="98" cy="60" r="3" fill="#f87171" opacity="0.6" />
            <path d="M96,42 Q99,46 96,48 Q93,46 96,42" fill="#38bdf8" />
          </svg>
        </div>

        {/* Right Side: Giant Manga Speech Bubble */}
        <div className="relative z-10 flex-1 pl-2 flex flex-col justify-center items-center text-center">
          {/* Comic Speech Bubble Container */}
          <div className="relative bg-white border-4 border-black rounded-3xl p-3 px-4 shadow-[5px_5px_0px_#000] rotate-[-2deg]">
            {/* Speech bubble pointer pointing left towards kid's mouth */}
            <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-[16px] border-r-black" />
            <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-r-[12px] border-r-white" />

            {/* Sub label */}
            <div className="text-xs font-black text-red-600 tracking-wider">
              {isSuper ? '⚡ 限界突破シュート ⚡' : '🔥 渾身のフルスイング！'}
            </div>

            {/* The Main Shout: いっけーーーーい！！ */}
            <div className="font-['Dela_Gothic_One'] text-3xl sm:text-4xl text-amber-500 stroke-black stroke-2 drop-shadow-[2px_2px_0px_#000] tracking-tight leading-tight my-1 select-none">
              いっけ
              <span className="text-red-600 inline-block scale-110 tracking-tighter">ーーーー</span>
              い!!
            </div>

            {/* Power display tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-black text-white text-xs font-black rounded-full shadow">
              <span>パワー:</span>
              <span className={isSuper ? 'text-yellow-300 animate-pulse' : 'text-emerald-400'}>
                {Math.round(power * 100)}% {isSuper ? '【超神速】' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Action burst flash */}
        <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-yellow-300 rotate-45 border-4 border-black -z-0 opacity-80" />
      </div>
    </div>
  );
};
