import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { computeMatch3DropDurationMs, MATCH3_TIMINGS } from '@/config/audioFeel.config';
import type {
  Match3TileProps,
  ObstacleType,
  SpecialTileType,
} from '@/types/match3.types';

const TILE_PALETTE = [
  { bg: 'rgba(244, 63, 94, 0.16)', border: '#fb7185', label: 'Rose', symbol: '●' },
  { bg: 'rgba(245, 158, 11, 0.16)', border: '#fbbf24', label: 'Amber', symbol: '▲' },
  { bg: 'rgba(16, 185, 129, 0.16)', border: '#34d399', label: 'Emerald', symbol: '■' },
  { bg: 'rgba(56, 189, 248, 0.16)', border: '#38bdf8', label: 'Sky', symbol: '◆' },
  { bg: 'rgba(168, 85, 247, 0.16)', border: '#c084fc', label: 'Violet', symbol: '★' },
  { bg: 'rgba(249, 115, 22, 0.16)', border: '#fb923c', label: 'Tangerine', symbol: '✚' },
] as const;

function SpecialOverlay({ special }: { special: SpecialTileType }) {
  if (special === 'none') return null;

  if (special === 'striped_h') {
    return (
      <span
        className="pointer-events-none absolute inset-0 flex flex-col justify-between p-1"
        aria-hidden="true"
      >
        <span className="h-1 w-full rounded-full bg-white/85 shadow-[0_0_8px_#38bdf8]" />
        <span className="h-1 w-full rounded-full bg-sky-200/80 shadow-[0_0_8px_#38bdf8]" />
      </span>
    );
  }

  if (special === 'striped_v') {
    return (
      <span
        className="pointer-events-none absolute inset-0 flex justify-between p-1"
        aria-hidden="true"
      >
        <span className="h-full w-1 rounded-full bg-white/85 shadow-[0_0_8px_#38bdf8]" />
        <span className="h-full w-1 rounded-full bg-sky-200/80 shadow-[0_0_8px_#38bdf8]" />
      </span>
    );
  }

  if (special === 'bomb_3x3') {
    return (
      <span
        className="pointer-events-none absolute inset-0 rounded-xl border-2 border-amber-300/90 shadow-[inset_0_0_12px_rgba(245,158,11,0.55)]"
        aria-hidden="true"
      >
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-slate-950 shadow">
          3×3
        </span>
      </span>
    );
  }

  // rainbow
  return (
    <span
      className="pointer-events-none absolute inset-0.5 rounded-xl border-2 border-white/90 shadow-[0_0_14px_rgba(244,114,182,0.7)]"
      style={{
        background:
          'conic-gradient(from 0deg, rgba(244,63,94,0.34), rgba(245,158,11,0.34), rgba(16,185,129,0.34), rgba(56,189,248,0.34), rgba(168,85,247,0.34), rgba(244,63,94,0.34))',
      }}
      aria-hidden="true"
    >
      <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/95 text-[9px] font-black text-fuchsia-600 shadow">
        ✦
      </span>
    </span>
  );
}

