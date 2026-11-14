"use client";

import * as React from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTakeWaveform } from "@/lib/hooks/useTakeWaveform";
import {
  PHASE_COLORS,
  computePeaks,
  flaggedUnits,
  marksEqual,
  moveMark,
  msToX,
  nearestMovableMark,
  suspectBoundaries,
  takeFlagText,
  xToMs,
} from "@/lib/blendWord/marks";
import type { BlendReviewTake } from "@/lib/blendWord/takes";

const HEIGHT = 140;
const LABEL_BAND = 22;
/** How close (px) the pointer must be to grab a boundary. */
const GRAB_PX = 8;

interface WaveformMarkEditorProps {
  take: BlendReviewTake;
  /** The form's units, to label the regions between the marks. */
  units: readonly { text: string }[];
  onSave: (marks: number[]) => Promise<{ ok: boolean; message?: string; lines?: string[] }>;
}

/**
 * The take's waveform (decoded in the browser) with its unit boundaries and
 * phases. A suspect boundary from the flags is drawn in red. The reviewer
 * drags a boundary and saves; the backend runs the gates again and refuses
 * marks that fail, and the reasons show under the waveform.
 */
export function WaveformMarkEditor({ take, units, onSave }: WaveformMarkEditorProps) {
  const wave = useTakeWaveform(take.url);
  // Keyed on the values: the queue's polling returns new arrays with the same marks,
  // which must not reset a boundary the reviewer is moving.
  const originalKey = (take.marks ?? []).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const original = React.useMemo(() => take.marks ?? [], [originalKey]);
  const [marks, setMarks] = React.useState<number[]>(original);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const [width, setWidth] = React.useState(600);
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; message?: string; lines?: string[] } | null>(null);
  const wrap = React.useRef<HTMLDivElement>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => setMarks(original), [original]);

  React.useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const durationMs = Math.max(wave.data?.durationMs ?? 0, original[original.length - 1] ?? 0, take.durationMs ?? 0);
  const peaks = React.useMemo(() => (wave.data ? computePeaks(wave.data.samples, width) : null), [wave.data, width]);
  const suspects = React.useMemo(() => suspectBoundaries(take.qaFlags, marks.length), [take.qaFlags, marks.length]);
  const shaded = React.useMemo(() => flaggedUnits(take.qaFlags), [take.qaFlags]);
  const changed = !marksEqual(marks, original);

  React.useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, HEIGHT);
    const x = (ms: number) => msToX(ms, durationMs, width);
    const top = LABEL_BAND;
    const h = HEIGHT - LABEL_BAND;

    for (const u of shaded) {
      if (marks[u] === undefined || marks[u + 1] === undefined) continue;
      ctx.fillStyle = "rgba(239, 68, 68, 0.10)";
      ctx.fillRect(x(marks[u]), top, x(marks[u + 1]) - x(marks[u]), h);
    }
    // The stored phases fit the stored marks only; the backend refits them on save.
    if (!changed) {
      for (const p of take.phases ?? []) {
        ctx.fillStyle = PHASE_COLORS[p.kind] ?? "transparent";
        ctx.fillRect(x(p.startMs), top + h - 10, x(p.endMs) - x(p.startMs), 10);
      }
    }

    if (peaks) {
      const mid = top + h / 2;
      ctx.fillStyle = "rgb(100, 116, 139)";
      for (let i = 0; i < peaks.max.length; i++) {
        const y1 = mid - peaks.max[i] * (h / 2 - 6);
        const y2 = mid - peaks.min[i] * (h / 2 - 6);
        ctx.fillRect(i, y1, 1, Math.max(1, y2 - y1));
      }
    }

    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < marks.length - 1; i++) {
      const label = units[i]?.text;
      if (!label) continue;
      ctx.fillStyle = shaded.includes(i) ? "rgb(220, 38, 38)" : "rgb(71, 85, 105)";
      ctx.fillText(label, (x(marks[i]) + x(marks[i + 1])) / 2, LABEL_BAND / 2 + 1);
    }

    marks.forEach((m, i) => {
      const fixed = i === 0 || i === marks.length - 1;
      const suspect = suspects.includes(i);
      ctx.strokeStyle = suspect ? "rgb(220, 38, 38)" : fixed ? "rgb(148, 163, 184)" : "rgb(37, 99, 235)";
      ctx.lineWidth = dragging === i ? 3 : suspect ? 2.5 : fixed ? 1 : 2;
      const px = Math.min(width - 1, Math.max(1, x(m)));
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, HEIGHT);
      ctx.stroke();
      if (!fixed) {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillRect(px - 4, top, 8, 6);
      }
    });
  }, [width, durationMs, peaks, marks, suspects, shaded, dragging, changed, take.phases, units]);

  const msAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return xToMs(e.clientX - rect.left, durationMs, rect.width);
  };
  const tolerance = (GRAB_PX / width) * durationMs;

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const index = nearestMovableMark(marks, msAt(e), tolerance);
    if (index === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(index);
    setResult(null);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ms = msAt(e);
    if (dragging !== null) setMarks((m) => moveMark(m, dragging, ms));
    else e.currentTarget.style.cursor = nearestMovableMark(marks, ms, tolerance) !== null ? "ew-resize" : "default";
  };
  const onPointerUp = () => setDragging(null);

  const save = async () => {
    setPending(true);
    setResult(null);
    const res = await onSave(marks);
    setPending(false);
    setResult(res.ok ? { ok: true, message: "The marks passed the checks and were saved." } : res);
  };

  return (
    <div className="space-y-2">
      <div ref={wrap} className="relative w-full rounded-md border bg-background">
        <canvas
          ref={canvas}
          style={{ width: "100%", height: HEIGHT, touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Waveform with syllable boundaries. Drag a blue or red line to move a boundary."
        />
        {wave.loading && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Loading the audio...
          </div>
        )}
      </div>
      {wave.error && <p className="text-sm text-destructive">{wave.error} The boundaries are still shown.</p>}

      {take.qaFlags.length > 0 && (
        <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
          {take.qaFlags.map((f, i) => (
            <li key={i}>{takeFlagText(f, units)}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" dir="ltr">
          Boundaries (ms): {marks.map((m) => Math.round(m)).join(" | ")}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={!changed || pending} onClick={() => { setMarks(original); setResult(null); }}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
          </Button>
          <Button type="button" size="sm" disabled={!changed || pending} onClick={save}>
            {pending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
            Save marks
          </Button>
        </div>
      </div>

      {result && !result.ok && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
          <p>{result.message}</p>
          {result.lines && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {result.lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {result?.ok && <p className="text-xs text-emerald-700 dark:text-emerald-400">{result.message}</p>}
    </div>
  );
}
