/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - User & Match Store
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
  winRate: number; // percentage 0-100
  masteryLevel: number;
}

export interface UserRecord {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string | null;
  passwordSalt: string | null;
  isGuest: boolean;
  facebookId?: string;
  avatarId: string;
  elo: number;
  peakElo: number;
  wins: number;
  losses: number;
  streak: number;
  highestStreak: number;
  matchHistory: MatchHistoryEntry[];
  fighterStats: Record<string, { matches: number; wins: number }>;
  createdAt: number;
  lastLoginAt: number;
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
  winRate: number; // percentage
  streak: number;
  highestStreak: number;
  rankTier: string;
  favoriteFighter: FighterStat;
  fighterStatsList: FighterStat[];
  matchHistory: MatchHistoryEntry[];
  createdAt: number;
}

export function getRankTier(elo: number): string {
  if (elo >= 2200) return 'Grandmaster Apex';
  if (elo >= 1900) return 'Diamond Vanguard';
  if (elo >= 1600) return 'Platinum Striker';
  if (elo >= 1300) return 'Gold Fighter';
  if (elo >= 1100) return 'Silver Challenger';
  return 'Bronze Contender';
}

export function generateSeedMatchHistory(
  playerFighter: string,
  userWins: number,
  userLosses: number
): { matchHistory: MatchHistoryEntry[]; fighterStats: Record<string, { matches: number; wins: number }> } {
  const fighters = ['blitz', 'titan', 'nova', 'ronin', 'nyx', 'spectre'];
  const opponents = [
    'ViperStrike',
    'ShadowEcho',
    'MagmaPuncher',
    'VoltRider',
    'CyberNinja',
    'LotusBlade',
    'AuraMaster',
    'VoidReaper',
    'StormFighter',
  ];

  const matchHistory: MatchHistoryEntry[] = [];
  const fighterStats: Record<string, { matches: number; wins: number }> = {};
  fighters.forEach((f) => {
    fighterStats[f] = { matches: 0, wins: 0 };
  });

  const total = Math.min(12, Math.max(4, userWins + userLosses));
  const winsCount = Math.round((userWins / Math.max(1, userWins + userLosses)) * total);

  const now = Date.now();

  for (let i = 0; i < total; i++) {
    const isWin = i < winsCount;
    const oppName = opponents[i % opponents.length];
    const oppFighter = fighters[(i + 2) % fighters.length];
    const usedFighter = i % 3 === 0 ? playerFighter : fighters[i % fighters.length];
    const eloDelta = isWin ? 18 + (i % 7) : -(12 + (i % 6));

    matchHistory.push({
      id: `match_${i + 1}_${now}`,
      opponentName: oppName,
      opponentAvatar: oppFighter,
      playerFighter: usedFighter,
      opponentFighter: oppFighter,
      result: isWin ? 'VICTORY' : 'DEFEAT',
      playerEloDelta: eloDelta,
      durationSeconds: 45 + (i * 7) % 50,
      timestamp: now - (i * 3600000 * 2 + (i * 240000)),
    });

    fighterStats[usedFighter].matches += 1;
    if (isWin) {
      fighterStats[usedFighter].wins += 1;
    }
  }

  // Ensure preferred fighter has the highest matches
  fighterStats[playerFighter].matches += Math.max(5, userWins);
  fighterStats[playerFighter].wins += Math.max(3, userWins);

  return { matchHistory, fighterStats };
}

export function toPublicProfile(user: UserRecord): PublicUserProfile {
  const totalMatches = user.wins + user.losses;
  const winRate = totalMatches > 0 ? Math.round((user.wins / totalMatches) * 100) : 0;

  // Build fighter statistics list
  const allFighters = ['blitz', 'titan', 'nova', 'ronin', 'nyx', 'spectre'];
  const statsList: FighterStat[] = allFighters.map((fId) => {
    const data = user.fighterStats?.[fId] || { matches: 0, wins: 0 };
    const losses = Math.max(0, data.matches - data.wins);
    const wr = data.matches > 0 ? Math.round((data.wins / data.matches) * 100) : 0;
    const mastery = Math.min(50, Math.floor(data.matches * 1.5) + (data.wins * 2));
    return {
      fighterId: fId,
      matchesPlayed: data.matches,
      wins: data.wins,
      losses,
      winRate: wr,
      masteryLevel: Math.max(1, mastery),
    };
  });

  // Sort by matches played descending to find favorite
  statsList.sort((a, b) => b.matchesPlayed - a.matchesPlayed);

  const favoriteFighter = statsList[0] || {
    fighterId: user.avatarId || 'blitz',
    matchesPlayed: totalMatches,
    wins: user.wins,
    losses: user.losses,
    winRate,
    masteryLevel: 12,
  };

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    isGuest: user.isGuest,
    facebookId: user.facebookId,
    avatarId: user.avatarId,
    elo: user.elo,
    peakElo: user.peakElo || user.elo,
    wins: user.wins,
    losses: user.losses,
    totalMatches,
    winRate,
    streak: user.streak,
    highestStreak: user.highestStreak || Math.max(user.streak, 3),
    rankTier: getRankTier(user.elo),
    favoriteFighter,
    fighterStatsList: statsList,
    matchHistory: user.matchHistory || [],
    createdAt: user.createdAt,
  };
}

class UserDatabase {
  private users = new Map<string, UserRecord>();
  private usernameIndex = new Map<string, string>(); // lowercase -> id
  private emailIndex = new Map<string, string>();    // lowercase -> id
  private fbIndex = new Map<string, string>();       // fbId -> id

  constructor() {
    this.seedDemoUsers();
  }

