/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Deterministic 60 FPS Simulation Step Engine
 *
 * Zero DOM / Phaser dependencies. Operates strictly on fixed-point arithmetic
 * and discrete frame states for rollback synchronization.
 */

import {
  fpFromInt,
  fpFromFloat,
  fpToInt,
  fpMul,
  fpClamp,
  fpAbs,
  intersectAABB,
  BoundingBoxFP,
} from './fixed.js';
import {
  GameState,
  PlayerState,
  PlayerAction,
  ProjectileState,
  INPUT_UP,
  INPUT_DOWN,
  INPUT_LEFT,
  INPUT_RIGHT,
  INPUT_A,
  INPUT_B,
  INPUT_C,
  INPUT_D,
} from './state.js';

export type { GameState, PlayerState, ProjectileState };
export {
  PlayerAction,
  INPUT_UP,
  INPUT_DOWN,
  INPUT_LEFT,
  INPUT_RIGHT,
  INPUT_A,
  INPUT_B,
  INPUT_C,
  INPUT_D,
};

// Physical constants in 16.16 FP
const FP_GRAVITY = fpFromFloat(1.15);
const FP_JUMP_VELOCITY = fpFromFloat(-17.5);
const FP_WALK_FWD = fpFromFloat(5.2);
const FP_WALK_BACK = fpFromFloat(3.6);
const FP_FRICTION = fpFromFloat(0.82);

const STAGE_FLOOR_Y = fpFromInt(560);
const STAGE_LEFT_WALL = fpFromInt(70);
const STAGE_RIGHT_WALL = fpFromInt(1210);

// Attack Frame Profiles (Startup, Active, Recovery in 60Hz frames)
interface AttackProfile {
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  pushbackFP: number;
  boxWidth: number;
  boxHeight: number;
  boxOffsetX: number;
  boxOffsetY: number;
  meterGain: number;
  isKnockdown: boolean;
}

const ATTACK_PROFILES: Record<string, AttackProfile> = {
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
};

/** Get player Hurtbox in fixed-point */
export function getPlayerHurtbox(p: PlayerState): BoundingBoxFP {
  const height = p.isCrouching ? p.heightFP >> 1 : p.heightFP;
  return {
    x: p.x - (p.widthFP >> 1),
    y: p.y - height,
    width: p.widthFP,
    height,
  };
}

