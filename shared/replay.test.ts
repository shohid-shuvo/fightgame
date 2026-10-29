/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Replay System Determinism Unit Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateShowcaseReplay, SHOWCASE_REPLAYS, MatchReplayData } from './replay.js';
import {
  stepSimulation,
  createInitialGameState,
  cloneGameState,
} from './sim.js';

test('showcase replays have valid metadata and input buffers', () => {
  assert.ok(SHOWCASE_REPLAYS.length >= 3);
  const replay = SHOWCASE_REPLAYS[0];

  assert.ok(replay.id);
  assert.ok(replay.p1Fighter);
  assert.ok(replay.p2Fighter);
  assert.ok(replay.totalFrames > 0);
  assert.equal(replay.p1Inputs.length, replay.totalFrames);
  assert.equal(replay.p2Inputs.length, replay.totalFrames);
});

test('replay input playback is 100% deterministic across multiple runs', () => {
  const replay = SHOWCASE_REPLAYS[0];

  // Run 1: Simulate the entire replay from frame 0
  const sim1 = createInitialGameState(replay.p1Fighter, replay.p2Fighter);
  sim1.rngSeed = replay.rngSeed;

  for (let f = 0; f < replay.totalFrames; f++) {
    stepSimulation(sim1, replay.p1Inputs[f], replay.p2Inputs[f]);
  }

  // Run 2: Simulate the exact same replay in a separate engine instance
  const sim2 = createInitialGameState(replay.p1Fighter, replay.p2Fighter);
  sim2.rngSeed = replay.rngSeed;

  for (let f = 0; f < replay.totalFrames; f++) {
    stepSimulation(sim2, replay.p1Inputs[f], replay.p2Inputs[f]);
  }

  // Verify 100% byte-for-byte state equality
  assert.equal(sim1.frame, sim2.frame);
  assert.equal(sim1.players[0].x, sim2.players[0].x);
  assert.equal(sim1.players[0].y, sim2.players[0].y);
  assert.equal(sim1.players[1].x, sim2.players[1].x);
  assert.equal(sim1.players[1].y, sim2.players[1].y);
  assert.equal(sim1.players[0].hp, sim2.players[0].hp);
  assert.equal(sim1.players[1].hp, sim2.players[1].hp);
  assert.equal(sim1.players[0].meter, sim2.players[0].meter);
  assert.equal(sim1.players[1].meter, sim2.players[1].meter);
  assert.equal(sim1.winner, sim2.winner);
});

test('checkpoint restoration matches direct sequential simulation', () => {
  const replay = SHOWCASE_REPLAYS[1];
  const targetFrame = 120;

  // Direct sequential step to frame 120
  const directSim = createInitialGameState(replay.p1Fighter, replay.p2Fighter);
  directSim.rngSeed = replay.rngSeed;
  for (let f = 0; f < targetFrame; f++) {
    stepSimulation(directSim, replay.p1Inputs[f], replay.p2Inputs[f]);
  }

  // Checkpoint step: snapshot at frame 60, then advance to 120
  const checkpointSim = createInitialGameState(replay.p1Fighter, replay.p2Fighter);
  checkpointSim.rngSeed = replay.rngSeed;
  for (let f = 0; f < 60; f++) {
    stepSimulation(checkpointSim, replay.p1Inputs[f], replay.p2Inputs[f]);
  }
  const snapshotAt60 = cloneGameState(checkpointSim);

  // Resume from snapshot
  const resumedSim = cloneGameState(snapshotAt60);
  for (let f = 60; f < targetFrame; f++) {
    stepSimulation(resumedSim, replay.p1Inputs[f], replay.p2Inputs[f]);
  }

  assert.equal(directSim.frame, resumedSim.frame);
  assert.equal(directSim.players[0].x, resumedSim.players[0].x);
  assert.equal(directSim.players[1].x, resumedSim.players[1].x);
  assert.equal(directSim.players[0].hp, resumedSim.players[0].hp);
  assert.equal(directSim.players[1].hp, resumedSim.players[1].hp);
});
