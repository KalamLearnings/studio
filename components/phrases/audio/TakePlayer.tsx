"use client";

/** A take's player: play or stop, how far it has played, and its length. Drawn from `useTakeAudio`. */

import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TakeAudio } from "./useTakeAudio";

export function TakePlayer({
  audio,
  durationMs,
  label = "the take",
  keyHint,
  className,
}: {
  audio: TakeAudio;
  durationMs: number | null;
  /** What plays, for the button's name ("the new take"). */
  label?: string;
  /** The key that plays it, shown in the tooltip ("space"). */
  keyHint?: string;
  className?: string;
}) {
  const name = `${audio.playing ? "Stop" : "Play"} ${label}`;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        onClick={audio.toggle}
        disabled={!audio.url}
        aria-label={name}
        aria-pressed={audio.playing}
        title={audio.url ? (keyHint ? `${name} (${keyHint})` : name) : "No audio yet"}
        className={cn(
          "grid h-10 w-10 flex-none place-items-center rounded-full border bg-background text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
          audio.playing && "border-primary bg-primary text-primary-foreground",
        )}
      >
        {audio.playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="ms-0.5 h-4 w-4" aria-hidden="true" />}
      </button>
      <div className="relative h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span
          className="absolute inset-y-0 start-0 rounded-full bg-primary transition-[width] duration-150 motion-reduce:transition-none"
          style={{ width: `${Math.round(audio.progress * 100)}%` }}
        />
      </div>
      <span className="min-w-[48px] text-end text-[11.5px] text-muted-foreground">
        {durationMs !== null ? `${(durationMs / 1000).toFixed(1)} s` : ""}
      </span>
      {audio.error && <span className="text-xs text-destructive">{audio.error}</span>}
    </div>
  );
}
