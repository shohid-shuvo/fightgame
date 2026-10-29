/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Deterministic Simulation Engine Unit Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fpFromInt,
  fpFromFloat,
  fpToInt,
  fpToFloat,
  fpMul,
  fpDiv,
  fpAbs,
  intersectAABB,
  DeterministicPRNG,
} from './fixed.js';
import {
  createInitialGameState,
  cloneGameState,
  PlayerAction,
  INPUT_RIGHT,
  INPUT_LEFT,
  INPUT_A,
  INPUT_B,
  INPUT_C,
  INPUT_UP,
} from './state.js';
import { stepSimulation, getPlayerHurtbox, getPlayerHitbox } from './sim.js';

test('fixed point conversion, arithmetic and division execute with integer precision', () => {
  const fiveFP = fpFromInt(5);
  const twoFP = fpFromInt(2);

  assert.equal(fpToInt(fiveFP), 5);
  assert.equal(fpToInt(twoFP), 2);

  const product = fpMul(fiveFP, twoFP);
  assert.equal(fpToInt(product), 10);

  const quotient = fpDiv(fiveFP, twoFP);
  assert.equal(fpToFloat(quotient), 2.5);

  const floatFP = fpFromFloat(3.75);
  assert.equal(fpToFloat(floatFP), 3.75);
});

test('AABB intersection accurately detects overlapping and disjoint bounding boxes', () => {
  const box1 = {
    x: fpFromInt(100),
    y: fpFromInt(100),
    width: fpFromInt(50),
    height: fpFromInt(50),
  };

  const overlappingBox = {
    x: fpFromInt(120),
    y: fpFromInt(120),
    width: fpFromInt(50),
    height: fpFromInt(50),
  };

  const disjointBox = {
    x: fpFromInt(300),
    y: fpFromInt(300),
    width: fpFromInt(50),
    height: fpFromInt(50),
  };

  assert.equal(intersectAABB(box1, overlappingBox), true);
  assert.equal(intersectAABB(box1, disjointBox), false);
});

test('PRNG produces identical sequence from same seed', () => {
  const prng1 = new DeterministicPRNG(0x42);
  const prng2 = new DeterministicPRNG(0x42);

  for (let i = 0; i < 20; i++) {
    assert.equal(prng1.nextUint32(), prng2.nextUint32());
    assert.equal(prng1.nextRange(1, 100), prng2.nextRange(1, 100));
  }
});

test('state cloning is isolated and does not mutate historical snapshots', () => {
  const state = createInitialGameState('blitz', 'titan');
  const snapshot = cloneGameState(state);

  state.frame = 999;
  state.players[0].hp = 500;
  state.players[0].inputBuffer.push(INPUT_A);

  assert.equal(snapshot.frame, 0);
  assert.equal(snapshot.players[0].hp, 1000);
  assert.equal(snapshot.players[0].inputBuffer.length, 8);
});

test('player moves forward with directional input', () => {
  const state = createInitialGameState('blitz', 'titan');
  const initialX = state.players[0].x;

  // Player 1 faces right, so INPUT_RIGHT moves forward
  stepSimulation(state, INPUT_RIGHT, 0);

  assert.ok(state.players[0].x > initialX);
  assert.equal(state.players[0].action, PlayerAction.WALK_FWD);
});

test('attack startup, active hitbox, damage resolution and hitstun work deterministically', () => {
  const state = createInitialGameState('blitz', 'titan');

  // Place players in close proximity so Light Attack lands
  state.players[0].x = fpFromInt(500);
  state.players[1].x = fpFromInt(550);

  const initialHp = state.players[1].hp;

  // Frame 1: P1 inputs Light Attack [A]
  stepSimulation(state, INPUT_A, 0);
  assert.equal(state.players[0].action, PlayerAction.ATTACK_LIGHT);

  // Step through startup frames (startup is 4 frames)
  for (let f = 0; f < 5; f++) {
    stepSimulation(state, 0, 0);
  }

  // The attack should have hit during active frames
  assert.ok(state.players[1].hp < initialHp, 'Defender took damage');
  assert.equal(state.players[1].action, PlayerAction.HITSTUN);
  assert.ok(state.players[0].meter > 0, 'Attacker gained meter');
  assert.ok(state.players[1].meter > 0, 'Defender gained meter on being hit');
});

test('blocking reduces damage and triggers blockstun without knockdown', () => {
  const state = createInitialGameState('blitz', 'titan');

  state.players[0].x = fpFromInt(500);
  state.players[1].x = fpFromInt(550);

  // P2 faces left, so holding RIGHT is holding backward (blocking)
  stepSimulation(state, INPUT_A, INPUT_RIGHT);

  for (let f = 0; f < 6; f++) {
    stepSimulation(state, 0, INPUT_RIGHT);
  }

  // Defender blocked: took chip damage (much less than full 65 damage)
  const damageTaken = 1000 - state.players[1].hp;
  assert.ok(damageTaken < 30, `Damage taken was ${damageTaken}, expected chip damage`);
  assert.equal(state.players[1].action, PlayerAction.BLOCKSTUN);
});

test('reducing HP to zero concludes round with victory and defeat actions', () => {
  const state = createInitialGameState('blitz', 'titan');

  state.players[0].x = fpFromInt(500);
  state.players[1].x = fpFromInt(550);
  state.players[1].hp = 50; // Low HP

  stepSimulation(state, INPUT_C, 0); // Heavy attack (215 damage)

  for (let f = 0; f < 14; f++) {
    stepSimulation(state, 0, 0);
  }

  assert.equal(state.players[1].hp, 0);
  assert.equal(state.roundState, 'ROUND_OVER');
  assert.equal(state.winner, 0);
  assert.equal(state.players[0].action, PlayerAction.VICTORY);
  assert.equal(state.players[1].action, PlayerAction.DEFEAT);
});
