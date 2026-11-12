/**
 * Match3Board — Touch-First 7x7 / 8x8 / 9x9 Interactive Grid for Match 3.
 * Supports tap-to-swap, 22px directional pointer swipe, rainbow zap SVG overlay,
 * floating cascade banners, and @game-feel's Match3Tile component.
 * Owned by @match3-eng.
 */

import React, { useCallback, useRef } from 'react';
import { MATCH3_COLOR_TOKENS } from '@/config/match3.config';
import type { GridCoord, Match3BoosterId } from '@/types/game.types';
import type {
  Match3Board as Match3BoardMatrix,
  Match3VisualFxState,
  ValidSwapMove,
} from '@/types/match3.types';
import { Match3Tile } from './Match3Tile';

export interface Match3BoardProps {
  board: Match3BoardMatrix;
  tileAssets: string[];
  surfaceUrl: string | null;
  selectedCoord: GridCoord | null;
  hintMove: ValidSwapMove | null;
  activeBooster: Extract<Match3BoosterId, 'hammer' | 'bomb'> | null;
  visualFx: Match3VisualFxState;
  isDarkMode: boolean;
  isReducedMotion: boolean;
  highContrastTiles: boolean;
  isShuffling: boolean;
  onSelectOrSwap: (r: number, c: number) => void;
  onSwipeSwap: (from: GridCoord, dr: number, dc: number) => void;
}

const SWIPE_THRESHOLD_PX = 22;

function hasCoord(list: GridCoord[], r: number, c: number): boolean {
  for (let i = 0; i < list.length; i++) {
    if (list[i].r === r && list[i].c === c) return true;
  }
  return false;
}

