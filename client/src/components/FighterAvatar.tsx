/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Procedural Vector Silhouette Avatars
 */

import { ROSTER } from '../../../shared/characters/roster.js';

interface Props {
  fighterId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
}

export const FighterAvatar: React.FC<Props> = ({ fighterId, size = 'md', showBadge = false }) => {
  const char = ROSTER[fighterId] || ROSTER.blitz;

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  }[size];

  return (
    <div className={`relative ${sizeClasses} flex-shrink-0 group`}>
      <div
        className="w-full h-full rounded-lg border-2 p-1.5 flex items-center justify-center overflow-hidden transition-all duration-300"
        style={{
          borderColor: char.themeColor,
          backgroundColor: '#070b14',
          boxShadow: `0 0 16px ${char.glowColor}`,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full transform group-hover:scale-105 transition-transform"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cyber hexagonal / angled backdrop */}
          <polygon
            points="50,6 92,28 92,72 50,94 8,72 8,28"
            fill={`${char.themeColor}15`}
            stroke={char.themeColor}
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />

          {char.id === 'blitz' && (
            <g stroke={char.themeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              {/* Lightning Speedster Head & Hair */}
              <path d="M40 32 L58 32 L66 48 L58 66 L42 66 L34 48 Z" fill="#0f172a" />
              <path d="M42 22 L62 14 L52 30 L72 26 L46 42" stroke="#FFFFFF" strokeWidth="2.5" />
              {/* Kinetic lightning streak */}
              <polyline points="30,76 46,56 42,50 64,36" stroke={char.themeColor} strokeWidth="2" />
              <circle cx="58" cy="46" r="3" fill="#00F0FF" />
            </g>
          )}

          {char.id === 'titan' && (
            <g stroke={char.themeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              {/* Heavy Juggernaut Helmet / Gauntlet */}
              <rect x="30" y="28" width="40" height="44" rx="6" fill="#18110b" />
              <line x1="30" y1="48" x2="70" y2="48" stroke="#FFFFFF" strokeWidth="3" />
              <line x1="50" y1="28" x2="50" y2="72" stroke="#FF6B00" strokeWidth="2" />
              {/* Magma Horns */}
              <polygon points="34,28 26,14 42,24" fill="#FF6B00" />
              <polygon points="66,28 74,14 58,24" fill="#FF6B00" />
            </g>
          )}

          {char.id === 'nova' && (
            <g stroke={char.themeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Zoner / Psychic Ponytail & Plasma Orbs */}
              <circle cx="50" cy="46" r="16" fill="#0c1a2e" stroke={char.themeColor} />
              <path d="M50 30 Q68 12 78 28" stroke="#FFFFFF" strokeWidth="3" />
              {/* Orbiting orbs */}
              <circle cx="28" cy="42" r="4.5" fill="#00D4FF" />
              <circle cx="72" cy="54" r="4.5" fill="#00D4FF" />
              <circle cx="50" cy="74" r="3" fill="#FFFFFF" />
            </g>
          )}

          {char.id === 'ronin' && (
            <g stroke={char.themeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Gale Martial Artist Headband & Blade Hilt */}
              <circle cx="50" cy="48" r="18" fill="#0d1f18" stroke={char.themeColor} />
              <line x1="28" y1="42" x2="72" y2="42" stroke="#FFFFFF" strokeWidth="3.5" />
              <path d="M72 42 L84 54 M72 42 L80 62" stroke="#10B981" strokeWidth="2.5" />
              <line x1="32" y1="78" x2="68" y2="22" stroke="#10B981" strokeWidth="2" strokeDasharray="3 3" />
            </g>
          )}

          {char.id === 'nyx' && (
            <g stroke={char.themeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Void Lotus Mask & Amethyst Eye */}
              <polygon points="50,22 72,44 50,78 28,44" fill="#180e26" stroke={char.themeColor} />
              <circle cx="50" cy="46" r="6" fill="#A855F7" />
              <line x1="50" y1="22" x2="50" y2="78" stroke="#E9D5FF" strokeWidth="1.5" />
              <circle cx="50" cy="18" r="4" fill="#E9D5FF" />
            </g>
          )}

          {char.id === 'spectre' && (
            <g stroke={char.themeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Phantom Assassin Hood & Dual Vibro-Blades */}
              <path d="M26 66 L50 20 L74 66 Z" fill="#1f1807" stroke={char.themeColor} />
              {/* Visor slit */}
              <line x1="38" y1="46" x2="62" y2="46" stroke="#F59E0B" strokeWidth="4" />
              <line x1="42" y1="46" x2="58" y2="46" stroke="#FFFFFF" strokeWidth="2" />
              {/* Concealed blades */}
              <line x1="22" y1="74" x2="36" y2="52" stroke="#F59E0B" strokeWidth="2" />
              <line x1="78" y1="74" x2="64" y2="52" stroke="#F59E0B" strokeWidth="2" />
            </g>
          )}
        </svg>
      </div>

      {showBadge && (
        <span
          className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wider text-black font-mono shadow"
          style={{ backgroundColor: char.themeColor }}
        >
          {char.id.slice(0, 3)}
        </span>
      )}
    </div>
  );
};
