/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Phase 1 Authentication Scene & Profile Terminal
 */

import React, { useState } from 'react';
import { authStore, PublicUserProfile } from '../auth/authStore.js';
import { FighterAvatar } from './FighterAvatar.js';
import { FighterInspectModal } from './FighterInspectModal.js';
import { sound } from '../audio/sound.js';
import { ROSTER } from '../../../shared/characters/roster.js';
import {
  Shield,
  Zap,
  Swords,
  Trophy,
  UserCheck,
  Volume2,
  VolumeX,
  Flame,
  ArrowRight,
  LogOut,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  user: PublicUserProfile | null;
  loading: boolean;
  error: string | null;
  onEnterLobby: () => void;
  onViewProfile?: () => void;
}

export const AuthScene: React.FC<Props> = ({ user, loading, error, onEnterLobby, onViewProfile }) => {
  const [tab, setTab] = useState<'login' | 'register' | 'guest'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectFighterId, setInspectFighterId] = useState('blitz');
  const [muted, setMuted] = useState(sound.isMuted());
  const [fbSimModalOpen, setFbSimModalOpen] = useState(false);

  const toggleSound = () => {
    const isM = sound.toggleMute();
    setMuted(isM);
    if (!isM) sound.playMenuClick();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playMenuClick();
    setLocalError(null);

    if (!username.trim() || !password) {
      setLocalError('Please supply both your fighter callsign and security passkey.');
      sound.playError();
      return;
    }

    const success = await authStore.login(username, password);
    if (success) {
      sound.playAuthSuccess();
    } else {
      sound.playError();
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playMenuClick();
    setLocalError(null);

    if (!username.trim() || !email.trim() || !password) {
      setLocalError('All enlistment fields are mandatory.');
      sound.playError();
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passkeys do not match.');
      sound.playError();
      return;
    }

    const success = await authStore.register(username, email, password);
    if (success) {
      sound.playAuthSuccess();
    } else {
      sound.playError();
    }
  };

  const handleGuestSubmit = async () => {
    sound.playMenuClick();
    setLocalError(null);
    const success = await authStore.loginAsGuest();
    if (success) {
      sound.playAuthSuccess();
    } else {
      sound.playError();
    }
  };

  const handleFacebookLogin = async (customName?: string) => {
    sound.playMenuClick();
    setLocalError(null);
    setFbSimModalOpen(false);

    const mockProfile = customName ? { name: customName } : undefined;
    const success = await authStore.loginWithFacebook(undefined, mockProfile);
    if (success) {
      sound.playAuthSuccess();
    } else {
      sound.playError();
    }
  };

  const activeError = localError || error;

  return (
    <div className="relative z-10 min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none">
      {/* Top HUD Bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 border-b border-cyan-900/40">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-400 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.4)]">
            <Swords className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-orbitron font-black text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-200 to-indigo-400">
                BDFIGHT
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                v1.0 ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-rajdhani tracking-wider">
              2D ARCADE FIGHTING ENGINE • 60 FPS DETERMINISTIC
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Audio toggle button */}
          <button
            onClick={toggleSound}
            aria-label={muted ? 'Unmute procedural audio' : 'Mute procedural audio'}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition shadow-sm"
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Quick Roster Inspector CTA */}
          <button
            onClick={() => {
              sound.playMenuClick();
              setInspectFighterId('blitz');
              setInspectModalOpen(true);
            }}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 text-xs font-chakra font-bold tracking-wider transition shadow-[0_0_10px_rgba(0,240,255,0.15)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>ROSTER & MOVESETS (6)</span>
          </button>
        </div>
      </header>

      {/* Main Content Arena */}
      <main className="w-full max-w-4xl mx-auto my-auto py-6">
        {user ? (
          /* ================= Authenticated Combatant Card ================= */
          <div className="w-full bg-slate-950/90 border-2 border-cyan-500/50 rounded-2xl p-6 sm:p-8 shadow-[0_0_35px_rgba(0,240,255,0.25)] backdrop-blur-md animate-in zoom-in-95 duration-200 space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
                <FighterAvatar fighterId={user.avatarId || 'blitz'} size="xl" showBadge />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h2 className="font-orbitron font-extrabold text-2xl sm:text-3xl text-white">
                      {user.username}
                    </h2>
                    {user.isGuest ? (
                      <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        GUEST SESSION
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                        <span>REGISTERED FIGHTER</span>
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-rajdhani text-cyan-400 font-semibold flex items-center justify-center sm:justify-start space-x-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>{user.rankTier}</span>
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    FIGHTER ID: <span className="text-slate-300">{user.id}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => {
                  sound.playMenuClick();
                  authStore.logout();
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 hover:bg-red-900/60 text-xs font-chakra font-bold transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>SIGN OUT / SWITCH</span>
              </button>
            </div>

            {/* Combatant Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-center items-center text-center">
                <span className="text-[11px] font-chakra text-slate-400 font-bold uppercase tracking-wider">
                  ELO RATING
                </span>
                <span className="font-orbitron font-black text-2xl text-cyan-300 mt-1">
                  {user.elo}
                </span>
                <span className="text-[10px] text-cyan-500/80 font-mono">Top Contender</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-center items-center text-center">
                <span className="text-[11px] font-chakra text-slate-400 font-bold uppercase tracking-wider">
                  WIN / LOSS
                </span>
                <span className="font-orbitron font-black text-2xl text-emerald-400 mt-1">
                  {user.wins}W - {user.losses}L
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {user.wins + user.losses > 0
                    ? `${Math.round((user.wins / (user.wins + user.losses)) * 100)}% Winrate`
                    : 'Unranked'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-center items-center text-center">
                <span className="text-[11px] font-chakra text-slate-400 font-bold uppercase tracking-wider">
                  WIN STREAK
                </span>
                <span className="font-orbitron font-black text-2xl text-orange-400 mt-1 flex items-center space-x-1">
                  <span>{user.streak}</span>
                  {user.streak > 0 && <Flame className="w-4 h-4 text-orange-500 animate-bounce" />}
                </span>
                <span className="text-[10px] text-orange-500/80 font-mono">Active Run</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-center items-center text-center">
                <span className="text-[11px] font-chakra text-slate-400 font-bold uppercase tracking-wider">
                  ASSIGNED CLASS
                </span>
                <span className="font-orbitron font-bold text-lg text-purple-300 mt-1 uppercase">
                  {user.avatarId || 'blitz'}
                </span>
                <span className="text-[10px] text-purple-400 font-mono">
                  {ROSTER[user.avatarId || 'blitz']?.archetype.split('/')[0] || 'Striker'}
                </span>
              </div>
            </div>

            {/* Launchpad Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  sound.playMenuClick();
                  onEnterLobby();
                }}
                className="flex-1 py-3.5 px-6 rounded-xl font-orbitron font-black text-sm text-black bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-300 hover:from-cyan-300 hover:to-teal-200 transition shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center space-x-2 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>ENTER MULTIPLAYER LOBBY (PHASE 3)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {onViewProfile && (
                <button
                  onClick={() => {
                    sound.playMenuClick();
                    onViewProfile();
                  }}
                  className="py-3.5 px-5 rounded-xl font-chakra font-bold text-xs text-yellow-300 bg-yellow-950/40 hover:bg-yellow-900/50 border border-yellow-600/50 transition flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                >
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span>SOCIAL PROFILE & STATS</span>
                </button>
              )}

              <button
                onClick={() => {
                  sound.playMenuClick();
                  setInspectFighterId(user.avatarId || 'blitz');
                  setInspectModalOpen(true);
                }}
                className="py-3.5 px-5 rounded-xl font-chakra font-bold text-xs text-cyan-300 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 transition flex items-center justify-center space-x-2"
              >
                <Swords className="w-4 h-4 text-cyan-400" />
                <span>MOVESET DATA</span>
              </button>
            </div>
          </div>
        ) : (
          /* ================= Unauthenticated Auth Terminal ================= */
          <div className="w-full max-w-lg mx-auto bg-slate-950/90 border border-cyan-500/40 rounded-2xl p-6 sm:p-8 shadow-[0_0_35px_rgba(0,240,255,0.2)] backdrop-blur-md animate-in fade-in duration-200">
            {/* Terminal Header */}
            <div className="text-center space-y-1.5 mb-6">
              <h2 className="font-orbitron font-extrabold text-2xl text-white tracking-wide">
                COMBATANT TERMINAL
              </h2>
              <p className="text-xs text-slate-400 font-rajdhani">
                Authenticate your callsign to enter online 60Hz matchmaking.
              </p>
            </div>

            {/* Error Banner */}
            {activeError && (
              <div className="mb-5 p-3 rounded-lg bg-red-950/60 border border-red-700/60 text-red-200 text-xs font-rajdhani flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{activeError}</span>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-xl mb-6 border border-slate-800">
              <button
                onClick={() => {
                  sound.playMenuClick();
                  setTab('login');
                  setLocalError(null);
                  authStore.clearError();
                }}
                className={`py-2 text-xs font-chakra font-bold tracking-wider rounded-lg transition ${
                  tab === 'login'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                SIGN IN
              </button>
              <button
                onClick={() => {
                  sound.playMenuClick();
                  setTab('register');
                  setLocalError(null);
                  authStore.clearError();
                }}
                className={`py-2 text-xs font-chakra font-bold tracking-wider rounded-lg transition ${
                  tab === 'register'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                ENLIST
              </button>
              <button
                onClick={() => {
                  sound.playMenuClick();
                  setTab('guest');
                  setLocalError(null);
                  authStore.clearError();
                }}
                className={`py-2 text-xs font-chakra font-bold tracking-wider rounded-lg transition ${
                  tab === 'guest'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                1-CLICK GUEST
              </button>
            </div>

            {/* Tab: LOGIN */}
            {tab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-chakra font-bold text-slate-300 uppercase tracking-wider">
                    Callsign or Battle Email
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. NeonStriker or blitz@bdfight.gg"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-chakra font-bold text-slate-300 uppercase tracking-wider">
                    Security Passkey
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-orbitron font-bold text-sm text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 transition shadow-[0_0_15px_rgba(0,240,255,0.3)] mt-2"
                >
                  {loading ? 'AUTHENTICATING...' : 'ACCESS BATTLE MAINFRAME'}
                </button>
              </form>
            )}

            {/* Tab: REGISTER */}
            {tab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-chakra font-bold text-slate-300 uppercase tracking-wider">
                    Combatant Callsign
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. CyberViper (3-20 chars)"
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-chakra font-bold text-slate-300 uppercase tracking-wider">
                    Battle Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="viper@domain.com"
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-chakra font-bold text-slate-300 uppercase tracking-wider">
                      Passkey
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-chakra font-bold text-slate-300 uppercase tracking-wider">
                      Confirm
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat passkey"
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-orbitron font-bold text-sm text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 transition shadow-[0_0_15px_rgba(0,240,255,0.3)] mt-2"
                >
                  {loading ? 'ENLISTING...' : 'ENLIST NEW COMBATANT'}
                </button>
              </form>
            )}

            {/* Tab: GUEST */}
            {tab === 'guest' && (
              <div className="space-y-4 py-2 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-cyan-950/60 border border-cyan-400 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-orbitron font-bold text-base text-white">
                    Instant Play as Guest
                  </h3>
                  <p className="text-xs text-slate-400 font-rajdhani max-w-xs mx-auto">
                    Skip sign-up and immediately dive into deterministic 60Hz combat with a temporary fighter tag and 1000 ELO.
                  </p>
                </div>
                <button
                  onClick={handleGuestSubmit}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-orbitron font-bold text-sm text-black bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 disabled:opacity-50 transition shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                >
                  {loading ? 'GENERATING GUEST PASS...' : 'CLAIM GUEST PASS & PLAY'}
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase font-chakra">
                <span className="bg-slate-950 px-3 text-slate-500">OR SOCIAL SIGN-IN</span>
              </div>
            </div>

            {/* Facebook OAuth Button (fb-login-btn) */}
            <button
              id="fb-login-btn"
              type="button"
              onClick={() => setFbSimModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl font-chakra font-bold text-sm text-white bg-[#1877F2] hover:bg-[#166FE5] transition flex items-center justify-center space-x-2.5 shadow-md group"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Continue with Facebook</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer System Specs */}
      <footer className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between py-3 text-[11px] text-slate-500 font-mono border-t border-slate-900">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>NETCODE: ROLLBACK / WEBRTC P2P READY</span>
        </div>
        <div className="mt-1 sm:mt-0 flex items-center space-x-3">
          <span>TICK: 60 HZ FIXED</span>
          <span>•</span>
          <span>AUDIO: PROCEDURAL WEB AUDIO SYNTH</span>
        </div>
      </footer>

      {/* Fighter Moveset Inspector Modal */}
      {inspectModalOpen && (
        <FighterInspectModal
          initialFighterId={inspectFighterId}
          onClose={() => setInspectModalOpen(false)}
        />
      )}

      {/* Facebook OAuth Integration Modal Simulator */}
      {fbSimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-blue-500/50 rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2.5 text-blue-400">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <h3 className="font-orbitron font-bold text-sm text-white">Facebook Login OAuth</h3>
            </div>
            <p className="text-xs text-slate-300 font-rajdhani">
              Connect your verified Facebook account to link battle stats and unlock cross-device cloud persistence.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleFacebookLogin('CyberStriker_FB')}
                className="w-full py-2.5 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white font-chakra font-bold text-xs transition"
              >
                Log In As "CyberStriker_FB"
              </button>
              <button
                onClick={() => setFbSimModalOpen(false)}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-chakra text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