export const Match3Board: React.FC<Match3BoardProps> = ({
  board,
  tileAssets,
  surfaceUrl,
  selectedCoord,
  hintMove,
  activeBooster,
  visualFx,
  isDarkMode,
  isReducedMotion,
  highContrastTiles,
  isShuffling,
  onSelectOrSwap,
  onSwipeSwap,
}) => {
  const rows = board.length;
  const cols = board[0]?.length ?? 8;

  const gestureRef = useRef<{
    pointerId: number;
    r: number;
    c: number;
    startX: number;
    startY: number;
    swiped: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef<boolean>(false);

  const handleTilePointerDown = useCallback(
    (r: number, c: number, e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      gestureRef.current = {
        pointerId: e.pointerId,
        r,
        c,
        startX: e.clientX,
        startY: e.clientY,
        swiped: false,
      };
      suppressNextClickRef.current = false;
    },
    [],
  );

  const handleBoardPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gestureRef.current;
      if (!g || g.swiped || g.pointerId !== e.pointerId) return;

      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (Math.hypot(dx, dy) < SWIPE_THRESHOLD_PX) return;

      g.swiped = true;
      suppressNextClickRef.current = true;
      const origin = { r: g.r, c: g.c };
      gestureRef.current = null;

      if (Math.abs(dx) >= Math.abs(dy)) {
        onSwipeSwap(origin, 0, dx > 0 ? 1 : -1);
      } else {
        onSwipeSwap(origin, dy > 0 ? 1 : -1, 0);
      }
    },
    [onSwipeSwap],
  );

  const handleBoardPointerUpOrCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gestureRef.current;
      if (!g || g.pointerId !== e.pointerId) return;
      const shouldTap = !g.swiped && e.type === 'pointerup';
      const targetR = g.r;
      const targetC = g.c;
      gestureRef.current = null;

      if (shouldTap) {
        suppressNextClickRef.current = true;
        onSelectOrSwap(targetR, targetC);
      }
    },
    [onSelectOrSwap],
  );

  const handleTileClick = useCallback(
    (r: number, c: number) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        return;
      }
      onSelectOrSwap(r, c);
    },
    [onSelectOrSwap],
  );

  const computeSwapOffset = (r: number, c: number): { dx: number; dy: number } | null => {
    const pair = visualFx.swappingPair ?? visualFx.revertingPair;
    if (!pair) return null;
    if (pair.from.r === r && pair.from.c === c) {
      return {
        dx: (pair.to.c - pair.from.c) * 100,
        dy: (pair.to.r - pair.from.r) * 100,
      };
    }
    if (pair.to.r === r && pair.to.c === c) {
      return {
        dx: (pair.from.c - pair.to.c) * 100,
        dy: (pair.from.r - pair.to.r) * 100,
      };
    }
    return null;
  };

  return (
    <div
      data-testid="match3-board-shell"
      className="relative flex w-full items-center justify-center select-none"
      style={{ touchAction: 'none' }}
      onPointerMove={handleBoardPointerMove}
      onPointerUp={handleBoardPointerUpOrCancel}
      onPointerCancel={handleBoardPointerUpOrCancel}
    >
      <div
        className={`relative aspect-square w-full max-w-[min(94vw,430px)] rounded-3xl border-[3px] p-2 transition-transform duration-200 ${
          isDarkMode
            ? 'border-slate-700 bg-slate-900/90 shadow-[0_8px_0_0_rgba(15,23,42,0.9)]'
            : 'border-amber-200 bg-white/95 shadow-[0_8px_0_0_rgba(217,119,6,0.22)]'
        } ${isShuffling ? 'scale-[0.97] opacity-90' : 'scale-100'}`}
        style={
          surfaceUrl
            ? {
                backgroundImage: `linear-gradient(${
                  isDarkMode ? 'rgba(15,23,42,0.82)' : 'rgba(255,251,235,0.84)'
                }, ${
                  isDarkMode ? 'rgba(15,23,42,0.82)' : 'rgba(255,251,235,0.84)'
                }), url(${surfaceUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div
          className="grid h-full w-full gap-1"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isSelected = selectedCoord?.r === r && selectedCoord?.c === c;
              const isHinted =
                hintMove !== null &&
                ((hintMove.from.r === r && hintMove.from.c === c) ||
                  (hintMove.to.r === r && hintMove.to.c === c));

              const isInvalidSwap =
                visualFx.revertingPair !== null &&
                ((visualFx.revertingPair.from.r === r && visualFx.revertingPair.from.c === c) ||
                  (visualFx.revertingPair.to.r === r && visualFx.revertingPair.to.c === c));

              const isMatched = hasCoord(visualFx.matchedCoords, r, c);
              const isBlasted = hasCoord(visualFx.blastedCoords, r, c);
              const swapOffset = computeSwapOffset(r, c);

              const colorIdx = cell.tile?.colorIndex ?? -1;
              const tileAssetUrl =
                colorIdx >= 0 && tileAssets[colorIdx]
                  ? tileAssets[colorIdx]
                  : colorIdx >= 0
                    ? tileAssets[colorIdx % Math.max(1, tileAssets.length)] ?? null
                    : null;

              // Visual background color token used on high-contrast/fallback tile rendering
              const semanticSurfaceTint =
                colorIdx >= 0 ? MATCH3_COLOR_TOKENS[colorIdx % MATCH3_COLOR_TOKENS.length]?.tintBg : null;

              return (
                <div
                  key={`${r}-${c}`}
                  className="relative h-full w-full"
                  style={
                    highContrastTiles && semanticSurfaceTint && !cell.isHole && cell.tile
                      ? { backgroundColor: semanticSurfaceTint, borderRadius: '0.65rem' }
                      : undefined
                  }
                >
                  <Match3Tile
                    cell={cell}
                    tileAssetUrl={tileAssetUrl}
                    surfaceUrl={surfaceUrl}
                    colorIndex={colorIdx}
                    isSelected={isSelected}
                    isHinted={isHinted}
                    isInvalidSwap={isInvalidSwap}
                    isMatched={isMatched}
                    isBlasted={isBlasted}
                    swapOffset={swapOffset}
                    boosterTargetMode={activeBooster}
                    reducedMotion={isReducedMotion}
                    highContrast={highContrastTiles}
                    onPointerDown={handleTilePointerDown}
                    onClick={handleTileClick}
                    testId={`match3-cell-${r}-${c}`}
                  />
                </div>
              );
            }),
          )}
        </div>

        {/* Rainbow Zap SVG Lightning Overlay */}
        {visualFx.rainbowOrigin && visualFx.rainbowTargets.length > 0 && (
          <svg
            viewBox={`0 0 ${cols * 100} ${rows * 100}`}
            className="pointer-events-none absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] z-20"
          >
            {visualFx.rainbowTargets.map((target, idx) => {
              const x1 = visualFx.rainbowOrigin!.c * 100 + 50;
              const y1 = visualFx.rainbowOrigin!.r * 100 + 50;
              const x2 = target.c * 100 + 50;
              const y2 = target.r * 100 + 50;
              return (
                <line
                  key={`${target.r}-${target.c}-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FDE047"
                  strokeWidth="7"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              );
            })}
          </svg>
        )}

        {/* Cascade / Special Combo Floating Banner */}
        {visualFx.bannerText && (
          <div
            key={visualFx.bannerKey}
            className="pointer-events-none absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 justify-center"
          >
            <div className="rounded-full border-[3px] border-white bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-5 py-1.5 font-display text-lg font-extrabold tracking-wide text-white shadow-xl">
              {visualFx.bannerText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