/** Get player active Hitbox in fixed-point (or null if not in active frames) */
export function getPlayerHitbox(p: PlayerState): BoundingBoxFP | null {
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

/** Check special move inputs (e.g. 236A, 623C, or Super) */
function checkMotionInput(p: PlayerState, currentInput: number): PlayerAction | null {
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

  // Check recent input buffer for motion specials
  const buf = p.inputBuffer;
  const hasDown = buf.slice(-6).some((i) => (i & INPUT_DOWN) !== 0);
  const forwardMask = p.facing === 1 ? INPUT_RIGHT : INPUT_LEFT;
  const hasFwd = (currentInput & forwardMask) !== 0;

  // 236A (Down -> Forward + Attack)
  if (hasDown && hasFwd && (btnA || btnB)) {
    return PlayerAction.SPECIAL_MOVE;
  }

  return null;
}

/**
 * Main deterministic 60Hz tick simulation step.
 * Takes current state and player inputs, returns next state.
 */
export function stepSimulation(
  state: GameState,
  p1Input: number,
  p2Input: number
): GameState {
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
      // Time over: player with higher HP wins
      const p1 = state.players[0];
      const p2 = state.players[1];
      if (p1.hp > p2.hp) state.winner = 0;
      else if (p2.hp > p1.hp) state.winner = 1;
      else state.winner = 2; // Draw
      state.roundState = 'ROUND_OVER';
    }
  }

  // 3. Update each player's state machine & physics
  const inputs = [p1Input, p2Input];

  for (let i = 0; i < 2; i++) {
    const p = state.players[i];
    const opponent = state.players[1 - i];
    const input = inputs[i];

    // Push into input buffer
    p.inputBuffer.push(input);
    if (p.inputBuffer.length > 16) p.inputBuffer.shift();

    // Handle hitstun / blockstun recovery
    if (p.hitstunFrames > 0) {
      p.hitstunFrames -= 1;
      if (p.hitstunFrames === 0 && p.isGrounded) {
        p.action = PlayerAction.IDLE;
        p.comboCount = 0;
      }
    }

    if (p.blockstunFrames > 0) {
      p.blockstunFrames -= 1;
      if (p.blockstunFrames === 0) {
        p.action = PlayerAction.IDLE;
      }
    }

    if (p.knockdownFrames > 0) {
      p.knockdownFrames -= 1;
      if (p.knockdownFrames === 0) {
        p.action = PlayerAction.WAKEUP;
        p.actionFrame = 0;
        p.totalActionFrames = 18;
        p.isInvulnerable = true;
      }
    }

    // Advance action animation frame
    p.actionFrame += 1;

    // Check action completions
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

    // Process State Machine Transitions if actionable
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

      // Check motion specials first
      const specialAction = checkMotionInput(p, input);

      if (specialAction === PlayerAction.SUPER_MOVE) {
        p.action = PlayerAction.SUPER_MOVE;
        p.actionFrame = 0;
        p.meter = 0;
        p.hasHitThisAttack = false;
        state.hitstop = 12; // Cinematic freeze
      } else if (specialAction === PlayerAction.SPECIAL_MOVE) {
        p.action = PlayerAction.SPECIAL_MOVE;
        p.actionFrame = 0;
        p.hasHitThisAttack = false;

        // Nova fires a plasma orb projectile
        if (p.fighterId === 'nova') {
          state.projectiles.push({
            id: state.nextProjectileId++,
            ownerIndex: i as 0 | 1,
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
        // Jump
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
      // Apply horizontal velocity
      p.x += p.vx;
    }

    // Stage wall boundaries
    p.x = fpClamp(p.x, STAGE_LEFT_WALL, STAGE_RIGHT_WALL);

    // Auto-face opponent when grounded and not in attack
    if (p.isGrounded && !currentProfile && p.hitstunFrames === 0) {
      p.facing = p.x < opponent.x ? 1 : -1;
    }

    // Defensive block status (holding away from opponent)
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
    const projBox: BoundingBoxFP = {
      x: proj.x - (proj.width >> 1),
      y: proj.y - (proj.height >> 1),
      width: proj.width,
      height: proj.height,
    };

    if (intersectAABB(projBox, targetHurt) && !target.isInvulnerable) {
      // Hit target
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
        // Blocked attack
        const chip = profile.damage >> 3; // 12.5% chip damage
        defender.hp = Math.max(0, defender.hp - chip);
        defender.blockstunFrames = profile.blockstun;
        defender.action = PlayerAction.BLOCKSTUN;
        defender.vx = attacker.facing === 1 ? profile.pushbackFP >> 1 : -(profile.pushbackFP >> 1);

        attacker.meter = Math.min(1000, attacker.meter + (profile.meterGain >> 1));
        defender.meter = Math.min(1000, defender.meter + (profile.meterGain >> 1));
        state.hitstop = profile.hitstop;
      } else {
        // Direct hit!
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

        // Knockout check
        if (defender.hp <= 0) {
          state.roundState = 'ROUND_OVER';
          state.winner = i as 0 | 1;
          attacker.action = PlayerAction.VICTORY;
          defender.action = PlayerAction.DEFEAT;
          state.hitstop = 24; // Slow-motion KO freeze
          state.screenShake = 10;
        }
      }
    }
  }

  return state;
}

export const step = stepSimulation;
export { STAGE_FLOOR_Y };
export { createInitialGameState, createInitialPlayerState, cloneGameState } from './state.js';
