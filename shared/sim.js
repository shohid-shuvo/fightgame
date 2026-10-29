/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Deterministic 60 FPS Simulation Step Engine (Pure JavaScript ES Module)
 *
 * Scaffolds the core deterministic simulation loop:
 * - 60 FPS fixed-tick step function
 * - State machine constants and input bitmasks
 * - Fixed-point movement physics, gravity, and bounds
 * - Hitbox / Hurtbox collision and hitstop mechanics
 * - Zero DOM / Phaser dependencies for rollback netcode
 */

import {
  fpFromInt,
  fpFromFloat,
  fpToInt,
  fpToFloat,
  fpMul,
  fpClamp,
  intersectAABB,
} from './fixed.js';

// ------------------- Input Bitmask Flags (1 Byte per player per frame) -------------------
export const INPUT_UP     = 1 << 0;
export const INPUT_DOWN   = 1 << 1;
export const INPUT_LEFT   = 1 << 2;
export const INPUT_RIGHT  = 1 << 3;
export const INPUT_A      = 1 << 4; // Light Attack
export const INPUT_B      = 1 << 5; // Medium Attack
export const INPUT_C      = 1 << 6; // Heavy Attack
export const INPUT_D      = 1 << 7; // Special Drive

// ------------------- Player State Machine Constants -------------------
export const PlayerAction = Object.freeze({
  IDLE: 'IDLE',
  WALK_FWD: 'WALK_FWD',
  WALK_BACK: 'WALK_BACK',
  CROUCH: 'CROUCH',
  JUMP_STARTUP: 'JUMP_STARTUP',
  JUMP: 'JUMP',
  ATTACK_LIGHT: 'ATTACK_LIGHT',
  ATTACK_MEDIUM: 'ATTACK_MEDIUM',
  ATTACK_HEAVY: 'ATTACK_HEAVY',
  ATTACK_DRIVE: 'ATTACK_DRIVE',
  SPECIAL_MOVE: 'SPECIAL_MOVE',
  SUPER_MOVE: 'SUPER_MOVE',
  BLOCK_HIGH: 'BLOCK_HIGH',
  BLOCK_LOW: 'BLOCK_LOW',
  HITSTUN: 'HITSTUN',
  BLOCKSTUN: 'BLOCKSTUN',
  KNOCKDOWN: 'KNOCKDOWN',
  WAKEUP: 'WAKEUP',
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT',
});

// ------------------- Fixed-Point Physics Constants -------------------
export const FP_GRAVITY = fpFromFloat(1.15);
export const FP_JUMP_VELOCITY = fpFromFloat(-17.5);
export const FP_WALK_FWD = fpFromFloat(5.2);
export const FP_WALK_BACK = fpFromFloat(3.6);
export const FP_FRICTION = fpFromFloat(0.82);

export const STAGE_FLOOR_Y = fpFromInt(560);
export const STAGE_LEFT_WALL = fpFromInt(70);
export const STAGE_RIGHT_WALL = fpFromInt(1210);

