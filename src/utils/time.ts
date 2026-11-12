/**
 * Deterministic WIB (UTC+7) calendar, streak, and clock formatting helpers.
 * Owned by @architect. Ensures consistent daily resets across offline devices.
 */

export const WIB_OFFSET_MS = 7 * 3600 * 1000;
export const MS_PER_DAY = 86400 * 1000;

/**
 * Returns a Date shifted to WIB (UTC+7) so `.toISOString()` / UTC getters
 * reflect the exact WIB calendar date and clock components.
 */
export function getWibDate(nowMs: number = Date.now()): Date {
  return new Date(nowMs + WIB_OFFSET_MS);
}

/**
 * Returns the canonical WIB calendar key (`YYYY-MM-DD`).
 */
export function getTodayKey(nowMs: number = Date.now()): string {
  return getWibDate(nowMs).toISOString().slice(0, 10);
}

/**
 * Returns the WIB calendar key offset by `offsetDays` (e.g., -1 for yesterday).
 */
export function getDayKeyOffset(offsetDays: number, nowMs: number = Date.now()): string {
  return getTodayKey(nowMs + offsetDays * MS_PER_DAY);
}

/**
 * Returns the ISO week key in WIB (`YYYY-Www`), e.g. `2026-W46`.
 */
export function getWeekKey(nowMs: number = Date.now()): string {
  const wib = getWibDate(nowMs);
  const utc = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Milliseconds remaining until the next 00:00 WIB reset boundary.
 */
export function msUntilWibMidnight(nowMs: number = Date.now()): number {
  const wibMs = nowMs + WIB_OFFSET_MS;
  const elapsedTodayMs = ((wibMs % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY;
  return MS_PER_DAY - elapsedTodayMs;
}

/**
 * Formats seconds into `MM:SS` using whole non-negative seconds.
 */
export function formatDurationClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
