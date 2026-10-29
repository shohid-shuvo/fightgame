/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Social Profile View
 * Displays player match history, win/loss ratio, and favorite fighter statistics
 */

import React, { useState } from 'react';
import { PublicUserProfile } from '../auth/authStore.js';
import { FighterAvatar } from './FighterAvatar.js';
import { FighterInspectModal } from './FighterInspectModal.js';
import { ROSTER } from '../../../shared/characters/roster.js';
import { sound } from '../audio/sound.js';
import {
  Trophy,
  Swords,
  Flame,
  Clock,
  ArrowLeft,
  Sparkles,
  Shield,
  Zap,
  TrendingUp,
  Award,
  ChevronRight,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  Target,
  Film,
} from 'lucide-react';
import { RecentMatchHistory } from './RecentMatchHistory.js';

interface Props {
  user: PublicUserProfile;
  onBack: () => void;
  onEnterArena: () => void;
  onWatchReplay?: (replayId?: string) => void;
  onOpenLeaderboard?: () => void;
}

export const SocialProfileView: React.FC<Props> = ({
  user,
  onBack,
  onEnterArena,
  onWatchReplay,
  onOpenLeaderboard,
}) => {
  const [inspectFighterId, setInspectFighterId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'fighters'>('overview');

  const favoriteCharId = user.favoriteFighter?.fighterId || user.avatarId || 'blitz';
  const favChar = ROSTER[favoriteCharId] || ROSTER.blitz;

  const copyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    sound.playMenuClick();
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formatTimestamp = (ts: number): string => {
    const diffMin = Math.floor((Date.now() - ts) / 60000);
    if (diffMin < 60) return `${Math.max(1, diffMin)}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200 select-none">
      {/* Top Navigation Bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 border-b border-cyan-900/40">
        <button
          onClick={() => {
            sound.playMenuClick();
            onBack();
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/50 transition text-xs font-chakra font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO LOBBY</span>
        </button>

        <div className="flex items-center space-x-2">
          <Award className="w-4 h-4 text-cyan-400" />
          <h1 className="font-orbitron font-extrabold text-lg text-white tracking-wider">
            SOCIAL COMBATANT DOSSIER
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {onOpenLeaderboard && (
            <button
              onClick={() => {
                sound.playMenuClick();
                onOpenLeaderboard();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-yellow-950/60 border border-yellow-500/50 text-yellow-300 hover:bg-yellow-900/60 text-xs font-chakra font-bold transition shadow-[0_0_10px_rgba(234,179,8,0.2)]"
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span>LEADERBOARD</span>
            </button>
          )}

          {onWatchReplay && (
            <button
              onClick={() => {
                sound.playMenuClick();
                onWatchReplay();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-chakra font-bold transition"
            >
              <Film className="w-3.5 h-3.5 text-cyan-400" />
              <span>REPLAY THEATER</span>
            </button>
          )}

          <button
            onClick={() => {
              sound.playMenuClick();
              onEnterArena();
            }}
            className="hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-orbitron font-black text-xs transition shadow-[0_0_12px_rgba(0,240,255,0.3)]"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>ENTER PRACTICE ARENA</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl mx-auto my-auto py-6 space-y-6">
        {/* Hero Fighter Dossier Card */}
        <div
          className="p-6 sm:p-8 rounded-2xl bg-slate-950/90 border-2 shadow-2xl backdrop-blur-md relative overflow-hidden"
          style={{
            borderColor: favChar.themeColor,
            boxShadow: `0 0 35px ${favChar.glowColor}`,
          }}
        >
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            {/* Left: Avatar & Identity */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
              <FighterAvatar fighterId={favoriteCharId} size="xl" showBadge />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h2 className="font-orbitron font-black text-2xl sm:text-3xl text-white">
                    {user.username}
                  </h2>
                  {user.isGuest ? (
                    <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      GUEST CONTENDER
                    </span>
                  ) : user.facebookId ? (
                    <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-blue-400" />
                      <span>FACEBOOK VERIFIED</span>
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                      <span>OFFICIAL FIGHTER</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center sm:justify-start space-x-3 text-xs">
                  <span className="font-mono text-cyan-400 font-bold flex items-center space-x-1">
                    <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                    <span>{user.rankTier}</span>
                  </span>
                  <span className="text-slate-600">•</span>
                  <button
                    onClick={copyId}
                    className="text-slate-400 hover:text-slate-200 font-mono flex items-center space-x-1 transition"
                    title="Click to copy ID"
                  >
                    <span>ID: {user.id.slice(0, 16)}...</span>
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <p className="text-xs text-slate-400 font-rajdhani pt-1 max-w-md">
                  Signature Specialty: <span className="text-slate-200 font-semibold">{favChar.name}</span> ({favChar.archetype}) — "{favChar.quote}"
                </p>
              </div>
            </div>

            {/* Right: Quick Ratings Lockup */}
            <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-center px-2">
                <span className="text-[10px] font-chakra font-bold text-slate-400 uppercase">
                  CURRENT RATING
                </span>
                <div className="font-orbitron font-black text-2xl text-cyan-300 mt-0.5">
                  {user.elo}
                </div>
                <span className="text-[10px] text-cyan-500 font-mono">Rank Points</span>
              </div>
              <div className="w-px h-10 bg-slate-800" />
              <div className="text-center px-2">
                <span className="text-[10px] font-chakra font-bold text-slate-400 uppercase">
                  PEAK RATING
                </span>
                <div className="font-orbitron font-black text-2xl text-yellow-400 mt-0.5">
                  {user.peakElo}
                </div>
                <span className="text-[10px] text-yellow-500 font-mono">All-Time High</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 text-sm font-chakra">
          <button
            onClick={() => {
              sound.playMenuClick();
              setActiveTab('overview');
            }}
            className={`pb-2 px-5 font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'text-white border-cyan-400'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>COMBAT STATS & FAVORITE FIGHTER</span>
          </button>
          <button
            onClick={() => {
              sound.playMenuClick();
              setActiveTab('history');
            }}
            className={`pb-2 px-5 font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'history'
                ? 'text-white border-cyan-400'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>MATCH HISTORY ({user.matchHistory?.length || 0})</span>
          </button>
          <button
            onClick={() => {
              sound.playMenuClick();
              setActiveTab('fighters');
            }}
            className={`pb-2 px-5 font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'fighters'
                ? 'text-white border-cyan-400'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>ROSTER BREAKDOWN (6 FIGHTERS)</span>
          </button>
        </div>

        {/* Tab 1: Overview & Favorite Fighter */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Key Metrics Columns */}
            <div className="md:col-span-4 space-y-4">
              {/* Win / Loss Circular Gauge Card */}
              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <span className="text-xs font-chakra font-bold text-slate-400 uppercase tracking-wider">
                  WIN / LOSS RATIO
                </span>

                <div className="flex items-center space-x-4">
                  <div className="relative w-20 h-20 rounded-full flex items-center justify-center border-4 border-slate-800">
                    <div
                      className="absolute inset-0 rounded-full border-4 border-emerald-400 border-t-transparent transition-all"
                      style={{
                        transform: `rotate(${Math.round(user.winRate * 3.6)}deg)`,
                      }}
                    />
                    <div className="font-orbitron font-black text-xl text-white">
                      {user.winRate}%
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-rajdhani">
                    <div className="text-emerald-400 font-bold text-sm">
                      {user.wins} VICTORIES
                    </div>
                    <div className="text-red-400 font-bold text-sm">
                      {user.losses} DEFEATS
                    </div>
                    <div className="text-slate-500 font-mono">
                      {user.totalMatches} Bouts Recorded
                    </div>
                  </div>
                </div>

                {/* Horizontal ratio bar */}
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-500"
                    style={{ width: `${user.winRate}%` }}
                  />
                  <div
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${100 - user.winRate}%` }}
                  />
                </div>
              </div>

              {/* Streaks Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <span className="text-[10px] font-chakra font-bold text-slate-400 uppercase">
                    CURRENT STREAK
                  </span>
                  <div className="font-orbitron font-black text-2xl text-orange-400 mt-1 flex items-center justify-center space-x-1">
                    <span>{user.streak}</span>
                    {user.streak > 0 && <Flame className="w-4 h-4 text-orange-500 animate-pulse" />}
                  </div>
                  <span className="text-[10px] text-orange-500/80 font-mono">
                    {user.streak > 0 ? 'On Fire' : 'Reset'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <span className="text-[10px] font-chakra font-bold text-slate-400 uppercase">
                    BEST STREAK
                  </span>
                  <div className="font-orbitron font-black text-2xl text-yellow-300 mt-1">
                    {user.highestStreak}
                  </div>
                  <span className="text-[10px] text-yellow-500/80 font-mono">Record Run</span>
                </div>
              </div>
            </div>

            {/* Favorite Fighter Spotlight Card */}
            <div className="md:col-span-8 bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-chakra font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>FAVORITE FIGHTER MASTER PROFILE</span>
                  </span>
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${favChar.themeColor}22`,
                      color: favChar.themeColor,
                    }}
                  >
                    MASTER LEVEL {user.favoriteFighter?.masteryLevel || 10}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <FighterAvatar fighterId={favChar.id} size="xl" showBadge />
                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <div>
                      <h3 className="font-orbitron font-black text-2xl text-white">
                        {favChar.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-rajdhani">{favChar.title}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-1">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 font-mono">Bouts</span>
                        <div className="font-orbitron font-bold text-sm text-slate-200">
                          {user.favoriteFighter?.matchesPlayed || 0}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 font-mono">Winrate</span>
                        <div className="font-orbitron font-bold text-sm text-emerald-400">
                          {user.favoriteFighter?.winRate || 0}%
                        </div>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 font-mono">Wins</span>
                        <div className="font-orbitron font-bold text-sm text-cyan-300">
                          {user.favoriteFighter?.wins || 0}W
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1 pt-1 font-rajdhani">
                      <div>
                        <span className="text-slate-500">Special Move: </span>
                        <span className="text-cyan-300 font-mono font-semibold">
                          {favChar.specialMove.name} ({favChar.specialMove.command})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Super Climax: </span>
                        <span className="text-yellow-300 font-mono font-semibold">
                          {favChar.superMove.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => {
                    sound.playMenuClick();
                    setInspectFighterId(favChar.id);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-chakra font-bold text-xs text-cyan-300 bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 transition flex items-center justify-center space-x-2"
                >
                  <Swords className="w-4 h-4 text-cyan-400" />
                  <span>INSPECT FULL FRAME DATA & COMMANDS</span>
                </button>

                <button
                  onClick={() => {
                    sound.playMenuClick();
                    onEnterArena();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-orbitron font-black text-xs text-black bg-cyan-400 hover:bg-cyan-300 transition flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  <span>PLAY PRACTICE ARENA AS {favChar.name}</span>
                </button>
              </div>
            </div>

            {/* Recent 5 Matches Quick Ledger */}
            <div className="md:col-span-12 p-6 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-chakra font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>RECENT 5 RECORDED MATCHES</span>
                </span>
                <button
                  onClick={() => {
                    sound.playMenuClick();
                    setActiveTab('history');
                  }}
                  className="text-xs font-chakra text-cyan-400 hover:text-cyan-300 font-bold"
                >
                  VIEW FULL HISTORY ({user.matchHistory?.length || 0}) →
                </button>
              </div>
              <RecentMatchHistory
                matches={user.matchHistory}
                maxCount={5}
                onWatchReplay={onWatchReplay}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Match History Ledger */}
        {activeTab === 'history' && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-chakra font-bold text-slate-400 uppercase tracking-wider">
                RECORDED RANKED BOUTS
              </span>
              <span className="text-xs font-mono text-slate-500">
                Latest {user.matchHistory?.length || 0} Matches
              </span>
            </div>

            <RecentMatchHistory
              matches={user.matchHistory}
              maxCount={25}
              onWatchReplay={onWatchReplay}
            />
          </div>
        )}

        {/* Tab 3: 6-Fighter Roster Breakdown */}
        {activeTab === 'fighters' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.fighterStatsList?.map((stat) => {
              const char = ROSTER[stat.fighterId] || ROSTER.blitz;
              const isFav = stat.fighterId === favoriteCharId;

              return (
                <div
                  key={stat.fighterId}
                  className="p-5 rounded-xl bg-slate-950/80 border space-y-4 hover:border-slate-700 transition"
                  style={{
                    borderColor: isFav ? char.themeColor : undefined,
                    boxShadow: isFav ? `0 0 15px ${char.glowColor}` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FighterAvatar fighterId={stat.fighterId} size="md" />
                      <div>
                        <h4 className="font-orbitron font-black text-lg text-white">
                          {char.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {char.archetype}
                        </span>
                      </div>
                    </div>

                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded text-black uppercase"
                      style={{ backgroundColor: char.themeColor }}
                    >
                      LVL {stat.masteryLevel}
                    </span>
                  </div>

                  {/* Stats Bar */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-400">Win Rate: {stat.winRate}%</span>
                      <span className="text-slate-300 font-bold">
                        {stat.wins}W - {stat.losses}L ({stat.matchesPlayed} bouts)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${stat.winRate}%`,
                          backgroundColor: char.themeColor,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sound.playMenuClick();
                      setInspectFighterId(stat.fighterId);
                    }}
                    className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-chakra font-bold text-slate-300 transition flex items-center justify-center space-x-1"
                  >
                    <span>VIEW MOVESET</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 text-[11px] text-slate-500 font-mono border-t border-slate-900">
        <span>AUTHENTICATED FIGHTER DOSSIER</span>
        <span>BDFIGHT ONLINE MULTIPLAYER NETWORK</span>
      </footer>

      {/* Moveset Inspector Modal */}
      {inspectFighterId && (
        <FighterInspectModal
          initialFighterId={inspectFighterId}
          onClose={() => setInspectFighterId(null)}
        />
      )}
    </div>
  );
};
