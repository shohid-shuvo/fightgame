/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Recent Match History Scrollable List Component
 * Displays the last 5 matches with opponent, outcome, timestamp, and character used.
 */

import React from 'react';
import { MatchHistoryEntry } from '../auth/authStore.js';
import { FighterAvatar } from './FighterAvatar.js';
import { ROSTER } from '../../../shared/characters/roster.js';
import { sound } from '../audio/sound.js';
import { Film, Trophy, Clock, Calendar, Swords, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  matches: MatchHistoryEntry[];
  maxCount?: number;
  onWatchReplay?: (replayId?: string) => void;
}

export const RecentMatchHistory: React.FC<Props> = ({
  matches,
  maxCount = 5,
  onWatchReplay,
}) => {
  const recent = (matches || []).slice(0, maxCount);

  const formatDate = (timestamp: number): string => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (timestamp: number): string => {
    const diffMin = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMin < 60) return `${Math.max(1, diffMin)}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (recent.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-chakra rounded-xl bg-slate-950/60 border border-slate-800">
        <Swords className="w-8 h-8 mx-auto text-slate-600 mb-2" />
        <p className="text-sm">No recorded bouts in history ledger yet.</p>
        <p className="text-xs text-slate-600 font-mono mt-1">
          Complete matches in online matchmaking or practice arena to record stats.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 select-none">
      {recent.map((match, index) => {
        const isWin = match.result === 'VICTORY';
        const playerChar = ROSTER[match.playerFighter] || ROSTER.blitz;
        const oppChar = ROSTER[match.opponentFighter] || ROSTER.ronin;

        return (
          <div
            key={match.id || index}
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:translate-x-1 duration-150 ${
              isWin
                ? 'bg-emerald-950/20 border-emerald-900/60 hover:border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.06)]'
                : 'bg-red-950/20 border-red-900/60 hover:border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.06)]'
            }`}
          >
            {/* Left: Result Badge, Characters & Opponent */}
            <div className="flex items-center space-x-3.5">
              {/* Outcome Badge */}
              <div
                className={`px-3 py-1 rounded-md font-orbitron font-black text-xs uppercase tracking-wider text-center ${
                  isWin
                    ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                }`}
              >
                {match.result}
              </div>

              {/* Character Matchup Avatars */}
              <div className="flex items-center space-x-1.5">
                <FighterAvatar fighterId={match.playerFighter} size="sm" />
                <span className="text-[10px] font-mono text-slate-500 font-bold">vs</span>
                <FighterAvatar fighterId={match.opponentAvatar || match.opponentFighter} size="sm" />
              </div>

              {/* Combatant Info */}
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-chakra font-bold text-sm text-white">
                    vs {match.opponentName}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                  <span className="text-cyan-300 font-semibold">{playerChar.name}</span>
                  <span>vs</span>
                  <span className="text-orange-300 font-semibold">{oppChar.name}</span>
                </div>
              </div>
            </div>

            {/* Right: ELO Shift, Date, Replay Action */}
            <div className="flex items-center justify-between sm:justify-end sm:space-x-4 text-xs font-mono">
              {/* ELO Delta */}
              <div className="flex items-center space-x-1">
                {match.playerEloDelta > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                )}
                <span
                  className={`font-orbitron font-black text-sm ${
                    match.playerEloDelta > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {match.playerEloDelta > 0 ? `+${match.playerEloDelta}` : match.playerEloDelta} ELO
                </span>
              </div>

              {/* Date & Duration */}
              <div className="text-right text-slate-400 text-[11px] space-y-0.5">
                <div className="flex items-center justify-end space-x-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>{formatDate(match.timestamp)}</span>
                  <span className="text-slate-600">({formatRelativeTime(match.timestamp)})</span>
                </div>
                <div className="text-slate-500 text-[10px]">{match.durationSeconds}s round</div>
              </div>

              {/* Replay Viewer CTA */}
              {onWatchReplay && (
                <button
                  onClick={() => {
                    sound.playMenuClick();
                    onWatchReplay();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-chakra font-bold text-yellow-300 border border-yellow-500/40 flex items-center space-x-1 transition shadow-sm hover:border-yellow-400"
                  title="Watch Deterministic Replay"
                >
                  <Film className="w-3.5 h-3.5 text-yellow-400" />
                  <span>REPLAY</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
