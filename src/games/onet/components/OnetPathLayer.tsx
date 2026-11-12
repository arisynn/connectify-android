import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ONET_TIMINGS } from '@/config/audioFeel.config';
import { useTheme } from '@/services/theme/ThemeContext';
import type { GridCoord } from '@/types/game.types';
import type { OnetPathLayerProps } from '@/types/onet.types';

type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

interface PixelPoint {
  x: number;
  y: number;
}

function getAnchorSide(from: PixelPoint, toward: PixelPoint): AnchorSide {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'bottom' : 'top';
}

function generateRingPath(cx: number, cy: number, radius: number, startSide: AnchorSide): string {
  const r = Math.max(4, radius);
  switch (startSide) {
    case 'right':
      return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
    case 'left':
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
    case 'bottom':
      return `M ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r}`;
    case 'top':
    default:
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`;
  }
}

function generateRoundedPath(points: PixelPoint[], maxCornerRadius: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 0.5 || len2 < 0.5) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const r = Math.min(maxCornerRadius, len1 * 0.45, len2 * 0.45);
    const pInX = curr.x - (v1x / len1) * r;
    const pInY = curr.y - (v1y / len1) * r;
    const pOutX = curr.x + (v2x / len2) * r;
    const pOutY = curr.y + (v2y / len2) * r;

    d += ` L ${pInX} ${pInY} Q ${curr.x} ${curr.y} ${pOutX} ${pOutY}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function pathKey(path: GridCoord[]): string {
  return path.map((pt) => `${pt.r},${pt.c}`).join('|');
}

/**
 * Rounded SVG lightning/path overlay for Onet Connect matches.
 * Implements 3-phase Ring A -> Rounded Path -> Ring B -> Fade choreography
 * using normalized ResizeObserver pixel bounds over the `rows x cols` grid.
 */
export function OnetPathLayer({
  rows,
  cols,
  path,
  turns = 0,
  isSplit = false,
  accentColor,
}: OnetPathLayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useReducedMotion();
  const { activeEffect, activeOnetTheme, isReducedMotion } = useTheme();
  const reduced = Boolean(prefersReduced || isReducedMotion);

  const [size, setSize] = useState<{ width: number; height: number }>({
    width: Math.max(cols, 1) * 48,
    height: Math.max(rows, 1) * 48,
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize((prev) =>
          Math.abs(prev.width - rect.width) < 0.5 && Math.abs(prev.height - rect.height) < 0.5
            ? prev
            : { width: rect.width, height: rect.height },
        );
      }
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [rows, cols]);

  const strokeColor =
    accentColor ??
    (isSplit
      ? '#38bdf8'
      : activeEffect.accentHex || activeOnetTheme.palette.accentPrimary || '#f59e0b');

  const geometry = useMemo(() => {
    if (!path || path.length < 2 || rows <= 0 || cols <= 0) return null;

    const cellW = size.width / cols;
    const cellH = size.height / rows;
    const minCell = Math.min(cellW, cellH);

    const pixelPoints: PixelPoint[] = path.map((pt) => ({
      x: (pt.c + 0.5) * cellW,
      y: (pt.r + 0.5) * cellH,
    }));

    const first = pixelPoints[0];
    const second = pixelPoints[1];
    const prevLast = pixelPoints[pixelPoints.length - 2];
    const last = pixelPoints[pixelPoints.length - 1];

    const ringRadius = Math.max(10, Math.min(24, minCell * 0.4));
    const cornerRadius = Math.max(6, Math.min(16, minCell * 0.28));
    const strokeWidth = Math.max(3, Math.min(6, minCell * 0.1));

    const startSide = getAnchorSide(first, second);
    const endSide = getAnchorSide(last, prevLast);

    return {
      key: `${pathKey(path)}-${turns}-${isSplit ? 's' : 'c'}`,
      ringAPath: generateRingPath(first.x, first.y, ringRadius, startSide),
      ringBPath: generateRingPath(last.x, last.y, ringRadius, endSide),
      linePath: generateRoundedPath(pixelPoints, cornerRadius),
      strokeWidth,
    };
  }, [path, rows, cols, size.width, size.height, turns, isSplit]);

  return (
    <div ref={containerRef} className="onet-path-layer" aria-hidden="true">
      {geometry ? (
        <svg
          key={geometry.key}
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
        >
          <motion.g
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{
              delay: reduced ? 0.16 : ONET_TIMINGS.fadeOutDelayMs / 1000,
              duration: reduced ? 0.08 : ONET_TIMINGS.fadeOutMs / 1000,
              ease: 'easeOut',
            }}
          >
            {/* Outer soft glow stroke */}
            <motion.path
              d={geometry.linePath}
              fill="none"
              stroke={strokeColor}
              strokeOpacity={0.34}
              strokeWidth={geometry.strokeWidth * 2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                delay: reduced ? 0 : ONET_TIMINGS.lineTravelDelayMs / 1000,
                duration: reduced ? 0.01 : ONET_TIMINGS.lineTravelMs / 1000,
                ease: ONET_TIMINGS.lineEase,
              }}
            />

            {/* Ring A unfurl */}
            <motion.path
              d={geometry.ringAPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={geometry.strokeWidth}
              strokeLinecap="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                delay: 0,
                duration: reduced ? 0.01 : ONET_TIMINGS.ringADrawMs / 1000,
                ease: ONET_TIMINGS.lineEase,
              }}
            />

            {/* Crisp rounded connecting line */}
            <motion.path
              d={geometry.linePath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={geometry.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={turns === 2 && isSplit ? '8 5' : undefined}
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                delay: reduced ? 0 : ONET_TIMINGS.lineTravelDelayMs / 1000,
                duration: reduced ? 0.01 : ONET_TIMINGS.lineTravelMs / 1000,
                ease: ONET_TIMINGS.lineEase,
              }}
            />

            {/* Inner white hot core */}
            <motion.path
              d={geometry.linePath}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.85}
              strokeWidth={Math.max(1.5, geometry.strokeWidth * 0.42)}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                delay: reduced ? 0 : ONET_TIMINGS.lineTravelDelayMs / 1000,
                duration: reduced ? 0.01 : ONET_TIMINGS.lineTravelMs / 1000,
                ease: ONET_TIMINGS.lineEase,
              }}
            />

            {/* Ring B closure */}
            <motion.path
              d={geometry.ringBPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={geometry.strokeWidth}
              strokeLinecap="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                delay: reduced ? 0 : ONET_TIMINGS.ringBDelayMs / 1000,
                duration: reduced ? 0.01 : ONET_TIMINGS.ringBDrawMs / 1000,
                ease: ONET_TIMINGS.lineEase,
              }}
            />
          </motion.g>
        </svg>
      ) : null}
    </div>
  );
}

export default OnetPathLayer;
