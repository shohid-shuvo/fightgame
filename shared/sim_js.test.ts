/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Unit tests targeting shared/sim.js directly
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  step,
  stepSimulation,
  createInitialGameState,
  cloneGameState,
  PlayerAction,
  INPUT_RIGHT,
  INPUT_A,
  INPUT_UP,
  STAGE_FLOOR_Y,
} from './sim.js';
import { fpFromInt } from './fixed.js';

test('shared/sim.js step function initializes and advances frame count', () => {
  const state = createInitialGameState('blitz', 'ronin');
  assert.equal(state.frame, 0);

  const nextState = stepSimulation(state, 0, 0);
  assert.equal(nextState.frame, 1);
});

test('shared/sim.js movement physics updates position with walk forward', () => {
  const state = createInitialGameState('blitz', 'ronin');
  const initialX = state.players[0].x;

  step(state, INPUT_RIGHT, 0);
  assert.ok(state.players[0].x > initialX);
  assert.equal(state.players[0].action, PlayerAction.WALK_FWD);
});

test('shared/sim.js jump physics applies upward velocity and floor landing', () => {
  const state = createInitialGameState('blitz', 'ronin');

  // Trigger jump
  step(state, INPUT_UP, 0);
  assert.equal(state.players[0].isGrounded, false);
  assert.ok(state.players[0].vy < 0, 'Negative vertical velocity (upward)');

  // Step until landing back on floor
  for (let f = 0; f < 40; f++) {
    step(state, 0, 0);
  }

  assert.equal(state.players[0].isGrounded, true);
  assert.equal(state.players[0].y, STAGE_FLOOR_Y);
  assert.equal(state.players[0].action, PlayerAction.IDLE);
});
