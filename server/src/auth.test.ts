/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Unit tests for Authentication & Token Logic
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  registerUser,
  loginUser,
  createGuestSession,
  loginWithFacebook,
  getCurrentUser,
} from './auth.js';

test('password hashing produces valid hash and verifies correctly', () => {
  const password = 'SuperSecretFighterKey99';
  const { hash, salt } = hashPassword(password);
  assert.ok(hash.length > 20);
  assert.ok(salt.length > 10);

  const isMatch = verifyPassword(password, hash, salt);
  assert.equal(isMatch, true);

  const isWrong = verifyPassword('WrongPassword', hash, salt);
  assert.equal(isWrong, false);
});

test('JWT signing and verification roundtrip operates correctly', () => {
  const token = signToken({
    sub: 'usr_unit_test_1',
    username: 'TestStriker',
    isGuest: false,
  });

  assert.ok(token);
  assert.equal(token.split('.').length, 3);

  const payload = verifyToken(token);
  assert.ok(payload);
  assert.equal(payload.sub, 'usr_unit_test_1');
  assert.equal(payload.username, 'TestStriker');
  assert.equal(payload.isGuest, false);

  const tampered = token + 'tamper';
  assert.equal(verifyToken(tampered), null);
});

test('user registration validates input constraints and prevents duplicates', () => {
  const uniqueName = `Strike_${Date.now()}`;
  const email = `${uniqueName.toLowerCase()}@bdfight.gg`;
  const result = registerUser(uniqueName, email, 'DragonKick99!');

  assert.ok(result.token);
  assert.equal(result.user.username, uniqueName);
  assert.equal(result.user.elo, 1200);
  assert.equal(result.user.isGuest, false);

  // Duplicate registration should throw
  assert.throws(() => {
    registerUser(uniqueName, 'other@bdfight.gg', 'DragonKick99!');
  }, /already taken/);
});

test('user login verifies credentials and returns token', () => {
  const uniqueName = `Login_${Date.now()}`;
  const email = `${uniqueName.toLowerCase()}@bdfight.gg`;
  const password = 'ValidPassword123';
  registerUser(uniqueName, email, password);

  // Login by username
  const res1 = loginUser(uniqueName, password);
  assert.ok(res1.token);
  assert.equal(res1.user.username, uniqueName);

  // Login by email
  const res2 = loginUser(email, password);
  assert.ok(res2.token);
  assert.equal(res2.user.username, uniqueName);

  // Invalid password throws
  assert.throws(() => {
    loginUser(uniqueName, 'BadPassword');
  }, /Invalid fighter credentials/);
});

test('guest mode creates rapid guest session with unique username', () => {
  const guest1 = createGuestSession();
  const guest2 = createGuestSession();

  assert.ok(guest1.token);
  assert.equal(guest1.user.isGuest, true);
  assert.ok(guest1.user.username.startsWith('Guest_'));
  assert.notEqual(guest1.user.id, guest2.user.id);
});

test('facebook oauth flow provisions and links fighter account', async () => {
  const mockFbToken = 'mock_fb_token_alpha_warrior';
  const result = await loginWithFacebook(mockFbToken, {
    name: 'AlphaWarrior',
    email: 'alpha@warriors.gg',
  });

  assert.ok(result.token);
  assert.equal(result.user.isGuest, false);

  // Profile lookup
  const profile = getCurrentUser(result.token);
  assert.ok(profile);
  assert.equal(profile.id, result.user.id);
});

test('social profile contains match history, win/loss ratio, and favorite fighter stats', () => {
  const uniqueName = `Soc_${Date.now() % 100000}`;
  const email = `${uniqueName.toLowerCase()}@bdfight.gg`;
  const result = registerUser(uniqueName, email, 'DragonKick99!');

  const profile = getCurrentUser(result.token);
  assert.ok(profile);
  assert.ok(profile.totalMatches > 0, 'Total matches recorded');
  assert.ok(profile.winRate >= 0, 'Win rate calculated');
  assert.ok(profile.favoriteFighter, 'Favorite fighter identified');
  assert.ok(profile.favoriteFighter.fighterId, 'Favorite fighter has ID');
  assert.ok(profile.matchHistory.length > 0, 'Match history has entries');
  assert.ok(profile.fighterStatsList.length === 6, 'All 6 roster fighters tracked');
});