function ObstacleOverlay({ obstacle }: { obstacle: ObstacleType }) {
  if (!obstacle) return null;

  switch (obstacle) {
    case 'ice':
      return (
        <span
          className="pointer-events-none absolute inset-0 rounded-xl border-2 border-sky-200/90 bg-sky-300/35 backdrop-blur-[1px]"
          style={{
            boxShadow: 'inset 0 0 10px rgba(224, 242, 254, 0.85)',
          }}
          aria-hidden="true"
        >
          <span className="absolute left-1 top-1 h-2 w-2 rotate-45 bg-white/75" />
        </span>
      );
    case 'wood':
      return (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-amber-900 bg-amber-700/95 shadow-inner"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(120,53,15,0.38) 0 4px, transparent 4px 9px)',
          }}
          aria-hidden="true"
        >
          <span className="h-0.5 w-3/4 rotate-45 rounded bg-amber-950/60" />
          <span className="absolute h-0.5 w-3/4 -rotate-45 rounded bg-amber-950/60" />
        </span>
      );
    case 'metal-2':
      return (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-500 to-slate-700 shadow-inner"
          aria-hidden="true"
        >
          <span className="rounded bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-black text-slate-100">
            2
          </span>
        </span>
      );
    case 'metal-1':
      return (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300/90 bg-gradient-to-br from-slate-500/90 to-slate-700/90 shadow-inner"
          aria-hidden="true"
        >
          <span className="rounded bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
            1
          </span>
        </span>
      );
    case 'stone':
      return (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-slate-800 bg-gradient-to-b from-slate-600 to-slate-800 shadow-inner"
          aria-hidden="true"
        >
          <span className="h-3 w-3 rotate-45 rounded-sm border border-slate-400/50 bg-slate-500/70" />
        </span>
      );
    case 'gem':
      return (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-fuchsia-300/90 bg-gradient-to-br from-fuchsia-500/35 to-cyan-400/35 shadow-[inset_0_0_12px_rgba(232,121,249,0.65)]"
          aria-hidden="true"
        >
          <span className="h-4 w-4 rotate-45 rounded-sm border border-white/90 bg-gradient-to-tr from-fuchsia-400 to-cyan-300 shadow" />
        </span>
      );
    default:
      return null;
  }
}

/**
 * Animated Match 3 tile component implementing swap spring, invalid-swap shake,
 * match pop, cascade gravity drop acceleration, special FX overlays, and obstacles.
 */
