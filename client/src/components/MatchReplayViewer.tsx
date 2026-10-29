/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Deterministic Match Replay Viewer & Frame Analysis Theater
 *
 * Replays input streams deterministically with slow-motion, frame stepping,
 * instant scrubber seeking, hitbox/hurtbox visualization, and virtual fightstick input display.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MatchReplayData } from '../../../shared/replay.js';
import { replayStore } from '../replay/replayStore.js';
import {
  stepSimulation,
  createInitialGameState,
  cloneGameState,
  getPlayerHitbox,
  getPlayerHurtbox,
  PlayerAction,
  INPUT_UP,
  INPUT_DOWN,
  INPUT_LEFT,
  INPUT_RIGHT,
  INPUT_A,
  INPUT_B,
  INPUT_C,
  INPUT_D,
} from '../../../shared/sim.js';
import { fpToFloat } from '../../../shared/fixed.js';
import { ROSTER } from '../../../shared/characters/roster.js';
import { sound } from '../audio/sound.js';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eye,
  ArrowLeft,
  Volume2,
  VolumeX,
  Gauge,
  Film,
  Trophy,
  Swords,
} from 'lucide-react';

interface Props {
  initialReplayId?: string;
  onExit: () => void;
  onEnterArena?: () => void;
}

export const MatchReplayViewer: React.FC<Props> = ({
  initialReplayId,
  onExit,
  onEnterArena,
}) => {
  const allReplays = replayStore.getAll();
  const [selectedReplayId, setSelectedReplayId] = useState<string>(
    initialReplayId || allReplays[0]?.id || 'rep_blitz_vs_ronin_clash'
  );

  const activeReplay = useMemo(() => {
    return replayStore.getById(selectedReplayId) || allReplays[0];
  }, [selectedReplayId, allReplays]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Playback control states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 0.25, 0.5, 1.0, 2.0
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [showInputs, setShowInputs] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  // Checkpoints cache: every 15 frames, store full GameState snapshot for instant scrubber seeking
  const checkpointCacheRef = useRef<Map<number, any>>(new Map());
  const currentStateRef = useRef<any>(null);

  // Initialize or re-initialize simulation timeline when activeReplay changes
  useEffect(() => {
    if (!activeReplay) return;

    checkpointCacheRef.current.clear();
    const initialState = createInitialGameState(activeReplay.p1Fighter, activeReplay.p2Fighter);
    initialState.rngSeed = activeReplay.rngSeed || 0x1337cafe;

    checkpointCacheRef.current.set(0, cloneGameState(initialState));
    currentStateRef.current = cloneGameState(initialState);
    setCurrentFrame(0);
    setIsPlaying(true);
  }, [activeReplay]);

  // Fast-seek to specific frame using checkpoints
  const seekToFrame = (targetFrame: number) => {
    if (!activeReplay) return;
    const clamped = Math.max(0, Math.min(targetFrame, activeReplay.totalFrames));

    // Find nearest preceding checkpoint (every 15 frames)
    const stepSize = 15;
    const baseFrame = Math.floor(clamped / stepSize) * stepSize;

    let simState = checkpointCacheRef.current.get(baseFrame);
    if (!simState) {
      // Build checkpoints up to baseFrame
      let s = cloneGameState(checkpointCacheRef.current.get(0)!);
      for (let f = 0; f <= baseFrame; f++) {
        if (f % stepSize === 0) {
          checkpointCacheRef.current.set(f, cloneGameState(s));
        }
        if (f < baseFrame) {
          const in1 = activeReplay.p1Inputs[f] || 0;
          const in2 = activeReplay.p2Inputs[f] || 0;
          stepSimulation(s, in1, in2);
        }
      }
      simState = checkpointCacheRef.current.get(baseFrame);
    }

    // Step forward from baseFrame to clamped
    const workingState = cloneGameState(simState);
    for (let f = baseFrame; f < clamped; f++) {
      const in1 = activeReplay.p1Inputs[f] || 0;
      const in2 = activeReplay.p2Inputs[f] || 0;
      stepSimulation(workingState, in1, in2);
    }

    currentStateRef.current = workingState;
    setCurrentFrame(clamped);
  };

  // Keyboard shortcuts for frame stepping
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        seekToFrame(currentFrame + 1);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        seekToFrame(currentFrame - 1);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentFrame, activeReplay]);

  // Main playback tick and rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeReplay) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let accumulator = 0;

    const render = (time: number) => {
      const dt = Math.min(time - lastTime, 100);
      lastTime = time;

      // Base tick interval adjusted for playback speed (e.g. 0.25x = 4x longer interval)
      const targetInterval = (1000 / 60) / playbackSpeed;
      accumulator += dt;

      if (isPlaying && currentStateRef.current) {
        while (accumulator >= targetInterval) {
          const state = currentStateRef.current;
          const f = state.frame;

          if (f < activeReplay.totalFrames) {
            const in1 = activeReplay.p1Inputs[f] || 0;
            const in2 = activeReplay.p2Inputs[f] || 0;

            const prevP1Hp = state.players[0].hp;
            const prevP2Hp = state.players[1].hp;

            stepSimulation(state, in1, in2);

            // Audio cues
            if (state.players[1].hp < prevP2Hp) {
              if (state.players[1].action === PlayerAction.BLOCKSTUN) {
                sound.playBlock();
              } else if (state.players[1].hp <= 0) {
                sound.playKnockdown();
              } else {
                sound.playHitLight();
              }
            } else if (state.players[0].hp < prevP1Hp) {
              if (state.players[0].action === PlayerAction.BLOCKSTUN) {
                sound.playBlock();
              } else {
                sound.playHitLight();
              }
            }

            // Cache checkpoint every 15 frames
            if (state.frame % 15 === 0) {
              checkpointCacheRef.current.set(state.frame, cloneGameState(state));
            }

            setCurrentFrame(state.frame);
          } else {
            setIsPlaying(false);
            break;
          }

          accumulator -= targetInterval;
        }
      }

      // Render Replay Canvas
      const width = (canvas.width = 1280);
      const height = (canvas.height = 720);
      const state = currentStateRef.current;

      if (state) {
        ctx.save();
        if (state.screenShake > 0) {
          const shakeX = (Math.random() - 0.5) * state.screenShake * 3;
          const shakeY = (Math.random() - 0.5) * state.screenShake * 3;
          ctx.translate(shakeX, shakeY);
        }

        // Cyber Stage Background
        ctx.fillStyle = '#03050a';
        ctx.fillRect(0, 0, width, height);

        // Floor line
        const floorY = 560;
        ctx.strokeStyle = '#00F0FF44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, floorY);
        ctx.lineTo(width, floorY);
        ctx.stroke();

        // Stage bounds
        ctx.strokeStyle = '#FF005533';
        ctx.lineWidth = 1;
        ctx.strokeRect(70, 60, 1140, 500);

        // Draw Projectiles
        state.projectiles.forEach((proj: any) => {
          const px = fpToFloat(proj.x);
          const py = fpToFloat(proj.y);
          ctx.fillStyle = '#00D4FF';
          ctx.shadowColor = '#00D4FF';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(px, py, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        });

        // Draw Both Fighters
        state.players.forEach((p: any) => {
          const px = fpToFloat(p.x);
          const py = fpToFloat(p.y);
          const rosterChar = ROSTER[p.fighterId] || ROSTER.blitz;
          const isHit = p.action === PlayerAction.HITSTUN;
          const isBlock = p.action === PlayerAction.BLOCKSTUN;

          ctx.save();
          ctx.translate(px, py);

          // Ground shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.beginPath();
          ctx.ellipse(0, 0, 36, 10, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.scale(p.facing, 1);

          const bodyHeight = p.isCrouching ? 70 : 130;
          const bodyY = -bodyHeight;

          ctx.fillStyle = isHit ? '#FF0055' : isBlock ? '#0077FF' : rosterChar.themeColor;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.roundRect(-24, bodyY, 48, bodyHeight, [8, 8, 4, 4]);
          ctx.fill();
          ctx.stroke();

          // Visor slit
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(-10, bodyY + 18, 28, 8);

          // Action state text label
          ctx.scale(p.facing, 1);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${p.action} [${p.actionFrame}f]`, 0, bodyY - 14);

          ctx.restore();

          // Hitboxes & Hurtboxes
          if (showBoxes) {
            const hurt = getPlayerHurtbox(p);
            const hx = fpToFloat(hurt.x);
            const hy = fpToFloat(hurt.y);
            const hw = fpToFloat(hurt.width);
            const hh = fpToFloat(hurt.height);

            ctx.strokeStyle = p.isBlocking ? '#00A2FF' : '#00FF66';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(hx, hy, hw, hh);

            const hit = getPlayerHitbox(p);
            if (hit) {
              const bx = fpToFloat(hit.x);
              const by = fpToFloat(hit.y);
              const bw = fpToFloat(hit.width);
              const bh = fpToFloat(hit.height);

              ctx.fillStyle = 'rgba(255, 0, 60, 0.4)';
              ctx.strokeStyle = '#FF003C';
              ctx.lineWidth = 2;
              ctx.fillRect(bx, by, bw, bh);
              ctx.strokeRect(bx, by, bw, bh);
            }
          }
        });

        // Watermark / Indicator in viewer
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`REPLAY THEATER • DETERMINISTIC 60HZ RE-SIMULATION`, 85, 90);

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, activeReplay, showBoxes]);

  const p1CurrentInput = activeReplay?.p1Inputs[currentFrame] || 0;
  const p2CurrentInput = activeReplay?.p2Inputs[currentFrame] || 0;

  const state = currentStateRef.current;
  const p1 = state?.players[0];
  const p2 = state?.players[1];

  return (
    <div className="relative w-screen h-screen flex flex-col justify-between bg-black text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Bar Header */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-4 pt-3 flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              sound.playMenuClick();
              onExit();
            }}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/50 transition text-xs font-chakra font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>EXIT THEATER</span>
          </button>

          <div className="flex items-center space-x-2">
            <Film className="w-4 h-4 text-cyan-400" />
            <span className="font-orbitron font-extrabold text-sm text-cyan-300">
              MATCH REPLAY THEATER
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              {playbackSpeed}X SPEED
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBoxes(!showBoxes)}
              className={`p-1.5 rounded-lg border text-xs font-chakra font-bold flex items-center space-x-1 transition ${
                showBoxes
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>BOXES</span>
            </button>

            <button
              onClick={() => {
                const m = sound.toggleMute();
                setMuted(m);
              }}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 transition"
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Health Bars & Matchup Info */}
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-5 space-y-1">
            <div className="flex justify-between items-center text-xs font-chakra font-bold">
              <span className="text-cyan-400 uppercase tracking-wider">
                {activeReplay?.p1Name} ({ROSTER[activeReplay?.p1Fighter]?.name})
              </span>
              <span className="font-mono text-slate-300">{p1?.hp ?? 1000} / 1000</span>
            </div>
            <div className="h-3 w-full bg-slate-900 rounded-sm border border-slate-800 overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-teal-300 transition-all duration-75"
                style={{ width: `${((p1?.hp ?? 1000) / 1000) * 100}%` }}
              />
            </div>
          </div>

          <div className="col-span-2 flex flex-col items-center justify-center">
            <div className="px-3 py-1 rounded bg-slate-900 border border-cyan-500/40 text-center font-orbitron font-bold text-xs text-yellow-300">
              FRAME {currentFrame} / {activeReplay?.totalFrames || 360}
            </div>
          </div>

          <div className="col-span-5 space-y-1">
            <div className="flex justify-between items-center text-xs font-chakra font-bold">
              <span className="font-mono text-slate-300">{p2?.hp ?? 1000} / 1000</span>
              <span className="text-orange-400 uppercase tracking-wider">
                {activeReplay?.p2Name} ({ROSTER[activeReplay?.p2Fighter]?.name})
              </span>
            </div>
            <div className="h-3 w-full bg-slate-900 rounded-sm border border-slate-800 overflow-hidden flex justify-end">
              <div
                className="h-full bg-gradient-to-l from-orange-500 to-amber-300 transition-all duration-75"
                style={{ width: `${((p2?.hp ?? 1000) / 1000) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Simulation Viewport (Canvas) */}
      <div className="relative flex-1 w-full flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full max-w-6xl max-h-[64vh] rounded-xl border border-slate-800 shadow-2xl bg-black object-contain"
        />

        {/* Real-time Fightstick Input Overlay on canvas corners */}
        {showInputs && (
          <div className="absolute bottom-6 left-8 flex items-center space-x-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-[10px]">
            <span className="text-cyan-400 font-bold mr-1">P1:</span>
            <span className={p1CurrentInput & INPUT_UP ? 'text-cyan-400 font-black' : 'text-slate-600'}>↑</span>
            <span className={p1CurrentInput & INPUT_DOWN ? 'text-cyan-400 font-black' : 'text-slate-600'}>↓</span>
            <span className={p1CurrentInput & INPUT_LEFT ? 'text-cyan-400 font-black' : 'text-slate-600'}>←</span>
            <span className={p1CurrentInput & INPUT_RIGHT ? 'text-cyan-400 font-black' : 'text-slate-600'}>→</span>
            <span className="text-slate-700">|</span>
            <span className={p1CurrentInput & INPUT_A ? 'px-1 rounded bg-cyan-400 text-black font-bold' : 'text-slate-600'}>A</span>
            <span className={p1CurrentInput & INPUT_B ? 'px-1 rounded bg-teal-400 text-black font-bold' : 'text-slate-600'}>B</span>
            <span className={p1CurrentInput & INPUT_C ? 'px-1 rounded bg-orange-400 text-black font-bold' : 'text-slate-600'}>C</span>
            <span className={p1CurrentInput & INPUT_D ? 'px-1 rounded bg-purple-400 text-black font-bold' : 'text-slate-600'}>D</span>
          </div>
        )}

        {showInputs && (
          <div className="absolute bottom-6 right-8 flex items-center space-x-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-[10px]">
            <span className="text-orange-400 font-bold mr-1">P2:</span>
            <span className={p2CurrentInput & INPUT_UP ? 'text-orange-400 font-black' : 'text-slate-600'}>↑</span>
            <span className={p2CurrentInput & INPUT_DOWN ? 'text-orange-400 font-black' : 'text-slate-600'}>↓</span>
            <span className={p2CurrentInput & INPUT_LEFT ? 'text-orange-400 font-black' : 'text-slate-600'}>←</span>
            <span className={p2CurrentInput & INPUT_RIGHT ? 'text-orange-400 font-black' : 'text-slate-600'}>→</span>
            <span className="text-slate-700">|</span>
            <span className={p2CurrentInput & INPUT_A ? 'px-1 rounded bg-cyan-400 text-black font-bold' : 'text-slate-600'}>A</span>
            <span className={p2CurrentInput & INPUT_B ? 'px-1 rounded bg-teal-400 text-black font-bold' : 'text-slate-600'}>B</span>
            <span className={p2CurrentInput & INPUT_C ? 'px-1 rounded bg-orange-400 text-black font-bold' : 'text-slate-600'}>C</span>
            <span className={p2CurrentInput & INPUT_D ? 'px-1 rounded bg-purple-400 text-black font-bold' : 'text-slate-600'}>D</span>
          </div>
        )}
      </div>

      {/* Bottom Replay Control Dock */}
      <footer className="relative z-20 w-full max-w-6xl mx-auto px-4 pb-3 flex flex-col space-y-2 border-t border-slate-900 pt-2">
        {/* Timeline Scrubber */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-slate-400 w-12">
            {(currentFrame / 60).toFixed(2)}s
          </span>
          <input
            type="range"
            min={0}
            max={activeReplay?.totalFrames || 360}
            value={currentFrame}
            onChange={(e) => {
              setIsPlaying(false);
              seekToFrame(parseInt(e.target.value, 10));
            }}
            className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="text-xs font-mono text-slate-500 w-12 text-right">
            {((activeReplay?.totalFrames || 360) / 60).toFixed(2)}s
          </span>
        </div>

        {/* Transport & Speed Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-chakra">
          {/* Replay Switcher Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-bold">REPLAY:</span>
            <select
              value={selectedReplayId}
              onChange={(e) => {
                sound.playMenuClick();
                setSelectedReplayId(e.target.value);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-chakra focus:outline-none focus:border-cyan-400"
            >
              {allReplays.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>

          {/* Stepping & Playback Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                sound.playMenuClick();
                seekToFrame(0);
              }}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
              title="Jump to Start"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                sound.playMenuClick();
                setIsPlaying(false);
                seekToFrame(currentFrame - 1);
              }}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
              title="Step -1 Frame (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                sound.playMenuClick();
                setIsPlaying(!isPlaying);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-orbitron font-black text-xs flex items-center space-x-1 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              onClick={() => {
                sound.playMenuClick();
                setIsPlaying(false);
                seekToFrame(currentFrame + 1);
              }}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
              title="Step +1 Frame (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                sound.playMenuClick();
                seekToFrame(activeReplay?.totalFrames || 360);
              }}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
              title="Jump to End"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Selector (Slow-Mo & Fast Forward) */}
          <div className="flex items-center space-x-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 text-[11px] mr-1">SPEED:</span>
            {[0.25, 0.5, 1.0, 2.0].map((spd) => (
              <button
                key={spd}
                onClick={() => {
                  sound.playMenuClick();
                  setPlaybackSpeed(spd);
                }}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold border transition ${
                  playbackSpeed === spd
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};
