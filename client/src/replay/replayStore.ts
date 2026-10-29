/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Replay Storage and Manager
 */

import { MatchReplayData, SHOWCASE_REPLAYS } from '../../../shared/replay.js';

const STORAGE_KEY = 'bdfight_match_replays';

class ReplayStore {
  private replays: MatchReplayData[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as MatchReplayData[];
        this.replays = [...parsed, ...SHOWCASE_REPLAYS];
      } else {
        this.replays = [...SHOWCASE_REPLAYS];
      }
    } catch {
      this.replays = [...SHOWCASE_REPLAYS];
    }
  }

  public getAll(): MatchReplayData[] {
    return this.replays;
  }

  public getById(id: string): MatchReplayData | undefined {
    return this.replays.find((r) => r.id === id);
  }

  public saveReplay(replay: MatchReplayData): void {
    // Avoid duplicates
    this.replays = [replay, ...this.replays.filter((r) => r.id !== replay.id)];
    try {
      const userSaved = this.replays.filter((r) => !r.id.startsWith('rep_'));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userSaved));
    } catch {
      // Storage full or unavailable
    }
    this.notify();
  }

  public deleteReplay(id: string): void {
    this.replays = this.replays.filter((r) => r.id !== id);
    try {
      const userSaved = this.replays.filter((r) => !r.id.startsWith('rep_'));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userSaved));
    } catch {
      // ignore
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const replayStore = new ReplayStore();
