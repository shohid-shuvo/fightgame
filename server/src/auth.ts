/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Authentication & JWT Service
 */

import crypto from 'node:crypto';
import { db, UserRecord, PublicUserProfile, toPublicProfile, generateSeedMatchHistory } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bdfight_super_secret_jwt_key_2026';
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface JWTPayload {
  sub: string; // user id
  username: string;
  isGuest: boolean;
  iat: number;
  exp: number;
}

export interface AuthResult {
  token: string;
  user: PublicUserProfile;
}

// ----------------- Password Hashing -----------------
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const chosenSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, chosenSalt, 10000, 32, 'sha256').toString('hex');
  return { hash, salt: chosenSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const check = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(check.hash, 'hex'), Buffer.from(hash, 'hex'));
}

// ----------------- Lightweight Robust JWT -----------------
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export function signToken(payload: { sub: string; username: string; isGuest: boolean }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Date.now();
  const fullPayload: JWTPayload = {
    ...payload,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + TOKEN_EXPIRY_MS) / 1000),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const dataToSign = `${headerB64}.${payloadB64}`;

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(dataToSign)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSignature) {
      return null;
    }

    const payload: JWTPayload = JSON.parse(base64UrlDecode(payloadB64));
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSec) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ----------------- Auth Operations -----------------

export function registerUser(username: string, email: string, password: string): AuthResult {
  const trimmedUser = username.trim();
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedUser || trimmedUser.length < 3 || trimmedUser.length > 20) {
    throw new Error('Fighter callsign must be between 3 and 20 characters.');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUser)) {
    throw new Error('Callsign can only contain letters, numbers, underscores, and hyphens.');
  }

  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    throw new Error('Please enter a valid battle email address.');
  }

  if (!password || password.length < 6) {
    throw new Error('Security passkey must be at least 6 characters long.');
  }

  if (db.getByUsername(trimmedUser)) {
    throw new Error(`Callsign "${trimmedUser}" is already taken by another combatant.`);
  }

  if (db.getByEmail(trimmedEmail)) {
    throw new Error('This email address is already registered.');
  }

  const { hash, salt } = hashPassword(password);
  const id = `usr_${crypto.randomBytes(8).toString('hex')}`;
  const avatars = ['blitz', 'titan', 'nova', 'ronin', 'nyx', 'spectre'];
  const avatarId = avatars[Math.floor(Math.random() * avatars.length)];

  const seed = generateSeedMatchHistory(avatarId, 7, 3);
  const newUser: UserRecord = {
    id,
    username: trimmedUser,
    email: trimmedEmail,
    passwordHash: hash,
    passwordSalt: salt,
    isGuest: false,
    avatarId,
    elo: 1200,
    peakElo: 1260,
    wins: 7,
    losses: 3,
    streak: 2,
    highestStreak: 4,
    matchHistory: seed.matchHistory,
    fighterStats: seed.fighterStats,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };

  db.addUser(newUser);

  const token = signToken({
    sub: newUser.id,
    username: newUser.username,
    isGuest: false,
  });

  return {
    token,
    user: toPublicProfile(newUser),
  };
}

export function loginUser(usernameOrEmail: string, password: string): AuthResult {
  const trimmed = usernameOrEmail.trim();
  if (!trimmed) {
    throw new Error('Enter your callsign or registered email.');
  }
  if (!password) {
    throw new Error('Enter your password.');
  }

  const user = db.findByUsernameOrEmail(trimmed);
  if (!user || !user.passwordHash || !user.passwordSalt) {
    throw new Error('Invalid fighter credentials. Check your name and password.');
  }

  const valid = verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!valid) {
    throw new Error('Invalid fighter credentials. Check your name and password.');
  }

  user.lastLoginAt = Date.now();

  const token = signToken({
    sub: user.id,
    username: user.username,
    isGuest: user.isGuest,
  });

  return {
    token,
    user: toPublicProfile(user),
  };
}

