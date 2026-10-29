/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Deterministic Match Replay Model & Pre-recorded Bouts
 */

import {
  INPUT_UP,
  INPUT_DOWN,
  INPUT_LEFT,
  INPUT_RIGHT,
  INPUT_A,
  INPUT_B,
  INPUT_C,
  INPUT_D,
} from './sim.js';

export interface MatchReplayData {
  id: string;
  title: string;
  timestamp: number;
  p1Fighter: string;
  p2Fighter: string;
  p1Name: string;
  p2Name: string;
  p1Avatar: string;
  p2Avatar: string;
  rngSeed: number;
  totalFrames: number;
  winner: 0 | 1 | 2 | null;
  p1Inputs: number[];
  p2Inputs: number[];
}

/**
 * Procedurally generates an exciting tournament-level replay between two fighters.
 */
export function generateShowcaseReplay(
  id: string,
  title: string,
  p1Fighter: string,
  p2Fighter: string,
  p1Name: string,
  p2Name: string
): MatchReplayData {
  const totalFrames = 360; // 6 seconds at 60Hz
  const p1Inputs = new Array(totalFrames).fill(0);
  const p2Inputs = new Array(totalFrames).fill(0);

  // Frame 10-40: Both walk forward towards each other
  for (let f = 10; f < 38; f++) {
    p1Inputs[f] = INPUT_RIGHT;
    p2Inputs[f] = INPUT_LEFT;
  }

  // Frame 40: P1 strikes with Light Attack [A]
  p1Inputs[40] = INPUT_A;

  // Frame 48: P1 chains into Medium Attack [B]
  p1Inputs[48] = INPUT_B;

  // Frame 58: P2 blocks by holding back (right)
  for (let f = 58; f < 80; f++) {
    p2Inputs[f] = INPUT_RIGHT;
  }

  // Frame 65: P1 Heavy Attack [C] hits P2 guard
  p1Inputs[65] = INPUT_C;

  // Frame 90: P2 counters with Dragon Punch / Special [236A]
  p2Inputs[90] = INPUT_DOWN;
  p2Inputs[91] = INPUT_DOWN | INPUT_LEFT;
  p2Inputs[92] = INPUT_LEFT | INPUT_A;

  // Frame 130: P1 jumps over P2
  p1Inputs[130] = INPUT_UP | INPUT_RIGHT;

  // Frame 145: P1 airborne Light Attack
  p1Inputs[145] = INPUT_A;

  // Frame 180: P2 crouch guard
  for (let f = 180; f < 210; f++) {
    p2Inputs[f] = INPUT_DOWN | INPUT_RIGHT;
  }

  // Frame 220: P1 executes Special Drive [D]
  p1Inputs[220] = INPUT_D;

  // Frame 260: P1 charges 236A Special Strike
  p1Inputs[260] = INPUT_DOWN;
  p1Inputs[261] = INPUT_DOWN | INPUT_RIGHT;
  p1Inputs[262] = INPUT_RIGHT | INPUT_B;

  // Frame 310: Climax Heavy Finisher
  p1Inputs[310] = INPUT_C;

  return {
    id,
    title,
    timestamp: Date.now() - 3600000 * 3,
    p1Fighter,
    p2Fighter,
    p1Name,
    p2Name,
    p1Avatar: p1Fighter,
    p2Avatar: p2Fighter,
    rngSeed: 0x1337cafe,
    totalFrames,
    winner: 0,
    p1Inputs,
    p2Inputs,
  };
}

export const SHOWCASE_REPLAYS: MatchReplayData[] = [
  generateShowcaseReplay(
    'rep_blitz_vs_ronin_clash',
    'Grand Finals: Blitz vs Ronin 60Hz Comeback',
    'blitz',
    'ronin',
    'NeonStriker',
    'CyberRonin'
  ),
  generateShowcaseReplay(
    'rep_nyx_parry_mastery',
    'Ranked Diamond: Nyx Void Mirror Counter Play',
    'nyx',
    'titan',
    'Viper_Apex',
    'IronColossus'
  ),
  generateShowcaseReplay(
    'rep_nova_space_control',
    'Space Control: Nova Plasma Orb Zoning',
    'nova',
    'spectre',
    'PulseWarden',
    'ShadowGhost'
  ),
];
