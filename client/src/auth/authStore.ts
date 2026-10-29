/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Client Auth State Manager & API Client
 */

export interface MatchHistoryEntry {
  id: string;
  opponentName: string;
  opponentAvatar: string;
  playerFighter: string;
  opponentFighter: string;
  result: 'VICTORY' | 'DEFEAT';
  playerEloDelta: number;
  durationSeconds: number;
  timestamp: number;
}

export interface FighterStat {
  fighterId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number; // percentage
  masteryLevel: number;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  email: string | null;
  isGuest: boolean;
  facebookId?: string;
  avatarId: string;
  elo: number;
  peakElo: number;
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  streak: number;
  highestStreak: number;
  rankTier: string;
  favoriteFighter: FighterStat;
  fighterStatsList: FighterStat[];
  matchHistory: MatchHistoryEntry[];
  createdAt: number;
}

const TOKEN_KEY = 'bdfight_auth_token';

class AuthStore {
  private user: PublicUserProfile | null = null;
  private token: string | null = null;
  private listeners: Set<() => void> = new Set();
  private loading: boolean = false;
  private error: string | null = null;

  constructor() {
    this.token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getState() {
    return {
      user: this.user,
      token: this.token,
      loading: this.loading,
      error: this.error,
      isAuthenticated: !!this.user,
    };
  }

  public async initSession(): Promise<void> {
    if (!this.token) {
      return;
    }
    this.loading = true;
    this.error = null;
    this.notify();

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        this.user = data.user;
      } else {
        // Token expired or invalid
        this.logout();
      }
    } catch {
      // Offline fallback: don't clear token immediately if network fails
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  public async login(usernameOrEmail: string, password: string): Promise<boolean> {
    this.loading = true;
    this.error = null;
    this.notify();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication rejected by security mainframe.');
      }

      this.setSession(data.token, data.user);
      return true;
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Login failed';
      this.notify();
      return false;
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  public async register(username: string, email: string, password: string): Promise<boolean> {
    this.loading = true;
    this.error = null;
    this.notify();

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Enlistment failed. Callsign could be taken.');
      }

      this.setSession(data.token, data.user);
      return true;
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Registration failed';
      this.notify();
      return false;
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  public async loginAsGuest(): Promise<boolean> {
    this.loading = true;
    this.error = null;
    this.notify();

    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Guest terminal unavailable.');
      }

      this.setSession(data.token, data.user);
      return true;
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Guest access failed';
      this.notify();
      return false;
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  public async loginWithFacebook(customToken?: string, mockProfile?: { name?: string }): Promise<boolean> {
    this.loading = true;
    this.error = null;
    this.notify();

    try {
      const fbAccessToken = customToken || `mock_fb_access_token_${Date.now()}`;
      const res = await fetch('/api/auth/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fbAccessToken, mockProfile }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Facebook authentication failed.');
      }

      this.setSession(data.token, data.user);
      return true;
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Facebook login failed';
      this.notify();
      return false;
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  public logout(): void {
    this.token = null;
    this.user = null;
    this.error = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
    this.notify();
  }

  private setSession(token: string, user: PublicUserProfile): void {
    this.token = token;
    this.user = user;
    this.error = null;
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
    this.notify();
  }

  public clearError(): void {
    this.error = null;
    this.notify();
  }
}

export const authStore = new AuthStore();