export function Match3Tile({
  cell,
  tileAssetUrl,
  surfaceUrl,
  colorIndex,
  isSelected,
  isHinted,
  isInvalidSwap,
  isMatched,
  isBlasted,
  swapOffset,
  boosterTargetMode,
  reducedMotion = false,
  highContrast = false,
  onPointerDown,
  onPointerEnter,
  onClick,
  testId,
}: Match3TileProps) {
  const prefersReduced = useReducedMotion();
  const reduced = Boolean(reducedMotion || prefersReduced);

  if (cell.isHole) {
    return (
      <div
        className="pointer-events-none aspect-square w-full"
        aria-hidden="true"
        data-testid={testId}
      />
    );
  }

  const tile = cell.tile;
  const paletteIdx =
    ((colorIndex >= 0 ? colorIndex : tile?.colorIndex ?? 0) % TILE_PALETTE.length +
      TILE_PALETTE.length) %
    TILE_PALETTE.length;
  const palette = TILE_PALETTE[paletteIdx];
  const isBlocked = cell.obstacle === 'wood' || cell.obstacle === 'stone' || cell.obstacle === 'metal-2' || cell.obstacle === 'metal-1';

  const surfaceStyle: CSSProperties = {
    backgroundColor: tile ? palette.bg : 'rgba(15, 23, 42, 0.25)',
    borderColor: highContrast ? palette.border : 'rgba(23, 35, 55, 0.28)',
    ...(surfaceUrl
      ? {
          backgroundImage: `url(${surfaceUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {}),
  };

  const dropRows = tile?.dropRows ?? 0;
  const dropDurationSec = computeMatch3DropDurationMs(dropRows) / 1000;
  const columnDelaySec = (cell.c * MATCH3_TIMINGS.columnStaggerMs) / 1000;

  const initialMotion =
    !reduced && tile && dropRows > 0
      ? {
          y: `${-dropRows * 100}%`,
          scaleY: 1.05,
          scaleX: 0.96,
          opacity: tile.isNewSpawn ? 0.4 : 1,
        }
      : false;

  const animateMotion = (() => {
    if (reduced) {
      return {
        x: 0,
        y: 0,
        scale: isSelected ? 1.04 : isMatched || isBlasted ? 0.85 : 1,
        opacity: isMatched || isBlasted ? 0.2 : 1,
      };
    }

    if (isMatched || isBlasted) {
      return {
        x: 0,
        y: 0,
        scale: [1, 1.18, 0.15],
        rotate: [0, 0, 8],
        opacity: [1, 1, 0],
      };
    }

    if (isInvalidSwap) {
      return {
        x: [0, -7, 7, -5, 5, 0],
        y: 0,
        scale: 1,
        opacity: 1,
      };
    }

    if (swapOffset && (swapOffset.dx !== 0 || swapOffset.dy !== 0)) {
      return {
        x: `${swapOffset.dx}%`,
        y: `${swapOffset.dy}%`,
        scale: isSelected ? 1.06 : 1,
        opacity: 1,
      };
    }

    return {
      x: 0,
      y: 0,
      scale: isSelected ? 1.08 : 1,
      scaleX: 1,
      scaleY: 1,
      rotate: 0,
      opacity: 1,
    };
  })();

  const transitionMotion = (() => {
    if (reduced) {
      return { duration: 0.08 };
    }
    if (isMatched || isBlasted) {
      return {
        duration: MATCH3_TIMINGS.matchPopMs / 1000,
        ease: MATCH3_TIMINGS.popEase,
      };
    }
    if (isInvalidSwap) {
      return {
        duration: MATCH3_TIMINGS.invalidSwapMs / 1000,
        ease: 'easeInOut' as const,
      };
    }
    if (swapOffset && (swapOffset.dx !== 0 || swapOffset.dy !== 0)) {
      return MATCH3_TIMINGS.swapSpring;
    }
    if (tile && dropRows > 0) {
      return {
        duration: dropDurationSec,
        delay: columnDelaySec,
        ease: MATCH3_TIMINGS.dropEase,
      };
    }
    if (isSelected) {
      return MATCH3_TIMINGS.selectSpring;
    }
    return MATCH3_TIMINGS.swapSpring;
  })();

  const ariaParts = [
    `Row ${cell.r + 1} Column ${cell.c + 1}`,
    tile ? palette.label : 'Empty',
    tile && tile.special !== 'none' ? tile.special : '',
    cell.obstacle ? `Obstacle ${cell.obstacle}` : '',
  ].filter(Boolean);

  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={ariaParts.join(', ')}
      aria-pressed={isSelected}
      disabled={isBlocked && !boosterTargetMode}
      onPointerDown={(e) => onPointerDown(cell.r, cell.c, e)}
      onPointerEnter={onPointerEnter ? () => onPointerEnter(cell.r, cell.c) : undefined}
      onClick={onClick ? () => onClick(cell.r, cell.c) : undefined}
      style={surfaceStyle}
      className={[
        'm3-tile relative aspect-square w-full h-full select-none touch-none overflow-visible rounded-xl border-2 p-1 transition-shadow focus-visible:outline-2 focus-visible:outline-amber-400',
        isSelected ? 'selected' : '',
        isHinted ? 'hinted' : '',
        boosterTargetMode ? 'cursor-crosshair ring-2 ring-amber-400/75' : 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {tile ? (
        <motion.div
          key={tile.uid}
          initial={initialMotion}
          animate={animateMotion}
          transition={transitionMotion}
          className={[
            'relative flex h-full w-full items-center justify-center rounded-lg',
            tile.special !== 'none' && !reduced ? 'm3-special-spawn' : '',
            isBlasted && !reduced ? 'brightness-125' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {tileAssetUrl ? (
            <img
              src={tileAssetUrl}
              alt=""
              draggable={false}
              decoding="async"
              className="pointer-events-none h-full w-full object-contain drop-shadow-sm"
            />
          ) : (
            <span
              className="flex h-3/4 w-3/4 items-center justify-center rounded-lg border-2 text-sm font-black text-white shadow-inner"
              style={{
                backgroundColor: palette.border,
                borderColor: '#ffffffaa',
              }}
            >
              {palette.symbol}
            </span>
          )}

          <SpecialOverlay special={tile.special} />

          {highContrast ? (
            <span
              className="pointer-events-none absolute bottom-0.5 left-0.5 flex h-4 w-4 items-center justify-center rounded bg-slate-950/85 text-[10px] font-black text-white"
              aria-hidden="true"
            >
              {palette.symbol}
            </span>
          ) : null}
        </motion.div>
      ) : null}

      <ObstacleOverlay obstacle={cell.obstacle} />
    </button>
  );
}

export default Match3Tile;
