export type GameMode = 'standard' | 'mega100' | 'onekick';

export interface Pin {
  id: number;
  // Position in 3D world space
  x: number;
  y: number; // 0 = on floor, > 0 = in air
  z: number; // 0 = foul line, ~850 = pin deck
  // Velocities
  vx: number;
  vy: number;
  vz: number;
  // Rotations (radians)
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  // Pin state
  isKnockedDown: boolean;
  isBonusPin?: boolean;
  opacity: number;
}

export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  rotation: number;
  isRolling: boolean;
  power: number; // 0 to 1
  speedKmh: number;
  trail: { x: number; y: number; z: number; age: number; color?: string }[];
}

export interface ComicEffect {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  opacity: number;
  lifetime: number;
  maxLifetime: number;
}

export interface FrameResult {
  frameNumber: number;
  kick1Pins: number;
  kick2Pins?: number;
  isStrike: boolean;
  isSpare: boolean;
  score: number;
  totalScore: number;
}