// Attack Frame Profiles (Startup, Active, Recovery in 60Hz frames)
export const ATTACK_PROFILES = Object.freeze({
  [PlayerAction.ATTACK_LIGHT]: {
    startup: 4,
    active: 3,
    recovery: 7,
    damage: 65,
    hitstun: 13,
    blockstun: 7,
    hitstop: 4,
    pushbackFP: fpFromInt(6),
    boxWidth: 65,
    boxHeight: 40,
    boxOffsetX: 35,
    boxOffsetY: -90,
    meterGain: 40,
    isKnockdown: false,
  },
  [PlayerAction.ATTACK_MEDIUM]: {
    startup: 7,
    active: 4,
    recovery: 12,
    damage: 135,
    hitstun: 19,
    blockstun: 10,
    hitstop: 6,
    pushbackFP: fpFromInt(10),
    boxWidth: 80,
    boxHeight: 50,
    boxOffsetX: 40,
    boxOffsetY: -85,
    meterGain: 80,
    isKnockdown: false,
  },
  [PlayerAction.ATTACK_HEAVY]: {
    startup: 11,
    active: 5,
    recovery: 16,
    damage: 215,
    hitstun: 27,
    blockstun: 14,
    hitstop: 9,
    pushbackFP: fpFromInt(16),
    boxWidth: 100,
    boxHeight: 70,
    boxOffsetX: 45,
    boxOffsetY: -80,
    meterGain: 120,
    isKnockdown: true,
  },
  [PlayerAction.ATTACK_DRIVE]: {
    startup: 9,
    active: 6,
    recovery: 14,
    damage: 110,
    hitstun: 22,
    blockstun: 12,
    hitstop: 7,
    pushbackFP: fpFromInt(12),
    boxWidth: 85,
    boxHeight: 60,
    boxOffsetX: 40,
    boxOffsetY: -75,
    meterGain: 90,
    isKnockdown: false,
  },
  [PlayerAction.SPECIAL_MOVE]: {
    startup: 10,
    active: 8,
    recovery: 18,
    damage: 190,
    hitstun: 30,
    blockstun: 15,
    hitstop: 8,
    pushbackFP: fpFromInt(18),
    boxWidth: 115,
    boxHeight: 75,
    boxOffsetX: 50,
    boxOffsetY: -85,
    meterGain: 140,
    isKnockdown: true,
  },
  [PlayerAction.SUPER_MOVE]: {
    startup: 14,
    active: 10,
    recovery: 24,
    damage: 375,
    hitstun: 45,
    blockstun: 20,
    hitstop: 18,
    pushbackFP: fpFromInt(25),
    boxWidth: 140,
    boxHeight: 90,
    boxOffsetX: 55,
    boxOffsetY: -85,
    meterGain: 0,
    isKnockdown: true,
  },
});

/**
 * Creates an initial player state object in fixed-point.
 */
