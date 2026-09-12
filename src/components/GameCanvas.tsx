import React, { useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Pin, Ball, ComicEffect, GameMode } from '../types/game';
import { soundManager } from '../utils/audio';

interface GameCanvasProps {
  mode: GameMode;
  angle: number; // in degrees, e.g. -14 to +14
  power: number; // 0 to 1
  isAiming: boolean;
  currentRoll?: number;
  onShotSettled: (pinsKnocked: number, isStrike: boolean, isSpare: boolean, speedKmh: number) => void;
  onAimChange?: (newAngle: number) => void;
  onKickRequested?: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  mode,
  angle,
  power,
  isAiming,
  currentRoll = 1,
  onShotSettled,
  onAimChange,
  onKickRequested,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state refs for 60fps loop
  const gameStateRef = useRef<{
    pins: Pin[];
    ball: Ball;
    comics: ComicEffect[];
    screenShake: number;
    camX: number;
    camY: number;
    camZ: number;
    phase: 'aim' | 'rolling' | 'settled';
    shotStartTime: number;
    standingBeforeKick: number;
    isSuperKick: boolean;
    scorchMarks: { x: number; z: number; width: number }[];
    totalPinsKnockedThisShot: number;
  }>({
    pins: [],
    ball: {
      x: 0,
      y: 16,
      z: 10,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: 0,
      rotation: 0,
      isRolling: false,
      power: 0.5,
      speedKmh: 0,
      trail: [],
    },
    comics: [],
    screenShake: 0,
    camX: 0,
    camY: 120,
    camZ: -160,
    phase: 'aim',
    shotStartTime: 0,
    standingBeforeKick: 10,
    isSuperKick: false,
    scorchMarks: [],
    totalPinsKnockedThisShot: 0,
  });

  // Touch drag tracking for aiming on canvas
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragStartAngleRef = useRef(0);
  const dragMovedRef = useRef(false);

  // Initialize pins based on mode
  const initPins = useCallback((keepStandingPinsOnly: boolean = false) => {
    const s = gameStateRef.current;
    if (keepStandingPinsOnly && s.pins.length > 0) {
      // Keep only pins that haven't been knocked down yet, reset velocities
      s.pins = s.pins
        .filter((p) => !p.isKnockedDown)
        .map((p) => ({
          ...p,
          vx: 0,
          vy: 0,
          vz: 0,
          rotX: 0,
          rotY: 0,
          rotZ: 0,
          vRotX: 0,
          vRotY: 0,
          vRotZ: 0,
          y: 0,
        }));
      s.standingBeforeKick = s.pins.length;
      return;
    }

    const pins: Pin[] = [];
    let pinId = 1;

    if (mode === 'mega100') {
      // 100-Pin Mega Challenge: 12 rows pyramid!
      const startZ = 750;
      const rowSpacing = 32;
      const pinSpacing = 28;
      for (let row = 0; row < 12; row++) {
        const countInRow = row + 1;
        const startX = -((countInRow - 1) * pinSpacing) / 2;
        for (let col = 0; col < countInRow; col++) {
          const px = startX + col * pinSpacing;
          const pz = startZ + row * rowSpacing;
          pins.push({
            id: pinId++,
            x: px,
            y: 0,
            z: pz,
            vx: 0,
            vy: 0,
            vz: 0,
            rotX: 0,
            rotY: 0,
            rotZ: 0,
            vRotX: 0,
            vRotY: 0,
            vRotZ: 0,
            isKnockedDown: false,
            isBonusPin: row === 0 || (row === 6 && col === 3),
            opacity: 1,
          });
        }
      }
    } else {
      // Standard 10-pin triangle setup
      const baseZ = 800;
      const rowSpacing = 38;
      const pinSpacing = 34;

      // Row 0 (Pin 1)
      pins.push({
        id: 1,
        x: 0,
        y: 0,
        z: baseZ,
        vx: 0,
        vy: 0,
        vz: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        vRotX: 0,
        vRotY: 0,
        vRotZ: 0,
        isKnockedDown: false,
        isBonusPin: true, // Lead bonus pin!
        opacity: 1,
      });

      // Row 1 (Pins 2, 3)
      pins.push(
        { id: 2, x: -pinSpacing / 2, y: 0, z: baseZ + rowSpacing, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, rotZ: 0, vRotX: 0, vRotY: 0, vRotZ: 0, isKnockedDown: false, opacity: 1 },
        { id: 3, x: pinSpacing / 2, y: 0, z: baseZ + rowSpacing, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, rotZ: 0, vRotX: 0, vRotY: 0, vRotZ: 0, isKnockedDown: false, opacity: 1 }
      );

      // Row 2 (Pins 4, 5, 6)
      pins.push(
        { id: 4, x: -pinSpacing, y: 0, z: baseZ + rowSpacing * 2, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, rotZ: 0, vRotX: 0, vRotY: 0, vRotZ: 0, isKnockedDown: false, opacity: 1 },
        { id: 5, x: 0, y: 0, z: baseZ + rowSpacing * 2, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, rotZ: 0, vRotX: 0, vRotY: 0, vRotZ: 0, isKnockedDown: false, opacity: 1 },
        { id: 6, x: pinSpacing, y: 0, z: baseZ + rowSpacing * 2, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, rotZ: 0, vRotX: 0, vRotY: 0, vRotZ: 0, isKnockedDown: false, opacity: 1 }
      );

      // Row 3 (Pins 7, 8, 9, 10)
      pins.push(
        { id: 7, x: -pinSpacing * 1.5, y: 0, z: baseZ + rowSpacing * 3, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, rotZ: 0, vRotX: 0, vRotY: 0, vRotZ: 0, isKnockedDown: false, opacity: 1 },
        { id: 8, x: -pinSpacing * 0.5, y: 0, z: baseZ + rowSpacing * 3, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, rotZ: 0, vRotX: 0, vRotY: 0, vRotZ: 0, isKnockedDown: false, opacity: 1 },
        { id: 9, x: pinSpacing * 0.5, y: 0, z: baseZ + rowSpacing * 3, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, rotZ: 0, vRotX: 0, vRotY: 0, vRotZ: 0, isKnockedDown: false, opacity: 1 },
        { id: 10, x: pinSpacing * 1.5, y: 0, z: baseZ + rowSpacing * 3, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, rotZ: 0, vRotX: 0, vRotY: 0, vRotZ: 0, isKnockedDown: false, opacity: 1 }
      );
    }

    s.pins = pins;
    s.standingBeforeKick = pins.length;
    s.scorchMarks = [];
  }, [mode]);

