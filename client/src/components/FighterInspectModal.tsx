/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Fighter Moveset Inspector & Asset Spec Modal
 */

import React, { useState } from 'react';
import { ROSTER, ROSTER_LIST, CharacterRosterEntry } from '../../../shared/characters/roster.js';
import { FighterAvatar } from './FighterAvatar.js';
import { sound } from '../audio/sound.js';
import { X, Volume2, Shield, Zap, Sparkles, Copy, Check } from 'lucide-react';

interface Props {
  initialFighterId?: string;
  onClose: () => void;
}

export const FighterInspectModal: React.FC<Props> = ({ initialFighterId = 'blitz', onClose }) => {
  const [selectedId, setSelectedId] = useState<string>(initialFighterId);
  const [activeTab, setActiveTab] = useState<'moves' | 'asset_spec'>('moves');
  const [copied, setCopied] = useState(false);

  const fighter: CharacterRosterEntry = ROSTER[selectedId] || ROSTER.blitz;

  const playSfx = (type: string) => {
    switch (type) {
      case 'light': sound.playHitLight(); break;
      case 'heavy': sound.playHitHeavy(); break;
      case 'block': sound.playBlock(); break;
      case 'whoosh': sound.playWhoosh(); break;
      case 'super': sound.playSuperChime(); break;
      case 'knockdown': sound.playKnockdown(); break;
      default: sound.playMenuClick();
    }
  };

  const assetSpecText = `[ASSET REQUEST SPECIFICATION]
Asset Name & ID: ${fighter.id}_character_sheet
File Format & Specs: Transparent PNG, 128x128 px per frame, 6-frame horizontal strip (Idle, Walk, Light Attack, Special, Hurt, Knockdown), feet aligned on bottom 16px baseline.
Destination Folder: client/public/assets/characters/${fighter.id}/spritesheet.png
Ready-to-use AI Prompt (Imagen 3 / Midjourney):
"High-detail 2D arcade fighting game sprite sheet of ${fighter.name}, ${fighter.visuals} Clean pixel-precise outline, dynamic cyber-arcade palette with ${fighter.themeColor} glowing highlights, vibrant black background transparent alpha cut, retro-modern fighting game keyframes, 6 frames sequential action strip."
How to wire into code:
Update 'shared/characters/${fighter.id}.json' with atlas key '${fighter.id}_atlas' and load in Phaser Preload scene via: this.load.spritesheet('${fighter.id}', 'assets/characters/${fighter.id}/spritesheet.png', { frameWidth: 128, frameHeight: 128 });`;

  const copySpec = () => {
    navigator.clipboard.writeText(assetSpecText);
    setCopied(true);
    sound.playMenuClick();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-slate-950 border rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        style={{ borderColor: fighter.themeColor, boxShadow: `0 0 30px ${fighter.glowColor}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <FighterAvatar fighterId={fighter.id} size="sm" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-orbitron font-extrabold text-lg sm:text-xl tracking-wider text-white">
                  {fighter.name}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded font-mono font-semibold text-black uppercase"
                  style={{ backgroundColor: fighter.themeColor }}
                >
                  {fighter.archetype}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-rajdhani">{fighter.title}</p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playMenuClick();
              onClose();
            }}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Character Selector Strip */}
        <div className="flex items-center gap-2 p-2 sm:px-6 bg-slate-900/30 border-b border-slate-800/80 overflow-x-auto">
          {ROSTER_LIST.map((c) => {
            const isSelected = c.id === fighter.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  sound.playMenuClick();
                  setSelectedId(c.id);
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md border text-xs font-chakra font-bold tracking-wider transition ${
                  isSelected
                    ? 'border-white text-white shadow-sm'
                    : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                style={{
                  backgroundColor: isSelected ? `${c.themeColor}22` : undefined,
                  borderColor: isSelected ? c.themeColor : undefined,
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.themeColor }} />
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Sub Navigation */}
          <div className="flex border-b border-slate-800 text-sm font-chakra">
            <button
              onClick={() => {
                sound.playMenuClick();
                setActiveTab('moves');
              }}
              className={`pb-2 px-4 font-bold border-b-2 transition ${
                activeTab === 'moves' ? 'text-white border-cyan-400' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              COMBAT FRAME DATA & SPECIALS
            </button>
            <button
              onClick={() => {
                sound.playMenuClick();
                setActiveTab('asset_spec');
              }}
              className={`pb-2 px-4 font-bold border-b-2 transition flex items-center space-x-1.5 ${
                activeTab === 'asset_spec' ? 'text-white border-yellow-400' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>ASSET SPECIFICATION CARD</span>
            </button>
          </div>

          {activeTab === 'moves' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: Visuals & Radar Stats */}
              <div className="md:col-span-5 space-y-4">
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-3">
                    <FighterAvatar fighterId={fighter.id} size="lg" />
                    <div>
                      <h4 className="font-orbitron text-sm font-bold text-slate-200">COMBAT PROFILE</h4>
                      <p className="text-xs text-slate-400 font-rajdhani mt-0.5 italic">"{fighter.quote}"</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 space-y-1.5 border-t border-slate-800/80 pt-2.5">
                    <div>
                      <span className="text-slate-500">Visual Silhouette: </span>
                      {fighter.visuals}
                    </div>
                    <div>
                      <span className="text-slate-500">Energy Aura: </span>
                      <span style={{ color: fighter.themeColor }}>{fighter.energyTheme}</span>
                    </div>
                  </div>
                </div>

                {/* Radar attributes */}
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2.5">
                  <h4 className="font-chakra text-xs font-bold text-slate-400 tracking-wider">COMBAT ATTRIBUTES</h4>
                  {Object.entries(fighter.stats).map(([stat, val]) => (
                    <div key={stat} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-rajdhani font-semibold">
                        <span className="uppercase text-slate-400">{stat}</span>
                        <span className="text-slate-200">{val} / 5</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(val / 5) * 100}%`,
                            backgroundColor: fighter.themeColor,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Procedural Audio Audition */}
                <div className="p-3.5 rounded-lg bg-slate-900/40 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-chakra font-bold text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>PROCEDURAL AUDIO LAB</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Zero MP3s</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => playSfx('light')}
                      className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-chakra"
                    >
                      Punch Slap
                    </button>
                    <button
                      onClick={() => playSfx('heavy')}
                      className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-chakra"
                    >
                      Bass Heavy
                    </button>
                    <button
                      onClick={() => playSfx('block')}
                      className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-chakra"
                    >
                      Metal Block
                    </button>
                    <button
                      onClick={() => playSfx('whoosh')}
                      className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-chakra"
                    >
                      Whoosh
                    </button>
                    <button
                      onClick={() => playSfx('super')}
                      className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-yellow-300 rounded font-chakra"
                    >
                      Super Chime
                    </button>
                    <button
                      onClick={() => playSfx('knockdown')}
                      className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-orange-300 rounded font-chakra"
                    >
                      Knockdown
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Move List & Commands */}
              <div className="md:col-span-7 space-y-4">
                {/* Special Move Card */}
                <div
                  className="p-4 rounded-lg bg-slate-900/60 border space-y-2 relative overflow-hidden"
                  style={{ borderColor: fighter.themeColor }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4" style={{ color: fighter.themeColor }} />
                      <span className="font-orbitron font-bold text-sm text-white">
                        {fighter.specialMove.name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-800 text-cyan-300 rounded border border-cyan-800">
                      {fighter.specialMove.command}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-rajdhani">
                    {fighter.specialMove.description}
                  </p>
                </div>

                {/* Super Move Card */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-950/30 via-slate-900/60 to-purple-950/30 border border-yellow-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      <span className="font-orbitron font-bold text-sm text-yellow-300">
                        {fighter.superMove.name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-yellow-900/40 text-yellow-300 rounded border border-yellow-700/60">
                      236236+AB (SUPER METRE 100%)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-rajdhani">
                    {fighter.superMove.description}
                  </p>
                </div>

                {/* 4 Normal Attacks Matrix */}
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="font-chakra text-xs font-bold text-slate-400 tracking-wider">
                    COMMAND NORMALS (4-BUTTON COMBAT SYSTEM)
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="flex justify-between items-center text-cyan-400 font-bold mb-1">
                        <span>[A] LIGHT ATTACK</span>
                        <span className="text-[10px] text-slate-500">Startup: 4f</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">Rapid jab / point poke. Chainable into combos.</p>
                    </div>

                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="flex justify-between items-center text-emerald-400 font-bold mb-1">
                        <span>[B] MEDIUM ATTACK</span>
                        <span className="text-[10px] text-slate-500">Startup: 7f</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">Mid-range body strike. Ideal spacing tool.</p>
                    </div>

                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="flex justify-between items-center text-orange-400 font-bold mb-1">
                        <span>[C] HEAVY ATTACK</span>
                        <span className="text-[10px] text-slate-500">Startup: 11f</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">Devastating launcher / sweep with hitstop impact.</p>
                    </div>

                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="flex justify-between items-center text-purple-400 font-bold mb-1">
                        <span>[D] SPECIAL DRIVE</span>
                        <span className="text-[10px] text-slate-500">Startup: 9f</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">Archetype mechanic: Parries, teleports, or armors.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Asset Specification Card Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-yellow-950/20 border border-yellow-700/40 rounded-lg">
                <div className="flex items-center space-x-2 text-xs text-yellow-300">
                  <Sparkles className="w-4 h-4" />
                  <span>Use this card to drop in custom spritesheet art when ready!</span>
                </div>
                <button
                  onClick={copySpec}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-yellow-500 hover:bg-yellow-400 text-black font-chakra font-bold text-xs rounded transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY SPEC CARD'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {assetSpecText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