export function createInitialPlayerState(
  fighterId = 'blitz',
  startXInt = 380,
  startYInt = 560,
  facing = 1
) {
  return {
    fighterId,
    x: fpFromInt(startXInt),
    y: fpFromInt(startYInt),
    vx: 0,
    vy: 0,
    facing, // 1 = right, -1 = left
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

/**
 * Creates the complete initial game state for deterministic simulation.
 */
export function createInitialGameState(
  p1Fighter = 'blitz',
  p2Fighter = 'ronin'
) {
  return {
    frame: 0,
    round: 1,
    roundTimer: 99 * 60, // 99 seconds in 60Hz ticks
    roundState: 'FIGHT',
    winner: null,
    roundsWon: [0, 0],
    players: [
      createInitialPlayerState(p1Fighter, 380, 560, 1),
      createInitialPlayerState(p2Fighter, 900, 560, -1),
    ],
    projectiles: [],
    hitstop: 0,
    screenShake: 0,
    nextProjectileId: 1,
    rngSeed: 0x1337cafe,
  };
}

/**
 * Fast deep-clone of GameState for rollback frame history buffer.
 */
export function cloneGameState(state) {
  const clonePlayer = (p) => ({
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

/** Get player Hurtbox in fixed-point */
export function getPlayerHurtbox(p) {
  const height = p.isCrouching ? p.heightFP >> 1 : p.heightFP;
  return {
    x: p.x - (p.widthFP >> 1),
    y: p.y - height,
    width: p.widthFP,
    height,
  };
}

/** Get player active Hitbox in fixed-point */
export function getPlayerHitbox(p) {
  const profile = ATTACK_PROFILES[p.action];
  if (!profile) return null;

  const currentFrame = p.actionFrame;
  const inActive =
    currentFrame >= profile.startup &&
    currentFrame < profile.startup + profile.active;

  if (!inActive || p.hasHitThisAttack) {
    return null;
  }

  const w = fpFromInt(profile.boxWidth);
  const h = fpFromInt(profile.boxHeight);
  const ox = fpFromInt(profile.boxOffsetX);
  const oy = fpFromInt(profile.boxOffsetY);

  const x = p.facing === 1 ? p.x + ox : p.x - ox - w;
  const y = p.y + oy;

  return { x, y, width: w, height: h };
}

/**
 * Inspect motion inputs (e.g., 236A, Super)
 */
function checkMotionInput(p, currentInput) {
  const btnA = (currentInput & INPUT_A) !== 0;
  const btnB = (currentInput & INPUT_B) !== 0;
  const btnC = (currentInput & INPUT_C) !== 0;
  const btnD = (currentInput & INPUT_D) !== 0;

  // Super move: AB or CD with 1000 meter
  if ((btnA && btnB) || (btnC && btnD)) {
    if (p.meter >= 1000) {
      return PlayerAction.SUPER_MOVE;
    }
  }

  // 236 motion: Down then Forward + Button
  const buf = p.inputBuffer;
  const hasDown = buf.slice(-6).some((i) => (i & INPUT_DOWN) !== 0);
  const forwardMask = p.facing === 1 ? INPUT_RIGHT : INPUT_LEFT;
  const hasFwd = (currentInput & forwardMask) !== 0;

  if (hasDown && hasFwd && (btnA || btnB)) {
    return PlayerAction.SPECIAL_MOVE;
  }

  return null;
}

/**
 * Core 60FPS deterministic simulation step function.
 * @param {Object} state - The mutable current GameState object.
 * @param {number} p1Input - 8-bit input bitmask for Player 1.
 * @param {number} p2Input - 8-bit input bitmask for Player 2.
 * @returns {Object} The updated GameState object.
 */
export function stepSimulation(state, p1Input, p2Input) {
  state.frame += 1;

  // 1. Process Global Hitstop (freeze-frame on impacts)
  if (state.hitstop > 0) {
    state.hitstop -= 1;
    if (state.screenShake > 0) {
      state.screenShake = Math.max(0, state.screenShake - 1);
    }
    return state;
  }

  if (state.screenShake > 0) {
    state.screenShake = Math.max(0, state.screenShake - 1);
  }

  // 2. Decrement round timer
  if (state.roundState === 'FIGHT' && state.roundTimer > 0) {
    state.roundTimer -= 1;
    if (state.roundTimer === 0) {
      const p1 = state.players[0];
      const p2 = state.players[1];
      if (p1.hp > p2.hp) state.winner = 0;
      else if (p2.hp > p1.hp) state.winner = 1;
      else state.winner = 2;
      state.roundState = 'ROUND_OVER';
    }
  }

  // 3. Update each player's state machine & movement physics
  const inputs = [p1Input, p2Input];

  for (let i = 0; i < 2; i++) {
    const p = state.players[i];
    const opponent = state.players[1 - i];
    const input = inputs[i];

    p.inputBuffer.push(input);
    if (p.inputBuffer.length > 16) p.inputBuffer.shift();

    // Hitstun recovery
    if (p.hitstunFrames > 0) {
      p.hitstunFrames -= 1;
      if (p.hitstunFrames === 0 && p.isGrounded) {
        p.action = PlayerAction.IDLE;
        p.comboCount = 0;
      }
    }

    // Blockstun recovery
    if (p.blockstunFrames > 0) {
      p.blockstunFrames -= 1;
      if (p.blockstunFrames === 0) {
        p.action = PlayerAction.IDLE;
      }
    }

    // Knockdown recovery
    if (p.knockdownFrames > 0) {
      p.knockdownFrames -= 1;
      if (p.knockdownFrames === 0) {
        p.action = PlayerAction.WAKEUP;
        p.actionFrame = 0;
        p.totalActionFrames = 18;
        p.isInvulnerable = true;
      }
    }

    p.actionFrame += 1;

    // Action animation completions
    const currentProfile = ATTACK_PROFILES[p.action];
    if (currentProfile) {
      const totalFrames = currentProfile.startup + currentProfile.active + currentProfile.recovery;
      if (p.actionFrame >= totalFrames) {
        p.action = PlayerAction.IDLE;
        p.actionFrame = 0;
        p.hasHitThisAttack = false;
      }
    } else if (p.action === PlayerAction.WAKEUP && p.actionFrame >= p.totalActionFrames) {
      p.action = PlayerAction.IDLE;
      p.actionFrame = 0;
      p.isInvulnerable = false;
    }

    // Process State Transitions if actionable
    const isActionable =
      p.isGrounded &&
      p.hitstunFrames === 0 &&
      p.blockstunFrames === 0 &&
      p.knockdownFrames === 0 &&
      p.action !== PlayerAction.WAKEUP &&
      !currentProfile;

    if (isActionable) {
      const btnA = (input & INPUT_A) !== 0;
      const btnB = (input & INPUT_B) !== 0;
      const btnC = (input & INPUT_C) !== 0;
      const btnD = (input & INPUT_D) !== 0;
      const up = (input & INPUT_UP) !== 0;
      const down = (input & INPUT_DOWN) !== 0;
      const left = (input & INPUT_LEFT) !== 0;
      const right = (input & INPUT_RIGHT) !== 0;

      const specialAction = checkMotionInput(p, input);

      if (specialAction === PlayerAction.SUPER_MOVE) {
        p.action = PlayerAction.SUPER_MOVE;
        p.actionFrame = 0;
        p.meter = 0;
        p.hasHitThisAttack = false;
        state.hitstop = 12;
      } else if (specialAction === PlayerAction.SPECIAL_MOVE) {
        p.action = PlayerAction.SPECIAL_MOVE;
        p.actionFrame = 0;
        p.hasHitThisAttack = false;

        // Projectile for Nova
        if (p.fighterId === 'nova') {
          state.projectiles.push({
            id: state.nextProjectileId++,
            ownerIndex: i,
            type: 'plasma_orb',
            x: p.facing === 1 ? p.x + fpFromInt(40) : p.x - fpFromInt(40),
            y: p.y - fpFromInt(80),
            vx: p.facing === 1 ? fpFromFloat(7.5) : fpFromFloat(-7.5),
            vy: 0,
            width: fpFromInt(40),
            height: fpFromInt(40),
            damage: 150,
            hitstun: 25,
            lifeFrames: 90,
          });
        }
      } else if (btnA) {
        p.action = PlayerAction.ATTACK_LIGHT;
        p.actionFrame = 0;
        p.hasHitThisAttack = false;
      } else if (btnB) {
        p.action = PlayerAction.ATTACK_MEDIUM;
        p.actionFrame = 0;
        p.hasHitThisAttack = false;
      } else if (btnC) {
        p.action = PlayerAction.ATTACK_HEAVY;
        p.actionFrame = 0;
        p.hasHitThisAttack = false;
      } else if (btnD) {
        p.action = PlayerAction.ATTACK_DRIVE;
        p.actionFrame = 0;
        p.hasHitThisAttack = false;
      } else if (up) {
        // Jump impulse
        p.isGrounded = false;
        p.action = PlayerAction.JUMP;
        p.vy = FP_JUMP_VELOCITY;
        if (right) p.vx = FP_WALK_FWD;
        else if (left) p.vx = -FP_WALK_FWD;
      } else if (down) {
        p.action = PlayerAction.CROUCH;
        p.isCrouching = true;
        p.vx = 0;
      } else {
        p.isCrouching = false;
        const forward = p.facing === 1 ? right : left;
        const backward = p.facing === 1 ? left : right;

        if (forward) {
          p.action = PlayerAction.WALK_FWD;
          p.vx = p.facing === 1 ? FP_WALK_FWD : -FP_WALK_FWD;
        } else if (backward) {
          p.action = PlayerAction.WALK_BACK;
          p.vx = p.facing === 1 ? -FP_WALK_BACK : FP_WALK_BACK;
        } else {
          p.action = PlayerAction.IDLE;
          p.vx = fpMul(p.vx, FP_FRICTION);
        }
      }
    }

    // Airborne physics
    if (!p.isGrounded) {
      p.vy += FP_GRAVITY;
      p.y += p.vy;

      // Floor collision check
      if (p.y >= STAGE_FLOOR_Y) {
        p.y = STAGE_FLOOR_Y;
        p.vy = 0;
        p.vx = 0;
        p.isGrounded = true;
        if (p.action === PlayerAction.JUMP) {
          p.action = PlayerAction.IDLE;
        }
      }
    } else {
      p.x += p.vx;
    }

    // Stage wall bounds
    p.x = fpClamp(p.x, STAGE_LEFT_WALL, STAGE_RIGHT_WALL);

    // Auto-facing
    if (p.isGrounded && !currentProfile && p.hitstunFrames === 0) {
      p.facing = p.x < opponent.x ? 1 : -1;
    }

    // Defensive blocking check
    const holdingBack = p.facing === 1 ? (input & INPUT_LEFT) !== 0 : (input & INPUT_RIGHT) !== 0;
    p.isBlocking = holdingBack && p.hitstunFrames === 0 && p.action !== PlayerAction.ATTACK_LIGHT;
  }

  // 4. Update Projectiles
  for (let pIdx = state.projectiles.length - 1; pIdx >= 0; pIdx--) {
    const proj = state.projectiles[pIdx];
    proj.x += proj.vx;
    proj.y += proj.vy;
    proj.lifeFrames -= 1;

    const target = state.players[1 - proj.ownerIndex];
    const targetHurt = getPlayerHurtbox(target);
    const projBox = {
      x: proj.x - (proj.width >> 1),
      y: proj.y - (proj.height >> 1),
      width: proj.width,
      height: proj.height,
    };

    if (intersectAABB(projBox, targetHurt) && !target.isInvulnerable) {
      if (target.isBlocking) {
        target.hp = Math.max(0, target.hp - (proj.damage >> 3));
        target.blockstunFrames = 12;
        target.action = PlayerAction.BLOCKSTUN;
        state.hitstop = 4;
      } else {
        target.hp = Math.max(0, target.hp - proj.damage);
        target.hitstunFrames = proj.hitstun;
        target.action = PlayerAction.HITSTUN;
        state.hitstop = 6;
        state.screenShake = 4;
      }
      state.projectiles.splice(pIdx, 1);
      continue;
    }

    if (proj.lifeFrames <= 0 || proj.x < STAGE_LEFT_WALL || proj.x > STAGE_RIGHT_WALL) {
      state.projectiles.splice(pIdx, 1);
    }
  }

  // 5. Hitbox vs Hurtbox Collision Detection & Resolution
  for (let i = 0; i < 2; i++) {
    const attacker = state.players[i];
    const defender = state.players[1 - i];

    const hitbox = getPlayerHitbox(attacker);
    if (!hitbox || defender.isInvulnerable) continue;

    const hurtbox = getPlayerHurtbox(defender);

    if (intersectAABB(hitbox, hurtbox)) {
      attacker.hasHitThisAttack = true;
      const profile = ATTACK_PROFILES[attacker.action];

      if (defender.isBlocking) {
        const chip = profile.damage >> 3;
        defender.hp = Math.max(0, defender.hp - chip);
        defender.blockstunFrames = profile.blockstun;
        defender.action = PlayerAction.BLOCKSTUN;
        defender.vx = attacker.facing === 1 ? profile.pushbackFP >> 1 : -(profile.pushbackFP >> 1);

        attacker.meter = Math.min(1000, attacker.meter + (profile.meterGain >> 1));
        defender.meter = Math.min(1000, defender.meter + (profile.meterGain >> 1));
        state.hitstop = profile.hitstop;
      } else {
        defender.hp = Math.max(0, defender.hp - profile.damage);
        defender.hitstunFrames = profile.hitstun;
        defender.action = profile.isKnockdown ? PlayerAction.KNOCKDOWN : PlayerAction.HITSTUN;
        defender.vx = attacker.facing === 1 ? profile.pushbackFP : -profile.pushbackFP;

        if (profile.isKnockdown) {
          defender.knockdownFrames = 30;
          defender.isGrounded = true;
        }

        defender.comboCount += 1;
        attacker.meter = Math.min(1000, attacker.meter + profile.meterGain);
        defender.meter = Math.min(1000, defender.meter + (profile.meterGain >> 1));

        state.hitstop = profile.hitstop;
        state.screenShake = profile.hitstop > 6 ? 6 : 2;

        if (defender.hp <= 0) {
          state.roundState = 'ROUND_OVER';
          state.winner = i;
          attacker.action = PlayerAction.VICTORY;
          defender.action = PlayerAction.DEFEAT;
          state.hitstop = 24;
          state.screenShake = 10;
        }
      }
    }
  }

  return state;
}

// Alias for convenience
export const step = stepSimulation;
