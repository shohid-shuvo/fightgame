/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Deterministic Fixed-Point Math & PRNG (Pure JavaScript ES Module)
 *
 * 16.16 Fixed-Point arithmetic and XorShift32 PRNG.
 * Ensures zero floating-point divergence across JS runtimes.
 */

export const FP_SHIFT = 16;
export const FP_ONE = 1 << FP_SHIFT; // 65536
export const FP_HALF = FP_ONE >> 1;  // 32768

export function fpFromInt(n) {
  return (n << FP_SHIFT) | 0;
}

export function fpFromFloat(f) {
  return Math.round(f * FP_ONE) | 0;
}

export function fpToInt(fp) {
  return (fp >> FP_SHIFT) | 0;
}

export function fpToFloat(fp) {
  return fp / FP_ONE;
}

export function fpMul(a, b) {
  return Number((BigInt(a) * BigInt(b)) >> BigInt(FP_SHIFT)) | 0;
}

export function fpDiv(a, b) {
  if (b === 0) return 0;
  return Number((BigInt(a) << BigInt(FP_SHIFT)) / BigInt(b)) | 0;
}

export function fpAbs(fp) {
  return (fp < 0 ? -fp : fp) | 0;
}

export function fpSign(fp) {
  if (fp > 0) return 1;
  if (fp < 0) return -1;
  return 0;
}

export function fpClamp(val, min, max) {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

export function fpLerp(a, b, tFp) {
  return (a + fpMul(b - a, tFp)) | 0;
}

export class DeterministicPRNG {
  constructor(seed = 0x1337beef) {
    this.state = seed | 0;
    if (this.state === 0) this.state = 0x1337beef;
  }

  nextUint32() {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x | 0;
    return this.state >>> 0;
  }

  nextRange(min, max) {
    const range = (max - min + 1) | 0;
    return (min + (this.nextUint32() % range)) | 0;
  }

  getSeed() {
    return this.state;
  }

  setSeed(seed) {
    this.state = seed | 0;
    if (this.state === 0) this.state = 0x1337beef;
  }
}

export function intersectAABB(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
