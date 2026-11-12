/**
 * OnetBoard — Responsive Portrait Grid Supporting 1x1, 1x2, 2x1, 2x2 Tiles,
 * Arrow Constraints, Static Blockers, Path Overlay & Burst FX.
 * Owned by @onet-eng.
 */

import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Lock } from 'lucide-react';
import type { GridCoord } from '@/types/game.types';
import type {
  OnetBoard as OnetBoardGrid,
  OnetBurstEvent,
  OnetDirection,
  OnetGamePhase,
  OnetHint,
  OnetPathEffectState,
  OnetPathLayerProps,
  TileBurstProps,
} from '@/types/onet.types';
import { groupSize, isBlockerCell, isMasterCell, isSlaveCell } from '../engine/pathfinding';

export interface OnetBoardProps {
  board: OnetBoardGrid;
  phase: OnetGamePhase;
  selected: GridCoord | null;
  hint: OnetHint | null;
  errorPair: [GridCoord, GridCoord] | null;
  activePath: OnetPathEffectState | null;
  bursts: OnetBurstEvent[];
  combo: number;
  highContrast?: boolean;
  onSelectTile: (coord: GridCoord) => void;
  /** Optional @game-feel OnetPathLayer implementation override */
  PathLayerComponent?: React.ComponentType<OnetPathLayerProps>;
  /** Optional @game-feel TileBurst implementation override */
  BurstComponent?: React.ComponentType<TileBurstProps>;
}

function coordsEqual(a: GridCoord | null | undefined, r: number, c: number): boolean {
  return Boolean(a && a.r === r && a.c === c);
}

function renderOpenSideIndicator(openSide: OnetDirection | null | undefined): React.ReactNode {
  if (!openSide) return null;

  const badgeBase =
    'absolute z-10 flex items-center justify-center rounded-full bg-[var(--club-ink)] text-white shadow-sm pointer-events-none';

  switch (openSide) {
    case 'up':
      return (
        <span className={`${badgeBase} -top-1 left-1/2 -translate-x-1/2 w-4 h-4`}>
          <ArrowUp className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      );
    case 'down':
      return (
        <span className={`${badgeBase} -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4`}>
          <ArrowDown className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      );
    case 'left':
      return (
        <span className={`${badgeBase} top-1/2 -left-1 -translate-y-1/2 w-4 h-4`}>
          <ArrowLeft className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      );
    case 'right':
      return (
        <span className={`${badgeBase} top-1/2 -right-1 -translate-y-1/2 w-4 h-4`}>
          <ArrowRight className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      );
    default:
      return null;
  }
}

