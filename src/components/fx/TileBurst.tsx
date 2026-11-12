import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ONET_TIMINGS } from '@/config/audioFeel.config';
import { useTheme } from '@/services/theme/ThemeContext';
import type { OnetBurstEvent, TileBurstProps } from '@/types/onet.types';
import { GameParticles } from '@/components/fx/GameParticles';

const SHARD_QUADRANTS = [
  { clip: 'inset(0 50% 50% 0)', dx: -22, dy: -20, rotate: -18 },
  { clip: 'inset(0 0 50% 50%)', dx: 22, dy: -18, rotate: 16 },
  { clip: 'inset(50% 50% 0 0)', dx: -20, dy: 22, rotate: -14 },
  { clip: 'inset(50% 0 0 50%)', dx: 24, dy: 20, rotate: 20 },
] as const;

const PARTICLE_COUNT = 8;

function hashBurstSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function BurstItem({
  burst,
  rows,
  cols,
  fallbackColor,
  hasCosmeticParticles,
}: {
  burst: OnetBurstEvent;
  rows: number;
  cols: number;
  fallbackColor: string;
  hasCosmeticParticles: boolean;
}) {
  const color = burst.accentHex || fallbackColor;
  const seed = hashBurstSeed(burst.id);
  const centerX = ((burst.c + burst.colSpan / 2) / cols) * 100;
  const centerY = ((burst.r + burst.rowSpan / 2) / rows) * 100;
  const durationSec = ONET_TIMINGS.burstDurationMs / 1000;
  const delaySec = ONET_TIMINGS.burstDelayMs / 1000;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-visible"
      aria-hidden="true"
    >
      {/* Shattered 4-quadrant tile shards on full clears (never on split transitions) */}
      {!burst.isSplit && burst.icon ? (
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${(burst.c / cols) * 100}%`,
            top: `${(burst.r / rows) * 100}%`,
            width: `${(burst.colSpan / cols) * 100}%`,
            height: `${(burst.rowSpan / rows) * 100}%`,
            zIndex: 11,
          }}
        >
          {SHARD_QUADRANTS.map((quad, idx) => (
            <motion.div
              key={`${burst.id}-shard-${idx}`}
              className="image-shard inset-0 p-1"
              style={{ clipPath: quad.clip }}
              initial={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 0.95 }}
              animate={{
                x: quad.dx,
                y: quad.dy,
                rotate: quad.rotate,
                scale: 0.55,
                opacity: 0,
              }}
              transition={{
                duration: durationSec * 0.95,
                delay: delaySec * 0.35,
                ease: ONET_TIMINGS.lineEase,
              }}
            >
              <img src={burst.icon} alt="" decoding="async" />
            </motion.div>
          ))}
        </div>
      ) : null}

      {/* Centered shockwave ring + geometric particles / equipped cosmetic burst */}
      <div
        className="tile-burst"
        style={{
          left: `${centerX}%`,
          top: `${centerY}%`,
        }}
      >
        <motion.span
          className="burst-ring"
          style={{ borderColor: color }}
          initial={{ scale: 0.2, opacity: 0.95 }}
          animate={{
            scale: burst.rowSpan === 2 || burst.colSpan === 2 ? 2.0 : 1.45,
            opacity: 0,
          }}
          transition={{
            duration: durationSec,
            ease: ONET_TIMINGS.lineEase,
          }}
        />

        {hasCosmeticParticles ? <GameParticles count={8} radiusPx={38} /> : null}

        {Array.from({ length: PARTICLE_COUNT }, (_, i) => {
          const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + ((seed % 7) * 0.08);
          const dist = 26 + ((seed + i * 11) % 20);
          const tx = Math.cos(angle) * dist;
          const ty = Math.sin(angle) * dist;
          const shapeClass = `burst-shape-${(seed + i) % 4}`;
          const style: CSSProperties = {
            backgroundColor: color,
          };

          return (
            <motion.span
              key={`${burst.id}-p-${i}`}
              className={`burst-particle ${shapeClass}`}
              style={style}
              initial={{ x: 0, y: 0, scale: 1, opacity: 0.95, rotate: 0 }}
              animate={{
                x: tx,
                y: ty,
                scale: 0.35,
                opacity: 0,
                rotate: (seed + i) % 2 === 0 ? 110 : -110,
              }}
              transition={{
                duration: durationSec,
                delay: i * 0.012,
                ease: ONET_TIMINGS.lineEase,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Overlay rendering tile shatter quadrants, shockwave rings, and cosmetic bursts
 * over an Onet board container.
 */
export function TileBurst({ bursts, rows, cols, accentColor }: TileBurstProps) {
  const prefersReduced = useReducedMotion();
  const { activeEffect, isReducedMotion } = useTheme();

  if (prefersReduced || isReducedMotion || bursts.length === 0 || rows <= 0 || cols <= 0) {
    return null;
  }

  const fallbackColor = accentColor ?? activeEffect.accentHex ?? '#f59e0b';
  const hasCosmeticParticles = Boolean(
    activeEffect && activeEffect.id !== 'none' && activeEffect.particleUrl,
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{ zIndex: 25 }}
      aria-hidden="true"
    >
      {bursts.map((burst) => (
        <BurstItem
          key={burst.id}
          burst={burst}
          rows={rows}
          cols={cols}
          fallbackColor={fallbackColor}
          hasCosmeticParticles={hasCosmeticParticles}
        />
      ))}
    </div>
  );
}

export default TileBurst;