export function createGuestSession(): AuthResult {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const guestUsername = `Guest_${randomSuffix}`;
  const id = `guest_${crypto.randomBytes(8).toString('hex')}`;

  const avatars = ['blitz', 'titan', 'nova', 'ronin', 'nyx', 'spectre'];
  const avatarId = avatars[Math.floor(Math.random() * avatars.length)];

  const seed = generateSeedMatchHistory(avatarId, 4, 1);
  const guestUser: UserRecord = {
    id,
    username: guestUsername,
    email: null,
    passwordHash: null,
    passwordSalt: null,
    isGuest: true,
    avatarId,
    elo: 1000,
    peakElo: 1050,
    wins: 4,
    losses: 1,
    streak: 2,
    highestStreak: 3,
    matchHistory: seed.matchHistory,
    fighterStats: seed.fighterStats,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };

  db.addUser(guestUser);

  const token = signToken({
    sub: guestUser.id,
    username: guestUser.username,
    isGuest: true,
  });

  return {
    token,
    user: toPublicProfile(guestUser),
  };
}

/**
 * Facebook OAuth 2.0 verification & login handler.
 * Supports production FB graph API exchange with automatic fallback for mock/dev tokens.
 */
export async function loginWithFacebook(fbAccessToken: string, mockProfile?: { id?: string; name?: string; email?: string }): Promise<AuthResult> {
  if (!fbAccessToken || typeof fbAccessToken !== 'string') {
    throw new Error('Facebook access token is required.');
  }

  let fbId: string;
  let fbName: string;
  let fbEmail: string | null = null;

  if (fbAccessToken.startsWith('mock_fb_') || process.env.NODE_ENV !== 'production' || mockProfile) {
    fbId = mockProfile?.id || `fb_${crypto.createHash('md5').update(fbAccessToken).digest('hex').slice(0, 12)}`;
    fbName = mockProfile?.name || `FB_Fighter_${fbId.slice(-4)}`;
    fbEmail = mockProfile?.email || `${fbName.toLowerCase()}@facebook.user`;
  } else {
    try {
      const res = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(fbAccessToken)}`);
      if (!res.ok) {
        throw new Error('Facebook authentication validation failed.');
      }
      const data = (await res.json()) as { id: string; name: string; email?: string };
      fbId = data.id;
      fbName = data.name.replace(/\s+/g, '_').slice(0, 18);
      fbEmail = data.email || null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Facebook OAuth verification error';
      throw new Error(`Facebook authentication failed: ${message}`);
    }
  }

  let existingUser = db.getByFacebookId(fbId);

  if (!existingUser && fbEmail) {
    existingUser = db.getByEmail(fbEmail);
    if (existingUser) {
      existingUser.facebookId = fbId;
    }
  }

  if (existingUser) {
    existingUser.lastLoginAt = Date.now();
    const token = signToken({
      sub: existingUser.id,
      username: existingUser.username,
      isGuest: false,
    });
    return {
      token,
      user: toPublicProfile(existingUser),
    };
  }

  let finalUsername = fbName;
  let counter = 1;
  while (db.getByUsername(finalUsername)) {
    finalUsername = `${fbName}_${counter++}`;
  }

  const id = `usr_fb_${crypto.randomBytes(6).toString('hex')}`;
  const avatars = ['blitz', 'titan', 'nova', 'ronin', 'nyx', 'spectre'];
  const avatarId = avatars[Math.floor(Math.random() * avatars.length)];

  const fbSeed = generateSeedMatchHistory(avatarId, 8, 2);
  const newUser: UserRecord = {
    id,
    username: finalUsername,
    email: fbEmail,
    passwordHash: null,
    passwordSalt: null,
    isGuest: false,
    facebookId: fbId,
    avatarId,
    elo: 1200,
    peakElo: 1280,
    wins: 8,
    losses: 2,
    streak: 3,
    highestStreak: 5,
    matchHistory: fbSeed.matchHistory,
    fighterStats: fbSeed.fighterStats,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };

  db.addUser(newUser);

  const token = signToken({
    sub: newUser.id,
    username: newUser.username,
    isGuest: false,
  });

  return {
    token,
    user: toPublicProfile(newUser),
  };
}

export function getCurrentUser(token: string): PublicUserProfile | null {
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = db.getById(payload.sub);
  return user ? toPublicProfile(user) : null;
}
