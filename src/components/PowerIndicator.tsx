import React from 'react';
import { Flame, Zap } from 'lucide-react';

interface PowerIndicatorProps {
  power: number; // 0 to 1
  isCharging?: boolean;
}

export const PowerIndicator: React.FC<PowerIndicatorProps> = ({ power }) => {
  const percentage = Math.round(power * 100);
  const isSuper = percentage >= 90;
  const isHigh = percentage >= 75 && percentage < 90;
  const isMedium = percentage >= 45 && percentage < 75;

  return (
    <div id="power-indicator-container" className="w-full max-w-sm flex flex-col gap-1.5 select-none">
      {/* Top labels */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-black tracking-wide">
          {isSuper ? (
            <span className="flex items-center gap-1 text-red-500 font-['Dela_Gothic_One'] animate-bounce">
              <Zap className="w-4 h-4 fill-red-500 text-yellow-400" />
              超神速・限界突破!!
            </span>
          ) : isHigh ? (
            <span className="flex items-center gap-1 text-amber-500 font-bold">
              <Flame className="w-4 h-4 fill-amber-500 text-orange-500" />
              必殺メガシュート!
            </span>
          ) : isMedium ? (
            <span className="text-emerald-600 font-bold">
              豪快キック!
            </span>
          ) : (
            <span className="text-slate-500 font-medium">
              通常キック
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-xs text-slate-600 font-semibold">POWER</span>
          <span
            className={`text-lg font-black font-['Outfit'] tabular-nums ${
              isSuper
                ? 'text-red-600 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                : isHigh
                ? 'text-amber-600'
                : 'text-slate-800'
            }`}
          >
            {percentage}%
          </span>
        </div>
      </div>

      {/* Main Gauge Frame */}
      <div className="relative h-7 w-full bg-slate-900 rounded-xl p-1 border-2 border-slate-950 shadow-[0_4px_12px_rgba(0,0,0,0.15)] overflow-hidden">
        {/* Background gradient zones */}
        <div className="absolute inset-1 flex rounded-lg overflow-hidden opacity-30">
          <div className="w-[45%] bg-emerald-500" />
          <div className="w-[30%] bg-amber-500" />
          <div className="w-[15%] bg-orange-600" />
          <div className="w-[10%] bg-red-600 animate-pulse" />
        </div>

        {/* Dynamic Filled Bar */}
        <div
          className={`relative h-full rounded-lg transition-all duration-75 ease-out flex items-center justify-end pr-1.5 ${
            isSuper
              ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 shadow-[0_0_16px_rgba(239,68,68,0.9)] animate-pulse'
              : isHigh
              ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.7)]'
              : isMedium
              ? 'bg-gradient-to-r from-emerald-400 to-amber-400'
              : 'bg-gradient-to-r from-sky-400 to-emerald-400'
          }`}
          style={{ width: `${Math.max(4, percentage)}%` }}
        >
          {/* Sweet Spot Sparkle */}
          {isSuper && (
            <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_8px_#fff] animate-ping" />
          )}
        </div>

        {/* Max Power Indicator Marker (90% - 100%) */}
        <div className="absolute top-0 bottom-0 right-[10%] w-0.5 bg-yellow-300 pointer-events-none z-10 opacity-75 shadow-[0_0_4px_#fef08a]" />
        <div className="absolute top-1 right-2 text-[9px] font-black text-yellow-300 pointer-events-none z-10 tracking-tighter">
          MAX
        </div>
      </div>
    </div>
  );
};
