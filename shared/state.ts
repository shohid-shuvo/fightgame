/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Deterministic State Machine & Networked State Object
 */

import { BoundingBoxFP, fpFromInt } from './fixed.js';

// ------------------- Input Bitmask Flags (1 Byte per player per frame) -------------------
export const INPUT_UP     = 1 << 0;
export const INPUT_DOWN   = 1 << 1;
export const INPUT_LEFT   = 1 << 2;
export const INPUT_RIGHT  = 1 << 3;
export const INPUT_A      = 1 << 4; // Light Attack
export const INPUT_B      = 1 << 5; // Medium Attack
export const INPUT_C      = 1 << 6; // Heavy Attack
export const INPUT_D      = 1 << 7; // Special Drive

// ------------------- Player State Machine Actions -------------------
export enum PlayerAction {
  IDLE = 'IDLE',
  WALK_FWD = 'WALK_FWD',
  WALK_BACK = 'WALK_BACK',
  CROUCH = 'CROUCH',
  JUMP_STARTUP = 'JUMP_STARTUP',
  JUMP = 'JUMP',
  ATTACK_LIGHT = 'ATTACK_LIGHT',
  ATTACK_MEDIUM = 'ATTACK_MEDIUM',
  ATTACK_HEAVY = 'ATTACK_HEAVY',
  ATTACK_DRIVE = 'ATTACK_DRIVE',
  SPECIAL_MOVE = 'SPECIAL_MOVE',
  SUPER_MOVE = 'SUPER_MOVE',
  BLOCK_HIGH = 'BLOCK_HIGH',
  BLOCK_LOW = 'BLOCK_LOW',
  HITSTUN = 'HITSTUN',
  BLOCKSTUN = 'BLOCKSTUN',
  KNOCKDOWN = 'KNOCKDOWN',
  WAKEUP = 'WAKEUP',
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT',
}

// ------------------- Active Projectile State -------------------
export interface ProjectileState {
  id: number;
  ownerIndex: 0 | 1;
  type: string;
  x: number;       // FP
  y: number;       // FP
  vx: number;      // FP
  vy: number;      // FP
  width: number;   // FP
  height: number;  // FP
  damage: number;
  hitstun: number;
  lifeFrames: number;
}

// ------------------- Fighter Player State Object -------------------
export interface PlayerState {
  fighterId: string;       // 'blitz' | 'titan' | 'nova' | 'ronin' | 'nyx' | 'spectre'
  x: number;               // 16.16 FP
  y: number;               // 16.16 FP (ground at floor level)
  vx: number;              // 16.16 FP
  vy: number;              // 16.16 FP
  facing: 1 | -1;          // 1 = facing right, -1 = facing left
  action: PlayerAction;
  actionFrame: number;     // Frame count in current action
  totalActionFrames: number;
  hp: number;              // 0 to 1000
  meter: number;           // 0 to 1000
  isGrounded: boolean;
  isCrouching: boolean;
  isBlocking: boolean;
  isInvulnerable: boolean;
  hitstunFrames: number;
  blockstunFrames: number;
  knockdownFrames: number;
  hitstopFrames: number;
  comboCount: number;
  inputBuffer: number[];   // Last 8 inputs for motion detection (e.g. 236A)
  hasHitThisAttack: boolean;
  widthFP: number;         // Collision width
  heightFP: number;        // Collision height
}

// ------------------- Complete Deterministic Game State (Synced over network) -------------------
export interface GameState {
  frame: number;           // 60Hz deterministic tick
  round: number;           // Current round (1, 2, 3)
  roundTimer: number;      // Remaining frames (e.g. 99 * 60)
  roundState: 'INTRO' | 'FIGHT' | 'ROUND_OVER' | 'MATCH_OVER';
  winner: 0 | 1 | 2 | null; // 0 = P1, 1 = P2, 2 = Draw, null = ongoing
  roundsWon: [number, number];
  players: [PlayerState, PlayerState];
  projectiles: ProjectileState[];
  hitstop: number;         // Global hit-freeze frames
  screenShake: number;     // Screen shake intensity
  nextProjectileId: number;
  rngSeed: number;
}

// ------------------- Factory & State Cloning (For Rollback Buffers) -------------------

export function createInitialPlayerState(
  fighterId: string,
  startXInt: number,
  startYInt: number,
  facing: 1 | -1
): PlayerState {
  return {
    fighterId,
    x: fpFromInt(startXInt),
    y: fpFromInt(startYInt),
    vx: 0,
    vy: 0,
    facing,
    action: PlayerAction.IDLE,
    actionFrame: 0,
    totalActionFrames: 60,
    hp: 1000,
    meter: 0,
    isGrounded: true,
    isCrouching: false,
    isBlocking: false,
    isInvulnerable: false,
    hitstunFrames: 0,
    blockstunFrames: 0,
    knockdownFrames: 0,
    hitstopFrames: 0,
    comboCount: 0,
    inputBuffer: [0, 0, 0, 0, 0, 0, 0, 0],
    hasHitThisAttack: false,
    widthFP: fpFromInt(70),
    heightFP: fpFromInt(140),
  };
}

export function createInitialGameState(
  p1Fighter: string = 'blitz',
  p2Fighter: string = 'ronin'
): GameState {
  const floorY = 560;
  return {
    frame: 0,
    round: 1,
    roundTimer: 99 * 60,
    roundState: 'FIGHT',
    winner: null,
    roundsWon: [0, 0],
    players: [
      createInitialPlayerState(p1Fighter, 380, floorY, 1),
      createInitialPlayerState(p2Fighter, 900, floorY, -1),
    ],
    projectiles: [],
    hitstop: 0,
    screenShake: 0,
    nextProjectileId: 1,
    rngSeed: 0x1337cafe,
  };
}

/**
 * Deep clones the entire GameState without JSON serialize overhead.
 * Used at 60Hz by the rollback buffer to store historical snapshots.
 */
export function cloneGameState(state: GameState): GameState {
  const clonePlayer = (p: PlayerState): PlayerState => ({
    ...p,
    inputBuffer: [...p.inputBuffer],
  });

  return {
    frame: state.frame,
    round: state.round,
    roundTimer: state.roundTimer,
    roundState: state.roundState,
    winner: state.winner,
    roundsWon: [state.roundsWon[0], state.roundsWon[1]],
    players: [clonePlayer(state.players[0]), clonePlayer(state.players[1])],
    projectiles: state.projectiles.map((proj) => ({ ...proj })),
    hitstop: state.hitstop,
    screenShake: state.screenShake,
    nextProjectileId: state.nextProjectileId,
    rngSeed: state.rngSeed,
  };
}
