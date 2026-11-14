/**
 * The waveform mark editor's logic (SB-S3, TECH-DESIGN 2.7, 3.2): the
 * waveform's peaks, the time <-> x mapping, dragging a unit boundary, the
 * suspect boundaries from the take's flags, and the backend's refusal of a
 * correction (`400 TAKE_MARKS_INVALID` with `details.flags`).
 *
 * Marks are the unit boundaries in ms: units + 1 values, from 0 to the end of
 * the take. The first and the last are fixed; a reviewer drags the ones
 * between. Pure: the component draws, the hook decodes.
 */

import type { PhaseKind, TakeQaFlag } from "./takes";

/** The smallest gap kept between two boundaries while dragging. */
export const MIN_UNIT_MS = 10;

export interface Peaks {
  /** Per bucket, the lowest and highest sample (-1 to 1). */
  min: number[];
  max: number[];
}

/** The waveform's peaks: `buckets` columns of min and max over the samples. */
export function computePeaks(samples: ArrayLike<number>, buckets: number): Peaks {
  const n = Math.max(1, Math.floor(buckets));
  const min = new Array<number>(n).fill(0);
  const max = new Array<number>(n).fill(0);
  const len = samples.length;
  if (len === 0) return { min, max };
  for (let b = 0; b < n; b++) {
    const from = Math.floor((b * len) / n);
    const to = Math.max(from + 1, Math.floor(((b + 1) * len) / n));
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = from; i < to && i < len; i++) {
      const v = samples[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    min[b] = lo === Infinity ? 0 : lo;
    max[b] = hi === -Infinity ? 0 : hi;
  }
  return { min, max };
}

export function msToX(ms: number, durationMs: number, width: number): number {
  if (durationMs <= 0) return 0;
  return (ms / durationMs) * width;
}

export function xToMs(x: number, durationMs: number, width: number): number {
  if (width <= 0) return 0;
  return Math.min(durationMs, Math.max(0, (x / width) * durationMs));
}

/** The interior boundary nearest to `ms` within `toleranceMs`, or null. */
export function nearestMovableMark(marks: readonly number[], ms: number, toleranceMs: number): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (let i = 1; i < marks.length - 1; i++) {
    const d = Math.abs(marks[i] - ms);
    if (d <= toleranceMs && d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

/**
 * The marks with boundary `index` moved to `ms`, kept strictly between its
 * neighbours (by `MIN_UNIT_MS`) and rounded to whole ms. The first and last
 * marks never move.
 */
export function moveMark(marks: readonly number[], index: number, ms: number): number[] {
  const next = [...marks];
  if (index <= 0 || index >= marks.length - 1) return next;
  const lo = marks[index - 1] + MIN_UNIT_MS;
  const hi = marks[index + 1] - MIN_UNIT_MS;
  if (lo > hi) return next;
  next[index] = Math.round(Math.min(hi, Math.max(lo, ms)));
  return next;
}

export function marksEqual(a: readonly number[] | null | undefined, b: readonly number[] | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/**
 * The boundaries a take's flags point at, to highlight: an `alignment_off`
 * flag is about where its unit starts; any other flag on a unit is about both
 * of its edges. Only boundaries a reviewer can move are returned.
 */
export function suspectBoundaries(flags: readonly TakeQaFlag[], markCount: number): number[] {
  const out = new Set<number>();
  for (const f of flags) {
    if (typeof f.unit !== "number" || f.unit < 0) continue;
    const edges = f.check === "alignment_off" ? [f.unit] : [f.unit, f.unit + 1];
    for (const e of edges) if (e > 0 && e < markCount - 1) out.add(e);
  }
  return Array.from(out).sort((a, b) => a - b);
}

/** The units a take's flags are about (to shade). */
export function flaggedUnits(flags: readonly TakeQaFlag[]): number[] {
  const units = flags.filter((f) => typeof f.unit === "number" && f.unit >= 0).map((f) => f.unit as number);
  return units.filter((u, i) => units.indexOf(u) === i).sort((a, b) => a - b);
}

/** The phase colours, as the app draws them: blue short, sun madd and hold, grey closure, red release. */
export const PHASE_COLORS: Record<PhaseKind, string> = {
  short: "rgba(96, 165, 250, 0.25)",
  madd: "rgba(251, 191, 36, 0.30)",
  hold: "rgba(251, 191, 36, 0.18)",
  closure: "rgba(148, 163, 184, 0.25)",
  release: "rgba(248, 113, 113, 0.25)",
};

const CHECK_LABELS: Record<string, string> = {
  structure: "The marks do not fit the units",
  alignment_off: "A boundary is off",
  gap: "A silent gap",
  added_schwa: "An added vowel",
  duration: "A length is out of range",
  stretch_length: "A stretched region has the wrong length",
};

/** One take flag in plain words: what failed, and the backend's detail (which names the unit). */
export function takeFlagText(flag: TakeQaFlag, units?: readonly { text: string }[]): string {
  const label = CHECK_LABELS[flag.check] ?? "A check failed";
  const unit = typeof flag.unit === "number" && units?.[flag.unit] ? ` at "${units[flag.unit].text}"` : "";
  return flag.message ? `${label}${unit}: ${flag.message}.` : `${label}${unit}.`;
}

function isFlag(v: unknown): v is TakeQaFlag {
  return !!v && typeof v === "object" && typeof (v as TakeQaFlag).check === "string";
}

/**
 * The backend's refusal of a marks correction, in plain words for the editor;
 * null when the error is something else.
 */
export function marksErrorLines(
  error: { code?: string; details?: unknown; message?: string } | null | undefined,
  units?: readonly { text: string }[],
): string[] | null {
  if (!error || error.code !== "TAKE_MARKS_INVALID") return null;
  const details = (error.details ?? {}) as { flags?: unknown };
  const flags = Array.isArray(details.flags) ? details.flags.filter(isFlag) : [];
  if (flags.length === 0) return [error.message ? `${error.message}.` : "The marks do not pass the checks."];
  return flags.map((f) => takeFlagText(f, units));
}
