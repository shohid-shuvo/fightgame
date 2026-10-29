/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Roster Specification & Character Data
 */

export interface CharacterRosterEntry {
  id: string;
  name: string;
  title: string;
  archetype: string;
  themeColor: string;
  accentColor: string;
  glowColor: string;
  visuals: string;
  energyTheme: string;
  specialMove: {
    command: string;
    name: string;
    description: string;
  };
  superMove: {
    name: string;
    description: string;
  };
  stats: {
    speed: number;   // 1 to 5
    power: number;   // 1 to 5
    reach: number;   // 1 to 5
    defense: number; // 1 to 5
    tech: number;    // 1 to 5
  };
  quote: string;
}

export const ROSTER: Record<string, CharacterRosterEntry> = {
  blitz: {
    id: 'blitz',
    name: 'BLITZ',
    title: 'The Lightning Striker',
    archetype: 'Rushdown / Speedster',
    themeColor: '#00F0FF',
    accentColor: '#05D2E0',
    glowColor: 'rgba(0, 240, 255, 0.4)',
    visuals: 'Cyber-athletic kickboxer, glowing neon-teal undercut hair, aerodynamic combat jacket, taped kinetic fists.',
    energyTheme: 'High-voltage teal lightning trails & speed-lines.',
    specialMove: {
      command: '236A (↓ ↘ → + Light)',
      name: 'Volt Rush',
      description: 'Blinding forward blitz of 3 lightning-fast kicks with frame-trap potential.',
    },
    superMove: {
      name: 'Thunderstorm Barrage',
      description: 'Multi-hit hyper rush ending in an airborne corkscrew lightning axe kick.',
    },
    stats: { speed: 5, power: 3, reach: 3, defense: 2, tech: 4 },
    quote: 'Too slow. You were beaten three frames ago.',
  },
  titan: {
    id: 'titan',
    name: 'TITAN',
    title: 'The Earth Colossus',
    archetype: 'Grappler / Heavy Juggernaut',
    themeColor: '#FF6B00',
    accentColor: '#E65100',
    glowColor: 'rgba(255, 107, 0, 0.4)',
    visuals: 'Massive cybernetically reinforced brawler, glowing magma veins, heavy iron gauntlets, scarred combat vest.',
    energyTheme: 'Gold-orange seismic shock rings, tectonic earth cracks.',
    specialMove: {
      command: '623C (→ ↓ ↘ + Heavy)',
      name: 'Seismic Breaker',
      description: 'Leaps high and hammers the earth, launching the opponent skyward.',
    },
    superMove: {
      name: 'Cataclysm Slam',
      description: 'Armored command grab that drives the opponent through the pavement with explosive force.',
    },
    stats: { speed: 2, power: 5, reach: 4, defense: 5, tech: 2 },
    quote: 'Stand still and break like glass.',
  },
  nova: {
    id: 'nova',
    name: 'NOVA',
    title: 'The Pulse Warden',
    archetype: 'Zoner / Space Controller',
    themeColor: '#00D4FF',
    accentColor: '#0284C7',
    glowColor: 'rgba(0, 212, 255, 0.4)',
    visuals: 'Futuristic tactical psychic, long glowing ponytail, high-tech trench coat, floating kinetic plasma orbs around her wrists.',
    energyTheme: 'Electric-cyan plasma spheres, laser grids, and gravity beams.',
    specialMove: {
      command: '236A (↓ ↘ → + Light)',
      name: 'Plasma Orb',
      description: 'Lingering charged energy sphere that controls space and limits opponent jumps.',
    },
    superMove: {
      name: 'Supernova Cascade',
      description: 'Fullscreen cascading electric pulse wave that denies approach and locks down neutral.',
    },
    stats: { speed: 3, power: 4, reach: 5, defense: 2, tech: 5 },
    quote: 'The trajectory was calculated before you even stood up.',
  },
  ronin: {
    id: 'ronin',
    name: 'RONIN',
    title: 'The Gale Brawler',
    archetype: 'Balanced All-Rounder (Shoto)',
    themeColor: '#10B981',
    accentColor: '#059669',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    visuals: 'Modern wandering martial master, modified dark combat gi with rolled sleeves, armored forearms, disciplined stance.',
    energyTheme: 'Emerald-green razor wind vortex.',
    specialMove: {
      command: '623C (→ ↓ ↘ + Heavy)',
      name: 'Dragon Gale',
      description: 'Devastating anti-air spiraling whirlwind uppercut with invulnerable startup.',
    },
    superMove: {
      name: 'Tempest Blade',
      description: '5-hit relentless martial combination culminating in an explosive wind slash.',
    },
    stats: { speed: 4, power: 4, reach: 4, defense: 3, tech: 4 },
    quote: 'A calm breath before the blade strikes.',
  },
  nyx: {
    id: 'nyx',
    name: 'NYX',
    title: 'The Void Lotus',
    archetype: 'Counter / Parry Specialist',
    themeColor: '#A855F7',
    accentColor: '#9333EA',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    visuals: 'Lethal stealth fighter, silver-white high bun, deep-purple tactical armor with silk sash, glowing amethyst bracers.',
    energyTheme: 'Violet dimensional shimmer, glass-shatter mirrors, and after-images.',
    specialMove: {
      command: '214B (↓ ↙ ← + Medium)',
      name: 'Void Mirror',
      description: 'Precise parry stance that absorbs an attack, freezing time and teleporting behind the enemy.',
    },
    superMove: {
      name: 'Eclipse Shatter',
      description: 'Time-stop counter that unleashes multi-angle illusion strikes.',
    },
    stats: { speed: 4, power: 3, reach: 3, defense: 3, tech: 5 },
    quote: 'Your attack belongs to me now.',
  },
  spectre: {
    id: 'spectre',
    name: 'SPECTRE',
    title: 'The Phantom Assassin',
    archetype: 'Deceptive Trickster / Shadow Mixup',
    themeColor: '#F59E0B',
    accentColor: '#D97706',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    visuals: 'Masked phantom operative (gold-and-carbon half-face visor), dark hooded cloak, twin concealed high-frequency vibro-blades.',
    energyTheme: 'Amber-yellow smoke, electric sparks, and shadow clones.',
    specialMove: {
      command: '214A (↓ ↙ ← + Light)',
      name: 'Shadow Step',
      description: 'Instant teleport smoke dash that appears in front, behind, or above.',
    },
    superMove: {
      name: 'Phantom Execution',
      description: 'Dense smokescreen explosion followed by blinding multi-directional blade cross-slashes.',
    },
    stats: { speed: 5, power: 3, reach: 2, defense: 2, tech: 5 },
    quote: 'You are fighting a reflection of smoke.',
  },
};

export const ROSTER_LIST = Object.values(ROSTER);