const BuiltinPathLayer: React.FC<OnetPathLayerProps> = ({
  rows,
  cols,
  path,
  isSplit,
  accentColor,
}) => {
  if (!path || path.length < 2 || rows <= 0 || cols <= 0) return null;

  const pointsAttr = path
    .map((pt) => {
      const x = ((pt.c + 0.5) / cols) * 100;
      const y = ((pt.r + 0.5) / rows) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const stroke = accentColor || (isSplit ? '#f59e0b' : '#ff5b4d');

  return (
    <svg
      className="onet-path-layer"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={pointsAttr}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <polyline
        points={pointsAttr}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const BuiltinBurstLayer: React.FC<TileBurstProps> = ({ bursts, rows, cols, accentColor }) => {
  if (bursts.length === 0 || rows <= 0 || cols <= 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40" aria-hidden="true">
      {bursts.map((burst) => {
        const leftPct = ((burst.c + burst.colSpan / 2) / cols) * 100;
        const topPct = ((burst.r + burst.rowSpan / 2) / rows) * 100;
        return (
          <div
            key={burst.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full animate-ping opacity-75"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              backgroundColor: burst.accentHex || accentColor || '#ffb020',
            }}
          />
        );
      })}
    </div>
  );
};

export const OnetBoard: React.FC<OnetBoardProps> = ({
  board,
  phase,
  selected,
  hint,
  errorPair,
  activePath,
  bursts,
  combo,
  highContrast = false,
  onSelectTile,
  PathLayerComponent,
  BurstComponent,
}) => {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;

  if (rows === 0 || cols === 0) return null;

  const ActivePathOverlay = PathLayerComponent ?? BuiltinPathLayer;
  const ActiveBurstOverlay = BurstComponent ?? BuiltinBurstLayer;

  const isDisabled = phase !== 'playing';
  const gapPx = rows >= 10 ? 4 : 6;

  return (
    <div className="relative w-full h-full flex items-center justify-center px-2 py-1 select-none">
      <div
        className={`relative w-full max-h-full rounded-[20px] p-2.5 border-2 transition-colors ${
          phase === 'shuffling' ? 'onet-shuffling' : ''
        }`}
        style={{
          aspectRatio: `${cols} / ${rows}`,
          maxWidth: `min(100%, calc(66dvh * ${cols} / ${rows}))`,
          backgroundColor: 'var(--color-background-board)',
          borderColor: 'var(--club-border-ink)',
          boxShadow: 'var(--club-hard-shadow)',
        }}
      >
        {/* Combo Toast Overlay */}
        {combo >= 2 && activePath && (
          <div
            className="onet-combo top-2 left-1/2 -translate-x-1/2"
            role="status"
            aria-live="polite"
          >
            {combo}x KOMBO!
          </div>
        )}

        {/* Board Grid */}
        <div
          className="relative w-full h-full grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            gap: `${gapPx}px`,
          }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              if (!cell || isSlaveCell(cell)) {
                return null;
              }

              if (isBlockerCell(cell)) {
                return (
                  <div
                    key={cell.id}
                    style={{ gridRow: `${r + 1}`, gridColumn: `${c + 1}` }}
                    className="w-full h-full rounded-[var(--radius-tile)] border-2 flex items-center justify-center bg-slate-700/85 border-slate-900 text-slate-200 shadow-inner pointer-events-none"
                    aria-label="Batu penghalang"
                  >
                    <Lock className="w-4 h-4 opacity-80" />
                  </div>
                );
              }

              if (!isMasterCell(cell)) return null;

              const { rowSpan, colSpan } = groupSize(cell);
              const isSelected = coordsEqual(selected, r, c);
              const isHinted =
                coordsEqual(hint?.a, r, c) || coordsEqual(hint?.b, r, c);
              const isInvalid =
                Boolean(errorPair) &&
                (coordsEqual(errorPair?.[0], r, c) || coordsEqual(errorPair?.[1], r, c));

              return (
                <button
                  key={cell.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelectTile({ r, c })}
                  style={{
                    gridRow: `${r + 1} / span ${rowSpan}`,
                    gridColumn: `${c + 1} / span ${colSpan}`,
                    backgroundColor: highContrast
                      ? '#ffffff'
                      : 'var(--color-background-tile)',
                    borderColor: highContrast
                      ? '#000000'
                      : 'var(--color-tile-border)',
                    boxShadow: isSelected
                      ? undefined
                      : '0 2px 0 rgba(23, 35, 55, 0.2)',
                  }}
                  className={[
                    'onet-cell relative w-full h-full rounded-[var(--radius-tile)] border-2',
                    'flex items-center justify-center p-1 cursor-pointer',
                    'active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-1',
                    isSelected ? 'selected' : '',
                    isHinted ? 'hinted' : '',
                    isInvalid ? 'invalid animate-[shake_0.32s_ease-in-out]' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={`Ubin ${rowSpan}x${colSpan}`}
                  aria-pressed={isSelected}
                >
                  {renderOpenSideIndicator(cell.openSide)}

                  <img
                    src={cell.icon}
                    alt=""
                    draggable={false}
                    className={`pointer-events-none object-contain ${
                      rowSpan === 2 && colSpan === 2
                        ? 'w-[76%] h-[76%]'
                        : 'w-[82%] h-[82%]'
                    }`}
                  />

                  {rowSpan === 2 && colSpan === 2 && (
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-extrabold px-1 rounded bg-amber-400/90 text-slate-900 pointer-events-none">
                      2×2
                    </span>
                  )}
                </button>
              );
            }),
          )}
        </div>

        {/* Connecting Path SVG Overlay */}
        <ActivePathOverlay
          rows={rows}
          cols={cols}
          path={activePath?.points ?? null}
          turns={activePath?.turns}
          isSplit={activePath?.isSplit}
          accentColor={activePath?.accentHex}
        />

        {/* Tile Burst FX Overlay */}
        <ActiveBurstOverlay
          bursts={bursts}
          rows={rows}
          cols={cols}
          accentColor={activePath?.accentHex}
        />
      </div>
    </div>
  );
};
