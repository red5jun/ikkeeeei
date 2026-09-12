import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  ChevronLeft,
  ChevronRight,
  Flame,
  HelpCircle,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';
import { GameMode, FrameResult } from './types/game';
import { GameCanvas } from './components/GameCanvas';
import { PowerIndicator } from './components/PowerIndicator';
import { ScoreBoard } from './components/ScoreBoard';
import { KidCutin } from './components/KidCutin';
import { soundManager } from './utils/audio';

export default function App() {
  // Game Modes
  const [mode, setMode] = useState<GameMode>('standard');
  const [showHowTo, setShowHowTo] = useState(false);

  // Audio settings
  const [isMuted, setIsMuted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cutinEnabled, setCutinEnabled] = useState(true);

  // Aim & Power controls
  const [angle, setAngle] = useState<number>(0); // -14 to +14 deg
  const [power, setPower] = useState<number>(0.5); // 0 to 1
  const [isAiming, setIsAiming] = useState<boolean>(true);
  const [showCutin, setShowCutin] = useState<boolean>(false);
  const [lockedPower, setLockedPower] = useState<number>(0.5);

  // Scoring & Game State
  const [currentFrame, setCurrentFrame] = useState<number>(1);
  const totalFrames = 3;
  const [currentRoll, setCurrentRoll] = useState<1 | 2>(1);
  const [frames, setFrames] = useState<FrameResult[]>([]);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soccer_bowling_highscore');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [standingPins, setStandingPins] = useState<number>(10);
  const [totalPins, setTotalPins] = useState<number>(10);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState<number>(0);
  const [bannerMessage, setBannerMessage] = useState<{ title: string; subtitle: string } | null>(null);

  // Angle continuous button holding refs
  const angleIntervalRef = useRef<number | null>(null);

  // Oscillating power meter loop
  useEffect(() => {
    if (!isAiming) return;
    let animId: number;
    const startTime = performance.now();

    const updatePower = (time: number) => {
      // Oscillate power smoothly between 0.15 and 1.0 (speed approx 1.6 cycles/sec)
      const elapsed = (time - startTime) / 1000;
      const wave = (Math.sin(elapsed * 4.2) + 1) / 2; // 0 to 1
      // Non-linear curve to give sweet spot at top
      const curved = Math.pow(wave, 1.2);
      setPower(0.1 + curved * 0.9);
      animId = requestAnimationFrame(updatePower);
    };

    animId = requestAnimationFrame(updatePower);
    return () => cancelAnimationFrame(animId);
  }, [isAiming]);

  // Mode change handler
  const handleModeChange = (newMode: GameMode) => {
    setMode(newMode);
    const pinCount = newMode === 'mega100' ? 78 : 10;
    setTotalPins(pinCount);
    setStandingPins(pinCount);
    setCurrentFrame(1);
    setCurrentRoll(1);
    setFrames([]);
    setTotalScore(0);
    setMaxSpeedKmh(0);
    setIsAiming(true);
    setAngle(0);
    setBannerMessage(null);
  };

  // Sound toggles
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.isMuted = next;
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    soundManager.voiceEnabled = next;
  };

  // Continuous Angle Change on button hold
  const startAdjustAngle = (direction: 'left' | 'right') => {
    soundManager.playTick();
    const delta = direction === 'left' ? -1 : 1;
    setAngle((prev) => Math.max(-14, Math.min(14, Math.round((prev + delta) * 10) / 10)));

    if (angleIntervalRef.current) clearInterval(angleIntervalRef.current);
    angleIntervalRef.current = window.setInterval(() => {
      setAngle((prev) => Math.max(-14, Math.min(14, Math.round((prev + delta * 0.7) * 10) / 10)));
    }, 90);
  };

  const stopAdjustAngle = () => {
    if (angleIntervalRef.current) {
      clearInterval(angleIntervalRef.current);
      angleIntervalRef.current = null;
    }
  };

  // Trigger Kick Action! ("いっけーーーーい！")
  const triggerKick = useCallback(() => {
    if (!isAiming) return;

    setLockedPower(power);
    // Play voice immediately
    soundManager.playIkkeiVoice();

    // Release ball immediately so kick starts without lag!
    setIsAiming(false);

    if (cutinEnabled) {
      setShowCutin(true);
    }
  }, [isAiming, power, cutinEnabled]);

  // When Cutin completes or is skipped
  const handleCutinComplete = useCallback(() => {
    setShowCutin(false);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setAngle((prev) => Math.max(-14, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setAngle((prev) => Math.min(14, prev + 1));
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        triggerKick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerKick]);

  // When shot completes and physics settle
  const handleShotSettled = (
    pinsKnocked: number,
    isStrike: boolean,
    isSpare: boolean,
    speedKmh: number
  ) => {
    setMaxSpeedKmh((prev) => Math.max(prev, speedKmh));

    // Calculate score
    const basePinScore = pinsKnocked * 100;
    const powerBonus = Math.round(lockedPower * 500);
    const speedBonus = Math.round(speedKmh * 5);
    const strikeBonus = isStrike ? 10000 : isSpare ? 4000 : 0;
    const shotScore = basePinScore + powerBonus + speedBonus + strikeBonus;

    const newTotal = totalScore + shotScore;
    setTotalScore(newTotal);

    // Save high score
    if (newTotal > highScore) {
      setHighScore(newTotal);
      if (typeof window !== 'undefined') {
        localStorage.setItem('soccer_bowling_highscore', newTotal.toString());
      }
    }

    // Set dramatic banner
    if (isStrike) {
      setBannerMessage({
        title: '🔥 豪快ストライク!! 🔥',
        subtitle: `全ピン完全粉砕！ ボーナス +${strikeBonus.toLocaleString()}点！`,
      });
    } else if (isSpare) {
      setBannerMessage({
        title: '⚡ スペア達成!! ⚡',
        subtitle: `お見事！ ボーナス +${strikeBonus.toLocaleString()}点！`,
      });
    } else if (pinsKnocked >= 7) {
      setBannerMessage({
        title: '💥 ナイスシュート!! 💥',
        subtitle: `${pinsKnocked}本ぶっ飛ばしたぞ！ +${shotScore.toLocaleString()}点`,
      });
    } else {
      setBannerMessage({
        title: `${pinsKnocked}本 撃破!`,
        subtitle: `+${shotScore.toLocaleString()}点獲得`,
      });
    }

    // Update standing pins count
    setStandingPins((prev) => Math.max(0, prev - pinsKnocked));

    // Update Bowling Frame progression for standard mode
    if (mode === 'standard') {
      if (currentRoll === 1 && !isStrike) {
        // Prepare 2nd roll in the same frame
        setFrames((prev) => [
          ...prev.filter((f) => f.frameNumber !== currentFrame),
          {
            frameNumber: currentFrame,
            kick1Pins: pinsKnocked,
            isStrike: false,
            isSpare: false,
            score: shotScore,
            totalScore: newTotal,
          },
        ]);
        setCurrentRoll(2);
      } else {
        // Frame finished (either strike or roll 2)
        const frameData: FrameResult = {
          frameNumber: currentFrame,
          kick1Pins: currentRoll === 1 ? pinsKnocked : frames.find((f) => f.frameNumber === currentFrame)?.kick1Pins || 0,
          kick2Pins: currentRoll === 2 ? pinsKnocked : undefined,
          isStrike,
          isSpare,
          score: shotScore,
          totalScore: newTotal,
        };
        setFrames((prev) => [...prev.filter((f) => f.frameNumber !== currentFrame), frameData]);

        if (currentFrame < totalFrames) {
          setCurrentFrame((prev) => prev + 1);
          setCurrentRoll(1);
        } else {
          // Finished all 3 frames!
          setBannerMessage({
            title: '🎉 ゲームクリア!! 🎉',
            subtitle: `最終スコア: ${newTotal.toLocaleString()}点!!`,
          });
        }
      }
    }
  };

  // Reset or proceed to next shot
  const handleNextShot = () => {
    setBannerMessage(null);
    setIsAiming(true);
    setAngle(0);

    // If frame ended or non-standard mode, reset pins
    if (mode !== 'standard' || currentRoll === 1 || standingPins === 0) {
      const pinCount = mode === 'mega100' ? 78 : 10;
      setStandingPins(pinCount);
      setTotalPins(pinCount);
    }
  };

  const handleFullReset = () => {
    handleModeChange(mode);
  };

  return (
    <div
      id="app-root"
      className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-2 sm:p-4 font-sans select-none overflow-x-hidden"
    >
      {/* Kid Cut-in Animation Overlay */}
      {showCutin && (
        <KidCutin power={lockedPower} onComplete={handleCutinComplete} />
      )}

      {/* How to Play Modal */}
      {showHowTo && (
        <div
          id="modal-howto"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <button
              id="btn-close-howto"
              onClick={() => setShowHowTo(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-['Dela_Gothic_One'] text-xl text-amber-400 mb-3 flex items-center gap-2">
              <span>⚽ 遊び方ガイド</span>
            </h3>
            <ul className="text-sm text-slate-300 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">1.</span>
                <span>
                  <strong>左右矢印 (◀ ▶)</strong> または画面スワイプでボールの蹴り出す方向を狙います。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">2.</span>
                <span>
                  <strong>パワーインジケーター</strong>のタイミングを見計らい、一番右の<strong>超神速ゾーン (MAX)</strong>を狙って蹴りましょう！
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">3.</span>
                <span>
                  <strong>「いっけーーーーい！！」</strong>ボタンを押すと、超絶キックでピンが宇宙まで吹っ飛びます！
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">4.</span>
                <span>
                  ピン同士が激突するドミノ連鎖やストライクで<strong>大量高得点</strong>を獲得できます！
                </span>
              </li>
            </ul>
            <button
              id="btn-start-playing"
              onClick={() => setShowHowTo(false)}
              className="mt-5 w-full py-3 bg-gradient-to-r from-amber-500 to-red-500 text-slate-950 font-['Dela_Gothic_One'] rounded-xl shadow-lg hover:brightness-110 cursor-pointer"
            >
              わかった！キックする！
            </button>
          </div>
        </div>
      )}

      {/* Main Container - Smartphone Centered Layout */}
      <div className="w-full max-w-md flex-1 flex flex-col justify-between gap-2.5 mx-auto">
        {/* Header: Title & Settings */}
        <header id="game-header" className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚽💥</span>
            <div>
              <h1 className="text-lg sm:text-xl font-['Dela_Gothic_One'] text-amber-400 tracking-tight leading-none drop-shadow">
                爆裂サッカーボウリング
              </h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider">
                「いっけーーーーい！」メガキック！
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Voice toggle */}
            <button
              id="btn-toggle-voice"
              onClick={toggleVoice}
              title={voiceEnabled ? 'ボイスON' : 'ボイスOFF'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                voiceEnabled
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            {/* Sound toggle */}
            <button
              id="btn-toggle-sound"
              onClick={toggleMute}
              title={isMuted ? 'サウンドOFF' : 'サウンドON'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                !isMuted
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              {!isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Help button */}
            <button
              id="btn-open-howto"
              onClick={() => setShowHowTo(true)}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mode Selector Tabs */}
        <div id="game-mode-selector" className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-bold text-center">
          <button
            id="tab-mode-standard"
            onClick={() => handleModeChange('standard')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'standard'
                ? 'bg-amber-500 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎳 通常3枠
          </button>
          <button
            id="tab-mode-mega100"
            onClick={() => handleModeChange('mega100')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'mega100'
                ? 'bg-red-600 text-white font-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            💥 100ピン大破
          </button>
          <button
            id="tab-mode-onekick"
            onClick={() => handleModeChange('onekick')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'onekick'
                ? 'bg-indigo-600 text-white font-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ ワンショット
          </button>
        </div>

        {/* Score Board */}
        <ScoreBoard
          mode={mode}
          currentFrame={currentFrame}
          totalFrames={totalFrames}
          currentRoll={currentRoll}
          frames={frames}
          totalScore={totalScore}
          highScore={highScore}
          standingPinCount={standingPins}
          totalPinCount={totalPins}
          maxSpeedKmh={maxSpeedKmh}
          onReset={handleFullReset}
        />

        {/* Game Canvas Area */}
        <div className="relative flex-1 min-h-[320px] max-h-[460px] w-full flex items-center justify-center">
          <GameCanvas
            mode={mode}
            angle={angle}
            power={isAiming ? power : lockedPower}
            isAiming={isAiming}
            currentRoll={currentRoll}
            onShotSettled={handleShotSettled}
            onAimChange={(newAngle) => setAngle(newAngle)}
            onKickRequested={triggerKick}
          />

          {/* Result Banner Overlay after shot */}
          {bannerMessage && !isAiming && (
            <div
              id="banner-result"
              className="absolute inset-x-3 bottom-6 z-30 bg-slate-950/90 border-2 border-amber-500 rounded-2xl p-3 text-center shadow-[0_0_20px_rgba(245,158,11,0.5)] backdrop-blur animate-in zoom-in-95 duration-200"
            >
              <h4 className="font-['Dela_Gothic_One'] text-lg sm:text-xl text-yellow-400 drop-shadow">
                {bannerMessage.title}
              </h4>
              <p className="text-xs text-slate-300 font-bold my-1">
                {bannerMessage.subtitle}
              </p>
              {bannerMessage.title.includes('ゲームクリア') ? (
                <button
                  id="btn-play-again"
                  onClick={handleFullReset}
                  className="mt-2 w-full py-2.5 bg-gradient-to-r from-amber-500 to-red-500 text-slate-950 font-['Dela_Gothic_One'] rounded-xl shadow-md hover:brightness-110 flex items-center justify-center gap-1.5 cursor-pointer text-sm"
                >
                  <RotateCcw className="w-4 h-4 text-slate-950" />
                  <span>もう一度遊ぶ！</span>
                </button>
              ) : (
                <button
                  id="btn-next-shot"
                  onClick={handleNextShot}
                  className="mt-2 w-full py-2.5 bg-gradient-to-r from-amber-500 to-red-500 text-slate-950 font-['Dela_Gothic_One'] rounded-xl shadow-md hover:brightness-110 flex items-center justify-center gap-1.5 cursor-pointer text-sm"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>次を蹴る！</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Control Deck (Indicator, Direction, Big Kick Button) */}
        <div id="controls-deck" className="bg-slate-900/95 border-2 border-slate-800 rounded-3xl p-3 shadow-2xl flex flex-col gap-2.5">
          {/* Power Indicator Bar */}
          <PowerIndicator power={isAiming ? power : lockedPower} />

          {/* Direction & Kick Action Area */}
          <div className="grid grid-cols-5 gap-2 items-stretch">
            {/* Left Arrow Button */}
            <button
              id="btn-aim-left"
              disabled={!isAiming}
              onMouseDown={() => startAdjustAngle('left')}
              onMouseUp={stopAdjustAngle}
              onMouseLeave={stopAdjustAngle}
              onTouchStart={() => startAdjustAngle('left')}
              onTouchEnd={stopAdjustAngle}
              className="col-span-1 h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed border-2 border-slate-700 flex flex-col items-center justify-center text-slate-200 active:text-white transition-all cursor-pointer shadow-md select-none"
            >
              <ChevronLeft className="w-8 h-8 stroke-[3]" />
              <span className="text-[10px] font-black tracking-tight">左狙い</span>
            </button>

            {/* Big Center Kick Button */}
            <button
              id="btn-kick-action"
              disabled={!isAiming}
              onClick={triggerKick}
              className={`col-span-3 h-16 rounded-2xl border-4 border-black font-['Dela_Gothic_One'] text-xl sm:text-2xl shadow-[0_6px_0px_#000] active:shadow-none active:translate-y-1.5 transition-all flex flex-col items-center justify-center cursor-pointer select-none relative overflow-hidden ${
                !isAiming
                  ? 'bg-slate-700 text-slate-500 border-slate-800 opacity-60 cursor-not-allowed shadow-none'
                  : power >= 0.88
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 text-white animate-pulse-glow'
                  : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 hover:brightness-105'
              }`}
            >
              {/* Background speedlines on sweet spot */}
              {isAiming && power >= 0.88 && (
                <div className="absolute inset-0 speedlines-bg opacity-30 animate-spin" style={{ animationDuration: '4s' }} />
              )}
              <span className="relative z-10 drop-shadow-[1px_1px_0px_#000] tracking-tight">
                いっけーーーーい!!
              </span>
              <span className="relative z-10 text-[10px] font-sans font-black tracking-wider opacity-90">
                {isAiming ? (power >= 0.88 ? '⚡ 超神速キック発動！' : '⚽ ここで蹴る！') : '発射中...'}
              </span>
            </button>

            {/* Right Arrow Button */}
            <button
              id="btn-aim-right"
              disabled={!isAiming}
              onMouseDown={() => startAdjustAngle('right')}
              onMouseUp={stopAdjustAngle}
              onMouseLeave={stopAdjustAngle}
              onTouchStart={() => startAdjustAngle('right')}
              onTouchEnd={stopAdjustAngle}
              className="col-span-1 h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed border-2 border-slate-700 flex flex-col items-center justify-center text-slate-200 active:text-white transition-all cursor-pointer shadow-md select-none"
            >
              <ChevronRight className="w-8 h-8 stroke-[3]" />
              <span className="text-[10px] font-black tracking-tight">右狙い</span>
            </button>
          </div>

          {/* Aim angle indicator bar & Cutin toggle */}
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <div className="flex items-center gap-1">
              <span className="font-bold">角度:</span>
              <span className="font-mono font-bold text-amber-400">
                {angle > 0 ? `+${angle}°` : `${angle}°`}
              </span>
              <span className="text-[10px] text-slate-500">
                {angle === 0 ? '(中央まっすぐ)' : angle < 0 ? '(左カーブ)' : '(右カーブ)'}
              </span>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-bold hover:text-white">
              <input
                id="toggle-cutin"
                type="checkbox"
                checked={cutinEnabled}
                onChange={(e) => setCutinEnabled(e.target.checked)}
                className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
              />
              <span>カットイン演出</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
