/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Express REST API Endpoints
 */

import express, { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  createGuestSession,
  loginWithFacebook,
  getCurrentUser,
  verifyToken,
} from './auth.js';
import { db } from './db.js';

export const apiRouter = express.Router();
export const apiApp = express();

apiApp.use(express.json());
apiApp.use(apiRouter);

// Health check
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    game: 'bdfight',
    version: '1.0.0',
    timestamp: Date.now(),
  });
});

// POST /api/auth/register
apiRouter.post('/auth/register', (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email, and password are required.' });
      return;
    }

    const result = registerUser(username, email, password);
    res.status(201).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({ error: msg });
  }
});

// POST /api/auth/login
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body || {};
    if (!usernameOrEmail || !password) {
      res.status(400).json({ error: 'Callsign/email and password are required.' });
      return;
    }

    const result = loginUser(usernameOrEmail, password);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Authentication failed';
    res.status(401).json({ error: msg });
  }
});

// POST /api/auth/guest
apiRouter.post('/auth/guest', (_req: Request, res: Response) => {
  try {
    const result = createGuestSession();
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create guest session';
    res.status(500).json({ error: msg });
  }
});

// POST /api/auth/facebook
apiRouter.post('/auth/facebook', async (req: Request, res: Response) => {
  try {
    const { fbAccessToken, mockProfile } = req.body || {};
    if (!fbAccessToken) {
      res.status(400).json({ error: 'fbAccessToken parameter is missing.' });
      return;
    }

    const result = await loginWithFacebook(fbAccessToken, mockProfile);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Facebook login failed';
    res.status(400).json({ error: msg });
  }
});

// GET /api/auth/me
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header.' });
    return;
  }

  const token = authHeader.slice(7);
  const user = getCurrentUser(token);
  if (!user) {
    res.status(401).json({ error: 'Session expired or invalid token.' });
    return;
  }

  res.json({ user });
});

// GET /api/leaderboard
apiRouter.get('/leaderboard', (_req: Request, res: Response) => {
  const topFighters = db.getAllLeaderboard().slice(0, 20);
  res.json({ fighters: topFighters });
});