  private seedDemoUsers() {
    const champions: Array<{
      id: string;
      username: string;
      email: string;
      avatarId: string;
      elo: number;
      peakElo: number;
      wins: number;
      losses: number;
      streak: number;
      highestStreak: number;
    }> = [
      {
        id: 'usr_apex_nyx',
        username: 'ViperApex',
        email: 'viper@bdfight.gg',
        avatarId: 'nyx',
        elo: 2380,
        peakElo: 2420,
        wins: 142,
        losses: 32,
        streak: 9,
        highestStreak: 16,
      },
      {
        id: 'usr_pulse_nova',
        username: 'PulseGod',
        email: 'nova@bdfight.gg',
        avatarId: 'nova',
        elo: 2190,
        peakElo: 2240,
        wins: 118,
        losses: 41,
        streak: 4,
        highestStreak: 11,
      },
      {
        id: 'usr_demo_titan',
        username: 'IronColossus',
        email: 'titan@bdfight.gg',
        avatarId: 'titan',
        elo: 1940,
        peakElo: 1980,
        wins: 95,
        losses: 34,
        streak: 5,
        highestStreak: 12,
      },
      {
        id: 'usr_ronin_zero',
        username: 'RoninZero',
        email: 'ronin@bdfight.gg',
        avatarId: 'ronin',
        elo: 1820,
        peakElo: 1890,
        wins: 84,
        losses: 36,
        streak: 3,
        highestStreak: 8,
      },
      {
        id: 'usr_shadow_spectre',
        username: 'ShadowSpectre',
        email: 'spectre@bdfight.gg',
        avatarId: 'spectre',
        elo: 1750,
        peakElo: 1790,
        wins: 68,
        losses: 29,
        streak: 2,
        highestStreak: 7,
      },
      {
        id: 'usr_demo_blitz',
        username: 'NeonStriker',
        email: 'blitz@bdfight.gg',
        avatarId: 'blitz',
        elo: 1640,
        peakElo: 1690,
        wins: 58,
        losses: 24,
        streak: 3,
        highestStreak: 7,
      },
      {
        id: 'usr_cyber_blade',
        username: 'CyberSamurai',
        email: 'samurai@bdfight.gg',
        avatarId: 'ronin',
        elo: 1480,
        peakElo: 1530,
        wins: 44,
        losses: 22,
        streak: 1,
        highestStreak: 6,
      },
    ];

    champions.forEach((c) => {
      const seed = generateSeedMatchHistory(c.avatarId, c.wins, c.losses);
      const user: UserRecord = {
        id: c.id,
        username: c.username,
        email: c.email,
        passwordHash: '43deecbe9b165bfda91097e3a9660c07c223c72688f28fa958611eb246f49f3e',
        passwordSalt: 'bd_salt_demo',
        isGuest: false,
        avatarId: c.avatarId,
        elo: c.elo,
        peakElo: c.peakElo,
        wins: c.wins,
        losses: c.losses,
        streak: c.streak,
        highestStreak: c.highestStreak,
        matchHistory: seed.matchHistory,
        fighterStats: seed.fighterStats,
        createdAt: Date.now() - 86400000 * 25,
        lastLoginAt: Date.now(),
      };
      this.addUser(user);
    });
  }

  public addUser(user: UserRecord): void {
    this.users.set(user.id, user);
    this.usernameIndex.set(user.username.toLowerCase(), user.id);
    if (user.email) {
      this.emailIndex.set(user.email.toLowerCase(), user.id);
    }
    if (user.facebookId) {
      this.fbIndex.set(user.facebookId, user.id);
    }
  }

  public getById(id: string): UserRecord | undefined {
    return this.users.get(id);
  }

  public getByUsername(username: string): UserRecord | undefined {
    const id = this.usernameIndex.get(username.toLowerCase());
    return id ? this.users.get(id) : undefined;
  }

  public getByEmail(email: string): UserRecord | undefined {
    const id = this.emailIndex.get(email.toLowerCase());
    return id ? this.users.get(id) : undefined;
  }

  public getByFacebookId(fbId: string): UserRecord | undefined {
    const id = this.fbIndex.get(fbId);
    return id ? this.users.get(id) : undefined;
  }

  public findByUsernameOrEmail(identifier: string): UserRecord | undefined {
    const lower = identifier.toLowerCase().trim();
    const byU = this.usernameIndex.get(lower);
    if (byU) return this.users.get(byU);
    const byE = this.emailIndex.get(lower);
    if (byE) return this.users.get(byE);
    return undefined;
  }

  public recordMatchResult(
    userId: string,
    match: Omit<MatchHistoryEntry, 'id' | 'timestamp'>
  ): UserRecord | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const isWin = match.result === 'VICTORY';
    if (isWin) {
      user.wins += 1;
      user.streak += 1;
      if (user.streak > user.highestStreak) {
        user.highestStreak = user.streak;
      }
    } else {
      user.losses += 1;
      user.streak = 0;
    }

    user.elo = Math.max(100, user.elo + match.playerEloDelta);
    if (user.elo > user.peakElo) {
      user.peakElo = user.elo;
    }

    const newEntry: MatchHistoryEntry = {
      id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...match,
      timestamp: Date.now(),
    };

    user.matchHistory.unshift(newEntry);
    if (user.matchHistory.length > 50) {
      user.matchHistory.pop();
    }

    if (!user.fighterStats[match.playerFighter]) {
      user.fighterStats[match.playerFighter] = { matches: 0, wins: 0 };
    }
    user.fighterStats[match.playerFighter].matches += 1;
    if (isWin) {
      user.fighterStats[match.playerFighter].wins += 1;
    }

    user.lastLoginAt = Date.now();
    return user;
  }

  public getAllLeaderboard(): PublicUserProfile[] {
    return Array.from(this.users.values())
      .map(toPublicProfile)
      .sort((a, b) => b.elo - a.elo);
  }
}

export const db = new UserDatabase();
