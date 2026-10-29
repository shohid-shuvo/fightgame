/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Interactive Practice Ring & Deterministic Simulation Harness
 *
 * Runs shared/sim.js at a fixed 60Hz tick rate with real-time vector rendering,
 * hurtbox/hitbox visualization toggles, procedural audio, and CPU dummy behaviors.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  stepSimulation,
  createInitialGameState,
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
import { replayStore } from '../replay/replayStore.js';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  Shield,
  Eye,
  Zap,
  Swords,
  Cpu,
  Film,
} from 'lucide-react';

interface Props {
  p1Fighter?: string;
  p2Fighter?: string;
  onExit: () => void;
  onWatchReplay?: (replayId?: string) => void;
}

export const PracticeArena: React.FC<Props> = ({
  p1Fighter = 'blitz',
  p2Fighter = 'ronin',
  onExit,
  onWatchReplay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const [dummyMode, setDummyMode] = useState<'stand' | 'crouch' | 'block' | 'cpu'>('stand');
  const [muted, setMuted] = useState(sound.isMuted());
  const [hudState, setHudState] = useState({
    p1Hp: 1000,
    p2Hp: 1000,
    p1Meter: 0,
    p2Meter: 0,
    frame: 0,
    timer: 99,
    p1Action: 'IDLE',
    p2Action: 'IDLE',
    comboP1: 0,
    comboP2: 0,
  });

  const gameStateRef = useRef(createInitialGameState(p1Fighter, p2Fighter));
  const keysDownRef = useRef<Set<string>>(new Set());
  const recordedInputsRef = useRef<{ p1: number[]; p2: number[] }>({ p1: [], p2: [] });

  // Input mapping
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Prevent browser scrolling on space/arrows
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      keysDownRef.current.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current.delete(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Main 60Hz Game Loop running shared/sim.js
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    const fixedDt = 1000 / 60; // 16.666ms per tick

    const resetMatch = () => {
      gameStateRef.current = createInitialGameState(p1Fighter, p2Fighter);
    };

    const runDeterministicStep = () => {
      const keys = keysDownRef.current;
      const state = gameStateRef.current;

      // Map keyboard to P1 Input Bitmask
      // Movement: WASD or Arrow Keys
      let p1Input = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) p1Input |= INPUT_UP;
      if (keys.has('KeyS') || keys.has('ArrowDown')) p1Input |= INPUT_DOWN;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) p1Input |= INPUT_LEFT;
      if (keys.has('KeyD') || keys.has('ArrowRight')) p1Input |= INPUT_RIGHT;

      // Attacks: J (Light), K (Medium), L (Heavy), U (Drive)
      if (keys.has('KeyJ') || keys.has('KeyZ')) p1Input |= INPUT_A;
      if (keys.has('KeyK') || keys.has('KeyX')) p1Input |= INPUT_B;
      if (keys.has('KeyL') || keys.has('KeyC')) p1Input |= INPUT_C;
      if (keys.has('KeyU') || keys.has('KeyV')) p1Input |= INPUT_D;

      // Special helper keys: I for Special (236A), O for Super
      if (keys.has('KeyI')) {
        p1Input |= INPUT_DOWN | INPUT_RIGHT | INPUT_A;
      }
      if (keys.has('KeyO')) {
        p1Input |= INPUT_A | INPUT_B;
      }

      // Compute P2 Dummy / CPU Input
      let p2Input = 0;
      const p2 = state.players[1];
      const p1 = state.players[0];

      if (dummyMode === 'crouch') {
        p2Input |= INPUT_DOWN;
      } else if (dummyMode === 'block') {
        // Hold backward relative to P1
        p2Input |= p2.facing === 1 ? INPUT_LEFT : INPUT_RIGHT;
      } else if (dummyMode === 'cpu') {
        // Simple procedural sparring AI
        const dist = Math.abs(fpToFloat(p1.x) - fpToFloat(p2.x));
        if (dist > 180) {
          // Walk towards P1
          p2Input |= p2.facing === 1 ? INPUT_RIGHT : INPUT_LEFT;
        } else if (dist < 100 && Math.random() < 0.15) {
          // Throw attack
          const roll = Math.random();
          if (roll < 0.5) p2Input |= INPUT_A;
          else if (roll < 0.8) p2Input |= INPUT_B;
          else p2Input |= INPUT_C;
        } else if (Math.random() < 0.2) {
          // Guard
          p2Input |= p2.facing === 1 ? INPUT_LEFT : INPUT_RIGHT;
        }
      }

      // Record pre-step state for sound trigger detection
      const prevP2Hp = p2.hp;
      const prevP1Hp = p1.hp;

      // Record input stream for deterministic match replay
      recordedInputsRef.current.p1.push(p1Input);
      recordedInputsRef.current.p2.push(p2Input);

      // Execute deterministic 60Hz step from shared/sim.js
      stepSimulation(state, p1Input, p2Input);

      // Trigger Web Audio effects based on deterministic outcomes
      if (p2.hp < prevP2Hp) {
        if (p2.action === PlayerAction.BLOCKSTUN) {
          sound.playBlock();
        } else if (p2.hp <= 0) {
          sound.playKnockdown();
        } else {
          sound.playHitLight();
        }
      } else if (p1.hp < prevP1Hp) {
        if (p1.action === PlayerAction.BLOCKSTUN) {
          sound.playBlock();
        } else {
          sound.playHitLight();
        }
      }

      // Update HUD state every 3 frames to avoid React overhead
      if (state.frame % 3 === 0) {
        setHudState({
          p1Hp: state.players[0].hp,
          p2Hp: state.players[1].hp,
          p1Meter: state.players[0].meter,
          p2Meter: state.players[1].meter,
          frame: state.frame,
          timer: Math.ceil(state.roundTimer / 60),
          p1Action: state.players[0].action,
          p2Action: state.players[1].action,
          comboP1: state.players[0].comboCount,
          comboP2: state.players[1].comboCount,
        });
      }
    };

    // Render loop
    const render = (time: number) => {
      const dt = Math.min(time - lastTime, 100);
      lastTime = time;
      accumulator += dt;

      // Fixed 60Hz deterministic tick loop
      while (accumulator >= fixedDt) {
        runDeterministicStep();
        accumulator -= fixedDt;
      }

      // Render Stage and Fighters
      const width = (canvas.width = 1280);
      const height = (canvas.height = 720);
      const state = gameStateRef.current;

      // Camera Shake
      ctx.save();
      if (state.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * state.screenShake * 3;
        const shakeY = (Math.random() - 0.5) * state.screenShake * 3;
        ctx.translate(shakeX, shakeY);
      }

      // Cyber Stage Background
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, width, height);

      // Floor line
      const floorY = 560;
      ctx.strokeStyle = '#00F0FF44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(width, floorY);
      ctx.stroke();

      // Stage boundaries
      ctx.strokeStyle = '#FF005544';
      ctx.lineWidth = 1;
      ctx.strokeRect(70, 60, 1140, 500);

      // Draw Projectiles
      state.projectiles.forEach((proj) => {
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
      state.players.forEach((p, idx) => {
        const px = fpToFloat(p.x);
        const py = fpToFloat(p.y);
        const rosterChar = ROSTER[p.fighterId] || ROSTER.blitz;
        const isHit = p.action === PlayerAction.HITSTUN;
        const isBlock = p.action === PlayerAction.BLOCKSTUN;

        ctx.save();
        ctx.translate(px, py);

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 36, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Direction scale
        ctx.scale(p.facing, 1);

        // Body Silhouette
        const bodyHeight = p.isCrouching ? 70 : 130;
        const bodyY = -bodyHeight;

        ctx.fillStyle = isHit ? '#FF0055' : isBlock ? '#0077FF' : rosterChar.themeColor;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;

        // Fighter geometric silhouette
        ctx.beginPath();
        ctx.roundRect(-24, bodyY, 48, bodyHeight, [8, 8, 4, 4]);
        ctx.fill();
        ctx.stroke();

        // Visor slit / Headband
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-10, bodyY + 18, 28, 8);

        // Action indicator label
        ctx.scale(p.facing, 1); // unflip text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.action, 0, bodyY - 14);

        ctx.restore();

        // Debug Hitboxes & Hurtboxes
        if (showBoxes) {
          // Hurtbox (Green/Blue)
          const hurt = getPlayerHurtbox(p);
          const hx = fpToFloat(hurt.x);
          const hy = fpToFloat(hurt.y);
          const hw = fpToFloat(hurt.width);
          const hh = fpToFloat(hurt.height);

          ctx.strokeStyle = p.isBlocking ? '#00A2FF' : '#00FF66';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(hx, hy, hw, hh);

          // Hitbox (Red)
          const hit = getPlayerHitbox(p);
          if (hit) {
            const bx = fpToFloat(hit.x);
            const by = fpToFloat(hit.y);
            const bw = fpToFloat(hit.width);
            const bh = fpToFloat(hit.height);

            ctx.fillStyle = 'rgba(255, 0, 60, 0.35)';
            ctx.strokeStyle = '#FF003C';
            ctx.lineWidth = 2;
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeRect(bx, by, bw, bh);
          }
        }
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [p1Fighter, p2Fighter, dummyMode, showBoxes]);

  const toggleSound = () => {
    const isM = sound.toggleMute();
    setMuted(isM);
    if (!isM) sound.playMenuClick();
  };

  const resetSimulation = () => {
    sound.playMenuClick();
    recordedInputsRef.current = { p1: [], p2: [] };
    gameStateRef.current = createInitialGameState(p1Fighter, p2Fighter);
  };

  const handleSaveAndReplay = () => {
    const p1Stream = [...recordedInputsRef.current.p1];
    const p2Stream = [...recordedInputsRef.current.p2];
    while (p1Stream.length < 60) {
      p1Stream.push(0);
      p2Stream.push(0);
    }
    const replayId = `user_match_${Date.now()}`;
    replayStore.saveReplay({
      id: replayId,
      title: `Practice Bout: ${ROSTER[p1Fighter]?.name || 'P1'} vs ${ROSTER[p2Fighter]?.name || 'P2'}`,
      timestamp: Date.now(),
      p1Fighter,
      p2Fighter,
      p1Name: 'Player 1',
      p2Name: dummyMode === 'cpu' ? 'Sparring CPU' : 'Target Dummy',
      p1Avatar: p1Fighter,
      p2Avatar: p2Fighter,
      rngSeed: gameStateRef.current.rngSeed,
      totalFrames: p1Stream.length,
      winner: gameStateRef.current.winner,
      p1Inputs: p1Stream,
      p2Inputs: p2Stream,
    });
    sound.playMenuClick();
    if (onWatchReplay) {
      onWatchReplay(replayId);
    }
  };

  return (
    <div className="relative w-screen h-screen flex flex-col justify-between bg-black text-slate-100 overflow-hidden font-sans select-none">
      {/* Top HUD Display */}
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
            <span>EXIT RING</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="font-orbitron font-extrabold text-sm text-cyan-400">
              60 FPS DETERMINISTIC ARENA
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              FRAME: {hudState.frame}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveAndReplay}
              className="p-1.5 px-2.5 rounded-lg border border-yellow-500/50 bg-yellow-950/60 text-yellow-300 hover:bg-yellow-900/60 text-xs font-chakra font-bold flex items-center space-x-1 transition shadow-[0_0_10px_rgba(234,179,8,0.2)]"
              title="Save Match Replay & Open Theater"
            >
              <Film className="w-3.5 h-3.5 text-yellow-400" />
              <span>REPLAY BOUT</span>
            </button>

            <button
              onClick={() => setShowBoxes(!showBoxes)}
              className={`p-1.5 rounded-lg border text-xs font-chakra font-bold flex items-center space-x-1 transition ${
                showBoxes
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>HITBOXES</span>
            </button>

            <button
              onClick={resetSimulation}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 transition"
              title="Reset Fight"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={toggleSound}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 transition"
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Health & Meter Bars */}
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* P1 Health Bar */}
          <div className="col-span-5 space-y-1">
            <div className="flex justify-between items-center text-xs font-chakra font-bold">
              <span className="text-cyan-400 uppercase tracking-wider">
                {ROSTER[p1Fighter]?.name || 'P1'}
              </span>
              <span className="font-mono text-slate-300">{hudState.p1Hp} / 1000</span>
            </div>
            <div className="h-4 w-full bg-slate-900 rounded-sm border border-slate-800 overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-teal-300 transition-all duration-75"
                style={{ width: `${(hudState.p1Hp / 1000) * 100}%` }}
              />
            </div>
            {/* Super Meter */}
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 transition-all"
                style={{ width: `${(hudState.p1Meter / 1000) * 100}%` }}
              />
            </div>
          </div>

          {/* Round Timer Lockup */}
          <div className="col-span-2 flex flex-col items-center justify-center">
            <div className="w-12 h-10 rounded-lg bg-slate-900 border border-cyan-500/40 flex items-center justify-center font-orbitron font-black text-xl text-yellow-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
              {hudState.timer}
            </div>
          </div>

          {/* P2 Health Bar */}
          <div className="col-span-5 space-y-1">
            <div className="flex justify-between items-center text-xs font-chakra font-bold">
              <span className="font-mono text-slate-300">{hudState.p2Hp} / 1000</span>
              <span className="text-orange-400 uppercase tracking-wider">
                {ROSTER[p2Fighter]?.name || 'P2'}
              </span>
            </div>
            <div className="h-4 w-full bg-slate-900 rounded-sm border border-slate-800 overflow-hidden flex justify-end">
              <div
                className="h-full bg-gradient-to-l from-orange-500 to-amber-300 transition-all duration-75"
                style={{ width: `${(hudState.p2Hp / 1000) * 100}%` }}
              />
            </div>
            {/* Super Meter */}
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden flex justify-end">
              <div
                className="h-full bg-yellow-400 transition-all"
                style={{ width: `${(hudState.p2Meter / 1000) * 100}%` }}
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
          className="w-full h-full max-w-6xl max-h-[70vh] rounded-xl border border-slate-800 shadow-2xl bg-black object-contain"
        />
      </div>

      {/* Bottom Practice Controls & Key Legend */}
      <footer className="relative z-20 w-full max-w-6xl mx-auto px-4 pb-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-chakra border-t border-slate-900 pt-2">
        {/* Dummy AI Switcher */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 flex items-center space-x-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>OPPONENT DUMMY:</span>
          </span>
          {(['stand', 'crouch', 'block', 'cpu'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                sound.playMenuClick();
                setDummyMode(mode);
              }}
              className={`px-2.5 py-1 rounded border uppercase text-[11px] font-bold transition ${
                dummyMode === mode
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Input Controls Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="text-slate-200 font-bold">[WASD] Move/Jump</span>
          <span>•</span>
          <span className="text-cyan-300">[J] Light</span>
          <span className="text-emerald-300">[K] Med</span>
          <span className="text-orange-300">[L] Heavy</span>
          <span className="text-purple-300">[U] Drive</span>
          <span>•</span>
          <span className="text-yellow-300">[I] Special</span>
          <span className="text-pink-300">[O] Super</span>
        </div>
      </footer>
    </div>
  );
};
