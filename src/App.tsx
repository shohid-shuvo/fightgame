/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Main Game Application Container
 */

import React, { useEffect, useState } from 'react';
import { authStore, PublicUserProfile } from '../client/src/auth/authStore.js';
import { AuthScene } from '../client/src/components/AuthScene.js';
import { CyberBackground } from '../client/src/components/CyberBackground.js';
import { FighterAvatar } from '../client/src/components/FighterAvatar.js';
import { FighterInspectModal } from '../client/src/components/FighterInspectModal.js';
import { PracticeArena } from '../client/src/components/PracticeArena.js';
import { SocialProfileView } from '../client/src/components/SocialProfileView.js';
import { MatchReplayViewer } from '../client/src/components/MatchReplayViewer.js';
import { GlobalLeaderboard } from '../client/src/components/GlobalLeaderboard.js';
import { ROSTER, ROSTER_LIST } from '../shared/characters/roster.js';
import { sound } from '../client/src/audio/sound.js';
import {
  Swords,
  Radio,
  Users,
  ArrowLeft,
  Zap,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Flame,
  Volume2,
  VolumeX,
  Trophy,
  Film,
} from 'lucide-react';

export default function App() {
  const [authState, setAuthState] = useState(authStore.getState());
  const [currentView, setCurrentView] = useState<'auth' | 'lobby' | 'arena' | 'profile' | 'replay' | 'leaderboard'>('auth');
  const [replayId, setReplayId] = useState<string | undefined>(undefined);
  const [selectedFighter, setSelectedFighter] = useState<string>('blitz');
  const [inspectFighterId, setInspectFighterId] = useState<string | null>(null);
  const [matchmakingActive, setMatchmakingActive] = useState<boolean>(false);
  const [queueTimer, setQueueTimer] = useState<number>(0);
  const [muted, setMuted] = useState(sound.isMuted());

  useEffect(() => {
    // Subscribe to auth state updates
    const unsubscribe = authStore.subscribe(() => {
      const state = authStore.getState();
      setAuthState(state);
      if (state.user && state.user.avatarId) {
        setSelectedFighter(state.user.avatarId);
      }
    });

    // Initialize session rehydration from token
    authStore.initSession();

    return () => {
      unsubscribe();
    };
  }, []);

  // Matchmaking queue timer simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (matchmakingActive) {
      interval = setInterval(() => {
        setQueueTimer((t) => t + 1);
      }, 1000);
    } else {
      setQueueTimer(0);
    }
    return () => clearInterval(interval);
  }, [matchmakingActive]);

  const toggleSound = () => {
    const isM = sound.toggleMute();
    setMuted(isM);
    if (!isM) sound.playMenuClick();
  };

  const handleStartQueue = () => {
    sound.playMenuClick();
    setMatchmakingActive(!matchmakingActive);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-slate-100 font-sans">
      {/* Dynamic Cybernetic Canvas */}
      <CyberBackground accentColor={ROSTER[selectedFighter]?.themeColor || '#00F0FF'} />

      {/* View: Authentication Scene */}
      {currentView === 'auth' && (
        <AuthScene
          user={authState.user}
          loading={authState.loading}
          error={authState.error}
          onEnterLobby={() => {
            sound.playMenuClick();
            setCurrentView('lobby');
          }}
          onViewProfile={() => {
            sound.playMenuClick();
            setCurrentView('profile');
          }}
        />
      )}

      {/* View: Online Lobby Preview (Phase 1-to-Phase 3 Bridge) */}
      {currentView === 'lobby' && authState.user && (
        <div className="relative z-10 min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
          {/* Header */}
          <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 border-b border-cyan-900/40">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  sound.playMenuClick();
                  setCurrentView('auth');
                }}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-cyan-500/50 transition flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs font-chakra font-bold">TERMINAL</span>
              </button>

              <div>
                <h1 className="font-orbitron font-extrabold text-xl text-white tracking-wider flex items-center space-x-2">
                  <span>BATTLE LOBBY</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                    ONLINE
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 font-rajdhani">
                  GLOBAL RANKED ROLLBACK ARENA
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={toggleSound}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition"
              >
                {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>

              <button
                onClick={() => {
                  sound.playMenuClick();
                  setCurrentView('leaderboard');
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-yellow-950/60 border border-yellow-500/50 text-yellow-300 hover:bg-yellow-900/50 text-xs font-chakra font-bold transition shadow-[0_0_10px_rgba(234,179,8,0.2)]"
              >
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <span>LEADERBOARD</span>
              </button>

              <button
                onClick={() => {
                  sound.playMenuClick();
                  setCurrentView('profile');
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-chakra font-bold transition"
              >
                <span>DOSSIER</span>
              </button>

              <button
                onClick={() => {
                  sound.playMenuClick();
                  setCurrentView('replay');
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 text-xs font-chakra font-bold transition"
              >
                <Film className="w-3.5 h-3.5 text-cyan-400" />
                <span>REPLAY</span>
              </button>

              <button
                onClick={() => {
                  sound.playMenuClick();
                  setInspectFighterId(selectedFighter);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 text-xs font-chakra font-bold transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>MOVESET SPEC</span>
              </button>
            </div>
          </header>

          {/* Lobby Content */}
          <main className="w-full max-w-5xl mx-auto my-auto py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Fighter Spotlight Card */}
            <div className="md:col-span-5 bg-slate-950/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-2xl backdrop-blur-md">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-chakra font-bold text-slate-400 uppercase tracking-wider">
                    CURRENT COMBATANT
                  </span>
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded uppercase"
                    style={{
                      backgroundColor: `${ROSTER[selectedFighter].themeColor}22`,
                      color: ROSTER[selectedFighter].themeColor,
                    }}
                  >
                    {ROSTER[selectedFighter].archetype}
                  </span>
                </div>

                <div className="flex items-center space-x-4 py-2">
                  <FighterAvatar fighterId={selectedFighter} size="xl" showBadge />
                  <div>
                    <h3 className="font-orbitron font-black text-2xl text-white">
                      {ROSTER[selectedFighter].name}
                    </h3>
                    <p className="text-xs text-slate-400 font-rajdhani">
                      {ROSTER[selectedFighter].title}
                    </p>
                    <div className="mt-2 text-xs font-mono text-cyan-400">
                      SPECIAL: {ROSTER[selectedFighter].specialMove.name}
                    </div>
                  </div>
                </div>

                {/* Character Quick-Switch Row */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-chakra font-bold text-slate-400 uppercase">
                    SWITCH FIGHTER (6 ORIGINAL WARRIORS)
                  </span>
                  <div className="grid grid-cols-6 gap-2">
                    {ROSTER_LIST.map((c) => {
                      const isSel = c.id === selectedFighter;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            sound.playMenuClick();
                            setSelectedFighter(c.id);
                          }}
                          className={`p-1 rounded-lg border flex flex-col items-center transition ${
                            isSel
                              ? 'border-white bg-slate-800 ring-2'
                              : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                          }`}
                          style={{
                            borderColor: isSel ? c.themeColor : undefined,
                            boxShadow: isSel ? `0 0 10px ${c.glowColor}` : undefined,
                          }}
                        >
                          <FighterAvatar fighterId={c.id} size="sm" />
                          <span className="text-[9px] font-mono mt-1 text-slate-300 font-bold truncate">
                            {c.name.slice(0, 3)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playMenuClick();
                  setInspectFighterId(selectedFighter);
                }}
                className="w-full mt-4 py-2.5 px-4 rounded-xl font-chakra font-bold text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition flex items-center justify-center space-x-2"
              >
                <Swords className="w-4 h-4 text-cyan-400" />
                <span>VIEW FRAME DATA & SPECIAL COMMANDS</span>
              </button>
            </div>

            {/* Matchmaking Queue & Status */}
            <div className="md:col-span-7 bg-slate-950/90 border border-cyan-500/40 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-[0_0_30px_rgba(0,240,255,0.15)] backdrop-blur-md space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                    <h3 className="font-orbitron font-extrabold text-lg text-white">
                      RANKED MATCHMAKING
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>60 FPS DETERMINISTIC ENGINE</span>
                  </div>
                </div>

                {/* Player Profile Snapshot */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-rajdhani text-slate-400">Logged in combatant</span>
                    <div className="font-orbitron font-bold text-lg text-white">
                      {authState.user.username}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-rajdhani text-slate-400">Battle Rating</span>
                    <div className="font-orbitron font-bold text-xl text-cyan-400">
                      {authState.user.elo} ELO
                    </div>
                  </div>
                </div>

                {/* Queue Status Box */}
                <div
                  className={`p-6 rounded-xl border text-center transition-all ${
                    matchmakingActive
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                      : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  {matchmakingActive ? (
                    <div className="space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                      <div className="font-orbitron font-bold text-lg text-white">
                        SEARCHING FOR OPPONENT...
                      </div>
                      <p className="text-xs font-mono text-cyan-300">
                        Elapsed Time: {Math.floor(queueTimer / 60)}:
                        {(queueTimer % 60).toString().padStart(2, '0')}
                      </p>
                      <p className="text-[11px] text-slate-400 font-rajdhani">
                        Filtering by ELO range [{authState.user.elo - 150} - {authState.user.elo + 150}] • WebRTC DataChannel Ready
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center">
                        <Users className="w-6 h-6 text-slate-400" />
                      </div>
                      <h4 className="font-orbitron font-bold text-base text-white">Ready to Fight</h4>
                      <p className="text-xs text-slate-400 font-rajdhani max-w-sm mx-auto">
                        Press Find Match to initiate matchmaking queue or inspect the movesets before stepping into the ring.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleStartQueue}
                  className={`w-full py-3.5 rounded-xl font-orbitron font-black text-sm transition flex items-center justify-center space-x-2 shadow-lg ${
                    matchmakingActive
                      ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-900/30'
                      : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-cyan-900/30'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{matchmakingActive ? 'CANCEL SEARCH' : 'FIND ONLINE MATCH'}</span>
                </button>

                <button
                  onClick={() => {
                    sound.playMenuClick();
                    setCurrentView('arena');
                  }}
                  className="w-full py-3 rounded-xl font-orbitron font-bold text-xs bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 transition flex items-center justify-center space-x-2"
                >
                  <Swords className="w-4 h-4 text-cyan-400" />
                  <span>ENTER PRACTICE ARENA (60FPS SIMULATOR)</span>
                </button>

                <button
                  onClick={() => {
                    sound.playMenuClick();
                    setCurrentView('leaderboard');
                  }}
                  className="w-full py-2.5 rounded-xl font-chakra font-bold text-xs bg-slate-900/60 hover:bg-slate-800 border border-yellow-500/40 text-yellow-300 transition flex items-center justify-center space-x-2"
                >
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  <span>VIEW GLOBAL ELO LEADERBOARD & WIN RATES</span>
                </button>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 text-[11px] text-slate-500 font-mono border-t border-slate-900">
            <span>PHASE 2 ENGINE: DETERMINISTIC 60FPS CORE ACTIVE</span>
            <span>SHARED/SIM.JS & SHARED/FIXED.JS VERIFIED</span>
          </footer>
        </div>
      )}

      {/* View: Global Ranked Leaderboard */}
      {currentView === 'leaderboard' && (
        <GlobalLeaderboard
          currentUser={authState.user}
          onExit={() => {
            sound.playMenuClick();
            setCurrentView('lobby');
          }}
        />
      )}

      {/* View: Social Profile Dossier */}
      {currentView === 'profile' && authState.user && (
        <SocialProfileView
          user={authState.user}
          onBack={() => {
            sound.playMenuClick();
            setCurrentView('lobby');
          }}
          onEnterArena={() => {
            sound.playMenuClick();
            setCurrentView('arena');
          }}
          onWatchReplay={(id) => {
            sound.playMenuClick();
            if (id) setReplayId(id);
            setCurrentView('replay');
          }}
          onOpenLeaderboard={() => {
            sound.playMenuClick();
            setCurrentView('leaderboard');
          }}
        />
      )}

      {/* View: Practice Arena (Live 60Hz deterministic physics & combat simulation) */}
      {currentView === 'arena' && (
        <PracticeArena
          p1Fighter={selectedFighter}
          p2Fighter={selectedFighter === 'ronin' ? 'blitz' : 'ronin'}
          onExit={() => {
            sound.playMenuClick();
            setCurrentView('lobby');
          }}
          onWatchReplay={(id) => {
            sound.playMenuClick();
            if (id) setReplayId(id);
            setCurrentView('replay');
          }}
        />
      )}

      {/* View: Match Replay Theater (Input stream playback with slow-mo & frame stepping) */}
      {currentView === 'replay' && (
        <MatchReplayViewer
          initialReplayId={replayId}
          onExit={() => {
            sound.playMenuClick();
            setCurrentView('lobby');
          }}
          onEnterArena={() => {
            sound.playMenuClick();
            setCurrentView('arena');
          }}
        />
      )}

      {/* Inspect Modal if triggered */}
      {inspectFighterId && (
        <FighterInspectModal
          initialFighterId={inspectFighterId}
          onClose={() => setInspectFighterId(null)}
        />
      )}
    </div>
  );
}
