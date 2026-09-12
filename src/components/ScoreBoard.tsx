import React from 'react';
import { Trophy, Zap, RefreshCw } from 'lucide-react';
import { FrameResult, GameMode } from '../types/game';

interface ScoreBoardProps {
  mode: GameMode;
  currentFrame: number;
  totalFrames: number;
  currentRoll: 1 | 2;
  frames: FrameResult[];
  totalScore: number;
  highScore: number;
  standingPinCount: number;
  totalPinCount: number;
  maxSpeedKmh: number;
  onReset: () => void;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  mode,
  currentFrame,
  totalFrames,
  currentRoll,
  frames,
  totalScore,
  highScore,
  standingPinCount,
  totalPinCount,
  maxSpeedKmh,
  onReset,
}) => {
  const knockedDownCount = totalPinCount - standingPinCount;

  return (
    <div id="game-scoreboard" className="w-full bg-slate-900/90 backdrop-blur-md text-white rounded-2xl p-3 border-2 border-slate-700/80 shadow-lg select-none">
      {/* Top Bar: Mode, Speed & Reset */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md font-bold bg-amber-500 text-black font-['Outfit']">
            {mode === 'standard' ? '🎳 3-FRAME BOWLING' : mode === 'mega100' ? '💥 100-PIN MEGA' : '⚡ 1-SHOT HIGH SCORE'}
          </span>
          {mode === 'standard' && (
            <span className="text-slate-400 font-medium">
              Frame {Math.min(currentFrame, totalFrames)}/{totalFrames} (投球 {currentRoll})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {maxSpeedKmh > 0 && (
            <div className="flex items-center gap-1 text-amber-400 font-['Outfit'] font-black">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>{Math.round(maxSpeedKmh)} km/h</span>
            </div>
          )}
          <button
            id="btn-reset-game"
            onClick={onReset}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="リセット"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-3 gap-2 pt-2 text-center items-center">
        {/* Score */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">合計スコア</span>
          <span className="text-2xl sm:text-3xl font-black font-['Outfit'] text-amber-400 tabular-nums">
            {totalScore}
          </span>
        </div>

        {/* Fallen Pins */}
        <div className="flex flex-col items-center border-x border-slate-800 px-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">倒したピン</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-['Outfit'] text-emerald-400 tabular-nums">
              {knockedDownCount}
            </span>
            <span className="text-xs text-slate-500 font-bold">/ {totalPinCount}</span>
          </div>
        </div>

        {/* High Score */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Trophy className="w-2.5 h-2.5 text-yellow-500" />
            BEST
          </span>
          <span className="text-xl sm:text-2xl font-black font-['Outfit'] text-slate-200 tabular-nums">
            {highScore}
          </span>
        </div>
      </div>

      {/* Frame Cells for Standard Mode */}
      {mode === 'standard' && (
        <div className="mt-2.5 grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800">
          {[1, 2, 3].map((fNum) => {
            const frameData = frames.find((f) => f.frameNumber === fNum);
            const isCurrent = currentFrame === fNum;
            return (
              <div
                key={fNum}
                className={`rounded-lg p-1.5 border ${
                  isCurrent
                    ? 'border-amber-500/80 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-950/40'
                } flex flex-col items-center justify-between text-xs`}
              >
                <span className="text-[9px] text-slate-400 font-bold">第{fNum}フレーム</span>
                <div className="flex gap-2 font-mono font-black my-0.5">
                  <span className="w-5 text-center bg-slate-800 rounded">
                    {frameData ? (frameData.isStrike ? 'X' : frameData.kick1Pins) : '-'}
                  </span>
                  <span className="w-5 text-center bg-slate-800 rounded">
                    {frameData
                      ? frameData.isStrike
                        ? ''
                        : frameData.isSpare
                        ? '/'
                        : frameData.kick2Pins ?? '-'
                      : '-'}
                  </span>
                </div>
                <span className="text-xs font-bold text-amber-300 font-['Outfit']">
                  {frameData?.totalScore ?? '-'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
