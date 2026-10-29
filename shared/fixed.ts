/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Deterministic Fixed-Point Math & PRNG Engine
 *
 * Implements 16.16 fixed-point integer arithmetic and fast deterministic PRNG.
 * Ensures 100% identical cross-platform simulation across JavaScript runtimes,
 * eliminating all IEEE 754 floating-point drift in rollback netcode.
 */

// 16.16 fixed-point scaling factor (2^16 = 65536)
export const FP_SHIFT = 16;
export const FP_ONE = 1 << FP_SHIFT; // 65536
export const FP_HALF = FP_ONE >> 1;  // 32768

/** Convert integer to 16.16 fixed-point */
export function fpFromInt(n: number): number {
  return (n << FP_SHIFT) | 0;
}

/** Convert float to 16.16 fixed-point */
export function fpFromFloat(f: number): number {
  return Math.round(f * FP_ONE) | 0;
}

/** Convert 16.16 fixed-point to integer (truncated) */
export function fpToInt(fp: number): number {
  return (fp >> FP_SHIFT) | 0;
}

/** Convert 16.16 fixed-point to float (for renderer only) */
export function fpToFloat(fp: number): number {
  return fp / FP_ONE;
}

/** Multiply two 16.16 fixed-point numbers with integer precision */
export function fpMul(a: number, b: number): number {
  // Use BigInt internally for safe 64-bit multiplication to avoid 32-bit overflow
  return Number((BigInt(a) * BigInt(b)) >> BigInt(FP_SHIFT)) | 0;
}

/** Divide two 16.16 fixed-point numbers */
export function fpDiv(a: number, b: number): number {
  if (b === 0) return 0;
  return Number((BigInt(a) << BigInt(FP_SHIFT)) / BigInt(b)) | 0;
}

/** Absolute value in fixed-point */
export function fpAbs(fp: number): number {
  return (fp < 0 ? -fp : fp) | 0;
}

/** Sign of fixed-point number (-1, 0, 1) */
export function fpSign(fp: number): number {
  if (fp > 0) return 1;
  if (fp < 0) return -1;
  return 0;
}

/** Clamp fixed-point number between min and max */
export function fpClamp(val: number, min: number, max: number): number {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

/** Linear interpolation in fixed point */
export function fpLerp(a: number, b: number, tFp: number): number {
  return (a + fpMul(b - a, tFp)) | 0;
}

// ------------------- Deterministic Integer PRNG (XorShift32) -------------------

export class DeterministicPRNG {
  private state: number;

  constructor(seed: number = 0x1337beef) {
    this.state = seed | 0;
    if (this.state === 0) this.state = 0x1337beef;
  }

  /** Get next 32-bit unsigned pseudo-random integer */
  public nextUint32(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x | 0;
    return this.state >>> 0;
  }

  /** Return pseudo-random integer in range [min, max] inclusive */
  public nextRange(min: number, max: number): number {
    const range = (max - min + 1) | 0;
    return (min + (this.nextUint32() % range)) | 0;
  }

  public getSeed(): number {
    return this.state;
  }

  public setSeed(seed: number): void {
    this.state = seed | 0;
    if (this.state === 0) this.state = 0x1337beef;
  }
}

// ------------------- Collision Bounds (AABB) -------------------

export interface BoundingBoxFP {
  x: number;      // Fixed-point left
  y: number;      // Fixed-point top
  width: number;  // Fixed-point width
  height: number; // Fixed-point height
}

/**
 * Axis-Aligned Bounding Box (AABB) intersection check in fixed-point.
 * Returns true if box A and box B overlap.
 */
export function intersectAABB(a: BoundingBoxFP, b: BoundingBoxFP): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