  // Reset ball position
  const resetBall = useCallback(() => {
    const s = gameStateRef.current;
    s.ball = {
      x: 0,
      y: 16,
      z: 10,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: 0,
      rotation: 0,
      isRolling: false,
      power: 0.5,
      speedKmh: 0,
      trail: [],
    };
    s.camX = 0;
    s.camY = 120;
    s.camZ = -160;
    s.phase = 'aim';
    s.totalPinsKnockedThisShot = 0;
  }, []);

  // When entering aiming mode (e.g. initial start, mode change, or "次を蹴る！" clicked), reset ball and lane!
  useEffect(() => {
    if (isAiming) {
      resetBall();
      if (mode === 'standard' && currentRoll === 2) {
        initPins(true); // Keep only standing pins from roll 1
      } else {
        initPins(false); // Reset all pins
      }
    }
  }, [isAiming, resetBall, initPins, mode, currentRoll]);

  // Handle when aiming state flips to rolling (user pressed KICK!)
  useEffect(() => {
    const s = gameStateRef.current;
    if (!isAiming && (s.phase === 'aim' || !s.ball.isRolling)) {
      // LAUNCH THE BALL!
      s.phase = 'rolling';
      s.shotStartTime = performance.now();
      s.standingBeforeKick = s.pins.filter((p) => !p.isKnockedDown).length;

      const isSuper = power >= 0.88;
      s.isSuperKick = isSuper;

      // Calculate ball launch velocity
      // Absurd manga physics: power 0..1 scales speed from 35 up to 135 units/frame!
      const rad = (angle * Math.PI) / 180;
      const baseSpeed = 32 + power * (isSuper ? 85 : 55);
      s.ball.vz = Math.cos(rad) * baseSpeed;
      s.ball.vx = Math.sin(rad) * baseSpeed;
      s.ball.vy = 0;
      s.ball.power = power;
      s.ball.isRolling = true;

      // Realistic/manga km/h representation
      const speedKmh = Math.round(90 + power * 260 + (isSuper ? 60 : 0));
      s.ball.speedKmh = speedKmh;

      // Screen shake on kick
      s.screenShake = isSuper ? 24 : 12;

      // Sound
      soundManager.playKickSound(power);
      soundManager.playWhooshSound(power);

      // Add comic cut-in text on canvas
      const comicShouts = isSuper
        ? ['超神速!!', 'ドカーン!!', '大爆発!!', '神技!!']
        : ['いっけー!!', 'バシィッ!!', 'ズドォン!!', 'うぉぉ!!'];
      const text = comicShouts[Math.floor(Math.random() * comicShouts.length)];
      s.comics.push({
        id: Math.random().toString(),
        text,
        x: 0,
        y: 80,
        color: isSuper ? '#ef4444' : '#f59e0b',
        scale: isSuper ? 1.8 : 1.4,
        opacity: 1,
        lifetime: 0,
        maxLifetime: 60,
      });
    }
  }, [isAiming, angle, power]);

