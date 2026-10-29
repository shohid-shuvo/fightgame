/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Global Leaderboard Component
 * Displays top ELO ranked players, win rates, and character statistics.
 */

import React, { useEffect, useState } from 'react';
import { PublicUserProfile } from '../auth/authStore.js';
import { FighterAvatar } from './FighterAvatar.js';
import { ROSTER } from '../../../shared/characters/roster.js';
import { sound } from '../audio/sound.js';
import {
  Trophy,
  Crown,
  Flame,
  Swords,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface Props {
  currentUser?: PublicUserProfile | null;
  onExit: () => void;
  onSelectFighter?: (fighterId: string) => void;
  onViewPlayerProfile?: (profile: PublicUserProfile) => void;
}

export const GlobalLeaderboard: React.FC<Props> = ({
  currentUser,
  onExit,
  onSelectFighter,
  onViewPlayerProfile,
}) => {
  const [fighters, setFighters] = useState<PublicUserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterChar, setFilterChar] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) {
        throw new Error(`Failed to fetch leaderboard: ${res.statusText}`);
      }
      const data = await res.json();
      setFighters(data.fighters || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching leaderboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Filter fighters based on search and character selection
  const filteredFighters = fighters.filter((f) => {
    const matchesSearch = f.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChar =
      filterChar === 'all' ||
      f.avatarId === filterChar ||
      f.favoriteFighter?.fighterId === filterChar;
    return matchesSearch && matchesChar;
  });

  const top3 = fighters.slice(0, 3);

  return (
    <div className="relative z-10 min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200 select-none">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 border-b border-cyan-900/40">
        <button
          onClick={() => {
            sound.playMenuClick();
            onExit();
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/50 transition text-xs font-chakra font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO LOBBY</span>
        </button>

        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h1 className="font-orbitron font-extrabold text-lg text-white tracking-wider">
            GLOBAL RANKED LEADERBOARD
          </h1>
        </div>

        <button
          onClick={() => {
            sound.playMenuClick();
            fetchLeaderboard();
          }}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition"
          title="Refresh rankings"
        >
          <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl mx-auto my-auto py-6 space-y-6">
        {/* Top 3 Champions Podium Banner */}
        {fighters.length >= 3 && !searchTerm && filterChar === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
            {/* Rank 2 (Silver) */}
            <div className="order-2 md:order-1 p-5 rounded-2xl bg-slate-950/80 border border-slate-700/60 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-300 text-black font-orbitron font-black text-sm flex items-center justify-center mb-3 shadow-[0_0_12px_rgba(203,213,225,0.5)]">
                #2
              </div>
              <FighterAvatar fighterId={top3[1]?.favoriteFighter?.fighterId || top3[1]?.avatarId} size="lg" />
              <h3 className="font-orbitron font-black text-lg text-white mt-2">
                {top3[1]?.username}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {ROSTER[top3[1]?.favoriteFighter?.fighterId]?.name || 'Champion'} Specialist
              </span>
              <div className="font-orbitron font-bold text-xl text-cyan-300 mt-2">
                {top3[1]?.elo} ELO
              </div>
              <div className="text-xs font-mono text-emerald-400 mt-0.5">
                {top3[1]?.winRate}% Winrate ({top3[1]?.wins}W - {top3[1]?.losses}L)
              </div>
            </div>

            {/* Rank 1 (Gold Crown Apex) */}
            <div className="order-1 md:order-2 p-6 rounded-2xl bg-gradient-to-b from-yellow-950/40 via-slate-950/90 to-slate-950 border-2 border-yellow-500/80 shadow-[0_0_35px_rgba(234,179,8,0.25)] flex flex-col items-center text-center relative overflow-hidden -translate-y-1">
              <div className="absolute top-2 right-2">
                <Crown className="w-6 h-6 text-yellow-400 animate-pulse" />
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-400 text-black font-orbitron font-black text-base flex items-center justify-center mb-3 shadow-[0_0_18px_rgba(234,179,8,0.7)]">
                #1
              </div>
              <FighterAvatar fighterId={top3[0]?.favoriteFighter?.fighterId || top3[0]?.avatarId} size="xl" showBadge />
              <h3 className="font-orbitron font-black text-xl text-yellow-300 mt-2">
                {top3[0]?.username}
              </h3>
              <span className="text-xs text-yellow-500/80 font-mono font-bold">
                {top3[0]?.rankTier}
              </span>
              <div className="font-orbitron font-black text-3xl text-white mt-2">
                {top3[0]?.elo} ELO
              </div>
              <div className="text-xs font-mono text-emerald-400 mt-1 font-bold">
                {top3[0]?.winRate}% Winrate • {top3[0]?.totalMatches} Bouts
              </div>
              {top3[0]?.streak > 0 && (
                <div className="flex items-center space-x-1 text-xs text-orange-400 font-mono mt-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500 animate-bounce" />
                  <span>{top3[0]?.streak} Win Streak</span>
                </div>
              )}
            </div>

            {/* Rank 3 (Bronze) */}
            <div className="order-3 md:order-3 p-5 rounded-2xl bg-slate-950/80 border border-amber-900/40 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-amber-700 text-white font-orbitron font-black text-sm flex items-center justify-center mb-3 shadow-[0_0_12px_rgba(180,83,9,0.5)]">
                #3
              </div>
              <FighterAvatar fighterId={top3[2]?.favoriteFighter?.fighterId || top3[2]?.avatarId} size="lg" />
              <h3 className="font-orbitron font-black text-lg text-white mt-2">
                {top3[2]?.username}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {ROSTER[top3[2]?.favoriteFighter?.fighterId]?.name || 'Champion'} Specialist
              </span>
              <div className="font-orbitron font-bold text-xl text-amber-400 mt-2">
                {top3[2]?.elo} ELO
              </div>
              <div className="text-xs font-mono text-emerald-400 mt-0.5">
                {top3[2]?.winRate}% Winrate ({top3[2]?.wins}W - {top3[2]?.losses}L)
              </div>
            </div>
          </div>
        )}

        {/* Search & Character Class Filter Controls */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search combatant callsign..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-chakra"
            />
          </div>

          {/* Character Filter Badges */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 font-chakra text-xs">
            <button
              onClick={() => {
                sound.playMenuClick();
                setFilterChar('all');
              }}
              className={`px-3 py-1.5 rounded-lg border font-bold uppercase transition ${
                filterChar === 'all'
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ALL CLASSES
            </button>
            {['blitz', 'titan', 'nova', 'ronin', 'nyx', 'spectre'].map((charId) => (
              <button
                key={charId}
                onClick={() => {
                  sound.playMenuClick();
                  setFilterChar(charId);
                }}
                className={`px-2.5 py-1.5 rounded-lg border font-mono font-bold uppercase transition ${
                  filterChar === charId
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {charId}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table / Ledger */}
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 overflow-hidden shadow-2xl">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-6 py-3.5 bg-slate-900/80 border-b border-slate-800 text-[11px] font-chakra font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-1 text-center">RANK</div>
            <div className="col-span-4 sm:col-span-4">COMBATANT / CLASS</div>
            <div className="col-span-3 sm:col-span-2 text-right">ELO RATING</div>
            <div className="col-span-2 text-center hidden sm:block">WIN RATE</div>
            <div className="col-span-2 text-right hidden sm:block">BOUTS (W-L)</div>
            <div className="col-span-4 sm:col-span-1 text-right">STREAK</div>
          </div>

          {/* Table Rows */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-chakra space-y-2">
              <div className="w-8 h-8 mx-auto rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <p className="text-xs font-mono">Retrieving global battle rankings from server...</p>
            </div>
          ) : filteredFighters.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-chakra space-y-2">
              <Swords className="w-8 h-8 mx-auto text-slate-600" />
              <p>No combatants found matching the filter criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-900">
              {filteredFighters.map((player, index) => {
                const rankNum = index + 1;
                const isUser = currentUser?.id === player.id;
                const favChar = ROSTER[player.favoriteFighter?.fighterId || player.avatarId] || ROSTER.blitz;

                return (
                  <div
                    key={player.id}
                    className={`grid grid-cols-12 gap-3 px-6 py-4 items-center transition hover:bg-slate-900/50 ${
                      isUser ? 'bg-cyan-950/30 border-l-4 border-l-cyan-400' : ''
                    }`}
                  >
                    {/* Rank Number */}
                    <div className="col-span-1 text-center font-orbitron font-black text-sm">
                      {rankNum === 1 ? (
                        <span className="text-yellow-400">#1</span>
                      ) : rankNum === 2 ? (
                        <span className="text-slate-300">#2</span>
                      ) : rankNum === 3 ? (
                        <span className="text-amber-500">#3</span>
                      ) : (
                        <span className="text-slate-500">#{rankNum}</span>
                      )}
                    </div>

                    {/* Fighter Callsign & Character Specialty */}
                    <div className="col-span-4 sm:col-span-4 flex items-center space-x-3">
                      <FighterAvatar fighterId={favChar.id} size="sm" />
                      <div className="truncate">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-orbitron font-bold text-sm text-white truncate">
                            {player.username}
                          </span>
                          {isUser && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-400 text-black font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {favChar.name} • {player.rankTier}
                        </p>
                      </div>
                    </div>

                    {/* ELO Rating */}
                    <div className="col-span-3 sm:col-span-2 text-right">
                      <span className="font-orbitron font-black text-base text-cyan-300">
                        {player.elo}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        Peak: {player.peakElo || player.elo}
                      </span>
                    </div>

                    {/* Win Rate */}
                    <div className="col-span-2 text-center hidden sm:block">
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        {player.winRate}%
                      </span>
                      <div className="h-1.5 w-16 mx-auto bg-slate-900 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-emerald-400"
                          style={{ width: `${player.winRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Bouts (W-L) */}
                    <div className="col-span-2 text-right hidden sm:block font-mono text-xs">
                      <span className="text-slate-200 font-bold">{player.totalMatches}</span>
                      <span className="text-slate-500 text-[11px] block">
                        ({player.wins}W - {player.losses}L)
                      </span>
                    </div>

                    {/* Streak */}
                    <div className="col-span-4 sm:col-span-1 text-right font-mono text-xs font-bold flex items-center justify-end space-x-1">
                      {player.streak > 0 ? (
                        <>
                          <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                          <span className="text-orange-400">{player.streak}W</span>
                        </>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 text-[11px] text-slate-500 font-mono border-t border-slate-900">
        <span>GLOBAL LEADERBOARD • REAL-TIME REST API SYNC</span>
        <span>TOP ELO LADDER V1.0</span>
      </footer>
    </div>
  );
};