  // Main 60fps render & physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const comicHitWords = [
      'ドガシャーーーン!!',
      'バコォォン!!',
      'ズバァァァン!!',
      '吹っ飛べぇ!!',
      'クラッシュ!!',
      '大破!!',
      'ドカン!!',
    ];

    const loop = () => {
      animId = requestAnimationFrame(loop);

      const s = gameStateRef.current;
      const width = canvas.width;
      const height = canvas.height;

      // 1. SCREEN SHAKE UPDATE
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      if (s.screenShake > 0.1) {
        shakeOffsetX = (Math.random() - 0.5) * s.screenShake;
        shakeOffsetY = (Math.random() - 0.5) * s.screenShake;
        s.screenShake *= 0.88;
      }

      // 2. BALL PHYSICS
      if (s.phase === 'rolling' && s.ball.isRolling) {
        // Move ball
        s.ball.x += s.ball.vx;
        s.ball.z += s.ball.vz;
        s.ball.y += s.ball.vy;
        s.ball.rotation += s.ball.vz * 0.08;

        // Apply friction
        s.ball.vx *= 0.998;
        s.ball.vz *= 0.998;

        // Ball trail particles
        s.ball.trail.push({
          x: s.ball.x,
          y: s.ball.y,
          z: s.ball.z,
          age: 0,
          color: s.isSuperKick ? '#ef4444' : '#f59e0b',
        });
        if (s.ball.trail.length > 28) {
          s.ball.trail.shift();
        }

        // Scorch marks on wood for super kick
        if (s.isSuperKick && Math.random() < 0.3) {
          s.scorchMarks.push({
            x: s.ball.x,
            z: s.ball.z,
            width: 14 + Math.random() * 8,
          });
          if (s.scorchMarks.length > 50) s.scorchMarks.shift();
        }

        // Gutter bounce / lane bounds (-130 to +130)
        const laneLimit = 125;
        if (s.ball.x < -laneLimit) {
          s.ball.x = -laneLimit;
          s.ball.vx = Math.abs(s.ball.vx) * 0.5;
          soundManager.playPinHitSound(0.5);
        } else if (s.ball.x > laneLimit) {
          s.ball.x = laneLimit;
          s.ball.vx = -Math.abs(s.ball.vx) * 0.5;
          soundManager.playPinHitSound(0.5);
        }

        // Smooth camera follow
        const targetCamZ = Math.min(650, s.ball.z - 170);
        s.camZ += (targetCamZ - s.camZ) * 0.12;
        const targetCamX = s.ball.x * 0.45;
        s.camX += (targetCamX - s.camX) * 0.1;

        // BALL - PIN COLLISION
        const ballRadius = 18;
        const pinRadius = 14;
        let anyHitThisFrame = false;

        s.pins.forEach((pin) => {
          if (pin.z < s.camZ - 50) return; // behind camera
          const dx = pin.x - s.ball.x;
          const dz = pin.z - s.ball.z;
          const distSq = dx * dx + dz * dz;
          const minDist = ballRadius + pinRadius;

          if (distSq < minDist * minDist) {
            anyHitThisFrame = true;
            const dist = Math.sqrt(distSq) || 1;
            const nx = dx / dist;
            const nz = dz / dist;

            // Mark pin as knocked down
            if (!pin.isKnockedDown) {
              pin.isKnockedDown = true;
              s.totalPinsKnockedThisShot++;
              soundManager.playPinHitSound(1.2, true);

              // Comic hit word sticker
              const word = comicHitWords[Math.floor(Math.random() * comicHitWords.length)];
              s.comics.push({
                id: Math.random().toString(),
                text: word,
                x: pin.x,
                y: pin.y + 40,
                color: pin.isBonusPin ? '#fbbf24' : '#ef4444',
                scale: 1.4,
                opacity: 1,
                lifetime: 0,
                maxLifetime: 45,
              });
            }

            // Absurd physics impulse: launch pin into the stratosphere!
            const hitPower = s.ball.vz * (s.isSuperKick ? 1.6 : 1.2);
            pin.vz = nz * hitPower + s.ball.vz * 0.7;
            pin.vx = nx * hitPower + (Math.random() - 0.5) * 12;
            pin.vy = 12 + Math.random() * 22 * (s.isSuperKick ? 1.8 : 1.2); // launch into air

            // High rotational velocity
            pin.vRotX = (Math.random() - 0.5) * 0.45;
            pin.vRotY = (Math.random() - 0.5) * 0.45;
            pin.vRotZ = (Math.random() - 0.5) * 0.45;

            // Ball loses slight speed but pierces through like an anime missile!
            s.ball.vz *= 0.94;
            s.ball.vx += (Math.random() - 0.5) * 2;
            s.screenShake = Math.max(s.screenShake, s.isSuperKick ? 26 : 16);
          }
        });

        if (anyHitThisFrame && s.isSuperKick) {
          soundManager.playExplosion(0.4);
        }

        // Stop ball if past back wall
        if (s.ball.z > 1300) {
          s.ball.isRolling = false;
        }
      }

      // 3. PIN-TO-PIN COLLISION & PHYSICS
      const gravity = 0.85;
      s.pins.forEach((pin, i) => {
        if (!pin.isKnockedDown) return;

        // Apply velocities
        pin.x += pin.vx;
        pin.y += pin.vy;
        pin.z += pin.vz;
        pin.rotX += pin.vRotX;
        pin.rotY += pin.vRotY;
        pin.rotZ += pin.vRotZ;

        // Gravity & floor bounce
        if (pin.y > 0) {
          pin.vy -= gravity;
        } else {
          pin.y = 0;
          if (Math.abs(pin.vy) > 2) {
            pin.vy = -pin.vy * 0.4; // bounce
            soundManager.playPinHitSound(0.2);
          } else {
            pin.vy = 0;
          }
          // Floor rolling friction
          pin.vx *= 0.94;
          pin.vz *= 0.94;
          pin.vRotX *= 0.93;
          pin.vRotY *= 0.93;
          pin.vRotZ *= 0.93;
        }

        // Pin ricochet off side gutters (-140 to +140)
        if (pin.x < -140) {
          pin.x = -140;
          pin.vx = Math.abs(pin.vx) * 0.6;
        } else if (pin.x > 140) {
          pin.x = 140;
          pin.vx = -Math.abs(pin.vx) * 0.6;
        }

        // Pin vs Pin collisions (Chain reactions!)
        for (let j = i + 1; j < s.pins.length; j++) {
          const other = s.pins[j];
          const pdx = other.x - pin.x;
          const pdz = other.z - pin.z;
          const pdistSq = pdx * pdx + pdz * pdz;
          const pMinDist = 26;

          if (pdistSq < pMinDist * pMinDist) {
            const pdist = Math.sqrt(pdistSq) || 1;
            const pnx = pdx / pdist;
            const pnz = pdz / pdist;

            // If other pin wasn't knocked down yet, knock it down!
            if (!other.isKnockedDown) {
              other.isKnockedDown = true;
              s.totalPinsKnockedThisShot++;
              soundManager.playPinHitSound(0.9);
            }

            // Transfer kinetic energy
            const impulse = (pin.vx * pnx + pin.vz * pnz) * 0.8;
            if (impulse > 0.5) {
              pin.vx -= pnx * impulse * 0.5;
              pin.vz -= pnz * impulse * 0.5;
              other.vx += pnx * impulse * 0.8;
              other.vz += pnz * impulse * 0.8;
              other.vy += 8 + Math.random() * 8;
              other.vRotX += (Math.random() - 0.5) * 0.3;
              other.vRotZ += (Math.random() - 0.5) * 0.3;
            }
          }
        }
      });

      // 4. CHECK IF SHOT IS SETTLED
      if (s.phase === 'rolling') {
        const elapsed = performance.now() - s.shotStartTime;
        // Either ball has stopped / gone past pit, and pins have settled, or 3.2 seconds timeout
        const pinsMoving = s.pins.some(
          (p) => p.isKnockedDown && (Math.abs(p.vx) > 0.4 || Math.abs(p.vz) > 0.4 || p.y > 0.5)
        );

        if ((elapsed > 1800 && !pinsMoving) || elapsed > 3400) {
          s.phase = 'settled';
          const standingNow = s.pins.filter((p) => !p.isKnockedDown).length;
          const totalPins = s.pins.length;
          const knockedDownTotal = totalPins - standingNow;
          const knockedDownThisShot = s.totalPinsKnockedThisShot;

          const isStrike = standingNow === 0 && s.standingBeforeKick === totalPins;
          const isSpare = standingNow === 0 && s.standingBeforeKick < totalPins;

          if (isStrike) {
            soundManager.playStrikeFanfare();
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
            });
          }

          onShotSettled(knockedDownThisShot, isStrike, isSpare, s.ball.speedKmh);
        }
      }

      // 5. UPDATE COMICS & TRAILS
      s.comics.forEach((c) => {
        c.lifetime++;
        c.y += 0.8;
        c.opacity = 1 - c.lifetime / c.maxLifetime;
      });
      s.comics = s.comics.filter((c) => c.lifetime < c.maxLifetime);

      s.ball.trail.forEach((t) => t.age++);

      // ----------------- RENDER 3D SCENE -----------------
      ctx.save();
      ctx.translate(shakeOffsetX, shakeOffsetY);

      // Background Bowling Alley Hall
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.4, '#111827');
      bgGrad.addColorStop(1, '#030712');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(-20, -20, width + 40, height + 40);

      // Perspective Projection Function
      const fov = 400;
      const project = (wx: number, wy: number, wz: number) => {
        const depth = wz - s.camZ;
        if (depth <= 5) return null;
        const scale = fov / depth;
        const sx = width / 2 + (wx - s.camX) * scale;
        const sy = height * 0.72 - (wy - s.camY) * scale;
        return { sx, sy, scale };
      };

      // Draw Horizon & Back Wall
      const pitFar = project(0, 0, 1150);
      if (pitFar) {
        // Alley background wall
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, pitFar.sy);

        // Alley Neon Glow Banner
        ctx.fillStyle = s.isSuperKick ? '#ef4444' : '#3b82f6';
        ctx.shadowColor = s.isSuperKick ? '#f87171' : '#60a5fa';
        ctx.shadowBlur = 15;
        ctx.fillRect(width * 0.2, pitFar.sy - 30, width * 0.6, 6);
        ctx.shadowBlur = 0;
      }

      // Draw Bowling Lane Floor (Wood grain slats)
      const nearL = project(-130, 0, -50);
      const nearR = project(130, 0, -50);
      const farL = project(-130, 0, 1100);
      const farR = project(130, 0, 1100);

      if (nearL && nearR && farL && farR) {
        // Gutters (left & right)
        const gutterL_far = project(-170, -10, 1100);
        const gutterL_near = project(-170, -10, -50);
        const gutterR_far = project(170, -10, 1100);
        const gutterR_near = project(170, -10, -50);

        // Left Gutter
        if (gutterL_far && gutterL_near) {
          ctx.beginPath();
          ctx.moveTo(gutterL_near.sx, gutterL_near.sy);
          ctx.lineTo(nearL.sx, nearL.sy);
          ctx.lineTo(farL.sx, farL.sy);
          ctx.lineTo(gutterL_far.sx, gutterL_far.sy);
          ctx.closePath();
          ctx.fillStyle = '#030712';
          ctx.fill();
        }

        // Right Gutter
        if (gutterR_far && gutterR_near) {
          ctx.beginPath();
          ctx.moveTo(nearR.sx, nearR.sy);
          ctx.lineTo(gutterR_near.sx, gutterR_near.sy);
          ctx.lineTo(gutterR_far.sx, gutterR_far.sy);
          ctx.lineTo(farR.sx, farR.sy);
          ctx.closePath();
          ctx.fillStyle = '#030712';
          ctx.fill();
        }

        // Lane Surface
        ctx.beginPath();
        ctx.moveTo(nearL.sx, nearL.sy);
        ctx.lineTo(nearR.sx, nearR.sy);
        ctx.lineTo(farR.sx, farR.sy);
        ctx.lineTo(farL.sx, farL.sy);
        ctx.closePath();

        // Polished maple wood gradient
        const laneGrad = ctx.createLinearGradient(0, nearL.sy, 0, farL.sy);
        laneGrad.addColorStop(0, '#e8b87d');
        laneGrad.addColorStop(0.5, '#c89556');
        laneGrad.addColorStop(1, '#8b5a2b');
        ctx.fillStyle = laneGrad;
        ctx.fill();

        // Lane Wooden Planks lines
        ctx.strokeStyle = 'rgba(92, 53, 19, 0.25)';
        ctx.lineWidth = 1;
        for (let px = -110; px <= 110; px += 22) {
          const p1 = project(px, 0, -50);
          const p2 = project(px, 0, 1100);
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.sx, p1.sy);
            ctx.lineTo(p2.sx, p2.sy);
            ctx.stroke();
          }
        }

        // Bowling Chevron Arrow Markers at z = 240
        const chevronZ = 240;
        [-60, -30, 0, 30, 60].forEach((cx) => {
          const pt = project(cx, 0, chevronZ);
          if (pt) {
            ctx.fillStyle = 'rgba(74, 38, 14, 0.6)';
            ctx.beginPath();
            const sz = 7 * pt.scale;
            ctx.moveTo(pt.sx, pt.sy - sz * 1.5);
            ctx.lineTo(pt.sx + sz, pt.sy + sz);
            ctx.lineTo(pt.sx, pt.sy + sz * 0.4);
            ctx.lineTo(pt.sx - sz, pt.sy + sz);
            ctx.closePath();
            ctx.fill();
          }
        });

        // Scorch marks on wood
        s.scorchMarks.forEach((m) => {
          const pt = project(m.x, 0, m.z);
          if (pt) {
            ctx.fillStyle = 'rgba(20, 10, 5, 0.6)';
            ctx.beginPath();
            ctx.ellipse(pt.sx, pt.sy, (m.width * pt.scale) / 2, 4 * pt.scale, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      // Draw Aiming Guide Trajectory Line (when aiming)
      if (s.phase === 'aim') {
        const rad = (angle * Math.PI) / 180;
        const aimDist = 650;
        const endX = Math.sin(rad) * aimDist;
        const endZ = Math.cos(rad) * aimDist;

        // Draw dotted projected path
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = power >= 0.88 ? '#ef4444' : '#fbbf24';

        ctx.beginPath();
        for (let d = 30; d <= aimDist; d += 20) {
          const px = Math.sin(rad) * d;
          const pz = Math.cos(rad) * d;
          const p = project(px, 2, pz);
          if (p) {
            if (d === 30) ctx.moveTo(p.sx, p.sy);
            else ctx.lineTo(p.sx, p.sy);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]); // reset

        // Target aiming arrow head
        const targetPt = project(endX, 2, endZ);
        if (targetPt) {
          ctx.save();
          ctx.translate(targetPt.sx, targetPt.sy);
          ctx.rotate(rad);
          ctx.fillStyle = power >= 0.88 ? '#ef4444' : '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(0, -18 * targetPt.scale);
          ctx.lineTo(12 * targetPt.scale, 12 * targetPt.scale);
          ctx.lineTo(-12 * targetPt.scale, 12 * targetPt.scale);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // Draw Ball Trail (Fiery Jet / Sonic rings)
      if (s.ball.trail.length > 1) {
        for (let i = 1; i < s.ball.trail.length; i++) {
          const t1 = s.ball.trail[i - 1];
          const t2 = s.ball.trail[i];
          const p1 = project(t1.x, t1.y, t1.z);
          const p2 = project(t2.x, t2.y, t2.z);
          if (p1 && p2) {
            const alpha = 1 - t2.age / 30;
            if (alpha > 0) {
              ctx.beginPath();
              ctx.moveTo(p1.sx, p1.sy);
              ctx.lineTo(p2.sx, p2.sy);
              ctx.lineWidth = Math.max(2, (s.isSuperKick ? 26 : 14) * p2.scale * alpha);
              ctx.strokeStyle = s.isSuperKick
                ? `rgba(239, 68, 68, ${alpha * 0.85})`
                : `rgba(245, 158, 11, ${alpha * 0.75})`;
              ctx.lineCap = 'round';
              ctx.stroke();

              // Super kick sonic boom rings
              if (s.isSuperKick && i % 4 === 0) {
                ctx.beginPath();
                ctx.arc(p2.sx, p2.sy, 18 * p2.scale * (1 + (30 - t2.age) * 0.08), 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(254, 240, 138, ${alpha * 0.6})`;
                ctx.lineWidth = 2 * p2.scale;
                ctx.stroke();
              }
            }
          }
        }
      }

      // Render Objects sorted by depth Z (painter's algorithm)
      interface Renderable {
        z: number;
        type: 'ball' | 'pin';
        item: Ball | Pin;
      }

      const objects: Renderable[] = [];
      objects.push({ z: s.ball.z, type: 'ball', item: s.ball });
      s.pins.forEach((pin) => {
        objects.push({ z: pin.z, type: 'pin', item: pin });
      });
      // Sort farthest to closest
      objects.sort((a, b) => b.z - a.z);

      objects.forEach((obj) => {
        if (obj.type === 'pin') {
          const pin = obj.item as Pin;
          const p = project(pin.x, pin.y, pin.z);
          if (!p) return;

          ctx.save();
          ctx.translate(p.sx, p.sy);

          // Rotate pin in 3D (pitch, roll)
          const angleRot = pin.rotZ + pin.rotX * 0.5;
          ctx.rotate(angleRot);

          const scale = p.scale;
          const pw = 16 * scale;
          const ph = 50 * scale;

          // Pin Shadow on ground
          if (pin.y < 30) {
            const shadowP = project(pin.x, 0, pin.z);
            if (shadowP) {
              ctx.save();
              ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
              ctx.beginPath();
              ctx.ellipse(0, 0, pw * 0.8, pw * 0.3, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }

          // Pin Body Gradient
          const pinGrad = ctx.createLinearGradient(-pw / 2, 0, pw / 2, 0);
          if (pin.isBonusPin) {
            pinGrad.addColorStop(0, '#fef08a');
            pinGrad.addColorStop(0.5, '#facc15');
            pinGrad.addColorStop(1, '#ca8a04');
          } else {
            pinGrad.addColorStop(0, '#e2e8f0');
            pinGrad.addColorStop(0.35, '#ffffff');
            pinGrad.addColorStop(0.7, '#cbd5e1');
            pinGrad.addColorStop(1, '#94a3b8');
          }

          // Draw realistic tapered bowling pin path
          ctx.fillStyle = pinGrad;
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = Math.max(1, 1.5 * scale);

          ctx.beginPath();
          // Base
          ctx.moveTo(-pw * 0.45, 0);
          // Belly flare
          ctx.bezierCurveTo(-pw * 0.65, -ph * 0.25, -pw * 0.6, -ph * 0.5, -pw * 0.25, -ph * 0.7);
          // Neck taper
          ctx.bezierCurveTo(-pw * 0.2, -ph * 0.8, -pw * 0.3, -ph * 0.9, 0, -ph);
          // Crown top curve
          ctx.bezierCurveTo(pw * 0.3, -ph * 0.9, pw * 0.2, -ph * 0.8, pw * 0.25, -ph * 0.7);
          // Right belly
          ctx.bezierCurveTo(pw * 0.6, -ph * 0.5, pw * 0.65, -ph * 0.25, pw * 0.45, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Red Stripes around neck
          ctx.fillStyle = pin.isBonusPin ? '#b45309' : '#dc2626';
          ctx.fillRect(-pw * 0.24, -ph * 0.82, pw * 0.48, ph * 0.05);
          ctx.fillRect(-pw * 0.26, -ph * 0.73, pw * 0.52, ph * 0.05);

          // Golden Star on bonus pin
          if (pin.isBonusPin) {
            ctx.fillStyle = '#b45309';
            ctx.font = `${Math.max(8, Math.round(12 * scale))}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', 0, -ph * 0.4);
          }

          ctx.restore();
        } else {
          // Draw Soccer Ball
          const ball = obj.item as Ball;
          const p = project(ball.x, ball.y, ball.z);
          if (!p) return;

          ctx.save();
          ctx.translate(p.sx, p.sy);

          const r = 18 * p.scale;

          // Ball Shadow on floor
          const shadowP = project(ball.x, 0, ball.z);
          if (shadowP) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(0, r * 0.85, r * 1.1, r * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // Fiery aura if super kick
          if (s.isSuperKick) {
            const flameR = r * (1.3 + Math.random() * 0.4);
            const flameGrad = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, flameR);
            flameGrad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
            flameGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.7)');
            flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = flameGrad;
            ctx.beginPath();
            ctx.arc(0, 0, flameR, 0, Math.PI * 2);
            ctx.fill();
          }

          // Ball Sphere base
          const sphereGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
          sphereGrad.addColorStop(0, '#ffffff');
          sphereGrad.addColorStop(0.6, '#e2e8f0');
          sphereGrad.addColorStop(1, '#64748b');

          ctx.fillStyle = sphereGrad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = Math.max(1.5, 2.5 * p.scale);
          ctx.stroke();

          // Black Soccer Pentagons rotating
          ctx.save();
          ctx.clip(); // stay inside sphere
          ctx.rotate(ball.rotation);

          ctx.fillStyle = '#0f172a';

          // Center pentagon
          const drawPentagon = (cx: number, cy: number, rad: number) => {
            ctx.beginPath();
            for (let k = 0; k < 5; k++) {
              const a = (k * 72 * Math.PI) / 180 - Math.PI / 2;
              const px = cx + Math.cos(a) * rad;
              const py = cy + Math.sin(a) * rad;
              if (k === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
          };

          drawPentagon(0, 0, r * 0.42);

          // Surrounding 5 pentagons
          for (let k = 0; k < 5; k++) {
            const a = (k * 72 * Math.PI) / 180;
            const dist = r * 0.82;
            drawPentagon(Math.cos(a) * dist, Math.sin(a) * dist, r * 0.32);
          }

          ctx.restore();

          // Specular Gloss
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.3, r * 0.15, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      });

      // 6. DRAW KID CHARACTER (in Aim Phase at bottom of screen)
      if (s.phase === 'aim') {
        const kidScreenX = width / 2 - 40;
        const kidScreenY = height * 0.72;

        ctx.save();
        ctx.translate(kidScreenX, kidScreenY);

        // Subtly animated breathing / wiggling ready stance
        const bob = Math.sin(performance.now() * 0.008) * 3;

        // Kid Cleats & Legs
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-18, -45 + bob, 10, 30);
        ctx.fillRect(8, -42 + bob, 10, 28);
        // Cleats
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-24, -15 + bob, 18, 12);
        ctx.fillRect(4, -14 + bob, 18, 12);

        // Soccer Shorts
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-20, -58 + bob, 40, 20);

        // Blue Jersey #10
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(-22, -92 + bob, 44, 38);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial Black';
        ctx.textAlign = 'center';
        ctx.fillText('10', 0, -68 + bob);

        // Head & Cap (view from slightly behind/side)
        ctx.fillStyle = '#ffdbac';
        ctx.beginPath();
        ctx.arc(0, -104 + bob, 15, 0, Math.PI * 2);
        ctx.fill();

        // Backward red cap
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(0, -107 + bob, 16, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-18, -106 + bob, 10, 6);

        // Speech bubble indicator saying "いつでも蹴れるぞ！"
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(24, -135 + bob, 95, 26, [8]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('いつでもOK！', 71, -118 + bob);

        ctx.restore();
      }

      // 7. DRAW COMIC EFFECT STICKERS ("ドガシャーン！", etc.)
      s.comics.forEach((c) => {
        const p = project(c.x, c.y, 800);
        if (p) {
          ctx.save();
          ctx.translate(p.sx, p.sy);
          ctx.globalAlpha = Math.max(0, c.opacity);
          ctx.scale(c.scale, c.scale);
          ctx.rotate(-0.06);

          ctx.font = "900 24px 'Dela Gothic One', sans-serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Thick black comic stroke
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 6;
          ctx.lineJoin = 'miter';
          ctx.strokeText(c.text, 0, 0);

          // Vibrant interior fill
          ctx.fillStyle = c.color;
          ctx.fillText(c.text, 0, 0);

          ctx.restore();
        }
      });

      ctx.restore();
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [angle, power, onShotSettled]);

  // Touch / Mouse Aim dragging handlers
  const handleTouchStart = (clientX: number, clientY: number) => {
    if (!isAiming) return;
    isDraggingRef.current = true;
    dragStartXRef.current = clientX;
    dragStartYRef.current = clientY;
    dragStartAngleRef.current = angle;
    dragMovedRef.current = false;
  };

  const handleTouchMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current || !isAiming) return;
    const deltaX = clientX - dragStartXRef.current;
    const deltaY = clientY - dragStartYRef.current;
    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      dragMovedRef.current = true;
    }
    if (onAimChange) {
      const angleDelta = deltaX * 0.08;
      const newAngle = Math.max(-14, Math.min(14, dragStartAngleRef.current + angleDelta));
      onAimChange(Math.round(newAngle * 10) / 10);
    }
  };

  const handleTouchEnd = () => {
    if (isDraggingRef.current && isAiming && !dragMovedRef.current) {
      // Tap without drag -> trigger kick!
      if (onKickRequested) {
        onKickRequested();
      }
    }
    isDraggingRef.current = false;
  };

  return (
    <div id="canvas-wrapper" className="relative w-full h-full select-none touch-none flex items-center justify-center">
      <canvas
        ref={canvasRef}
        id="bowling-game-canvas"
        width={420}
        height={560}
        className="w-full h-full max-w-[460px] max-h-[640px] rounded-3xl object-contain shadow-2xl border-4 border-slate-900 bg-black cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => handleTouchStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleTouchMove(e.clientX, e.clientY)}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={(e) => handleTouchStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleTouchMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
};
